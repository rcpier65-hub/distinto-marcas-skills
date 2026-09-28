// app/lib/grabaciones/consultar.ts
// Misma lectura que listGrabaciones. La auth queda en el server action
// (cookie) o en /api/v1 (sesión, JWT o dst_live_).

import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import type { GrabacionEstado } from '@/lib/types/database'
import type { GrabacionWithMarca } from '@/app/grabaciones/_actions'

export async function consultarGrabaciones(
  desde?: string,
  hasta?: string,
): Promise<{ ok: true; rows: GrabacionWithMarca[] } | { ok: false; error: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Default: mes actual
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)
  const d = desde ?? firstDay
  const h = hasta ?? lastDay

  const FULL_COLS = 'id, marca_id, fecha_planeada, hora_planeada, duracion_min, guion_listo, fecha_real, hora_real, estado, videos_grabados, notas, enlace_guiones, google_event_id, created_at, updated_at, marcas:marca_id (slug, nombre, emoji_marca)'
  const BASE_COLS = 'id, marca_id, fecha_planeada, hora_planeada, fecha_real, hora_real, estado, videos_grabados, notas, enlace_guiones, google_event_id, created_at, updated_at, marcas:marca_id (slug, nombre, emoji_marca)'

  let res = await service
    .from('grabaciones')
    .select(FULL_COLS)
    .gte('fecha_planeada', d)
    .lte('fecha_planeada', h)
    .order('fecha_planeada', { ascending: false })
  /* Defensive SELECT: si duracion_min o guion_listo no existen aún
     (migration 028/029 pendiente), reintenta con columnas base — la UI
     usa defaults (60 min / guion no-listo) en lugar de leer de BD. */
  if (res.error && /(duracion_min|guion_listo)/i.test(res.error.message ?? '')) {
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
    guion_listo: r.guion_listo ?? false,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }))

  return { ok: true, rows }
}
