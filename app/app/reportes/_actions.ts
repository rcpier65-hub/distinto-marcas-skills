// app/app/reportes/_actions.ts
'use server'

// Candado por código para los reportes (Pedro 11-ago-2026: "no todos pueden
// ver"). El código se valida EN EL SERVIDOR y el desbloqueo vive en una cookie
// httpOnly — el código nunca llega al bundle del navegador. Aplica tanto al
// módulo interno /reportes como a la sección de reporte del portal del cliente.
// Se puede sobreescribir con la env var REPORTES_PIN sin tocar código.

import { cookies } from 'next/headers'
import { requireUser } from '@/lib/auth/get-user'

const PIN_COOKIE = 'reportes_pin'
const PIN_TTL_SEG = 60 * 60 * 12 // 12 horas — luego vuelve a pedir el código

function pinReal(): string {
  return (process.env.REPORTES_PIN || '8990').trim()
}

export async function verificarPinReportes(pin: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  if ((pin ?? '').trim() !== pinReal()) {
    return { ok: false, error: 'Código incorrecto' }
  }
  const jar = await cookies()
  jar.set(PIN_COOKIE, 'ok', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: PIN_TTL_SEG,
    path: '/',
  })
  return { ok: true }
}

/** ¿La sesión ya desbloqueó los reportes? (para server components) */
export async function pinReportesOk(): Promise<boolean> {
  const jar = await cookies()
  return jar.get(PIN_COOKIE)?.value === 'ok'
}

/* ══════════ Cargar/editar la data mensual desde la interfaz ══════════
   Pedro 11-ago-2026: "el reporte debe tener un lugar para poner la
   información" — adiós Excel. Guarda en la tabla reportes_mensuales
   (se auto-crea; la base gana sobre el seed del código). Solo con el
   código de reportes ya ingresado. */

export type GuardarMesInput = {
  marcaSlug: string
  mes: string             // 'YYYY-MM'
  leads: number
  ventasShopify: number
  ingresoShopify: number
  ventasTotales: number
  ingresoDirecto: number
  ventasOmnicanal: number
  gastoAdsUsd: number
  tipoCambio: number
  igv: number             // 0.18
}

export async function guardarMesReporte(input: GuardarMesInput): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  if (!(await pinReportesOk())) return { ok: false, error: 'Sesión sin desbloquear — ingresa el código primero' }

  const slug = (input.marcaSlug ?? '').trim()
  const mes = (input.mes ?? '').trim()
  if (!slug) return { ok: false, error: 'Falta la marca' }
  if (!/^\d{4}-\d{2}$/.test(mes)) return { ok: false, error: 'El mes debe ser AAAA-MM (ej. 2026-08)' }

  const nums: Array<[string, number]> = [
    ['Leads', input.leads], ['Ventas Shopify', input.ventasShopify], ['Ingreso Shopify', input.ingresoShopify],
    ['Ventas totales', input.ventasTotales], ['Ingreso directo', input.ingresoDirecto],
    ['Ventas omnicanal', input.ventasOmnicanal], ['Gasto Ads USD', input.gastoAdsUsd],
    ['Tipo de cambio', input.tipoCambio], ['IGV', input.igv],
  ]
  for (const [label, v] of nums) {
    if (typeof v !== 'number' || !isFinite(v) || v < 0) return { ok: false, error: `${label}: número inválido` }
  }
  if (input.ventasTotales < input.ventasShopify) return { ok: false, error: 'Ventas totales no puede ser menor que Ventas Shopify' }
  if (input.ventasTotales <= 0 || input.leads <= 0) return { ok: false, error: 'Leads y Ventas totales deben ser mayores a 0' }
  if (input.tipoCambio <= 0) return { ok: false, error: 'Tipo de cambio inválido' }

  try {
    const { guardarMesDb } = await import('@/lib/reportes/db')
    await guardarMesDb(slug, {
      mes,
      leads: input.leads,
      ventasShopify: input.ventasShopify,
      ingresoShopify: input.ingresoShopify,
      ventasTotales: input.ventasTotales,
      ingresoDirecto: input.ingresoDirecto,
      ventasOmnicanal: input.ventasOmnicanal,
      gastoAdsUsd: input.gastoAdsUsd,
      tipoCambio: input.tipoCambio,
      igv: input.igv,
    })
  } catch (e) {
    return { ok: false, error: `No se pudo guardar: ${e instanceof Error ? e.message : String(e)}` }
  }

  const { revalidatePath } = await import('next/cache')
  revalidatePath('/reportes')
  revalidatePath('/cliente')
  return { ok: true }
}

export async function eliminarMesReporte(marcaSlug: string, mes: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  if (!(await pinReportesOk())) return { ok: false, error: 'Sesión sin desbloquear' }
  try {
    const { eliminarMesDb } = await import('@/lib/reportes/db')
    await eliminarMesDb(marcaSlug, mes)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  const { revalidatePath } = await import('next/cache')
  revalidatePath('/reportes')
  revalidatePath('/cliente')
  return { ok: true }
}

/* ══════════ Reporte DIRECTO (Shopify + Facebook automáticos) ══════════
   Pedro 02-oct-2026. Estas acciones son SOLO del equipo: además del código,
   verifican que la sesión sea un miembro activo (el código de reportes lo
   tienen también los clientes). */
type Res = { ok: true; avisos?: string[] } | { ok: false; error: string }

async function soloEquipo(): Promise<string | null> {
  const user = await requireUser()
  if (!(await pinReportesOk())) return 'Ingresa el código de reportes primero'
  const { createServiceClient } = await import('@/lib/supabase/service')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data } = await service.from('team_members').select('id').eq('auth_user_id', user.id).eq('activo', true).maybeSingle()
  return data ? null : 'Solo el equipo puede hacer esto'
}
async function refrescarReportes() {
  const { revalidatePath } = await import('next/cache')
  revalidatePath('/reportes'); revalidatePath('/cliente')
}
const mesOk = (m: string) => /^\d{4}-\d{2}$/.test(m)

/** Trae Shopify + Facebook + tipo de cambio para el mes (conserva lo del cliente). */
export async function actualizarMesDirecto(marcaSlug: string, mes: string): Promise<Res> {
  const err = await soloEquipo(); if (err) return { ok: false, error: err }
  if (!mesOk(mes)) return { ok: false, error: 'Mes inválido' }
  try {
    const { generarMesDirecto } = await import('@/lib/reportes/auto')
    const r = await generarMesDirecto(marcaSlug, mes)
    await refrescarReportes()
    return { ok: true, avisos: r.avisos }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) } }
}

/** Carga a mano la inversión y los leads de Facebook (mientras no haya token). */
export async function guardarMetaManual(marcaSlug: string, mes: string, d: { gastoUsd: number; leads: number; gastoWhatsAppUsd?: number | null }): Promise<Res> {
  const err = await soloEquipo(); if (err) return { ok: false, error: err }
  const { mesExistente } = await import('@/lib/reportes/auto')
  const prev = await mesExistente(marcaSlug, mes)
  if (!prev || prev.extra?.formato !== 'directo') return { ok: false, error: 'Primero genera el mes con "Actualizar datos"' }
  if (![d.gastoUsd, d.leads].every((v) => isFinite(v) && v >= 0)) return { ok: false, error: 'Números inválidos' }
  const { guardarMesDb } = await import('@/lib/reportes/db')
  await guardarMesDb(marcaSlug, {
    ...prev, gastoAdsUsd: d.gastoUsd, leads: Math.round(d.leads),
    extra: { ...prev.extra, fuenteMeta: 'manual', gastoWhatsAppUsd: d.gastoWhatsAppUsd ?? prev.extra?.gastoWhatsAppUsd ?? null },
  })
  await refrescarReportes()
  return { ok: true }
}

/** Meta de ventas del mes (S/) y publicación. */
export async function ajustarMesDirecto(marcaSlug: string, mes: string, d: { objetivoSoles?: number | null; publicado?: boolean }): Promise<Res> {
  const err = await soloEquipo(); if (err) return { ok: false, error: err }
  const { mesExistente } = await import('@/lib/reportes/auto')
  const prev = await mesExistente(marcaSlug, mes)
  if (!prev || prev.extra?.formato !== 'directo') return { ok: false, error: 'Primero genera el mes con "Actualizar datos"' }
  const extra = { ...prev.extra }
  if (d.objetivoSoles !== undefined) extra.objetivoSoles = d.objetivoSoles && d.objetivoSoles > 0 ? d.objetivoSoles : null
  if (d.publicado !== undefined) extra.publicado = d.publicado
  const { guardarMesDb } = await import('@/lib/reportes/db')
  await guardarMesDb(marcaSlug, { ...prev, extra })
  await refrescarReportes()
  return { ok: true }
}

/** El equipo también puede poner las ventas totales en nombre del cliente. */
export async function guardarVentasEquipo(marcaSlug: string, mes: string, pedidos: number, soles: number): Promise<Res> {
  const err = await soloEquipo(); if (err) return { ok: false, error: err }
  if (!(pedidos >= 0 && soles >= 0 && isFinite(pedidos) && isFinite(soles))) return { ok: false, error: 'Números inválidos' }
  try {
    const { aplicarVentasCliente } = await import('@/lib/reportes/auto')
    await aplicarVentasCliente(marcaSlug, mes, Math.round(pedidos), soles)
    await refrescarReportes()
    return { ok: true }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) } }
}

/* ══════════ Publicidad: historial mensual (Pedro 21-oct-2026) ══════════
   Presupuesto por mes y métricas de Meta, compartidos con el panel de
   Publicidad del espacio de marca (tabla pauta_mensual). */
/* Misma autorización que el panel de Publicidad: equipo con acceso a la marca
   (y, para el presupuesto, solo dirección). Devuelve el id de la marca. */
async function marcaPauta(marcaSlug: string, soloDireccion: boolean): Promise<{ id: string } | { error: string }> {
  const err = await soloEquipo(); if (err) return { error: err }
  try {
    const { actor, brandAccess } = await import('@/lib/estrategia/access')
    const a = await actor()
    const brand = await brandAccess(a, marcaSlug)
    if (soloDireccion && !a.manager) return { error: 'Solo dirección puede cambiar el presupuesto.' }
    return { id: brand.id }
  } catch (e) { return { error: e instanceof Error ? e.message : 'Sin acceso a esta marca' } }
}

export async function guardarPresupuestoPauta(marcaSlug: string, mes: string, monto: number | null): Promise<Res> {
  if (!mesOk(mes)) return { ok: false, error: 'Mes inválido' }
  if (monto !== null && (!Number.isFinite(monto) || monto < 0 || monto > 10_000_000)) return { ok: false, error: 'Monto inválido' }
  const m = await marcaPauta(marcaSlug, true); if ('error' in m) return { ok: false, error: m.error }
  const id = m.id
  try {
    const { guardarPresupuesto } = await import('@/lib/pauta/historial')
    await guardarPresupuesto(id, mes, monto)
    await refrescarReportes()
    return { ok: true }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) } }
}

export async function actualizarPautaReportes(marcaSlug: string): Promise<Res> {
  const m = await marcaPauta(marcaSlug, false); if ('error' in m) return { ok: false, error: m.error }
  const id = m.id
  try {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { configSchema } = await import('@/lib/pauta/model')
    const { actualizarHistorial } = await import('@/lib/pauta/historial')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (createServiceClient() as any).from('marca_pauta').select('config').eq('marca_id', id).maybeSingle()
    await actualizarHistorial(id, configSchema.parse(data?.config ?? {}).resultado)
    await refrescarReportes()
    return { ok: true }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) } }
}
