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

  const categoria = await categorizarTarea(texto, [...colorByCat.keys()])

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

/* Verifica que el usuario pueda tocar esta tarea (dueño o CEO). */
async function puedeEditar(service: Service, authUserId: string, tareaId: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const me = await currentMember(service, authUserId)
  const { data: t } = await service.from('tareas').select('team_member_id').eq('id', tareaId).maybeSingle()
  if (!t) return { ok: false, error: 'Tarea no encontrada' }
  if (me.esCEO || t.team_member_id === me.id) return { ok: true }
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
