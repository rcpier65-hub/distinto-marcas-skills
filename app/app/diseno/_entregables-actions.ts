// app/app/diseno/_entregables-actions.ts
'use server'

/* ENTREGABLES de una tarea de diseño — Pedro 30-sep-2026.
   Una tarea de Historias / Posts / Carruseles tiene varios entregables (uno por
   fecha). Cada entregable está enlazado a SU publicación del calendario:
   - si Lorena ya había creado esa publicación, se ENLAZA (no se duplica);
   - si no, se crea al crear la tarea.
   Ailyn sube un link por entregable (con su título) y lo marca listo; eso se
   refleja en la publicación (portada / resultado) para Lorena y Paolo, que la
   siguen viendo en su vista clásica del calendario. */

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { updateDisenoEntry } from './_actions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Err = { ok: false; error: string }

export type TipoEntregable = 'post' | 'carrusel' | 'historia'
const VALOR_TIPO: Record<TipoEntregable, string> = { post: 'POST', carrusel: 'CARRUSEL', historia: 'HISTORIA' }

export type PubCalendario = {
  id: string
  nombre: string
  fecha: string
  tipo: string | null
  enlazada: boolean   // ya tiene una tarea de diseño asignada
}

export type Entregable = {
  id: string
  orden: number
  titulo: string
  fecha: string | null
  link: string | null
  listoAt: string | null
  publicacionId: string | null
}

async function miembroActivo(service: Service, authUserId: string): Promise<boolean> {
  const { data } = await service.from('team_members').select('id').eq('auth_user_id', authUserId).eq('activo', true).maybeSingle()
  return !!data
}

function refrescar(tareaId?: string) {
  revalidatePath('/diseno')
  if (tareaId) revalidatePath(`/diseno/${tareaId}`)
  revalidatePath('/publicaciones')
}

/* Calendario de publicaciones de una marca (para elegir los días al crear). */
export async function calendarioMarcaParaDiseno(marcaSlug: string, desde: string, hasta: string): Promise<{ ok: true; pubs: PubCalendario[] } | Err> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  if (!(await miembroActivo(service, user.id))) return { ok: false, error: 'No autorizado' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return { ok: false, error: 'Rango inválido' }
  const { data: marca } = await service.from('marcas').select('id').eq('slug', marcaSlug).maybeSingle()
  if (!marca) return { ok: false, error: 'Marca no encontrada' }
  const { data, error } = await service.from('publicaciones')
    .select('id, nombre, fecha_publicacion, tipo_contenido')
    .eq('marca_id', marca.id)
    .gte('fecha_publicacion', desde)
    .lte('fecha_publicacion', `${hasta}T23:59:59`)
    .is('archived_at', null)
    .order('fecha_publicacion', { ascending: true })
    .limit(200)
  if (error) return { ok: false, error: error.message }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas = (data ?? []) as any[]
  const ids = filas.map((r) => r.id as string)
  const enlazadas = new Set<string>()
  if (ids.length) {
    const { data: ya } = await service.from('diseno_entregables').select('publicacion_id').in('publicacion_id', ids)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (ya ?? []) as any[]) if (r.publicacion_id) enlazadas.add(r.publicacion_id)
  }
  return {
    ok: true,
    pubs: filas.map((r) => ({
      id: r.id as string,
      nombre: (r.nombre ?? '(sin título)') as string,
      fecha: String(r.fecha_publicacion).slice(0, 10),
      tipo: (Array.isArray(r.tipo_contenido) && r.tipo_contenido[0]) ? String(r.tipo_contenido[0]) : null,
      enlazada: enlazadas.has(r.id),
    })),
  }
}

/* Crea los entregables de una tarea recién creada. Idempotente: si la tarea
   ya tiene entregables (reintento), no hace nada. */
export async function crearEntregables(input: {
  tareaId: string
  marcaSlug: string
  tipo: TipoEntregable
  plataformas: string[]
  items: { publicacionId?: string | null; fecha: string; titulo: string }[]
}): Promise<{ ok: true; creados: number } | Err> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  if (!(await miembroActivo(service, user.id))) return { ok: false, error: 'No autorizado' }
  if (!VALOR_TIPO[input.tipo]) return { ok: false, error: 'Tipo inválido' }
  const items = (input.items ?? []).filter((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.fecha)).slice(0, 31)
  if (items.length === 0) return { ok: false, error: 'Elige al menos un día' }

  const { data: tarea } = await service.from('publicaciones').select('id').eq('id', input.tareaId).eq('es_tarea_diseno', true).maybeSingle()
  if (!tarea) return { ok: false, error: 'La tarea no existe' }
  const { count } = await service.from('diseno_entregables').select('id', { count: 'exact', head: true }).eq('tarea_id', input.tareaId)
  if ((count ?? 0) > 0) return { ok: true, creados: 0 }

  const { data: marca } = await service.from('marcas').select('id').eq('slug', input.marcaSlug).maybeSingle()
  if (!marca) return { ok: false, error: 'Marca no encontrada' }
  const valor = VALOR_TIPO[input.tipo]
  const plataformas = (input.plataformas ?? []).filter((p) => ['Instagram', 'Facebook', 'Tiktok', 'Youtube'].includes(p))

  const filas: Record<string, unknown>[] = []
  let orden = 1
  for (const it of items) {
    const titulo = (it.titulo || '').trim().slice(0, 200) || `${valor.charAt(0)}${valor.slice(1).toLowerCase()} ${orden}`
    let pubId: string | null = null
    if (it.publicacionId) {
      /* ENLAZAR la que Lorena ya creó (solo si es de la misma marca). */
      const { data: pub } = await service.from('publicaciones').select('id, marca_id, tipo_contenido').eq('id', it.publicacionId).maybeSingle()
      if (pub && pub.marca_id === marca.id) {
        pubId = pub.id
        if (!Array.isArray(pub.tipo_contenido) || pub.tipo_contenido.length === 0) {
          await service.from('publicaciones').update({ tipo_contenido: [valor], updated_by: user.id }).eq('id', pub.id)
        }
      }
    }
    if (!pubId) {
      const { data: nueva, error } = await service.from('publicaciones').insert({
        marca_id: marca.id,
        nombre: titulo,
        fecha_publicacion: it.fecha,
        estado: 'tareas',
        plataformas,
        tipo_contenido: [valor],
        objetivos: [],
        created_by: user.id,
        updated_by: user.id,
      }).select('id').single()
      if (error || !nueva) return { ok: false, error: `No se pudo crear la publicación del ${it.fecha}: ${error?.message ?? ''}` }
      pubId = nueva.id
    }
    filas.push({ tarea_id: input.tareaId, publicacion_id: pubId, orden, titulo, fecha: it.fecha })
    orden++
  }
  const { error } = await service.from('diseno_entregables').insert(filas)
  if (error) return { ok: false, error: error.message }
  refrescar(input.tareaId)
  return { ok: true, creados: filas.length }
}

export async function listarEntregables(tareaId: string): Promise<{ ok: true; entregables: Entregable[] } | Err> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  if (!(await miembroActivo(service, user.id))) return { ok: false, error: 'No autorizado' }
  const { data, error } = await service.from('diseno_entregables')
    .select('id, orden, titulo, fecha, link, listo_at, publicacion_id').eq('tarea_id', tareaId).order('orden')
  if (error) return { ok: false, error: error.message }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { ok: true, entregables: ((data ?? []) as any[]).map(filaAEntregable) }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filaAEntregable(r: any): Entregable {
  return {
    id: r.id, orden: r.orden, titulo: r.titulo ?? '', fecha: r.fecha ?? null,
    link: r.link ?? null, listoAt: r.listo_at ?? null, publicacionId: r.publicacion_id ?? null,
  }
}

/* Guardar el título y/o el link de UN entregable (se refleja en su publicación). */
export async function guardarEntregable(id: string, patch: { titulo?: string; link?: string | null }): Promise<{ ok: true } | Err> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  if (!(await miembroActivo(service, user.id))) return { ok: false, error: 'No autorizado' }
  const { data: e } = await service.from('diseno_entregables').select('id, tarea_id, publicacion_id').eq('id', id).maybeSingle()
  if (!e) return { ok: false, error: 'Entregable no encontrado' }
  const upd: Record<string, unknown> = {}
  const pubUpd: Record<string, unknown> = {}
  if (typeof patch.titulo === 'string') {
    const t = patch.titulo.trim().slice(0, 200)
    upd.titulo = t
    if (t) pubUpd.nombre = t
  }
  if (patch.link !== undefined) {
    const l = (patch.link ?? '').trim()
    if (l && !/^https?:\/\/\S+$/i.test(l)) return { ok: false, error: 'Pega un link válido (https://…)' }
    upd.link = l || null
    pubUpd.portada_editada_url = l || null
    pubUpd.drive_resultado_url = l || null
    if (!l) upd.listo_at = null
  }
  if (Object.keys(upd).length === 0) return { ok: true }
  const { error } = await service.from('diseno_entregables').update(upd).eq('id', id)
  if (error) return { ok: false, error: error.message }
  if (e.publicacion_id && Object.keys(pubUpd).length > 0) {
    await service.from('publicaciones').update({ ...pubUpd, updated_by: user.id }).eq('id', e.publicacion_id)
  }
  refrescar(e.tarea_id)
  return { ok: true }
}

/* Marcar / desmarcar un entregable como listo. Cuando TODOS están listos, la
   tarea de diseño pasa a "listo" (sella diseno_terminado_at). */
export async function marcarEntregableListo(id: string, listo: boolean): Promise<{ ok: true; todosListos: boolean } | Err> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  if (!(await miembroActivo(service, user.id))) return { ok: false, error: 'No autorizado' }
  const { data: e } = await service.from('diseno_entregables').select('id, tarea_id, publicacion_id, link').eq('id', id).maybeSingle()
  if (!e) return { ok: false, error: 'Entregable no encontrado' }
  if (listo && !e.link) return { ok: false, error: 'Primero pega el link del diseño' }
  const { error } = await service.from('diseno_entregables').update({ listo_at: listo ? new Date().toISOString() : null }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  if (e.publicacion_id) {
    await service.from('publicaciones').update({ disenado: listo, portada_lista: listo, updated_by: user.id }).eq('id', e.publicacion_id)
  }
  const { data: todos } = await service.from('diseno_entregables').select('listo_at').eq('tarea_id', e.tarea_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lista = ((todos ?? []) as any[])
  const todosListos = lista.length > 0 && lista.every((r) => !!r.listo_at)
  const { data: tarea } = await service.from('publicaciones').select('estado_tarea').eq('id', e.tarea_id).maybeSingle()
  if (todosListos && tarea?.estado_tarea !== 'listo' && tarea?.estado_tarea !== 'enviado') {
    await updateDisenoEntry(e.tarea_id, { subEstado: 'listo' })
  } else if (!todosListos && (tarea?.estado_tarea === 'listo')) {
    await updateDisenoEntry(e.tarea_id, { subEstado: 'en_progreso' })
  } else if (listo && tarea?.estado_tarea === 'sin_empezar') {
    await updateDisenoEntry(e.tarea_id, { subEstado: 'en_progreso' })
  }
  refrescar(e.tarea_id)
  return { ok: true, todosListos }
}
