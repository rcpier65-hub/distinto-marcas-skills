// app/lib/integrations/meta-ads.ts
//
// Meta (Facebook) Ads — solo lectura — para el reporte de TypHouse / Little
// Joe. Cuenta TEAM LITTLE JOE; cuentan TODAS sus campañas menos las de
// "Mil Ideas" (Pedro 02-oct-2026). Requiere en variables de entorno:
//   META_ADS_TOKEN        token de acceso con permiso ads_read
//   META_LITTLEJOE_ACCOUNT  (opcional, por defecto 1206507377876940)
// Si no hay token, devuelve null y el reporte pide cargar esos datos a mano.

import 'server-only'

const VERSION = 'v21.0'
const CUENTA_DEF = '1206507377876940'
const EXCLUIR = /mil\s*ideas/i
const ACCION_WPP = 'onsite_conversion.messaging_conversation_started_7d'

export type ResumenMeta = {
  gastoUsd: number
  gastoWhatsAppUsd: number   // gasto de las campañas que generan conversaciones
  leads: number              // conversaciones de WhatsApp iniciadas
  topAnuncios: { nombre: string; conversaciones: number; costoUsd: number }[]
}

export function metaConfigurado(): boolean {
  return !!process.env.META_ADS_TOKEN
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insights(nivel: 'campaign' | 'ad', mes: string): Promise<any[]> {
  const [y, m] = mes.split('-').map(Number)
  const until = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  const cuenta = process.env.META_LITTLEJOE_ACCOUNT || CUENTA_DEF
  const params = new URLSearchParams({
    level: nivel,
    fields: nivel === 'ad' ? 'ad_name,campaign_name,spend,actions' : 'campaign_name,spend,actions',
    time_range: JSON.stringify({ since: `${mes}-01`, until }),
    limit: '500',
    access_token: process.env.META_ADS_TOKEN!,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas: any[] = []
  let url: string | null = `https://graph.facebook.com/${VERSION}/act_${cuenta}/insights?${params}`
  for (let i = 0; i < 20 && url; i++) {
    const r: Response = await fetch(url, { signal: AbortSignal.timeout(30000) })
    const j = await r.json()
    if (!r.ok) throw new Error(`Meta Ads: ${j?.error?.message ?? r.status}`)
    filas.push(...(j.data ?? []))
    url = j.paging?.next ?? null
  }
  return filas
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function conversaciones(f: any): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Number((f.actions ?? []).find((a: any) => a.action_type === ACCION_WPP)?.value ?? 0)
}

export async function resumenMesMeta(mes: string): Promise<ResumenMeta | null> {
  if (!metaConfigurado()) return null
  const campanas = (await insights('campaign', mes)).filter((c) => !EXCLUIR.test(c.campaign_name ?? ''))
  const res: ResumenMeta = { gastoUsd: 0, gastoWhatsAppUsd: 0, leads: 0, topAnuncios: [] }
  for (const c of campanas) {
    const gasto = Number(c.spend ?? 0)
    const conv = conversaciones(c)
    res.gastoUsd += gasto
    res.leads += conv
    if (conv > 0) res.gastoWhatsAppUsd += gasto
  }
  const anuncios = (await insights('ad', mes)).filter((a) => !EXCLUIR.test(a.campaign_name ?? ''))
  res.topAnuncios = anuncios
    .map((a) => ({ nombre: String(a.ad_name ?? 'Anuncio'), conversaciones: conversaciones(a), gasto: Number(a.spend ?? 0) }))
    .filter((a) => a.conversaciones > 0)
    .sort((a, b) => b.conversaciones - a.conversaciones).slice(0, 3)
    .map((a) => ({ nombre: a.nombre, conversaciones: a.conversaciones, costoUsd: Math.round((a.gasto / a.conversaciones) * 100) / 100 }))
  res.gastoUsd = Math.round(res.gastoUsd * 100) / 100
  res.gastoWhatsAppUsd = Math.round(res.gastoWhatsAppUsd * 100) / 100
  return res
}
