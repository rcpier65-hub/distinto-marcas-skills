// app/app/api/debug/sync-pubs/route.ts
//
// Disparo manual de la sincronización de publicaciones → Google Calendar
// para una marca. Protegido con CRON_SECRET (mismo patrón que los debug
// endpoints existentes). Uso:
//   GET /api/debug/sync-pubs?marca=little-joe&debug_key=$CRON_SECRET

import { sincronizarPubsMarca } from '@/lib/publicaciones/gcal-sync'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  /* Autorización: ?debug_key=CRON_SECRET o header x-debug-key con el
     CRON_SECRET o la service role key (solo la tiene el equipo). */
  const key = url.searchParams.get('debug_key') ?? request.headers.get('x-debug-key')
  const validos = [process.env.CRON_SECRET, process.env.SUPABASE_SERVICE_ROLE_KEY].filter(Boolean)
  if (!key || !validos.includes(key)) {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }
  const marca = (url.searchParams.get('marca') ?? '').trim()
  if (!marca) return Response.json({ ok: false, error: 'Falta ?marca=slug' }, { status: 400 })

  const r = await sincronizarPubsMarca(marca)
  return Response.json(r, { status: r.ok ? 200 : 500 })
}
