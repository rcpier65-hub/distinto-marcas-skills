// GET /api/v1/perfil
//
// Sesión del Mac: nombre, email y rol. No edita el perfil.
// Auth: Bearer JWT o dst_live_ con alcance owner (actúa como esa sesión).

import { NextResponse } from 'next/server'
import { requireSessionMember } from '@/lib/api/session-member'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  const member = auth.member

  return NextResponse.json({
    ok: true,
    perfil: {
      user_id: member.userId,
      email: member.email,
      nombre: member.nombre,
      rol: member.rol,
      rol_base: member.rolBase,
      cargo: member.cargo,
      es_equipo: member.esEquipo,
      activo: true,
      es_director: member.esDirector,
    },
  })
}
