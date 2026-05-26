// app/app/api/cron/process-approvals/route.ts
//
// CRON cada 30 minutos — dispara la Routine externa SI hay comentarios
// aprobados pendientes de postearse a Metricool.
//
// Por qué es DISPARADOR y no procesador directo:
//  - La Routine tiene el cerebro IA y los tokens Metricool
//  - La app NO postea directamente a Metricool en este flow (separation
//    of concerns). Solo cambia status y dispara la Routine.
//  - Cada llamada al /fire de la Routine inicia UNA sesión Claude que
//    procesa TODOS los aprobados en batch (no uno por uno).
//
// Flow:
//  1. Cron 30min se dispara
//  2. SELECT comentarios_inbox WHERE status='approved' AND respuesta IS NOT NULL
//  3. Si count === 0: salta (no gasta sesión Claude)
//  4. Si count > 0: POST a Routine /fire con text="process approvals"
//  5. La Routine corre, llama GET /api/v1/comentarios/aprobados,
//     postea a Metricool, llama POST /marcar-enviado por cada uno
//
// Para que esto funcione, en Vercel env vars tiene que estar:
//   - CRON_SECRET (ya está)
//   - ROUTINE_FIRE_URL = el URL del /fire de la Routine (lo da Anthropic)
//   - ROUTINE_FIRE_TOKEN = el token Bearer del /fire (lo da Anthropic)
//
// Si esos no están, este cron solo loggea cuántos pending hay sin
// disparar nada. Permite probar la app sin la Routine creada todavía.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const ROUTINE_BETA_HEADER = 'experimental-cc-routine-2026-04-01'
const ANTHROPIC_VERSION = '2023-06-01'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const startTime = Date.now()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  /* 1. Contar aprobados pendientes de postear */
  const { count, error: countErr } = await service
    .from('comentarios_inbox')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')
    .not('respuesta_sugerida', 'is', null)

  if (countErr) {
    return NextResponse.json({ ok: false, error: countErr.message }, { status: 500 })
  }

  const pending = count ?? 0

  /* 2. Si no hay aprobados, salir SIN gastar Routine */
  if (pending === 0) {
    return NextResponse.json({
      ok: true,
      pending: 0,
      action: 'skip-no-pending',
      duration_ms: Date.now() - startTime,
    })
  }

  /* 3. Verificar config Routine — si faltan vars, log only mode */
  const fireUrl = process.env.ROUTINE_FIRE_URL
  const fireToken = process.env.ROUTINE_FIRE_TOKEN
  if (!fireUrl || !fireToken) {
    return NextResponse.json({
      ok: true,
      pending,
      action: 'log-only',
      reason: 'ROUTINE_FIRE_URL o ROUTINE_FIRE_TOKEN no configurados — la Routine no se dispara pero los comentarios siguen aprobados',
      duration_ms: Date.now() - startTime,
    })
  }

  /* 4. Disparar la Routine via API. El body.text es freeform — le
     pasamos un marker que el prompt usa para detectar modo POSTEO
     (vs modo GENERACIÓN cuando trigger es Schedule). */
  const fireBody = {
    text: `process_approvals:${pending}`,
  }

  try {
    const res = await fetch(fireUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fireToken}`,
        'anthropic-beta': ROUTINE_BETA_HEADER,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fireBody),
    })
    const text = await res.text()
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        pending,
        action: 'fire-failed',
        http_status: res.status,
        body_excerpt: text.slice(0, 300),
        duration_ms: Date.now() - startTime,
      }, { status: 502 })
    }
    let session: { claude_code_session_id?: string; claude_code_session_url?: string } = {}
    try { session = JSON.parse(text) } catch {}
    return NextResponse.json({
      ok: true,
      pending,
      action: 'fired',
      session_id: session.claude_code_session_id ?? null,
      session_url: session.claude_code_session_url ?? null,
      duration_ms: Date.now() - startTime,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      pending,
      action: 'fire-network-error',
      error: err instanceof Error ? err.message : 'unknown',
      duration_ms: Date.now() - startTime,
    }, { status: 502 })
  }
}
