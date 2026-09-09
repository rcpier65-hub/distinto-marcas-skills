// app/app/publicaciones/[id]/update-publicacion.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { registrarActividad } from '@/lib/actividad/registrar'
import { enviarPushAClientesDeMarca } from '@/lib/push/send'
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
  frase?: string | null
  enlace_tomas?: string | null
  enlace_musica?: string | null
  portada_cruda_url?: string | null
  portada_editada_url?: string | null
  drive_resultado_url?: string | null
  es_tarea_diseno?: boolean
  video_sin_musica_url?: string | null
  video_con_musica_url?: string | null
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
  motivo_pausa?: string | null
}

type ActionResult = { ok: true } | { ok: false; error: string }

export async function updatePublicacion(
  id: string,
  input: UpdatePublicacionInput,
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const update: Record<string, unknown> = { updated_by: user.id }
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) update[k] = v
  }

  if (Object.keys(update).length === 1) {
    return { ok: false, error: 'Sin cambios para guardar' }
  }

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

  /* OPT-IN EXPLÍCITO (Pedro 19-jun + Ailyn 493525fb): cambiar el ESTADO a
     "Diseñar" NO manda la pub al tablero de Ailyn. Solo el botón "Mandar a
     diseño" (es_tarea_diseno) lo hace. El auto-flag (27-jun) inundaba /diseno
     con TODOS los posts de grilla que Lorena pasaba a la etapa Diseñar. */
  let activoParaDiseno = false
  if (input.es_tarea_diseno === true) activoParaDiseno = true

  if (input.estado_tarea === 'listo') {
    const { data: ctx } = await service
      .from('publicaciones')
      .select('es_tarea_diseno, estado, fecha_publicacion, diseno_terminado_at, disenador_nombre')
      .eq('id', id)
      .maybeSingle()
    const esDiseno = ctx?.es_tarea_diseno === true || update.es_tarea_diseno === true
    if (input.estado_tarea === 'listo' && input.editado === undefined && input.disenado === undefined) {
      if (esDiseno) update.disenado = true
      else update.editado = true
    }
    if (esDiseno) {
      if (!ctx?.diseno_terminado_at) update.diseno_terminado_at = new Date().toISOString()
      if (!ctx?.disenador_nombre) {
        const { data: me } = await service
          .from('team_members')
          .select('nombre')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (me?.nombre) {
          update.disenador_nombre = me.nombre
          const { data: d } = await service.from('disenadores').select('id').ilike('nombre', me.nombre).limit(1)
          if (d && d[0]?.id) update.disenador_id = d[0].id
        }
      }
      if (ctx?.fecha_publicacion) {
        update.es_tarea_diseno = false
      }
    }
  } else if (input.estado_tarea === 'sin_empezar' || input.estado_tarea === 'en_progreso' || input.estado_tarea === 'pausada') {
    const { data: ctxR } = await service
      .from('publicaciones')
      .select('es_tarea_diseno')
      .eq('id', id)
      .maybeSingle()
    if (ctxR?.es_tarea_diseno === true || update.es_tarea_diseno === true) {
      update.diseno_terminado_at = null
    }
  }

  if (typeof input.estado === 'string' && (input.estado === 'editar' || input.estado === 'editando')) {
    if (input.editado === undefined) update.editado = false
  }

  const ESTADOS_AVANZADOS = ['aprobar', 'programar', 'programar_anuncios', 'publicar', 'publicado', 'enviado']
  let avisarListoCliente: { marcaId: string; nombre: string; titulo: string; emoji: string } | null = null
  if (typeof input.estado === 'string' && ESTADOS_AVANZADOS.includes(input.estado)) {
    const { data: ctxRev } = await service
      .from('publicaciones')
      .select('estado, nombre, es_tarea_diseno, editado_at, fecha_publicacion, marca:marcas(id, nombre, emoji_marca)')
      .eq('id', id)
      .maybeSingle()
    if (ctxRev) {
      const esDiseno = ctxRev.es_tarea_diseno === true || update.es_tarea_diseno === true || ctxRev.estado === 'disenar'
      if (!esDiseno) {
        if (input.editado === undefined) update.editado = true
        if (!ctxRev.editado_at && update.editado_at === undefined) update.editado_at = new Date().toISOString()
      }
      if (esDiseno && ctxRev.fecha_publicacion && update.es_tarea_diseno === undefined) {
        update.es_tarea_diseno = false
      }
      if (input.estado === 'aprobar' && ctxRev.estado !== 'aprobar') {
        const mm = Array.isArray(ctxRev.marca) ? ctxRev.marca[0] : ctxRev.marca
        if (mm?.id) {
          avisarListoCliente = {
            marcaId: mm.id as string,
            nombre: (mm.nombre ?? '') as string,
            titulo: ((input.nombre ?? ctxRev.nombre) ?? '') as string,
            emoji: (mm.emoji_marca ?? '') as string,
          }
        }
      }
    }
  }

  let { error } = await service.from('publicaciones').update(update).eq('id', id)

  const OPTIONAL_COLS = ['video_sin_musica_url', 'video_con_musica_url', 'drive_resultado_url', 'es_tarea_diseno', 'frase', 'editado_at', 'diseno_terminado_at', 'disenador_nombre', 'disenador_id']
  let intentos = 0
  while (
    error && intentos < OPTIONAL_COLS.length && (
      error.code === '42703' ||
      error.code === 'PGRST204' ||
      /does not exist/i.test(error.message ?? '') ||
      /could not find the .*column.* in the schema cache/i.test(error.message ?? '')
    )
  ) {
    intentos++
    const msg = error.message ?? ''
    const offending = OPTIONAL_COLS.find((c) => (c in update) && msg.includes(c))
    if (!offending) break
    delete update[offending]
    const retry = await service.from('publicaciones').update(update).eq('id', id)
    error = retry.error
  }

  if (error) {
    console.error('[updatePublicacion] error:', error)
    return { ok: false, error: error.message }
  }

  if (avisarListoCliente) {
    try {
      await enviarPushAClientesDeMarca(avisarListoCliente.marcaId, {
        title: `🎬 Tienes un video listo para aprobar${avisarListoCliente.emoji ? ` ${avisarListoCliente.emoji}` : ''}`,
        body: `${avisarListoCliente.titulo || 'Tu video'} — entra a tu portal para verlo y aprobarlo. 👀`,
        url: `/cliente?pub=${id}`,
        tag: `listo-aprobar-${id}`,
      })
    } catch (e) {
      console.error('[updatePublicacion] aviso listo para aprobar falló:', e)
    }
  }

  const accion = input.estado === 'aprobar'
    ? 'Mandó a aprobar'
    : input.estado
    ? `Cambió estado a "${input.estado}"`
    : 'Editó una publicación'
  await registrarActividad({
    accion,
    entidad_tipo: 'publicacion',
    entidad_id: id,
    detalle: input.nombre ? `"${input.nombre}"` : undefined,
  })

  revalidatePath(`/publicaciones/${id}`)
  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')
  if (activoParaDiseno || input.es_tarea_diseno !== undefined) revalidatePath('/diseno')
  return { ok: true }
}
