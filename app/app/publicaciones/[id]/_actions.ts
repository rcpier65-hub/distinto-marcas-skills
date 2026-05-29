// app/app/publicaciones/[id]/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import type { EstadoPublicacion, EstadoTarea } from '@/lib/types/database'

export type UpdatePublicacionInput = {
  nombre?: string
  estado?: EstadoPublicacion
  estado_tarea?: EstadoTarea
  fecha_publicacion?: string | null
  fecha_edicion?: string | null
  fecha_diseno?: string | null
  plataformas?: string[]
  tipo_contenido?: string[]
  objetivos?: string[]
  copy?: string | null
  guion?: string | null
  enlace_tomas?: string | null
  enlace_musica?: string | null
  portada_cruda_url?: string | null
  portada_editada_url?: string | null
  video_sin_musica_url?: string | null  // Migration 025
  video_con_musica_url?: string | null  // Migration 025
  copy_listo?: boolean
  musica_lista?: boolean
  portada_lista?: boolean
  disenado?: boolean
  editado?: boolean
  video_aprobado?: boolean
  editor_nombre?: string | null
  editor_id?: string | null
  opcion_2?: string | null
  notas?: string | null
}

type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Actualiza una publicación. Solo se modifican los campos pasados (parcial).
 * Registra updated_by + bump updated_at (via trigger).
 */
export async function updatePublicacion(
  id: string,
  input: UpdatePublicacionInput,
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Sanitizar: solo pasar campos definidos, no undefined
  const update: Record<string, unknown> = { updated_by: user.id }
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) update[k] = v
  }

  if (Object.keys(update).length === 1) {
    return { ok: false, error: 'Sin cambios para guardar' }
  }

  // Sincronizar editor_nombre (columna desnormalizada) cuando cambia
  // editor_id. Hay 2 columnas para el editor: editor_id (FK) + editor_nombre
  // (texto). Mantenerlas en sync evita que reportes/WhatsApp que leen
  // editor_nombre muestren datos viejos. Si editor_id viene null → limpiar.
  if (input.editor_id !== undefined) {
    if (input.editor_id) {
      const { data: ed } = await service
        .from('editores')
        .select('nombre')
        .eq('id', input.editor_id)
        .maybeSingle()
      update.editor_nombre = ed?.nombre ?? null
    } else {
      update.editor_nombre = null
    }
  }

  const { error } = await service.from('publicaciones').update(update).eq('id', id)

  if (error) {
    console.error('[updatePublicacion] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath(`/publicaciones/${id}`)
  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')
  return { ok: true }
}

/**
 * Toggle de un campo booleano del checklist.
 * Útil para clicks rápidos en el detalle.
 */
export async function togglePublicacionField(
  id: string,
  field: 'copy_listo' | 'musica_lista' | 'portada_lista' | 'disenado' | 'editado' | 'video_aprobado',
  value: boolean,
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service
    .from('publicaciones')
    .update({ [field]: value, updated_by: user.id })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/publicaciones/${id}`)
  return { ok: true }
}

/**
 * Borra una publicación. Hard delete por ahora.
 * Si en el futuro queremos soft delete, cambiar a UPDATE estado='archivado'.
 */
export async function deletePublicacion(id: string): Promise<void> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service.from('publicaciones').delete().eq('id', id)
  if (error) {
    console.error('[deletePublicacion] error:', error)
    throw new Error(`No se pudo eliminar: ${error.message}`)
  }

  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')
  redirect('/publicaciones')
}
