// GET /api/v1/creacion-de-ideas
//   ?nicho=marketing   (opcional; si no, el banco completo)
//
// Banco compartido de Creación de Ideas. Las ideas guardadas por cada
// persona viven en el navegador y no salen en este GET.
// Crear un guion sigue en la web.
// Auth: Bearer JWT o dst_live_ con alcance owner.

import { NextResponse } from 'next/server'
import { appBase } from '@/lib/api/lima'
import { apiJsonError, requireSessionMember } from '@/lib/api/session-member'
import { BANCO_IDEAS, NICHOS_IDEAS, esNichoIdea } from '@/lib/creacion-ideas/banco'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = await requireSessionMember(request)
  if ('response' in auth) return auth.response

  const nicho = new URL(request.url).searchParams.get('nicho')
  if (nicho && !esNichoIdea(nicho)) {
    return apiJsonError('Ese nicho no está en el banco', 400)
  }

  const base = appBase()
  const ideas = BANCO_IDEAS
    .filter((idea) => !nicho || idea.nicho === nicho)
    .map((idea) => ({
      id: idea.id,
      nicho: idea.nicho,
      idea: idea.idea,
      gancho: idea.gancho,
      link: `${base}/creacion-de-ideas`,
    }))

  return NextResponse.json({
    ok: true,
    total: ideas.length,
    nichos: [...NICHOS_IDEAS],
    ideas,
  })
}
