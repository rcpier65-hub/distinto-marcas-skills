// app/app/grabaciones/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import {
  createCalendarEvent,
  createTimedEvent,
  createReunionEvent,
  updateCalendarEvent,
  updateTimedCalendarEvent,
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
  /* Pedro: 'añade un espacio para poner enlace de guiones'. Suele ser
     una URL de Google Drive con los guiones que se van a grabar. */
  enlace_guiones: string | null
  google_event_id: string | null   // ID del evento en Google Calendar (sync)
  /* Duración del bloque en GCal (min). Combinada con hora_planeada
     da el rango start/end del evento. Default 60. */
  duracion_min: number | null
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
  /* Pedro: 'añade un check marcarle y creíble debajo del card'.
     Si está en true → la coordinación con el cliente está confirmada y
     las fechas son realistas. Si está en false → mostrar alerta. */
  coordinacionConfirmada: boolean
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

  const FULL_COLS = 'id, marca_id, fecha_planeada, hora_planeada, duracion_min, fecha_real, hora_real, estado, videos_grabados, notas, enlace_guiones, google_event_id, created_at, updated_at, marcas:marca_id (slug, nombre, emoji_marca)'
  const BASE_COLS = 'id, marca_id, fecha_planeada, hora_planeada, fecha_real, hora_real, estado, videos_grabados, notas, enlace_guiones, google_event_id, created_at, updated_at, marcas:marca_id (slug, nombre, emoji_marca)'

  let res = await service
    .from('grabaciones')
    .select(FULL_COLS)
    .gte('fecha_planeada', d)
    .lte('fecha_planeada', h)
    .order('fecha_planeada', { ascending: false })
  /* Defensive SELECT: si duracion_min no existe aún (migration 028
     pendiente), reintenta con columnas base — la UI muestra default 60
     en lugar de leer de BD. */
  if (res.error && /duracion_min/i.test(res.error.message ?? '')) {
    res = await service
      .from('grabaciones')
      .select(BASE_COLS)
      .gte('fecha_planeada', d)
      .lte('fecha_planeada', h)
      .order('fecha_planeada', { ascending: false })
  }
  const { data, error } = res

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
    enlace_guiones: r.enlace_guiones ?? null,
    google_event_id: r.google_event_id ?? null,
    duracion_min: r.duracion_min ?? null,
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
      .select('id, slug, nombre, emoji_marca, color_primario_hex, grabaciones_objetivo_mensual, notas_grabaciones, grabaciones_confirmadas_mes')
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
      coordinacionConfirmada: Boolean(m.grabaciones_confirmadas_mes),
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
 * Crear nueva grabación con campos estilo Google Calendar:
 * título, fecha, hora inicio, duración, descripción, y opcionalmente Meet
 * con invitados. Crea el evento en GCal como dateTime (no all-day) y guarda
 * google_event_id + meet_link para poder modificar/borrar después.
 *
 * Defensive: si la migration 028 (columnas titulo/duracion_min/es_reunion_meet/
 * meet_link/invitados_emails) NO se aplicó aún, reintenta el insert con SOLO
 * las columnas base. Así la app no se rompe en deploys donde el SQL no se
 * corrió todavía — el evento de GCal igual queda completo, solo no
 * persistimos el detalle en BD.
 */
export async function createGrabacion(args: {
  marca_slug: string
  titulo?: string
  fecha_planeada: string
  hora_planeada?: string          // HH:MM — si null/undefined, evento all-day
  duracion_min?: number           // default 60
  descripcion?: string | null
  es_reunion_meet?: boolean
  invitados_emails?: string[]
  // Legacy compat — algunos callers viejos pasan 'notas'.
  notas?: string
}): Promise<
  | { ok: true; id: string; gcalSynced: boolean; meetLink: string | null }
  | { ok: false; error: string }
> {
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

  const titulo = args.titulo?.trim() || `Grabación – ${marca.nombre}`
  const descripcion = args.descripcion?.trim() || args.notas?.trim() || null
  const duracion = Math.max(5, Math.min(720, args.duracion_min ?? 60))
  const esMeet = !!args.es_reunion_meet
  const invitados = (args.invitados_emails ?? []).filter((e) => e && /@/.test(e))

  // Intento 1: insert FULL (con todas las columnas nuevas).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertFull: Record<string, any> = {
    marca_id: marca.id,
    fecha_planeada: args.fecha_planeada,
    hora_planeada: args.hora_planeada ?? null,
    estado: 'planeada',
    notas: descripcion,
    titulo,
    duracion_min: duracion,
    es_reunion_meet: esMeet,
    invitados_emails: invitados.length > 0 ? invitados : null,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertBase: Record<string, any> = {
    marca_id: marca.id,
    fecha_planeada: args.fecha_planeada,
    estado: 'planeada',
    notas: descripcion,
  }

  let inserted = await service
    .from('grabaciones')
    .insert(insertFull)
    .select('id')
    .single()

  // Si falla por columnas ausentes (42703 / "column does not exist"), reintentar
  // con set mínimo de columnas que sabemos que siempre existen.
  if (inserted.error && (inserted.error.code === '42703' || /column .* does not exist|titulo|duracion_min|es_reunion_meet|invitados_emails/i.test(inserted.error.message ?? ''))) {
    inserted = await service
      .from('grabaciones')
      .insert(insertBase)
      .select('id')
      .single()
  }
  if (inserted.error) return { ok: false, error: inserted.error.message }
  const grabId = inserted.data.id as string

  // Sync con Google Calendar — elige método según es_reunion_meet + si hay hora.
  // Best-effort: si GCal no está conectado o falla, la grabación queda guardada
  // y reportamos gcalSynced=false para que la UI muestre el mensaje correcto.
  let gcalSynced = false
  let meetLink: string | null = null
  try {
    if (esMeet && args.hora_planeada) {
      const ev = await createReunionEvent({
        summary: titulo,
        description: descripcion ?? `Sesión de grabación – ${marca.nombre}.`,
        fecha: args.fecha_planeada,
        hora: args.hora_planeada,
        durationMin: duracion,
        attendees: invitados,
      })
      if (ev.ok) {
        gcalSynced = true
        meetLink = ev.meetLink
        // Defensive update — si meet_link no existe en BD, ignora silenciosamente.
        await service
          .from('grabaciones')
          .update({ google_event_id: ev.eventId, meet_link: ev.meetLink })
          .eq('id', grabId)
          .then(async (r: { error: { code?: string; message?: string } | null }) => {
            if (r.error && /meet_link/i.test(r.error.message ?? '')) {
              await service
                .from('grabaciones')
                .update({ google_event_id: ev.eventId })
                .eq('id', grabId)
            }
          })
      }
    } else if (args.hora_planeada) {
      // Evento con hora pero sin Meet.
      const ev = await createTimedEvent({
        summary: titulo,
        description: descripcion ?? `Sesión de grabación – ${marca.nombre}.`,
        fecha: args.fecha_planeada,
        hora: args.hora_planeada,
        durationMin: duracion,
      })
      if (ev.ok) {
        gcalSynced = true
        await service.from('grabaciones').update({ google_event_id: ev.eventId }).eq('id', grabId)
      }
    } else {
      // Sin hora: evento all-day (comportamiento legacy).
      const ev = await createCalendarEvent({
        summary: titulo,
        description: descripcion ?? `Sesión de grabación para ${marca.nombre}.`,
        date: args.fecha_planeada,
      })
      if (ev.ok) {
        gcalSynced = true
        await service.from('grabaciones').update({ google_event_id: ev.eventId }).eq('id', grabId)
      }
    }
  } catch (e) {
    console.error('[grabaciones] GCal sync falló — sigo con la grabación local:', e)
  }

  revalidatePath('/grabaciones')
  revalidatePath('/grabaciones/calendario')
  return { ok: true, id: grabId, gcalSynced, meetLink }
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
  /* Nuevo: duración en minutos (si el caller calcula desde un input
     de hora-fin en la UI). Si viene, persiste en BD y se usa al
     resincronizar el evento de GCal para preservar el bloque end. */
  duracion_min?: number | null,
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
  if (typeof duracion_min === 'number' && duracion_min > 0) {
    patch.duracion_min = Math.max(5, Math.min(720, Math.round(duracion_min)))
  }

  let { error } = await service
    .from('grabaciones')
    .update(patch)
    .eq('id', id)
  /* Defensive: si la columna duracion_min no existe aún (migration 028
     pendiente), reintenta sin ese campo. La sincronización a GCal sigue
     funcionando con la duración calculada en memoria. */
  if (error && /duracion_min/i.test(error.message ?? '')) {
    delete patch.duracion_min
    const retry = await service.from('grabaciones').update(patch).eq('id', id)
    error = retry.error
  }
  if (error) return { ok: false, error: error.message }

  // Sync GCal: mover el evento a la nueva fecha (best-effort).
  // Bug fix: si la grabación tenía hora, ANTES usábamos updateCalendarEvent
  // (all-day) y el evento se convertía a all-day en GCal — perdías la hora.
  // Ahora si hay hora_planeada usamos updateTimedCalendarEvent que mantiene
  // dateTime + duration. Si no hay hora, fallback all-day como antes.
  try {
    const { data: g } = await service
      .from('grabaciones')
      .select('google_event_id, hora_planeada, duracion_min, titulo, notas, marcas:marca_id (nombre)')
      .eq('id', id)
      .maybeSingle()
    if (g?.google_event_id) {
      const titulo = g.titulo ?? eventoTitulo(g.marcas?.nombre ?? 'Marca')
      const horaFinal = horaNormalizada !== undefined ? horaNormalizada : g.hora_planeada
      if (horaFinal) {
        /* Si el caller pasó duracion_min usamos ese (vino del input
           hora-fin de la UI). Sino, el de BD (que puede ser viejo). */
        const durFinal = (typeof duracion_min === 'number' && duracion_min > 0)
          ? duracion_min
          : (g.duracion_min ?? 60)
        await updateTimedCalendarEvent(g.google_event_id, {
          summary: titulo,
          description: g.notas ?? undefined,
          fecha: fecha_planeada,
          hora: horaFinal,
          durationMin: durFinal,
        })
      } else {
        await updateCalendarEvent(g.google_event_id, {
          summary: titulo,
          date: fecha_planeada,
        })
      }
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

/**
 * Toggle del flag 'coordinación con cliente confirmada' por marca.
 * Pedro: 'añade un check marcarle y creíble debajo del card' → si está
 * en true, las grabaciones planeadas del mes son realistas y confirmadas.
 * Si false → mostramos alerta en el card sugiriendo coordinar con el cliente.
 */
export async function toggleCoordinacionConfirmada(
  slug: string,
  confirmada: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service
    .from('marcas')
    .update({ grabaciones_confirmadas_mes: confirmada })
    .eq('slug', slug)

  if (error) {
    if ((error.message ?? '').includes('does not exist')) {
      return { ok: false, error: 'Falta migración: ALTER TABLE marcas ADD COLUMN grabaciones_confirmadas_mes boolean' }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/grabaciones')
  return { ok: true }
}

/**
 * Guarda el enlace de guiones de una grabación. Pedro: 'añade un
 * espacio para poner enlace de guiones, suele ser un link de Drive'.
 * Empty string → null para limpieza visual. Validación mínima: máx 500
 * chars (URLs de Drive son largas pero entran cómodo).
 */
export async function updateGrabacionEnlaceGuiones(
  id: string,
  enlace: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const v = enlace.trim()
  if (v.length > 500) {
    return { ok: false, error: 'El enlace es muy largo (máx 500 caracteres)' }
  }
  const value = v.length === 0 ? null : v

  const { error } = await service
    .from('grabaciones')
    .update({ enlace_guiones: value })
    .eq('id', id)

  if (error) {
    if ((error.message ?? '').includes('does not exist')) {
      return { ok: false, error: 'Falta migración: ALTER TABLE grabaciones ADD COLUMN enlace_guiones text' }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/grabaciones')
  return { ok: true }
}
