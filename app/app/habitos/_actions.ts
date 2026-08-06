// app/app/habitos/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import type { HabitoRow } from '@/lib/types/database'

// Util: ISO weekday (1=lun..7=dom) desde un Date
function isoDayOfWeek(d: Date): number {
  const js = d.getDay()  // 0=Dom..6=Sáb
  return js === 0 ? 7 : js
}

/* Fecha de HOY en PERÚ (UTC-5).
   BUG que arregla (Pedro 16-jul-2026): antes usaba `new Date().toISOString()`,
   que es UTC. Como Perú va 5 horas atrás, a partir de las 7 p.m. hora peruana
   el UTC ya está en el día siguiente → el hábito se guardaba con la fecha de
   MAÑANA. El reporte del día busca por fecha de Lima (fechaLimaIso en
   lib/inicio/load-reporte-del-dia.ts), así que no lo encontraba y el hábito
   salía como no cumplido. Ahora ambos hablan el mismo idioma: hora de Perú. */
function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

export type HabitoConEstado = HabitoRow & {
  completado_hoy: boolean
  completado_at: string | null  // timestamp del último completion de hoy si existe
  // historial: array de fechas (YYYY-MM-DD) completadas en los últimos N días
  historial: string[]
  // KPI: % cumplimiento sobre dias_activos en los últimos 49 días
  pct_cumplimiento: number
  // Conteo de días esperados vs cumplidos en últimos 49 días
  dias_esperados: number
  dias_cumplidos: number
}

/**
 * Lista TODOS los hábitos activos con su estado HOY + heatmap de últimos 49 días.
 * Single query optimizada: 1 select habitos + 1 select completados últimos 49 días.
 */
export async function listHabitosConEstado(): Promise<
  { ok: true; habitos: HabitoConEstado[]; today: string } | { ok: false; error: string }
> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const today = todayStr()

  /* Ventana de 49 días para heatmap (7 semanas). Se ancla en el HOY de Perú
     (no en el UTC del servidor) para que el calendario cuadre con las fechas
     que guardamos. Mediodía UTC evita saltos de día al restar. */
  const desde = new Date(today + 'T12:00:00Z')
  desde.setUTCDate(desde.getUTCDate() - 48)  // 49 días contando hoy
  const desdeStr = desde.toISOString().slice(0, 10)

  /* Resolver team_member_id del usuario logueado para filtrar habitos.
     Pedro pidió que cada miembro tenga sus propios hábitos.
     - Si hay team_member → filtrar por team_member_id = X
     - Si NO hay (admin/owner) → filtrar por team_member_id IS NULL
       (los hábitos "default" del owner) */
  const { data: tm } = await service
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const teamMemberId = tm?.id ?? null

  // 1. Hábitos activos del usuario actual
  let habsQuery = service
    .from('habitos')
    .select('id, nombre, icono, color, dias_activos, orden, activo, created_at, updated_at, team_member_id')
    .eq('activo', true)
    .order('orden', { ascending: true })
  if (teamMemberId) {
    habsQuery = habsQuery.eq('team_member_id', teamMemberId)
  } else {
    habsQuery = habsQuery.is('team_member_id', null)
  }
  const habsResult = await habsQuery

  if (habsResult.error) {
    if ((habsResult.error.message ?? '').includes('does not exist')) {
      return { ok: true, habitos: [], today }
    }
    return { ok: false, error: habsResult.error.message }
  }
  const habitos = (habsResult.data ?? []) as HabitoRow[]
  if (habitos.length === 0) return { ok: true, habitos: [], today }

  // 2. Completados últimos 49 días (incluyendo hoy)
  const completedResult = await service
    .from('habitos_completados')
    .select('habito_id, fecha, completado_at')
    .gte('fecha', desdeStr)
    .lte('fecha', today)

  if (completedResult.error) {
    return { ok: false, error: completedResult.error.message }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completed = (completedResult.data ?? []) as any[]

  // 3. Agrupar completados por habito_id
  const byHabito = new Map<string, { fecha: string; completado_at: string }[]>()
  for (const c of completed) {
    const arr = byHabito.get(c.habito_id) ?? []
    arr.push({ fecha: c.fecha, completado_at: c.completado_at })
    byHabito.set(c.habito_id, arr)
  }

  // 4. Computar estado de cada hábito
  const result: HabitoConEstado[] = habitos.map((h) => {
    const completes = byHabito.get(h.id) ?? []
    const completesSet = new Set(completes.map((c) => c.fecha))

    // Días esperados en últimos 49 días según dias_activos
    let diasEsperados = 0
    const cursor = new Date(desde.toISOString().slice(0, 10) + 'T12:00:00Z')
    const hoyDate = new Date(today + 'T12:00:00Z')
    while (cursor <= hoyDate) {
      const iso = isoDayOfWeek(cursor)
      if (h.dias_activos.includes(iso)) diasEsperados++
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    const diasCumplidos = completes.length
    const pct = diasEsperados > 0 ? Math.round((diasCumplidos / diasEsperados) * 100) : 0

    const completedHoy = completesSet.has(today)
    const todayCompletado = completes.find((c) => c.fecha === today)

    return {
      ...h,
      completado_hoy: completedHoy,
      completado_at: todayCompletado?.completado_at ?? null,
      historial: completes.map((c) => c.fecha).sort(),
      pct_cumplimiento: pct,
      dias_esperados: diasEsperados,
      dias_cumplidos: diasCumplidos,
    }
  })

  return { ok: true, habitos: result, today }
}

/**
 * Helper: confirma que el habitoId pertenece al user actual.
 * Devuelve { ok: false } si el hábito no existe o no es del user.
 *
 * Cada user tiene sus propios hábitos (team_member_id) y NO debe poder
 * tocar los de otro. Sin este check, Lorena podría completar/borrar
 * los hábitos de Pieer si conoce el UUID.
 */
async function assertOwnership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  userId: string,
  habitoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  /* team_member_id del user actual (null si es admin/owner sin perfil) */
  const { data: tm } = await service
    .from('team_members')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  const teamMemberId = tm?.id ?? null

  const { data: h } = await service
    .from('habitos')
    .select('id, team_member_id')
    .eq('id', habitoId)
    .maybeSingle()

  if (!h) return { ok: false, error: 'Hábito no encontrado' }
  if (h.team_member_id !== teamMemberId) {
    return { ok: false, error: 'Este hábito no es tuyo' }
  }
  return { ok: true }
}

/**
 * Toggle de hábito: si NO está marcado hoy → marca. Si está marcado → desmarca.
 */
export async function toggleHabitoHoy(habitoId: string): Promise<{ ok: true; completado: boolean } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const today = todayStr()

  /* Validar que el hábito sea del user actual antes de tocarlo */
  const own = await assertOwnership(service, user.id, habitoId)
  if (!own.ok) return own

  // Check si ya está marcado hoy
  const existing = await service
    .from('habitos_completados')
    .select('id')
    .eq('habito_id', habitoId)
    .eq('fecha', today)
    .maybeSingle()

  if (existing.data) {
    // Ya marcado → desmarcar
    const { error } = await service
      .from('habitos_completados')
      .delete()
      .eq('id', existing.data.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/habitos'); revalidatePath('/inicio')
    return { ok: true, completado: false }
  }

  // No marcado → marcar
  const { error } = await service
    .from('habitos_completados')
    .insert({ habito_id: habitoId, fecha: today })
  if (error) {
    // Si fue race condition (UNIQUE constraint), trato como ya estaba
    if ((error.message ?? '').includes('duplicate') || (error.message ?? '').includes('unique')) {
      revalidatePath('/habitos'); revalidatePath('/inicio')
      return { ok: true, completado: true }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/habitos'); revalidatePath('/inicio')
  return { ok: true, completado: true }
}

/**
 * Marca/desmarca un hábito en CUALQUIER fecha (no solo hoy) — para la grilla
 * semanal/mensual clickeable. No permite fechas futuras.
 */
export async function toggleHabitoFecha(
  habitoId: string,
  fecha: string,
): Promise<{ ok: true; completado: boolean } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: 'Fecha inválida' }
  /* Pedro: 'no debe poder marcarse ni después ni antes' del día actual.
     Bloqueamos también pasados aunque la prop original lo permitía.
     Si en el futuro necesitamos editar histórico, hacer una action
     separada con permiso admin (ej. para corregir un día que olvidó
     marcar por estar enfermo). */
  const hoy = todayStr()
  if (fecha > hoy) return { ok: false, error: 'No puedes marcar días futuros' }
  if (fecha < hoy) return { ok: false, error: 'Solo puedes marcar el hábito el mismo día' }

  /* Validar ownership */
  const own = await assertOwnership(service, user.id, habitoId)
  if (!own.ok) return own

  const existing = await service
    .from('habitos_completados')
    .select('id')
    .eq('habito_id', habitoId)
    .eq('fecha', fecha)
    .maybeSingle()

  if (existing.data) {
    const { error } = await service.from('habitos_completados').delete().eq('id', existing.data.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/habitos'); revalidatePath('/inicio')
    return { ok: true, completado: false }
  }

  const { error } = await service.from('habitos_completados').insert({ habito_id: habitoId, fecha })
  if (error) {
    if ((error.message ?? '').includes('duplicate') || (error.message ?? '').includes('unique')) {
      revalidatePath('/habitos'); revalidatePath('/inicio')
      return { ok: true, completado: true }
    }
    return { ok: false, error: error.message }
  }
  revalidatePath('/habitos'); revalidatePath('/inicio')
  return { ok: true, completado: true }
}

/**
 * Crear un hábito nuevo.
 */
export async function createHabito(args: {
  nombre: string
  icono?: string
  color?: string
  dias_activos?: number[]
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const nombre = args.nombre.trim()
  if (!nombre) return { ok: false, error: 'Nombre obligatorio' }

  /* Resolver team_member_id del usuario actual. El nuevo hábito queda
     asociado a él (su lista privada). Admin/owner → team_member_id null. */
  const { data: tm } = await service
    .from('team_members')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const teamMemberId = tm?.id ?? null

  // Calcular siguiente orden (max + 10) — solo dentro de los hábitos del MISMO dueño
  let maxOrdenQuery = service
    .from('habitos')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1)
  if (teamMemberId) {
    maxOrdenQuery = maxOrdenQuery.eq('team_member_id', teamMemberId)
  } else {
    maxOrdenQuery = maxOrdenQuery.is('team_member_id', null)
  }
  const maxOrden = await maxOrdenQuery.maybeSingle()
  const nextOrden = (maxOrden.data?.orden ?? 0) + 10

  const { data, error } = await service
    .from('habitos')
    .insert({
      nombre,
      icono: args.icono?.trim() || '✅',
      color: args.color?.trim() || '#6366F1',
      dias_activos: args.dias_activos ?? [1, 2, 3, 4, 5],
      orden: nextOrden,
      activo: true,
      team_member_id: teamMemberId,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath('/habitos'); revalidatePath('/inicio')
  return { ok: true, id: data.id }
}

/**
 * Soft-delete: marca activo=false en lugar de borrar (conserva historial).
 */
export async function archivarHabito(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  /* Validar ownership: Lorena no puede archivar el hábito de Pieer */
  const own = await assertOwnership(service, user.id, id)
  if (!own.ok) return own
  const { error } = await service.from('habitos').update({ activo: false }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/habitos'); revalidatePath('/inicio')
  return { ok: true }
}

/**
 * Hard-delete: borra el hábito Y todo su historial de completados.
 * Pedro pidió permitir eliminar definitivamente (no solo archivar).
 *
 * Diferencia con archivarHabito:
 *   - archivar: marca activo=false (recuperable, mantiene historial)
 *   - eliminar: DELETE completo (no recuperable)
 *
 * Orden de borrado:
 *   1. habitos_completados (FK → habitos.id) — sino el DELETE falla
 *   2. habitos (la fila en sí)
 */
export async function eliminarHabito(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Validar ownership igual que en archivar */
  const own = await assertOwnership(service, user.id, id)
  if (!own.ok) return own

  /* 1. Borrar el historial de completados (FK constraint) */
  const compRes = await service.from('habitos_completados').delete().eq('habito_id', id)
  if (compRes.error) return { ok: false, error: compRes.error.message }

  /* 2. Borrar el hábito */
  const { error } = await service.from('habitos').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/habitos'); revalidatePath('/inicio')
  return { ok: true }
}

/**
 * Editar hábito (nombre/icono/color/dias_activos).
 */
export async function updateHabito(
  id: string,
  patch: { nombre?: string; icono?: string; color?: string; dias_activos?: number[] },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  /* Validar ownership */
  const own = await assertOwnership(service, user.id, id)
  if (!own.ok) return own
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {}
  if (patch.nombre !== undefined) payload.nombre = patch.nombre.trim()
  if (patch.icono !== undefined) payload.icono = patch.icono.trim() || '✅'
  if (patch.color !== undefined) payload.color = patch.color.trim() || '#6366F1'
  if (patch.dias_activos !== undefined) payload.dias_activos = patch.dias_activos

  const { error } = await service.from('habitos').update(payload).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/habitos'); revalidatePath('/inicio')
  return { ok: true }
}
