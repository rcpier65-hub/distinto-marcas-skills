// app/app/grabaciones/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import type { GrabacionEstado } from '@/lib/types/database'

export type GrabacionWithMarca = {
  id: string
  marca_id: string
  marca_slug: string
  marca_nombre: string
  marca_emoji: string | null
  fecha_planeada: string
  fecha_real: string | null
  estado: GrabacionEstado
  videos_grabados: number | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type MarcaKPI = {
  marca_id: string
  marca_slug: string
  marca_nombre: string
  marca_emoji: string | null
  color_primario_hex: string | null
  objetivo: number      // grabaciones_objetivo_mensual de la marca
  planeadas: number     // count estado='planeada' en el rango
  cumplidas: number     // count estado='cumplida' en el rango
  canceladas: number    // count estado='cancelada' en el rango
  total: number         // planeadas + cumplidas + canceladas
  cumplimiento_pct: number  // cumplidas / objetivo (0-100+)
}

/**
 * Lista todas las grabaciones de un rango de fechas (default: mes actual).
 * JOIN con marcas para incluir info denormalizada útil en UI.
 */
export async function listGrabaciones(
  desde?: string,
  hasta?: string,
): Promise<{ ok: true; rows: GrabacionWithMarca[] } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Default: mes actual
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)
  const d = desde ?? firstDay
  const h = hasta ?? lastDay

  const { data, error } = await service
    .from('grabaciones')
    .select('id, marca_id, fecha_planeada, fecha_real, estado, videos_grabados, notas, created_at, updated_at, marcas:marca_id (slug, nombre, emoji_marca)')
    .gte('fecha_planeada', d)
    .lte('fecha_planeada', h)
    .order('fecha_planeada', { ascending: false })

  if (error) {
    // Tolerar tabla no existe (migration 016 pendiente)
    if ((error.message ?? '').includes('does not exist') || (error.message ?? '').includes('relation')) {
      return { ok: true, rows: [] }
    }
    return { ok: false, error: error.message }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: GrabacionWithMarca[] = (data ?? []).map((r: any) => ({
    id: r.id,
    marca_id: r.marca_id,
    marca_slug: r.marcas?.slug ?? '',
    marca_nombre: r.marcas?.nombre ?? '?',
    marca_emoji: r.marcas?.emoji_marca ?? null,
    fecha_planeada: r.fecha_planeada,
    fecha_real: r.fecha_real,
    estado: r.estado as GrabacionEstado,
    videos_grabados: r.videos_grabados,
    notas: r.notas,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }))

  return { ok: true, rows }
}

/**
 * KPIs por marca para el rango. Agrupa grabaciones + cruza con objetivo mensual.
 */
export async function getGrabacionesKPIs(
  desde?: string,
  hasta?: string,
): Promise<{ ok: true; kpis: MarcaKPI[] } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Default: mes actual
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)
  const d = desde ?? firstDay
  const h = hasta ?? lastDay

  // Cargar todas las marcas activas (con grabaciones_objetivo_mensual o sin)
  // Tolerar columna no existente para pre-migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let marcas: any[] = []
  {
    const r1 = await service
      .from('marcas')
      .select('id, slug, nombre, emoji_marca, color_primario_hex, grabaciones_objetivo_mensual')
      .eq('activa', true)
      .order('slug')
    if (r1.error && (r1.error.message ?? '').includes('does not exist')) {
      const r2 = await service
        .from('marcas')
        .select('id, slug, nombre, emoji_marca, color_primario_hex')
        .eq('activa', true)
        .order('slug')
      marcas = r2.data ?? []
    } else {
      marcas = r1.data ?? []
    }
  }

  // Cargar grabaciones del rango
  const listResult = await listGrabaciones(d, h)
  if (!listResult.ok) return listResult
  const rows = listResult.rows

  // Agregar por marca
  const kpis: MarcaKPI[] = marcas.map((m) => {
    const enMarca = rows.filter((r) => r.marca_id === m.id)
    const planeadas = enMarca.filter((r) => r.estado === 'planeada').length
    const cumplidas = enMarca.filter((r) => r.estado === 'cumplida').length
    const canceladas = enMarca.filter((r) => r.estado === 'cancelada').length
    const objetivo = (m.grabaciones_objetivo_mensual ?? 0) as number
    const total = planeadas + cumplidas + canceladas
    const cumplimiento_pct = objetivo > 0 ? Math.round((cumplidas / objetivo) * 100) : 0

    return {
      marca_id: m.id,
      marca_slug: m.slug,
      marca_nombre: m.nombre,
      marca_emoji: m.emoji_marca,
      color_primario_hex: m.color_primario_hex,
      objetivo,
      planeadas,
      cumplidas,
      canceladas,
      total,
      cumplimiento_pct,
    }
  })

  return { ok: true, kpis }
}

/**
 * Crear nueva grabación planeada.
 */
export async function createGrabacion(args: {
  marca_slug: string
  fecha_planeada: string
  notas?: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Resolver marca_id por slug
  const { data: marca } = await service
    .from('marcas')
    .select('id')
    .eq('slug', args.marca_slug)
    .maybeSingle()
  if (!marca) return { ok: false, error: `Marca '${args.marca_slug}' no encontrada` }

  const { data, error } = await service
    .from('grabaciones')
    .insert({
      marca_id: marca.id,
      fecha_planeada: args.fecha_planeada,
      estado: 'planeada',
      notas: args.notas?.trim() || null,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath('/grabaciones')
  return { ok: true, id: data.id }
}

/**
 * Cambiar estado de una grabación. Si cumplida y no se pasa fecha_real, usa hoy.
 */
export async function updateGrabacionEstado(args: {
  id: string
  estado: GrabacionEstado
  fecha_real?: string | null
  videos_grabados?: number | null
  notas?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = { estado: args.estado }
  if (args.estado === 'cumplida') {
    payload.fecha_real = args.fecha_real ?? new Date().toISOString().slice(0, 10)
    if (args.videos_grabados !== undefined) payload.videos_grabados = args.videos_grabados
  } else if (args.estado === 'cancelada') {
    payload.fecha_real = null
  } else {
    // 'planeada' — reset fecha_real
    payload.fecha_real = null
  }
  if (args.notas !== undefined) payload.notas = args.notas?.trim() || null

  const { error } = await service.from('grabaciones').update(payload).eq('id', args.id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/grabaciones')
  return { ok: true }
}

/**
 * Borrar grabación (rare path — solo para limpieza de errores).
 */
export async function deleteGrabacion(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service.from('grabaciones').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/grabaciones')
  return { ok: true }
}

/**
 * Actualiza el objetivo mensual de grabaciones de una marca.
 */
export async function updateMarcaObjetivoMensual(
  slug: string,
  objetivo: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  if (objetivo < 0 || objetivo > 100) {
    return { ok: false, error: 'Objetivo debe estar entre 0 y 100' }
  }
  const { error } = await service
    .from('marcas')
    .update({ grabaciones_objetivo_mensual: objetivo })
    .eq('slug', slug)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/grabaciones')
  return { ok: true }
}
