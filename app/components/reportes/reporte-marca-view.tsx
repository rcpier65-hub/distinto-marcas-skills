'use client'

/* Dashboard mensual TYPHOUSE / LITTLE JOE — reemplaza el Excel.
   Embudo Meta Ads (WhatsApp) + Shopify, KPIs con variación vs mes anterior,
   vista omnicanal, tendencia mensual clickeable y tabla comparativa.
   Data: lib/reportes/typhouse.ts (fuente de verdad, ex-Excel). */

import { useState } from 'react'
import { labelMes, COSTO_GESTION, type MesReporte } from '@/lib/reportes/typhouse'

const AZUL = '#1E5EDA'
const CELESTE = '#3BA5E8'
const NARANJA = '#F97316'

const soles = (n: number, dec = 0) =>
  'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const num = (n: number) => n.toLocaleString('es-PE')
const pct = (n: number, dec = 1) => (n * 100).toFixed(dec) + '%'

/* Chip de variación vs mes anterior. invertir=true → bajar es BUENO (costos). */
function Delta({ actual, previo, invertir = false, formato = 'pct' }: {
  actual: number; previo: number | null; invertir?: boolean; formato?: 'pct' | 'pp'
}) {
  if (previo == null || previo === 0) return null
  const d = formato === 'pp' ? (actual - previo) * 100 : ((actual - previo) / Math.abs(previo)) * 100
  if (!isFinite(d)) return null
  const sube = d > 0.05, baja = d < -0.05
  const bueno = invertir ? baja : sube
  const color = (!sube && !baja) ? 'text-muted-foreground' : bueno ? 'text-emerald-600' : 'text-red-500'
  const flecha = sube ? '▲' : baja ? '▼' : '·'
  return (
    <span className={`text-[11px] font-semibold ${color}`} title="vs mes anterior">
      {flecha} {Math.abs(d).toFixed(1)}{formato === 'pp' ? ' pts' : '%'}
    </span>
  )
}

function Kpi({ label, value, sub, delta, accent }: {
  label: string; value: string; sub?: string; delta?: React.ReactNode; accent?: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 flex flex-col gap-1 min-w-0"
      style={accent ? { borderColor: accent, borderWidth: 1.5 } : undefined}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-xl font-extrabold tracking-tight" style={accent ? { color: accent } : undefined}>{value}</span>
      <div className="flex items-center gap-2 flex-wrap">
        {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
        {delta}
      </div>
    </div>
  )
}

export function ReporteMarcaView({ nombre, meses }: { nombre: string; meses: MesReporte[] }) {
  
  const [idx, setIdx] = useState(meses.length - 1)
  const m = meses[idx]
  const prev: MesReporte | null = idx > 0 ? meses[idx - 1] : null

  /* Tendencia clickeable: métrica elegible */
  const TENDENCIAS = [
    { key: 'leads', label: 'Leads', fmt: num },
    { key: 'ventasTotales', label: 'Ventas totales', fmt: num },
    { key: 'ingresoDirecto', label: 'Ingreso directo', fmt: (n: number) => soles(n) },
    { key: 'ventasOmnicanal', label: 'Omnicanal', fmt: (n: number) => soles(n) },
    { key: 'gastoAdsSoles', label: 'Gasto Ads (S/)', fmt: (n: number) => soles(n) },
    { key: 'roasDirecto', label: 'ROAS', fmt: (n: number) => n.toFixed(2) + 'x' },
    { key: 'ticketPromedio', label: 'Ticket promedio', fmt: (n: number) => soles(n, 2) },
  ] as const
  const [tKey, setTKey] = useState<(typeof TENDENCIAS)[number]['key']>('ventasTotales')
  const tSel = TENDENCIAS.find((t) => t.key === tKey)!
  const tMax = Math.max(...meses.map((x) => Number(x[tKey])))

  return (
    <div className="space-y-6">
      {/* ── Selector de mes ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
          className="h-8 w-8 rounded-lg border bg-background disabled:opacity-30">←</button>
        {meses.map((x, i) => (
          <button key={x.mes} onClick={() => setIdx(i)}
            className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${i === idx ? 'text-white' : 'bg-background hover:bg-muted'}`}
            style={i === idx ? { background: AZUL, borderColor: AZUL } : undefined}>
            {labelMes(x.mes).slice(0, 3)}
          </button>
        ))}
        <button onClick={() => setIdx((i) => Math.min(meses.length - 1, i + 1))} disabled={idx === meses.length - 1}
          className="h-8 w-8 rounded-lg border bg-background disabled:opacity-30">→</button>
        <span className="ml-2 text-sm font-bold" style={{ color: AZUL }}>{labelMes(m.mes)}</span>
        {prev && <span className="text-[11px] text-muted-foreground">· variaciones vs {labelMes(prev.mes)}</span>}
      </div>

      {/* ── Embudo ── */}
      <div className="rounded-2xl border bg-card p-6">
        <div className="text-center mb-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: AZUL }}>{nombre}</div>
          <h2 className="text-2xl font-extrabold tracking-tight">{labelMes(m.mes)}</h2>
          <div className="text-xs text-muted-foreground mt-1">Meta Ads (WhatsApp) + Shopify — Embudo de ventas</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[110px_1fr_130px] items-center gap-4">
          {/* Números laterales */}
          <div className="hidden md:flex flex-col justify-between h-[240px] py-4 text-right">
            <div className="text-2xl font-extrabold">{num(m.leads)} <span className="text-muted-foreground">→</span></div>
            <div className="text-2xl font-extrabold">{num(m.ventasShopify)} <span className="text-muted-foreground">→</span></div>
            <div className="text-2xl font-extrabold">{num(m.ventasWhatsApp)} <span className="text-muted-foreground">→</span></div>
          </div>
          {/* Trapecios */}
          <div className="flex flex-col items-center gap-1.5">
            {[
              { v: m.leads, t: 'Leads entrantes (WhatsApp)', c: AZUL, w1: 92, w2: 72, d: prev ? <Delta actual={m.leads} previo={prev.leads} /> : null },
              { v: m.ventasShopify, t: 'Ventas Shopify', c: CELESTE, w1: 72, w2: 56, d: prev ? <Delta actual={m.ventasShopify} previo={prev.ventasShopify} /> : null },
              { v: m.ventasWhatsApp, t: 'Ventas WhatsApp', c: NARANJA, w1: 56, w2: 40, d: prev ? <Delta actual={m.ventasWhatsApp} previo={prev.ventasWhatsApp} /> : null },
            ].map((s) => (
              <div key={s.t} className="text-white text-center flex flex-col items-center justify-center"
                style={{
                  background: s.c, height: 82, width: '100%', maxWidth: 560,
                  clipPath: `polygon(${(100 - s.w1) / 2}% 0, ${100 - (100 - s.w1) / 2}% 0, ${100 - (100 - s.w2) / 2}% 100%, ${(100 - s.w2) / 2}% 100%)`,
                }}>
                <div className="text-2xl font-extrabold leading-none">{num(s.v)}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-90">{s.t}</div>
                <div className="mt-0.5 [&_span]:!text-white/90">{s.d}</div>
              </div>
            ))}
          </div>
          {/* Total */}
          <div className="text-center md:text-left">
            <div className="text-4xl font-extrabold tracking-tight">{num(m.ventasTotales)}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ventas totales</div>
            {prev && <Delta actual={m.ventasTotales} previo={prev.ventasTotales} />}
          </div>
        </div>
      </div>

      {/* ── KPIs principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Inversión Meta Ads" value={soles(m.gastoAdsSoles, 2)}
          sub={`US$ ${m.gastoAdsUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} · TC ${m.tipoCambio} · IGV ${pct(m.igv, 0)}`}
          delta={prev ? <Delta actual={m.gastoAdsSoles} previo={prev.gastoAdsSoles} invertir /> : undefined} accent={AZUL} />
        <Kpi label="Costo por mensaje" value={soles(m.costoMensaje, 2)}
          delta={prev ? <Delta actual={m.costoMensaje} previo={prev.costoMensaje} invertir /> : undefined} />
        <Kpi label="Ticket promedio" value={soles(m.ticketPromedio, 2)}
          delta={prev ? <Delta actual={m.ticketPromedio} previo={prev.ticketPromedio} /> : undefined} accent={CELESTE} />
        <Kpi label="Costo por venta" value={soles(m.costoVenta, 2)}
          delta={prev ? <Delta actual={m.costoVenta} previo={prev.costoVenta} invertir /> : undefined} />
        <Kpi label="Conversión" value={pct(m.conversion)} sub="ventas totales / leads"
          delta={prev ? <Delta actual={m.conversion} previo={prev.conversion} formato="pp" /> : undefined} accent="#059669" />
      </div>

      {/* ── KPIs de rentabilidad ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="ROAS directo" value={m.roasDirecto.toFixed(2) + 'x'} sub="ingreso directo / gasto ads"
          delta={prev ? <Delta actual={m.roasDirecto} previo={prev.roasDirecto} /> : undefined} accent={NARANJA} />
        <Kpi label="Ingreso directo" value={soles(m.ingresoDirecto)}
          delta={prev ? <Delta actual={m.ingresoDirecto} previo={prev.ingresoDirecto} /> : undefined} />
        <Kpi label="Gasto mkt total" value={soles(m.gastoMktTotal, 0)} sub={`ads + gestión ${soles(COSTO_GESTION)} (+IGV)`}
          delta={prev ? <Delta actual={m.gastoMktTotal} previo={prev.gastoMktTotal} invertir /> : undefined} />
        <Kpi label="CAC directo" value={soles(m.cacDirecto, 2)} sub="por venta confirmada"
          delta={prev ? <Delta actual={m.cacDirecto} previo={prev.cacDirecto} invertir /> : undefined} />
        <Kpi label="CAC omnicanal (est.)" value={soles(m.cacOmnicanal, 2)} sub={`${Math.round(m.clientesOmni)} clientes est.`}
          delta={prev ? <Delta actual={m.cacOmnicanal} previo={prev.cacOmnicanal} invertir /> : undefined} />
      </div>

      {/* ── Omnicanal ── */}
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="text-lg font-extrabold tracking-tight text-center">Vista omnicanal — {labelMes(m.mes)}</h3>
        <p className="text-xs text-muted-foreground text-center mt-1 mb-4">
          Incluye venta retail física (Falabella / Tottus / Sodimac) · atribución a marketing NO medida
        </p>
        <div className="w-full h-11 rounded-xl overflow-hidden flex text-white text-xs font-bold">
          <div className="flex items-center justify-center" style={{ width: `${(1 - m.pctRetail) * 100}%`, background: `linear-gradient(90deg, ${AZUL}, ${CELESTE})`, minWidth: 90 }}>
            {pct(1 - m.pctRetail)} directo
          </div>
          <div className="flex items-center justify-center bg-neutral-500/80"
            style={{ width: `${m.pctRetail * 100}%`, minWidth: 90, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.14) 0 8px, transparent 8px 16px)' }}>
            {pct(m.pctRetail)} retail
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <Kpi label="Total omnicanal" value={soles(m.ventasOmnicanal)}
            delta={prev ? <Delta actual={m.ventasOmnicanal} previo={prev.ventasOmnicanal} /> : undefined} />
          <Kpi label="Directo confirmado" value={soles(m.ingresoDirecto)} accent={AZUL}
            delta={prev ? <Delta actual={m.ingresoDirecto} previo={prev.ingresoDirecto} /> : undefined} />
          <Kpi label="Retail indirecto" value={soles(m.ventasRetail)}
            delta={prev ? <Delta actual={m.ventasRetail} previo={prev.ventasRetail} /> : undefined} />
        </div>
      </div>

      {/* ── Tendencia mensual ── */}
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="text-lg font-extrabold tracking-tight">Tendencia mensual</h3>
          <div className="flex gap-1.5 flex-wrap">
            {TENDENCIAS.map((t) => (
              <button key={t.key} onClick={() => setTKey(t.key)}
                className={`h-7 px-2.5 rounded-full text-[11px] font-semibold border ${t.key === tKey ? 'text-white' : 'bg-background hover:bg-muted'}`}
                style={t.key === tKey ? { background: AZUL, borderColor: AZUL } : undefined}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2 h-44">
          {meses.map((x, i) => {
            const v = Number(x[tKey])
            return (
              <button key={x.mes} onClick={() => setIdx(i)} title={`${labelMes(x.mes)} · ${tSel.fmt(v)}`}
                className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[10px] font-bold tabular-nums" style={i === idx ? { color: AZUL } : { color: 'var(--mk-text-tertiary, #999)' }}>
                  {tKey === 'roasDirecto' ? v.toFixed(1) : v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)}
                </span>
                <div className="w-full rounded-t-lg transition-all group-hover:opacity-80"
                  style={{ height: `${Math.max(6, (v / tMax) * 130)}px`, background: i === idx ? AZUL : `${AZUL}33` }} />
                <span className={`text-[10px] ${i === idx ? 'font-bold' : 'text-muted-foreground'}`}>{labelMes(x.mes).slice(0, 3)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tabla comparativa ── */}
      <div className="rounded-2xl border bg-card p-6 overflow-x-auto">
        <h3 className="text-lg font-extrabold tracking-tight mb-4">Comparativa por mes</h3>
        <table className="w-full text-xs min-w-[880px]">
          <thead>
            <tr className="text-left text-muted-foreground uppercase tracking-wider text-[10px]">
              <th className="py-2 pr-3">Mes</th><th className="py-2 pr-3 text-right">Leads</th>
              <th className="py-2 pr-3 text-right">V. Shopify</th><th className="py-2 pr-3 text-right">V. WhatsApp</th>
              <th className="py-2 pr-3 text-right">V. Totales</th><th className="py-2 pr-3 text-right">Conv.</th>
              <th className="py-2 pr-3 text-right">Gasto Ads</th><th className="py-2 pr-3 text-right">C/venta</th>
              <th className="py-2 pr-3 text-right">Ticket</th><th className="py-2 pr-3 text-right">ROAS</th>
              <th className="py-2 pr-3 text-right">Ing. directo</th><th className="py-2 pr-0 text-right">Omnicanal</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((x, i) => (
              <tr key={x.mes} onClick={() => setIdx(i)}
                className={`border-t cursor-pointer hover:bg-muted/50 ${i === idx ? 'font-bold' : ''}`}
                style={i === idx ? { background: `${AZUL}0d` } : undefined}>
                <td className="py-2 pr-3">{labelMes(x.mes)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{num(x.leads)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{num(x.ventasShopify)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{num(x.ventasWhatsApp)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{num(x.ventasTotales)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{pct(x.conversion)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{soles(x.gastoAdsSoles)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{soles(x.costoVenta, 2)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{soles(x.ticketPromedio, 2)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{x.roasDirecto.toFixed(2)}x</td>
                <td className="py-2 pr-3 text-right tabular-nums">{soles(x.ingresoDirecto)}</td>
                <td className="py-2 pr-0 text-right tabular-nums">{soles(x.ventasOmnicanal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Metodología ── */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-xs leading-relaxed text-amber-900">
        <b>Ventas Totales</b> confirmadas directamente por el equipo (registro propio del embudo WhatsApp).{' '}
        <b>Ventas WhatsApp</b> = Ventas Totales − Ventas Shopify. El resto de cifras proviene de Shopify Admin API y Meta Ads API (Graph API).
        Tipo de cambio SUNAT del mes. La venta retail física (Falabella/Tottus/Sodimac) vive en sus propios sistemas de punto de venta:
        no hay dato que conecte «vio el anuncio» con «compró en tienda» — por eso NO se asigna un % de atribución inventado.
        Clientes retail y CAC omnicanal son <b>estimados</b> (retail ÷ ticket promedio).
      </div>
    </div>
  )
}
