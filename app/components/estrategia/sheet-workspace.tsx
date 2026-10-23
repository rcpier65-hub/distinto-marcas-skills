"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SketchSync } from '@/components/creative-review/sketch-sync';
import { ReviewLink } from '@/components/creative-review/link';
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  Pause,
  Square,
  MessageSquare,
  History,
  PanelRight,
  Plus,
  Check,
  Play,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { type ActionData, actionInput } from "@/lib/estrategia/model";
import { api, Field, Empty, Jump, Modal } from "./common";
import { useRecording } from "./use-recording";
import "./strategy.css";
import { LinkedPlan } from "./linked-plan";
const Canvas = dynamic(() => import("./canvas"), {
  ssr: false,
  loading: () => <div className="st-empty">Abriendo lienzo…</div>,
});
export function SheetWorkspace({ initial, focusAnchor = "" }: { initial: any; focusAnchor?: string }) {
  const [data, setData] = useState(initial),
    [panel, setPanel] = useState(initial.me.client ? "Comentarios" : initial.sheet.data.description ? "Plan" : "Reunión"),
    [open, setOpen] = useState(!initial.me.client && !initial.sheet.boceto_publicacion_id),
    [status, setStatus] = useState("Guardado"),
    [clientId] = useState(() => crypto.randomUUID()),
    [follow, setFollow] = useState(""),
    [selection, setSelection] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [sessionId, setSessionId] = useState(initial.sessions.at(-1)?.id || ""),
    [comment, setComment] = useState(""),
    [shared, setShared] = useState(false),
    [query, setQuery] = useState(""),
    [consent, setConsent] = useState(false),
    [tabAudio, setTabAudio] = useState(false),
    [selectedActions, setSelectedActions] = useState<string[]>([]),
    [splitting, setSplitting] = useState<string | null>(null),
    [parts, setParts] = useState("");
  const notesDraft = useRef<{ id: string; text: string } | null>(null);
  const revision = useRef(initial.scene.revision),
    url = `/api/estrategia/hojas/${initial.sheet.id}`,
    sheet = data.sheet,
    base = `/marca/${data.brand.slug}/estrategia`;
  const refreshOrder = useRef(0);
  const refresh = useCallback(async () => {
    const order = ++refreshOrder.current;
    const n = await api(`${url}?revision=${revision.current}`);
    if (order !== refreshOrder.current) return;
    if (n.scene) revision.current = n.scene.revision;
    setData((old: any) => ({ ...n, scene: n.scene || old.scene }));
  }, [url]);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible")
        refresh().catch(() =>
          setStatus("Sin conexión. Conservamos los cambios locales."),
        );
    }, 3000);
    return () => clearInterval(id);
  }, [refresh]);
  const recording = useRecording(sheet.id, refresh),
    session = data.sessions.find((s: any) => s.id === sessionId);
  async function act(input: any) {
    setBusy(true);
    try {
      const r = await api(url, input);
      await refresh();
      return r;
    } catch (e) {
      toast.error((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function createSession() {
    const id = crypto.randomUUID();
    await act({ action: "session", id, state: "manual", notes: "" });
    setSessionId(id);
    return id;
  }
  async function record() {
    const id = crypto.randomUUID();
    setSessionId(id);
    await recording.start(id, tabAudio);
  }
  async function newAction() {
    const id = crypto.randomUUID();
    await act({
      action: "action",
      data: actionInput.parse({ id, text: "Nuevo acuerdo por revisar" }),
    });
    setPanel("Acuerdos");
    setOpen(true);
  }
  async function send() {
    const ids = data.actions
      .filter(
        (a: any) => !a.task_id && !a.sent_at && a.data.state === "approved",
      )
      .map((a: any) => a.id);
    if (!ids.length) return;
    await act({ action: "confirm", ids });
    toast.success("Tareas creadas y visibles para sus responsables");
  }
  return (
    <div className="st-sheet">
      <header className="st-sheet-head">
        <div className="st-row">
          <Link
            href={data.me.client ? "/cliente" : base}
            aria-label="Volver a marca"
          >
            <ArrowLeft size={19} />
          </Link>
          <div>
            <small>{data.brand.nombre} / Planificación</small>
            <h1>{sheet.title}</h1>
          </div>
        </div>
        <div className="st-toolbar">
          {!data.me.client && sheet.boceto_publicacion_id && <ReviewLink id={sheet.boceto_publicacion_id} />}
          {!data.me.client && sheet.boceto_publicacion_id && <Link href={`/diseno/${sheet.boceto_publicacion_id}`}>Volver al diseño ↗</Link>}
          <div className="st-presence">
            {data.presence
              .filter((p: any) => p.client_id !== clientId)
              .map((p: any) => (
                <button
                  key={p.client_id}
                  className={follow === p.client_id ? "st-selected" : ""}
                  onClick={() =>
                    setFollow(follow === p.client_id ? "" : p.client_id)
                  }
                  title={
                    follow === p.client_id
                      ? "Dejar de seguir"
                      : "Seguir su vista"
                  }
                >
                  {p.name.split(" ")[0]} {follow === p.client_id ? "◉" : ""}
                </button>
              ))}
          </div>
          {!data.me.client && (
            <button
              onClick={() => {
                setPanel("Acuerdos");
                setOpen(true);
              }}
            >
              Acuerdos ·{" "}
              {
                data.actions.filter((a: any) => a.data.state !== "discarded")
                  .length
              }
            </button>
          )}
          <button
            onClick={() => {
              setOpen(!open);
              if (data.me.client) setPanel("Comentarios");
            }}
            aria-label="Panel lateral"
          >
            <PanelRight size={17} />
          </button>
        </div>
      </header>
      <div className="st-sheet-status">
        {sheet.boceto_publicacion_id && <span>Pega imágenes con Ctrl/Cmd + V, dibuja y añade notas. El boceto se guarda en Planificación.</span>}
        <span>
          {sheet.data.state || "Planificación"} ·{" "}
          {data.me.client ? "Lienzo compartido · solo lectura" : status}
        </span>
        {recording.state !== "idle" ? (
          <span className="st-recording">
            ●{" "}
            {recording.state === "paused"
              ? "Grabación pausada"
              : "Grabando con consentimiento"}{" "}
            · {clock(recording.elapsed)}
          </span>
        ) : (
          <span>El lienzo no crea tareas automáticamente</span>
        )}
      </div>
      {!data.me.client && sheet.boceto_publicacion_id && <SketchSync publicationId={sheet.boceto_publicacion_id} onSynced={refresh} />}
      <div className="st-sheet-content">
        <Canvas
          sheet={sheet}
          focusAnchor={focusAnchor}
          data={data}
          clientId={clientId}
          follow={follow}
          onStatus={setStatus}
          onSelection={setSelection}
        />
        {open && (
          <aside className="st-panel">
            <nav className="st-tabs">
              {(data.me.client
                ? ["Comentarios"]
                : ["Plan", "Reunión", "Acuerdos", "Comentarios", "Historial"]
              ).map((t) => (
                <button
                  key={t}
                  className={panel === t ? "st-active" : ""}
                  onClick={() => setPanel(t)}
                >
                  {t === "Comentarios" ? (
                    <MessageSquare size={14} />
                  ) : t === "Historial" ? (
                    <History size={14} />
                  ) : null}
                  {t}
                </button>
              ))}
            </nav>
            {panel === "Plan" && !data.me.client && <LinkedPlan slug={data.brand.slug} sheetId={sheet.id} objective={sheet.data.objective || ""} description={sheet.data.description || ""}/>}
            {panel === "Reunión" && !data.me.client && (
              <>
                <section>
                  <h3>Sesiones de esta hoja</h3>
                  <select
                    aria-label="Sesión"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                  >
                    <option value="">Selecciona una sesión</option>
                    {data.sessions.map((s: any, i: number) => (
                      <option key={s.id} value={s.id}>
                        Sesión {i + 1} ·{" "}
                        {new Date(s.started_at).toLocaleDateString("es-PE")} ·{" "}
                        {s.state === "recording"
                          ? "Grabando"
                          : s.state === "paused"
                            ? "Pausada"
                            : s.state === "ended"
                              ? "Terminada"
                              : "Notas"}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void createSession().catch(() => {})}
                    disabled={busy || recording.state !== "idle"}
                  >
                    <Plus size={14} />
                    Sesión de notas
                  </button>
                </section>
                <section>
                  <h3>Grabar la reunión</h3>
                  <p className="st-muted">
                    Se guardará audio y transcripción por tramos. El micrófono
                    se activa únicamente al empezar.
                  </p>
                  {recording.state === "idle" ? (
                    <>
                      <Field label="Consentimiento">
                        <label>
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                          />{" "}
                          Todos los participantes saben que grabaremos.
                        </label>
                      </Field>
                      <label className="st-muted">
                        <input
                          type="checkbox"
                          checked={tabAudio}
                          onChange={(e) => setTabAudio(e.target.checked)}
                        />{" "}
                        Incluir audio de una pestaña (reunión remota)
                      </label>
                      <div className="st-toolbar">
                        <button
                          className="st-primary"
                          disabled={!consent || busy}
                          onClick={record}
                        >
                          <Mic size={15} />
                          Iniciar grabación
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="st-toolbar">
                      <strong className="st-recording">
                        ● {clock(recording.elapsed)}
                      </strong>
                      <button onClick={() => recording.pause()}>
                        {recording.state === "paused" ? (
                          <Play size={14} />
                        ) : (
                          <Pause size={14} />
                        )}{" "}
                        {recording.state === "paused" ? "Continuar" : "Pausar"}
                      </button>
                      <button onClick={() => recording.stop()}>
                        <Square size={14} />
                        Terminar
                      </button>
                    </div>
                  )}
                  {recording.error && (
                    <p className="st-error">{recording.error}</p>
                  )}
                  {recording.uploading > 0 && (
                    <small>Guardando {recording.uploading} tramo(s)…</small>
                  )}
                  {recording.failed.length > 0 && (
                    <div className="st-error">
                      <p>
                        {recording.failed.length} tramo(s) pendientes.
                        Conservamos una copia en este navegador.
                      </p>
                      <button onClick={recording.retry}>
                        Reintentar guardado
                      </button>
                      {recording.failed.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            const u = URL.createObjectURL(p.audio);
                            const a = document.createElement("a");
                            a.href = u;
                            a.download = `reunion-${p.start}.${p.audio.type.includes("mp4") ? "m4a" : "webm"}`;
                            a.click();
                            setTimeout(() => URL.revokeObjectURL(u), 60000);
                          }}
                        >
                          <Download size={12} />
                          {clock(p.start)}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
                {session && (
                  <SessionNotes
                    key={session.id}
                    session={session}
                    onDraft={(text) => {
                      notesDraft.current = { id: session.id, text };
                    }}
                    save={(notes) =>
                      act({
                        action: "session",
                        id: session.id,
                        state: session.state,
                        consent: session.data.consent,
                        notes,
                      })
                    }
                    readonly={session.owner_id !== initial.authUserId}
                  />
                )}
                {session && (
                  <section>
                    <div className="st-row">
                      <h3>Transcripción y audio</h3>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void (async () => {
                            const draft = notesDraft.current;
                            if (
                              draft &&
                              session.owner_id === initial.authUserId &&
                              draft.id === session.id
                            ) {
                              await act({
                                action: "session",
                                id: session.id,
                                state: session.state,
                                consent: session.data.consent,
                                notes: draft.text,
                              });
                            }
                            return act({
                              action: "analyze",
                              sessionId: session.id,
                            });
                          })()
                            .then(() => {
                              setPanel("Acuerdos");
                              toast.success(
                                "Revisa las sugerencias antes de crear tareas",
                              );
                            })
                            .catch(() => {})
                        }
                      >
                        Preparar acuerdos con IA
                      </button>
                    </div>
                    <input
                      placeholder="Buscar en esta sesión…"
                      aria-label="Buscar transcripción"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {data.segments
                      .filter(
                        (s: any) =>
                          s.session_id === session.id &&
                          (!query ||
                            s.transcript
                              .toLowerCase()
                              .includes(query.toLowerCase())),
                      )
                      .map((s: any) => (
                        <div key={s.id} className="st-transcript">
                          <small>
                            {clock(s.start_seconds)}–
                            {clock(s.start_seconds + s.duration)} · Hablante sin
                            identificar
                          </small>
                          <audio
                            controls
                            preload="none"
                            src={`/api/estrategia/audio?id=${s.id}`}
                          />
                          <p>
                            {s.transcript || "Tramo guardado, sin transcribir."}
                          </p>
                          {!s.transcript && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                void api("/api/estrategia/audio", { id: s.id })
                                  .then(refresh)
                                  .catch((e) => toast.error(e.message))
                              }
                            >
                              Transcribir este tramo
                            </button>
                          )}
                        </div>
                      ))}
                    {!data.segments.some(
                      (s: any) => s.session_id === session.id,
                    ) && (
                      <p className="st-muted">
                        Todavía no hay audio guardado en esta sesión. También
                        puedes preparar acuerdos con las notas escritas.
                      </p>
                    )}
                    {session.data.summary && (
                      <>
                        <h3>Resumen de la sesión</h3>
                        <p>{session.data.summary}</p>
                        {session.data.decisions?.map((x: string, i: number) => (
                          <p key={i}>✓ {x}</p>
                        ))}
                        {session.data.questions?.map((x: string, i: number) => (
                          <p key={i}>Por aclarar: {x}</p>
                        ))}
                        {session.data.gaps?.map((x: string, i: number) => (
                          <p className="st-error" key={i}>
                            {x}
                          </p>
                        ))}
                      </>
                    )}
                  </section>
                )}
              </>
            )}
            {panel === "Acuerdos" && !data.me.client && (
              <>
                <section>
                  <h3>Revisar antes de enviar</h3>
                  <p className="st-muted">
                    Confirma el texto, responsable y fecha. Los acuerdos
                    enviados siguen el estado de Tareas.
                  </p>
                  <button
                    onClick={() => void newAction().catch(() => {})}
                    disabled={busy}
                  >
                    <Plus size={14} />
                    Acuerdo manual
                  </button>
                </section>
                {selectedActions.length > 1 && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act({ action: "combine", ids: selectedActions })
                        .then(() => setSelectedActions([]))
                        .catch(() => {})
                    }
                  >
                    Combinar seleccionados
                  </button>
                )}
                {data.actions.map((a: any) => (
                  <Agreement
                    key={a.id}
                    action={a}
                    team={data.team}
                    sheetId={sheet.id}
                    selected={selectedActions.includes(a.id)}
                    select={(checked) =>
                      setSelectedActions(
                        checked
                          ? [...selectedActions, a.id]
                          : selectedActions.filter((x) => x !== a.id),
                      )
                    }
                    split={() => {
                      setSplitting(a.id);
                      setParts(a.data.text + "\n");
                    }}
                    save={(p) => act({ action: "action", data: p })}
                    link={(taskId) =>
                      act({ action: "linkTask", id: a.id, taskId })
                    }
                  />
                ))}
                {!data.actions.length && (
                  <Empty>
                    Agrega un acuerdo o prepara sugerencias desde una sesión.
                  </Empty>
                )}
                {data.me.manager && (
                  <button
                    className="st-primary"
                    disabled={
                      busy ||
                      !data.actions.some(
                        (a: any) =>
                          !a.task_id &&
                          !a.sent_at &&
                          a.data.state === "approved",
                      )
                    }
                    onClick={() => void send().catch(() => {})}
                  >
                    <Check size={15} />
                    Confirmar y enviar a Tareas
                  </button>
                )}
              </>
            )}
            {panel === "Comentarios" && (
              <>
                <section>
                  <h3>Conversación sobre la hoja</h3>
                  <p className="st-muted">
                    {selection
                      ? "Comentario vinculado al elemento seleccionado."
                      : "Selecciona una nota o comenta la hoja completa."}
                  </p>
                  <textarea
                    aria-label="Nuevo comentario"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escribe un comentario…"
                  />
                  {!data.me.client && (
                    <label>
                      <input
                        type="checkbox"
                        checked={shared}
                        onChange={(e) => setShared(e.target.checked)}
                      />
                      Visible al cliente si la hoja está compartida
                    </label>
                  )}
                  <button
                    disabled={busy || !comment.trim()}
                    onClick={() =>
                      void act({
                        action: "comment",
                        text: comment,
                        elementId: selection,
                        shared,
                      })
                        .then(() => setComment(""))
                        .catch(() => {})
                    }
                  >
                    Añadir comentario
                  </button>
                </section>
                {data.comments.map((c: any) => (
                  <section key={c.id}>
                    <div className="st-row">
                      <strong>{c.author_name}</strong>
                      <small>
                        {c.resolved
                          ? "Resuelto"
                          : c.shared
                            ? "Compartido"
                            : "Interno"}
                      </small>
                    </div>
                    <p>{c.text}</p>
                    {c.element_id && (
                      <small>Sobre un elemento del lienzo</small>
                    )}
                    {!data.me.client && (
                      <button
                        onClick={() =>
                          void act({
                            action: "resolveComment",
                            id: c.id,
                            resolved: !c.resolved,
                          }).catch(() => {})
                        }
                      >
                        {c.resolved ? "Reabrir" : "Resolver"}
                      </button>
                    )}
                  </section>
                ))}
              </>
            )}
            {panel === "Historial" && !data.me.client && (
              <section>
                <h3>Versiones guardadas</h3>
                <p className="st-muted">
                  Recuperar crea una nueva versión; conserva los comentarios,
                  sesiones y tareas.
                </p>
                {data.history.map((h: any) => (
                  <div className="st-attention" key={h.id}>
                    <strong>{h.label}</strong>
                    <small>
                      {new Date(h.created_at).toLocaleString("es-PE")}
                    </small>
                    {h.label === "Lienzo anterior" && data.me.manager && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void act({ action: "restore", historyId: h.id })
                            .then(() => toast.success("Lienzo recuperado"))
                            .catch(() => {})
                        }
                      >
                        Recuperar lienzo
                      </button>
                    )}
                  </div>
                ))}
              </section>
            )}
          </aside>
        )}
      </div>
      {splitting && (
        <Modal title="Dividir acuerdo" close={() => setSplitting(null)}>
          <Field label="Una tarea por línea">
            <textarea
              rows={5}
              value={parts}
              onChange={(e) => setParts(e.target.value)}
            />
          </Field>
          <p className="st-muted">
            Las nuevas tareas quedarán por revisar. El acuerdo original se
            conservará descartado.
          </p>
          <button
            className="st-primary"
            disabled={
              busy || parts.split("\n").filter((s) => s.trim()).length < 2
            }
            onClick={() =>
              void act({
                action: "split",
                ids: [splitting],
                parts: parts.split("\n").filter((s) => s.trim()),
              })
                .then(() => setSplitting(null))
                .catch(() => {})
            }
          >
            Dividir y revisar
          </button>
        </Modal>
      )}
    </div>
  );
}
function SessionNotes({
  session,
  save,
  readonly,
  onDraft,
}: {
  session: any;
  onDraft: (text: string) => void;
  save: (s: string) => Promise<any>;
  readonly: boolean;
}) {
  const backupKey = `distinto:notes:${session.owner_id}:${session.id}`;
  const [notes, setNotes] = useState(() => {
      if (!readonly && typeof localStorage !== "undefined") {
        try {
          return localStorage.getItem(backupKey) ?? session.data.notes ?? "";
        } catch {}
      }
      return session.data.notes || "";
    }),
    [busy, setBusy] = useState(false);
  const draftRef = useRef(onDraft);
  useEffect(() => {
    draftRef.current = onDraft;
  }, [onDraft]);
  useEffect(() => {
    draftRef.current(notes);
  }, [notes]);
  useEffect(() => {
    if (readonly || notes === (session.data.notes || "")) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [readonly, notes, session.data.notes]);
  return (
    <section>
      <h3>Notas y acuerdos en vivo</h3>
      <textarea
        aria-label="Notas de la reunión"
        value={notes}
        readOnly={readonly}
        onChange={(e) => {
          setNotes(e.target.value);
          try {
            localStorage.setItem(backupKey, e.target.value);
          } catch {}
        }}
        placeholder="Escribe decisiones, ideas y dudas. Puedes continuar aunque falle el audio."
      />
      {!readonly && (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await save(notes);
              try {
                localStorage.removeItem(backupKey);
              } catch {}
              toast.success("Notas guardadas");
            } catch {
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Guardando…" : "Guardar notas"}
        </button>
      )}
    </section>
  );
}
function Agreement({
  action: a,
  team,
  save,
  link,
  sheetId,
  selected,
  select,
  split,
}: {
  action: any;
  team: any[];
  save: (p: ActionData) => Promise<any>;
  link: (id: string) => Promise<any>;
  sheetId: string;
  selected: boolean;
  select: (b: boolean) => void;
  split: () => void;
}) {
  const [d, setD] = useState<ActionData>(a.data),
    [busy, setBusy] = useState(false),
    [taskId, setTaskId] = useState(""),
    [linking, setLinking] = useState(false),
    [tasks, setTasks] = useState<any[]>([]);
  async function submit() {
    setBusy(true);
    try {
      await save(d);
      toast.success("Acuerdo revisado");
    } catch {
    } finally {
      setBusy(false);
    }
  }
  if (a.data.state === "discarded")
    return (
      <details className="st-agreement">
        <summary>Descartado · {a.data.text}</summary>
        <p>{a.data.quote}</p>
      </details>
    );
  if (a.sent_at && !a.task_id)
    return (
      <article className="st-agreement">
        <span className="st-badge">Tarea eliminada en origen</span>
        <h3>{a.data.text}</h3>
        <small>
          Se conserva el acuerdo; no se creará otra tarea al confirmar.
        </small>
      </article>
    );
  if (a.task_id)
    return (
      <article className="st-agreement">
        <span className="st-badge">
          {a.completada ? "Terminada" : a.task_state || "En Tareas"}
        </span>
        <h3>{a.data.text}</h3>
        <p>{a.data.deliverable}</p>
        <Jump href={`/tareas?tarea=${a.task_id}`}>Abrir tarea original</Jump>
        <small>
          Prioridad: {a.data.priority} · {a.data.date || "Sin fecha"}
        </small>
        {a.data.references && <p>{a.data.references}</p>}
      </article>
    );
  return (
    <article className="st-agreement">
      {a.data.state !== "discarded" && (
        <div className="st-row">
          <label className="st-muted">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => select(e.target.checked)}
            />
            Seleccionar
          </label>
          <button onClick={split}>Dividir</button>
        </div>
      )}
      <span className="st-badge">
        {d.state === "approved"
          ? "Revisado"
          : d.state === "discarded"
            ? "Descartado"
            : "Por revisar"}
      </span>
      <Field label="Tarea">
        <textarea
          value={d.text}
          onChange={(e) => setD({ ...d, text: e.target.value })}
        />
      </Field>
      <Field label="Entregable y alcance">
        <textarea
          value={d.deliverable}
          onChange={(e) => setD({ ...d, deliverable: e.target.value })}
        />
      </Field>
      <Field label="Responsable">
        <select
          value={d.memberId || ""}
          onChange={(e) => setD({ ...d, memberId: e.target.value || null })}
        >
          <option value="">Por asignar</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </Field>
      <div className="st-two">
        <Field label="Fecha de entrega">
          <input
            type="date"
            value={d.date}
            onChange={(e) => setD({ ...d, date: e.target.value })}
          />
        </Field>
        <Field label="Prioridad">
          <select
            value={d.priority}
            onChange={(e) =>
              setD({ ...d, priority: e.target.value as ActionData["priority"] })
            }
          >
            {["Normal", "Alta", "Baja"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Referencias y dependencias">
        <textarea
          value={d.references}
          onChange={(e) => setD({ ...d, references: e.target.value })}
          placeholder="Archivos, contexto y qué debe estar listo antes…"
        />
      </Field>
      {d.quote && (
        <blockquote>
          {d.quote}
          <small>{d.source}</small>
        </blockquote>
      )}
      <Field label="Visibilidad de la tarea">
        <label>
          <input
            type="checkbox"
            checked={d.clientVisible === true}
            onChange={(e) => setD({ ...d, clientVisible: e.target.checked })}
          />
          Mostrar esta tarea al cliente en su portal
        </label>
      </Field>
      <Field label="Revisión">
        <select
          value={d.state}
          onChange={(e) =>
            setD({ ...d, state: e.target.value as ActionData["state"] })
          }
        >
          <option value="proposed">Por revisar</option>
          <option value="approved">Revisado y aprobado</option>
          <option value="discarded">Descartar</option>
        </select>
      </Field>
      <div className="st-toolbar">
        <button disabled={busy} onClick={submit}>
          Guardar revisión
        </button>
        <button
          onClick={async () => {
            setLinking(!linking);
            if (!linking)
              try {
                const r = await api(`/api/estrategia/hojas/${sheetId}/tareas`);
                setTasks(r.tasks);
              } catch (e) {
                toast.error((e as Error).message);
              }
          }}
        >
          Vincular tarea existente
        </button>
      </div>
      {linking && (
        <>
          <select
            aria-label="Tarea existente"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          >
            <option value="">Elige una tarea de la marca</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.texto}
              </option>
            ))}
          </select>
          <button
            disabled={!taskId || busy}
            onClick={() => void link(taskId).catch(() => {})}
          >
            Vincular sin duplicar
          </button>
        </>
      )}
    </article>
  );
}
function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
