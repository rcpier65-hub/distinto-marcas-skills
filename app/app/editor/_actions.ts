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

  /* AUTO-SET de editado_at cuando el estado pasa de 'editar' a uno
     avanzado (aprobar/programar/publicar/publicado) por primera vez.
     Necesitamos leer editado_at actual para no sobreescribir si ya
     había uno (Pedro: "el tiempo se calcula desde la PRIMERA vez que
     pasó a aprobar", no la última).

     Sólo aplicamos si patch.estado viene definido y es estado avanzado. */
  const ESTADOS_AVANZADOS = ['aprobar', 'programar', 'programar_anuncios', 'publicar', 'publicado', 'enviado']
  if (patch.estado !== undefined && ESTADOS_AVANZADOS.includes(patch.estado)) {
    const { data: actual } = await service
      .from('publicaciones')
      .select('estado, editado_at')
      .eq('id', id)
      .maybeSingle()
    /* Set editado_at solo si:
       - editado_at está null (primera vez que termina)
       - el estado actual era 'editar' o 'editando' o 'borrador' (no
         estaba ya en avanzado) — protege contra updates idempotentes */
    if (actual && !actual.editado_at) {
      update.editado_at = new Date().toISOString()
    }
  }

  let { error } = await service.from('publicaciones').update(update).eq('id', id)

  /* DEFENSIVO: si editado_at no existe (migration 027 pendiente),
     retry sin esa columna para no bloquear el resto del update. */
  if (error && (error.code === '42703' || /editado_at|iniciado_edicion_at/i.test(error.message ?? ''))) {
    delete update.editado_at
    delete update.iniciado_edicion_at
    const retry = await service.from('publicaciones').update(update).eq('id', id)
    error = retry.error
  }

  if (error) {
    console.error('[updateEditorEntry] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/editor')
  revalidatePath(`/publicaciones/${id}`)
  return { ok: true }
}

/**
 * Marca una publicación como "en edición activa" — registra el
 * timestamp de inicio. Aparece en la fila como botón cambiando a
 * "⏸ Editando..." con color destacado. Se compara con editado_at
 * más tarde para calcular el tiempo total de edición.
 */
export async function marcarEnEdicion(id: string): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { error } = await service
    .from('publicaciones')
    .update({ iniciado_edicion_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', id)
  if (error) {
    if (error.code === '42703' || /iniciado_edicion_at/i.test(error.message ?? '')) {
      return { ok: false, error: 'Migration 027 pendiente: falta columna iniciado_edicion_at.' }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/editor')
  return { ok: true }
}

/**
 * Crea una nueva publicación con datos mínimos. Pedro pidió un botón
 * "+" en /editor para empezar tareas rápido — esta action recibe solo
 * marca + nombre, crea la publicación con valores razonables por
 * defecto (estado=editar, fecha_publicacion = hoy + 7 días), y
 * devuelve el id para que el cliente redireccione a /publicaciones/[id]
 * donde el editor completa el resto.
 *
 * El editor opcional, si se pasa, queda asignado de entrada.
 */
export async function crearPublicacion(args: {
  marcaId: string
  nombre: string
  editorId?: string | null
  fechaPublicacion?: string  // ISO YYYY-MM-DD; default = hoy + 7 días
  fechaEdicion?: string      // ISO YYYY-MM-DD; default = hoy + 4 días
                             // (3 días antes de publicación → arranca en verde)
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const nombre = args.nombre.trim()
  if (!nombre) return { ok: false, error: 'El nombre es obligatorio' }
  if (!args.marcaId) return { ok: false, error: 'La marca es obligatoria' }

  /* Default: fecha publicación = hoy + 7 días (una semana de margen
     razonable para que la alerta de fecha arranque en VERDE). */
  let fechaPub = args.fechaPublicacion
  if (!fechaPub) {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    fechaPub = d.toISOString().slice(0, 10)
  }
  /* Default fecha edición: 3 días antes de publicación → cae en
     VERDE (4+ días de margen ya no aplica, así que va en AMARILLO
     en realidad — pero mejor mostrar el patrón al editor). */
  let fechaEd = args.fechaEdicion
  if (!fechaEd) {
    const pubDate = new Date(fechaPub + 'T00:00:00')
    pubDate.setDate(pubDate.getDate() - 3)
    fechaEd = pubDate.toISOString().slice(0, 10)
  }

  /* Lookup nombre del editor para guardar denormalizado. */
  let editorNombre: string | null = null
  if (args.editorId) {
    const { data: ed } = await service
      .from('editores')
      .select('nombre')
      .eq('id', args.editorId)
      .maybeSingle()
    editorNombre = ed?.nombre ?? null
  }

  const { data, error } = await service
    .from('publicaciones')
    .insert({
      marca_id: args.marcaId,
      nombre,
      estado: 'editar',
      estado_tarea: 'sin_empezar',
      fecha_publicacion: fechaPub,
      fecha_edicion: fechaEd,
      editor_id: args.editorId ?? null,
      editor_nombre: editorNombre,
      plataformas: [],
      tipo_contenido: [],
      objetivos: [],
      copy_listo: false,
      musica_lista: false,
      portada_lista: false,
      disenado: false,
      editado: false,
      video_aprobado: false,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .maybeSingle()

  if (error || !data) {
    console.error('[crearPublicacion] error:', error)
    return { ok: false, error: error?.message ?? 'No se pudo crear la tarea' }
  }

  revalidatePath('/editor')
  revalidatePath('/publicaciones')
  return { ok: true, id: data.id }
}

/**
 * Quita el flag "en edición" (por si el editor lo activó por error).
 * También se puede usar para reiniciar el cronómetro.
 */
export async function desmarcarEnEdicion(id: string): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { error } = await service
    .from('publicaciones')
    .update({ iniciado_edicion_at: null, updated_by: user.id })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/editor')
  return { ok: true }
}
