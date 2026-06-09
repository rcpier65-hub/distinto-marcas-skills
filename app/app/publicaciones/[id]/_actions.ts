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
  /* Motivo de pausa — solo se setea cuando estado_tarea pasa a 'pausada'.
     Al reanudar (estado_tarea ≠ pausada) se limpia a null. */
  motivo_pausa?: string | null
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

  let { error } = await service.from('publicaciones').update(update).eq('id', id)

  // DEFENSIVO contra migraciones pendientes: si el UPDATE falla porque una
  // columna no existe (Postgres error 42703 = undefined_column), quitamos
  // las columnas "opcionales" (features nuevas sin migración aplicada todavía)
  // y reintentamos. Sin esto, una columna faltante bloqueaba TODO el guardado
  // — incluido el editor (bug que Pedro detectó: cambiaba editor, no persistía,
  // porque el form mandaba video_*_url sin que existieran esas columnas).
  if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message ?? ''))) {
    const OPTIONAL_COLS = ['video_sin_musica_url', 'video_con_musica_url']
    let removedAny = false
    for (const col of OPTIONAL_COLS) {
      if (col in update) { delete update[col]; removedAny = true }
    }
    if (removedAny) {
      const retry = await service.from('publicaciones').update(update).eq('id', id)
      error = retry.error
    }
  }

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
 * Guarda el texto del guion técnico (campo `guion`). Pedro pidió cambiar
 * la tabla estructurada por un textarea libre para poder pegar el guion
 * tal cual como está en Notion (tabla con tabs, párrafos, lo que sea).
 *
 * Auto-save: se llama al onBlur del textarea, no requiere botón.
 */
export async function updateGuionTexto(
  id: string,
  guion: string,
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service
    .from('publicaciones')
    .update({ guion: guion || null, updated_by: user.id })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/publicaciones/${id}`)
  return { ok: true }
}

/**
 * Borra una publicación. Hard delete por ahora.
 * Si en el futuro queremos soft delete, cambiar a UPDATE estado='archivado'.
 *
 * @param returnTo - ruta a donde redirigir DESPUÉS del delete. Default
 *   '/publicaciones'. El módulo Diseño pasa '/diseno' y el Editor
 *   pasa '/editor' para que el user vuelva al listado correcto según
 *   desde dónde haya entrado. Importante para Ailyn (diseñadora) y
 *   Pieer (editor) que NO tienen acceso a /publicaciones.
 */
export async function deletePublicacion(
  id: string,
  returnTo: string = '/publicaciones',
): Promise<void> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { error } = await service.from('publicaciones').delete().eq('id', id)
  if (error) {
    console.error('[deletePublicacion] error:', error)
    throw new Error(`No se pudo eliminar: ${error.message}`)
  }

  /* Revalidamos todas las rutas que listan publicaciones, no solo la
     de retorno — alguien podría tener /editor en otra pestaña. */
  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')
  revalidatePath('/diseno')
  revalidatePath('/editor')
  revalidatePath('/cockpit')
  revalidatePath('/inicio')

  /* Validar que returnTo sea una ruta interna (no URL externa) */
  const safeReturn = returnTo.startsWith('/') ? returnTo : '/publicaciones'
  redirect(safeReturn)
}
