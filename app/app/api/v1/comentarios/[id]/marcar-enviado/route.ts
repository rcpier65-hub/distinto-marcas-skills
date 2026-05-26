// app/app/api/v1/comentarios/[id]/marcar-enviado/route.ts
//
// POST /api/v1/comentarios/:id/marcar-enviado
//
// La Routine llama este endpoint DESPUÉS de postear con éxito la
// respuesta a Metricool. Cambia el status del comentario a 'sent' y
// guarda el metricool_reply_id (para tracking + posibilidad de borrar
// la respuesta más tarde si hace falta).
//
// Body (JSON):
//   {
//     "metricool_reply_id": "msg_abc123",  // ID del reply en Metricool
//     "sent_at": "2026-05-26T15:30:00Z"    // opcional, default now()
//   }
//
// Si el POST a Metricool falla, la Routine usa /marcar-error en lugar
// de este endpoint para registrar el error sin cambiar status (para
// que se reintente la próxima corrida).
//
// Auth: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  const { id } = await params
  if (!id) return badRequest('id requerido')

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    /* Body opcional: si no manda nada igual marcamos como sent con now() */
  }
  const b = (body ?? {}) as Record<string, unknown>
  const metricoolReplyId = typeof b.metricool_reply_id === 'string' ? b.metricool_reply_id : null
  const sentAt = typeof b.sent_at === 'string' ? b.sent_at : new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* Solo actualiza si está en status='approved' — evita race conditions
     donde el comentario pudo haber sido rechazado entre la ventana del
     SELECT inicial y este UPDATE. */
  const { data, error } = await service
    .from('comentarios_inbox')
    .update({
      status: 'sent',
      sent_at: sentAt,
      metricool_reply_id: metricoolReplyId,
    })
    .eq('id', id)
    .eq('status', 'approved')
    .select('id, status, sent_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  if (!data) {
    /* Caso típico: el comentario fue rechazado o ya estaba en otro
       status. No es un error fatal — la Routine puede saltearse. */
    return NextResponse.json({
      ok: false,
      error: 'comentario no estaba en status=approved (ya fue rechazado, sent, o no existe)',
      idempotent: true,
    }, { status: 409 })
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    status: data.status,
    sent_at: data.sent_at,
    metricool_reply_id: metricoolReplyId,
  })
}
