'use client'

/* Reporte mensual — formato DIRECTO (Pedro 02-oct-2026): ventas directas
   (Shopify + WhatsApp) e inversión en Facebook Ads. Diseño de reporte
   profesional: portada con lo clave, meta, canales, eficiencia, clientes,
   productos, anuncios, tendencia y tabla. Sirve al equipo (/reportes) y al
   cliente (portal). El cliente solo ve meses publicados y, si falta, pone
   sus ventas totales aquí mismo. */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  TrendingUp, TrendingDown, Megaphone, ShoppingBag, MessageCircle, Target, Users, Package,
  Trophy, Download, Loader2, CalendarDays, Wallet, Gauge, Info,
} from 'lucide-react'
import { labelMes, type MesReporte } from '@/lib/reportes/typhouse'
import { computeDirecto, type MesDirecto } from '@/lib/reportes/directo'

const AZUL = '#2563eb'
const VERDE = '#16a34a'
const MORADO = '#7170ff'

const soles = (n: number | null | undefined, dec = 0) =>
  n == null || !isFinite(n) ? '—' : `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
const usd = (n: number | null | undefined) => (n == null || !isFinite(n) ? '—' : `US$ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const num = (n: number | null | undefined) => (n == null || !isFinite(n) ? '—' : Math.round(n).toLocaleString('es-PE'))
const pct = (n: number | null | undefined, dec = 0) => (n == null || !isFinite(n) ? '—' : `${(n * 100).toFixed(dec)}%`)
const veces = (n: number | null | undefined) => (n == null || !isFinite(n) ? '—' : `${n.toFixed(2)}x`)

function Variacion({ actual, previo, invertir = false }: { actual: number | null; previo: number | null; invertir?: boolean }) {
  if (actual == null || previo == null || !isFinite(actual) || !isFinite(previo) || previo === 0) return null
  const d = actual / previo - 1
  const bueno = invertir ? d < 0 : d > 0
  const Icono = d >= 0 ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: Math.abs(d) < 0.005 ? '#64748b' : bueno ? VERDE : '#dc2626' }}>
      <Icono className="w-3.5 h-3.5" />{d >= 0 ? '+' : ''}{(d * 100).toFixed(0)}% vs mes anterior
    </span>
  )
}

function Tarjeta({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[20px] border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.05)] ${className}`}>{children}</section>
}
function Titulo({ icon, children, color = MORADO, info }: { icon: React.ReactNode; children: React.ReactNode; color?: string; info?: string[] }) {
  return (
    <h3 className="flex items-center gap-2.5 text-[15px] font-bold text-slate-900 mb-4">
      <span className="w-8 h-8 rounded-[9px] inline-flex items-center justify-center" style={{ background: `${color}14`, color }}>{icon}</span>
      {children}
      {info && <InfoTip lineas={info} />}
    </h3>
  )
}

/* Ícono (i): al pasar el mouse (o tocar en celular) explica de dónde sale el
   número, con los valores reales del mes. Pedro 02-oct-2026. */
function InfoTip({ lineas, claro = false, derecha = false }: { lineas: string[]; claro?: boolean; derecha?: boolean }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <span className="relative inline-flex no-imprimir" onMouseEnter={() => setAbierto(true)} onMouseLeave={() => setAbierto(false)}>
      <button type="button" aria-label="Cómo se calcula" onClick={(e) => { e.stopPropagation(); setAbierto((v) => !v) }}
        onBlur={() => setAbierto(false)}
        className={`w-[18px] h-[18px] rounded-full inline-flex items-center justify-center transition-colors ${claro ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-[#7170ff]'}`}>
        <Info className="w-[15px] h-[15px]" />
      </button>
      {abierto && (
        <span role="tooltip"
          className={`rep-tip absolute z-50 ${derecha ? '-right-2' : 'left-1/2 -translate-x-1/2'} bottom-[calc(100%+8px)] w-[290px] max-w-[80vw] rounded-[12px] bg-slate-900 text-white text-left text-[12px] font-normal normal-case tracking-normal leading-[1.5] px-3.5 py-3 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.45)]`}>
          <span className="block text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a5a4ff] mb-1.5">Cómo se calcula</span>
          {lineas.map((l, i) => <span key={i} className="block mt-1 first-of-type:mt-0">{l}</span>)}
          <span className={`absolute ${derecha ? 'right-[11px]' : 'left-1/2 -translate-x-1/2'} top-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-900`} />
        </span>
      )}
    </span>
  )
}

function Dato({ label, valor, sub, pendiente, info }: { label: string; valor: string; sub?: React.ReactNode; pendiente?: boolean; info?: string[] }) {
  return (
    <div className="rounded-[14px] bg-slate-50/80 border border-slate-100 p-3.5">
      <div className="text-[12px] font-semibold text-slate-500 flex items-center gap-1">{label}{info && <InfoTip lineas={info} />}</div>
      <div className={`text-[20px] font-bold mt-1 leading-none ${pendiente ? 'text-slate-300' : 'text-slate-900'}`}>{pendiente ? 'Pendiente' : valor}</div>
      {sub && <div className="text-[11.5px] text-slate-500 mt-1.5">{sub}</div>}
    </div>
  )
}

export function ReporteMarcaView({ nombre, meses, modo = 'equipo', onGuardarVentas }: {
  nombre: string
  meses: MesReporte[]
  modo?: 'equipo' | 'cliente'
  /* Cliente: guardar sus ventas totales del mes. */
  onGuardarVentas?: (mes: string, pedidos: number, soles: number) => Promise<{ ok: true } | { ok: false; error: string }>
}) {
  const todos = useMemo(() => meses.map(computeDirecto), [meses])
  const visibles = modo === 'cliente' ? todos.filter((m) => m.publicado) : todos
  /* Mes que espera los datos del cliente (aunque aún no esté publicado). */
  const porCompletar = modo === 'cliente' ? [...todos].reverse().find((m) => m.pendienteCliente) ?? null : null
  const [idx, setIdx] = useState(Math.max(0, visibles.length - 1))
  const m = visibles[idx]
  const prev = idx > 0 ? visibles[idx - 1] : null

  if (!m) {
    return (
      <div className="space-y-4">
        {porCompletar && onGuardarVentas && <FormVentas mes={porCompletar} onGuardar={onGuardarVentas} />}
        <Tarjeta className="text-center py-12">
          <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <div className="font-bold text-slate-900">Tu primer reporte se publica el 2 de cada mes</div>
          <div className="text-[13px] text-slate-500 mt-1">Aquí verás tus ventas, tu inversión en anuncios y cómo rindió cada canal.</div>
        </Tarjeta>
      </div>
    )
  }

  const ventas = m.solesTotales ?? m.solesWeb
  const pedidos = m.pedidosTotales ?? m.pedidosWeb
  const ex = explicar(m)

  return (
    <div className="space-y-5 reporte-imprimible">
      {/* Encabezado */}
      <header className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-400">Reporte mensual · {nombre}</div>
          <h2 className="text-[30px] font-bold tracking-tight text-slate-900 leading-tight">{labelMes(m.mes)}</h2>
        </div>
        <div className="flex items-center gap-2 no-imprimir">
          <select value={idx} onChange={(e) => setIdx(Number(e.target.value))}
            className="h-10 px-3 rounded-[11px] border border-slate-200 bg-white text-[13.5px] font-semibold text-slate-700">
            {visibles.map((x, i) => <option key={x.mes} value={i}>{labelMes(x.mes)}{modo === 'equipo' && !x.publicado ? ' · borrador' : ''}</option>)}
          </select>
          <button type="button" onClick={() => window.print()}
            className="h-10 px-4 inline-flex items-center gap-2 rounded-[11px] text-[13.5px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
            <Download className="w-4 h-4" /> Descargar PDF
          </button>
        </div>
      </header>

      {modo === 'equipo' && !m.publicado && (
        <p className="flex items-center gap-2 text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 no-imprimir">
          <Info className="w-4 h-4 shrink-0" /> Borrador: el cliente aún no lo ve. Se publica solo el día 2 (o publícalo abajo).
        </p>
      )}
      {porCompletar && onGuardarVentas && <FormVentas mes={porCompletar} onGuardar={onGuardarVentas} />}
      {m.pendienteCliente && modo === 'equipo' && (
        <p className="flex items-center gap-2 text-[13px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 no-imprimir">
          <Info className="w-4 h-4 shrink-0" /> Falta que el cliente ponga sus ventas totales. Mientras tanto se muestran solo las ventas de la web.
        </p>
      )}

      {/* Embudo + portada (se re-anima al cambiar de mes) */}
      <div key={m.mes} className="space-y-5 rep-in">

      <Embudo m={m} prev={prev} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Portada icon={<Wallet className="w-4 h-4" />} color={VERDE} label={m.pendienteCliente ? 'Ventas web (Shopify)' : 'Ventas directas'} info={ex.ventas}
          valor={soles(ventas)} extra={<Variacion actual={ventas} previo={prev ? (m.pendienteCliente ? prev.solesWeb : prev.solesTotales ?? prev.solesWeb) : null} />} />
        <Portada icon={<ShoppingBag className="w-4 h-4" />} color={AZUL} label={m.pendienteCliente ? 'Pedidos web' : 'Pedidos totales'} info={ex.pedidos}
          valor={num(pedidos)} extra={<Variacion actual={pedidos} previo={prev ? (m.pendienteCliente ? prev.pedidosWeb : prev.pedidosTotales ?? prev.pedidosWeb) : null} />} />
        <Portada icon={<Megaphone className="w-4 h-4" />} color={MORADO} label="Inversión Facebook Ads" info={ex.inversion}
          valor={m.fuenteMeta === 'pendiente' ? 'Pendiente' : soles(m.gastoAdsSoles)} sub={m.fuenteMeta === 'pendiente' ? undefined : `${usd(m.gastoAdsUsd)} · incluye IGV`}
          extra={m.fuenteMeta === 'pendiente' ? undefined : <Variacion actual={m.gastoAdsSoles} previo={prev?.gastoAdsSoles ?? null} invertir />} />
        <Portada icon={<Gauge className="w-4 h-4" />} color="#ea580c" label="Retorno (ROAS)" info={ex.roas}
          valor={veces(m.roas ?? m.roasWeb)} sub={m.roas != null ? 'ventas directas ÷ inversión' : 'solo web ÷ inversión'}
          extra={<Variacion actual={m.roas ?? m.roasWeb} previo={prev ? (m.roas != null ? prev.roas ?? prev.roasWeb : prev.roasWeb) : null} />} />
      </div>
      </div>

      {/* Meta del mes */}
      {m.objetivoSoles != null && (
        <Tarjeta>
          <Titulo icon={<Target className="w-4 h-4" />} color={VERDE} info={ex.meta}>Meta del mes</Titulo>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="text-[15px] text-slate-600">Vendimos <b className="text-slate-900">{soles(ventas)}</b> de una meta de <b className="text-slate-900">{soles(m.objetivoSoles)}</b></div>
            <div className="text-[28px] font-bold leading-none" style={{ color: (m.avanceObjetivo ?? 0) >= 1 ? VERDE : '#0f172a' }}>{pct(m.avanceObjetivo)}</div>
          </div>
          <div className="mt-3 h-3 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (m.avanceObjetivo ?? 0) * 100)}%`, background: (m.avanceObjetivo ?? 0) >= 1 ? VERDE : 'linear-gradient(90deg,#7170ff,#ba41f7)' }} />
          </div>
        </Tarjeta>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Canales */}
        <Tarjeta>
          <Titulo icon={<ShoppingBag className="w-4 h-4" />} color={AZUL} info={ex.mezcla}>Ventas por canal</Titulo>
          <Mezcla m={m} />
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <Dato label="Web (Shopify)" info={ex.web} valor={soles(m.solesWeb)} sub={`${num(m.pedidosWeb)} pedidos`} />
            <Dato label="WhatsApp" info={ex.whatsapp} valor={soles(m.solesWhatsApp)} sub={m.pedidosWhatsApp != null ? `${num(m.pedidosWhatsApp)} pedidos` : undefined} pendiente={m.pendienteCliente} />
          </div>
        </Tarjeta>

        {/* Eficiencia */}
        <Tarjeta>
          <Titulo icon={<Gauge className="w-4 h-4" />} color="#ea580c">Eficiencia de la inversión</Titulo>
          <div className="grid grid-cols-2 gap-2.5">
            <Dato label="Costo por venta" info={ex.costoVenta} valor={soles(m.costoVenta, 2)} sub="inversión ÷ pedidos" />
            <Dato label="Ticket promedio" info={ex.ticket} valor={soles(m.ticket, 2)} sub="por pedido" />
            <Dato label="Conversaciones WhatsApp" info={ex.conversaciones} valor={num(m.leads)} sub={`costo por mensaje ${soles(m.costoMensaje, 2)}`} pendiente={m.fuenteMeta === 'pendiente'} />
            <Dato label="Conversión WhatsApp" info={ex.conversion} valor={pct(m.conversionWhatsApp, 1)} sub="ventas ÷ conversaciones" pendiente={m.pendienteCliente} />
            <Dato label="Inversión total en marketing" info={ex.mkt} valor={soles(m.gastoMkt)} sub={`anuncios + gestión ${soles(m.gestionSoles)}`} />
            <Dato label="Costo por cliente (CAC)" info={ex.cac} valor={soles(m.cac, 2)} sub="marketing total ÷ pedidos" />
          </div>
        </Tarjeta>

        {/* Clientes nuevos vs recurrentes */}
        {m.nuevos != null && m.recurrentes != null && (
          <Tarjeta>
            <Titulo icon={<Users className="w-4 h-4" />} color={MORADO} info={ex.clientes}>Clientes de la web</Titulo>
            <BarraDoble a={{ label: 'Nuevos', valor: m.nuevos, color: MORADO }} b={{ label: 'Repiten compra', valor: m.recurrentes, color: '#c4b5fd' }} />
            <p className="text-[12.5px] text-slate-500 mt-3">
              {m.nuevos + m.recurrentes > 0 ? `${pct(m.nuevos / (m.nuevos + m.recurrentes))} de los pedidos web fueron de clientes que compraron por primera vez.` : 'Sin pedidos web este mes.'}
            </p>
          </Tarjeta>
        )}

        {/* Productos */}
        {m.topProductos.length > 0 && (
          <Tarjeta>
            <Titulo icon={<Package className="w-4 h-4" />} color={VERDE} info={ex.productos}>Productos más vendidos (web)</Titulo>
            <div className="grid gap-2.5">
              {m.topProductos.map((p, i) => {
                const max = m.topProductos[0].unidades || 1
                return (
                  <div key={p.nombre}>
                    <div className="flex justify-between gap-3 text-[13px]">
                      <span className="text-slate-700 truncate"><b className="text-slate-400 mr-1.5">{i + 1}</b>{p.nombre}</span>
                      <span className="font-semibold text-slate-900 shrink-0">{num(p.unidades)} u · {soles(p.soles)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(p.unidades / max) * 100}%`, background: VERDE }} /></div>
                  </div>
                )
              })}
            </div>
          </Tarjeta>
        )}
      </div>

      {/* Anuncios ganadores */}
      {m.topAnuncios.length > 0 && (
        <Tarjeta>
          <Titulo icon={<Trophy className="w-4 h-4" />} color="#ca8a04" info={ex.anuncios}>Anuncios ganadores</Titulo>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {m.topAnuncios.map((a, i) => (
              <div key={a.nombre + i} className="rounded-[14px] border border-slate-100 bg-slate-50/80 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#ca8a04' }}>#{i + 1}</div>
                <div className="text-[14px] font-bold text-slate-900 mt-1 line-clamp-2">{a.nombre}</div>
                <div className="flex items-center gap-1.5 text-[13px] text-slate-600 mt-2"><MessageCircle className="w-4 h-4" /> {num(a.conversaciones)} conversaciones</div>
                <div className="text-[12px] text-slate-500 mt-0.5">US$ {a.costoUsd.toFixed(2)} por conversación</div>
              </div>
            ))}
          </div>
        </Tarjeta>
      )}

      <Tendencia meses={visibles} sel={idx} onSel={setIdx} />
      <Tabla meses={visibles} />

      <p className="text-[11.5px] text-slate-400 text-center">
        Fuentes: Shopify (pedidos pagados) · Facebook Ads · tipo de cambio SUNAT S/ {m.tipoCambio.toFixed(3)} · IGV 18%
      </p>
      <style>{'@media print{.no-imprimir,nav,aside,header.mk-mobile-topbar,.mk-sidebar-wrap{display:none!important}.reporte-imprimible{padding:0!important}body{background:#fff!important}section{break-inside:avoid}}'}</style>
      <style>{ANIM}</style>
    </div>
  )
}

const ANIM = `
@keyframes repIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes repGrow{from{opacity:0;transform:scaleX(.55)}to{opacity:1;transform:scaleX(1)}}
@keyframes repFade{from{opacity:0}to{opacity:1}}
.rep-tip{animation:repFade .15s ease-out both}
.rep-in{animation:repIn .45s cubic-bezier(.2,.7,.2,1) both}
.rep-grow{animation:repGrow .6s cubic-bezier(.2,.8,.2,1) both;transform-origin:center}
@media (prefers-reduced-motion:reduce){.rep-in,.rep-grow{animation:none}}`

/* Textos de "Cómo se calcula" con los números reales del mes. */
function explicar(m: MesDirecto) {
  const directo = m.raw.extra?.formato === 'directo'
  const tc = String(m.tipoCambio)
  const ventas = m.solesTotales ?? m.solesWeb
  const pedidos = m.pedidosTotales ?? m.pedidosWeb
  const s2 = (n: number | null | undefined) => soles(n, 2)
  const origenTotal = directo
    ? `Ventas totales del mes que reportó el cliente (web + WhatsApp): ${s2(m.solesTotales)} en ${num(m.pedidosTotales)} pedidos.`
    : `Ventas directas del mes registradas en el reporte de ese mes: ${s2(m.solesTotales)} en ${num(m.pedidosTotales)} pedidos.`
  const gWppUsd = m.raw.extra?.gastoWhatsAppUsd
  const gWppSoles = gWppUsd != null ? gWppUsd * m.tipoCambio * 1.18 : m.gastoAdsSoles
  return {
    ventas: m.solesTotales == null
      ? ['Solo ventas web mientras el cliente no reporta su total.', `Shopify: suma de los pedidos PAGADOS del mes (sin cancelados ni pruebas) = ${s2(m.solesWeb)}.`]
      : [origenTotal, `De eso, web (Shopify, pedidos pagados): ${s2(m.solesWeb)}.`, `WhatsApp = total − web = ${s2(m.solesTotales)} − ${s2(m.solesWeb)} = ${s2(m.solesWhatsApp)}.`],
    pedidos: m.pedidosTotales == null
      ? [`Pedidos pagados en Shopify en el mes: ${num(m.pedidosWeb)} (sin cancelados ni pruebas).`, 'El total aparece cuando el cliente reporta sus ventas.']
      : [`Pedidos totales: ${num(m.pedidosTotales)} (${directo ? 'reportados por el cliente' : 'registrados ese mes'}).`, `Web (Shopify, pagados): ${num(m.pedidosWeb)}.`, `WhatsApp = ${num(m.pedidosTotales)} − ${num(m.pedidosWeb)} = ${num(m.pedidosWhatsApp)}.`],
    inversion: [
      `Gasto en Facebook Ads del mes${directo ? ' (todas las campañas menos Mil Ideas)' : ''}: US$ ${m.gastoAdsUsd.toFixed(2)}.`,
      `× tipo de cambio SUNAT (venta) ${tc} = ${s2(m.gastoAdsUsd * m.tipoCambio)}.`,
      `+ IGV 18% = ${s2(m.gastoAdsSoles)}.`,
    ],
    roas: [
      `ROAS = ventas ÷ inversión en anuncios.`,
      `${s2(ventas)} ÷ ${s2(m.gastoAdsSoles)} = ${veces(m.roas ?? m.roasWeb)}.`,
      `Por cada S/ 1 invertido en anuncios se vendieron S/ ${(m.roas ?? m.roasWeb ?? 0).toFixed(2)}.`,
      ...(m.roas == null ? ['Hoy usa solo las ventas web; se actualiza cuando el cliente reporta su total.'] : []),
    ],
    web: [`Suma de los pedidos PAGADOS en Shopify (typhouse.pe) del mes, sin cancelados ni pruebas.`, `${num(m.pedidosWeb)} pedidos = ${s2(m.solesWeb)}.`],
    whatsapp: m.solesWhatsApp == null ? ['Se calcula cuando el cliente reporta sus ventas totales: total − web.']
      : [`WhatsApp = ventas totales − ventas web.`, `${s2(m.solesTotales)} − ${s2(m.solesWeb)} = ${s2(m.solesWhatsApp)}.`, `Pedidos: ${num(m.pedidosTotales)} − ${num(m.pedidosWeb)} = ${num(m.pedidosWhatsApp)}.`],
    mezcla: m.pctWeb == null ? ['Aparece cuando el cliente reporta sus ventas totales.']
      : [`Web = ${s2(m.solesWeb)} ÷ ${s2(m.solesTotales)} = ${pct(m.pctWeb)}.`, `WhatsApp = el resto: ${pct(1 - m.pctWeb)}.`],
    costoVenta: [`Inversión en anuncios ÷ pedidos.`, `${s2(m.gastoAdsSoles)} ÷ ${num(pedidos)} = ${s2(m.costoVenta)} por pedido.`],
    ticket: [`Ventas ÷ pedidos.`, `${s2(ventas)} ÷ ${num(pedidos)} = ${s2(m.ticket)} por pedido.`],
    conversaciones: [
      `Conversaciones de WhatsApp iniciadas desde los anuncios de Facebook en el mes: ${num(m.leads)}.`,
      `Costo por mensaje = inversión en campañas de WhatsApp ÷ conversaciones.`,
      `${s2(gWppSoles)}${gWppUsd != null ? ` (US$ ${gWppUsd.toFixed(2)} × ${tc} + IGV)` : ''} ÷ ${num(m.leads)} = ${s2(m.costoMensaje)}.`,
    ],
    conversion: m.conversionWhatsApp == null ? ['Se calcula cuando el cliente reporta sus ventas totales.']
      : [`Pedidos por WhatsApp ÷ conversaciones.`, `${num(m.pedidosWhatsApp)} ÷ ${num(m.leads)} = ${pct(m.conversionWhatsApp, 1)}.`, `De cada 100 conversaciones, ${((m.conversionWhatsApp ?? 0) * 100).toFixed(1)} terminaron en pedido.`],
    mkt: [`Anuncios (con IGV): ${s2(m.gastoAdsSoles)}.`, `+ Gestión Distinto: S/ 1,800 + IGV = ${s2(m.gestionSoles)}.`, `= ${s2(m.gastoMkt)}.`],
    cac: [`Inversión total en marketing ÷ pedidos.`, `${s2(m.gastoMkt)} ÷ ${num(pedidos)} = ${s2(m.cac)} por pedido.`],
    clientes: [`Según Shopify, en los pedidos web pagados del mes:`, `Nuevos = su primera compra en la tienda (${num(m.nuevos)}).`, `Repiten = ya habían comprado antes (${num(m.recurrentes)}).`],
    productos: [`Unidades vendidas por producto en los pedidos web pagados del mes (Shopify).`, `Los soles son el total cobrado por ese producto.`],
    anuncios: [`Los 3 anuncios de Facebook con más conversaciones de WhatsApp iniciadas en el mes.`, `Costo por conversación = gasto del anuncio ÷ sus conversaciones (en US$, sin IGV).`],
    meta: m.objetivoSoles == null ? [] : [`Avance = ventas ÷ meta.`, `${s2(ventas)} ÷ ${s2(m.objetivoSoles)} = ${pct(m.avanceObjetivo)}.`],
    embudo: [
      `Conversaciones: chats de WhatsApp iniciados desde los anuncios (${num(m.leads)}).`,
      `Pedidos web: pedidos pagados en Shopify (${num(m.pedidosWeb)}).`,
      m.pedidosWhatsApp == null ? 'Pedidos WhatsApp: se calculan cuando el cliente reporta su total.' : `Pedidos WhatsApp: total ${num(m.pedidosTotales)} − web ${num(m.pedidosWeb)} = ${num(m.pedidosWhatsApp)}.`,
      `Las flechas comparan con el mes anterior.`,
    ],
  }
}

/* Embudo de ventas: conversaciones de WhatsApp → pedidos web → pedidos
   WhatsApp, con el total de pedidos y soles al costado. */
function Embudo({ m, prev }: { m: MesDirecto; prev: MesDirecto | null }) {
  const ex = explicar(m)
  const etapas = [
    { v: m.leads as number | null, t: 'Conversaciones WhatsApp', bg: 'linear-gradient(90deg,#6366f1,#7170ff)', w1: 94, w2: 76, p: prev?.leads ?? null, pend: m.fuenteMeta === 'pendiente' },
    { v: m.pedidosWeb as number | null, t: 'Pedidos web · Shopify', bg: 'linear-gradient(90deg,#2563eb,#3b82f6)', w1: 76, w2: 59, p: prev?.pedidosWeb ?? null, pend: false },
    { v: m.pedidosWhatsApp, t: 'Pedidos WhatsApp', bg: 'linear-gradient(90deg,#16a34a,#22c55e)', w1: 59, w2: 43, p: prev?.pedidosWhatsApp ?? null, pend: m.pendienteCliente },
  ]
  return (
    <section className="rounded-[22px] border border-slate-200/80 bg-white p-5 sm:p-7 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="text-center mb-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7170ff] inline-flex items-center gap-1.5">Embudo de ventas <InfoTip lineas={ex.embudo} /></div>
        <div className="text-[20px] font-bold text-slate-900 mt-0.5">{labelMes(m.mes)}</div>
        <div className="text-[13px] text-slate-500 mt-0.5">Facebook Ads (WhatsApp) + Shopify</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_170px] items-center gap-6">
        <div className="flex flex-col items-center gap-1.5">
          {etapas.map((e, i) => (
            <div key={e.t} className="rep-grow w-full max-w-[600px] h-[86px] text-white flex flex-col items-center justify-center text-center"
              style={{ background: e.bg, animationDelay: `${i * 110}ms`, clipPath: `polygon(${(100 - e.w1) / 2}% 0, ${100 - (100 - e.w1) / 2}% 0, ${100 - (100 - e.w2) / 2}% 100%, ${(100 - e.w2) / 2}% 100%)` }}>
              <div className="text-[26px] font-bold leading-none tracking-tight">{e.pend ? '—' : num(e.v)}</div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] mt-1.5 opacity-90">{e.t}</div>
              {e.pend
                ? <div className="text-[10.5px] mt-0.5 opacity-80">pendiente</div>
                : e.v != null && e.p != null && e.p > 0 && (
                  <div className="text-[10.5px] font-semibold mt-0.5 opacity-90">{e.v >= e.p ? '▲' : '▼'} {Math.abs((e.v / e.p - 1) * 100).toFixed(0)}% vs mes anterior</div>
                )}
            </div>
          ))}
        </div>
        <div className="text-center md:text-left md:border-l md:border-slate-100 md:pl-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 inline-flex items-center gap-1.5">Pedidos totales <InfoTip lineas={[...ex.pedidos, ...ex.ventas.slice(0, 1)]} /></div>
          <div className="text-[44px] font-bold tracking-tight text-slate-900 leading-none mt-1">{m.pedidosTotales == null ? '—' : num(m.pedidosTotales)}</div>
          <div className="text-[15px] font-semibold text-slate-600 mt-2">{m.solesTotales == null ? 'Falta el cliente' : soles(m.solesTotales)}</div>
          {m.conversionWhatsApp != null && <div className="text-[12px] text-slate-500 mt-3">{pct(m.conversionWhatsApp, 1)} de las conversaciones terminó en pedido</div>}
        </div>
      </div>
    </section>
  )
}

function Portada({ icon, color, label, valor, sub, extra, info }: { icon: React.ReactNode; color: string; label: string; valor: string; sub?: string; extra?: React.ReactNode; info?: string[] }) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-500">
        <span className="w-7 h-7 rounded-[8px] inline-flex items-center justify-center shrink-0" style={{ background: `${color}14`, color }}>{icon}</span>
        <span className="flex-1 min-w-0">{label}</span>
        {info && <InfoTip lineas={info} derecha />}
      </div>
      <div className="text-[28px] font-bold tracking-tight text-slate-900 mt-2.5 leading-none">{valor}</div>
      {sub && <div className="text-[12px] text-slate-500 mt-1.5">{sub}</div>}
      {extra && <div className="mt-1.5">{extra}</div>}
    </div>
  )
}

function Mezcla({ m }: { m: MesDirecto }) {
  if (m.solesTotales == null) {
    return <p className="text-[13px] text-slate-500">La mezcla web / WhatsApp aparece cuando se cargan las ventas totales del mes.</p>
  }
  const web = m.pctWeb ?? 0
  return (
    <div>
      <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
        <div style={{ width: `${web * 100}%`, background: AZUL }} />
        <div style={{ width: `${(1 - web) * 100}%`, background: '#25D366' }} />
      </div>
      <div className="flex justify-between mt-2 text-[12.5px]">
        <span className="inline-flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: AZUL }} />Web {pct(web)}</span>
        <span className="inline-flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: '#25D366' }} />WhatsApp {pct(1 - web)}</span>
      </div>
    </div>
  )
}

function BarraDoble({ a, b }: { a: { label: string; valor: number; color: string }; b: { label: string; valor: number; color: string } }) {
  const tot = a.valor + b.valor || 1
  return (
    <div>
      <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
        <div style={{ width: `${(a.valor / tot) * 100}%`, background: a.color }} />
        <div style={{ width: `${(b.valor / tot) * 100}%`, background: b.color }} />
      </div>
      <div className="flex justify-between mt-2 text-[13px]">
        <span className="text-slate-600"><b className="text-slate-900">{num(a.valor)}</b> {a.label}</span>
        <span className="text-slate-600"><b className="text-slate-900">{num(b.valor)}</b> {b.label}</span>
      </div>
    </div>
  )
}

const METRICAS_TENDENCIA: { key: string; label: string; val: (m: MesDirecto) => number | null; fmt: (n: number) => string }[] = [
  { key: 'ventas', label: 'Ventas', val: (m) => m.solesTotales ?? m.solesWeb, fmt: (n) => soles(n) },
  { key: 'pedidos', label: 'Pedidos', val: (m) => m.pedidosTotales ?? m.pedidosWeb, fmt: (n) => num(n) },
  { key: 'inversion', label: 'Inversión', val: (m) => m.gastoAdsSoles, fmt: (n) => soles(n) },
  { key: 'roas', label: 'ROAS', val: (m) => m.roas ?? m.roasWeb, fmt: (n) => veces(n) },
  { key: 'costo', label: 'Costo por venta', val: (m) => m.costoVenta, fmt: (n) => soles(n, 2) },
]

function Tendencia({ meses, sel, onSel }: { meses: MesDirecto[]; sel: number; onSel: (i: number) => void }) {
  const [k, setK] = useState('ventas')
  const met = METRICAS_TENDENCIA.find((x) => x.key === k)!
  const vals = meses.map((m) => met.val(m))
  const max = Math.max(1, ...vals.map((v) => v ?? 0))
  return (
    <Tarjeta>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <h3 className="flex items-center gap-2.5 text-[15px] font-bold text-slate-900 flex-1">
          <span className="w-8 h-8 rounded-[9px] inline-flex items-center justify-center" style={{ background: `${MORADO}14`, color: MORADO }}><TrendingUp className="w-4 h-4" /></span>
          Tendencia mensual
        </h3>
        <div className="inline-flex p-1 rounded-full border border-slate-200 bg-slate-50 gap-1 no-imprimir">
          {METRICAS_TENDENCIA.map((x) => (
            <button key={x.key} type="button" onClick={() => setK(x.key)}
              className={`h-8 px-3 rounded-full text-[12.5px] font-semibold ${k === x.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>{x.label}</button>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-2" style={{ height: 180 }}>
        {meses.map((m, i) => {
          const v = vals[i]
          return (
            <button key={m.mes} type="button" onClick={() => onSel(i)} title={`${labelMes(m.mes)} · ${v == null ? '—' : met.fmt(v)}`}
              className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 group">
              <span className="text-[10.5px] font-semibold text-slate-500 opacity-0 group-hover:opacity-100">{v == null ? '' : met.fmt(v)}</span>
              <div className="w-full max-w-[44px] rounded-t-[7px] transition-all" style={{ height: `${((v ?? 0) / max) * 100}%`, minHeight: v ? 4 : 0, background: i === sel ? 'linear-gradient(180deg,#7170ff,#ba41f7)' : '#e2e8f0' }} />
            </button>
          )
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {meses.map((m, i) => <span key={m.mes} className={`flex-1 text-center text-[11px] ${i === sel ? 'font-bold text-slate-900' : 'text-slate-400'}`}>{labelMes(m.mes).slice(0, 3)}</span>)}
      </div>
    </Tarjeta>
  )
}

function Tabla({ meses }: { meses: MesDirecto[] }) {
  const filas = [...meses].reverse()
  return (
    <Tarjeta className="!p-0 overflow-hidden">
      <div className="px-5 pt-5"><Titulo icon={<CalendarDays className="w-4 h-4" />} color="#64748b">Comparativa por mes</Titulo></div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] min-w-[760px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-y border-slate-100 bg-slate-50/60">
              {['Mes', 'Ventas', 'Pedidos', 'Web', 'WhatsApp', 'Inversión', 'ROAS', 'Costo/venta', 'Conversaciones'].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map((m) => (
              <tr key={m.mes} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-2.5 font-semibold text-slate-900">{labelMes(m.mes)}</td>
                <td className="px-4 py-2.5">{soles(m.solesTotales ?? m.solesWeb)}</td>
                <td className="px-4 py-2.5">{num(m.pedidosTotales ?? m.pedidosWeb)}</td>
                <td className="px-4 py-2.5 text-slate-600">{soles(m.solesWeb)}</td>
                <td className="px-4 py-2.5 text-slate-600">{m.solesWhatsApp == null ? 'Pendiente' : soles(m.solesWhatsApp)}</td>
                <td className="px-4 py-2.5 text-slate-600">{soles(m.gastoAdsSoles)}</td>
                <td className="px-4 py-2.5 font-semibold">{veces(m.roas ?? m.roasWeb)}</td>
                <td className="px-4 py-2.5 text-slate-600">{soles(m.costoVenta, 2)}</td>
                <td className="px-4 py-2.5 text-slate-600">{num(m.leads)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  )
}

/* Formulario del cliente: solo sus ventas totales del mes. */
function FormVentas({ mes, onGuardar }: { mes: MesDirecto; onGuardar: (mes: string, pedidos: number, soles: number) => Promise<{ ok: true } | { ok: false; error: string }> }) {
  const router = useRouter()
  const [pedidos, setPedidos] = useState('')
  const [monto, setMonto] = useState('')
  const [guardando, setGuardando] = useState(false)
  async function guardar() {
    const p = Number(pedidos), s = Number(monto.replace(/,/g, ''))
    if (!(p > 0) || !(s > 0)) { toast.error('Pon la cantidad de pedidos y el monto en soles'); return }
    setGuardando(true)
    const r = await onGuardar(mes.mes, p, s)
    setGuardando(false)
    if (!r.ok) { toast.error(r.error); return }
    toast.success('¡Listo! Tu reporte se actualizó')
    router.refresh()
  }
  const campo = 'h-11 px-3.5 text-[15px] bg-white text-slate-900 border border-slate-200 rounded-[11px] focus:outline-none focus:border-[#7170ff] focus:ring-[3px] focus:ring-[#7170ff]/15 w-full'
  return (
    <section className="rounded-[20px] border-2 border-[#c4b5fd] bg-gradient-to-br from-[#f5f3ff] to-white p-5 sm:p-6 no-imprimir">
      <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#6d5dfc]">Falta un paso</div>
      <h3 className="text-[19px] font-bold text-slate-900 mt-1">Pon tus ventas totales de {labelMes(mes.mes)}</h3>
      <p className="text-[13px] text-slate-500 mt-1 mb-4">
        Todos los pedidos del mes (web + WhatsApp). La web ya la tenemos: {num(mes.pedidosWeb)} pedidos por {soles(mes.solesWeb)}. Lo de WhatsApp se calcula solo.
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
        <label className="grid gap-1.5"><span className="text-[12.5px] font-semibold text-slate-700">Pedidos totales</span>
          <input type="number" min={0} inputMode="numeric" value={pedidos} onChange={(e) => setPedidos(e.target.value)} placeholder={`más de ${mes.pedidosWeb}`} className={campo} /></label>
        <label className="grid gap-1.5"><span className="text-[12.5px] font-semibold text-slate-700">Ventas totales (S/)</span>
          <input type="number" min={0} step="0.01" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Ej. 28500" className={campo} /></label>
        <button type="button" onClick={() => void guardar()} disabled={guardando}
          className="h-11 px-5 inline-flex items-center justify-center gap-2 rounded-[11px] text-[14px] font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
        </button>
      </div>
    </section>
  )
}
