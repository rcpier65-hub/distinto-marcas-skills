"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MousePointer2,
  MessageSquarePlus,
  Scan,
  Expand,
  Minimize,
  Brush,
} from "lucide-react";
import type { ReviewNote } from "@/lib/creative-review/model";
import type { PDFDocumentProxy } from "pdfjs-dist";
export type Mark = {
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  page: number;
  seconds: number | null;
};

function PDFPage({
  src,
  page,
  onPages,
  onRatio,
  onRendered,
}: {
  src: string;
  page: number;
  onPages: (n: number) => void;
  onRatio: (n: number) => void;
  onRendered: (canvas: HTMLCanvasElement, page: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    import("pdfjs-dist")
      .then((pdf) => {
        if (cancelled) return;
        pdf.GlobalWorkerOptions.workerSrc = "/creative-review/pdf.worker.mjs";
        const task = pdf.getDocument({ url: src });
        dispose = () => {
          void task.destroy();
        };
        return task.promise.then((d) => {
          if (!cancelled) {
            setDoc(d);
            onPages(d.numPages);
          }
        });
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo abrir este PDF.");
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [src, onPages]);
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    let cancel: (() => void) | undefined;
    doc
      .getPage(page)
      .then((p) => {
        if (cancelled || !canvas.current) return;
        const viewport = p.getViewport({
          scale: Math.min(2, 1400 / p.getViewport({ scale: 1 }).width),
        });
        onRatio(viewport.width / viewport.height);
        canvas.current.width = viewport.width;
        canvas.current.height = viewport.height;
        const task = p.render({ canvas: canvas.current, viewport });
        cancel = () => task.cancel();
        return task.promise.then(() => { if (!cancelled && canvas.current) onRendered(canvas.current, page); });
      })
      .catch((e) => {
        if (!cancelled && e?.name !== "RenderingCancelledException")
          setError("No se pudo mostrar esta página.");
      });
    return () => {
      cancelled = true;
      cancel?.();
    };
  }, [doc, page, onRatio, onRendered]);
  return error ? (
    <p role="alert">{error}</p>
  ) : (
    <canvas
      ref={canvas}
      aria-label={`Página ${page}`}
      style={{ width: "100%", display: "block" }}
    />
  );
}
export function ReviewViewer({
  publicationId,
  canSketch,
  hasSketch,
  versionId,
  notes,
  mark,
  onMark,
  onSelect,
  selected,
  focus,
  focusTick,
  onFullscreen,
  presenting,
  draftPending,
}: {
  publicationId: string;
  canSketch: boolean;
  hasSketch: boolean;
  versionId: string;
  notes: ReviewNote[];
  mark: Mark | null;
  onMark: (m: Mark | null) => void;
  onSelect: (id: string) => void;
  selected: string | null;
  focus: ReviewNote | null;
  focusTick: number;
  onFullscreen: () => void;
  presenting: boolean;
  draftPending: boolean;
}) {
  const [mime, setMime] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [zoom, setZoom] = useState(0);
  const [ratio, setRatio] = useState(1.5);
  const [stageSize, setStageSize] = useState({ width: 600, height: 400 });
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setStageSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  const [tool, setTool] = useState<"view" | "pin" | "area">("pin");
  const [drag, setDrag] = useState<Mark | null>(null);
  const draft = drag || mark;
  const [seconds, setSeconds] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const src = `/api/creative-review/media/${versionId}`;
  useEffect(() => {
    const ac = new AbortController();
    fetch(src + "?info=1", { signal: ac.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "No se pudo cargar el archivo");
        setMime(d.mime);
        if (d.mime.startsWith("video/")) setTool("view");
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(e.message);
      });
    return () => ac.abort();
  }, [src]);
  const focusId = focus?.id,
    focusPage = focus?.page,
    focusSeconds = focus?.seconds;
  useEffect(() => {
    if (!focusId) return;
    queueMicrotask(() => setPage(focusPage || 1));
    if (video.current && focusSeconds !== null && focusSeconds !== undefined) {
      video.current.pause();
      video.current.currentTime = focusSeconds;
    }
  }, [focusId, focusPage, focusSeconds, focusTick]);
  const [sketchStatus, setSketchStatus] = useState("");
  const [sketchBusy, setSketchBusy] = useState(false);
  const sketchLock = useRef(false);
  const pdfSnapshot = useRef<{ image: string; page: number } | null>(null);
  const syncSketch = useCallback(async (snapshot?: { image: string; page: number; seconds?: number }, open = false) => {
    if (!canSketch || sketchLock.current) return;
    sketchLock.current = true;
    setSketchBusy(true);
    setSketchStatus("Incorporando la versión al boceto…");
    try {
      const r = await fetch(`/api/creative-review/${publicationId}/boceto`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, ...snapshot, create: open }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "No se pudo incorporar la imagen");
      if (d.requiresPreview) throw Error(d.message);
      setSketchStatus("Versión incorporada al boceto · puedes añadir capturas y propuestas");
      if (open) window.location.assign(d.href);
    } catch (e) { setSketchStatus((e as Error).message); }
    finally { sketchLock.current = false; setSketchBusy(false); }
  }, [canSketch, publicationId, versionId]);
  const pdfRendered = useCallback((canvas: HTMLCanvasElement, page: number) => {
    const snapshot = { image: canvas.toDataURL("image/webp", 0.85), page };
    pdfSnapshot.current = snapshot;
    if (hasSketch) void syncSketch(snapshot);
  }, [hasSketch, syncSketch]);
  const openSketch = () => {
    if (draftPending) { setSketchStatus("Guarda o descarta la observación antes de abrir el boceto."); return; }
    if (mime.startsWith("video/")) {
      const el = video.current;
      if (!el || el.readyState < 2) { setSketchStatus("Reproduce el video y pausa en el fotograma que quieres llevar al boceto."); return; }
      el.pause();
      const canvas = document.createElement("canvas");
      const factor = Math.min(1, 1800 / Math.max(el.videoWidth, el.videoHeight));
      canvas.width = el.videoWidth * factor; canvas.height = el.videoHeight * factor;
      canvas.getContext("2d")!.drawImage(el, 0, 0, canvas.width, canvas.height);
      void syncSketch({ image: canvas.toDataURL("image/webp", 0.85), page: 1, seconds: el.currentTime }, true);
    } else if (mime === "application/pdf") {
      if (pdfSnapshot.current?.page !== page) { setSketchStatus("Espera a que se muestre esta página."); return; }
      void syncSketch(pdfSnapshot.current, true);
    } else void syncSketch(undefined, true);
  };
  const point = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  };
  const visible = notes.filter(
    (n) =>
      n.page === page &&
      (n.seconds === null || Math.abs(n.seconds - seconds) < 2),
  );
  const location = () => ({
    page,
    seconds: mime.startsWith("video/")
      ? (video.current?.currentTime ?? seconds)
      : null,
  });
  return (
    <section className="cr-preview">
      <div className="cr-tools">
        <div className="cr-segment">
          {(["view", "pin", "area"] as const).map((t) => (
            <button
              key={t}
              aria-pressed={tool === t}
              onClick={() => {
                setTool(t);
                if (t !== "view") video.current?.pause();
              }}
            >
              {t === "view" ? (
                <MousePointer2 size={15} />
              ) : t === "pin" ? (
                <MessageSquarePlus size={15} />
              ) : (
                <Scan size={15} />
              )}
              {t === "view" ? "Explorar" : t === "pin" ? "Comentar" : "Zona"}
            </button>
          ))}
        </div>
        {mime === "application/pdf" && (
          <div className="cr-pager">
            <button
              disabled={page <= 1 || draftPending}
              onClick={() => {
                setPage((p) => p - 1);
                onMark(null);
              }}
              aria-label="Página anterior"
            >
              ‹
            </button>
            <span>
              {page} / {pages}
            </span>
            <button
              disabled={page >= pages || draftPending}
              onClick={() => {
                setPage((p) => p + 1);
                onMark(null);
              }}
              aria-label="Página siguiente"
            >
              ›
            </button>
          </div>
        )}
        <div className="cr-zoom-tools">
          <label>
            Zoom{" "}
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value={0}>Ajustar</option>
              {[50, 75, 100, 125, 150, 200].map((z) => (
                <option key={z} value={z}>
                  {z}%
                </option>
              ))}
            </select>
          </label>
          <button
            className="cr-expand-viewer"
            aria-label={
              presenting ? "Reducir visor" : "Ampliar visor a pantalla completa"
            }
            title="Pantalla completa"
            onClick={onFullscreen}
          >
            {presenting ? <Minimize size={17} /> : <Expand size={17} />}
          </button>
        </div>
      </div>
      {canSketch && <div className="cr-sketch-strip">
        <span role="status">{sketchStatus || "Lleva esta versión al lienzo para dibujar y pegar referencias."}</span>
        <button disabled={sketchBusy || !mime || !!error || draftPending} onClick={openSketch}>
          <Brush size={16} /> {mime.startsWith("video/") ? "Fotograma al boceto" : "Trabajar en boceto"}
        </button>
      </div>}
      <div className="cr-stage" ref={stage}>
        {error ? (
          <div className="cr-empty" role="alert">
            <b>El archivo no permite la vista previa</b>
            <p>{error}</p>
            <p>
              Puedes anotar una observación general o abrir el enlace original.
              Usa un enlace directo a un archivo, no a una carpeta.
            </p>
          </div>
        ) : !mime ? (
          <div className="cr-empty" role="status">
            Cargando archivo…
          </div>
        ) : (
          <div
            className="cr-media"
            style={{
              width: `${zoom === 0 ? Math.max(1, Math.min(stageSize.width, stageSize.height * ratio)) : (stageSize.width * zoom) / 100}px`,
              maxWidth: "none",
            }}
          >
            {mime === "application/pdf" ? (
              <PDFPage
                src={src}
                page={page}
                onPages={setPages}
                onRatio={setRatio}
                onRendered={pdfRendered}
              />
            ) : mime.startsWith("video/") ? (
              <video
                ref={video}
                src={src}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) =>
                  setRatio(
                    e.currentTarget.videoWidth / e.currentTarget.videoHeight ||
                      1.5,
                  )
                }
                onTimeUpdate={(e) => setSeconds(e.currentTarget.currentTime)}
                onSeeked={(e) => setSeconds(e.currentTarget.currentTime)}
                onError={() =>
                  setError(
                    "Este video no se puede reproducir en el navegador. Prueba con MP4 H.264.",
                  )
                }
                style={{ width: "100%", display: "block" }}
              />
            ) : (
              <img
                src={src}
                alt="Entrega seleccionada"
                onLoad={(e) => {
                  if (hasSketch) void syncSketch();
                  setRatio(
                    e.currentTarget.naturalWidth /
                      e.currentTarget.naturalHeight || 1.5,
                  );
                }}
                onError={() => setError("No se pudo mostrar la imagen.")}
                style={{ width: "100%", display: "block" }}
              />
            )}
            <div
              className="cr-annotations"
              style={{
                pointerEvents: tool === "view" ? "none" : "auto",
                touchAction: tool === "area" ? "none" : "auto",
                cursor: tool === "view" ? "default" : "crosshair",
              }}
              onPointerDown={(e) => {
                if (tool === "view") return;
                e.currentTarget.setPointerCapture(e.pointerId);
                start.current = point(e);
                video.current?.pause();
              }}
              onPointerMove={(e) => {
                if (tool !== "area" || !start.current) return;
                const p = point(e);
                setDrag({
                  ...location(),
                  x: Math.min(p.x, start.current.x),
                  y: Math.min(p.y, start.current.y),
                  width: Math.abs(p.x - start.current.x),
                  height: Math.abs(p.y - start.current.y),
                });
              }}
              onPointerCancel={() => {
                start.current = null;
                setDrag(null);
              }}
              onPointerUp={(e) => {
                if (!start.current) return;
                const p = point(e),
                  from = start.current;
                start.current = null;
                setDrag(null);
                onMark({
                  ...location(),
                  x: tool === "area" ? Math.min(from.x, p.x) : p.x,
                  y: tool === "area" ? Math.min(from.y, p.y) : p.y,
                  width: tool === "area" ? Math.abs(from.x - p.x) : null,
                  height: tool === "area" ? Math.abs(from.y - p.y) : null,
                });
              }}
            >
              {visible
                .filter((n) => n.x !== null && n.y !== null)
                .map((n) => (
                  <button
                    key={n.id}
                    className={`cr-pin ${selected === n.id ? "selected" : ""}`}
                    title={n.text}
                    aria-label={`Observación ${notes.indexOf(n) + 1}: ${n.text}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onSelect(n.id)}
                    style={{
                      transform: n.width ? "none" : undefined,
                      left: `${n.x! * 100}%`,
                      top: `${n.y! * 100}%`,
                      width: n.width ? `${n.width * 100}%` : undefined,
                      height: n.height ? `${n.height * 100}%` : undefined,
                      pointerEvents: "auto",
                    }}
                  >
                    {notes.indexOf(n) + 1}
                  </button>
                ))}
              {draft && draft.page === page && draft.x !== null && (
                <div
                  className="cr-pin draft"
                  style={{
                    transform: draft.width ? "none" : undefined,
                    left: `${draft.x * 100}%`,
                    top: `${(draft.y || 0) * 100}%`,
                    width: draft.width ? `${draft.width * 100}%` : undefined,
                    height: draft.height ? `${draft.height * 100}%` : undefined,
                  }}
                >
                  +
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <footer>
        {mime.startsWith("video/")
          ? `Posición: ${seconds.toFixed(1)} s · pausa y marca el punto del cambio.`
          : "Haz clic en el diseño para dejar un comentario. Zona permite marcar un área."}
        <button
          onClick={() =>
            onMark({
              x: null,
              y: null,
              width: null,
              height: null,
              ...location(),
            })
          }
        >
          Observación general
          {mime.startsWith("video/") ? " en este segundo" : ""}
        </button>
      </footer>
    </section>
  );
}
