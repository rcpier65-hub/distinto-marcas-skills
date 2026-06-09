// app/app/api/v1/pendientes-rapidos/route.ts
//
// GET  /api/v1/pendientes-rapidos
//   ?completados=1   (incluir completados, default false)
//
// POST /api/v1/pendientes-rapidos
//   body: { texto: string }
//
// Pendientes del admin/owner (team_member_id IS NULL).

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkApiBearer } from '@/lib/api/auth'
import { parsePendiente } from '@/lib/pendientes/parse-pendiente'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const auth = checkApiBearer(request)
  if ('response' in auth) return auth.response

  const url = new URL(request.url)
  const includeCompletados = url.searchParams.get('completados') === '1'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  let q = service
    .from('pendientes_rapidos')
    .select('id, titulo, descripcion, categoria, prioridad, completado, created_at, completado_at')
    .is('team_member_id', null)
    .order('prioridad', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(100)

  if (!includeCompletados) q = q.eq('completado', false)

  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, total: data?.length ?? 0, pendientes: data ?? [] })
}

export async function POST(request: Request) {
  const auth = checkApiBearer(request)
  if ('response' in auth) return auth.response

  const body = await request.json().catch(() => ({}))
  const texto = String(body.texto ?? '').trim()
  if (!texto) {
    return NextResponse.json({ ok: false, error: 'Falta campo "texto"' }, { status: 400 })
  }
  if (texto.length > 1000) {
    return NextResponse.json({ ok: false, error: 'Texto demasiado largo (max 1000)' }, { status: 400 })
  }

  /* Parsea con IA o fallback heurístico (mismo que el chat de /inicio) */
  const parsed = await parsePendiente(texto, 'admin')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data, error } = await service
    .from('pendientes_rapidos')
    .insert({
      team_member_id: null,
      texto_original: texto,
      titulo: parsed.titulo,
      descripcion: parsed.descripcion,
      categoria: parsed.categoria,
      prioridad: parsed.prioridad,
      completado: false,
    })
    .select('id, titulo, descripcion, categoria, prioridad, completado, created_at')
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, pendiente: data })
}
