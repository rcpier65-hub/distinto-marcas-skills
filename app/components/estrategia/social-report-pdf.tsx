"use client";
/* PDF del reporte de redes (2 hojas A4). Se monta en <body> y solo se ve al
   imprimir: "Exportar PDF" → Guardar como PDF. También sirve como HTML del
   correo automático (renderToStaticMarkup en el servidor). Pedro 18-oct-2026. */
import { createPortal } from "react-dom";
import { addDays, delta, exactSum, type Channel, type MetricKey, type SocialReport, type SocialTrend } from "@/lib/social-reports/model";
import { FacebookLogo, InstagramLogo, MetaLogo, TikTokLogo } from "./social-icons";
import { LineChart, seriesFor } from "./social-trend";

const C = { tinta: "#1f1a2e", gris: "#6b6580", suave: "#9a93a8", linea: "#ebe6f3", fondo: "#f8f6fc", morado: "#7c3aed" };
const GRAD = "linear-gradient(135deg,#5b3fd0,#8b5cf6 55%,#b45cf0)";
const int = (v: number | null) => (v === null ? "—" : Math.round(v).toLocaleString("es-PE"));
const fecha = (d: string) => new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const mes = (m: string) => {
  const t = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T12:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
};
function money(v: number | null, cur: string) {
  if (v === null) return "—";
  try { return new Intl.NumberFormat("es-PE", { style: "currency", currency: cur }).format(v); } catch { return `${v.toFixed(2)} ${cur}`; }
}
function cambio(a: number | null, b: number | null, invertir = false) {
  const d = delta(a, b);
  if (d === null) return null;
  const bueno = invertir ? d < 0 : d > 0;
  return { txt: `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1)}%`, color: Math.abs(d) < 0.05 ? C.gris : bueno ? "#15803d" : "#c2410c" };
}

export function SocialReportPdf(props: { brand: string; report: SocialReport; trend: SocialTrend | null }) {
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

export function SocialReportDoc({ brand, report, trend }: { brand: string; report: SocialReport; trend: SocialTrend | null }) {
  const { period, channels, ads } = report;
  const views = exactSum(channels.map((c) => c.current.views)), viewsPrev = exactSum(channels.map((c) => c.previous.views));
  const followers = exactSum(channels.map((c) => c.followers));
  const hoy = new Date(report.checkedAt).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "long", year: "numeric" });
  return (
    <div style={{ fontFamily: 'Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: C.tinta, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      <Hoja n={1} hoy={hoy}>
        <Cabecera brand={brand} mes={mes(period.month)} rango={`${fecha(period.current.start)} — ${fecha(addDays(period.current.end, -1))}`} grande
          comparado={`Comparado con ${fecha(period.previous.start)} — ${fecha(addDays(period.previous.end, -1))}${period.partial ? " · mes en curso" : ""}`} />
        <div style={{ padding: "20px 38px 0", display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            <Kpi label="Visualizaciones" valor={int(views)} v={cambio(views, viewsPrev)} sub="Facebook + Instagram" />
            <Kpi label="Seguidores" valor={int(followers)} sub="Total actual de las cuentas" />
            <Kpi label="Inversión en pauta" valor={ads ? money(ads.current.spend, ads.currency) : "—"} v={ads ? cambio(ads.current.spend, ads.previous.spend, true) : null} sub="Meta Ads" />
            <Kpi label="Conversaciones" valor={int(ads?.current.conversations ?? null)} v={ads ? cambio(ads.current.conversations, ads.previous.conversations) : null} sub="Iniciadas desde anuncios" />
          </div>
          {trend && (
            <Bloque titulo="Crecimiento de visualizaciones" nota={`últimos ${trend.months.length} meses`}>
              <LineChart months={trend.months} series={seriesFor(trend, "views")} metric="views" currency={trend.currency} height={210} isStatic />
              <Leyenda trend={trend} />
            </Bloque>
          )}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, channels.length)},1fr)`, gap: 12 }}>
            {channels.map((c) => <Canal key={c.network} c={c} />)}
          </div>
        </div>
      </Hoja>
      <Hoja n={2} hoy={hoy}>
        <Cabecera brand={brand} mes={mes(period.month)} />
        <div style={{ padding: "20px 38px 0", display: "grid", gap: 16 }}>
          {ads && (
            <Bloque titulo="Resultados de pauta" nota={ads.name} icono={<MetaLogo size={16} />}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                <Mini label="Inversión" valor={money(ads.current.spend, ads.currency)} v={cambio(ads.current.spend, ads.previous.spend, true)} />
                <Mini label="Conversaciones iniciadas" valor={int(ads.current.conversations)} v={cambio(ads.current.conversations, ads.previous.conversations)} />
                <Mini label="Costo por conversación" valor={money(ads.current.costPerConversation, ads.currency)} v={cambio(ads.current.costPerConversation, ads.previous.costPerConversation, true)} />
              </div>
            </Bloque>
          )}
          {trend && (
            <Bloque titulo="Seguidores ganados por mes" nota="nuevos seguidores − bajas">
              <LineChart months={trend.months} series={seriesFor(trend, "netFollows")} metric="netFollows" currency={trend.currency} height={170} isStatic />
              <Leyenda trend={trend} />
            </Bloque>
          )}
          {trend && ads && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <Bloque titulo="Inversión en pauta por mes" nota={trend.currency ?? undefined} icono={<MetaLogo size={16} />}>
                <LineChart months={trend.months} series={seriesFor(trend, "spend")} metric="spend" currency={trend.currency} height={150} isStatic />
              </Bloque>
              <Bloque titulo="Conversaciones iniciadas por mes" icono={<MetaLogo size={16} />}>
                <LineChart months={trend.months} series={seriesFor(trend, "conversations")} metric="conversations" currency={trend.currency} height={150} isStatic />
              </Bloque>
            </div>
          )}
          <Bloque titulo="Lectura del periodo">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.6, color: C.gris }}>
              {channels.map((c) => {
                const d = delta(c.current.views, c.previous.views);
                const neto = c.current.follows !== null && c.current.unfollows !== null ? c.current.follows - c.current.unfollows : null;
                return (
                  <li key={c.network}>
                    <b style={{ color: C.tinta }}>{c.network === "facebook" ? "Facebook" : "Instagram"}:</b>{" "}
                    {int(c.current.views)} visualizaciones{d !== null ? ` (${d > 0 ? "+" : ""}${d.toFixed(1)}% vs. periodo anterior)` : ""}
                    {neto !== null ? ` · balance de seguidores ${neto > 0 ? "+" : ""}${neto.toLocaleString("es-PE")}` : ""}.
                  </li>
                );
              })}
              {ads && ads.current.conversations !== null && (
                <li><b style={{ color: C.tinta }}>Pauta:</b> {int(ads.current.conversations)} conversaciones con una inversión de {money(ads.current.spend, ads.currency)}.</li>
              )}
            </ul>
          </Bloque>
          <div style={{ display: "flex", alignItems: "center", gap: 10, border: `1px dashed ${C.linea}`, borderRadius: 12, padding: "10px 14px", fontSize: 10.5, color: C.gris }}>
            <TikTokLogo size={18} /> TikTok se incorporará al reporte cuando la cuenta esté conectada.
          </div>
          <p style={{ fontSize: 9, color: C.suave, lineHeight: 1.5, margin: 0 }}>
            Datos de la API oficial de Meta consultados el {hoy}. Los seguidores son el total al consultar; el resto corresponde al periodo indicado.
            “—” significa dato no disponible, nunca cero. El alcance no se suma entre redes.
          </p>
        </div>
      </Hoja>
    </div>
  );
}

function Leyenda({ trend }: { trend: SocialTrend }) {
  return (
    <div style={{ display: "flex", gap: 14, fontSize: 9.5, color: C.gris, marginTop: 4, justifyContent: "flex-end" }}>
      {trend.networks.length > 1 && <span><i style={{ display: "inline-block", width: 12, height: 3, background: C.morado, marginRight: 5, verticalAlign: "middle" }} />Total</span>}
      {trend.networks.includes("facebook") && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><FacebookLogo size={11} />Facebook</span>}
      {trend.networks.includes("instagram") && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><InstagramLogo size={11} />Instagram</span>}
    </div>
  );
}

function Hoja({ children, n, hoy }: { children: React.ReactNode; n: number; hoy: string }) {
  return (
    <section style={{ width: "210mm", height: "297mm", position: "relative", overflow: "hidden", background: "#fff", breakAfter: "page", pageBreakAfter: "always", boxSizing: "border-box" }}>
      {children}
      <div style={{ position: "absolute", left: 38, right: 38, bottom: 16, display: "flex", justifyContent: "space-between", fontSize: 8.5, color: C.suave, borderTop: `1px solid ${C.linea}`, paddingTop: 7 }}>
        <span>Distinto Studio · Reporte de redes sociales · API oficial de Meta</span>
        <span>Generado el {hoy} · Página {n} de 2</span>
      </div>
    </section>
  );
}

function Cabecera({ brand, mes: m, rango, comparado, grande = false }: { brand: string; mes: string; rango?: string; comparado?: string; grande?: boolean }) {
  return (
    <div style={{ background: GRAD, color: "#fff", padding: grande ? "26px 38px 24px" : "15px 38px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".14em", opacity: 0.85 }}>REPORTE MENSUAL DE REDES SOCIALES</div>
        <div style={{ fontSize: grande ? 26 : 17, fontWeight: 800, marginTop: 3 }}>{brand}</div>
        {rango && <div style={{ fontSize: 11.5, opacity: 0.92, marginTop: 3 }}>{rango}</div>}
        {comparado && <div style={{ fontSize: 9.5, opacity: 0.75, marginTop: 2 }}>{comparado}</div>}
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: grande ? 21 : 14, fontWeight: 800 }}>{m}</div>
        <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", marginTop: 6 }}>
          <span style={{ background: "#fff", borderRadius: 6, padding: 2, display: "inline-flex" }}><FacebookLogo size={grande ? 16 : 13} /></span>
          <span style={{ background: "#fff", borderRadius: 6, padding: 2, display: "inline-flex" }}><InstagramLogo size={grande ? 16 : 13} /></span>
          <span style={{ background: "#fff", borderRadius: 6, padding: 2, display: "inline-flex" }}><MetaLogo size={grande ? 16 : 13} /></span>
        </div>
      </div>
    </div>
  );
}

function Bloque({ titulo, nota, icono, children }: { titulo: string; nota?: string; icono?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${C.linea}`, borderRadius: 12, padding: "12px 14px", breakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        {icono ?? <span style={{ width: 4, height: 12, borderRadius: 2, background: GRAD }} />}
        <span style={{ fontSize: 12, fontWeight: 800 }}>{titulo}</span>
        {nota && <span style={{ fontSize: 9.5, color: C.suave }}>{nota}</span>}
      </div>
      {children}
    </div>
  );
}

function Kpi({ label, valor, sub, v }: { label: string; valor: string; sub?: string; v?: { txt: string; color: string } | null }) {
  return (
    <div style={{ border: `1px solid ${C.linea}`, borderRadius: 12, padding: "10px 12px", borderTop: "3px solid #8b5cf6" }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: C.gris }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4, whiteSpace: "nowrap" }}>{valor}</div>
      {v && <div style={{ fontSize: 9, fontWeight: 700, color: v.color, marginTop: 2 }}>{v.txt} vs. anterior</div>}
      {sub && <div style={{ fontSize: 8.5, color: C.suave, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Mini({ label, valor, v }: { label: string; valor: string; v?: { txt: string; color: string } | null }) {
  return (
    <div style={{ background: C.fondo, borderRadius: 9, padding: "8px 10px" }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: C.gris }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>{valor}</div>
      {v && <div style={{ fontSize: 8.5, fontWeight: 700, color: v.color, marginTop: 2 }}>{v.txt}</div>}
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
  ];
  const Logo = c.network === "facebook" ? FacebookLogo : InstagramLogo;
  return (
    <div style={{ border: `1px solid ${C.linea}`, borderRadius: 12, padding: "12px 14px", breakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Logo size={22} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800 }}>{c.network === "facebook" ? "Facebook" : "Instagram"}</div>
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
            const v = cambio(c.current[key], c.previous[key]);
            return (
              <tr key={key} style={{ borderTop: "1px solid #f3f0f8" }}>
                <td style={{ padding: "4.5px 0" }}>{label}</td>
                <td style={{ padding: "4.5px 0", textAlign: "right", fontWeight: 700 }}>{int(c.current[key])}</td>
                <td style={{ padding: "4.5px 0", textAlign: "right", color: C.gris }}>{int(c.previous[key])}</td>
                <td style={{ padding: "4.5px 0", textAlign: "right", fontWeight: 700, color: v?.color ?? C.suave }}>{v?.txt ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
