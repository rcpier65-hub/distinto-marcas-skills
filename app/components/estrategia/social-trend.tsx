"use client";
import { MejoresDelMes } from "./social-best";
/* Crecimiento mes a mes de un indicador del reporte de redes (gráfica de líneas).
   Se abre al hacer clic en un indicador; permite cambiar de métrica sin salir.
   Pedro 18-oct-2026: "hacer clic en visualizaciones y ver por periodos de mes
   como va con métricas de líneas, ver cómo estamos creciendo". */
import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, X } from "lucide-react";
import type { SocialTrend, TrendPoint } from "@/lib/social-reports/model";
import { FacebookLogo, InstagramLogo, MetaLogo } from "./social-icons";

export type TrendMetric = "views" | "interactions" | "netFollows" | "spend" | "conversations";
export const TREND_METRICS: { key: TrendMetric; label: string; help: string }[] = [
  { key: "views", label: "Visualizaciones", help: "Veces que se vio el contenido en Facebook e Instagram durante cada mes." },
  { key: "interactions", label: "Interacciones", help: "Me gusta, comentarios, compartidos, guardados y otras acciones sobre el contenido." },
  { key: "netFollows", label: "Seguidores ganados", help: "Nuevos seguimientos menos bajas de cada mes. Meta no entrega el total histórico de seguidores, así que se mide el crecimiento neto." },
  { key: "spend", label: "Inversión en pauta", help: "Gasto mensual de la cuenta publicitaria de Meta asignada a la marca." },
  { key: "conversations", label: "Conversaciones", help: "Conversaciones de mensajería iniciadas desde los anuncios cada mes." },
];
const COLORS = { facebook: "#0866FF", instagram: "#E1306C", total: "#7c3aed", single: "#7c3aed" };

const monthShort = (m: string) =>
  new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-01T12:00:00Z`)).replace(".", "");
const monthLong = (m: string) => {
  const t = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T12:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
};

type Serie = { key: string; label: string; color: string; values: (number | null)[]; dashed?: boolean };

export function seriesFor(t: SocialTrend, metric: TrendMetric): Serie[] {
  const months = t.months;
  if (metric === "spend" || metric === "conversations")
    return [{ key: "single", label: metric === "spend" ? `Inversión${t.currency ? ` (${t.currency})` : ""}` : "Conversaciones", color: COLORS.single, values: months.map((p) => p[metric]) }];
  const pick = (p: TrendPoint, n: "facebook" | "instagram") => p[metric][n];
  const out: Serie[] = [];
  if (t.networks.length > 1)
    out.push({
      key: "total",
      label: "Total",
      color: COLORS.total,
      values: months.map((p) => {
        const vals = t.networks.map((n) => pick(p, n));
        return vals.every((v) => v !== null) ? vals.reduce<number>((s, v) => s + (v as number), 0) : null;
      }),
    });
  for (const n of t.networks)
    out.push({ key: n, label: n === "facebook" ? "Facebook" : "Instagram", color: COLORS[n], values: months.map((p) => pick(p, n)), dashed: t.networks.length > 1 });
  return out;
}

export function fmtTrend(v: number | null, metric: TrendMetric, currency: string | null) {
  if (v === null) return "—";
  if (metric === "spend") {
    try {
      return new Intl.NumberFormat("es-PE", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(v);
    } catch {
      return v.toFixed(0);
    }
  }
  return `${metric === "netFollows" && v > 0 ? "+" : ""}${Math.round(v).toLocaleString("es-PE")}`;
}

/* Gráfica de líneas SVG (sin librerías). `static` = sin interacción (para PDF). */
export function LineChart({ months, series, metric, currency, height = 260, isStatic = false }: {
  months: TrendPoint[];
  series: Serie[];
  metric: TrendMetric;
  currency: string | null;
  height?: number;
  isStatic?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = height, L = 64, R = 18, T = 18, B = 34;
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const min = Math.min(0, ...all), maxRaw = Math.max(1, ...all);
  const max = maxRaw + (maxRaw - min) * 0.08;
  const x = (i: number) => L + (months.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (months.length - 1));
  const y = (v: number) => T + (H - T - B) * (1 - (v - min) / (max - min || 1));
  const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);
  const path = (vals: (number | null)[]) => {
    let d = "", pen = false;
    vals.forEach((v, i) => {
      if (v === null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  const main = series[0];
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gráfica de crecimiento mensual"
        onMouseLeave={() => setHover(null)} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={`area-${metric}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={main?.color ?? "#7c3aed"} stopOpacity="0.22" />
            <stop offset="1" stopColor={main?.color ?? "#7c3aed"} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#ece8f3" strokeDasharray={i === 0 ? undefined : "3 4"} />
            <text x={L - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#9a93a8">
              {metric === "spend" ? Math.round(t).toLocaleString("es-PE") : Math.abs(t) >= 1000 ? `${(t / 1000).toFixed(t >= 10000 ? 0 : 1)}k` : Math.round(t)}
            </text>
          </g>
        ))}
        {min < 0 && <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="#c9c2d6" />}
        {main && (() => {
          const pts = main.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const)).filter(Boolean) as (readonly [number, number])[];
          return pts.length > 1 ? (
            <path d={`M${pts[0][0]},${y(Math.max(min, 0))} ${pts.map((p) => `L${p[0]},${p[1]}`).join(" ")} L${pts[pts.length - 1][0]},${y(Math.max(min, 0))} Z`} fill={`url(#area-${metric})`} />
          ) : null;
        })()}
        {series.slice().reverse().map((s) => (
          <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.key === "total" || s.key === "single" ? 3 : 2}
            strokeDasharray={s.dashed ? "6 5" : undefined} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {series.map((s) => s.values.map((v, i) => v === null ? null : (
          <circle key={s.key + i} cx={x(i)} cy={y(v)} r={hover === i ? 5.5 : 3.5} fill="#fff" stroke={s.color} strokeWidth="2.2" />
        )))}
        {months.map((p, i) => (
          <text key={p.month} x={x(i)} y={H - 10} textAnchor="middle" fontSize="12" fontWeight={hover === i ? 700 : 500} fill={hover === i ? "#2a2238" : "#8a8398"}>
            {monthShort(p.month)}{p.partial ? "*" : ""}
          </text>
        ))}
        {!isStatic && hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="#cfc6e0" strokeDasharray="3 3" />}
        {!isStatic && months.map((p, i) => (
          <rect key={"hit" + i} x={x(i) - (W - L - R) / Math.max(1, months.length - 1) / 2} y={0} width={(W - L - R) / Math.max(1, months.length - 1)} height={H}
            fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
        ))}
      </svg>
      {!isStatic && hover !== null && (
        <div style={{ position: "absolute", top: 4, left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > months.length / 2 ? "-105%" : "5%"})`,
          background: "#1f1830", color: "#fff", borderRadius: 10, padding: "8px 11px", fontSize: 12, pointerEvents: "none", minWidth: 150, boxShadow: "0 10px 24px -8px rgba(20,10,40,.5)" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{monthLong(months[hover].month)}{months[hover].partial ? " · en curso" : ""}</div>
          {series.map((s) => (
            <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: s.color, marginRight: 6 }} />{s.label}</span>
              <b>{fmtTrend(s.values[hover], metric, currency)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function useTrend(slug: string, month: string, enabled = true) {
  const [state, setState] = useState<{ data?: SocialTrend; error?: string }>({});
  useEffect(() => {
    if (!enabled) return;
    const c = new AbortController();
    void fetch(`/api/meta/reporte-redes?${new URLSearchParams({ marca: slug, mes: month, detalle: "tendencia" })}`, { signal: c.signal, cache: "no-store" })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw Error(b.error || "No se pudo consultar la tendencia.");
        return b as SocialTrend;
      })
      .then((data) => { if (!c.signal.aborted) setState({ data }); })
      .catch((e) => { if (!c.signal.aborted) setState({ error: e.message }); });
    return () => c.abort();
  }, [slug, month, enabled]);
  return state;
}

export function TrendModal({ slug, month, initial, close }: { slug: string; month: string; initial: TrendMetric; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [metric, setMetric] = useState<TrendMetric>(initial);
  const { data, error } = useTrend(slug, month);
  useEffect(() => { ref.current?.showModal(); }, []);
  const series = useMemo(() => (data ? seriesFor(data, metric) : []), [data, metric]);
  const info = TREND_METRICS.find((m) => m.key === metric)!;
  const main = series[0];
  const first = main?.values.find((v) => v !== null) ?? null;
  const last = main ? [...main.values].reverse().find((v) => v !== null) ?? null : null;
  const lastIdx = main ? main.values.length - 1 - [...main.values].reverse().findIndex((v) => v !== null) : -1;
  const growth = first !== null && last !== null && first > 0 && metric !== "netFollows" ? ((last - first) / first) * 100 : null;
  return (
    <dialog ref={ref} onCancel={close} onClick={(e) => { if (e.target === ref.current) close(); }}
      style={{ border: 0, borderRadius: 22, padding: 0, width: "min(880px, 94vw)", maxHeight: "92vh", boxShadow: "0 30px 80px -20px rgba(30,15,60,.45)" }}>
      <div style={{ padding: "22px 26px 24px", color: "#282338" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#7170ff,#ba41f7)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: "#7c3aed" }}>CRECIMIENTO MES A MES</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "2px 0 0" }}>{info.label}</h2>
            <p style={{ fontSize: 13, color: "#767084", margin: "4px 0 0" }}>{info.help}</p>
          </div>
          <button onClick={close} aria-label="Cerrar" style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #ece6f5", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "18px 0 14px" }}>
          {TREND_METRICS.map((m) => (
            <button key={m.key} onClick={() => setMetric(m.key)}
              style={{ padding: "7px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${metric === m.key ? "#7c3aed" : "#e5dff0"}`, background: metric === m.key ? "#7c3aed" : "#fff", color: metric === m.key ? "#fff" : "#5b5470" }}>
              {m.label}
            </button>
          ))}
        </div>

        {error && <p role="alert" style={{ color: "#b42318", fontSize: 13 }}>{error}</p>}
        {!data && !error && (
          <div role="status" style={{ height: 300, borderRadius: 16, background: "linear-gradient(90deg,#f6f3fb,#efe9f8,#f6f3fb)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8a8398", fontSize: 13 }}>
            Consultando 6 meses en Meta…
          </div>
        )}
        {data && main && (
          <>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#767084" }}>{lastIdx >= 0 ? monthLong(data.months[lastIdx].month) : ""}</div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em" }}>{fmtTrend(last, metric, data.currency)}</div>
              </div>
              {growth !== null && (
                <div style={{ fontSize: 13, fontWeight: 700, color: growth >= 0 ? "#15803d" : "#b42318", paddingBottom: 6 }}>
                  {growth >= 0 ? "▲" : "▼"} {Math.abs(growth).toFixed(0)}% en {data.months.length} meses
                </div>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12.5, color: "#5b5470" }}>
                {series.map((s) => (
                  <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {s.key === "facebook" ? <FacebookLogo size={15} /> : s.key === "instagram" ? <InstagramLogo size={15} /> : s.key === "single" ? <MetaLogo size={15} /> :
                      <i style={{ width: 12, height: 4, borderRadius: 2, background: s.color, display: "inline-block" }} />}
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ border: "1px solid #efe9f7", borderRadius: 16, padding: "14px 10px 6px" }}>
              <LineChart months={data.months} series={series} metric={metric} currency={data.currency} />
            </div>
            <div style={{ overflowX: "auto", marginTop: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 520 }}>
                <thead>
                  <tr style={{ color: "#9a93a8", textAlign: "right" }}>
                    <th style={{ textAlign: "left", fontWeight: 600, padding: "6px 4px" }}>Serie</th>
                    {data.months.map((p) => <th key={p.month} style={{ fontWeight: 600, padding: "6px 4px", textTransform: "capitalize" }}>{monthShort(p.month)}{p.partial ? "*" : ""}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {series.map((s) => (
                    <tr key={s.key} style={{ borderTop: "1px solid #f1edf7" }}>
                      <td style={{ padding: "8px 4px", fontWeight: 600 }}>{s.label}</td>
                      {s.values.map((v, i) => <td key={i} style={{ padding: "8px 4px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtTrend(v, metric, data.currency)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11.5, color: "#9a93a8", marginTop: 10 }}>
              * Mes en curso: solo días completos. “—” = Meta no entregó el dato para ese mes (no se rellena con cero).
            </p>
          </>
        )}
        {/* Las publicaciones que explican el número (Pedro 21-oct-2026). */}
        <MejoresDelMes slug={slug} month={month} orden={metric === "views" ? "vistas" : "interaccion"} />
      </div>
    </dialog>
  );
}
