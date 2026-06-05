// app/app/editor/_actions.ts
//
// Server actions específicas de /editor. La vista hace edición INLINE
// de la tabla (nombre, editor, fechas, estado, marcar para hoy) y cada
// cambio debe persistir a Supabase. Pedro pidió que NO sea solo state
// local — al refrescar, los cambios tienen que mantenerse.
//
// Reusamos updatePublicacion del módulo de publicaciones para evitar
// duplicar la lógica de defensa contra columnas pendientes, y agregamos
// específicamente los toggles de "Editar hoy" que tocan la columna nueva
// fecha_marcada_para_editar (migration 026).

'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'

type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Marca esta publicación como "voy a editarla hoy" (set
 * fecha_marcada_para_editar = CURRENT_DATE). El filtro "Mi trabajo para
 * hoy" en /editor muestra solo las marcadas con la fecha de hoy — las
 * de ayer expiran solas (no hay que limpiar).
 */
export async function marcarParaEditarHoy(id: string): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Usamos `new Date().toISOString().slice(0, 10)` (YYYY-MM-DD) en
     lugar de CURRENT_DATE de Postgres para que la fecha sea la del
     navegador del editor, no la del server (que podría estar en UTC
     y dar la fecha del día siguiente). */
  const hoy = new Date().toISOString().slice(0, 10)
  const { error } = await service
    .from('publicaciones')
    .update({ fecha_marcada_para_editar: hoy, updated_by: user.id })
    .eq('id', id)

  if (error) {
    if (error.code === '42703' || /column .* does not exist/i.test(error.message ?? '')) {
      return {
        ok: false,
        error: 'Migration 026 pendiente: falta columna fecha_marcada_para_editar. Aplicar desde Supabase Dashboard → SQL Editor.',
      }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/editor')
  return { ok: true }
}

/**
 * Quita la marca "Editar hoy". El editor puede deshacerlo desde la
 * misma tabla si se equivocó al marcar.
 */
export async function desmarcarParaEditarHoy(id: string): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service
    .from('publicaciones')
    .update({ fecha_marcada_para_editar: null, updated_by: user.id })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/editor')
  return { ok: true }
}

/**
 * Update genérico desde la tabla editor — los campos editables inline.
 * Convierte editorId a editor_id en el patch para mantener el contrato
 * limpio en el cliente (donde la columna se llama editorId en EditorEntry).
 *
 * Pasa por updatePublicacion para reutilizar el retry sin video_*_url
 * cuando la migration 025 está pendiente.
 */
export async function updateEditorEntry(
  id: string,
  patch: {
    nombre?: string
    editorId?: string | null
    estado?: string
    fechaPublicacion?: string  // grilla FIT
    fechaEdicion?: string
    enlaceTomas?: string | null
  },
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Map a snake_case de la BD */
  const update: Record<string, unknown> = { updated_by: user.id }
  if (patch.nombre !== undefined) update.nombre = patch.nombre
  if (patch.editorId !== undefined) update.editor_id = patch.editorId
  if (patch.estado !== undefined) update.estado = patch.estado
  if (patch.fechaPublicacion !== undefined) update.fecha_publicacion = patch.fechaPublicacion
  if (patch.fechaEdicion !== undefined) update.fecha_edicion = patch.fechaEdicion
  if (patch.enlaceTomas !== undefined) update.enlace_tomas = patch.enlaceTomas

  /* Lookup del nombre del editor para mantener la columna
     denormalizada editor_nombre en sync (la usa el WhatsApp digest
     y el sync de Notion). */
  if (patch.editorId !== undefined) {
    if (patch.editorId) {
      const { data: ed } = await service
        .from('editores')
        .select('nombre')
        .eq('id', patch.editorId)
        .maybeSingle()
      update.editor_nombre = ed?.nombre ?? null
    } else {
      update.editor_nombre = null
    }
  }

  const { error } = await service.from('publicaciones').update(update).eq('id', id)
  if (error) {
    console.error('[updateEditorEntry] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/editor')
  revalidatePath(`/publicaciones/${id}`)
  return { ok: true }
}
