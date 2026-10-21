"use client";
/* Presentación de Desarrollo web a pantalla completa (Pedro 21-oct-2026).
   Etapas: portada → escuchar → cómo trabajamos → preguntas → tu web →
   propuesta. Las notas de la reunión quedan a la vista del cliente («así nos
   ordenamos»). Todo se guarda solo mientras se conversa. */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { CHECKLIST, FAQ, GUIA_NOTAS, PREGUNTAS, enlaceSeguro, aplicarRespuesta, nivelDeSesion, type Estado, type RespuestasWeb, type Sesion } from "@/lib/presentacion/web";
import { crearCola } from "@/lib/presentacion/cola";
import { NIVELES, type Nivel } from "@/lib/presentacion/niveles";
import type { SesionGuardada } from "@/lib/presentacion/server";
import { display, sans } from "./fuentes";
import { Proceso } from "./proceso";
import "./presentacion.css";

const ETAPAS = ["Inicio", "Te escuchamos", "Cómo trabajamos", "Preguntas", "Tu web", "Propuesta"] as const;
const ORDEN: Nivel[] = ["basico", "intermedio", "avanzado"];

export function Deck({ inicial }: { inicial: SesionGuardada }) {
  const [s, setS] = useState<Sesion>(inicial.data);
  const [etapa, setEtapa] = useState(0);
  const [notasAbiertas, setNotasAbiertas] = useState(true);
  const [guardado, setGuardado] = useState<"ok" | "pendiente" | "error">("ok");
  const [propuesta, setPropuesta] = useState<{ id: string; numero: number } | null>(inicial.propuestaId ? { id: inicial.propuestaId, numero: 0 } : null);
  const [generando, setGenerando] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const notasRef = useRef<HTMLTextAreaElement>(null);
  const reducir = useReducedMotion();
  const empresa = s.cliente.empresa || s.cliente.nombre || "tu negocio";

  /* Autoguardado: 800 ms después del último cambio, un envío a la vez y con
     el dato más reciente. Al salir de la página se envía lo pendiente. */
  const enviar = useCallback(async (data: Sesion, keepalive = false) => {
    try {
      const r = await fetch("/api/presentaciones", { method: "PUT", keepalive, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: inicial.id, data }) });
      return r.ok;
    } catch { return false; }
  }, [inicial.id]);
  const [cola] = useState(() => crearCola<Sesion>((d) => enviar(d)));
  useEffect(() => cola.alCambiar(setGuardado), [cola]);
  useEffect(() => {
    const salir = () => { const v = cola.tomarPendiente(); if (v) void enviar(v, true); };
    const oculto = () => { if (document.visibilityState === "hidden") void cola.vaciar(); };
    const avisar = (e: BeforeUnloadEvent) => { if (cola.hayPendiente()) e.preventDefault(); };
    window.addEventListener("pagehide", salir);
    document.addEventListener("visibilitychange", oculto);
    window.addEventListener("beforeunload", avisar);
    return () => { window.removeEventListener("pagehide", salir); document.removeEventListener("visibilitychange", oculto); window.removeEventListener("beforeunload", avisar); salir(); };
  }, [cola, enviar]);
  const cambiar = useCallback((f: (x: Sesion) => Sesion) => {
    setS((x) => { const nuevo = f(x); cola.programar(nuevo); return nuevo; });
  }, [cola]);
  const responder = (clave: keyof RespuestasWeb, valor: unknown) => cambiar((x) => aplicarRespuesta(x, clave, valor));

  const ir = useCallback((n: number) => setEtapa(Math.max(0, Math.min(ETAPAS.length - 1, n))), []);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); setEtapa((x) => Math.min(ETAPAS.length - 1, x + 1)); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); setEtapa((x) => Math.max(0, x - 1)); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  /* Salir al sistema: guarda lo pendiente, quita la pantalla completa y vuelve a la lista. */
  const router = useRouter();
  const salir = async () => {
    await cola.vaciar();
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    router.push("/presentaciones");
  };
  const pantallaCompleta = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      /* Toda la página (no solo la presentación) para que se vean los avisos. */
      else await document.documentElement.requestFullscreen();
    } catch { toast.error("Tu navegador no permitió la pantalla completa."); }
  };

  const generar = async () => {
    setGenerando(true);
    try {
      /* Guarda lo último antes de generar; si no se pudo, no genera con datos viejos. */
      cola.programar(s);
      if (!(await cola.vaciar())) throw new Error("No se pudieron guardar los últimos cambios. Revisa la conexión y vuelve a intentar.");
      const r = await fetch("/api/presentaciones/propuesta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: inicial.id }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo generar la propuesta");
      setPropuesta({ id: j.propuestaId, numero: j.numero });
      toast.success(j.existente ? "Esta reunión ya tenía su propuesta." : "Propuesta creada en Planes y Propuestas.");
    } catch (x) { toast.error(x instanceof Error ? x.message : "No se pudo generar la propuesta"); }
    finally { setGenerando(false); }
  };

  const n = nivelDeSesion(s);
  const anim = reducir ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] as const } };

  return (
    <div ref={raiz} className={`pr ${display.variable} ${sans.variable}`}>
      <header className="pr-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/agencia/distinto-horizontal.svg" alt="Distinto" width={112} height={26} />
        <nav className="pr-etapas" aria-label="Etapas de la presentación">
          {ETAPAS.map((e, i) => (
            <button key={e} type="button" className={i === etapa ? "pr-on" : ""} aria-current={i === etapa ? "step" : undefined} onClick={() => ir(i)}>
              <span>{i + 1}</span>{e}
            </button>
          ))}
        </nav>
        <div className="pr-top-acciones">
          <span className={`pr-guardado pr-g-${guardado}`}>{guardado === "ok" ? "Guardado" : guardado === "pendiente" ? "Guardando…" : "Sin conexión: no se guardó"}</span>
          <button type="button" className="pr-btn pr-btn-ghost" onClick={() => setNotasAbiertas((v) => !v)} aria-pressed={notasAbiertas}>{notasAbiertas ? "Ocultar notas" : "Notas"}</button>
          <button type="button" className="pr-btn pr-btn-ghost" onClick={pantallaCompleta}>Pantalla completa</button>
          <button type="button" className="pr-btn pr-btn-main" onClick={salir}>Salir</button>
        </div>
      </header>

      <div className={`pr-cuerpo ${notasAbiertas ? "" : "pr-sin-notas"}`}>
        <main className="pr-escena">
          <AnimatePresence mode="wait">
            <motion.section key={etapa} className="pr-etapa" {...anim}>
              {etapa === 0 && (
                <div className="pr-portada">
                  <p className="pr-portada-para">Propuesta de desarrollo web para</p>
                  <h1>{empresa}</h1>
                  <p className="pr-portada-sub">Una web pensada para tu negocio: primero te escuchamos, después te mostramos cómo la construimos y cerramos con una propuesta a tu medida.</p>
                  <button type="button" className="pr-btn pr-btn-main" onClick={() => ir(1)}>Empezar</button>
                </div>
              )}

              {etapa === 1 && (
                <div className="pr-escuchar">
                  <h2>Cuéntanos sobre tu proyecto</h2>
                  {[...new Set(PREGUNTAS.map((q) => q.grupo))].map((g) => (
                    <fieldset key={g} className="pr-grupo">
                      <legend>{g}</legend>
                      {PREGUNTAS.filter((q) => q.grupo === g).map((q) => (
                        <div key={q.id} className="pr-pregunta">
                          <label htmlFor={`q-${q.id}`}>{q.texto}</label>
                          {q.tipo === "texto" && (
                            <textarea id={`q-${q.id}`} rows={2} maxLength={1000} value={s.textos[q.id] ?? ""} onChange={(e) => cambiar((x) => ({ ...x, textos: { ...x.textos, [q.id]: e.target.value } }))} />
                          )}
                          {q.tipo === "opcion" && (
                            <div className="pr-chips" role="radiogroup" aria-label={q.texto}>
                              {q.opciones!.map((o) => {
                                const activo = (s.respuestas as Record<string, unknown>)[q.clave!] === o.id;
                                return (
                                  <button key={o.id} type="button" role="radio" aria-checked={activo} className={activo ? "pr-chip pr-chip-on" : "pr-chip"}
                                    onClick={() => responder(q.clave!, activo ? undefined : o.id)}>{o.etiqueta}</button>
                                );
                              })}
                            </div>
                          )}
                          {q.tipo === "enlaces" && (
                            <div className="pr-enlaces">
                              {s.referencias.map((r, i) => {
                                const href = enlaceSeguro(r.url);
                                const editar = (campo: "url" | "motivo", v: string) => cambiar((x) => ({ ...x, referencias: x.referencias.map((y, j) => (j === i ? { ...y, [campo]: v } : y)) }));
                                return (
                                  <div key={i} className="pr-enlace">
                                    <input id={i === 0 ? `q-${q.id}` : undefined} type="url" inputMode="url" placeholder="www.ejemplo.com" maxLength={500} value={r.url} onChange={(e) => editar("url", e.target.value)} aria-label={`Web de referencia ${i + 1}`} />
                                    {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="pr-enlace-abrir">Abrir</a> : <span className="pr-enlace-abrir pr-enlace-off">Abrir</span>}
                                    <button type="button" className="pr-enlace-quitar" aria-label={`Quitar web ${i + 1}`} onClick={() => cambiar((x) => ({ ...x, referencias: x.referencias.filter((_, j) => j !== i) }))}>×</button>
                                    <input className="pr-enlace-motivo" placeholder="¿Por qué le gusta? (diseño, colores, cómo vende…)" maxLength={400} value={r.motivo} onChange={(e) => editar("motivo", e.target.value)} aria-label={`Motivo de la web ${i + 1}`} />
                                  </div>
                                );
                              })}
                              {s.referencias.length < 15 && (
                                <button type="button" className="pr-chip" onClick={() => cambiar((x) => ({ ...x, referencias: [...x.referencias, { url: "", motivo: "" }] }))}>+ Agregar web</button>
                              )}
                              {s.textos[q.id]?.trim() && <p className="pr-enlace-viejo">{s.textos[q.id]}</p>}
                            </div>
                          )}
                          {q.tipo === "sino" && (
                            <div className="pr-chips" role="radiogroup" aria-label={q.texto}>
                              {([["Sí", true], ["No", false]] as const).map(([t, v]) => {
                                const activo = (s.respuestas as Record<string, unknown>)[q.clave!] === v;
                                return <button key={t} type="button" role="radio" aria-checked={activo} className={activo ? "pr-chip pr-chip-on" : "pr-chip"}
                                  onClick={() => responder(q.clave!, activo ? undefined : v)}>{t}</button>;
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </fieldset>
                  ))}
                </div>
              )}

              {etapa === 2 && <Proceso />}

              {etapa === 3 && (
                <div className="pr-faq">
                  <h2>Lo que más nos preguntan</h2>
                  <div className="pr-faq-lista">
                    {FAQ.map((f) => (
                      <details key={f.p}>
                        <summary>{f.p}</summary>
                        <p>{f.r}</p>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {etapa === 4 && (
                <div className="pr-tuweb">
                  <h2>Así podría ser tu web</h2>
                  <Medidor nivel={n.nivel} motivos={n.motivos} reducir={!!reducir} />
                  <div className="pr-check">
                    {[...new Set(CHECKLIST.map((c) => c.grupo))].map((g) => (
                      <fieldset key={g} className="pr-grupo">
                        <legend>{g}</legend>
                        {CHECKLIST.filter((c) => c.grupo === g).map((c) => {
                          const v: Estado = s.checklist[c.id] ?? "no";
                          return (
                            <div key={c.id} className={`pr-item pr-item-${v}`}>
                              <span>{c.etiqueta}{c.detalle && <small>{c.detalle}</small>}</span>
                              <div className="pr-tri" role="radiogroup" aria-label={c.etiqueta}>
                                {(["incluido", "opcional", "no"] as const).map((e) => (
                                  <button key={e} type="button" role="radio" aria-checked={v === e} className={v === e ? "pr-tri-on" : ""}
                                    onClick={() => cambiar((x) => ({ ...x, checklist: { ...x.checklist, [c.id]: e } }))}>
                                    {e === "incluido" ? "Incluido" : e === "opcional" ? "Opcional" : "No"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </fieldset>
                    ))}
                    <fieldset className="pr-grupo">
                      <legend>Algo más que necesite</legend>
                      {s.extras.map((x, i) => (
                        <div key={i} className={`pr-item pr-item-${x.estado}`}>
                          <input className="pr-extra" value={x.texto} maxLength={200} placeholder="Ej.: cotizador de fletes, intranet para clientes…" aria-label={`Ítem adicional ${i + 1}`}
                            onChange={(e) => cambiar((y) => ({ ...y, extras: y.extras.map((z, j) => (j === i ? { ...z, texto: e.target.value } : z)) }))} />
                          <div className="pr-tri" role="radiogroup" aria-label={x.texto || `Ítem adicional ${i + 1}`}>
                            {(["incluido", "opcional", "no"] as const).map((e) => (
                              <button key={e} type="button" role="radio" aria-checked={x.estado === e} className={x.estado === e ? "pr-tri-on" : ""}
                                onClick={() => cambiar((y) => ({ ...y, extras: y.extras.map((z, j) => (j === i ? { ...z, estado: e } : z)) }))}>
                                {e === "incluido" ? "Incluido" : e === "opcional" ? "Opcional" : "No"}
                              </button>
                            ))}
                            <button type="button" aria-label={`Quitar ítem ${i + 1}`} onClick={() => cambiar((y) => ({ ...y, extras: y.extras.filter((_, j) => j !== i) }))}>×</button>
                          </div>
                        </div>
                      ))}
                      {s.extras.length < 20 && <button type="button" className="pr-chip" onClick={() => cambiar((y) => ({ ...y, extras: [...y.extras, { texto: "", estado: "incluido" }] }))}>+ Agregar ítem</button>}
                    </fieldset>
                  </div>
                </div>
              )}

              {etapa === 5 && (
                <div className="pr-cierre">
                  <h2>Tu propuesta</h2>
                  <div className="pr-cierre-grid">
                    <div className="pr-cierre-nivel">
                      <small>Nivel</small>
                      <strong>{n.nombre}</strong>
                      <p>{n.resumen}</p>
                      <dl>
                        <div><dt>Inversión de referencia</dt><dd>{n.rango}</dd></div>
                        <div><dt>Plazo</dt><dd>{n.plazo}</dd></div>
                      </dl>
                    </div>
                    <div>
                      <h3>Incluye</h3>
                      <ul className="pr-lista-check">{CHECKLIST.filter((c) => s.checklist[c.id] === "incluido").map((c) => <li key={c.id}>{c.etiqueta}</li>)}{s.extras.filter((x) => x.estado === "incluido" && x.texto.trim()).map((x, i) => <li key={`e${i}`}>{x.texto}</li>)}</ul>
                      {(CHECKLIST.some((c) => s.checklist[c.id] === "opcional") || s.extras.some((x) => x.estado === "opcional" && x.texto.trim())) && (<>
                        <h3>Opcionales a cotizar</h3>
                        <ul className="pr-lista-op">{CHECKLIST.filter((c) => s.checklist[c.id] === "opcional").map((c) => <li key={c.id}>{c.etiqueta}</li>)}{s.extras.filter((x) => x.estado === "opcional" && x.texto.trim()).map((x, i) => <li key={`e${i}`}>{x.texto}</li>)}</ul>
                      </>)}
                    </div>
                  </div>
                  <p className="pr-quiet">El monto final y las condiciones te llegan en la propuesta formal después de esta reunión.</p>
                  <div className="pr-cierre-acciones">
                    {propuesta ? (<>
                      <Link className="pr-btn pr-btn-main" href={`/planes?propuesta=${propuesta.id}`}>Abrir la propuesta{propuesta.numero ? ` n.º ${propuesta.numero}` : ""}</Link>
                      {/* Si se borró en Planes, se puede volver a generar (el servidor lo detecta). */}
                      <button type="button" className="pr-btn pr-btn-ghost" onClick={generar} disabled={generando}>{generando ? "Revisando…" : "Volver a generar"}</button>
                    </>) : (
                      <button type="button" className="pr-btn pr-btn-main" onClick={generar} disabled={generando}>{generando ? "Generando…" : "Generar propuesta"}</button>
                    )}
                  </div>
                </div>
              )}
            </motion.section>
          </AnimatePresence>
          <div className="pr-nav">
            <button type="button" className="pr-btn pr-btn-ghost" onClick={() => ir(etapa - 1)} disabled={etapa === 0}>Anterior</button>
            <span>{etapa + 1} de {ETAPAS.length}</span>
            <button type="button" className="pr-btn pr-btn-ghost" onClick={() => ir(etapa + 1)} disabled={etapa === ETAPAS.length - 1}>Siguiente</button>
          </div>
        </main>

        {notasAbiertas && (
          <aside className="pr-notas" aria-label="Notas de la reunión">
            <h2>Notas de la reunión</h2>
            <p className="pr-notas-cliente">{s.cliente.empresa}{s.cliente.nombre ? ` · ${s.cliente.nombre}` : ""}</p>
            <details className="pr-guia" open>
              <summary>Preguntas guía · {ETAPAS[etapa]}</summary>
              <ul>
                {(GUIA_NOTAS[etapa] ?? []).map((q) => {
                  const hecha = s.notas.includes(q);
                  return (
                    <li key={q}>
                      <button type="button" className={hecha ? "pr-guia-hecha" : ""} disabled={hecha} title={hecha ? "Ya está en tus notas" : "Agregar a las notas"}
                        onClick={() => { cambiar((x) => ({ ...x, notas: `${x.notas.trimEnd()}${x.notas.trim() ? "\n\n" : ""}${q}\n– ` })); requestAnimationFrame(() => { const t = notasRef.current; if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); t.scrollTop = t.scrollHeight; } }); }}>
                        {q}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
            <textarea ref={notasRef} value={s.notas} maxLength={4000} placeholder="Lo que nos cuenta el cliente: objetivos, ideas, referencias, dudas…"
              onChange={(e) => cambiar((x) => ({ ...x, notas: e.target.value }))} aria-label="Notas de la reunión" />
            <div className="pr-notas-nivel">
              <small>Nivel estimado</small>
              <strong>{n.nombre}</strong>
              <span>{n.rango} · {n.plazo}</span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* Medidor del nivel: la marca amarilla se desliza mientras se responde. */
function Medidor({ nivel, motivos, reducir }: { nivel: Nivel; motivos: string[]; reducir: boolean }) {
  const i = ORDEN.indexOf(nivel);
  return (
    <div className="pr-medidor">
      <div className="pr-medidor-pista">
        {ORDEN.map((k, j) => (
          <div key={k} className={`pr-medidor-tramo ${j <= i ? "pr-lleno" : ""}`}>
            <strong>{NIVELES[k].nombre}</strong>
            <span>{NIVELES[k].rango}</span>
            <small>{NIVELES[k].plazo}</small>
          </div>
        ))}
        <motion.span className="pr-medidor-marca" aria-hidden="true" animate={{ left: `${(i + 0.5) * (100 / 3)}%` }} transition={reducir ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 24 }} />
      </div>
      <p className="pr-medidor-motivos" aria-live="polite">
        {motivos.length ? `Sube el nivel: ${motivos.join(", ").toLowerCase()}.` : "Con lo conversado, una web de presentación clara es suficiente."}
      </p>
    </div>
  );
}
