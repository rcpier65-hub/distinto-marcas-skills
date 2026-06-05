// app/app/diseno/_actions.ts
//
// Server actions del módulo /diseno. Pedro pidió rediseño v2:
//   - Quitar toggles portada_lista y disenado de la tabla (no aplican
//     para el workflow real de Ailyn)
//   - Agregar descripcion + fecha_entrega + estado 'archivado'
//   - Crear tareas desde el módulo con formulario condicional
//     "¿es para publicar?" → si SÍ marca + fechas, si NO standalone

'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import type { SubEstadoDiseno } from '@/lib/diseno/types'

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

/**
 * Marca esta publicación como "voy a diseñarla hoy" — set
 * fecha_marcada_para_disenar = HOY.
 */
export async function marcarParaDisenarHoy(id: string): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const hoy = new Date().toISOString().slice(0, 10)
  const { error } = await service
    .from('publicaciones')
    .update({ fecha_marcada_para_disenar: hoy, updated_by: user.id })
    .eq('id', id)

  if (error) {
    if (error.code === '42703' || /column .* does not exist/i.test(error.message ?? '')) {
      return { ok: false, error: 'Migration 20260605200001 pendiente.' }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/diseno')
  return { ok: true }
}

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
 * Update genérico desde la tabla / kanban. Acepta los campos editables
 * de la v2: descripción, fecha entrega, fecha diseño, sub-estado,
 * nombre.
 */
export async function updateDisenoEntry(
  id: string,
  patch: {
    nombre?: string
    descripcion?: string | null
    subEstado?: SubEstadoDiseno
    fechaDiseno?: string | null
    fechaEntrega?: string | null
    fechaPublicacion?: string | null
  },
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const update: Record<string, unknown> = { updated_by: user.id }
  if (patch.nombre !== undefined) update.nombre = patch.nombre
  if (patch.descripcion !== undefined) update.descripcion = patch.descripcion
  if (patch.subEstado !== undefined) update.estado_tarea = patch.subEstado
  if (patch.fechaDiseno !== undefined) update.fecha_diseno = patch.fechaDiseno
  if (patch.fechaEntrega !== undefined) update.fecha_entrega = patch.fechaEntrega
  if (patch.fechaPublicacion !== undefined) update.fecha_publicacion = patch.fechaPublicacion

  let { error } = await service.from('publicaciones').update(update).eq('id', id)

  /* Defensive contra migration pendiente: si descripcion/fecha_entrega
     no existen aún, reintentamos sin esos campos. La UI seguirá
     funcionando en modo degradado hasta que se aplique. */
  if (error && (error.code === '42703' || /descripcion|fecha_entrega/i.test(error.message ?? ''))) {
    delete update.descripcion
    delete update.fecha_entrega
    const retry = await service.from('publicaciones').update(update).eq('id', id)
    error = retry.error
  }

  if (error) {
    console.error('[updateDisenoEntry] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/diseno')
  revalidatePath(`/publicaciones/${id}`)
  return { ok: true }
}

/**
 * Toggle de archivado — separa del updateDisenoEntry para acción
 * rápida sin enviar todo el patch.
 */
export async function archivarTarea(id: string, archivar: boolean): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const nuevo: SubEstadoDiseno = archivar ? 'archivado' : 'sin_empezar'
  const { error } = await service
    .from('publicaciones')
    .update({ estado_tarea: nuevo, updated_by: user.id })
    .eq('id', id)
  if (error) {
    if (error.code === '22P02' || /archivado/i.test(error.message ?? '')) {
      return { ok: false, error: 'Migration de archivado pendiente: ALTER TYPE estado_tarea ADD VALUE archivado.' }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/diseno')
  return { ok: true }
}

/**
 * Crea una nueva tarea desde el modal de /diseno.
 *
 * Dos modos:
 *   - PARA PUBLICAR: requiere marcaSlug + fechaPublicacion. Se inserta
 *     en publicaciones con esa marca; aparece auto en /publicaciones
 *     y en el calendario.
 *   - STANDALONE (Manual de marca, Banner web, etc): marca='interno'
 *     que se precarga en la migration. No aparece en filtros por marca
 *     cliente del módulo /publicaciones.
 *
 * Siempre crea con estado_tarea='sin_empezar', disenado=false. La
 * fecha_diseno y fecha_entrega pueden ser null al inicio.
 */
export async function crearDisenoTask(args: {
  nombre: string
  descripcion?: string | null
  fechaDiseno?: string | null
  fechaEntrega?: string | null
  // Modo A: para publicar
  esParaPublicar: boolean
  marcaSlug?: string                // ej. 'kintu', 'manrique'
  fechaPublicacion?: string | null
  fechaEdicion?: string | null
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const nombre = args.nombre.trim()
  if (!nombre) return { ok: false, error: 'Falta nombre de la tarea' }

  /* Resolvemos marca_id:
     - Si esParaPublicar=true → busca por marcaSlug (debe existir)
     - Si no → usa 'interno' (precargada en la migration) */
  const targetSlug = args.esParaPublicar ? args.marcaSlug : 'interno'
  if (args.esParaPublicar && !targetSlug) {
    return { ok: false, error: 'Falta seleccionar marca para tarea publicable' }
  }

  const { data: marca, error: errMarca } = await service
    .from('marcas')
    .select('id')
    .eq('slug', targetSlug)
    .maybeSingle()
  if (errMarca) return { ok: false, error: `Error al buscar marca: ${errMarca.message}` }
  if (!marca) {
    return {
      ok: false,
      error: targetSlug === 'interno'
        ? 'Falta marca "interno" — aplicar migration 20260605210001 en Supabase Dashboard.'
        : `No existe la marca "${targetSlug}".`,
    }
  }

  const insert: Record<string, unknown> = {
    marca_id: marca.id,
    nombre,
    estado: args.esParaPublicar ? 'disenar' : 'borrador',
    estado_tarea: 'sin_empezar',
    plataformas: [],
    tipo_contenido: [],
    objetivos: [],
    copy_listo: false,
    musica_lista: false,
    portada_lista: false,
    disenado: false,
    video_aprobado: false,
    fecha_diseno: args.fechaDiseno ?? null,
    fecha_publicacion: args.esParaPublicar ? args.fechaPublicacion ?? null : null,
    fecha_edicion: args.esParaPublicar ? args.fechaEdicion ?? null : null,
    created_by: user.id,
    updated_by: user.id,
  }
  /* descripcion y fecha_entrega son nuevas (migration 21) — si no
     existen, defensive remove. */
  if (args.descripcion) insert.descripcion = args.descripcion.trim() || null
  if (args.fechaEntrega) insert.fecha_entrega = args.fechaEntrega

  let { data, error } = await service
    .from('publicaciones')
    .insert(insert)
    .select('id')
    .single()

  if (error && (error.code === '42703' || /descripcion|fecha_entrega/i.test(error.message ?? ''))) {
    delete insert.descripcion
    delete insert.fecha_entrega
    const retry = await service.from('publicaciones').insert(insert).select('id').single()
    data = retry.data; error = retry.error
  }

  if (error) {
    console.error('[crearDisenoTask] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/diseno')
  if (args.esParaPublicar) revalidatePath('/publicaciones')
  return { ok: true, data: { id: data.id } }
}
