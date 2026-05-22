// app/app/api/debug/render-png/route.ts
// DEBUG ONLY — proxy a /api/render-grilla con auth interna.
// Acepta ?debug_key= simple para que Claude pueda probar el render end-to-end
// sin sesión Vercel/Supabase. Borrar este endpoint después de cerrar P15.
//
// Seguridad: el debug_key es shared secret hardcoded; rota cuando se cierre el
// debug. Si filtra, expone el render pero no permite envío WhatsApp ni
// modificación de datos — solo retorna el PNG de la grilla con los params.
//
// Uso:
//   GET /api/debug/render-png?slug=little-joe&inicio=2026-05-18&fin=2026-05-24&pubs=[...]&debug_key=<KEY>

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEBUG_KEY = 'tp-debug-2026-05-22-grilla-fix'

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('debug_key') !== DEBUG_KEY) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  // Reconstruir params sin debug_key para pasarlos al endpoint real.
  const passthrough = new URLSearchParams(url.searchParams)
  passthrough.delete('debug_key')

  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET missing in env' }, { status: 500 })
  }

  const targetUrl = `${baseUrl}/api/render-grilla?${passthrough.toString()}`
  const upstream = await fetch(targetUrl, {
    headers: { authorization: `Bearer ${secret}` },
    cache: 'no-store',
  })

  if (!upstream.ok) {
    const text = await upstream.text()
    return NextResponse.json(
      { ok: false, upstream_status: upstream.status, body: text.slice(0, 800) },
      { status: 502 },
    )
  }

  const buffer = await upstream.arrayBuffer()
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, max-age=0',
      'X-Upstream-Status': String(upstream.status),
      'X-Upstream-Poster-Bbox': upstream.headers.get('x-poster-bbox') ?? 'unknown',
    },
  })
}
