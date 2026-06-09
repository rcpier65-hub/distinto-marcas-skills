// app/app/api/v1/marcas/route.ts
//
// GET /api/v1/marcas — lista todas las marcas activas.
// Usado por el MCP de Distinto para que Claude descubra qué marcas
// existen antes de filtrar otras consultas.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkApiBearer } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  const auth = checkApiBearer(request)
  if ('response' in auth) return auth.response

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data, error } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex, grabaciones_objetivo_mensual, cadencia_cantidad, cadencia, grabaciones_confirmadas_mes')
    .eq('activa', true)
    .order('nombre')

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = ((data ?? []) as any[]).map((m) => ({
    slug: m.slug,
    nombre: m.nombre,
    emoji: m.emoji_marca,
    color: m.color_primario_hex,
    objetivo_grabaciones_mensual: m.grabaciones_objetivo_mensual,
    cadencia: m.cadencia,
    cadencia_cantidad: m.cadencia_cantidad,
    grabaciones_confirmadas_mes: Boolean(m.grabaciones_confirmadas_mes),
  }))

  return NextResponse.json({ ok: true, total: marcas.length, marcas })
}
