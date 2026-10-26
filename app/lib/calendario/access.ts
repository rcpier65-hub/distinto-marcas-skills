import type { Permisos } from '../team/types'

/** Permiso de calendario independiente del rol y de la edición de publicaciones. */
export function calendarAccess(member: {
  activo: boolean
  rolBase: string | null
  permisos: Permisos
} | null) {
  if (!member?.activo) return { view: false, schedule: false, manage: false }
  const { permisos, rolBase } = member
  const director = rolBase === 'director' || rolBase === 'admin'
  const view = permisos.calendario?.acceso ?? permisos.publicaciones?.acceso === true
  const manage = view && (permisos.calendario?.puede_editar ?? director)
  const schedule = view && (permisos.calendario?.puede_editar ?? (director || rolBase === 'disenador'))
  return { view, schedule, manage }
}
