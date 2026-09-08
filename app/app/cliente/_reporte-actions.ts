// app/app/cliente/_reporte-actions.ts
'use server'

/* Persistencia del reporte mensual desde el PORTAL del cliente.
   Misma tabla (guardarMesDb) que el editor staff. SEGURIDAD: marca_slug
   FORZADO desde getClienteActual(). Requiere PIN de reportes desbloqueado.
   El editor cliente mapea UI (ventas totales, ingreso directo, retail) → MesRaw
   antes de llamar; este action guarda MesRaw tal cual (sin tocar typhouse). */

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { getClienteActual } from '@/lib/cliente/get-cliente'

export type GuardarMesClienteInput = {
  mes: string
  leads: number
  ventasShopify: number
  ingresoShopify: number
  ventasTotales: number
  ingresoDirecto: number
  ventasOmnicanal: number
  gastoAdsUsd: number
  tipoCambio: number
  igv: number
}

export async function guardarMesReporteCliente(
  input: GuardarMesClienteInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }

  const { pinReportesOk } = await import('@/app/reportes/_actions')
  if (!(await pinReportesOk())) {
    return { ok: false, error: 'Sesion sin desbloquear — ingresa el codigo del reporte primero' }
  }

  const mes = (input.mes ?? '').trim()
  if (!/^\d{4}-\d{2}$/.test(mes)) return { ok: false, error: 'El mes debe ser AAAA-MM (ej. 2026-08)' }

  const nums: Array<[string, number]> = [
    ['Leads', input.leads], ['Ventas Shopify', input.ventasShopify], ['Ingreso Shopify', input.ingresoShopify],
    ['Ventas totales', input.ventasTotales], ['Ingreso directo', input.ingresoDirecto],
    ['Ventas omnicanal', input.ventasOmnicanal], ['Gasto Ads USD', input.gastoAdsUsd],
    ['Tipo de cambio', input.tipoCambio], ['IGV', input.igv],
  ]
  for (const [label, v] of nums) {
    if (typeof v !== 'number' || !isFinite(v) || v < 0) return { ok: false, error: `${label}: numero invalido` }
  }
  if (input.ventasTotales < input.ventasShopify) {
    return { ok: false, error: 'Ventas totales no puede ser menor que Ventas Shopify' }
  }
  if (input.ventasTotales <= 0 || input.leads <= 0) {
    return { ok: false, error: 'Leads y Ventas totales deben ser mayores a 0' }
  }
  if (input.tipoCambio <= 0) return { ok: false, error: 'Tipo de cambio invalido' }

  const slug = cliente.marcaSlug

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

  revalidatePath('/cliente')
  revalidatePath('/reportes')
  return { ok: true }
}
