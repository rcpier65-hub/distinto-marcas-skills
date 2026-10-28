'use client'

/* Vista de ENTREGABLES de una tarea de diseño (Pedro 30-sep-2026).
   Izquierda: una fila por historia/post/carrusel con su fecha, título y link.
   Derecha: vista previa del seleccionado (vertical para historias).
   Cada link y cada "Lista" se reflejan en la publicación del calendario. */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, CloudUpload, ExternalLink, Link2, Loader2, CalendarDays, Undo2, Plus, Minus, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { guardarEntregable, guardarSlides, marcarEntregableListo, type Entregable } from '../../_entregables-actions'

const TIPO_UI: Record<string, { label: string; plural: string; color: string; vertical: boolean }> = {
  historia: { label: 'Historia', plural: 'Historias', color: '#db2777', vertical: true },
  post: { label: 'Post', plural: 'Posts', color: '#0284c7', vertical: false },
  carrusel: { label: 'Carrusel', plural: 'Carruseles', color: '#0d9488', vertical: false },
}

// Se resuelve en el servidor desde el entregable, siempre sin caché de miniaturas.
function vistaPrevia(id: string, link: string | null, revision: number, slide = 0): string | null {
  return link?.trim() ? `/api/diseno/entregables/${id}/preview?slide=${slide}&v=${revision}` : null
}
function PreviewImage({ src, alt, miniature = false }: { src: string; alt: string; miniature?: boolean }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (failed) return miniature ? <CloudUpload size={15} /> : <span role="status" style={{ padding: 16, fontSize: 12, color: '#e2e8f0' }}>No se pudo abrir la imagen. Revisa el enlace y pulsa Actualizar vista previa.</span>
  return <>
    {!miniature && !loaded && <span role="status" style={{ position: 'absolute', display: 'grid', justifyItems: 'center', gap: 8, fontSize: 12, color: '#e2e8f0' }}><Loader2 size={20} className="animate-spin" />Cargando imagen actual…</span>}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} loading={miniature ? 'lazy' : 'eager'} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: miniature ? 'cover' : 'contain', opacity: loaded ? 1 : 0 }} />
  </>
}
function flecha(lado: 'left' | 'right'): React.CSSProperties {
  return { position: 'absolute', top: '50%', [lado]: 6, transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer',
    background: 'rgba(15,23,42,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }
}

/* Carrusel: un link por slide, en el orden en que se publica. */
function SlidesEditor({ id, revision, slides, color, activo, onFocus, onEdit, onSave }: {
  id: string; revision: number; slides: string[]; color: string; activo: number
  onFocus: (i: number) => void
  onEdit: (slides: string[]) => void
  onSave: (slides: string[]) => void
}) {
  const listos = slides.filter((x) => x.trim()).length
  const set = (i: number, v: string) => slides.map((x, j) => (j === i ? v : x))
  const btn: React.CSSProperties = { width: 24, height: 24, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
  return (
    <div onClick={(ev) => ev.stopPropagation()} style={{ display: 'grid', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748b' }}>
        <span style={{ fontWeight: 700, color: '#334155' }}>{slides.length} slides</span>
        <span>· {listos}/{slides.length} con link · en orden de publicación</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
          <button type="button" title="Quitar el último slide" disabled={slides.length <= 2} style={{ ...btn, opacity: slides.length <= 2 ? 0.4 : 1 }}
            onClick={() => { if (slides[slides.length - 1]?.trim() && !window.confirm(`¿Quitar el slide ${slides.length}? Tiene un link puesto.`)) return; onSave(slides.slice(0, -1)) }}><Minus size={12} /></button>
          <button type="button" title="Agregar un slide" disabled={slides.length >= 20} style={btn} onClick={() => onSave([...slides, ''])}><Plus size={12} /></button>
        </span>
      </div>
      {slides.map((l, i) => {
        const thumb = vistaPrevia(id, l || null, revision, i)
        const on = i === activo
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: on ? color : l.trim() ? '#f0fdf4' : '#f1f5f9', color: on ? '#fff' : l.trim() ? '#15803d' : '#64748b' }}>{i + 1}</span>
            <span style={{ width: 22, height: 22, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: '#f1f5f9', border: thumb ? 'none' : '1px dashed #cbd5e1' }}>
              {thumb && <PreviewImage key={thumb} src={thumb} alt="" miniature />}
            </span>
            <input value={l} onFocus={() => onFocus(i)}
              onChange={(ev) => onEdit(set(i, ev.target.value))}
              onBlur={(ev) => onSave(set(i, ev.target.value.trim()))}
              placeholder={`Link de Drive del slide ${i + 1}`}
              style={{ flex: 1, minWidth: 0, height: 28, fontSize: 12.5, padding: '0 9px', borderRadius: 8, border: `1px solid ${on ? color : '#e2e8f0'}`, outline: 'none', fontFamily: 'inherit', color: '#334155' }} />
          </div>
        )
      })}
    </div>
  )
}

function fechaCorta(ymd: string | null): string {
  if (!ymd) return 'Sin fecha'
  return new Date(ymd + 'T12:00:00Z').toLocaleDateString('es-PE', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')
}

export function EntregablesPanel({ tipo, iniciales }: { tipo: string; iniciales: Entregable[] }) {
  const router = useRouter()
  const ui = TIPO_UI[tipo] ?? TIPO_UI.post
  const [items, setItems] = useState(iniciales)
  const [selId, setSelId] = useState(iniciales.find((e) => !e.listoAt)?.id ?? iniciales[0]?.id ?? null)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [slideIdx, setSlideIdx] = useState(0)
  const [previewRevision, setPreviewRevision] = useState(0)
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setPreviewRevision(v => v + 1) }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const sel = items.find((e) => e.id === selId) ?? null
  const listos = items.filter((e) => e.listoAt).length

  function editarLocal(id: string, patch: Partial<Entregable>) {
    setItems((cur) => cur.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }
  async function guardar(e: Entregable, patch: { titulo?: string; link?: string | null; hora?: string | null }) {
    setGuardando(e.id)
    try {
      const r = await guardarEntregable(e.id, patch)
      if (!r.ok) { toast.error(r.error); return }
      if (patch.link !== undefined && !patch.link) editarLocal(e.id, { listoAt: null })
      if (patch.link !== undefined) {
        setPreviewRevision(v => v + 1)
        toast.success('Enlace guardado')
      }
    } catch { toast.error('No se pudo guardar. Conserva el enlace e inténtalo de nuevo.') }
    finally { setGuardando(null) }
  }
  async function guardarSlidesDe(e: Entregable, slides: string[]) {
    editarLocal(e.id, { slides, link: slides[0] || null, ...(slides.every((x) => x.trim()) ? {} : { listoAt: null }) })
    setGuardando(e.id)
    try {
      const r = await guardarSlides(e.id, slides)
      if (!r.ok) { toast.error(r.error); return }
      setPreviewRevision(v => v + 1)
      toast.success('Enlaces guardados')
    } catch { toast.error('No se pudo guardar. Conserva los enlaces e inténtalo de nuevo.') }
    finally { setGuardando(null) }
  }
  async function alternarListo(e: Entregable) {
    const listo = !e.listoAt
    if (listo && e.slides) {
      const falta = e.slides.findIndex((x) => !x.trim())
      if (falta >= 0) { toast.error(`Falta el link del slide ${falta + 1}`); setSelId(e.id); setSlideIdx(falta); return }
    }
    if (listo && !e.link) { toast.error('Primero pega el link del diseño'); return }
    setGuardando(e.id)
    const r = await marcarEntregableListo(e.id, listo)
    setGuardando(null)
    if (!r.ok) { toast.error(r.error); return }
    editarLocal(e.id, { listoAt: listo ? new Date().toISOString() : null })
    if (r.todosListos) toast.success(`¡Listo! Las ${items.length} ${ui.plural.toLowerCase()} están terminadas`)
    else if (listo) {
      const sig = items.find((x) => x.id !== e.id && !x.listoAt)
      if (sig) setSelId(sig.id)
    }
    router.refresh()
  }

  const slidesSel = sel?.slides ?? null
  const idxSel = slidesSel ? Math.min(slideIdx, slidesSel.length - 1) : 0
  const linkSel = slidesSel ? (slidesSel[idxSel] || null) : (sel?.link ?? null)
  const preview = sel ? vistaPrevia(sel.id, linkSel, previewRevision, idxSel) : null

  return (
    <section style={{ background: '#fff', border: '1px solid #eceef3', borderRadius: 18, overflow: 'hidden', marginBottom: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #f1f2f6' }}>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: `${ui.color}14`, color: ui.color, border: `1px solid ${ui.color}33` }}>
          {ui.plural}
        </span>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#64748b' }}>
          {items.length} entregable{items.length === 1 ? '' : 's'} · cada uno es una publicación en el calendario
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{listos} de {items.length} listas</div>
          <div style={{ width: 130, height: 6, borderRadius: 3, background: '#eef0f4', marginTop: 5, overflow: 'hidden' }}>
            <div style={{ width: `${items.length ? (listos / items.length) * 100 : 0}%`, height: '100%', background: '#10b981', transition: 'width 250ms' }} />
          </div>
        </div>
      </div>

      <div className="mk-entregables-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px' }}>
        <div style={{ padding: 12, display: 'grid', gap: 8, alignContent: 'start', borderRight: '1px solid #f1f2f6' }}>
          {items.map((e, n) => {
            const activo = e.id === selId
            const thumb = vistaPrevia(e.id, e.link, previewRevision)
            return (
              <div key={e.id} onClick={() => { if (e.id !== selId) { setSelId(e.id); setSlideIdx(0) } }}
                style={{ display: 'flex', alignItems: e.slides ? 'flex-start' : 'center', gap: 10, padding: 10, borderRadius: 13, cursor: 'pointer',
                  border: `1.5px solid ${activo ? ui.color : '#eceef3'}`, background: activo ? `${ui.color}08` : '#fff', transition: 'all 120ms' }}>
                <div style={{ width: ui.vertical ? 32 : 40, height: ui.vertical ? 56 : 40, borderRadius: 7, flexShrink: 0, overflow: 'hidden',
                  background: thumb ? '#f1f5f9' : '#f8fafc', border: thumb ? 'none' : '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      {thumb ? <PreviewImage key={thumb} src={thumb} alt="" miniature /> : <CloudUpload size={15} />}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: ui.color }}>{ui.label} {n + 1}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 3 }}><CalendarDays size={11} /> {fechaCorta(e.fecha)}</span>
                    {e.publicacionId && (
                      <Link href={`/publicaciones/${e.publicacionId}`} onClick={(ev) => ev.stopPropagation()} title="Ver en el calendario de publicaciones"
                        style={{ marginLeft: 'auto', color: '#94a3b8', display: 'inline-flex' }}><ExternalLink size={12} /></Link>
                    )}
                  </div>
                  <input value={e.titulo} onClick={(ev) => ev.stopPropagation()}
                    onChange={(ev) => editarLocal(e.id, { titulo: ev.target.value })}
                    onBlur={(ev) => void guardar(e, { titulo: ev.target.value })}
                    placeholder="Título"
                    style={{ height: 30, fontSize: 13, fontWeight: 600, padding: '0 9px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', fontFamily: 'inherit', color: '#0f172a' }} />
                  {e.publicacionId && <label style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>Hora de publicación (Lima)
                    <input type="time" aria-label={`Hora de publicación de ${e.titulo}`} value={e.hora ?? ''} disabled={guardando === e.id} onClick={ev => ev.stopPropagation()} onChange={ev => editarLocal(e.id, { hora: ev.target.value })} onBlur={ev => void guardar(e, { hora: ev.target.value || null })} style={{ height: 30, border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 8px' }} />
                  </label>}
                  {e.slides ? (
                    <SlidesEditor
                      id={e.id} revision={previewRevision} slides={e.slides} color={ui.color}
                      activo={activo ? slideIdx : -1}
                      onFocus={(i) => { setSelId(e.id); setSlideIdx(i) }}
                      onEdit={(slides) => editarLocal(e.id, { slides })}
                      onSave={(slides) => void guardarSlidesDe(e, slides)}
                    />
                  ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Link2 size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                    <input value={e.link ?? ''} onClick={(ev) => ev.stopPropagation()}
                      onChange={(ev) => editarLocal(e.id, { link: ev.target.value })}
                      onBlur={(ev) => void guardar(e, { link: ev.target.value.trim() || null })}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ev.currentTarget.blur() } }}
                      placeholder="Pega el link de Drive del diseño"
                      style={{ flex: 1, minWidth: 0, height: 30, fontSize: 12.5, padding: '0 9px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', fontFamily: 'inherit', color: '#334155' }} />
                  </div>
                  )}
                </div>
                <button type="button" onClick={(ev) => { ev.stopPropagation(); void alternarListo(e) }} disabled={guardando === e.id}
                  title={e.listoAt ? 'Volver a pendiente' : 'Marcar lista'}
                  style={{ height: 32, padding: '0 11px', borderRadius: 9, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    border: `1px solid ${e.listoAt ? '#bbf7d0' : '#e2e8f0'}`, background: e.listoAt ? '#f0fdf4' : '#fff', color: e.listoAt ? '#15803d' : '#475569' }}>
                  {guardando === e.id ? <Loader2 size={13} className="animate-spin" /> : e.listoAt ? <Check size={13} strokeWidth={3} /> : null}
                  {e.listoAt ? 'Lista' : 'Marcar lista'}
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ padding: 14, display: 'grid', gap: 10, alignContent: 'start', justifyItems: 'center', background: '#fcfcfd' }}>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            <span>
            Vista previa{sel ? ` · ${ui.label} ${items.findIndex((x) => x.id === sel.id) + 1}` : ''}{slidesSel ? ` · Slide ${idxSel + 1} de ${slidesSel.length}` : ''}
            </span>
            <button type="button" title="Actualizar vista previa" aria-label="Actualizar vista previa" disabled={!linkSel || !!guardando}
              onClick={() => setPreviewRevision(v => v + 1)} style={{ marginLeft: 'auto', padding: 6, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#6d5dfc' }}><RefreshCw size={15} /></button>
          </div>
          <div style={{ width: ui.vertical ? 180 : 220, aspectRatio: ui.vertical ? '9 / 16' : '4 / 5', borderRadius: 16, overflow: 'hidden',
            position: 'relative',
            background: preview ? '#0f172a' : '#fff', border: preview ? 'none' : '1.5px dashed #cbd5e1',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#94a3b8', textAlign: 'center', padding: preview ? 0 : 16 }}>
            {preview ? (
              <PreviewImage key={preview} src={preview} alt={sel?.titulo ?? ''} />
            ) : (
              <>
                <CloudUpload size={26} />
                <span style={{ fontSize: 12.5, lineHeight: 1.4 }}>{slidesSel ? <>Pega el link del<br />slide {idxSel + 1} a la izquierda</> : <>Pega el link de Drive<br />de este diseño a la izquierda</>}</span>
              </>
            )}
            {slidesSel && slidesSel.length > 1 && (
              <>
                <button type="button" aria-label="Slide anterior" onClick={() => setSlideIdx((idxSel - 1 + slidesSel.length) % slidesSel.length)} style={flecha('left')}><ChevronLeft size={16} /></button>
                <button type="button" aria-label="Slide siguiente" onClick={() => setSlideIdx((idxSel + 1) % slidesSel.length)} style={flecha('right')}><ChevronRight size={16} /></button>
                <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(15,23,42,0.7)', padding: '2px 8px', borderRadius: 999 }}>{idxSel + 1}/{slidesSel.length}</span>
              </>
            )}
          </div>
          {slidesSel && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 230 }}>
              {slidesSel.map((l, i) => (
                <button key={i} type="button" onClick={() => setSlideIdx(i)} title={`Slide ${i + 1}`}
                  style={{ width: 26, height: 26, borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                    border: `1.5px solid ${i === idxSel ? ui.color : l ? '#bbf7d0' : '#e2e8f0'}`,
                    background: i === idxSel ? ui.color : l ? '#f0fdf4' : '#fff', color: i === idxSel ? '#fff' : l ? '#15803d' : '#94a3b8' }}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
          {linkSel && (
            <a href={linkSel} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: '#6d5dfc', display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
              <ExternalLink size={13} /> Abrir en Drive
            </a>
          )}
          {sel && (
            <button type="button" onClick={() => void alternarListo(sel)} disabled={guardando === sel.id}
              style={{ width: ui.vertical ? 180 : 220, height: 38, borderRadius: 11, fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', border: 'none',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: sel.listoAt ? '#f1f5f9' : 'linear-gradient(135deg,#7170ff,#ba41f7)', color: sel.listoAt ? '#475569' : '#fff' }}>
              {sel.listoAt ? <><Undo2 size={15} /> Volver a pendiente</> : <><Check size={15} strokeWidth={3} /> Marcar lista</>}
            </button>
          )}
        </div>
      </div>
      <style>{'@media (max-width: 720px){.mk-entregables-grid{grid-template-columns:1fr!important}}'}</style>
    </section>
  )
}
