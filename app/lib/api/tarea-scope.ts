// Alcance de filas de tareas / pendientes, igual que GET /api/v1/tareas.
// Sin fila en team_members = owner (team_member_id NULL). Director, admin
// o el miembro llamado Pedro pueden pedir otro team_member_id.

import { NextResponse } from 'next/server'
import type { ApiCaller } from '@/lib/api/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type TareaScope =
  | { kind: 'member'; teamMemberId: string }
  | { kind: 'admin_null' }

export type TareaActor = {
  teamMemberId: string | null
  puedeTodo: boolean
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status })
}

export function scopeFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
  scope: TareaScope,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  switch (scope.kind) {
    case 'member':
      return q.eq('team_member_id', scope.teamMemberId)
    case 'admin_null':
      return q.is('team_member_id', null)
    default: {
      const _never: never = scope
      return _never
    }
  }
}

export async function resolveTareaScope(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  caller: ApiCaller,
  requestedId: string | null,
): Promise<{ ok: true; scope: TareaScope } | { ok: false; response: NextResponse }> {
  if (requestedId && !UUID_RE.test(requestedId)) {
    return { ok: false, response: jsonError('team_member_id no es un uuid', 400) }
  }

  switch (caller.kind) {
    case 'cron':
      if (requestedId) return { ok: true, scope: { kind: 'member', teamMemberId: requestedId } }
      return { ok: true, scope: { kind: 'admin_null' } }
    case 'user':
    case 'device':
      break
    default: {
      const _never: never = caller
      return _never
    }
  }

  const { data: tm, error } = await service
    .from('team_members')
    .select('id, nombre, activo')
    .eq('auth_user_id', caller.userId)
    .maybeSingle()
  if (error) return { ok: false, response: jsonError(error.message, 500) }

  if (tm && tm.activo === false) {
    return { ok: false, response: jsonError('Miembro desactivado', 403) }
  }

  if (!tm) {
    if (requestedId) return { ok: true, scope: { kind: 'member', teamMemberId: requestedId } }
    return { ok: true, scope: { kind: 'admin_null' } }
  }

  const meId = tm.id as string
  if (requestedId && requestedId !== meId) {
    const esOwner = (tm.nombre ?? '').trim().toLowerCase() === 'pedro'
    if (!esOwner) {
      return { ok: false, response: jsonError('No puedes ver tareas de otro miembro', 403) }
    }
    return { ok: true, scope: { kind: 'member', teamMemberId: requestedId } }
  }
  return { ok: true, scope: { kind: 'member', teamMemberId: meId } }
}

export async function loadTareaActor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  userId: string,
): Promise<{ ok: true; actor: TareaActor } | { ok: false; response: NextResponse }> {
  const { data: tm, error } = await service
    .from('team_members')
    .select('id, nombre, rol_base, activo')
    .eq('auth_user_id', userId)
    .maybeSingle()
  if (error) return { ok: false, response: jsonError(error.message, 500) }
  if (tm && tm.activo === false) {
    return { ok: false, response: jsonError('Miembro desactivado', 403) }
  }
  if (!tm) return { ok: true, actor: { teamMemberId: null, puedeTodo: true } }

  const rol = typeof tm.rol_base === 'string' ? tm.rol_base : ''
  const nombre = typeof tm.nombre === 'string' ? tm.nombre.trim().toLowerCase() : ''
  const puedeTodo = rol === 'director' || rol === 'admin' || nombre === 'pedro'
  return {
    ok: true,
    actor: { teamMemberId: typeof tm.id === 'string' ? tm.id : null, puedeTodo },
  }
}

export function puedeTocarTarea(
  actor: TareaActor,
  row: { team_member_id?: string | null; created_by?: string | null },
): boolean {
  if (actor.puedeTodo) return true
  if (row.team_member_id && actor.teamMemberId && row.team_member_id === actor.teamMemberId) return true
  if (row.created_by && actor.teamMemberId && row.created_by === actor.teamMemberId) return true
  return false
}
