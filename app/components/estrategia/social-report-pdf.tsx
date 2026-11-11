"use client";
/* PDF del reporte de redes (A4). Se monta en <body> y solo se ve al imprimir:
   "Exportar PDF" → Guardar como PDF. También sirve como HTML del correo y de la
   página que imprime el servidor (renderToStaticMarkup / Chromium).
   Pedro 18-oct-2026; rediseño con la marca Distinto y mejores publicaciones,
   11-nov-2026. */
import { createPortal } from "react-dom";
import { Eye, Heart, MessageCircle, Share2, Users, Sparkles, MousePointerClick, TrendingUp } from "lucide-react";
import { addDays, delta, exactSum, type Channel, type MetricKey, type Post, type PostReport, type SocialReport, type SocialTrend } from "@/lib/social-reports/model";
import { LOGO_DISTINTO } from "@/lib/social-reports/logo-distinto";
import { mejoresPublicaciones } from "@/lib/social-reports/mejores";
import { FacebookLogo, InstagramLogo, MetaLogo, TikTokLogo } from "./social-icons";
import { LineChart, seriesFor } from "./social-trend";
import type { TikTokReporte } from "@/lib/tiktok/server";

/* Marca Distinto: morado y amarillo del logo, tinta casi negra. */
const C = { tinta: "#17121f", gris: "#5f5970", suave: "#9a93a8", linea: "#ece7f3", fondo: "#faf7fd", morado: "#ba41f7", moradoOsc: "#8a24c9", amarillo: "#f2cc2c", verde: "#15803d", naranja: "#c2410c" };
const GRAD = `linear-gradient(120deg,${C.morado},${C.moradoOsc})`;
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const int = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("es-PE"));
const corto = (v: number | null | undefined) => {
  if (v == null) return "—";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString("es-PE", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(v) >= 10_000) return `${(v / 1000).toLocaleString("es-PE", { maximumFractionDigits: 1 })} mil`;
  return int(v);
};
const fecha = (d: string) => new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const fechaPost = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "America/Lima" });
const mes = (m: string) => {
  const t = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T12:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const red = (n: "facebook" | "instagram") => (n === "facebook" ? "Facebook" : "Instagram");
function money(v: number | null, cur: string) {
  if (v === null) return "—";
  try { return new Intl.NumberFormat("es-PE", { style: "currency", currency: cur }).format(v); } catch { return `${v.toFixed(2)} ${cur}`; }
}
function cambio(a: number | null, b: number | null, invertir = false) {
  const d = delta(a, b);
  if (d === null) return null;
  const bueno = invertir ? d < 0 : d > 0;
  return { txt: `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1)}%`, color: Math.abs(d) < 0.05 ? C.gris : bueno ? C.verde : C.naranja };
}
/* Interacciones sobre cuentas alcanzadas: cuánto reacciona quien ve el contenido. */
const tasa = (c: Channel) => (c.current.interactions != null && c.current.reach ? (c.current.interactions / c.current.reach) * 100 : null);
const interaccionPost = (p: Post) => (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0);


type Props = { brand: string; report: SocialReport; trend: SocialTrend | null; tiktok?: TikTokReporte | null; posts?: PostReport | null };

export function SocialReportPdf(props: Props) {
  /* Solo se monta en el navegador, después del clic en "Exportar PDF". */
  if (typeof document === "undefined") return null;
  return createPortal(
    <div id="reporte-redes-pdf">
      <SocialReportDoc {...props} />
      <style>{`#reporte-redes-pdf{display:none}
@media print{@page{size:A4;margin:0}html,body{background:#fff!important;margin:0!important;padding:0!important;height:auto!important;overflow:visible!important}
body>*:not(#reporte-redes-pdf){display:none!important}#reporte-redes-pdf{display:block!important}}`}</style>
    </div>,
    document.body,
  );
}

export function SocialReportDoc({ brand, report, trend, tiktok = null, posts = null }: Props) {
  const { period, channels, ads } = report;
  const views = exactSum(channels.map((c) => c.current.views)), viewsPrev = exactSum(channels.map((c) => c.previous.views));
  const inter = exactSum(channels.map((c) => c.current.interactions)), interPrev = exactSum(channels.map((c) => c.previous.interactions));
  const followers = exactSum(channels.map((c) => c.followers));
  const hoy = new Date(report.checkedAt).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "long", year: "numeric" });
  const top = mejoresPublicaciones(posts);
  const tk = tiktok?.conectado && tiktok.perfil ? tiktok : null;
  const total = top.length || tk ? 3 : 2;
  const m = mes(period.month);
  const rango = `${fecha(period.current.start)} — ${fecha(addDays(period.current.end, -1))}`;

  /* Lo más destacado: frases armadas solo con datos reales del periodo. */
  const destacados: string[] = [];
  if (views !== null) {
    const d = delta(views, viewsPrev);
    destacados.push(`${int(views)} visualizaciones entre Facebook e Instagram${d !== null ? `, ${d >= 0 ? "un" : "una baja de"} ${Math.abs(d).toFixed(1)}% ${d >= 0 ? "más que" : "frente a"} el periodo anterior` : ""}.`);
  }
  const conCrec = channels.map((c) => ({ c, d: delta(c.current.views, c.previous.views) })).filter((x) => x.d !== null).sort((a, b) => (b.d as number) - (a.d as number));
  if (conCrec[0] && (conCrec[0].d as number) > 0) destacados.push(`${red(conCrec[0].c.network)} fue la red que más creció en visualizaciones (+${(conCrec[0].d as number).toFixed(1)}%).`);
  if (top[0]?.views) destacados.push(`La publicación más vista del mes en ${red(top[0].network)} alcanzó ${int(top[0].views)} visualizaciones.`);
  const neto = exactSum(channels.map((c) => (c.current.follows !== null && c.current.unfollows !== null ? c.current.follows - c.current.unfollows : null)));
  if (neto !== null) destacados.push(`Balance de seguidores del periodo: ${neto > 0 ? "+" : ""}${neto.toLocaleString("es-PE")} entre nuevos seguidores y bajas.`);
  if (ads && ads.current.conversations !== null) destacados.push(`La pauta generó ${int(ads.current.conversations)} conversaciones con ${money(ads.current.spend, ads.currency)} de inversión${ads.current.costPerConversation !== null ? ` (${money(ads.current.costPerConversation, ads.currency)} por conversación)` : ""}.`);

  return (
    <div style={{ fontFamily: FONT, color: C.tinta, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      {/* Hoja 1: portada y resumen */}
      <Hoja n={1} total={total} hoy={hoy}>
        <BarraMarca mes={m} />
        <div style={{ margin: "0 34px", borderRadius: 18, background: GRAD, color: "#fff", padding: "22px 26px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -40, top: -40, width: 170, height: 170, borderRadius: "50%", background: "rgba(255,255,255,.10)" }} />
          <div style={{ position: "absolute", right: 70, bottom: -60, width: 120, height: 120, borderRadius: "50%", background: "rgba(242,204,44,.35)" }} />
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".16em", color: C.amarillo }}>REPORTE MENSUAL DE REDES SOCIALES</div>
          <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6, letterSpacing: "-.02em" }}>{brand}</div>
          <div style={{ fontSize: 12, marginTop: 6, opacity: 0.95 }}>{rango}</div>
          <div style={{ fontSize: 9.5, marginTop: 2, opacity: 0.8 }}>
            Comparado con {fecha(period.previous.start)} — {fecha(addDays(period.previous.end, -1))}{period.partial ? " · mes en curso" : ""}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {[FacebookLogo, InstagramLogo, ...(tk ? [TikTokLogo] : []), MetaLogo].map((L, i) => (
              <span key={i} style={{ background: "#fff", borderRadius: 7, padding: 3, display: "inline-flex" }}><L size={15} /></span>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 34px 0", display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            <Kpi icono={<Eye size={14} />} label="Visualizaciones" valor={corto(views)} v={cambio(views, viewsPrev)} sub="Facebook + Instagram" />
            <Kpi icono={<Heart size={14} />} label="Interacciones" valor={corto(inter)} v={cambio(inter, interPrev)} sub="Me gusta, comentarios y más" />
            <Kpi icono={<Users size={14} />} label="Seguidores" valor={corto(followers)} sub="Total actual de las cuentas" />
            {ads
              ? <Kpi icono={<MousePointerClick size={14} />} label="Conversaciones" valor={int(ads.current.conversations)} v={cambio(ads.current.conversations, ads.previous.conversations)} sub={`${money(ads.current.spend, ads.currency)} en pauta`} />
              : <Kpi icono={<TrendingUp size={14} />} label="Balance de seguidores" valor={neto === null ? "—" : `${neto > 0 ? "+" : ""}${int(neto)}`} sub="Nuevos menos bajas" />}
          </div>
          {destacados.length > 0 && (
            <div style={{ background: C.fondo, borderRadius: 14, padding: "12px 16px", borderLeft: `4px solid ${C.amarillo}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                <Sparkles size={14} color={C.morado} /> Lo más destacado del mes
              </div>
              <ul style={{ margin: 0, paddingLeft: 17, fontSize: 10.5, lineHeight: 1.6, color: C.gris }}>
                {destacados.slice(0, 5).map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {trend && (
            <Bloque titulo="Crecimiento de visualizaciones" nota={`últimos ${trend.months.length} meses`}>
              <LineChart months={trend.months} series={seriesFor(trend, "views")} metric="views" currency={trend.currency} height={215} isStatic />
              <Leyenda trend={trend} />
            </Bloque>
          )}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, channels.length)},1fr)`, gap: 10 }}>
            {channels.map((c) => <ResumenCanal key={c.network} c={c} />)}
          </div>
        </div>
      </Hoja>

      {/* Hoja 2: detalle por red y pauta */}
      <Hoja n={2} total={total} hoy={hoy}>
        <BarraMarca mes={m} brand={brand} />
        <div style={{ padding: "4px 34px 0", display: "grid", gap: 14 }}>
          <Titulo t="Detalle por red social" s="Periodo actual frente al mismo número de días del periodo anterior" />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, channels.length)},1fr)`, gap: 12 }}>
            {channels.map((c) => <Canal key={c.network} c={c} />)}
          </div>
          {trend && (
            <Bloque titulo="Seguidores ganados por mes" nota="nuevos seguidores − bajas">
              <LineChart months={trend.months} series={seriesFor(trend, "netFollows")} metric="netFollows" currency={trend.currency} height={140} isStatic />
              <Leyenda trend={trend} />
            </Bloque>
          )}
          {ads && (
            <>
              <Titulo t="Resultados de la pauta" s={ads.name} icono={<MetaLogo size={18} />} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                <Mini label="Inversión" valor={money(ads.current.spend, ads.currency)} v={cambio(ads.current.spend, ads.previous.spend, true)} />
                <Mini label="Conversaciones iniciadas" valor={int(ads.current.conversations)} v={cambio(ads.current.conversations, ads.previous.conversations)} />
                <Mini label="Costo por conversación" valor={money(ads.current.costPerConversation, ads.currency)} v={cambio(ads.current.costPerConversation, ads.previous.costPerConversation, true)} />
              </div>
              {trend && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Bloque titulo="Inversión por mes" nota={trend.currency ?? undefined}>
                    <LineChart months={trend.months} series={seriesFor(trend, "spend")} metric="spend" currency={trend.currency} height={120} isStatic />
                  </Bloque>
                  <Bloque titulo="Conversaciones por mes">
                    <LineChart months={trend.months} series={seriesFor(trend, "conversations")} metric="conversations" currency={trend.currency} height={120} isStatic />
                  </Bloque>
                </div>
              )}
            </>
          )}
          {total === 2 && <NotaDatos hoy={hoy} />}
        </div>
      </Hoja>

      {/* Hoja 3: mejores publicaciones y TikTok */}
      {total === 3 && (
        <Hoja n={3} total={total} hoy={hoy}>
          <BarraMarca mes={m} brand={brand} />
          <div style={{ padding: "4px 34px 0", display: "grid", gap: 14 }}>
            {top.length > 0 && (
              <>
                <Titulo t="Mejores publicaciones del mes" s="Ordenadas por visualizaciones · cifras acumuladas al consultar" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                  {top.map((p, i) => <Publicacion key={p.id} p={p} n={i + 1} />)}
                </div>
              </>
            )}
            {tk && (
              <Bloque titulo="TikTok" nota={tk.perfil?.username ? `@${tk.perfil.username}` : undefined} icono={<TikTokLogo size={16} />}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                  <Mini label="Seguidores" valor={int(tk.perfil?.follower_count)} />
                  <Mini label="Videos del mes" valor={int(tk.mes?.videos ?? null)} />
                  <Mini label="Vistas de esos videos" valor={corto(tk.mes?.views ?? null)} />
                  <Mini label="Me gusta de esos videos" valor={corto(tk.mes?.likes ?? null)} />
                </div>
                {tk.mes && tk.mes.top.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 10 }}>
                    {tk.mes.top.slice(0, 3).map((v) => (
                      <div key={v.id} style={{ display: "flex", gap: 8, alignItems: "center", border: `1px solid ${C.linea}`, borderRadius: 10, padding: 6 }}>
                        <div style={{ width: 38, height: 54, borderRadius: 6, flex: "none", backgroundColor: C.tinta, backgroundImage: v.cover ? `url("${v.cover}"), ${GRAD}` : GRAD, backgroundSize: "cover", backgroundPosition: "center" }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 9, color: C.gris, lineHeight: 1.35, maxHeight: 25, overflow: "hidden" }}>{(v.title || "Video").slice(0, 70)}</div>
                          <div style={{ fontSize: 10, fontWeight: 800, marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}><Eye size={11} color={C.morado} />{corto(v.views)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Bloque>
            )}
            {!tk && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, border: `1px dashed ${C.linea}`, borderRadius: 12, padding: "10px 14px", fontSize: 10.5, color: C.gris }}>
                <TikTokLogo size={18} /> TikTok se incorporará al reporte cuando la cuenta esté conectada.
              </div>
            )}
            <NotaDatos hoy={hoy} />
          </div>
        </Hoja>
      )}
    </div>
  );
}

function NotaDatos({ hoy }: { hoy: string }) {
  return (
    <p style={{ fontSize: 8.5, color: C.suave, lineHeight: 1.5, margin: 0 }}>
      Datos de las API oficiales de Meta y TikTok consultados el {hoy}. Los seguidores son el total al consultar; el resto corresponde al periodo indicado.
      “—” significa dato no disponible, nunca cero. El alcance no se suma entre redes. Tasa de interacción = interacciones ÷ cuentas alcanzadas.
    </p>
  );
}

function BarraMarca({ mes: m, brand }: { mes: string; brand?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 34px 16px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_DISTINTO} alt="Distinto · Agencia de marketing" style={{ height: 30, width: "auto", display: "block" }} />
      <div style={{ textAlign: "right" }}>
        {brand && <div style={{ fontSize: 11, fontWeight: 800 }}>{brand}</div>}
        <span style={{ display: "inline-block", marginTop: brand ? 3 : 0, fontSize: 9.5, fontWeight: 700, color: C.moradoOsc, background: "#f3e6fd", borderRadius: 999, padding: "3px 10px" }}>{m}</span>
      </div>
    </div>
  );
}

function Titulo({ t, s, icono }: { t: string; s?: string; icono?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      {icono ?? <span style={{ width: 5, height: 20, borderRadius: 3, background: C.morado }} />}
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.01em" }}>{t}</div>
        {s && <div style={{ fontSize: 9.5, color: C.suave, marginTop: 1 }}>{s}</div>}
      </div>
    </div>
  );
}

function Leyenda({ trend }: { trend: SocialTrend }) {
  return (
    <div style={{ display: "flex", gap: 14, fontSize: 9.5, color: C.gris, marginTop: 4, justifyContent: "flex-end" }}>
      {trend.networks.length > 1 && <span><i style={{ display: "inline-block", width: 12, height: 3, background: "#7c3aed", marginRight: 5, verticalAlign: "middle" }} />Total</span>}
      {trend.networks.includes("facebook") && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><FacebookLogo size={11} />Facebook</span>}
      {trend.networks.includes("instagram") && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><InstagramLogo size={11} />Instagram</span>}
    </div>
  );
}

function Hoja({ children, n, total, hoy }: { children: React.ReactNode; n: number; total: number; hoy: string }) {
  return (
    <section style={{ width: "210mm", height: "297mm", position: "relative", overflow: "hidden", background: "#fff", breakAfter: "page", pageBreakAfter: "always", boxSizing: "border-box" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg,${C.morado} 0 80%,${C.amarillo} 80% 100%)` }} />
      {children}
      <div style={{ position: "absolute", left: 34, right: 34, bottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8.5, color: C.suave, borderTop: `1px solid ${C.linea}`, paddingTop: 7 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DISTINTO} alt="" style={{ height: 11, width: "auto" }} />
          Reporte elaborado por Distinto · distintostudio.com
        </span>
        <span>Generado el {hoy} · Página {n} de {total}</span>
      </div>
    </section>
  );
}

function Bloque({ titulo, nota, icono, children }: { titulo: string; nota?: string; icono?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${C.linea}`, borderRadius: 14, padding: "11px 14px", breakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        {icono ?? <span style={{ width: 4, height: 12, borderRadius: 2, background: C.morado }} />}
        <span style={{ fontSize: 12, fontWeight: 800 }}>{titulo}</span>
        {nota && <span style={{ fontSize: 9.5, color: C.suave }}>{nota}</span>}
      </div>
      {children}
    </div>
  );
}

function Kpi({ icono, label, valor, sub, v }: { icono: React.ReactNode; label: string; valor: string; sub?: string; v?: { txt: string; color: string } | null }) {
  return (
    <div style={{ border: `1px solid ${C.linea}`, borderRadius: 14, padding: "11px 12px", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9.5, fontWeight: 700, color: C.gris }}>
        <span style={{ width: 22, height: 22, borderRadius: 7, background: "#f3e6fd", color: C.moradoOsc, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{icono}</span>
        {label}
      </div>
      <div style={{ fontSize: 21, fontWeight: 800, marginTop: 7, whiteSpace: "nowrap", letterSpacing: "-.02em" }}>{valor}</div>
      {v && <div style={{ fontSize: 9, fontWeight: 700, color: v.color, marginTop: 2 }}>{v.txt} vs. anterior</div>}
      {sub && <div style={{ fontSize: 8.5, color: C.suave, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Mini({ label, valor, v }: { label: string; valor: string; v?: { txt: string; color: string } | null }) {
  return (
    <div style={{ background: C.fondo, borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: C.gris }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>{valor}</div>
      {v && <div style={{ fontSize: 8.5, fontWeight: 700, color: v.color, marginTop: 2 }}>{v.txt}</div>}
    </div>
  );
}

function ResumenCanal({ c }: { c: Channel }) {
  const Logo = c.network === "facebook" ? FacebookLogo : InstagramLogo;
  const t = tasa(c);
  const v = cambio(c.current.views, c.previous.views);
  return (
    <div style={{ border: `1px solid ${C.linea}`, borderRadius: 14, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <Logo size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800 }}>{red(c.network)}</div>
        <div style={{ fontSize: 9, color: C.suave, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
      </div>
      <Dato label="seguidores" valor={corto(c.followers)} />
      <Dato label="visualizaciones" valor={corto(c.current.views)} extra={v} />
      <Dato label="tasa de interacción" valor={t === null ? "—" : `${t.toFixed(1)}%`} />
    </div>
  );
}

function Dato({ label, valor, extra }: { label: string; valor: string; extra?: { txt: string; color: string } | null }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 13.5, fontWeight: 800 }}>{valor}</div>
      <div style={{ fontSize: 8, color: C.suave }}>{label}</div>
      {extra && <div style={{ fontSize: 8, fontWeight: 700, color: extra.color }}>{extra.txt}</div>}
    </div>
  );
}

function Canal({ c }: { c: Channel }) {
  const rows: { key: MetricKey; label: string }[] = [
    { key: "views", label: "Visualizaciones" },
    { key: "reach", label: c.network === "facebook" ? "Espectadores únicos" : "Cuentas alcanzadas" },
    { key: "interactions", label: "Interacciones" },
    { key: "likes", label: "Me gusta" },
    ...(c.network === "instagram"
      ? [{ key: "comments" as const, label: "Comentarios" }, { key: "shares" as const, label: "Compartidos" }, { key: "saves" as const, label: "Guardados" }]
      : [{ key: "profileVisits" as const, label: "Visitas a la página" }]),
    { key: "follows", label: "Nuevos seguidores" },
    { key: "unfollows", label: "Dejaron de seguir" },
  ];
  const Logo = c.network === "facebook" ? FacebookLogo : InstagramLogo;
  const t = tasa(c);
  const tPrev = c.previous.interactions != null && c.previous.reach ? (c.previous.interactions / c.previous.reach) * 100 : null;
  return (
    <div style={{ border: `1px solid ${C.linea}`, borderRadius: 14, padding: "12px 14px", breakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Logo size={22} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800 }}>{red(c.network)}</div>
          <div style={{ fontSize: 9.5, color: C.suave }}>{c.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{int(c.followers)}</div>
          <div style={{ fontSize: 8.5, color: C.suave }}>seguidores</div>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr style={{ color: C.suave, fontSize: 8.5, textTransform: "uppercase", letterSpacing: ".05em" }}>
            <th style={{ textAlign: "left", padding: "0 0 4px", fontWeight: 700 }}>Métrica</th>
            <th style={{ textAlign: "right", padding: "0 0 4px", fontWeight: 700 }}>Actual</th>
            <th style={{ textAlign: "right", padding: "0 0 4px", fontWeight: 700 }}>Anterior</th>
            <th style={{ textAlign: "right", padding: "0 0 4px", fontWeight: 700 }}>Cambio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label }) => {
            const v = cambio(c.current[key], c.previous[key], key === "unfollows");
            return (
              <tr key={key} style={{ borderTop: "1px solid #f3f0f8" }}>
                <td style={{ padding: "4.5px 0" }}>{label}</td>
                <td style={{ padding: "4.5px 0", textAlign: "right", fontWeight: 700 }}>{int(c.current[key])}</td>
                <td style={{ padding: "4.5px 0", textAlign: "right", color: C.gris }}>{int(c.previous[key])}</td>
                <td style={{ padding: "4.5px 0", textAlign: "right", fontWeight: 700, color: v?.color ?? C.suave }}>{v?.txt ?? "—"}</td>
              </tr>
            );
          })}
          <tr style={{ borderTop: `1px solid ${C.linea}`, background: C.fondo }}>
            <td style={{ padding: "5px 4px", fontWeight: 700 }}>Tasa de interacción</td>
            <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 800, color: C.moradoOsc }}>{t === null ? "—" : `${t.toFixed(1)}%`}</td>
            <td style={{ padding: "5px 0", textAlign: "right", color: C.gris }}>{tPrev === null ? "—" : `${tPrev.toFixed(1)}%`}</td>
            <td style={{ padding: "5px 4px", textAlign: "right" }} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Publicacion({ p, n }: { p: Post; n: number }) {
  const Logo = p.network === "facebook" ? FacebookLogo : InstagramLogo;
  const tipo = p.mediaType === "video" ? "Video" : p.mediaType === "carrusel" ? "Carrusel" : p.mediaType === "imagen" ? "Imagen" : null;
  const estrella = n === 1;
  return (
    <div style={{ border: `1px solid ${estrella ? C.amarillo : C.linea}`, borderRadius: 14, overflow: "hidden", breakInside: "avoid", boxShadow: estrella ? `0 0 0 2px ${C.amarillo}` : undefined, background: "#fff" }}>
      {/* La imagen de Meta puede vencer: si no carga queda el degradado de marca. */}
      <div style={{ height: 150, position: "relative", backgroundColor: C.moradoOsc, backgroundImage: p.image ? `url("${p.image}"), ${GRAD}` : GRAD, backgroundSize: "cover", backgroundPosition: "center" }}>
        <span style={{ position: "absolute", left: 8, top: 8, background: estrella ? C.amarillo : "rgba(23,18,31,.82)", color: estrella ? C.tinta : "#fff", fontSize: 9, fontWeight: 800, borderRadius: 999, padding: "3px 8px" }}>
          {estrella ? "★ Más vista del mes" : `#${n}`}
        </span>
        <span style={{ position: "absolute", right: 8, top: 8, background: "#fff", borderRadius: 7, padding: 3, display: "inline-flex" }}><Logo size={14} /></span>
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <div style={{ fontSize: 8.5, color: C.suave }}>{red(p.network)} · {fechaPost(p.publishedAt)}{tipo ? ` · ${tipo}` : ""}</div>
        <div style={{ fontSize: 9.5, color: C.tinta, lineHeight: 1.4, marginTop: 4, height: 40, overflow: "hidden" }}>{p.caption?.trim() ? p.caption.trim().slice(0, 110) : "Publicación sin texto"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2, marginTop: 7, paddingTop: 7, borderTop: `1px solid ${C.linea}` }}>
          <Metrica icono={<Eye size={11} />} v={p.views} />
          <Metrica icono={<Heart size={11} />} v={p.likes} />
          <Metrica icono={<MessageCircle size={11} />} v={p.comments} />
          <Metrica icono={<Share2 size={11} />} v={p.shares ?? null} />
        </div>
        <div style={{ fontSize: 8, color: C.suave, marginTop: 4 }}>{int(interaccionPost(p))} interacciones</div>
      </div>
    </div>
  );
}

function Metrica({ icono, v }: { icono: React.ReactNode; v: number | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9.5, fontWeight: 800, color: C.tinta }}>
      <span style={{ color: C.morado, display: "inline-flex" }}>{icono}</span>{corto(v)}
    </div>
  );
}
