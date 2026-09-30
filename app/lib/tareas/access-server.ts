import 'server-only'
import { mergePermisos } from '@/lib/team/types'
import { taskAccess, taskEditable } from './access'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadTaskAccess(service: any, authUserId: string) {
  const { data: member, error } = await service.from('team_members')
    .select('id, email, nombre, rol_base, activo, permisos_override').eq('auth_user_id', authUserId).maybeSingle()
  if (error) throw new Error('No se pudieron comprobar los permisos. Intenta nuevamente.')
  if (!member?.activo) return { access: taskAccess(null), member: null, permisos: {} }
  const { data: role, error: roleError } = await service.from('roles_predefinidos').select('permisos_default').eq('id', member.rol_base).maybeSingle()
  if (roleError || !role) throw new Error('No se pudieron comprobar los permisos del equipo.')
  const permisos = mergePermisos(role.permisos_default ?? {}, member.permisos_override ?? {})
  return { access: taskAccess(member, permisos), member, permisos }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function mayEditTask(service: any, authUserId: string, tareaId: string) {
  const { access } = await loadTaskAccess(service, authUserId)
  const { data, error } = await service.from('tareas').select('team_member_id, created_by').eq('id', tareaId).maybeSingle()
  if (error) return { ok: false as const, error: 'No se pudo comprobar la tarea.' }
  if (!data || !taskEditable(access, data)) return { ok: false as const, error: 'No tienes permiso para modificar esta tarea.' }
  return { ok: true as const }
}
