"use client";
/* Reporte 360 Oral Beauty (Pedro 21-oct-2026): gasto de Meta + embudo de
   WhatsApp de la clínica, por anuncio. Solo se actualiza con el botón. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Target } from "lucide-react";
import { combinar, totales, type Fila360 } from "@/lib/oral-beauty/modelo360";
import type { Reporte360 as Datos } from "@/lib/oral-beauty/sync";

const URL_360 = "/api/estrategia/oral-beauty-360";
const sol = (v: number | null) => (v == null ? "—" : new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(v));
const ent = (v: number) => new Intl.NumberFormat("es-PE").format(v);
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

export function Reporte360({ slug, hoy }: { slug: string; hoy: string }) {
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const [sede, setSede] = useState<"TODAS" | "LIMA" | "RIOJA">("TODAS");
  const [datos, setDatos] = useState<Datos | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async (m: string) => {
    setError(null);
    try {
      const r = await fetch(`${URL_360}?${new URLSearchParams({ marca: slug, mes: m })}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo cargar el reporte");
      setDatos(j.reporte);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el reporte"); setDatos(null); }
  }, [slug]);
  useEffect(() => { const t = setTimeout(() => void cargar(mes), 0); return () => clearTimeout(t); }, [cargar, mes]);

  const actualizar = async () => {
    setOcupado(true); setError(null);
    try {
      const r = await fetch(URL_360, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marca: slug, mes }) });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "No se pudo actualizar"); await cargar(mes); return; }
      setDatos(j.reporte);
    } catch { setError("No se pudo actualizar. Revisa tu conexión."); }
    finally { setOcupado(false); }
  };

  const filas = useMemo(() => (datos ? combinar(datos.gasto, datos.embudo) : []), [datos]);
  const vis = sede === "TODAS" ? filas : filas.filter((f) => f.sede === sede);
  const porCampana = useMemo(() => {
    const m = new Map<string, Fila360[]>();
    for (const f of vis) m.set(`${f.sede} · ${f.campana}`, [...(m.get(`${f.sede} · ${f.campana}`) ?? []), f]);
    return [...m.entries()].map(([k, fs]) => ({ k, t: totales(fs) })).sort((a, b) => b.t.gasto_pen - a.t.gasto_pen);
  }, [vis]);

  return (
    <section className="st-card st-r360">
      <div className="st-row st-r360-head">
        <div>
          <h3><Target size={16} /> Reporte 360 · de la pauta al paciente</h3>
          <p className="st-mt-hint">Gasto de Meta (LIMA en USD convertido a soles con el tipo de cambio SUNAT, RIOJA en soles) unido al embudo de WhatsApp de la clínica por el ID de cada anuncio.</p>
          {datos && <small className="st-ads-stamp">Actualizado: {new Date(datos.actualizadoAt).toLocaleString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{datos.actualizadoPor ? ` por ${datos.actualizadoPor.split(" ")[0]}` : ""}{datos.tipoCambio ? ` · TC ${datos.tipoCambio.toFixed(3)}` : ""}{datos.embudoGeneradoAt ? "" : " · embudo de la clínica pendiente"}</small>}
        </div>
        <div className="st-ads-tools">
          <input type="month" value={mes} max={hoy.slice(0, 7)} onChange={(e) => e.target.value && setMes(e.target.value)} aria-label="Mes del reporte" className="st-r360-mes" />
          <button className="st-primary" onClick={actualizar} disabled={ocupado}><RefreshCw size={15} className={ocupado ? "animate-spin" : ""} /> {ocupado ? "Consultando Meta y la clínica…" : "Actualizar"}</button>
        </div>
      </div>

      {error && <p className="st-r360-error" role="alert"><AlertTriangle size={14} /> {error}</p>}
      {datos === undefined ? <p className="st-mt-hint">Cargando…</p> : !datos ? (
        <p className="st-mt-hint">Este mes aún no tiene datos. Pulsa «Actualizar» para traer el gasto de Meta y el embudo de la clínica.</p>
      ) : (
        <>
          <nav className="st-tabs st-r360-sedes" aria-label="Sede">
            {(["TODAS", "LIMA", "RIOJA"] as const).map((s) => <button key={s} className={sede === s ? "st-active" : ""} onClick={() => setSede(s)}>{s === "TODAS" ? "Ambas sedes" : s === "LIMA" ? "Lima" : "Rioja"}</button>)}
          </nav>
          <div className="st-r360-totales">
            {(sede === "TODAS" ? (["LIMA", "RIOJA"] as const) : [sede]).map((s) => {
              const t = totales(filas.filter((f) => f.sede === s));
              return (
                <div key={s} className="st-r360-total">
                  <strong>{s === "LIMA" ? "Lima · Oral Beauty" : "Rioja · Cojal"}</strong>
                  <div className="st-r360-embudo">
                    <span><b>{sol(t.gasto_pen)}</b>gasto</span>
                    <span><b>{ent(t.escribieron)}</b>chats</span>
                    <span><b>{ent(t.cita)}</b>citas <i>{pct(t.cita, t.escribieron)}</i></span>
                    <span><b>{ent(t.asistio)}</b>asistió <i>{pct(t.asistio, t.cita)}</i></span>
                    <span><b>{ent(t.inicio)}</b>inició <i>{pct(t.inicio, t.asistio)}</i></span>
                    <span><b>{ent(t.termino)}</b>terminó</span>
                    <span><b>{sol(t.cobrado_pen)}</b>cobrado</span>
                  </div>
                  <div className="st-r360-costos">
                    <span>Por chat <b>{sol(t.costoChat)}</b></span>
                    <span>Por cita <b>{sol(t.costoCita)}</b></span>
                    <span>Por asistencia <b>{sol(t.costoAsistencia)}</b></span>
                    <span>Por tratamiento iniciado <b>{sol(t.costoInicio)}</b></span>
                    <span>Retorno <b>{t.retorno == null ? "—" : `${t.retorno.toFixed(2)}×`}</b></span>
                  </div>
                </div>
              );
            })}
          </div>

          <h4 className="st-r360-sub">Por campaña</h4>
          <div className="st-bm-table-wrap">
            <table className="st-bm-table st-r360-tabla">
              <thead><tr><th>Campaña</th><th>Gasto</th><th>Chats</th><th>Citas</th><th>Asistió</th><th>Inició</th><th>Cobrado</th><th>Por cita</th><th>Por iniciado</th><th>Retorno</th></tr></thead>
              <tbody>{porCampana.map(({ k, t }) => (
                <tr key={k}><th scope="row">{k}</th><td>{sol(t.gasto_pen)}</td><td>{ent(t.escribieron)}</td><td>{ent(t.cita)}</td><td>{ent(t.asistio)}</td><td>{ent(t.inicio)}</td><td>{sol(t.cobrado_pen)}</td><td>{sol(t.costoCita)}</td><td>{sol(t.costoInicio)}</td><td>{t.retorno == null ? "—" : `${t.retorno.toFixed(2)}×`}</td></tr>
              ))}</tbody>
            </table>
          </div>

          <h4 className="st-r360-sub">Por anuncio</h4>
          <div className="st-bm-table-wrap">
            <table className="st-bm-table st-r360-tabla">
              <thead><tr><th>Anuncio</th><th>Sede</th><th>Gasto</th><th>Chats</th><th>Citas</th><th>Asistió</th><th>Inició</th><th>Terminó</th><th>Cobrado</th><th>Por chat</th><th>Por cita</th><th>Por asistencia</th><th>Por iniciado</th><th>Retorno</th></tr></thead>
              <tbody>{vis.map((f) => (
                <tr key={f.ad_id} className={f.alerta ? "st-r360-alerta" : ""}>
                  <th scope="row">{f.nombre}<small>{f.campana}</small>{f.alerta && <em>{f.alerta === "gasto-sin-chats" ? "Gasto sin chats" : "Chats sin gasto (cuenta anterior)"}</em>}</th>
                  <td>{f.sede === "LIMA" ? "Lima" : "Rioja"}</td><td>{sol(f.gasto_pen)}</td><td>{ent(f.escribieron)}</td><td>{ent(f.cita)}</td><td>{ent(f.asistio)}</td><td>{ent(f.inicio)}</td><td>{ent(f.termino)}</td><td>{sol(f.cobrado_pen)}</td>
                  <td>{sol(f.costoChat)}</td><td>{sol(f.costoCita)}</td><td>{sol(f.costoAsistencia)}</td><td>{sol(f.costoInicio)}</td><td>{f.retorno == null ? "—" : `${f.retorno.toFixed(2)}×`}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
