import type { Permisos } from '@/lib/team/types'

export type TaskAccess = {
  memberId: string | null
  active: boolean
  owner: boolean
  director: boolean
  viewTeam: boolean
  assign: boolean
  excluded: string[]
}
export function taskAccess(member: { id: string; email: string; rol_base: string; activo: boolean } | null, permisos: Permisos = {}): TaskAccess {
  const active = !!member?.activo && permisos.tareas?.acceso !== false
  const owner = active && member?.email.toLowerCase() === 'pedro@agenciadistinto.com'
  return {
    memberId: member?.id ?? null, active, owner,
    director: active && member?.rol_base === 'director',
    viewTeam: active && (owner || permisos.tareas?.ver_equipo === true),
    // La asignación ya estaba disponible para miembros activos; respeta overrides.
    assign: active && permisos.tareas?.puede_asignar !== false,
    excluded: owner ? [] : (permisos.tareas?.excluir_miembros ?? []).filter(id => /^[0-9a-f-]{36}$/i.test(id)),
  }
}
export function taskMemberVisible(access: TaskAccess, memberId: string | null): boolean {
  if (!access.active) return false
  if (access.owner) return true
  if (!memberId || access.excluded.includes(memberId)) return false
  return access.viewTeam || memberId === access.memberId
}
export function taskAssignable(access: TaskAccess, memberId: string): boolean {
  return access.active && !access.excluded.includes(memberId) && (memberId === access.memberId || access.assign)
}
export function taskEditable(access: TaskAccess, row: { team_member_id: string | null; created_by: string | null }): boolean {
  if (!access.active || (!access.owner && (!row.team_member_id || access.excluded.includes(row.team_member_id)))) return false
  return access.owner || access.director || row.team_member_id === access.memberId || row.created_by === access.memberId
}
// Filtrar ANTES de ordenar/limitar/serializar: tampoco se envían tareas ocultas al navegador.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scopeTasks(query: any, access: TaskAccess, requestedMember?: string | null) {
  if (!access.active || (requestedMember && !taskMemberVisible(access, requestedMember))) return query.is('id', null)
  if (requestedMember) query = query.eq('team_member_id', requestedMember)
  if (access.owner) return query
  if (!access.viewTeam) query = query.eq('team_member_id', access.memberId)
  else query = query.not('team_member_id', 'is', null)
  for (const id of access.excluded) query = query.neq('team_member_id', id)
  return query
}

export function canCreateBrand(member: { activo: boolean; rol_base: string } | null, permisos: Permisos): boolean {
  return !!member?.activo && (permisos.marcas?.puede_crear ?? ['director', 'admin'].includes(member.rol_base))
}
