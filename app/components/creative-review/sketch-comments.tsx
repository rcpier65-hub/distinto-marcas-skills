'use client';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import type { ReviewData, ReviewNote } from '@/lib/creative-review/model';
import { stateLabels } from '@/lib/creative-review/model';
import { canvasToImage, dragZone, imageToScreen, noteMatchesImage, zonePolygon, type Point, type SketchImage, type SketchViewport, type Zone } from '@/lib/creative-review/sketch-geometry';
import { api } from '@/components/estrategia/common';
import './sketch-comments.css';

type Draft = { id: string; anchorId: string; versionId: string; page: number; seconds: number | null; zone: Zone };
type View = { images: SketchImage[]; viewport: SketchViewport };
const EMPTY: View = { images: [], viewport: { scrollX: 0, scrollY: 0, zoom: 1 } };

export function SketchComments({ ex, publicationId, canvasNode, mode, show, activeAnchor, onMode, onShow, onCount, onDraft }: {
  ex: ExcalidrawImperativeAPI | null; publicationId: string;
  canvasNode: HTMLDivElement | null; mode: boolean; show: boolean; activeAnchor: string;
  onMode: (value: boolean) => void; onShow: (value: boolean) => void; onCount: (n: number) => void; onDraft: (value: boolean) => void;
}) {
  const [review, setReview] = useState<ReviewData | null>(null), [view, setView] = useState<View>(EMPTY);
  const [draft, setDraft] = useState<Draft | null>(null), [text, setText] = useState(''), [requestedBy, setRequestedBy] = useState('Cliente');
  const [hintHidden, setHintHidden] = useState(false);
  const [selected, setSelected] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null), saving = useRef(false), lastRead = useRef(0);
  const dragging = useRef<{ image: SketchImage; start: Point; screen: Point } | null>(null);
  const url = `/api/creative-review/${publicationId}`;
  const refresh = useCallback(async () => {
    const order = ++lastRead.current;
    const data: ReviewData = await api(url);
    if (order === lastRead.current) { setReview(data); setError(''); }
  }, [url]);
  const cancelRead = useCallback(() => { lastRead.current++; }, []);
  useEffect(() => {
    let stopped = false, reading = false;
    const read = async () => {
      if (stopped || reading || document.visibilityState === 'hidden') return;
      reading = true;
      try { await refresh(); } catch (e) { if (!stopped) setError(`No se pudieron actualizar los comentarios. ${(e as Error).message}`); }
      finally { reading = false; }
    };
    void read();
    const timer = setInterval(() => void read(), 10000);
    window.addEventListener('focus', read); window.addEventListener('online', read);
    return () => { stopped = true; cancelRead(); clearInterval(timer); window.removeEventListener('focus', read); window.removeEventListener('online', read); };
  }, [refresh, cancelRead]);
  useEffect(() => {
    if (!ex) return;
    let frame = 0, previous = '';
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const state = ex.getAppState();
        const images = ex.getSceneElements().filter(e => e.type === 'image' && e.customData?.deliveryVersionId).map(e => ({ id: e.id, x: e.x, y: e.y, width: e.width, height: e.height, angle: e.angle, scale: e.type === 'image' ? e.scale : undefined, customData: e.customData })) as SketchImage[];
        const next = { images, viewport: { scrollX: state.scrollX, scrollY: state.scrollY, zoom: state.zoom.value } };
        const signature = JSON.stringify(next);
        if (signature !== previous) { previous = signature; setView(next); }
      });
    };
    update(); const unsubscribe = ex.onChange(update);
    return () => { cancelAnimationFrame(frame); unsubscribe(); };
  }, [ex]);
  const active = view.images.find(i => i.id === activeAnchor);
  const notes = (review?.notes || []).filter(n => !active || noteMatchesImage(n, active));
  useEffect(() => onCount(notes.length), [notes.length, onCount]);
  useEffect(() => { onDraft(!!draft); }, [draft, onDraft]);
  const draftId = draft?.id;
  useEffect(() => {
    if (!draftId) return;
    if (!dragging.current) textRef.current?.focus();
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draftId]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !draft) onMode(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [draft, onMode]);
  const screenPoint = (e: PointerEvent) => {
    const r = canvasNode!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const localPoint = (e: PointerEvent, image: SketchImage) => {
    const p = screenPoint(e), v = view.viewport;
    return canvasToImage(image, { x: p.x / v.zoom - v.scrollX, y: p.y / v.zoom - v.scrollY });
  };
  const begin = (e: PointerEvent<SVGPolygonElement>, image: SketchImage) => {
    if (e.button !== 0 || draft || saving.current) return;
    e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
    const p = localPoint(e, image);
    dragging.current = { image, start: p, screen: screenPoint(e) };
    setSelected(''); setError(''); onShow(true);
    setDraft({ id: crypto.randomUUID(), anchorId: image.id, versionId: image.customData!.deliveryVersionId!, page: image.customData?.page || 1, seconds: image.customData?.seconds ?? null, zone: { ...p, width: null, height: null } });
  };
  const move = (e: PointerEvent<SVGPolygonElement>) => {
    const d = dragging.current; if (!d) return;
    setDraft(old => old ? { ...old, zone: dragZone(d.start, localPoint(e, d.image)) } : old);
  };
  const end = (e: PointerEvent<SVGPolygonElement>) => {
    const d = dragging.current; if (!d) return;
    const p = screenPoint(e), z = dragZone(d.start, localPoint(e, d.image));
    setDraft(old => old ? { ...old, zone: Math.hypot(p.x - d.screen.x, p.y - d.screen.y) < 5 ? { ...d.start, width: null, height: null } : z } : old);
    dragging.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    textRef.current?.focus();
  };
  async function save() {
    if (!draft || !text.trim() || saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try {
      await api(url, { action: 'note', id: draft.id, versionId: draft.versionId, text, requestedBy, page: draft.page, seconds: draft.seconds, ...draft.zone });
      await refresh(); setSelected(draft.id); setDraft(null); setText(''); onMode(false);
    } catch (e) { setError(`No se guardó la confirmación. Tu comentario sigue aquí; puedes reintentar. ${(e as Error).message}`); }
    finally { saving.current = false; setBusy(false); }
  }
  function selectNote(note: ReviewNote) {
    if (draft) return;
    setSelected(note.id); onShow(true); onMode(false);
    const image = view.images.find(i => noteMatchesImage(note, i));
    const element = ex?.getSceneElements().find(e => e.id === image?.id);
    if (element) ex?.scrollToContent([element], { fitToViewport: true, viewportZoomFactor: .7, maxZoom: 1 });
  }
  const draftImage = view.images.find(i => i.id === draft?.anchorId);
  const visibleNotes = notes.filter(n => view.images.some(i => noteMatchesImage(n, i)));
  const overlay = <div className={`sk-comments-overlay ${mode ? 'is-commenting' : ''} ${!show ? 'is-panel-closed' : ''}`}>
    <svg className="sk-comments-svg" aria-label="Zonas de comentarios">
      {visibleNotes.map(n => {
        const image = view.images.find(i => noteMatchesImage(n, i))!;
        if (n.x === null || n.y === null) return null;
        return n.width !== null && n.height !== null ? <polygon key={n.id} points={zonePolygon(image, { x: n.x, y: n.y, width: n.width, height: n.height }, view.viewport)} className={`sk-note-zone ${selected === n.id ? 'is-selected' : ''}`} /> : null;
      })}
      {mode && view.images.map(image => <polygon key={image.id} points={zonePolygon(image, { x: 0, y: 0, width: 1, height: 1 }, view.viewport)} className="sk-comment-target" onPointerDown={e => begin(e, image)} onPointerMove={move} onPointerUp={end} onPointerCancel={() => { dragging.current = null; setDraft(null); }} />)}
      {draft && draftImage && <polygon points={zonePolygon(draftImage, draft.zone, view.viewport)} className="sk-note-zone is-draft" />}
    </svg>
    {visibleNotes.map(n => {
      const image = view.images.find(i => noteMatchesImage(n, i))!;
      if (n.x === null || n.y === null) return null;
      const p = imageToScreen(image, { x: n.x, y: n.y }, view.viewport);
      const number = notes.findIndex(x => x.id === n.id) + 1;
      return <button key={n.id} className={`sk-note-pin ${selected === n.id ? 'is-selected' : ''}`} style={{ left: p.x, top: p.y }} aria-label={`Comentario ${number}: ${n.text}`} disabled={!!draft} onClick={() => selectNote(n)}><b>{number}</b><span>{n.text}</span></button>;
    })}
    {mode && !draft && !hintHidden && <div className="sk-comment-hint">Arrastra sobre el diseño para comentar una zona · Clic para marcar un punto · Esc para salir <button aria-label="Cerrar ayuda de comentar zona" onClick={() => setHintHidden(true)}>×</button></div>}
  </div>;
  return <>
    {canvasNode && createPortal(overlay, canvasNode)}
    {(show || draft) && <aside className="sk-comments-panel" aria-label="Comentarios del boceto">
      <header><div><strong>Comentarios <span>{notes.length}</span></strong><small>{active?.customData?.deliveryLabel || 'Todas las versiones del boceto'}</small></div><button aria-label="Ocultar comentarios" disabled={!!draft} onClick={() => onShow(false)}>×</button></header>
      {error && <p className="sk-comment-error" role="alert">{error}</p>}
      {draft && <form className="sk-comment-form" onSubmit={e => { e.preventDefault(); void save(); }}>
        <strong>{draft.zone.width === null ? 'Comentar este punto' : 'Comentar la zona marcada'}</strong>
        <label>Solicitado por<input value={requestedBy} maxLength={160} onChange={e => setRequestedBy(e.target.value)} disabled={busy} /></label>
        <label>Comentario<textarea ref={textRef} value={text} maxLength={4000} placeholder="Escribe qué debemos cambiar aquí…" onChange={e => setText(e.target.value)} disabled={busy} /></label>
        <div><button type="button" disabled={busy} onClick={() => { setDraft(null); setText(''); onMode(false); }}>Descartar</button><button className="sk-primary" disabled={busy || !text.trim()}>{busy ? 'Guardando…' : 'Guardar comentario'}</button></div>
      </form>}
      <div className="sk-comments-list">
        {!review && !error && <p>Cargando comentarios…</p>}
        {review && !notes.length && !draft && <div className="sk-comments-empty"><strong>Los cambios quedan a la vista</strong><p>Pulsa Comentar zona y arrastra sobre el diseño. Aquí aparecerán también las observaciones de Presentar y revisar.</p><button onClick={() => onMode(true)}>Comentar zona</button></div>}
        {notes.map((note, i) => <article key={note.id} className={selected === note.id ? 'is-selected' : ''}>
          <button className="sk-note-detail" onClick={() => selectNote(note)} disabled={!!draft}><span className="sk-note-number">{i + 1}</span><div><strong>{note.requested_by || 'Equipo'}</strong><small>{note.author || 'Equipo'} · {new Date(note.created_at).toLocaleDateString('es-PE')}</small><p>{note.text}</p><span className="sk-note-state">{stateLabels[note.state]}</span>{!active && <small>{review?.versions.find(v => v.id === note.version_id)?.label} · V{review?.versions.find(v => v.id === note.version_id)?.version}</small>}</div></button>
          {note.attachments.length > 0 && <div className="sk-note-references">{note.attachments.map(src => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="Referencia del comentario" loading="lazy" /></a>)}</div>}
        </article>)}
      </div>
      <footer>Guardados en la misma versión de <a href={`/revision/${publicationId}`}>Presentar y revisar ↗</a></footer>
    </aside>}
  </>;
}
