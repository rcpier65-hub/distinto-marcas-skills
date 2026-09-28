// app/app/api/cron/sync-calendario/route.ts
//
// Red de seguridad diaria de la sincronización Calendario → Google Calendar
// (lib/calendario/gcal-sync.ts). Normalmente la sync corre sola mientras el
// equipo usa la app; esto cubre días sin actividad y reintenta fallos.
// Auth: Vercel cron manda Authorization: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { sincronizarCalendario } from '@/lib/calendario/gcal-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const resultado = await sincronizarCalendario({ forzar: true })
  return NextResponse.json(resultado)
}
