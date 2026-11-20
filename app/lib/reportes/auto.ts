// app/lib/reportes/auto.ts
//
// Genera (o refresca) un mes del reporte DIRECTO de TypHouse / Little Joe con
// los datos automáticos (Shopify + Facebook Ads + tipo de cambio SUNAT),
// CONSERVANDO lo que ya cargó el cliente, la meta y lo cargado a mano.
// Lo usan la rutina mensual (cron) y el botón "Actualizar datos".

import 'server-only'
import { guardarMesDb, leerMesesDb } from './db'
import { DATA_MENSUAL, type MesRaw } from './typhouse'
import { resumenMesShopify, shopifyConfigurado } from '@/lib/integrations/shopify'
import { resumenMesMeta } from '@/lib/integrations/meta-ads'
import { tipoCambioSunatMes } from '@/lib/integrations/tipo-cambio'

export const SLUG_REPORTE_DIRECTO = 'little-joe'

export async function mesExistente(slug: string, mes: string): Promise<MesRaw | null> {
  const db = await leerMesesDb()
  return db[slug]?.find((m) => m.mes === mes) ?? (slug === 'little-joe' ? DATA_MENSUAL.find((m) => m.mes === mes) ?? null : null)
}

export async function generarMesDirecto(slug: string, mes: string, opts: { publicar?: boolean } = {}): Promise<{ raw: MesRaw; avisos: string[] }> {
  const avisos: string[] = []
  const prev = await mesExistente(slug, mes)
  const x = prev?.extra ?? {}

  if (!shopifyConfigurado()) throw new Error('Shopify no está configurado')
  const [shop, meta, tc] = await Promise.all([
    resumenMesShopify(mes),
    resumenMesMeta(mes).catch((e) => { avisos.push(String(e?.message ?? e)); return null }),
    tipoCambioSunatMes(mes),
  ])
  if (!meta && x.fuenteMeta !== 'manual') avisos.push('Facebook Ads: falta conectar el token; carga la inversión y los leads a mano.')
  if (!tc) avisos.push('No se pudo leer el tipo de cambio de SUNAT; se usó el anterior.')

  const cliente = x.cliente ?? null
  const usarMetaPrevio = !meta && (x.fuenteMeta === 'manual' || x.fuenteMeta === 'auto')
  const raw: MesRaw = {
    mes,
    leads: meta?.leads ?? (usarMetaPrevio ? prev?.leads ?? 0 : 0),
    ventasShopify: shop.pedidos,
    ingresoShopify: shop.ingreso,
    ventasTotales: cliente?.pedidos ?? shop.pedidos,
    ingresoDirecto: cliente?.soles ?? shop.ingreso,
    ventasOmnicanal: cliente?.soles ?? shop.ingreso,
    gastoAdsUsd: meta?.gastoUsd ?? (usarMetaPrevio ? prev?.gastoAdsUsd ?? 0 : 0),
    tipoCambio: tc ?? prev?.tipoCambio ?? 3.45,
    igv: 0.18,
    extra: {
      ...x,
      formato: 'directo',
      gastoWhatsAppUsd: meta?.gastoWhatsAppUsd ?? (usarMetaPrevio ? x.gastoWhatsAppUsd ?? null : null),
      nuevos: shop.nuevos,
      recurrentes: shop.recurrentes,
      topProductos: shop.topProductos,
      topAnuncios: meta?.topAnuncios ?? (usarMetaPrevio ? x.topAnuncios ?? [] : []),
      fuenteMeta: meta ? 'auto' : usarMetaPrevio ? x.fuenteMeta : 'pendiente',
      publicado: opts.publicar ? true : !!x.publicado,
      cliente,
      actualizadoAt: new Date().toISOString(),
    },
  }
  await guardarMesDb(slug, raw)
  return { raw, avisos }
}

/** Aplica las ventas totales que pone el cliente y recalcula. */
export async function aplicarVentasCliente(slug: string, mes: string, pedidos: number | null, soles: number): Promise<MesRaw> {
  const prev = await mesExistente(slug, mes)
  if (!prev || prev.extra?.formato !== 'directo') throw new Error('Ese mes todavía no está preparado')
  const raw: MesRaw = {
    ...prev,
    ventasTotales: pedidos ?? prev.ventasShopify,
    ingresoDirecto: soles,
    ventasOmnicanal: soles,
    extra: { ...prev.extra, cliente: { pedidos, soles, at: new Date().toISOString() } },
  }
  await guardarMesDb(slug, raw)
  return raw
}

/* ══════════ Mes en curso en tiempo real (Pedro 20-nov-2026) ══════════
   "Siempre debe estar en tiempo real": el mes actual se regenera solo
   (cron cada 30 min + al abrir Reportes si tiene más de 10 min). Nunca se
   publica al cliente: eso sigue siendo el día 2 del mes siguiente. */
export function mesEnCursoLima(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }).slice(0, 7)
}

const enVuelo = new Map<string, Promise<unknown>>()

/** Regenera el mes en curso si sus datos tienen más de `maxEdadMs`. No lanza. */
export async function refrescarMesEnCurso(slug = SLUG_REPORTE_DIRECTO, maxEdadMs = 10 * 60_000): Promise<{ refrescado: boolean; avisos: string[]; error?: string }> {
  const mes = mesEnCursoLima()
  const prev = await mesExistente(slug, mes).catch(() => null)
  const at = prev?.extra?.actualizadoAt ? Date.parse(prev.extra.actualizadoAt) : 0
  if (at && Date.now() - at < maxEdadMs) return { refrescado: false, avisos: [] }
  const clave = `${slug}:${mes}`
  /* Dos pestañas abiertas a la vez no disparan dos consultas a Shopify/Meta. */
  const tarea = enVuelo.get(clave) ?? generarMesDirecto(slug, mes).finally(() => enVuelo.delete(clave))
  enVuelo.set(clave, tarea)
  try {
    const r = (await tarea) as { avisos: string[] }
    return { refrescado: true, avisos: r.avisos }
  } catch (e) {
    return { refrescado: false, avisos: [], error: e instanceof Error ? e.message : String(e) }
  }
}
