// app/app/publicaciones/[id]/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { generarCopysIA } from '@/lib/copys/generar'
import { promptSeedPorSlug } from '@/lib/copys/seeds'
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
  frase?: string | null                   // frase en pantalla del video (TikTok)
  enlace_tomas?: string | null
  enlace_musica?: string | null
  portada_cruda_url?: string | null
  portada_editada_url?: string | null
  drive_resultado_url?: string | null    // enlace del diseño terminado (Ailyn)
  es_tarea_diseno?: boolean               // flag "Para diseño" → tablero de Ailyn
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

  // AUTO: cambiar el ESTADO a "Diseñar" manualmente (desde el dropdown del
  // detalle) ahora envía la tarea al tablero de Ailyn automáticamente. Antes
  // había que cambiar el estado Y ADEMÁS tocar el botón "Mandar a diseño" — un
  // doble paso que Lorena no hacía ("le asigné a diseño pero no le sale",
  // 27-jun-2026). Solo aplica a ediciones HUMANAS (updatePublicacion); el sync
  // de Notion usa su propio update en lib/publicaciones/sync.ts, así que NO se
  // re-inunda el tablero (la decisión anti-inundación de Pedro sigue intacta).
  // Solo encendemos en la transición (si ya estaba en diseño, no tocamos el
  // sub-estado para no pisar el avance de la diseñadora).
  let activoParaDiseno = false
  if (input.estado === 'disenar' && input.es_tarea_diseno === undefined) {
    const { data: ctxD } = await service
      .from('publicaciones')
      .select('es_tarea_diseno')
      .eq('id', id)
      .maybeSingle()
    if (ctxD?.es_tarea_diseno !== true) {
      update.es_tarea_diseno = true
      activoParaDiseno = true
      if (input.estado_tarea === undefined) update.estado_tarea = 'sin_empezar'
    }
  }

  // AUTO: marcar la tarea como 'listo' enciende el flag de workflow que pinta
  // el icono del calendario en verde solo — Pedro: "la tijereta debe teñirse
  // verde ni bien Pieer termina de editar, sin entrar manualmente". Diseño →
  // disenado; edición → editado. Respetamos un valor explícito si vino en input.
  if (input.estado_tarea === 'listo' && input.editado === undefined && input.disenado === undefined) {
    const { data: ctx } = await service
      .from('publicaciones')
      .select('es_tarea_diseno, estado')
      .eq('id', id)
      .maybeSingle()
    const esDiseno = ctx?.es_tarea_diseno === true || ctx?.estado === 'disenar'
    if (esDiseno) update.disenado = true
    else update.editado = true
  }

  let { error } = await service.from('publicaciones').update(update).eq('id', id)

  // DEFENSIVO contra columnas faltantes (migración pendiente). Una columna que
  // no existe puede dar DOS errores: Postgres `42703 column ... does not exist`
  // o PostgREST `PGRST204 Could not find the '...' column ... in the schema
  // cache` (supabase-js al validar el payload). Atrapamos ambos.
  // ⚠️ CRÍTICO (Pedro 23-jun-2026): quitamos SOLO la columna que el error
  // NOMBRA — NO todas las opcionales. Bug previo: al faltar `frase`, el retry
  // podaba TAMBIÉN `video_*_url` (que SÍ existen) → los enlaces de video NO se
  // guardaban (se "guardaba" pero al recargar no salían). Iteramos por si
  // faltara más de una columna. Mismo patrón que ya nos mordió: un fallback
  // NUNCA debe tirar datos válidos, solo la columna realmente ausente.
  const OPTIONAL_COLS = ['video_sin_musica_url', 'video_con_musica_url', 'drive_resultado_url', 'es_tarea_diseno', 'frase']
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
    /* Las columnas opcionales no son substring unas de otras, así que
       includes() identifica sin ambigüedad cuál menciona el error. */
    const offending = OPTIONAL_COLS.find((c) => (c in update) && msg.includes(c))
    if (!offending) break  // el error no es por una columna opcional → no podar a ciegas
    delete update[offending]
    const retry = await service.from('publicaciones').update(update).eq('id', id)
    error = retry.error
  }

  if (error) {
    console.error('[updatePublicacion] error:', error)
    return { ok: false, error: error.message }
  }

  // Historial de actividad (best-effort).
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
  /* Si esta edición mandó la tarea a diseño, refrescar el tablero de Ailyn. */
  if (activoParaDiseno || input.es_tarea_diseno !== undefined) revalidatePath('/diseno')
  return { ok: true }
}

/**
 * Toggle de un campo booleano del checklist.
 * Útil para clicks rápidos en el detalle.
 */
export async function togglePublicacionField(
  id: string,
  field: 'copy_listo' | 'musica_lista' | 'portada_lista' | 'disenado' | 'editado' | 'video_aprobado' | 'es_tarea_diseno',
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
  /* El flag "Para diseño" cambia qué ve Ailyn → revalidar su tablero. */
  if (field === 'es_tarea_diseno') revalidatePath('/diseno')
  return { ok: true }
}

/**
 * "Mandar a diseño" — enciende/apaga el flag es_tarea_diseno y, al ENVIAR
 * (value=true), resetea el sub-estado a 'sin_empezar' para que la tarea
 * caiga en la columna "Sin empezar" del tablero de Ailyn como trabajo NUEVO.
 *
 * Bug que resuelve (19-jun-2026): una publicación que ya pasó por el pipeline
 * suele tener estado_tarea='listo' (27 de 37 en prod). Si solo encendíamos el
 * flag, aparecía en la columna "Listo" del tablero de diseño y Ailyn no la veía
 * como pendiente → "marqué mandar a diseño y no le aparece". El tablero agrupa
 * por estado_tarea, así que enviar a diseño DEBE nacer en 'sin_empezar'.
 */
export async function marcarParaDiseno(
  id: string,
  value: boolean,
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const update: Record<string, unknown> = { es_tarea_diseno: value, updated_by: user.id }
  if (value) update.estado_tarea = 'sin_empezar'

  const { error } = await service.from('publicaciones').update(update).eq('id', id)
  if (error) return { ok: false, error: error.message }

  await registrarActividad({
    accion: value ? 'Mandó a diseño' : 'Quitó de diseño',
    entidad_tipo: 'publicacion',
    entidad_id: id,
  })

  revalidatePath(`/publicaciones/${id}`)
  revalidatePath('/diseno')
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
 * Genera copys con IA (Claude) para una publicación, replicando el flujo que
 * Pedro hacía en Notion: analiza el guion + la voz de la marca y devuelve 3
 * opciones para elegir. NO guarda nada: Pedro elige una, se carga en el
 * textarea, y guarda con el botón normal.
 *
 * Recibe el contexto desde el cliente (guion/tipo/plataformas/nombre) para usar
 * los valores ACTUALES del form aunque Pedro no haya guardado todavía. El
 * marca_id + voz + facts se leen de la BD a partir de la publicación.
 */
export async function generarCopysConIA(input: {
  publicacionId: string
  guion: string
  nombre: string
  tipoContenido: string[]
  plataformas: string[]
  copyActual?: string
  /* Transcripción de audio (modo "generar en base a audio"). */
  transcript?: string
}): Promise<{ ok: true; opciones: string[] } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Resolver la marca de la publicación
  const { data: pub } = await service
    .from('publicaciones')
    .select('marca_id')
    .eq('id', input.publicacionId)
    .maybeSingle()
  if (!pub?.marca_id) {
    return { ok: false, error: 'No pude identificar la marca de esta publicación.' }
  }

  // Voz de marca + facts canon en paralelo
  const [{ data: marca }, { data: facts }] = await Promise.all([
    service.from('marcas').select('nombre, slug, tono_voz').eq('id', pub.marca_id).maybeSingle(),
    service.from('marca_facts').select('*').eq('marca_id', pub.marca_id).maybeSingle(),
  ])
  if (!marca) return { ok: false, error: 'Marca no encontrada.' }

  /* Prompt editable de la marca: lo guardado en tono_voz.prompt_copy, o el seed
     por defecto del slug (ej. Manrique) si aún no se guardó nada. */
  const tonoVoz = (marca.tono_voz && typeof marca.tono_voz === 'object') ? marca.tono_voz as Record<string, unknown> : {}
  const promptGuardado = typeof tonoVoz.prompt_copy === 'string' ? tonoVoz.prompt_copy.trim() : ''
  const promptMarca = promptGuardado || promptSeedPorSlug(marca.slug as string | null) || null

  const res = await generarCopysIA({
    marcaNombre: marca.nombre as string,
    tonoVoz: marca.tono_voz,
    promptMarca,
    transcript: input.transcript ?? null,
    facts: facts
      ? {
          nombre_comercial: facts.nombre_comercial,
          web_principal: facts.web_principal,
          whatsapp_principal: facts.whatsapp_principal,
          puntos_venta: facts.puntos_venta,
          proximamente: facts.proximamente,
          productos_datos: facts.productos_datos,
          frases_prohibidas: facts.frases_prohibidas,
          frases_canon: facts.frases_canon,
          notas: facts.notas,
        }
      : null,
    nombre: input.nombre,
    guion: input.guion,
    tipoContenido: input.tipoContenido ?? [],
    plataformas: input.plataformas ?? [],
    copyActual: input.copyActual,
  })
  if (res.ok) {
    await registrarActividad({
      accion: 'Generó copy con IA',
      entidad_tipo: 'publicacion',
      entidad_id: input.publicacionId,
      marca_slug: (marca.slug as string | null) ?? undefined,
      detalle: input.transcript ? 'desde un audio' : 'desde el guion / contexto',
    })
  }
  return res
}

/**
 * Guarda el prompt de copy de una marca (lo edita Pedro desde /publicaciones).
 * Se guarda en marcas.tono_voz.prompt_copy (jsonb) para no requerir migración.
 * Merge: conserva el resto de tono_voz (tono, arquetipo, instrucciones…).
 */
export async function guardarPromptMarca(
  marcaId: string,
  prompt: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  if (!marcaId) return { ok: false, error: 'Falta la marca.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: marca, error: readErr } = await service
    .from('marcas')
    .select('tono_voz')
    .eq('id', marcaId)
    .maybeSingle()
  if (readErr) return { ok: false, error: readErr.message }

  const tonoVoz = (marca?.tono_voz && typeof marca.tono_voz === 'object')
    ? { ...(marca.tono_voz as Record<string, unknown>) }
    : {}
  tonoVoz.prompt_copy = prompt

  const { error } = await service.from('marcas').update({ tono_voz: tonoVoz }).eq('id', marcaId)
  if (error) return { ok: false, error: error.message }
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

/* "Video ya subido → avisar al cliente". Lo usa el trabajador desde el detalle:
   guarda los links del post (TikTok/Instagram), marca la publicación como
   publicada y manda un push SOLO AL CLIENTE de la marca ("¡Tu video se
   publicó!"). Pedro 14-jul-2026: el aviso de publicado NO va al equipo, solo
   al cliente. */
export async function avisarClientePublicado(
  id: string,
  input: { linkTiktok?: string | null; linkInstagram?: string | null },
): Promise<ActionResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: pub } = await service
    .from('publicaciones')
    .select('nombre, plataformas, marca:marcas(id, nombre, emoji_marca)')
    .eq('id', id)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { estado: 'publicado', publicado_at: new Date().toISOString(), updated_by: user.id }
  if (input.linkTiktok !== undefined) update.link_tiktok = (input.linkTiktok || '').trim() || null
  if (input.linkInstagram !== undefined) update.link_instagram = (input.linkInstagram || '').trim() || null

  const { error } = await service.from('publicaciones').update(update).eq('id', id)
  if (error) return { ok: false, error: error.message }

  const m = pub ? (Array.isArray(pub.marca) ? pub.marca[0] : pub.marca) : null
  const marcaNombre = m?.nombre ?? 'Marca'
  const hora = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(new Date())

  // SOLO al CLIENTE de la marca (el equipo ya no recibe el aviso de publicado).
  if (m?.id) {
    await enviarPushAClientesDeMarca(m.id, {
      title: `✅ ¡Tu video se publicó! ${m.emoji_marca ?? ''}`.trim(),
      body: `${pub?.nombre ?? marcaNombre} · ${hora}`,
      url: '/cliente',
      tag: `cliente-pub-${id}`,
    })
  }

  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/publicar-hoy')
  revalidatePath('/cliente')
  revalidatePath('/inicio')
  return { ok: true }
}
