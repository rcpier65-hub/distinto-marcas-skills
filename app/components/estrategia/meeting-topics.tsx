"use client";
/* "Para la próxima reunión" en el Resumen de la marca (Pedro 19-oct-2026).
   Reemplaza el botón de Próxima reunión: muestra la fecha y cuántos temas hay;
   al abrirlo lista lo que se presenta (tareas terminadas) y lo que se conversa
   (tareas pendientes y temas sueltos), permite agregar temas, empezar la
   reunión en Notas y reuniones con el orden del día y cerrarla como presentada. */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, Circle, MessageSquareText, NotebookPen, Plus, Video, X } from "lucide-react";
import { api, Modal, PrettyDate } from "./common";

type Tema = { id: string; tipo: "tarea" | "tema"; texto: string; hecha: boolean; responsable: string | null; tareaId: string | null };
type Datos = { temas: Tema[]; ultima: { fecha: string; total: number; notaId: string | null } | null };
type Reunion = { date?: string | null; time?: string | null; title: string } | undefined;

const URL_TEMAS = "/api/estrategia/reunion-temas";

export function MeetingTopics({ slug, brandName, meeting }: { slug: string; brandName: string; meeting: Reunion }) {
  const router = useRouter();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${URL_TEMAS}?marca=${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (r.ok) setDatos(await r.json());
    } catch {
      /* sin red: se conserva lo último cargado */
    }
  }, [slug]);
  useEffect(() => {
    /* Primera carga fuera del render del efecto; se recarga al volver a la pestaña
       (por ejemplo, después de marcar tareas en el tablero). */
    const primera = setTimeout(() => void cargar(), 0);
    const alVolver = () => { if (document.visibilityState === "visible") void cargar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { clearTimeout(primera); document.removeEventListener("visibilitychange", alVolver); };
  }, [cargar]);

  const accion = async (clave: string, input: Record<string, unknown>) => {
    setOcupado(clave);
    try {
      const out = await api(URL_TEMAS, { marca: slug, ...input });
      setDatos({ temas: out.temas, ultima: out.ultima });
      return out;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar");
      return null;
    } finally {
      setOcupado(null);
    }
  };

  const temas = datos?.temas ?? [];
  const presentar = temas.filter((t) => t.hecha);
  const conversar = temas.filter((t) => !t.hecha);
  const resumen = !datos
    ? "Cargando temas…"
    : temas.length
      ? [presentar.length && `${presentar.length} para presentar`, conversar.length && `${conversar.length} para conversar`].filter(Boolean).join(" · ")
      : "Sin temas aún · toca para agregar";

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    const texto = nuevo.trim();
    if (!texto) return;
    if (await accion("agregar", { accion: "agregar", texto })) setNuevo("");
  };
  const empezar = async () => {
    const out = await accion("empezar", { accion: "empezar" });
    if (out?.notaId) router.push(`/notas-reuniones/${out.notaId}`);
  };
  const cerrar = async () => {
    if (!confirm(`¿Marcar los ${temas.length} temas como presentados? La lista quedará vacía para la próxima reunión.`)) return;
    if (await accion("presentado", { accion: "presentado" })) toast.success("Reunión cerrada. La lista quedó lista para la próxima.");
  };

  const Fila = ({ t }: { t: Tema }) => (
    <li className="st-mt-item">
      {t.tipo === "tema" ? <MessageSquareText size={15} className="st-mt-ico" /> : t.hecha ? <CheckCircle2 size={15} className="st-mt-ico st-mt-done" /> : <Circle size={15} className="st-mt-ico" />}
      <span className="st-mt-text">
        {t.tareaId ? <Link href={`/tareas?marca=${encodeURIComponent(slug)}${t.hecha ? `&tarea=${t.tareaId}` : ""}`}>{t.texto}</Link> : t.texto}
        <small>{t.tipo === "tema" ? "Tema" : t.hecha ? "Terminada" : "En curso"}{t.responsable ? ` · ${t.responsable}` : ""}</small>
      </span>
      <button className="st-icon st-mt-remove" aria-label="Quitar de la reunión" title="Quitar de la reunión" disabled={!!ocupado} onClick={() => accion(`quitar:${t.id}`, { accion: "quitar", id: t.id })}>
        <X size={14} />
      </button>
    </li>
  );

  return (
    <>
      <button className="st-next-meeting" onClick={() => setAbierto(true)} aria-label="Abrir temas para la próxima reunión">
        <Video size={17} />
        <span>
          <small>Próxima reunión</small>
          <strong title={meeting?.title}>
            {meeting ? (
              <>
                <PrettyDate value={meeting.date ?? ""} /> · {meeting.time?.slice(0, 5)} · {meeting.title}
              </>
            ) : (
              "Por programar"
            )}
          </strong>
          <em className={temas.length ? "st-mt-count" : "st-mt-count st-mt-empty"}>{resumen}</em>
        </span>
        <ChevronRight size={14} />
      </button>

      {abierto && (
        <Modal title={`Para la próxima reunión · ${brandName}`} close={() => setAbierto(false)}>
          <div className="st-mt">
            <p className="st-mt-when">
              <Video size={14} />
              {meeting ? (
                <>
                  <PrettyDate value={meeting.date ?? ""} /> · {meeting.time?.slice(0, 5)} · {meeting.title}
                </>
              ) : (
                "Aún no hay reunión agendada con esta marca."
              )}
            </p>

            <section>
              <h3>Para presentar <span>{presentar.length}</span></h3>
              {presentar.length ? <ul>{presentar.map((t) => <Fila key={t.id} t={t} />)}</ul> : <p className="st-mt-hint">Cuando termines una tarea, márcala con «Para la próxima reunión» en el menú ⋯ de su tarjeta (o desde el Archivo de tareas).</p>}
            </section>

            <section>
              <h3>Para conversar <span>{conversar.length}</span></h3>
              {conversar.length ? <ul>{conversar.map((t) => <Fila key={t.id} t={t} />)}</ul> : <p className="st-mt-hint">Temas y tareas en curso que quieras revisar con el cliente.</p>}
              <form className="st-mt-add" onSubmit={agregar}>
                <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} maxLength={600} placeholder="Agregar un tema… (ej. revisar presupuesto de Ads)" aria-label="Nuevo tema para la reunión" />
                <button type="submit" disabled={!nuevo.trim() || !!ocupado}>
                  <Plus size={14} /> Agregar
                </button>
              </form>
            </section>

            <div className="st-mt-actions">
              <button className="st-primary" disabled={!!ocupado} onClick={empezar}>
                <NotebookPen size={15} /> {ocupado === "empezar" ? "Abriendo…" : "Empezar reunión"}
              </button>
              <button disabled={!temas.length || !!ocupado} onClick={cerrar}>
                <CheckCircle2 size={15} /> Marcar como presentado
              </button>
            </div>
            <p className="st-mt-hint">
              «Empezar reunión» abre una nota en Notas y reuniones con esta lista como orden del día. Ahí puedes grabar, transcribir y convertir los acuerdos en tareas con su responsable.
            </p>
            {datos?.ultima && (
              <p className="st-mt-last">
                Última reunión cerrada: <PrettyDate value={datos.ultima.fecha.slice(0, 10)} /> · {datos.ultima.total} tema{datos.ultima.total === 1 ? "" : "s"}
                {datos.ultima.notaId && <> · <Link href={`/notas-reuniones/${datos.ultima.notaId}`}>Ver nota</Link></>}
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
