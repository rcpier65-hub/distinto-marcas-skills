// app/lib/reportes/directo.ts
//
// Reporte "DIRECTO" de TypHouse / Little Joe (Pedro 02-oct-2026): solo ventas
// directas — Shopify + WhatsApp — y la inversión en Facebook Ads. Sin retail
// ni omnicanal. Shopify y Facebook se cargan solos; el cliente solo pone sus
// VENTAS TOTALES (pedidos y soles). WhatsApp = totales − Shopify.
// Funciona también con los meses viejos (sin `extra`).

import { COSTO_GESTION, type MesRaw } from './typhouse'

export type MesDirecto = {
  mes: string
  raw: MesRaw
  pendienteCliente: boolean
  publicado: boolean
  fuenteMeta: 'auto' | 'manual' | 'pendiente'
  tipoCambio: number
  // Inversión
  gastoAdsUsd: number
  gastoAdsSoles: number
  gestionSoles: number
  gastoMkt: number
  // Facebook
  leads: number
  costoMensaje: number | null
  // Shopify (web)
  pedidosWeb: number
  solesWeb: number
  nuevos: number | null
  recurrentes: number | null
  // Totales (cliente) y WhatsApp
  pedidosTotales: number | null
  solesTotales: number | null
  pedidosWhatsApp: number | null
  solesWhatsApp: number | null
  // Indicadores
  roas: number | null            // ventas directas / inversión Ads
  roasWeb: number | null         // solo Shopify / inversión Ads
  costoVenta: number | null      // inversión Ads / pedidos
  ticket: number | null
  conversionWhatsApp: number | null
  cac: number | null             // (Ads + gestión) / pedidos
  pctWeb: number | null          // % de los soles que vino de la web
  objetivoSoles: number | null
  avanceObjetivo: number | null
  topProductos: { nombre: string; unidades: number; soles: number }[]
  topAnuncios: { nombre: string; conversaciones: number; costoUsd: number }[]
}

const div = (a: number, b: number) => (b > 0 && isFinite(a) ? a / b : null)

export function computeDirecto(r: MesRaw): MesDirecto {
  const x = r.extra ?? {}
  const esDirecto = x.formato === 'directo'
  const igv = r.igv ?? 0.18
  const tc = r.tipoCambio || 0
  const gastoAdsSoles = r.gastoAdsUsd * tc * (1 + igv)
  const gestionSoles = COSTO_GESTION * (1 + igv)
  const gastoMkt = gastoAdsSoles + gestionSoles

  /* Meses viejos: el cliente ya había cargado ventasTotales / ingresoDirecto. */
  const pendienteCliente = esDirecto ? !x.cliente : false
  const pedidosTotales = esDirecto ? (x.cliente?.pedidos ?? null) : r.ventasTotales
  const solesTotales = esDirecto ? (x.cliente?.soles ?? null) : r.ingresoDirecto
  const pedidosWhatsApp = pedidosTotales != null ? Math.max(0, pedidosTotales - r.ventasShopify) : null
  const solesWhatsApp = solesTotales != null ? Math.max(0, solesTotales - r.ingresoShopify) : null

  const gastoWppSoles = x.gastoWhatsAppUsd != null ? x.gastoWhatsAppUsd * tc * (1 + igv) : gastoAdsSoles
  const ventasBase = solesTotales ?? r.ingresoShopify
  const pedidosBase = pedidosTotales ?? r.ventasShopify
  const objetivo = x.objetivoSoles ?? null

  return {
    mes: r.mes,
    raw: r,
    pendienteCliente,
    publicado: esDirecto ? !!x.publicado : true,
    fuenteMeta: esDirecto ? (x.fuenteMeta ?? 'pendiente') : 'manual',
    tipoCambio: tc,
    gastoAdsUsd: r.gastoAdsUsd,
    gastoAdsSoles,
    gestionSoles,
    gastoMkt,
    leads: r.leads,
    costoMensaje: div(gastoWppSoles, r.leads),
    pedidosWeb: r.ventasShopify,
    solesWeb: r.ingresoShopify,
    nuevos: x.nuevos ?? null,
    recurrentes: x.recurrentes ?? null,
    pedidosTotales,
    solesTotales,
    pedidosWhatsApp,
    solesWhatsApp,
    roas: solesTotales != null ? div(solesTotales, gastoAdsSoles) : null,
    roasWeb: div(r.ingresoShopify, gastoAdsSoles),
    costoVenta: div(gastoAdsSoles, pedidosBase),
    ticket: div(ventasBase, pedidosBase),
    conversionWhatsApp: pedidosWhatsApp != null ? div(pedidosWhatsApp, r.leads) : null,
    cac: div(gastoMkt, pedidosBase),
    pctWeb: solesTotales != null ? div(r.ingresoShopify, solesTotales) : null,
    objetivoSoles: objetivo,
    avanceObjetivo: objetivo ? div(ventasBase, objetivo) : null,
    topProductos: x.topProductos ?? [],
    topAnuncios: x.topAnuncios ?? [],
  }
}
