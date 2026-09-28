// Identidad para los GET/POST nativos de macOS.
// Misma puerta que PR #25: resolveV1Actor (cookie, JWT o dst_live_).
// Una clave solo tareas:read recibe 403. CRON_SECRET no abre estas listas.
// Sin fila en team_members = admin/owner y ve todo, igual que permisos-helper.

import 'server-only'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { deviceScopeAllows, jsonApiError, resolveV1Actor } from '@/lib/api/auth'
import { OWNER_SCOPE } from '@/lib/api/device-key-scopes'
import { esPedroEmail } from '@/lib/planes/catalogo'
import { mergePermisos, tieneAcceso, type Permisos } from '@/lib/team/types'

const OWNER_MSG =
  'La clave de dispositivo no tiene alcance owner. Ampliá el alcance a owner (el token dst_live_ no cambia) o creá una clave nueva.'

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
  puedeEditarPublicaciones: boolean
  puedeSettings: boolean
  puedeMetricas: boolean
  puedeEditor: boolean
  puedeDiseno: boolean
  puedeGrilla: boolean
  puedeMarcas: boolean
  puedeEquipo: boolean
  /** Diseño, publicaciones, director, admin, o sin fila de equipo. */
  puedeHistorias: boolean
  /** Sidebar «Ver todas» / «Agregar marca»: director, admin, o sin fila. */
  puedeGestionarMarcas: boolean
  /** Sidebar Historial y reporte de todo el equipo: director o sin fila. */
  esCeo: boolean
  esPedro: boolean
}

export function apiJsonError(error: string, status: number): NextResponse {
  return jsonApiError(error, status)
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

export async function requireSessionMember(
  request: Request,
): Promise<{ ok: true; member: SessionMember } | { response: NextResponse }> {
  const auth = await resolveV1Actor(request)
  if ('response' in auth) return auth
  if (!deviceScopeAllows(auth.actor, OWNER_SCOPE)) {
    return { response: apiJsonError(OWNER_MSG, 403) }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any
  try {
    service = createServiceClient()
  } catch {
    return { response: apiJsonError('Falta la configuración de Supabase en el servidor', 500) }
  }

  const userId = auth.actor.userId
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
      member: memberPayload({
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
        puedeEditor: true,
        puedeDiseno: true,
        puedeGrilla: true,
        puedeMarcas: true,
        puedeEquipo: true,
      }),
    }
  }

  if (row.activo === false) {
    return { response: apiJsonError('Tu usuario está desactivado', 403) }
  }

  const rolBase = typeof row.rol_base === 'string' ? row.rol_base : null
  let rolNombre: string | null = rolBase
  let puedePublicaciones = true
  let puedeEditarPublicaciones = true
  let puedeSettings = true
  let puedeMetricas = true
  let puedeEditor = true
  let puedeDiseno = true
  let puedeGrilla = true
  let puedeMarcas = true
  let puedeEquipo = true

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
      puedeEditor = tieneAcceso(permisos, 'editor')
      puedeDiseno = tieneAcceso(permisos, 'diseno')
      puedeGrilla = tieneAcceso(permisos, 'grilla')
      puedeMarcas = tieneAcceso(permisos, 'marcas')
      puedeEquipo = tieneAcceso(permisos, 'equipo')
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
    member: memberPayload({
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
      puedeEditor,
      puedeDiseno,
      puedeGrilla,
      puedeMarcas,
      puedeEquipo,
    }),
  }
}

type MemberCore = Omit<SessionMember, 'puedeHistorias' | 'puedeGestionarMarcas' | 'esCeo' | 'esPedro'>

function memberPayload(core: MemberCore): SessionMember {
  const owner = !core.esEquipo
  const director = core.rolBase === 'director'
  const admin = core.rolBase === 'admin'
  return {
    ...core,
    puedeHistorias: owner || director || admin || core.puedeDiseno || core.puedePublicaciones,
    puedeGestionarMarcas: owner || director || admin,
    esCeo: owner || director,
    esPedro: esPedroEmail(core.email),
  }
}

/** 403 si la marca no está en marcas_acceso. null = todas. */
export function denyMarcaAcceso(member: SessionMember, marcaId: string): NextResponse | null {
  if (member.marcasAcceso == null) return null
  if (member.marcasAcceso.includes(marcaId)) return null
  return apiJsonError('No tienes acceso a esa marca', 403)
}
