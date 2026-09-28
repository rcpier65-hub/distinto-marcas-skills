// Identidad de team_members para /api/v1, a partir del user id ya autenticado.
// No usa la cookie: el Bearer de Nay no tiene sesión de browser.
// Un miembro con activo = false queda en 403 (en la web, permisos-helper
// devuelve null y algunas pantallas lo tratan como admin).

import 'server-only'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { mergePermisos, tieneAcceso, type Permisos } from '@/lib/team/types'
import { jsonApiError, type V1Actor } from '@/lib/api/auth'
import { esDirectorDeAgenda, esDuenoDelTablero } from '@/lib/tareas/dueno'

export type MiembroV1 = {
  userId: string
  teamMemberId: string | null
  nombre: string | null
  rolBase: string | null
  esDueno: boolean
  esDirector: boolean
  marcasAcceso: string[] | null
  permisos: Permisos | null
  puedePublicaciones: boolean
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

export async function cargarMiembroV1(
  actor: V1Actor,
): Promise<{ ok: true; miembro: MiembroV1 } | { response: NextResponse }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any
  try {
    service = createServiceClient()
  } catch {
    return { response: jsonApiError('Falta SUPABASE_SERVICE_ROLE_KEY', 500) }
  }

  const { data: row, error } = await service
    .from('team_members')
    .select('id, nombre, rol_base, activo, marcas_acceso, permisos_override')
    .eq('auth_user_id', actor.userId)
    .maybeSingle()
  if (error) return { response: jsonApiError(error.message, 500) }
  if (row && row.activo === false) {
    return { response: jsonApiError('Miembro desactivado', 403) }
  }

  if (!row) {
    return {
      ok: true,
      miembro: {
        userId: actor.userId,
        teamMemberId: null,
        nombre: null,
        rolBase: null,
        esDueno: esDuenoDelTablero(true, null),
        esDirector: esDirectorDeAgenda(true, null),
        marcasAcceso: null,
        permisos: null,
        puedePublicaciones: true,
      },
    }
  }

  const { data: rol, error: rolError } = await service
    .from('roles_predefinidos')
    .select('permisos_default')
    .eq('id', row.rol_base)
    .maybeSingle()
  if (rolError) return { response: jsonApiError(rolError.message, 500) }

  const permisos = rol
    ? mergePermisos(asPermisos(rol.permisos_default), asPermisos(row.permisos_override))
    : null
  const nombre = typeof row.nombre === 'string' ? row.nombre : null
  const rolBase = typeof row.rol_base === 'string' ? row.rol_base : null

  return {
    ok: true,
    miembro: {
      userId: actor.userId,
      teamMemberId: row.id as string,
      nombre,
      rolBase,
      esDueno: esDuenoDelTablero(false, nombre),
      esDirector: esDirectorDeAgenda(false, rolBase),
      marcasAcceso: asMarcaIds(row.marcas_acceso),
      permisos,
      puedePublicaciones: permisos ? tieneAcceso(permisos, 'publicaciones') : true,
    },
  }
}
