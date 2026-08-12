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
import { hoyLima } from '@/lib/fechas/hoy'
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

  const hoy = hoyLima() // hora Lima, no UTC (ver lib/fechas/hoy)
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
    /* Cambiar la marca de la tarea (Pedro 15-jun-2026: "a veces quiero cambiar
       de marca y no se puede"). Resuelve el slug → marca_id. */
    marcaSlug?: string | null
    /* Etiquetas de marca extra (slugs). Reemplaza el conjunto actual de
       marcas_extra. [] = limpiar todas las etiquetas. */
    marcasExtras?: string[]
    subEstado?: SubEstadoDiseno
    fechaDiseno?: string | null
    fechaEntrega?: string | null
    fechaPublicacion?: string | null
    /* Enlaces específicos para tareas de diseño standalone:
       - drive_material_url: link al material que Ailyn usa de base
       - drive_resultado_url: link al diseño terminado para entregar */
    driveMaterialUrl?: string | null
    driveResultadoUrl?: string | null
    horaReunion?: string | null
    invitadosEmails?: string[] | null
  },
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const update: Record<string, unknown> = { updated_by: user.id }
  if (patch.nombre !== undefined) update.nombre = patch.nombre
  if (patch.descripcion !== undefined) update.descripcion = patch.descripcion
  /* Cambio de marca: resolvemos slug → marca_id. '' / null → 'interno'. */
  if (patch.marcaSlug !== undefined) {
    const slug = patch.marcaSlug || 'interno'
    const { data: m } = await service.from('marcas').select('id').eq('slug', slug).maybeSingle()
    if (m?.id) update.marca_id = m.id
  }
  /* Etiquetas extra: reemplaza marcas_extra con los IDs de los slugs dados. */
  if (patch.marcasExtras !== undefined) {
    const slugs = patch.marcasExtras.map((s) => s.trim()).filter(Boolean)
    if (slugs.length > 0) {
      const { data: ms } = await service.from('marcas').select('id').in('slug', slugs)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update.marcas_extra = ((ms ?? []) as any[]).map((m) => m.id as string)
    } else {
      update.marcas_extra = []
    }
  }
  if (patch.subEstado !== undefined) {
    update.estado_tarea = patch.subEstado
    /* Timeline auto-tracking:
       - Si pasa a 'en_progreso' y nunca tuvo started_at, set ahora.
       - Si pasa a 'archivado', set archived_at = now().
       - Si se reactiva (sale de archivado), null el archived_at.
       Lectura previa de la fila para preservar started_at si ya existe. */
    if (patch.subEstado === 'en_progreso') {
      const { data: prev } = await service
        .from('publicaciones')
        .select('started_at')
        .eq('id', id)
        .maybeSingle()
      if (!prev?.started_at) update.started_at = new Date().toISOString()
    }
    /* Diseño TERMINADO: 'listo' o 'enviado' sellan diseno_terminado_at (una
       sola vez). Sirve para el Reporte del día (que Aylin veía vacío) y para
       medir la duración (started_at → diseno_terminado_at). Si se reabre a un
       estado no-terminado, se limpia para no contarlo como hecho. */
    if (patch.subEstado === 'listo' || patch.subEstado === 'enviado') {
      const { data: prev } = await service
        .from('publicaciones')
        .select('diseno_terminado_at, disenador_nombre')
        .eq('id', id)
        .maybeSingle()
      if (!prev?.diseno_terminado_at) update.diseno_terminado_at = new Date().toISOString()
      /* Atribución para el Reporte del día: si la tarea no tiene diseñador
         asignado, se la atribuimos a QUIEN la completa. Sin esto, los diseños
         de Aylin no salían en su reporte (disenador_nombre venía null). */
      if (!prev?.disenador_nombre) {
        const { data: me } = await service
          .from('team_members')
          .select('id, nombre')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (me?.nombre) {
          update.disenador_nombre = me.nombre
          const { data: d } = await service.from('disenadores').select('id').ilike('nombre', me.nombre).limit(1)
          if (d && d[0]?.id) update.disenador_id = d[0].id
        }
      }
    } else if (patch.subEstado === 'sin_empezar' || patch.subEstado === 'en_progreso' || patch.subEstado === 'pausada') {
      update.diseno_terminado_at = null
    }
    if (patch.subEstado === 'archivado') {
      update.archived_at = new Date().toISOString()
    } else {
      /* Cualquier otro subEstado (sin_empezar / en_progreso / pausada / listo /
         enviado) significa "no archivada" → limpiar archived_at. */
      update.archived_at = null
    }
    /* SYNC con el estado de la PUBLICACIÓN (pedido de Pedro 15-jun-2026):
       el sub-estado de diseño maneja el estado del pipeline, igual que el
       editor. en_progreso → 'disenando'; listo → 'aprobar'; sin_empezar →
       vuelve a 'disenar'. ('archivado' / 'pausada' / 'enviado' no tocan el
       estado del pipeline.) 'disenando' es un valor de enum nuevo: si aún no
       se aplicó el SQL, más abajo cae a 'disenar' (fallback) para no romper. */
    if (patch.subEstado === 'en_progreso') update.estado = 'disenando'
    else if (patch.subEstado === 'listo') update.estado = 'aprobar'
    else if (patch.subEstado === 'sin_empezar') update.estado = 'disenar'
  }
  if (patch.fechaDiseno !== undefined) update.fecha_diseno = patch.fechaDiseno
  if (patch.fechaEntrega !== undefined) update.fecha_entrega = patch.fechaEntrega
  if (patch.fechaPublicacion !== undefined) update.fecha_publicacion = patch.fechaPublicacion
  if (patch.driveMaterialUrl !== undefined) update.drive_material_url = patch.driveMaterialUrl
  if (patch.driveResultadoUrl !== undefined) update.drive_resultado_url = patch.driveResultadoUrl
  if (patch.horaReunion !== undefined) update.reunion_hora = patch.horaReunion
  if (patch.invitadosEmails !== undefined) update.invitados_emails = patch.invitadosEmails

  let { error } = await service.from('publicaciones').update(update).eq('id', id)

  /* Defensive contra migration pendiente: si descripcion/fecha_entrega
     no existen aún, reintentamos sin esos campos. La UI seguirá
     funcionando en modo degradado hasta que se aplique. */
  if (error && (error.code === '42703' || /descripcion|fecha_entrega|marcas_extra/i.test(error.message ?? ''))) {
    delete update.descripcion
    delete update.fecha_entrega
    delete update.marcas_extra  // columna pendiente de migración
    const retry = await service.from('publicaciones').update(update).eq('id', id)
    error = retry.error
  }

  /* Fallback enum: si 'disenando' todavía no existe en el enum (SQL pendiente),
     reintentamos con 'disenar' para no romper el cambio de sub-estado. */
  if (error && (error.code === '22P02' || /invalid input value for enum|disenando/i.test(error.message ?? ''))) {
    if (update.estado === 'disenando') update.estado = 'disenar'
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
  /* Timeline tracking en archivar quick-action:
     - Archivar → set archived_at = now()
     - Reactivar → null el archived_at */
  const update: Record<string, unknown> = {
    estado_tarea: nuevo,
    updated_by: user.id,
    archived_at: archivar ? new Date().toISOString() : null,
  }
  const { error } = await service.from('publicaciones').update(update).eq('id', id)
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
 * Devuelve los correos de cliente configurados para una marca.
 * Lo usa el modal de "Nueva tarea" para auto-llenar la lista de
 * invitados al crear una reunión de revisión.
 */
export async function obtenerCorreosDeMarca(slug: string): Promise<{
  ok: true; correos: string[]
} | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data, error } = await service
    .from('marcas')
    .select('correos_clientes')
    .eq('slug', slug)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  return { ok: true, correos: (data?.correos_clientes ?? []) as string[] }
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
  /* Marca PRINCIPAL — Pedro pidió que se pueda elegir marca incluso
     en tareas standalone (para que los correos de clientes
     auto-llenen los invitados al crear la reunión de revisión).
     Si no se elige marca, default 'interno'. */
  marcaSlug?: string
  /* Pedro: 'que se puedan seleccionar más de una marca cuando se hace
     diseño'. Si vienen N slugs adicionales, creamos N publicaciones
     extra con la misma config pero distinta marca. Útil para la misma
     pieza (ej. 'Saludo Día de la Madre') replicada en varias marcas. */
  marcasExtras?: string[]
  // Modo "para publicar"
  esParaPublicar: boolean
  fechaPublicacion?: string | null
  fechaEdicion?: string | null
  /* Reunión de revisión (opcional). Si se llena hora_reunion, el
     campo invitados_emails se guarda también; si no hay hora, se
     ignora todo. La fecha de la reunión es fecha_diseno por default
     (lo más razonable: la reunión coincide con el día del diseño).
     Para crear el evento real en Google Calendar usar la action
     `crearReunionEnMeet` aparte (lo agregamos cuando GCal OAuth esté
     conectado). */
  horaReunion?: string | null       // "HH:mm" — input type=time
  invitadosEmails?: string[] | null
}): Promise<ActionResult<{ id: string; extrasCreadas: number }>> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const nombre = args.nombre.trim()
  if (!nombre) return { ok: false, error: 'Falta nombre de la tarea' }

  /* Resolvemos marca_id:
     - Si esParaPublicar=true → requiere marcaSlug obligatorio
     - Si NO esParaPublicar:
       - Si pasa marcaSlug → la usamos (Pedro pidió poder elegir marca
         para tareas standalone también, para tener correos clientes)
       - Si no pasa marcaSlug → default 'interno' */
  const targetSlug = args.marcaSlug ?? (args.esParaPublicar ? null : 'interno')
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
    /* Estado SIEMPRE 'disenar' — el ENUM estado_publicacion no tiene
       'borrador'. Tanto las tareas "para publicar" como las standalone
       arrancan en estado 'disenar' del pipeline (etapa de diseño).
       Las tareas para publicar siguen su flujo normal hacia editar →
       aprobar → publicar; las standalone se quedan en 'disenar' hasta
       que el sub-estado las marca como 'listo' o 'archivado'. */
    estado: 'disenar',
    estado_tarea: 'sin_empezar',
    /* Flag que separa la "base de datos" de Diseño del pipeline de
       publicaciones (modelo Notion de Pedro: Diseño es una DB aparte;
       solo se vincula al pipeline si es 'para publicar'). El módulo
       /diseno SOLO muestra filas con este flag — así las publicaciones
       sincronizadas desde Notion en etapa 'disenar' no contaminan el
       tablero de Ailyn. */
    es_tarea_diseno: true,
    /* Nueva tarea: sin started_at ni archived_at. Se setean
       automáticamente cuando el sub-estado avance. */
    started_at: null,
    archived_at: null,
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
  /* Reunión de revisión: solo se guarda si tiene hora. La lista de
     invitados queda como snapshot del momento de creación; si el
     cliente cambia los correos en Settings de marca, NO se actualiza
     retroactivamente (preserva la invitación original). */
  if (args.horaReunion) {
    insert.reunion_hora = args.horaReunion
    insert.invitados_emails = args.invitadosEmails ?? []
  }

  /* MULTI-MARCA = ETIQUETAS en la MISMA tarea (Pedro 15-jun-2026: "no replicar,
     etiquetar varias marcas en una sola tarea"). Guardamos los IDs extra en la
     columna marcas_extra uuid[]. NO se crean copias. */
  const slugsExtras = (args.marcasExtras ?? [])
    .map((s) => s.trim())
    .filter((s) => s && s !== targetSlug)
  let idsExtras: string[] = []
  if (slugsExtras.length > 0) {
    const { data: marcasExtrasData } = await service.from('marcas').select('id, slug').in('slug', slugsExtras)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    idsExtras = ((marcasExtrasData ?? []) as any[]).map((m) => m.id as string)
    if (idsExtras.length > 0) insert.marcas_extra = idsExtras
  }

  let { data, error } = await service
    .from('publicaciones')
    .insert(insert)
    .select('id')
    .single()

  if (error && (error.code === '42703' || /descripcion|fecha_entrega|reunion_hora|invitados_emails|marcas_extra/i.test(error.message ?? ''))) {
    delete insert.descripcion
    delete insert.fecha_entrega
    delete insert.reunion_hora
    delete insert.invitados_emails
    delete insert.marcas_extra  // columna marcas_extra pendiente de migración
    const retry = await service.from('publicaciones').insert(insert).select('id').single()
    data = retry.data; error = retry.error
  }

  if (error) {
    console.error('[crearDisenoTask] error:', error)
    return { ok: false, error: error.message }
  }

  /* Las marcas extra ya quedaron etiquetadas en marcas_extra de ESTA tarea
     (arriba, antes del insert). extrasCreadas = cuántas etiquetas se guardaron.
     Si el insert cayó al fallback (columna pendiente), no se guardaron. */
  const extrasCreadas = ('marcas_extra' in insert) ? idsExtras.length : 0

  /* Refresco TODAS las vistas afectadas. Si es para publicar, la
     tarea aparecerá en el calendario principal y la tabla — pedro
     pidió "que se conecte a la grilla principal para que también
     pueda verse en el calendario principal". */
  revalidatePath('/diseno')
  if (args.esParaPublicar) {
    revalidatePath('/publicaciones')
    revalidatePath('/publicaciones/calendario')
    revalidatePath('/publicaciones/tabla')
    revalidatePath('/publicaciones/kanban')
    revalidatePath('/editor')  /* el editor también filtra por estado */
  }
  return { ok: true, data: { id: data.id, extrasCreadas } }
}
