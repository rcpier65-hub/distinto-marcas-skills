// Identidad del JWT de Supabase, o de una clave dst_live_ con alcance owner,
// para los GET nativos de macOS. No usa la cookie de la web ni
// getCurrentMemberPermisos (eso leería la sesión del browser, no el Bearer).
// Misma regla que permisos-helper: sin fila en team_members = admin/owner
// (Pedro) y ve todo. La clave actúa como ese usuario.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { DEVICE_KEY_NEEDS_OWNER, resolveApiCaller } from '@/lib/api/auth'
import { OWNER_SCOPE, scopeSatisfies } from '@/lib/api/device-keys'
import { mergePermisos, tieneAcceso, type Permisos } from '@/lib/team/types'

export type SessionMember = {
  userId: string
  email: string | null
  nombre: string | null
  cargo: string | null
  rol: string | null
  rolBase: string | null
  esEquipo: boolean
  esDirector: boolean
  /** Igual que /soporte: sin team_member, o rol_base director. */
  veTodoSoporte: boolean
  teamMemberId: string | null
  /** null = todas las marcas. */
  marcasAcceso: string[] | null
  puedePublicaciones: boolean
  /** Mismo módulo, flag puede_editar. Sin fila de rol, puede editar. */
  puedeEditarPublicaciones: boolean
  /** Módulo settings. El rol director del seed no lo tiene; el owner sin fila sí. */
  puedeSettings: boolean
  /** Módulo Reportes (`metricas`). Sin fila de rol, ve todo. */
  puedeMetricas: boolean
}

export function apiJsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

function asMarcaIds(value: unknown): string[] | null {
  if (value == null) return null
  if (!Array.isArray(value)) return null
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function asPermisos(value: unknown): Permisos {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Permisos
}

/**
 * Bearer de sesión (access token de Supabase) o clave `dst_live_…` con
 * alcance `owner`. En ambos casos la identidad es el dueño: mismas
 * marcas_acceso y permisos de módulo. Una clave solo `tareas:read` recibe 403.
 * El secreto de cron no abre estas listas.
 */
export async function requireSessionMember(
  request: Request,
): Promise<{ ok: true; member: SessionMember } | { response: NextResponse }> {
  const auth = await resolveApiCaller(request)
  if ('response' in auth) return auth
  const caller = auth.caller

  let userId: string
  switch (caller.kind) {
    case 'user':
      userId = caller.userId
      break
    case 'device':
      if (!scopeSatisfies(caller.scopes, OWNER_SCOPE)) {
        return { response: apiJsonError(DEVICE_KEY_NEEDS_OWNER, 403) }
      }
      userId = caller.userId
      break
    case 'cron':
      return { response: apiJsonError('Unauthorized: necesitás la sesión de Distinto', 401) }
    default: {
      const _never: never = caller
      return _never
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any
  try {
    service = createServiceClient()
  } catch {
    return { response: apiJsonError('Falta la configuración de Supabase en el servidor', 500) }
  }

  const { data: row, error } = await service
    .from('team_members')
    .select('id, nombre, email, cargo_personalizado, rol_base, activo, marcas_acceso, permisos_override')
    .eq('auth_user_id', userId)
    .maybeSingle()
  if (error) return { response: apiJsonError(error.message, 500) }

  let authEmail: string | null = null
  try {
    const looked = await service.auth.admin.getUserById(userId)
    const email = looked.data?.user?.email
    authEmail = typeof email === 'string' && email.length > 0 ? email : null
  } catch {
    authEmail = null
  }

  if (!row) {
    return {
      ok: true,
      member: {
        userId,
        email: authEmail,
        nombre: null,
        cargo: null,
        rol: null,
        rolBase: null,
        esEquipo: false,
        esDirector: true,
        veTodoSoporte: true,
        teamMemberId: null,
        marcasAcceso: null,
        puedePublicaciones: true,
        puedeEditarPublicaciones: true,
        puedeSettings: true,
        puedeMetricas: true,
      },
    }
  }

  if (row.activo === false) {
    return { response: apiJsonError('Tu usuario está desactivado', 403) }
  }

  const rolBase = typeof row.rol_base === 'string' ? row.rol_base : null
  let rolNombre: string | null = rolBase
  // Sin fila de rol, permisos-helper devuelve null (= ve todo). Con rol, manda el merge.
  let puedePublicaciones = true
  let puedeEditarPublicaciones = true
  let puedeSettings = true
  let puedeMetricas = true

  if (rolBase) {
    const { data: rol, error: rolError } = await service
      .from('roles_predefinidos')
      .select('nombre, permisos_default')
      .eq('id', rolBase)
      .maybeSingle()
    if (rolError) return { response: apiJsonError(rolError.message, 500) }
    if (rol) {
      rolNombre = typeof rol.nombre === 'string' && rol.nombre.trim() ? rol.nombre.trim() : rolBase
      const permisos = mergePermisos(asPermisos(rol.permisos_default), asPermisos(row.permisos_override))
      puedePublicaciones = tieneAcceso(permisos, 'publicaciones')
      puedeEditarPublicaciones = puedePublicaciones && permisos.publicaciones?.puede_editar === true
      puedeSettings = tieneAcceso(permisos, 'settings')
      puedeMetricas = tieneAcceso(permisos, 'metricas')
    }
  }

  const emailMiembro = typeof row.email === 'string' && row.email.trim() ? row.email.trim() : null
  const nombre = typeof row.nombre === 'string' && row.nombre.trim() ? row.nombre.trim() : null
  const cargo =
    typeof row.cargo_personalizado === 'string' && row.cargo_personalizado.trim()
      ? row.cargo_personalizado.trim()
      : null

  return {
    ok: true,
    member: {
      userId,
      email: authEmail ?? emailMiembro,
      nombre,
      cargo,
      rol: rolNombre,
      rolBase,
      esEquipo: true,
      esDirector: rolBase === 'director',
      veTodoSoporte: rolBase === 'director',
      teamMemberId: typeof row.id === 'string' ? row.id : null,
      marcasAcceso: asMarcaIds(row.marcas_acceso),
      puedePublicaciones,
      puedeEditarPublicaciones,
      puedeSettings,
      puedeMetricas,
    },
  }
}

/** 403 si la marca no está en marcas_acceso. null = todas. */
export function denyMarcaAcceso(member: SessionMember, marcaId: string): NextResponse | null {
  if (member.marcasAcceso == null) return null
  if (member.marcasAcceso.includes(marcaId)) return null
  return apiJsonError('No tienes acceso a esa marca', 403)
}

/**
 * Datos canon (marca_facts): owner sin team_member, rol director/admin,
 * o quien tenga el módulo settings. Igual que /settings para el owner,
 * y abierto al director aunque el seed de ese rol no traiga settings.
 */
export function puedeEscribirMarcaFacts(member: SessionMember): boolean {
  if (!member.esEquipo) return true
  if (member.esDirector || member.rolBase === 'admin') return true
  return member.puedeSettings
}
