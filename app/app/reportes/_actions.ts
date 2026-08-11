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
