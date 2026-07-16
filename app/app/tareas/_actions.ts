// app/app/tareas/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { categorizarTarea, limpiarTexto, colorParaCategoria } from '@/lib/tareas/categorizar'
import { TAREA_SELECT as SELECT, rowToTarea } from '@/lib/tareas/serialize'
import type { Tarea, FocusLane } from '@/lib/tareas/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

/* Miembro actual + si es CEO (director). */
async function currentMember(service: Service, authUserId: string): Promise<{ id: string | null; esCEO: boolean }> {
  const { data: tm } = await service
    .from('team_members')
    .select('id, rol_base')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  return { id: tm?.id ?? null, esCEO: tm?.rol_base === 'director' }
}

function primerNombre(n: string): string {
  return (n ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? ''
}

/* Crea una tarea rápida YA asociada a una marca — botón "+ Tarea" de las cards
   del módulo Marcas (Pedro 13-jul). NO pasa por la IA: la marca la sabemos, así
   que la categoría es el nombre de la marca (cae en su columna del tablero) y
   guardamos marca_slug. Queda sincronizada con /tareas automáticamente porque
   es una fila normal de `tareas`. */
export async function crearTareaEnMarca(marcaSlug: string, textoOriginal: string): Promise<
  { ok: true; tarea: Tarea } | { ok: false; error: string }
> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const texto = (textoOriginal ?? '').trim()
  if (!texto) return { ok: false, error: 'No escribiste nada' }
  if (texto.length > 600) return { ok: false, error: 'Demasiado largo' }

  const me = await currentMember(service, user.id)

  const { data: marca } = await service
    .from('marcas')
    .select('nombre, slug')
    .eq('slug', marcaSlug)
    .maybeSingle()
  if (!marca) return { ok: false, error: 'Marca no encontrada' }

  /* Reusar el color de la columna de esa marca si ya existe. */
  const { data: existentes } = await service.from('tareas').select('categoria, color')
  const colorByCat = new Map<string, string>()
  const usados: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (existentes ?? []) as any[]) {
    if (!colorByCat.has(r.categoria)) { colorByCat.set(r.categoria, r.color); usados.push(r.color) }
  }
  const categoria = marca.nombre as string
  const color = colorByCat.get(categoria) ?? colorParaCategoria(usados)

  const { data, error } = await service
    .from('tareas')
    .insert({
      team_member_id: me.id,
      created_by: me.id,
      texto: limpiarTexto(texto),
      categoria,
      color,
      completada: false,
      focus_lane: null,
      marca_slug: marca.slug,
    })
    .select(SELECT)
    .single()
  if (error) return { ok: false, error: error.message }

  revalidatePath('/tareas')
  revalidatePath('/dashboard')
  revalidatePath('/inicio')
  return { ok: true, tarea: rowToTarea(data) }
}

export async function crearTarea(textoOriginal: string): Promise<
  { ok: true; tarea: Tarea } | { ok: false; error: string }
> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const texto = (textoOriginal ?? '').trim()
  if (!texto) return { ok: false, error: 'No escribiste nada' }
  if (texto.length > 600) return { ok: false, error: 'Demasiado largo' }

  const me = await currentMember(service, user.id)

  /* Miembros activos (para resolver asignación por nombre). */
  const { data: members } = await service.from('team_members').select('id, nombre').eq('activo', true)

  /* Categorías + colores existentes (para reusar color por columna). */
  const { data: existentes } = await service.from('tareas').select('categoria, color')
  const colorByCat = new Map<string, string>()
  const usados: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (existentes ?? []) as any[]) {
    if (!colorByCat.has(r.categoria)) { colorByCat.set(r.categoria, r.color); usados.push(r.color) }
  }

  /* Marcas del workspace → para que "mil ideas", "kintu", etc. caigan en su
     categoría de marca de forma determinística (sin depender solo de la IA). */
  const { data: marcasData } = await service.from('marcas').select('nombre, slug')
  const marcas = ((marcasData ?? []) as { nombre: string; slug: string }[])

  const categoria = await categorizarTarea(texto, [...colorByCat.keys()], marcas)

  /* Asignación: si la categoría es un miembro del equipo, la tarea es suya. */
  const catLower = categoria.toLowerCase().trim()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = ((members ?? []) as any[]).find(
    (m) => (m.nombre ?? '').toLowerCase().trim() === catLower || primerNombre(m.nombre) === catLower,
  )
  const ownerId = target?.id ?? me.id

  const color = colorByCat.get(categoria) ?? colorParaCategoria(usados)

  const { data, error } = await service
    .from('tareas')
    .insert({
      team_member_id: ownerId,
      created_by: me.id,
      texto: limpiarTexto(texto),
      categoria,
      color,
      completada: false,
      focus_lane: null,
    })
    .select(SELECT)
    .single()
  if (error) return { ok: false, error: error.message }

  revalidatePath('/tareas')
  revalidatePath('/inicio')
  return { ok: true, tarea: rowToTarea(data) }
}

/* Verifica que el usuario pueda tocar esta tarea (dueño, CREADOR o CEO). */
async function puedeEditar(service: Service, authUserId: string, tareaId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const me = await currentMember(service, authUserId)
  const { data: t } = await service.from('tareas').select('team_member_id, created_by').eq('id', tareaId).maybeSingle()
  if (!t) return { ok: false, error: 'Tarea no encontrada' }
  /* Puede tocarla: el CEO, el dueño (a quien está asignada), o el CREADOR —
     aunque la haya asignado a otra persona con una @mención. Fix Pedro 07-jul:
     Erick creaba tareas que se asignaban a otro (Pedro/Ruth) y luego no las
     podía borrar ("Esta tarea no es tuya"). */
  if (me.esCEO || t.team_member_id === me.id || t.created_by === me.id) return { ok: true }
  return { ok: false, error: 'Esta tarea no es tuya' }
}

export async function completarTarea(id: string, completada = true): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const perm = await puedeEditar(service, user.id, id)
  if (!perm.ok) return perm
  const { error } = await service
    .from('tareas')
    .update({ completada, completada_at: completada ? new Date().toISOString() : null, focus_lane: completada ? null : undefined })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/tareas'); revalidatePath('/inicio')
  return { ok: true }
}

export async function eliminarTarea(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const perm = await puedeEditar(service, user.id, id)
  if (!perm.ok) return perm
  const { error } = await service.from('tareas').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/tareas'); revalidatePath('/inicio')
  return { ok: true }
}

export async function moverTareaCategoria(id: string, nuevaCategoria: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const cat = (nuevaCategoria ?? '').trim()
  if (!cat) return { ok: false, error: 'Categoría vacía' }
  const perm = await puedeEditar(service, user.id, id)
  if (!perm.ok) return perm
  /* Reusar color si la categoría ya existe; sino el siguiente libre. */
  const { data: existentes } = await service.from('tareas').select('categoria, color')
  const colorByCat = new Map<string, string>()
  const usados: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (existentes ?? []) as any[]) {
    if (!colorByCat.has(r.categoria)) { colorByCat.set(r.categoria, r.color); usados.push(r.color) }
  }
  const color = colorByCat.get(cat) ?? colorParaCategoria(usados)
  const { error } = await service.from('tareas').update({ categoria: cat, color }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/tareas')
  return { ok: true }
}

export async function setFocusLane(id: string, lane: FocusLane | null): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const perm = await puedeEditar(service, user.id, id)
  if (!perm.ok) return perm

  /* Tope de 3 en manual/delegar (igual que la app Notas). */
  if (lane === 'manual' || lane === 'delegar') {
    const { data: t } = await service.from('tareas').select('team_member_id').eq('id', id).maybeSingle()
    const ownerId = t?.team_member_id ?? null
    const q = service.from('tareas').select('id', { count: 'exact', head: true })
      .eq('focus_lane', lane).eq('completada', false).neq('id', id)
    if (ownerId) q.eq('team_member_id', ownerId)
    const { count } = await q
    if ((count ?? 0) >= 3) return { ok: false, error: `El carril ya tiene 3 tareas` }
  }

  const { error } = await service.from('tareas').update({ focus_lane: lane }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/tareas')
  return { ok: true }
}

/* Resuelve la marca de una nota: marca_slug explícita → categoría como nombre
   de marca ("Little Joe") → categoría slugificada → 'interno' (bucket interno). */
async function resolverMarcaDeTarea(
  service: Service,
  marcaSlug: string | null,
  categoria: string | null,
): Promise<{ id: string; slug: string } | null> {
  const bySlug = async (slug: string) => {
    const { data } = await service.from('marcas').select('id, slug').eq('slug', slug).maybeSingle()
    return data ?? null
  }
  if (marcaSlug) { const m = await bySlug(marcaSlug.toLowerCase().trim()); if (m) return m }
  const cat = (categoria ?? '').trim()
  if (cat && cat.toLowerCase() !== 'general') {
    const { data } = await service.from('marcas').select('id, slug').ilike('nombre', cat).limit(1)
    if (data && data[0]) return data[0]
    const slug = cat.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (slug) { const m = await bySlug(slug); if (m) return m }
  }
  return await bySlug('interno')
}

/* PUENTE: manda una nota rápida del tablero "Tareas" a "Mis diseños para hoy".
   Crea una tarea de diseño (publicacion es_tarea_diseno=true) con la marca de la
   nota, marcada para diseñar HOY y atribuida a quien la anotó (para que salga en
   el Reporte del día). Enlaza tareas.diseno_id → así el trabajo vive en AMBAS
   pantallas SIN duplicarse. Idempotente: si ya se mandó, devuelve el mismo id.
   Pedro 07-jul: "que su trabajo esté en ambas: anota rápido en Tareas y que
   tenga el flujo completo en Diseños". */
export async function enviarTareaADiseno(id: string): Promise<{ ok: boolean; error?: string; disenoId?: string }> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const perm = await puedeEditar(service, user.id, id)
  if (!perm.ok) return perm

  const { data: t } = await service
    .from('tareas')
    .select('texto, categoria, marca_slug, diseno_id, team_member_id')
    .eq('id', id)
    .maybeSingle()
  if (!t) return { ok: false, error: 'Tarea no encontrada' }
  if (t.diseno_id) return { ok: true, disenoId: t.diseno_id as string }  // ya enlazada

  const marca = await resolverMarcaDeTarea(service, t.marca_slug ?? null, t.categoria ?? null)
  if (!marca) return { ok: false, error: 'No se pudo resolver la marca (falta la marca "interno").' }

  /* Diseñador = dueño de la nota, para atribuirlo en el reporte. */
  let disenadorNombre: string | null = null
  let disenadorId: string | null = null
  if (t.team_member_id) {
    const { data: m } = await service.from('team_members').select('nombre').eq('id', t.team_member_id).maybeSingle()
    disenadorNombre = m?.nombre ?? null
    if (disenadorNombre) {
      const { data: d } = await service.from('disenadores').select('id').ilike('nombre', disenadorNombre).limit(1)
      disenadorId = (d && d[0]?.id) ?? null
    }
  }

  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

  const insert: Record<string, unknown> = {
    marca_id: marca.id,
    nombre: (t.texto ?? 'Diseño').slice(0, 300),
    estado: 'disenar',
    estado_tarea: 'sin_empezar',
    es_tarea_diseno: true,
    fecha_diseno: hoy,
    fecha_marcada_para_disenar: hoy,   // → aparece en "Mis diseños para hoy"
    disenador_id: disenadorId,
    disenador_nombre: disenadorNombre,
    plataformas: [], tipo_contenido: [], objetivos: [],
    created_by: user.id, updated_by: user.id,
  }
  const { data: nueva, error } = await service.from('publicaciones').insert(insert).select('id').single()
  if (error) return { ok: false, error: error.message }

  const { error: linkErr } = await service.from('tareas')
    .update({ diseno_id: nueva.id, marca_slug: marca.slug }).eq('id', id)
  if (linkErr) return { ok: false, error: linkErr.message }

  revalidatePath('/diseno'); revalidatePath('/tareas'); revalidatePath('/inicio')
  return { ok: true, disenoId: nueva.id as string }
}
