"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Brush,
  Expand,
  Minimize,
  PanelRightClose,
  PanelRightOpen,
  Files,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Link2,
  Plus,
  MessageSquare,
  CheckCheck,
  X,
} from "lucide-react";
import {
  reviewCounts,
  slotLabels,
  stateLabels,
  type ReviewData,
  type ReviewNote,
} from "@/lib/creative-review/model";
import { ReviewViewer, type Mark } from "./viewer";
import { FileGallery } from "./gallery";
import "./workspace.css";
const date = (s: string) =>
  new Date(s).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "medium",
    timeStyle: "short",
  });
async function imageData(file: File) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 12_000_000
  )
    throw Error("Usa PNG, JPG o WebP de hasta 12 MB.");
  const bitmap = await createImageBitmap(file);
  const factor = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * factor;
  canvas.height = bitmap.height * factor;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const result = canvas.toDataURL("image/jpeg", 0.8);
  if (result.length > 1_330_000)
    throw Error("Esta imagen es demasiado grande. Reduce su tamaño.");
  return result;
}
export function ReviewWorkspace({ initial }: { initial: ReviewData }) {
  const [data, setData] = useState(initial);
  const [presenting, setPresenting] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(
    initial.versions.some(
      (x) =>
        x.slot !== initial.versions[0]?.slot ||
        x.publicacion_id !== initial.versions[0]?.publicacion_id,
    ),
  );
  const [composing, setComposing] = useState(false);
  const commentInput = useRef<HTMLTextAreaElement>(null);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        setPresenting(false);
        fullscreenButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, []);
  const [versionId, setVersionId] = useState(initial.versions.at(-1)?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const toggleFullscreen = async () => {
    if (presenting) {
      if (document.fullscreenElement === root.current)
        await document.exitFullscreen();
      setPresenting(false);
      fullscreenButton.current?.focus();
      return;
    }
    setPresenting(true);
    // Embedded browsers and iPhone may not support Fullscreen; expanded mode still works.
    try {
      await root.current?.requestFullscreen?.();
    } catch {
      /* Keep expanded mode. */
    }
  };
  const [mark, setMark] = useState<Mark | null>(null);
  const [text, setText] = useState("");
  const [requestedBy, setRequestedBy] = useState("Cliente");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [showDelivery, setShowDelivery] = useState(false);
  const [item, setItem] = useState(data.items[0].id);
  const [slot, setSlot] = useState(
    data.publication.es_tarea_diseno ? "diseno" : "video_con_musica",
  );
  const [url, setUrl] = useState("");
  const [history, setHistory] = useState(false);
  useEffect(() => {
    if (!text && !attachments.length) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [text, attachments.length]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  const [exclude, setExclude] = useState(false);
  const [reason, setReason] = useState("");
  const lock = useRef(false);
  const epoch = useRef(0);
  useEffect(() => {
    let disposed = false;
    let loading = false;
    const ac = new AbortController();
    const reload = async () => {
      if (document.hidden || loading || lock.current) return;
      loading = true;
      const before = epoch.current;
      try {
        const r = await fetch(
          `/api/creative-review/${initial.publication.id}`,
          { cache: "no-store", signal: ac.signal },
        );
        if (r.ok) {
          const d = await r.json();
          if (!disposed && !lock.current && before === epoch.current)
            setData(d);
        }
      } catch {
      } finally {
        loading = false;
      }
    };
    const timer = setInterval(() => void reload(), 20000);
    window.addEventListener("focus", reload);
    return () => {
      disposed = true;
      ac.abort();
      clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, [initial.publication.id]);
  const noteRequest = useRef(crypto.randomUUID());
  const v =
    data.versions.find((v) => v.id === versionId) || data.versions.at(-1);
  const versions = v
    ? data.versions.filter(
        (x) => x.publicacion_id === v.publicacion_id && x.slot === v.slot,
      )
    : [];
  const notes = v ? data.notes.filter((n) => n.version_id === v.id) : [];
  const previous = v
    ? data.notes.filter(
        (n) =>
          n.version_id !== v.id &&
          !["aplicado", "validado"].includes(n.state) &&
          versions.some((x) => x.id === n.version_id && x.version < v.version),
      )
    : [];
  const counts = reviewCounts(data.versions);
  const rounds = data.rounds.filter((r) => r.version_id === v?.id);
  const openRound = rounds.some((r) => !r.closed_at);
  const groups = [
    ...new Map(
      data.versions.map((x) => [x.publicacion_id + ":" + x.slot, x]),
    ).values(),
  ];
  const groupIndex = groups.findIndex(
    (g) => g.publicacion_id === v?.publicacion_id && g.slot === v?.slot,
  );
  const changeVersion = (id: string) => {
    if (text || attachments.length) {
      setError(
        "Guarda la observación o pulsa Descartar antes de cambiar de versión.",
      );
      return;
    }
    setVersionId(id);
    setComposing(false);
    setMark(null);
    setSelected(null);
    setExclude(false);
  };
  const run = async (body?: unknown) => {
    if (lock.current) return null;
    lock.current = true;
    epoch.current++;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(
        `/api/creative-review/${data.publication.id}`,
        body
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : { cache: "no-store" },
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "No se pudo guardar");
      setData(d);
      return d as ReviewData;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const beginNote = (m: Mark | null) => {
    setMark(m);
    if (m) {
      setComposing(true);
      setCommentsOpen(true);
      setHistory(false);
      setSelected(null);
      requestAnimationFrame(() => commentInput.current?.focus());
    }
  };
  const focus = useCallback((id: string) => {
    setCommentsOpen(true);
    setHistory(false);
    setFocusTick((t) => t + 1);
    setSelected(id);
    document
      .getElementById("note-" + id)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  const attach = async (files: File[]) => {
    try {
      const images = await Promise.all(
        files.slice(0, 3 - attachments.length).map(imageData),
      );
      setAttachments((a) => [...a, ...images].slice(0, 3));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const discard = () => {
    setComposing(false);
    setText("");
    setAttachments([]);
    setMark(null);
    noteRequest.current = crypto.randomUUID();
  };
  const addNote = async () => {
    if (!v) return;
    const d = await run({
      action: "note",
      id: noteRequest.current,
      versionId: v.id,
      text,
      requestedBy,
      attachments,
      ...(mark || { page: 1 }),
    });
    if (d) {
      discard();
      setMessage("Observación guardada en " + `V${v.version}`);
    }
  };
  const updateState = async (n: ReviewNote, state: ReviewNote["state"]) => {
    await run({
      action: "state",
      id: n.id,
      state,
      appliedVersionId: ["aplicado", "validado"].includes(state) ? v?.id : null,
    });
  };
  return (
    <div
      className={`cr-workspace ${presenting ? "cr-presenting" : ""}`}
      ref={root}
    >
      <header className="cr-header">
        <Link
          href={`/publicaciones/${data.publication.id}`}
          aria-label="Volver a la tarea"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="cr-title">
          <small>{data.publication.brand} · PRESENTACIÓN Y REVISIÓN</small>
          <h1>{data.publication.nombre}</h1>
        </div>
        <div className="cr-header-actions">
          {data.sketchHref && (
            <Link href={data.sketchHref}>
              <Brush size={16} />
              Boceto
            </Link>
          )}
          <button disabled={busy} onClick={() => void run()} title="Actualizar">
            <RefreshCw size={17} />
          </button>
          <button
            ref={fullscreenButton}
            className="cr-fullscreen"
            aria-pressed={presenting}
            onClick={() => void toggleFullscreen()}
          >
            {presenting ? <Minimize size={16} /> : <Expand size={16} />}
            {presenting ? "Salir de pantalla completa" : "Pantalla completa"}
          </button>
          <button
            className="primary"
            onClick={() => {
              if (v) {
                setItem(v.publicacion_id);
                setSlot(v.slot);
              }
              setShowDelivery((s) => !s);
            }}
          >
            <Plus size={16} />
            Nueva entrega
          </button>
        </div>
      </header>
      <div className="cr-summary">
        <span>
          <b>{counts.updates}</b> actualizaciones
        </span>
        <span>
          <b>{data.rounds.length}</b> rondas de revisión
        </span>
        <span>
          <b>
            {
              data.notes.filter(
                (n) => !["aplicado", "validado"].includes(n.state),
              ).length
            }
          </b>{" "}
          cambios pendientes
        </span>
        <span title="Trabajos con reentrega / trabajos con entrega registrada. Un trabajo se cuenta una vez por área.">
          Tasa de rebote · reentregas{" "}
          <b>{counts.rate === null ? "—" : counts.rate + "%"}</b>
        </span>
      </div>
      {(error || message) && (
        <p
          className={error ? "cr-alert" : "cr-success"}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </p>
      )}
      {showDelivery && (
        <form
          className="cr-new-delivery"
          onSubmit={async (e) => {
            e.preventDefault();
            const d = await run({
              action: "delivery",
              publicationId: item,
              slot,
              url,
            });
            if (d) {
              setVersionId(
                d.versions
                  .filter((x) => x.publicacion_id === item && x.slot === slot)
                  .at(-1)?.id || versionId,
              );
              setShowDelivery(false);
              setUrl("");
              setMark(null);
              setMessage(
                "Entrega guardada. Un enlace idéntico conserva su versión.",
              );
            }
          }}
        >
          <label>
            Pieza
            <select value={item} onChange={(e) => setItem(e.target.value)}>
              {data.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Archivo
            <select value={slot} onChange={(e) => setSlot(e.target.value)}>
              {Object.entries({
                ...slotLabels,
                ...Object.fromEntries(
                  Array.from({ length: 20 }, (_, i) => [
                    "slide_" + (i + 1),
                    "Lámina " + (i + 1),
                  ]),
                ),
              }).map(([s, l]) => (
                <option key={s} value={s}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="grow">
            Enlace de la entrega
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
          <p className="cr-delivery-help">
            Cada pieza o lámina tiene sus propias versiones y comentarios. Para
            corregir un archivo, elige el mismo; para otro archivo, elige otra
            lámina o entregable. Usa enlaces individuales, no carpetas.
          </p>
          <button
            className="primary"
            disabled={busy || !!text || !!attachments.length}
          >
            Guardar entrega
          </button>
          <button
            type="button"
            onClick={() => setShowDelivery(false)}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </form>
      )}
      {!v ? (
        <div className="cr-empty">
          <Link2 size={32} />
          <h2>La primera entrega será V1</h2>
          <p>
            Agrega el enlace del diseño o video aquí, o guárdalo desde su tarea.
            Cada reemplazo quedará en el historial de esta pieza.
          </p>
          <button className="primary" onClick={() => setShowDelivery(true)}>
            Agregar primera entrega
          </button>
        </div>
      ) : (
        <>
          <div className="cr-version-bar">
            <button
              aria-pressed={galleryOpen}
              onClick={() => setGalleryOpen((s) => !s)}
              title="Mostrar archivos de la tarea"
            >
              <Files size={16} /> Archivos ({groups.length})
            </button>
            <div className="cr-file-navigation">
              <button
                aria-label="Archivo anterior"
                disabled={groupIndex <= 0}
                onClick={() => {
                  const i = groupIndex;
                  if (i > 0) changeVersion(groups[i - 1].id);
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                {groupIndex + 1} / {groups.length}
              </span>
              <button
                aria-label="Archivo siguiente"
                disabled={groupIndex >= groups.length - 1}
                onClick={() => {
                  const i = groupIndex;
                  if (i < groups.length - 1) changeVersion(groups[i + 1].id);
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <label className="cr-piece">
              Pieza y formato
              <select
                aria-label="Pieza y formato"
                value={v.publicacion_id + ":" + v.slot}
                onChange={(e) => {
                  const g = groups.find(
                    (x) => x.publicacion_id + ":" + x.slot === e.target.value,
                  );
                  if (g) changeVersion(g.id);
                }}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.publicacion_id + ":" + g.slot}>
                    {g.title} · {g.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="cr-versions" aria-label="Versiones">
              {versions.map((x) => (
                <button
                  key={x.id}
                  aria-pressed={x.id === v.id}
                  onClick={() => changeVersion(x.id)}
                  title={
                    x.baseline
                      ? "Archivo existente al activar el historial"
                      : date(x.created_at)
                  }
                >
                  V{x.version}
                  {x.exclusion_reason ? "*" : ""}
                </button>
              ))}
            </div>
            <button
              title={
                commentsOpen ? "Ocultar comentarios" : "Mostrar comentarios"
              }
              aria-label={
                commentsOpen ? "Ocultar comentarios" : "Mostrar comentarios"
              }
              onClick={() => setCommentsOpen((s) => !s)}
            >
              {commentsOpen ? (
                <PanelRightClose size={17} />
              ) : (
                <PanelRightOpen size={17} />
              )}
            </button>
            <a href={v.url} target="_blank" rel="noreferrer">
              Abrir original ↗
            </a>
          </div>
          <p className="cr-version-info">
            <b>
              {v.label} · V{v.version}
            </b>{" "}
            ·{" "}
            {v.baseline
              ? "Archivo existente al activar el historial; fecha y autor de entrega desconocidos."
              : `${date(v.created_at)} · ${v.author || "Equipo"}`}{" "}
            {v.exclusion_reason &&
              `· Excluida de la métrica: ${v.exclusion_reason}`}
          </p>
          <div
            className={`cr-main ${commentsOpen ? "" : "cr-comments-hidden"} ${galleryOpen ? "cr-with-gallery" : ""}`}
          >
            {galleryOpen && (
              <FileGallery
                groups={groups}
                active={v}
                notes={data.notes}
                onSelect={changeVersion}
              />
            )}
            <ReviewViewer
              publicationId={data.publication.id}
              canSketch={data.canSketch}
              hasSketch={!!data.sketchHref}
              key={v.id}
              versionId={v.id}
              notes={notes}
              mark={mark}
              onMark={beginNote}
              onSelect={focus}
              selected={selected}
              focusTick={focusTick}
              onFullscreen={() => void toggleFullscreen()}
              presenting={presenting}
              draftPending={!!text || !!attachments.length}
              focus={notes.find((n) => n.id === selected) || null}
            />
            <aside className="cr-comments" hidden={!commentsOpen}>
              <div className="cr-comment-tabs">
                <button
                  aria-pressed={!history}
                  onClick={() => setHistory(false)}
                >
                  <MessageSquare size={16} />
                  Observaciones {notes.length}
                </button>
                <button aria-pressed={history} onClick={() => setHistory(true)}>
                  Historial
                </button>
              </div>
              {history ? (
                <div className="cr-note-list">
                  <h3>Rondas de esta versión</h3>
                  {rounds.length ? (
                    rounds.map((r, i) => (
                      <article key={r.id}>
                        <b>Revisión {i + 1}</b>
                        <p>{date(r.created_at)}</p>
                        <small>
                          {r.closed_at
                            ? "Finalizada " + date(r.closed_at)
                            : "En curso"}
                        </small>
                        <p>
                          {notes.filter((n) => n.round_id === r.id).length}{" "}
                          observaciones
                        </p>
                      </article>
                    ))
                  ) : (
                    <p>Al guardar la primera observación comienza una ronda.</p>
                  )}
                  <p className="cr-muted">
                    Cada nueva entrega suma una versión. Las rondas cuentan
                    reuniones o sesiones de revisión; son métricas distintas.
                  </p>
                  <p className="cr-muted">
                    El historial conserva los enlaces. Mantén los archivos
                    anteriores disponibles: reemplazar el contenido dentro del
                    mismo enlace también cambia su vista previa.
                  </p>
                  <button
                    disabled={busy || v.id !== versions.at(-1)?.id}
                    onClick={async () => {
                      const d = await run({
                        action: "manualVersion",
                        versionId: v.id,
                        requestId: crypto.randomUUID(),
                      });
                      if (d)
                        setVersionId(
                          d.versions
                            .filter(
                              (x) =>
                                x.publicacion_id === v.publicacion_id &&
                                x.slot === v.slot,
                            )
                            .at(-1)!.id,
                        );
                    }}
                  >
                    Registrar nueva versión del mismo enlace
                  </button>
                  {data.manager && v.counts_change && (
                    <>
                      <button onClick={() => setExclude((s) => !s)}>
                        Corregir conteo por enlace equivocado
                      </button>
                      {exclude && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (
                              await run({
                                action: "exclude",
                                versionId: v.id,
                                reason,
                              })
                            )
                              setExclude(false);
                          }}
                        >
                          <label>
                            Motivo
                            <input
                              minLength={8}
                              maxLength={500}
                              required
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                            />
                          </label>
                          <button disabled={busy}>Excluir de la métrica</button>
                          {v.exclusion_reason && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void run({
                                  action: "exclude",
                                  versionId: v.id,
                                  reason: null,
                                })
                              }
                            >
                              Volver a incluir
                            </button>
                          )}
                        </form>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="cr-note-list">
                    {!notes.length && (
                      <div className="cr-empty">
                        <MessageSquare size={28} />
                        <h3>
                          {v.category === "video"
                            ? "Pausa y comenta el video"
                            : "Haz clic en el diseño"}
                        </h3>
                        <p>
                          Señala dónde quieres un cambio y escribe tu
                          comentario. También puedes marcar una zona y pegar
                          imágenes de referencia.
                        </p>
                      </div>
                    )}
                    {notes.map((n, i) => (
                      <article
                        id={"note-" + n.id}
                        className={selected === n.id ? "selected" : ""}
                        key={n.id}
                      >
                        <button
                          className="cr-note-heading"
                          onClick={() => focus(n.id)}
                        >
                          <span className="cr-number">{i + 1}</span>
                          <span>
                            <b>{n.requested_by || "Equipo"}</b>
                            <small>
                              {n.seconds !== null
                                ? `${n.seconds.toFixed(1)} s · `
                                : ""}
                              Página {n.page} · {date(n.created_at)}
                            </small>
                          </span>
                        </button>
                        <p className="cr-note-text">{n.text}</p>
                        {n.attachments.map((a, j) => (
                          <a
                            key={j}
                            href={a}
                            download={`referencia-${i + 1}-${j + 1}.jpg`}
                          >
                            <img
                              className="cr-reference"
                              loading="lazy"
                              src={a}
                              alt={`Referencia ${j + 1} de la observación ${i + 1}`}
                            />
                          </a>
                        ))}
                        <small>Anotado por {n.author || "Equipo"}</small>
                        <label className="cr-state">
                          Estado
                          <select
                            aria-label={`Estado observación ${i + 1}`}
                            disabled={busy}
                            value={n.state}
                            onChange={(e) =>
                              void updateState(
                                n,
                                e.target.value as ReviewNote["state"],
                              )
                            }
                          >
                            {Object.entries(stateLabels).map(([s, l]) => (
                              <option key={s} value={s}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </label>
                        {n.applied_version_id && (
                          <small>
                            Aplicado en V
                            {
                              data.versions.find(
                                (x) => x.id === n.applied_version_id,
                              )?.version
                            }
                          </small>
                        )}
                      </article>
                    ))}
                    {!!previous.length && (
                      <details>
                        <summary>
                          {previous.length} pendientes de versiones anteriores
                        </summary>
                        {previous.map((n) => (
                          <article key={n.id}>
                            <small>
                              V
                              {
                                data.versions.find((x) => x.id === n.version_id)
                                  ?.version
                              }
                            </small>
                            <p>{n.text}</p>
                            <button
                              disabled={busy}
                              onClick={() => void updateState(n, "aplicado")}
                            >
                              Aplicado en V{v.version}
                            </button>
                            <button onClick={() => changeVersion(n.version_id)}>
                              Ver origen
                            </button>
                          </article>
                        ))}
                      </details>
                    )}
                  </div>
                  {composing ? (
                    <form
                      className="cr-composer"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void addNote();
                      }}
                      onPaste={(e) => {
                        const f = [...e.clipboardData.files].filter((x) =>
                          x.type.startsWith("image/"),
                        );
                        if (f.length) {
                          e.preventDefault();
                          void attach(f);
                        }
                      }}
                    >
                      <label>
                        Solicitado por
                        <input
                          value={requestedBy}
                          maxLength={160}
                          onChange={(e) => setRequestedBy(e.target.value)}
                          placeholder="Cliente o nombre de la persona"
                        />
                      </label>
                      <label>
                        Cambio solicitado
                        <textarea
                          ref={commentInput}
                          required
                          maxLength={4000}
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Por ejemplo: usar el logo oficial en esta esquina…"
                        />
                      </label>
                      {mark && (
                        <small>
                          {mark.x !== null
                            ? "Zona marcada"
                            : "Observación general"}{" "}
                          · página {mark.page}
                          {mark.seconds !== null
                            ? ` · ${mark.seconds.toFixed(1)} s`
                            : ""}
                          <button type="button" onClick={() => setMark(null)}>
                            Quitar marca
                          </button>
                        </small>
                      )}
                      {attachments.map((a, i) => (
                        <div className="cr-attachment" key={i}>
                          <img
                            src={a}
                            alt={`Referencia por adjuntar ${i + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setAttachments((s) => s.filter((_, j) => i !== j))
                            }
                            aria-label={`Quitar referencia ${i + 1}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="cr-composer-actions">
                        <label className="cr-file">
                          + Referencia
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            multiple
                            disabled={attachments.length >= 3}
                            onChange={(e) => {
                              void attach([...(e.target.files || [])]);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button type="button" onClick={discard}>
                          Descartar
                        </button>
                        <button
                          className="primary"
                          disabled={busy || !text.trim()}
                        >
                          Guardar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      className="cr-add-comment"
                      onClick={() =>
                        beginNote({
                          x: null,
                          y: null,
                          width: null,
                          height: null,
                          page: 1,
                          seconds: null,
                        })
                      }
                    >
                      <Plus size={16} /> Comentario general del archivo
                    </button>
                  )}
                </>
              )}
              <footer>
                <span>
                  V{v.version} · {rounds.length}{" "}
                  {rounds.length === 1 ? "revisión" : "revisiones"}
                </span>
                <button
                  disabled={busy || !openRound || !!text}
                  onClick={async () => {
                    if (await run({ action: "closeRound", versionId: v.id }))
                      setMessage(
                        "Revisión finalizada. Las observaciones pendientes se conservan.",
                      );
                  }}
                >
                  <CheckCheck size={15} />
                  Finalizar revisión
                </button>
              </footer>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
