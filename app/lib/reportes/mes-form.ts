// app/lib/reportes/mes-form.ts
//
// Shared UI ↔ MesRaw mapping for staff (/reportes) and client (/cliente) month editors.
// Keep editors thin; do NOT invent MesRaw columns; do NOT change typhouse.computeMes.
//
// On save (Campos UI → MesRaw):
//   ventasTotales   = ventasShopify + pedidosWhatsApp
//   ingresoDirecto  = ingresoShopify + ingresoWhatsAppSoles
//   ventasOmnicanal = ingresoDirecto + retailIndirectoSoles
//
// Dashboard then derives (typhouse.computeMes):
//   ventasWhatsApp (funnel count) = ventasTotales − ventasShopify   ← pedidos, not soles
//   ventasRetail (KPI Retail)     = ventasOmnicanal − ingresoDirecto
//   Ingreso WhatsApp KPI          = ingresoDirecto − ingresoShopify ← soles
//
// Pedidos ≠ soles ≠ retail:
//   - Pedidos WhatsApp = cantidad de pedidos (integer), NOT "ventas" in soles
//   - Ingreso WhatsApp = S/ de venta por WhatsApp
//   - Retail Indirecto = S/ ventas fuera de Shopify / retail física

import type { MesRaw, MesReporte } from '@/lib/reportes/typhouse'

/** Client-facing form fields (strings for controlled inputs). */
export type MesFormCampos = {
  mes: string
  leads: string
  ventasShopify: string
  ingresoShopify: string
  /** Cantidad de pedidos por WhatsApp (integer). */
  pedidosWhatsApp: string
  /** Soles de venta por WhatsApp (aparte de Shopify). */
  ingresoWhatsAppSoles: string
  /** Soles ventas fuera de Shopify / retail física. */
  retailIndirectoSoles: string
  gastoAdsUsd: string
  tipoCambio: string
  igv: string
}

export const MES_FORM_LABELS = {
  mes: 'Mes (AAAA-MM)',
  leads: 'Leads WhatsApp',
  ventasShopify: 'Ventas Shopify (pedidos)',
  ingresoShopify: 'Ingreso Shopify',
  pedidosWhatsApp: 'Pedidos WhatsApp',
  ingresoWhatsAppSoles: 'Ingreso WhatsApp',
  retailIndirectoSoles: 'Retail Indirecto (fuera Shopify)',
  gastoAdsUsd: 'Gasto Ads',
  tipoCambio: 'Tipo de cambio',
  igv: 'IGV',
} as const

/** Short helper under the form: pedidos ≠ soles ≠ retail. */
export const MES_FORM_HELP =
  'Pedidos WhatsApp = cantidad de pedidos (no soles). Ingreso WhatsApp = soles de venta por WhatsApp. Retail Indirecto = ventas fuera de Shopify / retail física. Son tres cosas distintas; ingreso directo, omnicanal y ventas totales se calculan solos.'

export function parseMesNum(v: string): number {
  return Number(String(v).replace(',', '.'))
}

export function sigMes(ultimo?: string): string {
  if (!ultimo) {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const [y, m] = ultimo.split('-').map(Number)
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

export function vacioMesForm(mes: string): MesFormCampos {
  return {
    mes,
    leads: '',
    ventasShopify: '',
    ingresoShopify: '',
    pedidosWhatsApp: '',
    ingresoWhatsAppSoles: '',
    retailIndirectoSoles: '',
    gastoAdsUsd: '',
    tipoCambio: '3.41',
    igv: '0.18',
  }
}

/** Reverse-map MesRaw/MesReporte → UI campos. */
export function camposDesdeMes(m: MesReporte | MesRaw): MesFormCampos {
  return {
    mes: m.mes,
    leads: String(m.leads),
    ventasShopify: String(m.ventasShopify),
    ingresoShopify: String(m.ingresoShopify),
    pedidosWhatsApp: String(Math.max(0, m.ventasTotales - m.ventasShopify)),
    ingresoWhatsAppSoles: String(Math.max(0, m.ingresoDirecto - m.ingresoShopify)),
    retailIndirectoSoles: String(Math.max(0, m.ventasOmnicanal - m.ingresoDirecto)),
    gastoAdsUsd: String(m.gastoAdsUsd),
    tipoCambio: String(m.tipoCambio),
    igv: String(m.igv),
  }
}

/** UI → MesRaw (same shape typhouse expects; no new DB columns). */
export function camposAMesRaw(c: MesFormCampos): MesRaw {
  const leads = parseMesNum(c.leads)
  const ventasShopify = parseMesNum(c.ventasShopify)
  const ingresoShopify = parseMesNum(c.ingresoShopify)
  const pedidosWhatsApp = parseMesNum(c.pedidosWhatsApp)
  const ingresoWhatsAppSoles = parseMesNum(c.ingresoWhatsAppSoles)
  const retailIndirectoSoles = parseMesNum(c.retailIndirectoSoles)
  const gastoAdsUsd = parseMesNum(c.gastoAdsUsd)
  const tipoCambio = parseMesNum(c.tipoCambio)
  const igv = parseMesNum(c.igv)

  const ingresoDirecto = ingresoShopify + ingresoWhatsAppSoles
  const ventasOmnicanal = ingresoDirecto + retailIndirectoSoles
  const ventasTotales = ventasShopify + pedidosWhatsApp

  return {
    mes: c.mes.trim(),
    leads,
    ventasShopify,
    ingresoShopify,
    ventasTotales,
    ingresoDirecto,
    ventasOmnicanal,
    gastoAdsUsd,
    tipoCambio,
    igv,
  }
}

/** Live preview of derived MesRaw totals while typing. */
export function previewDesdeCampos(c: MesFormCampos): {
  ventasTotales: number
  ingresoDirecto: number
  ventasOmnicanal: number
} {
  const ingresoShopify = parseMesNum(c.ingresoShopify) || 0
  const ingresoWA = parseMesNum(c.ingresoWhatsAppSoles) || 0
  const retail = parseMesNum(c.retailIndirectoSoles) || 0
  const vShopify = parseMesNum(c.ventasShopify) || 0
  const pedidosWA = parseMesNum(c.pedidosWhatsApp) || 0
  const ingresoDirecto = ingresoShopify + ingresoWA
  return {
    ingresoDirecto,
    ventasOmnicanal: ingresoDirecto + retail,
    ventasTotales: vShopify + pedidosWA,
  }
}
