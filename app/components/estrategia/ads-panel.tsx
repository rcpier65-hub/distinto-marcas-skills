"use client";
/* Publicidad (Pedro 21-oct-2026): panel de pauta para todas las marcas.
   Anuncios que corren, resultados del mes vs el anterior, ritmo del
   presupuesto, alertas, plan de campaña y bitácora de optimizaciones.
   Los datos de Meta se consultan solo con «Actualizar» y quedan guardados. */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ExternalLink, Eye, FileText, History, ImageOff, Megaphone, RefreshCw, Settings2, Target, Trash2 } from "lucide-react";
import { Modal, PrettyDate } from "./common";
import { MetaLogo } from "./social-icons";
import { RESULTADOS, type ConfigPauta, type Metricas, type Resultado, type Anuncio, type Alerta } from "@/lib/pauta/model";

type Datos = {
  cuenta: { id: string; nombre: string; moneda: string; estado: number | null };
  periodo: { mes: string; desde: string; hasta: string; anteriorDesde: string; anteriorHasta: string; parcial: boolean };
  actual: Metricas; anterior: Metricas;
  ritmo: { gastado: number; presupuesto: number; usado: number; esperado: number; proyeccion: number; desvio: number; diasRestantes: number } | null;
  anuncios: Anuncio[]; alertas: Alerta[]; consultado: string;
};
type Nota = { id: string; fecha: string; texto: string; autor_nombre: string | null; propia: boolean };
type Estado = { config: ConfigPauta; datos: Datos | null; datosAt: string | null; datosPor: string | null; bitacora: Nota[]; puedeEditar: boolean; aviso?: string | null };
type Plan = { id: string; title: string };

const URL_PAUTA = "/api/estrategia/pauta";
const ESTADO_ANUNCIO: Record<string, { texto: string; clase: string }> = {
  ACTIVE: { texto: "Activo", clase: "st-ad-ok" },
  PENDING_REVIEW: { texto: "En revisión", clase: "st-ad-wait" },
  IN_PROCESS: { texto: "Procesando", clase: "st-ad-wait" },
  DISAPPROVED: { texto: "Rechazado", clase: "st-ad-bad" },
  WITH_ISSUES: { texto: "Con problemas", clase: "st-ad-bad" },
};

export function AdsPanel({ slug, brandName, planes }: { slug: string; brandName: string; planes: Plan[] }) {
  const [e, setE] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [config, setConfig] = useState(false);
  const [nota, setNota] = useState("");
  const [viendo, setViendo] = useState<Anuncio | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${URL_PAUTA}?marca=${encodeURIComponent(slug)}`, { cache: "no-store" });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error || "No se pudo cargar");
      setE(out); setError(null);
    } catch (x) { setError(x instanceof Error ? x.message : "No se pudo cargar"); }
  }, [slug]);
  useEffect(() => { const t = setTimeout(() => void cargar(), 0); return () => clearTimeout(t); }, [cargar]);

  const enviar = async (clave: string, input: Record<string, unknown>) => {
    setOcupado(clave);
    try {
      const r = await fetch(URL_PAUTA, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marca: slug, ...input }) });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error || "No se pudo completar");
      setE(out);
      if (out.aviso) toast.warning(out.aviso);
      return true;
    } catch (x) { toast.error(x instanceof Error ? x.message : "No se pudo completar"); return false; }
    finally { setOcupado(null); }
  };

  if (error) return <section className="st-card st-bm-empty"><p>{error}</p><button onClick={() => void cargar()}>Reintentar</button></section>;
  if (!e) return <section className="st-card st-bm-empty"><p>Cargando publicidad…</p></section>;

  const d = e.datos;
  const res = RESULTADOS[e.config.resultado as Resultado];
  const din = (v: number | null, dec = 2) => v === null || !d ? "—" : new Intl.NumberFormat("es-PE", { style: "currency", currency: d.cuenta.moneda || "USD", maximumFractionDigits: dec }).format(v);
  const ent = (v: number | null) => v === null ? "—" : new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(v);
  const pct = (v: number | null) => v === null ? "—" : `${v.toFixed(2)}%`;
  /* Solo se listan los anuncios activos; rechazados y con problemas quedan en las alertas. */
  const activos = d?.anuncios.filter((a) => a.estado === "ACTIVE") ?? [];
  const fechaCorta = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("es-PE", { day: "numeric", month: "short" });

  return (
    <section className="st-ads">
      <div className="st-section-title st-ads-head">
        <div>
          <h2><Megaphone size={19} /> Publicidad</h2>
          <p>
            {d ? <>Cuenta <b>{d.cuenta.nombre}</b> · del {fechaCorta(d.periodo.desde)} al {fechaCorta(d.periodo.hasta)}, comparado con los mismos días del mes anterior.</> : `Pauta digital de ${brandName}: anuncios, resultados, presupuesto y optimizaciones.`}
          </p>
          {e.datosAt && <small className="st-ads-stamp">Datos actualizados <PrettyDate value={e.datosAt} /> {new Date(e.datosAt).toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "numeric", minute: "2-digit" })}{e.datosPor ? ` por ${e.datosPor.split(" ")[0]}` : ""}</small>}
        </div>
        <div className="st-ads-tools">
          {e.puedeEditar && <button onClick={() => setConfig(true)}><Settings2 size={15} /> Presupuesto y metas</button>}
          <button className="st-primary" disabled={!!ocupado} onClick={() => void enviar("actualizar", { accion: "actualizar" })}>
            <RefreshCw size={15} className={ocupado === "actualizar" ? "animate-spin" : ""} /> {ocupado === "actualizar" ? "Consultando Meta…" : "Actualizar datos"}
          </button>
        </div>
      </div>

      {!d ? (
        <section className="st-card st-ads-empty">
          <MetaLogo size={28} />
          <div><strong>Aún no hay datos de pauta guardados</strong><p>Toca «Actualizar datos» para traer los anuncios y resultados de Meta. Si la marca no tiene cuenta publicitaria asignada, elígela en Métricas → Elegir cuentas.</p></div>
        </section>
      ) : (
        <>
          {d.alertas.length > 0 && (
            <div className="st-ads-alerts" role="status">
              {d.alertas.map((a, i) => <p key={i} className={a.nivel === "alta" ? "st-ads-alta" : ""}><AlertTriangle size={14} /> {a.texto}</p>)}
            </div>
          )}

          <div className="st-ads-kpis">
            <Kpi titulo="Inversión del mes" valor={din(d.actual.gasto)} antes={d.anterior.gasto} ahora={d.actual.gasto} neutro />
            <Kpi titulo={res.etiqueta} valor={ent(d.actual.resultados)} antes={d.anterior.resultados} ahora={d.actual.resultados} />
            <Kpi titulo={`Costo por ${res.singular}`} valor={din(d.actual.costoResultado)} antes={d.anterior.costoResultado} ahora={d.actual.costoResultado} inverso
              extra={e.config.metaCosto ? `Meta: ${din(e.config.metaCosto)}` : undefined} />
            <Kpi titulo="CTR (clic al enlace)" valor={pct(d.actual.ctr)} antes={d.anterior.ctr} ahora={d.actual.ctr} />
            <Kpi titulo="CPM" valor={din(d.actual.cpm)} antes={d.anterior.cpm} ahora={d.actual.cpm} inverso />
            <Kpi titulo="Frecuencia" valor={d.actual.frecuencia?.toFixed(2) ?? "—"} extra={`Alcance ${ent(d.actual.alcance)}`} />
          </div>

          <section className="st-card st-ads-budget">
            <div className="st-row"><h3><Target size={16} /> Ritmo del presupuesto</h3>{d.ritmo && <span>{d.ritmo.diasRestantes} días restantes</span>}</div>
            {d.ritmo ? (
              <>
                <div className="st-ads-bar" aria-label={`Usado ${Math.round(d.ritmo.usado * 100)}% del presupuesto`}>
                  <span className={d.ritmo.usado > 1 ? "st-ads-bar-over" : ""} style={{ width: `${Math.min(100, d.ritmo.usado * 100)}%` }} />
                  <i style={{ left: `${Math.min(100, d.ritmo.esperado * 100)}%` }} title="Lo esperado a la fecha" />
                </div>
                <p className="st-ads-budget-copy">
                  <b>{din(d.ritmo.gastado)}</b> de {din(d.ritmo.presupuesto, 0)} ({Math.round(d.ritmo.usado * 100)}%) · a la fecha se esperaba {Math.round(d.ritmo.esperado * 100)}% · proyección al cierre <b className={Math.abs(d.ritmo.desvio) > 0.1 ? "st-ads-warn" : ""}>{din(d.ritmo.proyeccion, 0)}</b>
                </p>
              </>
            ) : (
              <p className="st-mt-hint">{e.puedeEditar ? "Define el presupuesto mensual en «Presupuesto y metas» para ver si vamos al ritmo correcto." : "Dirección aún no definió el presupuesto mensual de esta marca."}</p>
            )}
          </section>

          <section className="st-card">
            <div className="st-row"><h3><MetaLogo size={16} /> Anuncios en Meta</h3><span className="st-ads-count">{activos.length} activo{activos.length === 1 ? "" : "s"}</span></div>
            {activos.length ? (
              <div className="st-ads-grid">
                {activos.map((a) => {
                  const est = ESTADO_ANUNCIO[a.estado] ?? { texto: a.estado, clase: "" };
                  return (
                    <article key={a.id} className="st-ad">
                      <div className="st-ad-thumb">
                        {a.miniatura ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.miniatura} alt="" loading="lazy" referrerPolicy="no-referrer" />
                        ) : <ImageOff size={20} />}
                        <span className={`st-ad-state ${est.clase}`}>{est.texto}</span>
                        <button type="button" className="st-ad-eye" onClick={() => setViendo(a)} aria-label={`Ver anuncio ${a.nombre}`} title="Ver anuncio"><Eye size={16} /></button>
                      </div>
                      <div className="st-ad-body">
                        <strong title={a.nombre}>{a.nombre}</strong>
                        <small title={`${a.campana} › ${a.conjunto}`}>{a.campana} › {a.conjunto}</small>
                        {a.texto && <p className="st-ad-copy">{a.texto}</p>}
                        {a.motivoRechazo && <p className="st-ad-reject">{a.motivoRechazo}</p>}
                        {a.mes.gasto === null ? <p className="st-ad-nospend">Sin gasto este mes todavía.</p> : <dl>
                          <div><dt>Gasto mes</dt><dd>{din(a.mes.gasto)}</dd></div>
                          <div><dt>{res.etiqueta}</dt><dd>{ent(a.mes.resultados)}</dd></div>
                          <div><dt>Costo</dt><dd>{din(a.mes.costoResultado)}</dd></div>
                          <div><dt>Frec.</dt><dd className={(a.mes.frecuencia ?? 0) >= 3.5 ? "st-ads-warn" : ""}>{a.mes.frecuencia?.toFixed(1) ?? "—"}</dd></div>
                        </dl>}
                        {a.presupuestoDiario !== null && <small>Presupuesto diario {din(a.presupuestoDiario)}</small>}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : <p className="st-mt-hint">No hay anuncios activos en esta cuenta en este momento.</p>}
          </section>
        </>
      )}

      <div className="st-ads-bottom">
        <section className="st-card">
          <div className="st-row"><h3><FileText size={16} /> Plan de campaña</h3>
            <button className="st-text-button" onClick={() => window.dispatchEvent(new CustomEvent("st:abrir-pestana", { detail: "Planificación" }))}>Ir a Planificación</button>
          </div>
          {planes.length ? (
            <ul className="st-ads-plans">{planes.slice(0, 5).map((p) => <li key={p.id}><Link href={`/marca/${slug}/estrategia/hoja/${p.id}`}>{p.title || "Hoja sin título"}</Link></li>)}</ul>
          ) : <p className="st-mt-hint">Crea en Planificación la hoja con el plan de campaña para mostrársela al cliente: objetivo, presupuesto, públicos, estructura, creativos, calendario y metas.</p>}
        </section>

        <section className="st-card">
          <div className="st-row"><h3><History size={16} /> Bitácora de optimizaciones</h3></div>
          <form className="st-mt-add" onSubmit={async (ev) => { ev.preventDefault(); if (nota.trim() && await enviar("nota", { accion: "nota", texto: nota.trim() })) setNota(""); }}>
            <input value={nota} onChange={(ev) => setNota(ev.target.value)} maxLength={1000} placeholder="Qué cambiaste y por qué (ej. pausé el anuncio B por CPR alto)" aria-label="Nueva nota de optimización" />
            <button type="submit" disabled={!nota.trim() || !!ocupado}>Agregar</button>
          </form>
          {e.bitacora.length ? (
            <ul className="st-ads-log">
              {e.bitacora.map((n) => (
                <li key={n.id}>
                  <span className="st-ads-log-date">{fechaCorta(n.fecha)}</span>
                  <span className="st-ads-log-text">{n.texto}{n.autor_nombre && <small> · {n.autor_nombre.split(" ")[0]}</small>}</span>
                  {(n.propia || e.puedeEditar) && <button className="st-icon" aria-label="Borrar nota" title="Borrar nota" disabled={!!ocupado} onClick={() => { if (confirm("¿Borrar esta nota de la bitácora?")) void enviar(`borrar:${n.id}`, { accion: "borrar", id: n.id }); }}><Trash2 size={13} /></button>}
                </li>
              ))}
            </ul>
          ) : <p className="st-mt-hint">Aún no hay cambios registrados. Anotar cada optimización ayuda a explicarle al cliente qué se hizo con su inversión.</p>}
        </section>
      </div>

      {viendo && <VistaAnuncio anuncio={viendo} slug={slug} dinero={din} cerrar={() => setViendo(null)} />}
      {config && <ConfigModal inicial={e.config} moneda={d?.cuenta.moneda ?? ""} cerrar={() => setConfig(false)} guardar={async (c) => { if (await enviar("config", { accion: "config", config: c })) setConfig(false); }} ocupado={ocupado === "config"} />}
    </section>
  );
}

function Kpi({ titulo, valor, antes, ahora, inverso, neutro, extra }: { titulo: string; valor: string; antes?: number | null; ahora?: number | null; inverso?: boolean; neutro?: boolean; extra?: string }) {
  const cambio = antes != null && ahora != null && antes > 0 ? ahora / antes - 1 : null;
  const bueno = cambio === null ? null : inverso ? cambio < 0 : cambio > 0;
  return (
    <div className="st-card st-ads-kpi">
      <small>{titulo}</small>
      <strong>{valor}</strong>
      {cambio !== null && Math.abs(cambio) >= 0.005 && (
        <span className={neutro ? "" : bueno ? "st-ads-up" : "st-ads-down"}>
          {cambio > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(Math.round(cambio * 100))}% vs mes anterior
        </span>
      )}
      {extra && <em>{extra}</em>}
    </div>
  );
}

function ConfigModal({ inicial, moneda, cerrar, guardar, ocupado }: { inicial: ConfigPauta; moneda: string; cerrar: () => void; guardar: (c: ConfigPauta) => void; ocupado: boolean }) {
  const [presupuesto, setPresupuesto] = useState(inicial.presupuestoMensual?.toString() ?? "");
  const [resultado, setResultado] = useState<Resultado>(inicial.resultado as Resultado);
  const [meta, setMeta] = useState(inicial.metaCosto?.toString() ?? "");
  const valor = (s: string) => (s.trim() === "" ? null : Math.max(0, Number(s.replace(",", "."))));
  return (
    <Modal title="Presupuesto y metas de pauta" close={cerrar}>
      <form className="st-bm-form st-bm-detail" onSubmit={(ev) => { ev.preventDefault(); guardar({ presupuestoMensual: valor(presupuesto), resultado, metaCosto: valor(meta) }); }}>
        <label>Presupuesto mensual en Meta {moneda && `(${moneda})`}<input type="number" min="0" step="0.01" inputMode="decimal" value={presupuesto} onChange={(ev) => setPresupuesto(ev.target.value)} placeholder="Ej. 1500" /></label>
        <label>Resultado principal que buscamos
          <select value={resultado} onChange={(ev) => setResultado(ev.target.value as Resultado)}>
            {Object.entries(RESULTADOS).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
          </select>
        </label>
        <label>Meta de costo por {RESULTADOS[resultado].singular} {moneda && `(${moneda})`}<input type="number" min="0" step="0.01" inputMode="decimal" value={meta} onChange={(ev) => setMeta(ev.target.value)} placeholder="Opcional" /></label>
        <p className="st-mt-hint">Al guardar se vuelven a consultar los datos de Meta con esta configuración.</p>
        <div className="st-bm-actions"><button type="button" onClick={cerrar}>Cancelar</button><button type="submit" className="st-primary" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar"}</button></div>
      </form>
    </Modal>
  );
}

/* «Ojito»: vista previa oficial de Meta (iframe) en el formato elegido, con el
   texto completo y el enlace a la publicación. */
const FORMATOS = [
  { id: "INSTAGRAM_STANDARD", etiqueta: "Instagram feed" },
  { id: "INSTAGRAM_STORY", etiqueta: "Historia" },
  { id: "INSTAGRAM_REELS", etiqueta: "Reels" },
  { id: "MOBILE_FEED_STANDARD", etiqueta: "Facebook" },
] as const;
function VistaAnuncio({ anuncio, slug, dinero, cerrar }: { anuncio: Anuncio; slug: string; dinero: (v: number | null) => string; cerrar: () => void }) {
  const [formato, setFormato] = useState<string>(FORMATOS[0].id);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(async () => {
      setSrc(null); setError(null);
      try {
        const r = await fetch(`/api/estrategia/pauta/vista?marca=${encodeURIComponent(slug)}&anuncio=${anuncio.id}&formato=${formato}`, { cache: "no-store" });
        const out = await r.json();
        if (!vivo) return;
        if (!r.ok) setError(out.error || "Sin vista previa"); else setSrc(out.src);
      } catch { if (vivo) setError("No se pudo cargar la vista previa"); }
    }, 0);
    return () => { vivo = false; clearTimeout(t); };
  }, [anuncio.id, formato, slug]);
  return (
    <Modal title={anuncio.nombre} close={cerrar}>
      <div className="st-ad-view">
        <nav className="st-tabs st-ad-formats">
          {FORMATOS.map((f) => <button key={f.id} type="button" className={formato === f.id ? "st-active" : ""} onClick={() => setFormato(f.id)}>{f.etiqueta}</button>)}
        </nav>
        <div className="st-ad-view-grid">
          <div className="st-ad-frame">
            {src ? <iframe src={src} title={`Vista previa de ${anuncio.nombre}`} sandbox="allow-scripts allow-same-origin allow-popups" />
              : error ? (anuncio.miniatura
                // eslint-disable-next-line @next/next/no-img-element
                ? <><img src={anuncio.miniatura} alt="" referrerPolicy="no-referrer" /><small>{error}</small></>
                : <small>{error}</small>)
              : <small>Cargando vista previa de Meta…</small>}
          </div>
          <div className="st-ad-view-info">
            <small>{anuncio.campana} › {anuncio.conjunto}</small>
            {anuncio.titulo && <strong>{anuncio.titulo}</strong>}
            {anuncio.texto && <p>{anuncio.texto}</p>}
            <dl>
              <div><dt>Gasto del mes</dt><dd>{dinero(anuncio.mes.gasto)}</dd></div>
              <div><dt>Costo por resultado</dt><dd>{dinero(anuncio.mes.costoResultado)}</dd></div>
              <div><dt>Presupuesto diario</dt><dd>{dinero(anuncio.presupuestoDiario)}</dd></div>
              <div><dt>Frecuencia</dt><dd>{anuncio.mes.frecuencia?.toFixed(2) ?? "—"}</dd></div>
            </dl>
            {anuncio.enlace && <a className="st-text-button" href={anuncio.enlace} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Ver la publicación</a>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
