"use client";
/* Piezas de la presentación multiservicio (Pedro 21-oct-2026): preguntas,
   proceso con reuniones, caso real y elección de plan para Social Media y
   Publicidad digital. */
import { useEffect, useState } from "react";
import { PLANES_SOCIAL, incluyePauta, planSugerido, type Fase, type PreguntaServicio, type Reunion } from "@/lib/presentacion/servicios";
import { excessAdFee } from "@/lib/propuestas/model";
import type { Sesion } from "@/lib/presentacion/web";

const ent = (v: number | null | undefined) => (v == null ? "—" : new Intl.NumberFormat("es-PE").format(Math.round(v)));
const pct = (a: number | null | undefined, b: number | null | undefined) => (a == null || !b ? null : Math.round(((a - b) / b) * 100));

/* ---------- Preguntas ---------- */
export function PreguntasServicio({ titulo, preguntas, valores, cambiar }: { titulo: string; preguntas: PreguntaServicio[]; valores: Record<string, unknown>; cambiar: (id: string, v: unknown) => void }) {
  return (
    <fieldset className="pr-grupo">
      <legend>{titulo}</legend>
      {preguntas.map((q) => {
        const v = valores[q.id];
        return (
          <div key={q.id} className="pr-pregunta">
            <label htmlFor={`qs-${titulo}-${q.id}`}>{q.texto}{q.ayuda && <small className="pr-ayuda">{q.ayuda}</small>}</label>
            {q.tipo === "monto" ? (
              <div className="pr-monto"><span>S/</span><input id={`qs-${titulo}-${q.id}`} type="number" min={0} step={100} inputMode="decimal" value={typeof v === "number" ? v : ""} placeholder="1500" onChange={(e) => cambiar(q.id, e.target.value === "" ? null : Math.max(0, Number(e.target.value)))} /><span>al mes</span></div>
            ) : (
              <div className="pr-chips" role={q.tipo === "multi" ? "group" : "radiogroup"} aria-label={q.texto}>
                {(q.tipo === "sino" ? [{ id: "si", etiqueta: "Sí" }, { id: "no", etiqueta: "No" }] : q.opciones!).map((o) => {
                  const activo = q.tipo === "multi" ? Array.isArray(v) && v.includes(o.id) : q.tipo === "sino" ? v === (o.id === "si") : v === o.id;
                  const nuevo = () => {
                    if (q.tipo === "multi") { const a = Array.isArray(v) ? (v as string[]) : []; return a.includes(o.id) ? a.filter((x) => x !== o.id) : [...a, o.id]; }
                    if (q.tipo === "sino") return activo ? undefined : o.id === "si";
                    return activo ? undefined : o.id;
                  };
                  return <button key={o.id} type="button" role={q.tipo === "multi" ? undefined : "radio"} aria-pressed={q.tipo === "multi" ? activo : undefined} aria-checked={q.tipo === "multi" ? undefined : activo}
                    className={activo ? "pr-chip pr-chip-on" : "pr-chip"} onClick={() => cambiar(q.id, nuevo())}>{o.etiqueta}</button>;
                })}
              </div>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}

/* ---------- Proceso, reuniones y caso real ---------- */
export function ProcesoServicio({ titulo, fases, reuniones, servicio }: { titulo: string; fases: Fase[]; reuniones: Reunion[]; servicio: "social" | "ads" }) {
  const [vista, setVista] = useState<"proceso" | "reuniones" | "caso">("proceso");
  const [fi, setFi] = useState(0);
  const f = fases[fi];
  const total = fases.reduce((a, x) => a + x.pasos.length, 0);
  return (
    <div className="pr-proceso pr-sv">
      <div className="pr-proc-top">
        <h2>{titulo}</h2>
        <div className="pr-proyectos" role="tablist" aria-label="Vista">
          {([["proceso", `El proceso · ${total} pasos`], ["reuniones", `Las reuniones · ${reuniones.length}`], ["caso", "Caso real"]] as const).map(([id, t]) => (
            <button key={id} type="button" role="tab" aria-selected={vista === id} className={vista === id ? "pr-proy pr-proy-on" : "pr-proy"} onClick={() => setVista(id)}>{t}</button>
          ))}
        </div>
      </div>
      {vista === "proceso" && (
        <div className="pr-sv-proceso">
          <ol className="pr-sv-fases">
            {fases.map((x, j) => (
              <li key={x.id}><button type="button" className={j === fi ? "pr-sv-fase-on" : ""} aria-current={j === fi ? "step" : undefined} onClick={() => setFi(j)}>
                <span>{j + 1}</span><b>{x.titulo}</b><small>{x.semana} · {x.pasos.length} {x.pasos.length === 1 ? "paso" : "pasos"}</small>
              </button></li>
            ))}
          </ol>
          <div className="pr-sv-pasos">
            {f.pasos.map((p, k) => (
              <article key={p.titulo}>
                <header><span>{fases.slice(0, fi).reduce((a, x) => a + x.pasos.length, 0) + k + 1}</span><h3>{p.titulo}</h3></header>
                <p>{p.que}</p>
                <dl>
                  {p.cliente && <div><dt>Tú nos das</dt><dd>{p.cliente}</dd></div>}
                  <div><dt>Entregable</dt><dd>{p.entregable}</dd></div>
                  {p.sistema && <div className="pr-sv-sistema"><dt>En nuestro sistema</dt><dd>{p.sistema}</dd></div>}
                </dl>
              </article>
            ))}
          </div>
        </div>
      )}
      {vista === "reuniones" && (
        <div className="pr-sv-reuniones">
          {reuniones.map((r, k) => (
            <article key={r.nombre}>
              <header><span>{k + 1}</span><div><h3>{r.nombre}</h3><small>{r.cuando} · {r.dura}</small></div></header>
              <p className="pr-sv-quienes">{r.quienes}</p>
              <ul>{r.agenda.map((a) => <li key={a}>{a}</li>)}</ul>
              <p className="pr-sv-sale"><b>Sale:</b> {r.sale}</p>
            </article>
          ))}
        </div>
      )}
      {vista === "caso" && <CasoReal servicio={servicio} />}
    </div>
  );
}

type Caso = {
  marca: { nombre: string };
  periodo: { mes: string; dias: number | null; parcial: boolean; inicio: string | null; fin: string | null };
  actualizado: string | null;
  canales: { red: string; seguidores: number | null; alcance: number | null; alcanceAntes: number | null; interacciones: number | null; interaccionesAntes: number | null; seguidoresNuevos: number | null; guardados: number | null; compartidos: number | null }[];
  ads: { moneda: string; gasto: number | null; conversaciones: number | null; costo: number | null; costoAntes: number | null } | null;
  top: { texto: string; vistas: number | null; red: string | null }[];
  mapa: { frase: string; idea: string; posicionamiento: string; puntos: string[] } | null;
};

/* Datos reales de una marca de la cartera, desde la última versión guardada
   del reporte. El nombre va oculto por defecto: se muestra solo si Pedro lo activa. */
function CasoReal({ servicio }: { servicio: "social" | "ads" }) {
  const [marcas, setMarcas] = useState<{ slug: string; nombre: string }[] | null>(null);
  const [slug, setSlug] = useState<string>("");
  const [caso, setCaso] = useState<Caso | null>(null);
  const [error, setError] = useState("");
  const [nombre, setNombre] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch("/api/presentaciones/caso", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      if (!vivo) return;
      const l = j.marcas ?? [];
      setMarcas(l);
      setSlug((x) => x || (l.find((m: { slug: string }) => m.slug === "little-joe")?.slug ?? l[0]?.slug ?? ""));
    }).catch(() => vivo && setMarcas([]));
    return () => { vivo = false; };
  }, []);
  useEffect(() => {
    if (!slug) return;
    let vivo = true;
    fetch(`/api/presentaciones/caso?marca=${encodeURIComponent(slug)}`, { cache: "no-store" }).then(async (r) => {
      const j = await r.json();
      if (!vivo) return;
      if (!r.ok) { setError(j.error || "No se pudo cargar el caso"); setCaso(null); return; }
      setError(""); setCaso(j);
    }).catch(() => vivo && setError("No se pudo cargar el caso"));
    return () => { vivo = false; };
  }, [slug]);
  if (marcas === null) return <p className="pr-quiet">Cargando casos…</p>;
  if (!marcas.length) return <p className="pr-quiet">Todavía no hay reportes guardados de las marcas.</p>;
  /* Sin nombre: «Cliente A, B…» según el orden de la lista. */
  const etiqueta = (m: { nombre: string }) => (nombre ? m.nombre : `Cliente ${String.fromCharCode(65 + Math.max(0, marcas.findIndex((x) => x.nombre === m.nombre)))} de nuestra cartera`);
  return (
    <div className="pr-caso">
      <div className="pr-caso-barra">
        <label>Marca <select value={slug} onChange={(e) => setSlug(e.target.value)}>{marcas.map((m) => <option key={m.slug} value={m.slug}>{etiqueta(m)}</option>)}</select></label>
        <label className="pr-x-check"><input type="checkbox" checked={nombre} onChange={(e) => setNombre(e.target.checked)} /> Mostrar el nombre de la marca</label>
        {caso?.actualizado && <small>Datos reales guardados el {new Date(caso.actualizado).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}{caso.periodo.dias ? ` · ${caso.periodo.dias} días de ${caso.periodo.mes}${caso.periodo.parcial ? " (mes en curso)" : ""}` : ""}, comparados con los mismos días del mes anterior.</small>}
      </div>
      {error && <p className="pr-aviso">{error}</p>}
      {caso && (
        <>
          <h3 className="pr-caso-titulo">{etiqueta(caso.marca)}</h3>
          {servicio === "social" ? (
            <div className="pr-caso-kpis">
              {caso.canales.map((c) => {
                const ga = pct(c.alcance, c.alcanceAntes); const gi = pct(c.interacciones, c.interaccionesAntes);
                return (
                  <div key={c.red} className="pr-caso-red">
                    <b>{c.red === "instagram" ? "Instagram" : c.red === "facebook" ? "Facebook" : c.red}</b>
                    <dl>
                      <div><dt>Seguidores</dt><dd>{ent(c.seguidores)}</dd></div>
                      <div><dt>Alcance</dt><dd>{ent(c.alcance)}{ga != null && <em className={ga >= 0 ? "pr-sube" : "pr-baja"}>{ga >= 0 ? "+" : ""}{ga}%</em>}</dd></div>
                      <div><dt>Interacciones</dt><dd>{ent(c.interacciones)}{gi != null && <em className={gi >= 0 ? "pr-sube" : "pr-baja"}>{gi >= 0 ? "+" : ""}{gi}%</em>}</dd></div>
                      <div><dt>Seguidores nuevos</dt><dd>{ent(c.seguidoresNuevos)}</dd></div>
                      {c.guardados != null && <div><dt>Guardados · compartidos</dt><dd>{ent(c.guardados)} · {ent(c.compartidos)}</dd></div>}
                    </dl>
                  </div>
                );
              })}
              {caso.top.length > 0 && (
                <div className="pr-caso-top"><b>Lo más visto del mes</b><ol>{caso.top.map((t) => <li key={t.texto}><span>{t.texto}</span><em>{ent(t.vistas)} vistas</em></li>)}</ol></div>
              )}
              {caso.mapa && (caso.mapa.frase || caso.mapa.posicionamiento) && (
                <div className="pr-caso-mapa"><b>Su posicionamiento</b>{caso.mapa.frase && <p className="pr-caso-frase">«{caso.mapa.frase}»</p>}<ul>{caso.mapa.puntos.map((x) => <li key={x}>{x}</li>)}</ul></div>
              )}
            </div>
          ) : caso.ads && caso.ads.gasto != null ? (
            <div className="pr-caso-kpis">
              <div className="pr-caso-red pr-caso-ads">
                <b>Publicidad del mes</b>
                <dl>
                  <div><dt>Inversión</dt><dd>{caso.ads.moneda} {ent(caso.ads.gasto)}</dd></div>
                  <div><dt>Conversaciones iniciadas</dt><dd>{ent(caso.ads.conversaciones)}</dd></div>
                  <div><dt>Costo por conversación</dt><dd>{caso.ads.moneda} {caso.ads.costo?.toFixed(2) ?? "—"}{caso.ads.costo && caso.ads.costoAntes ? <em className={caso.ads.costo <= caso.ads.costoAntes ? "pr-sube" : "pr-baja"}>antes {caso.ads.costoAntes.toFixed(2)}</em> : null}</dd></div>
                </dl>
              </div>
              <p className="pr-x-nota">Así medimos la publicidad: cuánto se invirtió, cuántas personas escribieron y cuánto costó cada conversación, contra el mismo periodo del mes anterior.</p>
            </div>
          ) : <p className="pr-quiet">Esta marca no tiene publicidad registrada en el reporte. Elige otra.</p>}
        </>
      )}
    </div>
  );
}

/* ---------- Tu plan: Social Media y Publicidad ---------- */
export function PlanSocialAds({ s, cambiar }: { s: Sesion; cambiar: (f: (x: Sesion) => Sesion) => void }) {
  const conSocial = s.servicios.includes("social");
  const conAds = s.servicios.includes("ads");
  const sugerido = planSugerido(s.social, conAds, s.servicios.includes("web"));
  const elegido = s.social.plan ?? sugerido;
  const inv = s.ads.inversion ?? null;
  const fee = inv ? excessAdFee(inv) : 0;
  return (
    <>
      {conSocial && (
        <section className="pr-plan-sec">
          <h3>Social Media</h3>
          <div className="pr-planes">
            {PLANES_SOCIAL.map((p) => {
              const on = p.id === elegido;
              return (
                <button key={p.id} type="button" aria-pressed={on} className={on ? "pr-plan pr-plan-on" : "pr-plan"} onClick={() => cambiar((x) => ({ ...x, social: { ...x.social, plan: p.id } }))}>
                  <div className="pr-plan-cab"><b>{p.nombre}</b>{p.id === sugerido && <span>Sugerido</span>}</div>
                  <strong>{p.precioLabel}<small> / mes</small></strong>
                  <p>{p.aplica}</p>
                  <ul>{p.incluye.slice(0, 5).map((x) => <li key={x}>{x}</li>)}</ul>
                  {p.minimo && <small className="pr-plan-min">{p.minimo}</small>}
                  {incluyePauta(p.id) && <em className="pr-plan-pauta">Incluye gestión de publicidad</em>}
                </button>
              );
            })}
          </div>
        </section>
      )}
      {conAds && (
        <section className="pr-plan-sec">
          <h3>Publicidad digital</h3>
          <div className="pr-ads-resumen">
            <div>
              <label className="pr-x-label" htmlFor="pr-inv">Inversión mensual en anuncios (la pagas tú a la plataforma)</label>
              <div className="pr-monto"><span>S/</span><input id="pr-inv" type="number" min={0} step={100} value={inv ?? ""} placeholder="1500" onChange={(e) => { const v = e.target.value; cambiar((x) => ({ ...x, ads: { ...x.ads, inversion: v === "" ? null : Math.max(0, Number(v)) } })); }} /><span>al mes</span></div>
            </div>
            <p className="pr-x-texto">{conSocial && incluyePauta(elegido) ? "Tu plan de Social Media ya incluye la gestión de campañas: no se cobra aparte." : "La gestión de campañas va como servicio mensual: configuración, públicos, seguimiento de conversiones, optimización semanal y reporte."}</p>
            {fee > 0 && <p className="pr-aviso">Como la inversión supera S/ 3,000, se suma un fee de 10% sobre el excedente: S/ {new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2 }).format(fee)} al mes.</p>}
          </div>
        </section>
      )}
    </>
  );
}
