'use client'

/* PDF del reporte mensual (Pedro 02-oct-2026: "la exportación PDF está un
   desastre"). En vez de imprimir la pantalla (sidebar, botones, tarjetas que
   se cortan), "Descargar PDF" imprime ESTE documento: 2 hojas A4 fijas,
   diseñadas para papel. Se monta en <body> y solo se ve al imprimir. */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { labelMes } from '@/lib/reportes/typhouse'
import type { MesDirecto } from '@/lib/reportes/directo'
import { soles, usd, num, pct, veces } from './calculos'

const C = {
  tinta: '#0f172a', gris: '#64748b', suave: '#94a3b8', linea: '#e2e8f0', fondo: '#f8fafc',
  morado: '#7170ff', fucsia: '#ba41f7', azul: '#2563eb', verde: '#16a34a', wpp: '#22c55e', naranja: '#ea580c', oro: '#ca8a04',
}
const GRAD = 'linear-gradient(135deg,#7170ff,#ba41f7)'

type Props = { nombre: string; m: MesDirecto; prev: MesDirecto | null; meses: MesDirecto[] }

export function ReportePdf(props: Props) {
  const [montado, setMontado] = useState(false)
  useEffect(() => { setMontado(true) }, [])
  if (!montado) return null
  return createPortal(
    <div id="reporte-pdf-root">
      <ReportePdfDoc {...props} />
      <style>{CSS_IMPRESION}</style>
    </div>,
    document.body,
  )
}

const CSS_IMPRESION = `
#reporte-pdf-root{display:none}
@media print{
  @page{size:A4;margin:0}
  html,body{background:#fff!important;margin:0!important;padding:0!important;height:auto!important;overflow:visible!important}
  body>*:not(#reporte-pdf-root){display:none!important}
  #reporte-pdf-root{display:block!important}
}`

/* Variación vs el mes anterior (▲/▼ con color: verde = bueno). */
function variacionVs(mesPrev: string | null, a: number | null | undefined, b: number | null | undefined, invertir = false) {
  if (!mesPrev || a == null || b == null || !isFinite(a) || !isFinite(b) || b === 0) return null
  const d = a / b - 1
  const bueno = invertir ? d < 0 : d > 0
  return { txt: `${d >= 0 ? '▲' : '▼'} ${Math.abs(d * 100).toFixed(0)}% vs ${labelMes(mesPrev).split(' ')[0].toLowerCase()}`, color: Math.abs(d) < 0.005 ? C.gris : bueno ? C.verde : '#dc2626' }
}

export function ReportePdfDoc({ nombre, m, prev, meses }: Props) {
  const variacion = (a: number | null | undefined, b: number | null | undefined, invertir = false) => variacionVs(prev?.mes ?? null, a, b, invertir)
  const ventas = m.solesTotales ?? m.solesWeb
  const pedidos = m.pedidosTotales ?? m.pedidosWeb
  const pendiente = m.pendienteCliente
  const hoy = new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long', year: 'numeric' })
  const tabla = meses.slice(-8).reverse()

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: C.tinta, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      {/* ───────────── HOJA 1 ───────────── */}
      <Hoja>
        <Cabecera nombre={nombre} mes={labelMes(m.mes)} />
        <div style={{ padding: '22px 40px 0', display: 'grid', gap: 18 }}>
          {pendiente && (
            <div style={{ fontSize: 10.5, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '7px 11px' }}>
              Ventas totales del cliente pendientes: las cifras muestran solo las ventas web (Shopify).
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <Kpi color={C.verde} label={pendiente ? 'Ventas web' : 'Ventas directas'} valor={soles(ventas)} v={variacion(ventas, prev ? (pendiente ? prev.solesWeb : prev.solesTotales ?? prev.solesWeb) : null)} />
            <Kpi color={C.azul} label={pendiente ? 'Pedidos web' : 'Pedidos totales'} valor={num(pedidos)} v={variacion(pedidos, prev ? (pendiente ? prev.pedidosWeb : prev.pedidosTotales ?? prev.pedidosWeb) : null)} />
            <Kpi color={C.morado} label="Inversión Facebook Ads" valor={soles(m.gastoAdsSoles)} sub={`${usd(m.gastoAdsUsd)} · con IGV`} v={variacion(m.gastoAdsSoles, prev?.gastoAdsSoles, true)} />
            <Kpi color={C.naranja} label="Retorno (ROAS)" valor={veces(m.roas ?? m.roasWeb)} sub={m.roas != null ? 'ventas ÷ inversión' : 'solo web ÷ inversión'} v={variacion(m.roas ?? m.roasWeb, prev ? (m.roas != null ? prev.roas ?? prev.roasWeb : prev.roasWeb) : null)} />
          </div>

          {/* Embudo */}
          <Bloque titulo="Embudo de ventas" nota="Facebook Ads (WhatsApp) + Shopify">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px', gap: 18, alignItems: 'center' }}>
              <div style={{ display: 'grid', gap: 5, justifyItems: 'center' }}>
                {[
                  { v: m.leads as number | null, t: 'Conversaciones WhatsApp', bg: '#6366f1', w: 100, p: prev?.leads },
                  { v: m.pedidosWeb as number | null, t: 'Pedidos web · Shopify', bg: C.azul, w: 80, p: prev?.pedidosWeb },
                  { v: m.pedidosWhatsApp, t: 'Pedidos WhatsApp', bg: C.verde, w: 60, p: prev?.pedidosWhatsApp },
                ].map((e) => {
                  const d = variacion(e.v, e.p)
                  return (
                    <div key={e.t} style={{ width: `${e.w}%`, height: 54, borderRadius: 10, background: e.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20, fontWeight: 800 }}>{e.v == null ? '—' : num(e.v)}</span>
                      <span style={{ display: 'grid', lineHeight: 1.25 }}>
                        <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{e.t}</span>
                        {d && <span style={{ fontSize: 9, opacity: 0.9 }}>{d.txt}</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div style={{ borderLeft: `1px solid ${C.linea}`, paddingLeft: 18 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: C.suave, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pedidos totales</div>
                <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.05, marginTop: 4 }}>{m.pedidosTotales == null ? '—' : num(m.pedidosTotales)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.gris, marginTop: 4 }}>{m.solesTotales == null ? 'Pendiente' : soles(m.solesTotales)}</div>
                {m.conversionWhatsApp != null && <div style={{ fontSize: 10, color: C.gris, marginTop: 8, lineHeight: 1.4 }}>{pct(m.conversionWhatsApp, 1)} de las conversaciones terminó en pedido</div>}
              </div>
            </div>
          </Bloque>

          {/* Canales + eficiencia */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: 14 }}>
            <Bloque titulo="Ventas por canal">
              {m.pctWeb != null ? (
                <>
                  <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: C.linea }}>
                    <div style={{ width: `${m.pctWeb * 100}%`, background: C.azul }} />
                    <div style={{ width: `${(1 - m.pctWeb) * 100}%`, background: C.wpp }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.gris, marginTop: 5 }}>
                    <span>Web {pct(m.pctWeb)}</span><span>WhatsApp {pct(1 - m.pctWeb)}</span>
                  </div>
                </>
              ) : <div style={{ fontSize: 10.5, color: C.gris }}>La mezcla aparece cuando el cliente reporta sus ventas totales.</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <Mini label="Web (Shopify)" valor={soles(m.solesWeb)} sub={`${num(m.pedidosWeb)} pedidos`} />
                <Mini label="WhatsApp" valor={m.solesWhatsApp == null ? 'Pendiente' : soles(m.solesWhatsApp)} sub={m.pedidosWhatsApp != null ? `${num(m.pedidosWhatsApp)} pedidos` : ''} />
              </div>
            </Bloque>
            <Bloque titulo="Eficiencia de la inversión">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <Mini label="Costo por venta" valor={soles(m.costoVenta, 2)} sub="anuncios ÷ pedidos" />
                <Mini label="Ticket promedio" valor={soles(m.ticket, 2)} sub="ventas ÷ pedidos" />
                <Mini label="Costo por cliente" valor={soles(m.cac, 2)} sub="marketing ÷ pedidos" />
                <Mini label="Conversaciones" valor={num(m.leads)} sub={`S/ ${(m.costoMensaje ?? 0).toFixed(2)} c/u`} />
                <Mini label="Conversión WhatsApp" valor={pct(m.conversionWhatsApp, 1)} sub="pedidos ÷ conversaciones" />
                <Mini label="Marketing total" valor={soles(m.gastoMkt)} sub="anuncios + gestión" />
              </div>
            </Bloque>
          </div>

          <Bloque titulo="Tendencia de ventas" nota={`últimos ${Math.min(8, meses.length)} meses`}>
            <Tendencia meses={meses.slice(-8)} actual={m.mes} />
          </Bloque>

          {m.objetivoSoles != null && (
            <Bloque titulo="Meta del mes">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.gris }}>
                <span>Vendimos <b style={{ color: C.tinta }}>{soles(ventas)}</b> de una meta de <b style={{ color: C.tinta }}>{soles(m.objetivoSoles)}</b></span>
                <b style={{ color: (m.avanceObjetivo ?? 0) >= 1 ? C.verde : C.tinta, fontSize: 14 }}>{pct(m.avanceObjetivo)}</b>
              </div>
              <div style={{ height: 10, borderRadius: 5, background: C.linea, marginTop: 7, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (m.avanceObjetivo ?? 0) * 100)}%`, background: GRAD }} />
              </div>
            </Bloque>
          )}
        </div>
        <Pie n={1} hoy={hoy} m={m} />
      </Hoja>

      {/* ───────────── HOJA 2 ───────────── */}
      <Hoja>
        <Cabecera nombre={nombre} mes={labelMes(m.mes)} compacta />
        <div style={{ padding: '20px 40px 0', display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: m.nuevos != null ? '1fr 1.6fr' : '1fr', gap: 14 }}>
            {m.nuevos != null && m.recurrentes != null && (
              <Bloque titulo="Clientes de la web">
                <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: C.linea }}>
                  <div style={{ width: `${(m.nuevos / Math.max(1, m.nuevos + m.recurrentes)) * 100}%`, background: C.morado }} />
                  <div style={{ flex: 1, background: '#c4b5fd' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <Mini label="Nuevos" valor={num(m.nuevos)} sub="primera compra" />
                  <Mini label="Repiten" valor={num(m.recurrentes)} sub="ya compraron antes" />
                </div>
              </Bloque>
            )}
            <Bloque titulo="Productos más vendidos (web)">
              {m.topProductos.length === 0 ? <div style={{ fontSize: 10.5, color: C.gris }}>Sin datos de productos este mes.</div> : (
                <div style={{ display: 'grid', gap: 7 }}>
                  {m.topProductos.map((p, i) => (
                    <div key={p.nombre} style={{ display: 'grid', gridTemplateColumns: '18px 1fr 44px 62px', gap: 8, alignItems: 'center', fontSize: 10.5 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 9, background: i === 0 ? C.verde : C.fondo, color: i === 0 ? '#fff' : C.gris, fontWeight: 700, fontSize: 9.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre.replace(/®/g, '')}</span>
                      <b style={{ textAlign: 'right' }}>{num(p.unidades)} u</b>
                      <span style={{ textAlign: 'right', color: C.gris }}>{soles(p.soles)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Bloque>
          </div>

          {m.topAnuncios.length > 0 && (
            <Bloque titulo="Anuncios ganadores" nota="más conversaciones de WhatsApp">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${m.topAnuncios.length}, 1fr)`, gap: 8 }}>
                {m.topAnuncios.map((a, i) => (
                  <div key={a.nombre + i} style={{ border: `1px solid ${C.linea}`, background: C.fondo, borderRadius: 10, padding: '9px 11px' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: C.oro }}>#{i + 1}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2, lineHeight: 1.3 }}>{a.nombre}</div>
                    <div style={{ fontSize: 10, color: C.gris, marginTop: 4 }}>{num(a.conversaciones)} conversaciones · US$ {a.costoUsd.toFixed(2)} c/u</div>
                  </div>
                ))}
              </div>
            </Bloque>
          )}

          <Bloque titulo="Comparativa por mes">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ color: C.suave, textAlign: 'right' }}>
                  {['Mes', 'Ventas', 'Pedidos', 'Web', 'WhatsApp', 'Inversión', 'ROAS', 'Costo/venta'].map((h, i) => (
                    <th key={h} style={{ fontWeight: 700, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 0 6px', textAlign: i === 0 ? 'left' : 'right', borderBottom: `1px solid ${C.linea}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabla.map((x) => {
                  const actual = x.mes === m.mes
                  return (
                    <tr key={x.mes} style={{ background: actual ? '#f5f3ff' : undefined, fontWeight: actual ? 700 : 400 }}>
                      <td style={celda(true)}>{labelMes(x.mes)}</td>
                      <td style={celda()}>{soles(x.solesTotales ?? x.solesWeb)}</td>
                      <td style={celda()}>{num(x.pedidosTotales ?? x.pedidosWeb)}</td>
                      <td style={celda()}>{soles(x.solesWeb)}</td>
                      <td style={celda()}>{x.solesWhatsApp == null ? '—' : soles(x.solesWhatsApp)}</td>
                      <td style={celda()}>{soles(x.gastoAdsSoles)}</td>
                      <td style={celda()}>{veces(x.roas ?? x.roasWeb)}</td>
                      <td style={celda()}>{soles(x.costoVenta, 2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Bloque>

          <Bloque titulo="Cómo se calcula">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 18px', fontSize: 9.5, color: C.gris, lineHeight: 1.45 }}>
              <span><b style={{ color: C.tinta }}>Ventas directas:</b> total que reporta el cliente (web + WhatsApp).</span>
              <span><b style={{ color: C.tinta }}>Web:</b> pedidos pagados en Shopify (sin cancelados ni pruebas).</span>
              <span><b style={{ color: C.tinta }}>WhatsApp:</b> ventas totales − ventas web.</span>
              <span><b style={{ color: C.tinta }}>Inversión:</b> gasto en US$ × tipo de cambio SUNAT {m.tipoCambio} + IGV 18%.</span>
              <span><b style={{ color: C.tinta }}>ROAS:</b> ventas ÷ inversión en anuncios.</span>
              <span><b style={{ color: C.tinta }}>Costo por venta:</b> inversión en anuncios ÷ pedidos.</span>
              <span><b style={{ color: C.tinta }}>Costo por cliente:</b> (anuncios + gestión S/ 1,800 + IGV) ÷ pedidos.</span>
              <span><b style={{ color: C.tinta }}>Conversión WhatsApp:</b> pedidos por WhatsApp ÷ conversaciones.</span>
            </div>
          </Bloque>
        </div>
        <Pie n={2} hoy={hoy} m={m} />
      </Hoja>
    </div>
  )
}

const celda = (izq = false): React.CSSProperties => ({ padding: '6px 0', textAlign: izq ? 'left' : 'right', borderBottom: `1px solid #f1f5f9`, whiteSpace: 'nowrap' })

/* Barras de ventas por mes (el mes del reporte resaltado). */
function Tendencia({ meses, actual }: { meses: MesDirecto[]; actual: string }) {
  const vals = meses.map((x) => x.solesTotales ?? x.solesWeb)
  const max = Math.max(1, ...vals)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, paddingTop: 16 }}>
      {meses.map((x, i) => {
        const on = x.mes === actual
        return (
          <div key={x.mes} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 8.5, fontWeight: on ? 800 : 600, color: on ? C.tinta : C.gris, whiteSpace: 'nowrap' }}>{`S/ ${(vals[i] / 1000).toFixed(1)}k`}</span>
            <div style={{ width: '100%', maxWidth: 46, height: `${(vals[i] / max) * 100}%`, minHeight: 3, borderRadius: '6px 6px 0 0', background: on ? GRAD : '#e2e8f0' }} />
            <span style={{ fontSize: 9, fontWeight: on ? 800 : 500, color: on ? C.tinta : C.suave }}>{labelMes(x.mes).slice(0, 3)}</span>
          </div>
        )
      })}
    </div>
  )
}

function Hoja({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ width: '210mm', height: '297mm', position: 'relative', overflow: 'hidden', background: '#fff', breakAfter: 'page', pageBreakAfter: 'always', boxSizing: 'border-box' }}>
      {children}
    </section>
  )
}

function Cabecera({ nombre, mes, compacta = false }: { nombre: string; mes: string; compacta?: boolean }) {
  return (
    <div style={{ background: GRAD, color: '#fff', padding: compacta ? '16px 40px' : '28px 40px 26px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85 }}>Reporte mensual de resultados</div>
        <div style={{ fontSize: compacta ? 18 : 28, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 3 }}>{nombre}</div>
        {!compacta && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Ventas directas · Shopify + WhatsApp · Facebook Ads</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: compacta ? 14 : 22, fontWeight: 800 }}>{mes}</div>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', opacity: 0.85, marginTop: 2 }}>DISTINTO AGENCIA</div>
      </div>
    </div>
  )
}

function Pie({ n, hoy, m }: { n: number; hoy: string; m: MesDirecto }) {
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, bottom: 18, display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: C.suave, borderTop: `1px solid ${C.linea}`, paddingTop: 7 }}>
      <span>Fuentes: Shopify (pedidos pagados) · Facebook Ads · Tipo de cambio SUNAT {m.tipoCambio} · IGV 18%</span>
      <span>Generado el {hoy} · Página {n} de 2</span>
    </div>
  )
}

function Bloque({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${C.linea}`, borderRadius: 12, padding: '13px 15px', breakInside: 'avoid' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 4, height: 12, borderRadius: 2, background: GRAD, alignSelf: 'center' }} />
        <span style={{ fontSize: 12, fontWeight: 800 }}>{titulo}</span>
        {nota && <span style={{ fontSize: 9.5, color: C.suave }}>{nota}</span>}
      </div>
      {children}
    </div>
  )
}

function Kpi({ color, label, valor, sub, v }: { color: string; label: string; valor: string; sub?: string; v: { txt: string; color: string } | null }) {
  return (
    <div style={{ border: `1px solid ${C.linea}`, borderRadius: 12, padding: '11px 12px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: C.gris }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 5, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{valor}</div>
      {sub && <div style={{ fontSize: 8.5, color: C.gris, marginTop: 3 }}>{sub}</div>}
      {v && <div style={{ fontSize: 8.5, fontWeight: 700, color: v.color, marginTop: 3 }}>{v.txt}</div>}
    </div>
  )
}

function Mini({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div style={{ background: C.fondo, borderRadius: 9, padding: '8px 10px' }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: C.gris }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3, whiteSpace: 'nowrap' }}>{valor}</div>
      {sub && <div style={{ fontSize: 8.5, color: C.suave, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
