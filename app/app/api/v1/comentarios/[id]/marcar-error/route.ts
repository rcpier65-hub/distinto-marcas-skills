// app/app/api/v1/comentarios/[id]/marcar-error/route.ts
//
// POST /api/v1/comentarios/:id/marcar-error
//
// Cuando la Routine intenta postear a Metricool y falla (401, 429,
// network, etc), llama este endpoint para registrar el error EN
// el row del comentario, sin cambiar status. El comentario queda
// en 'approved' para que se reintente en la próxima corrida.
//
// Si después de N reintentos sigue fallando, la próxima corrida
// debería skippearlo y notificar a Pedro para revisión manual.
//
// Body (JSON):
//   { "error": "Metricool 429 rate limit" }
//
// Auth: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  const { id } = await params
  let body: unknown = {}
  try { body = await request.json() } catch {}
  const errorMsg = typeof (body as Record<string, unknown>).error === 'string'
    ? (body as Record<string, unknown>).error as string
    : 'error desconocido al postear a Metricool'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Increment retry_count atomicamente. No cambia status — el comentario
     sigue 'approved' y se reintenta en la próxima corrida. */
  const { data: current } = await service
    .from('comentarios_inbox')
    .select('retry_count')
    .eq('id', id)
    .maybeSingle()
  const newCount = (current?.retry_count ?? 0) + 1

  const { error } = await service
    .from('comentarios_inbox')
    .update({
      last_error: errorMsg.slice(0, 500),
      last_error_at: new Date().toISOString(),
      retry_count: newCount,
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    id,
    retry_count: newCount,
    last_error: errorMsg.slice(0, 200),
  })
}
