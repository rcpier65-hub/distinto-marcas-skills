// app/lib/team/permisos-helper.ts
//
// Helper server-only para obtener los permisos efectivos del usuario
// logueado en cada request. Lo usa el sidebar, las route guards y
// cualquier server component que necesite saber qué puede mostrar.
//
// Estrategia defensiva: si el usuario logueado NO tiene team_member
// asociado (caso de Pedro y los usuarios viejos que entran con Google
// sin haber sido creados desde /equipo), devuelve null → cada lugar
// que llama interpreta "null = admin/owner, mostrar todo".
//
// Esto evita que Pedro se quede afuera de su propia app cuando
// activamos el filtrado por permisos.

import { cache } from 'react'
import { getUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import {
  type Permisos,
  type TeamMember,
  type RolPredefinido,
  mergePermisos,
  type ModuloPermiso,
  tieneAcceso,
} from '@/lib/team/types'

export type PermisosEfectivos = {
  member: TeamMember
  rol: RolPredefinido
  permisos: Permisos
  /* Acceso rápido a todas las marcas del miembro (ids). Si tiene
     acceso "todas", devuelve null (igual al campo en BD). */
  marcasAcceso: string[] | null
}

/**
 * Lee el usuario logueado, busca su team_member, hace merge con el rol
 * base. Cached por request usando `cache()` de React — múltiples
 * llamadas en el mismo render no impactan performance.
 *
 * Returns null si:
 *   - No hay usuario logueado
 *   - El usuario existe en auth.users pero no tiene team_member
 *     (= admin/owner del sistema, ej. Pedro)
 *   - El team_member está desactivado
 */
export const getCurrentMemberPermisos = cache(async (): Promise<PermisosEfectivos | null> => {
  const user = await getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Buscamos por auth_user_id. Cuando Pedro asigna contraseña a un
     miembro desde /equipo, el flujo setea este FK al crear el user
     en Supabase Auth. */
  const { data: member } = await service
    .from('team_members')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!member) return null
  if (!member.activo) return null

  /* Cargar el rol predefinido para hacer merge */
  const { data: rol } = await service
    .from('roles_predefinidos')
    .select('*')
    .eq('id', member.rol_base)
    .maybeSingle()

  if (!rol) return null

  const permisos = mergePermisos(rol.permisos_default ?? {}, member.permisos_override ?? {})

  return {
    member: member as TeamMember,
    rol: rol as RolPredefinido,
    permisos,
    marcasAcceso: member.marcas_acceso,
  }
})

/**
 * Helper: ¿puede el usuario actual ver este módulo?
 *
 * Devuelve true si:
 *   - No hay team_member asociado (= admin/owner, ve todo)
 *   - El team_member tiene acceso al módulo según permisos efectivos
 *
 * Usado por el sidebar y por route guards.
 */
export async function puedeVerModulo(modulo: ModuloPermiso): Promise<boolean> {
  const p = await getCurrentMemberPermisos()
  if (!p) return true  /* admin/owner sin team_member: todo accesible */
  return tieneAcceso(p.permisos, modulo)
}

/**
 * Helper: ¿puede el usuario actual ver/operar esta marca?
 */
export async function puedeVerMarca(marcaId: string): Promise<boolean> {
  const p = await getCurrentMemberPermisos()
  if (!p) return true
  if (p.marcasAcceso === null) return true  /* "todas las marcas" */
  return p.marcasAcceso.includes(marcaId)
}

/**
 * Para route guards en pages: redirige a /cockpit si no tiene acceso
 * al módulo. Si el cockpit tampoco se puede, redirige al primer módulo
 * que sí tenga acceso, o a /login.
 */
export async function requirePermisoModulo(
  modulo: ModuloPermiso,
): Promise<PermisosEfectivos | null> {
  const p = await getCurrentMemberPermisos()
  if (!p) return null  /* admin: passthrough */
  if (tieneAcceso(p.permisos, modulo)) return p
  /* Tirar error de redirect — el caller lo maneja. */
  throw new Error(`PERMISO_DENEGADO:${modulo}`)
}

/**
 * Versión simplificada de requirePermisoModulo: si el user no tiene
 * acceso al módulo, lo redirige a su landing (o /cockpit si es admin).
 *
 * Usar al inicio de cualquier page.tsx que sea de un módulo restringido:
 *
 *   import { ensureAccesoModulo } from '@/lib/team/permisos-helper'
 *   export default async function MiPage() {
 *     await ensureAccesoModulo('publicaciones')
 *     // ... resto de la page
 *   }
 *
 * Esto evita que Ailyn (sin permiso publicaciones) acceda escribiendo
 * /publicaciones en la URL directamente. El sidebar ya lo oculta, pero
 * sin guard la página es accesible.
 */
export async function ensureAccesoModulo(modulo: ModuloPermiso): Promise<void> {
  const { redirect } = await import('next/navigation')
  const p = await getCurrentMemberPermisos()
  if (!p) return  /* admin/owner: passthrough */
  if (tieneAcceso(p.permisos, modulo)) return
  /* Sin permiso: a su landing (probablemente /inicio para miembros) */
  redirect(await getLandingRoute())
}

/**
 * Determina la ruta de "landing" para el usuario actual.
 *
 * Pedro pidió que CADA miembro tenga su dashboard personalizado de
 * bienvenida. Decisión: TODOS los miembros van a /inicio (saludo + cards
 * de acceso rápido + hábitos + sus tareas pendientes). Solo Pedro como
 * admin/owner sigue yendo directo a /cockpit (que es el dashboard
 * ejecutivo con métricas globales).
 *
 * Si un miembro pierde todos sus permisos, /inicio igual lo recibe con
 * el saludo y mensaje de "todavía no tienes módulos asignados".
 */
export async function getLandingRoute(): Promise<string> {
  const p = await getCurrentMemberPermisos()
  if (!p) return '/cockpit'  /* admin/owner sin team_member */
  /* Cualquier miembro entra primero por su dashboard de bienvenida */
  return '/inicio'
}
