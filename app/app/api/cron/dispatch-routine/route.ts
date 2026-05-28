// app/app/api/cron/dispatch-routine/route.ts
//
// Vercel cron daily a 13:30 UTC (8:30 AM Lima) — 30 min después del
// morning-fetch para asegurar que la inbox esté poblada.
//
// Lo que hace: dispara la Routine de Claude Desktop UNA VEZ POR MARCA
// (no una sola para todas). Cada dispatch tiene `text: "generar:<slug>"`
// para que la Routine procese SOLO esa marca.
//
// Por qué dispatch por marca:
//   - 1 Routine procesando 200 comentarios tarda demasiado, se corta
//   - 8 Routines procesando 25 cada una corren en paralelo
//   - Resultado: todos los borradores listos en <5 min vs >1 hora
//
// Auth: Bearer CRON_SECRET para POST manual desde Pedro/Routine.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  // Auth via Bearer (también acepta el header de Vercel Cron secret)
  const auth = request.headers.get('authorization')
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && !isVercelCron) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.ANTHROPIC_ROUTINE_URL
  const bearer = process.env.ANTHROPIC_ROUTINE_BEARER
  if (!url || !bearer) {
    return NextResponse.json(
      { ok: false, error: 'ANTHROPIC_ROUTINE_URL/BEARER no configurados' },
      { status: 500 },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: marcas, error } = await service
    .from('marcas')
    .select('slug, nombre')
    .eq('activa', true)
    .order('slug')
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  // Disparar 1 Routine por marca, secuencial (cada fire toma <1s, las
  // sesiones corren en paralelo del lado de Claude Desktop).
  const dispatches: Array<{ marca: string; ok: boolean; session_id?: string; error?: string }> = []
  for (const m of marcas ?? []) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ text: `generar:${m.slug}` }),
        signal: AbortSignal.timeout(10000),
      })
      const text = await res.text()
      if (!res.ok) {
        dispatches.push({ marca: m.slug, ok: false, error: `HTTP ${res.status}: ${text.slice(0, 100)}` })
        continue
      }
      const json = JSON.parse(text) as { claude_code_session_id?: string }
      dispatches.push({
        marca: m.slug,
        ok: true,
        session_id: json.claude_code_session_id,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      dispatches.push({ marca: m.slug, ok: false, error: msg })
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    marcas_total: marcas?.length ?? 0,
    dispatches_exitosos: dispatches.filter(d => d.ok).length,
    dispatches_fallidos: dispatches.filter(d => !d.ok).length,
    dispatches,
  })
}
