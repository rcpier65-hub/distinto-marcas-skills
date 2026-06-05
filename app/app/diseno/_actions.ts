// app/app/diseno/_actions.ts
//
// Server actions específicas de /diseno. Patrón espejo de
// app/editor/_actions.ts: edición inline de la tabla, "marcar para hoy",
// toggles de portada lista / diseñado.
//
// Reusa publicaciones (no tabla paralela) y aprovecha el ENUM
// estado_tarea + columnas existentes (portada_lista, disenado, fecha_diseno).

'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import type { SubEstadoDiseno } from '@/lib/diseno/types'

type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Marca esta publicación como "voy a diseñarla hoy" — set
 * fecha_marcada_para_disenar = HOY. El filtro "Mi trabajo para hoy"
 * en /diseno muestra solo las marcadas con la fecha del día.
 */
export async function marcarParaDisenarHoy(id: string): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Usar la fecha del navegador (ISO YYYY-MM-DD) en lugar de
     CURRENT_DATE de Postgres — evita off-by-one cuando el server
     corre en UTC. Mismo truco que el módulo Editor. */
  const hoy = new Date().toISOString().slice(0, 10)
  const { error } = await service
    .from('publicaciones')
    .update({ fecha_marcada_para_disenar: hoy, updated_by: user.id })
    .eq('id', id)

  if (error) {
    if (error.code === '42703' || /column .* does not exist/i.test(error.message ?? '')) {
      return {
        ok: false,
        error: 'Migration 20260605200001 pendiente: falta columna fecha_marcada_para_disenar. Aplicar desde Supabase Dashboard → SQL Editor.',
      }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/diseno')
  return { ok: true }
}

/** Quitar la marca "Diseñar hoy". */
export async function desmarcarParaDisenarHoy(id: string): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service
    .from('publicaciones')
    .update({ fecha_marcada_para_disenar: null, updated_by: user.id })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/diseno')
  return { ok: true }
}

/**
 * Update genérico desde la tabla de diseño. Campos editables inline
 * por Ailyn o quien corresponda. Mismo patrón snake_case que editor.
 */
export async function updateDisenoEntry(
  id: string,
  patch: {
    nombre?: string
    disenadorId?: string | null
    estado?: string
    subEstado?: SubEstadoDiseno
    fechaPublicacion?: string  // deadline real
    fechaDiseno?: string       // cuándo se diseña
    portadaCrudaUrl?: string | null
    portadaEditadaUrl?: string | null
  },
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const update: Record<string, unknown> = { updated_by: user.id }
  if (patch.nombre !== undefined) update.nombre = patch.nombre
  if (patch.disenadorId !== undefined) update.disenador_id = patch.disenadorId
  if (patch.estado !== undefined) update.estado = patch.estado
  if (patch.subEstado !== undefined) update.estado_tarea = patch.subEstado
  if (patch.fechaPublicacion !== undefined) update.fecha_publicacion = patch.fechaPublicacion
  if (patch.fechaDiseno !== undefined) update.fecha_diseno = patch.fechaDiseno
  if (patch.portadaCrudaUrl !== undefined) update.portada_cruda_url = patch.portadaCrudaUrl
  if (patch.portadaEditadaUrl !== undefined) update.portada_editada_url = patch.portadaEditadaUrl

  /* Sync de disenador_nombre cuando cambia disenador_id — mantiene la
     denormalización para que reportes/sync no queden con nombre viejo. */
  if (patch.disenadorId !== undefined) {
    if (patch.disenadorId) {
      const { data: ds } = await service
        .from('disenadores')
        .select('nombre')
        .eq('id', patch.disenadorId)
        .maybeSingle()
      update.disenador_nombre = ds?.nombre ?? null
    } else {
      update.disenador_nombre = null
    }
  }

  const { error } = await service.from('publicaciones').update(update).eq('id', id)
  if (error) {
    console.error('[updateDisenoEntry] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/diseno')
  revalidatePath(`/publicaciones/${id}`)
  return { ok: true }
}

/**
 * Toggle del checkbox "Portada lista" — campo existente en publicaciones.
 * Separado de updateDisenoEntry para que la UI pueda hacer optimistic
 * update sin enviar todo el patch.
 */
export async function togglePortadaLista(id: string, value: boolean): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { error } = await service
    .from('publicaciones')
    .update({ portada_lista: value, updated_by: user.id })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/diseno')
  return { ok: true }
}

/** Toggle del checkbox "Diseñado" — workflow final del módulo. */
export async function toggleDisenado(id: string, value: boolean): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { error } = await service
    .from('publicaciones')
    .update({ disenado: value, updated_by: user.id })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/diseno')
  return { ok: true }
}
