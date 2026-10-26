import 'server-only'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { calendarAccess } from './access'

export async function getCalendarAccess() {
  const p = await getCurrentMemberPermisos()
  // Un usuario sin miembro activo (incluido cliente) nunca es administrador.
  return calendarAccess(p ? {
    activo: p.member.activo,
    rolBase: p.member.rol_base,
    permisos: p.permisos,
  } : null)
}
