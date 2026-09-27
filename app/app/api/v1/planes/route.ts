// GET /api/v1/planes
// Catálogo comercial. Misma puerta que /planes: solo pedro@agenciadistinto.com.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { PLANES, REGLAS_COMERCIALES } from '@/lib/planes/catalogo'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response
  if (!auth.member.esPedro) return apiJsonError('Planes es solo para Pedro', 403)
  const link = `${appBase()}/planes`

  return NextResponse.json({
    ok: true,
    total: PLANES.length,
    reglas: REGLAS_COMERCIALES,
    planes: PLANES.map((plan) => ({
      id: plan.id,
      categoria: plan.categoria,
      nombre: plan.nombre,
      precio_label: plan.precioLabel,
      periodo: plan.periodo,
      minimo: plan.minimo ?? null,
      aplica: plan.aplica ?? null,
      incluye: plan.incluye,
      no_incluye: plan.noIncluye,
      destacado: plan.destacado === true,
      link,
    })),
  })
}
