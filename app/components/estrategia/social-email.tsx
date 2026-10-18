"use client";
/* Enviar el reporte de redes por correo desde team@distintostudio.com y
   activar el envío automático mensual por marca (apagado por defecto).
   Pedro 18-oct-2026. */
import { useEffect, useRef, useState } from "react";
import { Mail, Send, X, Check, Plus, CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Info = {
  configurado: boolean;
  remitente: string | null;
  correosCliente: string[];
  auto: boolean;
  destinatariosAuto: string[];
  ultimoAuto: string | null;
  historial: { month: string; recipients: string[]; mode: string; status: string; error: string | null; created_at: string }[];
};
const mesLargo = (m: string) => {
  const t = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T12:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

async function api<T>(method: string, body?: unknown, slug?: string): Promise<T> {
  const r = await fetch(`/api/meta/reporte-redes/correo${method === "GET" ? `?marca=${encodeURIComponent(slug!)}` : ""}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(j.error || "No se pudo completar la acción.");
  return j as T;
}

export function EnviarCorreoBoton({ slug, month, brand }: { slug: string; month: string; brand: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button onClick={() => setAbierto(true)} aria-label="Enviar el reporte por correo">
        <Mail size={15} />
        Enviar por correo
      </button>
      {abierto && <EnviarCorreoModal slug={slug} month={month} brand={brand} close={() => setAbierto(false)} />}
    </>
  );
}

function EnviarCorreoModal({ slug, month, brand, close }: { slug: string; month: string; brand: string; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [guardandoAuto, setGuardandoAuto] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => {
    let vivo = true;
    api<Info>("GET", undefined, slug)
      .then((d) => { if (vivo) { setInfo(d); setSel(d.correosCliente); } })
      .catch((e) => { if (vivo) setError(e.message); });
    return () => { vivo = false; };
  }, [slug]);

  const todos = info ? [...new Set([...info.correosCliente, ...sel])] : [];
  const agregar = () => {
    const e = extra.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { toast.error("Escribe un correo válido"); return; }
    setSel((s) => [...new Set([...s, e])]);
    setExtra("");
  };
  async function enviar() {
    setEnviando(true);
    try {
      await api("POST", { marca: slug, mes: month, destinatarios: sel });
      toast.success(`Reporte enviado a ${sel.length} correo${sel.length === 1 ? "" : "s"}`);
      setInfo(await api<Info>("GET", undefined, slug));
      setConfirmar(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }
  async function cambiarAuto(auto: boolean) {
    setGuardandoAuto(true);
    try {
      await api("PATCH", { marca: slug, auto, destinatarios: sel });
      setInfo((i) => (i ? { ...i, auto, destinatariosAuto: sel.length ? sel : i.correosCliente } : i));
      toast.success(auto ? "Envío automático activado" : "Envío automático desactivado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardandoAuto(false);
    }
  }

  const chip = (e: string) => {
    const on = sel.includes(e);
    return (
      <button key={e} type="button" onClick={() => setSel((s) => (on ? s.filter((x) => x !== e) : [...s, e]))}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
          border: `1px solid ${on ? "#7c3aed" : "#e5dff0"}`, background: on ? "#f3edff" : "#fff", color: on ? "#5b21b6" : "#6b6580", fontWeight: 600 }}>
        <span style={{ width: 16, height: 16, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: on ? "#7c3aed" : "#fff", border: on ? "none" : "1.5px solid #cfc6e0", color: "#fff" }}>{on && <Check size={11} strokeWidth={3} />}</span>
        {e}
      </button>
    );
  };

  return (
    <dialog ref={ref} onCancel={close} onClick={(e) => { if (e.target === ref.current) close(); }}
      style={{ border: 0, borderRadius: 22, padding: 0, width: "min(620px, 94vw)", maxHeight: "92vh", boxShadow: "0 30px 80px -20px rgba(30,15,60,.45)" }}>
      <div style={{ padding: "22px 26px 24px", color: "#282338", fontSize: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#7170ff,#ba41f7)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Mail size={19} />
          </span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Enviar reporte por correo</h2>
            <p style={{ fontSize: 13, color: "#767084", margin: "3px 0 0" }}>{brand} · {mesLargo(month)} · PDF adjunto</p>
          </div>
          <button onClick={close} aria-label="Cerrar" style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #ece6f5", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {error && <p role="alert" style={{ color: "#b42318", marginTop: 16 }}>{error}</p>}
        {!info && !error && <p role="status" style={{ marginTop: 18, color: "#8a8398" }}>Cargando correos del cliente…</p>}

        {info && (
          <>
            {!info.configurado && (
              <p style={{ marginTop: 16, padding: "10px 12px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: 13 }}>
                El correo de envío aún no está configurado en el servidor.
              </p>
            )}
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6b6580", letterSpacing: ".04em", marginBottom: 8 }}>
                DE <span style={{ fontWeight: 600, color: "#282338", letterSpacing: 0 }}>{info.remitente ?? "team@distintostudio.com"}</span> · PARA
              </div>
              {todos.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{todos.map(chip)}</div>
              ) : (
                <p style={{ fontSize: 13, color: "#8a8398" }}>Esta marca no tiene correos de cliente registrados. Agrega uno abajo.</p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input value={extra} onChange={(e) => setExtra(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }}
                  placeholder="Agregar otro correo" type="email"
                  style={{ flex: 1, height: 38, padding: "0 12px", borderRadius: 10, border: "1px solid #e5dff0", fontSize: 13.5, outline: "none" }} />
                <button type="button" onClick={agregar}
                  style={{ height: 38, padding: "0 12px", borderRadius: 10, border: "1px solid #dfd5f3", background: "#fff", color: "#6d3ace", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                  <Plus size={15} /> Agregar
                </button>
              </div>
            </div>

            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              {!confirmar ? (
                <button type="button" disabled={!sel.length || !info.configurado} onClick={() => setConfirmar(true)}
                  style={{ height: 42, padding: "0 18px", borderRadius: 12, border: 0, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                    background: "linear-gradient(135deg,#7170ff,#ba41f7)", opacity: !sel.length || !info.configurado ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Send size={16} /> Enviar a {sel.length} correo{sel.length === 1 ? "" : "s"}
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 13, color: "#5b5470" }}>¿Enviar el reporte de {mesLargo(month)} al cliente?</span>
                  <button type="button" onClick={() => setConfirmar(false)} disabled={enviando}
                    style={{ height: 40, padding: "0 14px", borderRadius: 11, border: "1px solid #e5dff0", background: "#fff", fontWeight: 600, cursor: "pointer", color: "#5b5470" }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={() => void enviar()} disabled={enviando}
                    style={{ height: 40, padding: "0 16px", borderRadius: 11, border: 0, color: "#fff", fontWeight: 700, cursor: "pointer", background: "#16a34a", display: "inline-flex", alignItems: "center", gap: 7 }}>
                    {enviando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />} {enviando ? "Generando y enviando…" : "Sí, enviar"}
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginTop: 22, padding: "14px 16px", borderRadius: 14, border: "1px solid #ece6f5", background: "#faf8ff", display: "flex", alignItems: "center", gap: 12 }}>
              <CalendarClock size={22} style={{ color: "#7c3aed", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Envío automático mensual</div>
                <div style={{ fontSize: 12.5, color: "#767084" }}>
                  El día 3 de cada mes, a las 9:00 a. m., se envía el reporte del mes anterior a los correos seleccionados arriba.
                  {info.ultimoAuto ? ` Último envío automático: ${mesLargo(info.ultimoAuto)}.` : ""}
                </div>
              </div>
              <button type="button" role="switch" aria-checked={info.auto} disabled={guardandoAuto || !info.configurado} onClick={() => void cambiarAuto(!info.auto)}
                style={{ width: 48, height: 28, borderRadius: 999, border: 0, cursor: "pointer", position: "relative", background: info.auto ? "#7c3aed" : "#d9d3e6", transition: "background .2s", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 3, left: info.auto ? 23 : 3, width: 22, height: 22, borderRadius: 999, background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
              </button>
            </div>

            {info.historial.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b6580", letterSpacing: ".04em", marginBottom: 6 }}>ÚLTIMOS ENVÍOS</div>
                {info.historial.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: i ? "1px solid #f1edf7" : 0, fontSize: 12.5 }}>
                    <span style={{ fontWeight: 700, color: h.status === "sent" ? "#15803d" : "#b42318", width: 70 }}>{h.status === "sent" ? "Enviado" : "Falló"}</span>
                    <span style={{ flex: 1, color: "#5b5470" }}>
                      {mesLargo(h.month)} · {h.mode === "auto" ? "automático" : "manual"} · {h.recipients.join(", ")}
                      {h.error ? <span style={{ display: "block", color: "#b42318" }}>{h.error}</span> : null}
                    </span>
                    <span style={{ color: "#9a93a8", whiteSpace: "nowrap" }}>
                      {new Date(h.created_at).toLocaleString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
