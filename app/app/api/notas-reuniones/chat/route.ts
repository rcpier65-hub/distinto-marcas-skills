// POST /api/notas-reuniones/chat — chat grounded en transcript+cuerpo de una nota.
// Usa el mismo wiring que Settings: getOpenAIApiKey / getAnthropicApiKey.

import { NextResponse } from 'next/server'
import { chatearConNota } from '@/app/notas-reuniones/_actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const notaId = typeof body?.notaId === 'string' ? body.notaId : ''
    const pregunta = typeof body?.pregunta === 'string' ? body.pregunta : ''
    if (!notaId) {
      return NextResponse.json({ ok: false, error: 'notaId requerido' }, { status: 400 })
    }
    const res = await chatearConNota(notaId, pregunta)
    if (!res.ok) {
      const status = /API key|Falta API/i.test(res.error) ? 503 : 400
      return NextResponse.json(res, { status })
    }
    return NextResponse.json(res)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    const status = /No authenticated/i.test(msg) ? 401 : 500
    return NextResponse.json({ ok: false, error: msg }, { status })
  }
}
