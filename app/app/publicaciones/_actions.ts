// app/app/publicaciones/_actions.ts
// Actions globales para /publicaciones (crear + duplicar).
// Las actions específicas de [id] viven en /publicaciones/[id]/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarPushAClientesDeMarca, enviarPushAMiembros, marcaAvisaAlEquipo } from '@/lib/push/send'
import { avisarClienteVideoListo } from '@/lib/publicaciones/avisar-cliente-listo'
import type { EstadoPublicacion } from '@/lib/types/database'

/**
 * Cambia el estado de una publicación (workflow). Optimizado para Kanban drag-and-drop.
 * Devuelve Result en vez de throw — el cliente hace optimistic update y rollback si falla.
 */
export async function cambiarEstadoPublicacion(
  id: string,
  nuevoEstado: EstadoPublicacion,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: any = { estado: nuevoEstado, updated_by: user.id }

  /* CRÉDITO DE EDICIÓN EN EL REPORTE: al AVANZAR el estado (aprobar/programar/
     publicar/…) marcamos `editado` + `editado_at` para tareas de EDICIÓN, igual
     que updatePublicacion y el módulo Editor. Sin esto, cambiar el estado desde
     el kanban NO registraba el video en el reporte del editor (Pieer via Erick
     31-jul-2026: "solo registra cuando mando a aprobar desde tareas"). Solo si
     `editado_at` está null (Pedro: el tiempo se cuenta desde la PRIMERA vez). */
  const ESTADOS_AVANZADOS = ['aprobar', 'programar', 'programar_anuncios', 'publicar', 'publicado', 'enviado']
  let avisarListo = false  // avisar al cliente "video listo para aprobar"
  if (ESTADOS_AVANZADOS.includes(nuevoEstado)) {
    const { data: actual } = await service
      .from('publicaciones')
      .select('es_tarea_diseno, estado, editado_at')
      .eq('id', id)
      .maybeSingle()
    const esDiseno = actual?.es_tarea_diseno === true || actual?.estado === 'disenar'
    if (actual && !esDiseno) {
      patch.editado = true
      if (!actual.editado_at) patch.editado_at = new Date().toISOString()
    }
    // Transición a 'aprobar' desde el kanban → avisar al cliente (todas las marcas).
    if (nuevoEstado === 'aprobar' && actual && actual.estado !== 'aprobar') avisarListo = true
  }

  let { error } = await service
    .from('publicaciones')
    .update(patch)
    .eq('id', id)

  /* DEFENSIVO: si editado_at no existe (migración pendiente), reintentar sin esa
     columna para no bloquear el cambio de estado. */
  if (error && (error.code === '42703' || /editado_at/i.test(error.message ?? ''))) {
    delete patch.editado_at
    const retry = await service.from('publicaciones').update(patch).eq('id', id)
    error = retry.error
  }

  if (error) {
    console.error('[cambiarEstadoPublicacion] error:', error)
    return { ok: false, error: error.message }
  }

  if (avisarListo) await avisarClienteVideoListo(id)

  revalidatePath('/publicaciones/kanban')
  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')
  revalidatePath(`/publicaciones/${id}`)
  return { ok: true }
}

/**
 * Cambia SOLO la fecha de publicación (calendario drag-and-drop).
 * Lorena 26-jun-2026: "si desde esa vista me dejara arrastrar sería más fácil"
 * — antes había que entrar video por video a cambiar la fecha.
 * Devuelve Result (no throw): el cliente hace optimistic move y rollback si falla.
 *
 * Preserva la HORA original si la pub la tenía (fecha_publicacion con tiempo):
 * arrastrar al día X no debe resetear "20:00" a medianoche.
 */
export async function cambiarFechaPublicacion(
  id: string,
  nuevaFecha: string, // 'YYYY-MM-DD'
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  if (!/^\d{4}-\d{2}-\d{2}$/.test(nuevaFecha)) {
    return { ok: false, error: 'Fecha inválida' }
  }

  /* Conservar la hora original. Leemos la fecha actual; si traía tiempo
     (T...), se lo pegamos a la nueva fecha. Si no, guardamos solo el día. */
  let valorFecha = nuevaFecha
  const { data: actual } = await service
    .from('publicaciones')
    .select('fecha_publicacion')
    .eq('id', id)
    .maybeSingle()
  const fpActual: string | null = actual?.fecha_publicacion ?? null
  if (fpActual && fpActual.includes('T')) {
    const horaParte = fpActual.split('T')[1]
    if (horaParte) valorFecha = `${nuevaFecha}T${horaParte}`
  }

  const { error } = await service
    .from('publicaciones')
    .update({ fecha_publicacion: valorFecha, updated_by: user.id })
    .eq('id', id)

  if (error) {
    console.error('[cambiarFechaPublicacion] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')
  revalidatePath('/publicaciones/calendario')
  revalidatePath('/publicaciones/kanban')
  revalidatePath(`/publicaciones/${id}`)
  return { ok: true }
}

type CreatePublicacionInput = {
  marca_id: string
  nombre: string
  fecha_publicacion?: string | null
  /* URL a la que debe volver el detalle al cerrar (ej. el calendario de la
     marca de donde vino). Se propaga al redirect como ?volver=. Fix #3. */
  volver?: string | null
}

/**
 * Crea una nueva publicación con defaults sensibles.
 * No usar dentro de un form HTML (no devuelve Result) — usar con useTransition.
 * Hace redirect inmediato a /publicaciones/[id] para que el user complete el resto.
 */
export async function createPublicacion(input: CreatePublicacionInput): Promise<void> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  if (!input.nombre?.trim()) throw new Error('El nombre es obligatorio')
  if (!input.marca_id) throw new Error('La marca es obligatoria')

  const nombreLimpio = input.nombre.trim()

  /* ANTI-DUPLICADO (Pedro 26-jun-2026): en mobile, con red lenta, el usuario
     crea → no ve la navegación → toca otra vez → la fila ya se creó → DUPLICADO
     (Lorena hizo 9 copias vacías de "1. COLÁGENO HIDROLIZADO" en ~30s así).
     Si ya existe una pub IDÉNTICA (misma marca + nombre) creada hace <45s,
     redirigimos a ESA en vez de crear otra. Match exacto + ventana corta →
     no estorba creaciones legítimas (nadie crea 2 pubs con el MISMO nombre y
     marca en 45s a propósito). */
  const haceUnRato = new Date(Date.now() - 45_000).toISOString()
  const { data: yaExiste } = await service
    .from('publicaciones')
    .select('id')
    .eq('marca_id', input.marca_id)
    .eq('nombre', nombreLimpio)
    .gte('created_at', haceUnRato)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (yaExiste?.id) {
    revalidatePath('/publicaciones')
    redirect(
      input.volver
        ? `/publicaciones/${yaExiste.id}?volver=${encodeURIComponent(input.volver)}`
        : `/publicaciones/${yaExiste.id}`,
    )
  }

  const { data, error } = await service
    .from('publicaciones')
    .insert({
      marca_id: input.marca_id,
      nombre: input.nombre.trim(),
      fecha_publicacion: input.fecha_publicacion ?? null,
      estado: 'tareas',
      plataformas: [],
      tipo_contenido: [],
      objetivos: [],
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createPublicacion] error:', error)
    throw new Error(`No se pudo crear: ${error.message}`)
  }

  /* Aviso al CLIENTE: "te programaron una publicación nueva". Pedro 15-jul-2026.
     Va SOLO acá (creación manual). La sincronización masiva de Notion NO
     notifica a propósito: le mandaría decenas de avisos de golpe al cliente.
     Ojo: al crearse la pub aún NO tiene video, por eso el texto dice
     "programada" y no "lista para revisar" — cuando el equipo suba el video se
     le manda el otro aviso ("ya está publicado"). */
  try {
    const { data: marca } = await service.from('marcas').select('nombre, slug').eq('id', input.marca_id).maybeSingle()
    const fechaTxt = input.fecha_publicacion
      ? new Intl.DateTimeFormat('es-PE', {
          timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long',
        }).format(new Date(`${input.fecha_publicacion}T12:00:00`))
      : null
    await enviarPushAClientesDeMarca(input.marca_id, {
      title: `📅 Nueva publicación programada${marca?.nombre ? ` · ${marca.nombre}` : ''}`,
      body: `${nombreLimpio}${fechaTxt ? ` — ${fechaTxt}` : ''}. Te avisamos cuando esté listo el video.`,
      url: `/cliente?pub=${data.id}`,
      tag: `pub-nueva-${data.id}`,
    })
    /* Además, para las marcas donde el equipo quiere estar al tanto (Retoz, por
       ahora): avisar a Pedro (director) + Erick que se subió un video a la grilla.
       Pedro 27-jul-2026. */
    if (marcaAvisaAlEquipo(marca?.slug, marca?.nombre)) {
      await enviarPushAMiembros(['erick'], {
        title: `🆕 Video en la grilla · ${marca?.nombre ?? 'Retoz'}`,
        body: `${nombreLimpio}${fechaTxt ? ` — ${fechaTxt}` : ''}`,
        url: `/publicaciones/${data.id}`,
        tag: `pub-nueva-eq-${data.id}`,
      })
    }
  } catch (e) {
    console.error('[createPublicacion] aviso al cliente falló:', e)
  }

  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')
  revalidatePath('/cliente')

  // Redirect al detail para que llene el resto (plataformas, tipo, copy, etc.).
  // Propagamos ?volver= para que "Volver" regrese a la vista de origen. Fix #3.
  redirect(
    input.volver
      ? `/publicaciones/${data.id}?volver=${encodeURIComponent(input.volver)}`
      : `/publicaciones/${data.id}`,
  )
}

/**
 * Wrapper para HTML <form action={...}>. Lee FormData y delega a createPublicacion.
 * Lanza si falta marca o nombre — el form HTML debe tener required en ambos.
 */
export async function createPublicacionFromForm(formData: FormData): Promise<void> {
  const marca_id = String(formData.get('marca_id') ?? '').trim()
  const nombre = String(formData.get('nombre') ?? '').trim()
  const fecha = String(formData.get('fecha_publicacion') ?? '').trim()
  const volver = String(formData.get('volver') ?? '').trim()
  await createPublicacion({
    marca_id,
    nombre,
    fecha_publicacion: fecha || null,
    volver: volver || null,
  })
}

/**
 * Duplica una publicación existente.
 * Estrategia: copia todos los campos editoriales (copy, guion, plataformas, tipo, etc.)
 * pero RESETEA: fecha (null — el user pone la nueva), notion_original_id (null — es nuestra),
 * estado ('tareas' — empieza el workflow desde cero), checklist (todo false), audit fields.
 *
 * Útil para series tipo "PREGUNTA 1 → PREGUNTA 2 → ..." donde el guión y plataformas
 * se reutilizan.
 */
export async function duplicarPublicacion(sourceId: string): Promise<void> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Fetch original
  const { data: original, error: fetchErr } = await service
    .from('publicaciones')
    .select('*')
    .eq('id', sourceId)
    .single()

  if (fetchErr || !original) throw new Error('Publicación original no encontrada')

  // 2. Build copy con resets
  const copyFields = {
    marca_id: original.marca_id,
    nombre: `${original.nombre} (copia)`,
    estado: 'tareas',                  // reset workflow
    fecha_publicacion: null,            // user decide la nueva
    fecha_edicion: null,
    fecha_diseno: null,
    plataformas: original.plataformas,  // reutiliza
    tipo_contenido: original.tipo_contenido,
    objetivos: original.objetivos,
    copy: original.copy,                // reutiliza copy/guion
    guion: original.guion,
    enlace_tomas: null,                 // los enlaces SÍ se resetean (son por pieza)
    enlace_musica: null,
    portada_cruda_url: null,
    portada_editada_url: null,
    copy_listo: false,                  // checklist desde cero
    musica_lista: false,
    portada_lista: false,
    disenado: false,
    editado: false,
    video_aprobado: false,
    editor_nombre: original.editor_nombre,
    notas: original.notas,
    notion_original_id: null,           // es nueva, no de Notion
    notion_url: null,
    created_by: user.id,
    updated_by: user.id,
  }

  const { data: nueva, error: insertErr } = await service
    .from('publicaciones')
    .insert(copyFields)
    .select('id')
    .single()

  if (insertErr || !nueva) throw new Error(`No se pudo duplicar: ${insertErr?.message ?? 'unknown'}`)

  revalidatePath('/publicaciones')
  revalidatePath('/publicaciones/tabla')
  redirect(`/publicaciones/${nueva.id}`)
}

// ────────────────────────────────────────────────────────────────────────
// SYNC NOTION → PUBLICACIONES (botón "🔄 Sincronizar todo con Notion")
// ────────────────────────────────────────────────────────────────────────

/**
 * Llama al endpoint admin que sincroniza Notion → Supabase para todas
 * las marcas con notion_proyecto_id. Default: mayo + junio 2026.
 *
 * Por qué pasa por el endpoint en vez de hacer todo en la action:
 * - El endpoint ya orquesta paralelo, mapeo de estado, dedup por
 *   notion_original_id. Reusar en lugar de duplicar.
 * - El CRON_SECRET vive en el server y nunca llega al cliente.
 * - Permite trigger desde cron / curl / botón con el mismo path.
 */
export async function sincronizarTodoNotion(opts?: {
  from?: string
  to?: string
}): Promise<
  | {
      ok: true
      totals: {
        fetched: number
        inserted: number
        updated: number
        failed: number
        ok: number
        skipped: number
        errored: number
      }
      duration_ms: number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      por_marca: any[]
    }
  | { ok: false; error: string }
> {
  await requireUser()

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://distinto-app.vercel.app'
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return { ok: false, error: 'CRON_SECRET no configurado en server' }
  }

  /* Sin rango por default — Pedro: "sincroniza desde el copy la tarea
     el editor, todo en absoluto". El endpoint interpreta from/to null
     como "todas las tareas del proyecto sin filtro de fecha". */
  const body: { from?: string; to?: string } = {}
  if (opts?.from) body.from = opts.from
  if (opts?.to) body.to = opts.to

  try {
    const res = await fetch(`${appUrl}/api/v1/admin/sync-publicaciones-all`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const json = await res.json()
    /* Error duro: HTTP no-2xx O el endpoint no devolvió `totals`
       (algo realmente roto). En ese caso solo tenemos el error
       message del endpoint o el HTTP status como fallback. */
    if (!res.ok || !json.totals) {
      return {
        ok: false,
        error: json.error ?? `HTTP ${res.status}`,
      }
    }
    /* Si tenemos `totals` pero `ok=false`, son errores PARCIALES:
       algunas marcas fallaron pero otras se sincronizaron. Devolvemos
       ok:true al cliente pero con los counters reales — el cliente ya
       muestra "❌X fallos" en el resumen así que la info no se pierde,
       y NO mostramos un toast rojo genérico que oculta el éxito de las
       demás marcas. El endpoint ahora también incluye `error` legible
       con qué marca falló. */
    revalidatePath('/publicaciones')
    revalidatePath('/publicaciones/tabla')
    revalidatePath('/publicaciones/calendario')
    revalidatePath('/publicaciones/kanban')
    revalidatePath('/editor')   /* el editor lee la misma tabla — refrescar tras sync */
    revalidatePath('/inicio')
    revalidatePath('/equipo')
    return {
      ok: true,
      totals: json.totals,
      duration_ms: json.duration_ms,
      por_marca: json.por_marca,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'fetch failed',
    }
  }
}
