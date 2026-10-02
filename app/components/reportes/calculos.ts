// Formato y textos de "Cómo se calcula" del reporte directo (pantalla y PDF).
import type { MesDirecto } from '@/lib/reportes/directo'

export const soles = (n: number | null | undefined, dec = 0) =>
  n == null || !isFinite(n) ? '—' : `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
export const usd = (n: number | null | undefined) => (n == null || !isFinite(n) ? '—' : `US$ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
export const num = (n: number | null | undefined) => (n == null || !isFinite(n) ? '—' : Math.round(n).toLocaleString('es-PE'))
export const pct = (n: number | null | undefined, dec = 0) => (n == null || !isFinite(n) ? '—' : `${(n * 100).toFixed(dec)}%`)
export const veces = (n: number | null | undefined) => (n == null || !isFinite(n) ? '—' : `${n.toFixed(2)}x`)


/* Textos de "Cómo se calcula" con los números reales del mes. */
export function explicar(m: MesDirecto) {
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

