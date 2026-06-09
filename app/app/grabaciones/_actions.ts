// app/app/grabaciones/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/integrations/google-calendar'
import type { GrabacionEstado } from '@/lib/types/database'

/* Título del evento de grabación en Google Calendar. */
function eventoTitulo(marcaNombre: string): string {
  return `🎬 Grabación · ${marcaNombre}`
}

export type GrabacionWithMarca = {
  id: string
  marca_id: string
  marca_slug: string
  marca_nombre: string
  marca_emoji: string | null
  fecha_planeada: string
  hora_planeada: string | null   // HH:MM o HH:MM:SS — opcional
  fecha_real: string | null
  hora_real: string | null
  estado: GrabacionEstado
  videos_grabados: number | null
  notas: string | null
  google_event_id: string | null   // ID del evento en Google Calendar (sync)
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
  notas: string | null  // notas_grabaciones — texto libre editable inline
  planeadas: number     // count estado='planeada' en el rango
  cumplidas: number     // count estado='cumplida' en el rango
  canceladas: number    // count estado='cancelada' en el rango
  total: number         // planeadas + cumplidas + canceladas
  cumplimiento_pct: number  // cumplidas / objetivo (0-100+)
  grabaciones: GrabacionWithMarca[]   // fechas de esta marca en el rango, ordenadas
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
    .select('id, marca_id, fecha_planeada, hora_planeada, fecha_real, hora_real, estado, videos_grabados, notas, google_event_id, created_at, updated_at, marcas:marca_id (slug, nombre, emoji_marca)')
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
    hora_planeada: r.hora_planeada ?? null,
    fecha_real: r.fecha_real,
    hora_real: r.hora_real ?? null,
    estado: r.estado as GrabacionEstado,
    videos_grabados: r.videos_grabados,
    notas: r.notas,
    google_event_id: r.google_event_id ?? null,
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
  /* SELECT con notas_grabaciones (columna nueva). Si la migration
     aún no se aplicó (proyecto pausado, etc.), retrocedemos a un
     SELECT sin esa columna — y `notas` queda como null en el KPI. */
  let marcas: any[] = []
  {
    const r1 = await service
      .from('marcas')
      .select('id, slug, nombre, emoji_marca, color_primario_hex, grabaciones_objetivo_mensual, notas_grabaciones')
      .eq('activa', true)
      .order('slug')
    if (r1.error && (r1.error.message ?? '').includes('does not exist')) {
      // Fallback 1: sin notas_grabaciones
      const r2 = await service
        .from('marcas')
        .select('id, slug, nombre, emoji_marca, color_primario_hex, grabaciones_objetivo_mensual')
        .eq('activa', true)
        .order('slug')
      if (r2.error && (r2.error.message ?? '').includes('does not exist')) {
        // Fallback 2: sin grabaciones_objetivo_mensual tampoco
        const r3 = await service
          .from('marcas')
          .select('id, slug, nombre, emoji_marca, color_primario_hex')
          .eq('activa', true)
          .order('slug')
        marcas = r3.data ?? []
      } else {
        marcas = r2.data ?? []
      }
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
    // Grabaciones de esta marca, ordenadas por fecha ascendente (próximas primero)
    const enMarca = rows
      .filter((r) => r.marca_id === m.id)
      .sort((a, b) => a.fecha_planeada.localeCompare(b.fecha_planeada))
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
      notas: (m.notas_grabaciones ?? null) as string | null,
      planeadas,
      cumplidas,
      canceladas,
      total,
      cumplimiento_pct,
      grabaciones: enMarca,
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

  // Resolver marca_id + nombre por slug
  const { data: marca } = await service
    .from('marcas')
    .select('id, nombre')
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

  // Sync con Google Calendar (best-effort — no bloquea si no está conectado)
  try {
    const ev = await createCalendarEvent({
      summary: eventoTitulo(marca.nombre),
      description: args.notas?.trim() || `Sesión de grabación planificada para ${marca.nombre}.`,
      date: args.fecha_planeada,
    })
    if (ev.ok) {
      await service.from('grabaciones').update({ google_event_id: ev.eventId }).eq('id', data.id)
    }
  } catch { /* GCal no conectado o falló — la grabación ya se guardó igual */ }

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

  // Borrar el evento de GCal ANTES de borrar la row (best-effort)
  try {
    const { data: g } = await service
      .from('grabaciones')
      .select('google_event_id')
      .eq('id', id)
      .maybeSingle()
    if (g?.google_event_id) {
      await deleteCalendarEvent(g.google_event_id)
    }
  } catch { /* best-effort */ }

  const { error } = await service.from('grabaciones').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/grabaciones')
  return { ok: true }
}

/**
 * Cambiar la fecha planeada (y opcionalmente la hora) de una grabación
 * existente. Usado por el editor inline en cada card de marca.
 *
 * - fecha_planeada: YYYY-MM-DD (requerido)
 * - hora_planeada:  HH:MM o HH:MM:SS (opcional). null/undefined = sin hora
 *   específica (solo día).
 */
export async function updateGrabacionFecha(
  id: string,
  fecha_planeada: string,
  hora_planeada?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  if (!fecha_planeada) return { ok: false, error: 'Fecha requerida' }

  /* Normalize: empty string → null para que BD limpie correctamente */
  const horaNormalizada =
    hora_planeada === undefined ? undefined :
    hora_planeada === null || hora_planeada.trim() === '' ? null :
    hora_planeada

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: any = { fecha_planeada }
  if (horaNormalizada !== undefined) patch.hora_planeada = horaNormalizada

  const { error } = await service
    .from('grabaciones')
    .update(patch)
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  // Sync GCal: mover el evento a la nueva fecha (best-effort)
  try {
    const { data: g } = await service
      .from('grabaciones')
      .select('google_event_id, marcas:marca_id (nombre)')
      .eq('id', id)
      .maybeSingle()
    if (g?.google_event_id) {
      await updateCalendarEvent(g.google_event_id, {
        summary: eventoTitulo(g.marcas?.nombre ?? 'Marca'),
        date: fecha_planeada,
      })
    }
  } catch { /* best-effort */ }

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

/**
 * Actualiza las notas operativas de grabación de una marca (texto libre).
 * Se guarda en marcas.notas_grabaciones (columna agregada en migración 024).
 * Si la migración aún no se aplicó, retorna error legible.
 */
export async function updateMarcaNotasGrabaciones(
  slug: string,
  notas: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Hard limit: 2000 chars. Suficiente para notas operativas y previene
     payloads enormes accidentales. */
  if (notas.length > 2000) {
    return { ok: false, error: 'Las notas no pueden superar los 2000 caracteres' }
  }

  /* Empty string → null para limpieza visual en BD. */
  const value = notas.trim().length === 0 ? null : notas

  const { error } = await service
    .from('marcas')
    .update({ notas_grabaciones: value })
    .eq('slug', slug)

  if (error) {
    if ((error.message ?? '').includes('does not exist')) {
      return { ok: false, error: 'Migración 024 pendiente — pide a Pedro aplicarla en Supabase' }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/grabaciones')
  return { ok: true }
}
