// app/lib/reportes/mes-form.ts
//
// Shared UI ↔ MesRaw mapping for staff (/reportes) and client (/cliente) month editors.
// Keep editors thin; do NOT invent MesRaw columns; do NOT change typhouse.computeMes.
//
// On save (Campos UI → MesRaw):
//   ventasTotales   = as entered (TODOS los pedidos confirmados, incluye Shopify)
//   ingresoDirecto  = as entered (Ingreso directo total S/: Shopify + WA)
//   ventasOmnicanal = ingresoDirecto + retailIndirectoSoles
//
// Dashboard then derives (typhouse.computeMes):
//   ventasWhatsApp (funnel count) = ventasTotales − ventasShopify   ← pedidos, not soles
//   ventasRetail (KPI Retail)     = ventasOmnicanal − ingresoDirecto
//   Ingreso WhatsApp KPI          = ingresoDirecto − ingresoShopify ← soles
//
// Pedidos ≠ soles ≠ retail:
//   - Ventas totales = cantidad de pedidos confirmados (incluye Shopify)
//   - Pedidos WhatsApp (calc.) = ventasTotales − ventasShopify
//   - Ingreso directo = S/ total directo (Shopify + WA); Ingreso WA = directo − Shopify
//   - Retail Indirecto = S/ ventas fuera de Shopify / retail física (≠ WhatsApp)

import type { MesRaw, MesReporte } from '@/lib/reportes/typhouse'

/** Client-facing form fields (strings for controlled inputs). */
export type MesFormCampos = {
  mes: string
  leads: string
  ventasShopify: string
  ingresoShopify: string
  /** Todos los pedidos confirmados del embudo (incluye Shopify). */
  ventasTotales: string
  /** Ingreso directo total en soles (Shopify + WhatsApp). */
  ingresoDirecto: string
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
  ventasTotales: 'Ventas totales (todos los pedidos)',
  ingresoDirecto: 'Ingreso directo total',
  retailIndirectoSoles: 'Retail Indirecto (fuera Shopify)',
  gastoAdsUsd: 'Gasto Ads',
  tipoCambio: 'Tipo de cambio',
  igv: 'IGV',
} as const

/** Short helper under the form: totales → WA calc.; retail ≠ WhatsApp. */
export const MES_FORM_HELP =
  'Carga TODOS los pedidos confirmados (incluye Shopify). WhatsApp se calcula: totales − Shopify. Ingreso directo = total S/ directo (Shopify + WA); Ingreso WhatsApp = directo − Shopify. Retail Indirecto = ventas fuera de Shopify / retail física (≠ WhatsApp).'

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
    ventasTotales: '',
    ingresoDirecto: '',
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
    ventasTotales: String(m.ventasTotales),
    ingresoDirecto: String(m.ingresoDirecto),
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
  const ventasTotales = parseMesNum(c.ventasTotales)
  const ingresoDirecto = parseMesNum(c.ingresoDirecto)
  const retailIndirectoSoles = parseMesNum(c.retailIndirectoSoles)
  const gastoAdsUsd = parseMesNum(c.gastoAdsUsd)
  const tipoCambio = parseMesNum(c.tipoCambio)
  const igv = parseMesNum(c.igv)

  const ventasOmnicanal = ingresoDirecto + retailIndirectoSoles

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

/** Live preview of derived KPIs while typing (WA and omnicanal). */
export function previewDesdeCampos(c: MesFormCampos): {
  pedidosWhatsApp: number
  ingresoWhatsApp: number
  ventasOmnicanal: number
} {
  const ventasTotales = parseMesNum(c.ventasTotales) || 0
  const ventasShopify = parseMesNum(c.ventasShopify) || 0
  const ingresoDirecto = parseMesNum(c.ingresoDirecto) || 0
  const ingresoShopify = parseMesNum(c.ingresoShopify) || 0
  const retail = parseMesNum(c.retailIndirectoSoles) || 0
  return {
    pedidosWhatsApp: Math.max(0, ventasTotales - ventasShopify),
    ingresoWhatsApp: Math.max(0, ingresoDirecto - ingresoShopify),
    ventasOmnicanal: ingresoDirecto + retail,
  }
}
