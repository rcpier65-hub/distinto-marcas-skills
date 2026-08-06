// app/app/api/cron/recordatorio-fechas/route.ts
//
// Recordatorio de FECHAS IMPORTANTES: cada mañana revisa si MAÑANA (zona Lima)
// hay alguna fecha importante registrada y, si la hay, manda un push a TODO el
// equipo. Idea de Lorena 23-jul-2026.
// Auth: Vercel cron manda Authorization: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarPushAMiembros } from '@/lib/push/send'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // MAÑANA en zona Lima (UTC-5). Construimos con los componentes de la fecha
  // Lima de hoy + 1 día para evitar el corrimiento por UTC.
  const hoyLima = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const [y, m, d] = hoyLima.split('-').map(Number)
  const mananaISO = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)

  const { data: fechas } = await service
    .from('fechas_importantes')
    .select('titulo, marca:marcas(nombre)')
    .eq('fecha', mananaISO)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas = (fechas ?? []) as any[]
  if (filas.length === 0) return NextResponse.json({ ok: true, manana: mananaISO, enviados: 0 })

  const marcas = new Set<string>()
  for (const f of filas) { const mm = Array.isArray(f.marca) ? f.marca[0] : f.marca; if (mm?.nombre) marcas.add(mm.nombre as string) }
  const lista = [...marcas]
  const body = filas.length === 1
    ? `Mañana: ${filas[0].titulo}${lista[0] ? ` (${lista[0]})` : ''}. Revisa el calendario.`
    : `Mañana hay ${filas.length} fechas importantes${lista.length ? ` — ${lista.slice(0, 3).join(', ')}${lista.length > 3 ? '…' : ''}` : ''}. Revisa el calendario.`

  // A TODO el equipo activo.
  const { data: team } = await service.from('team_members').select('nombre').eq('activo', true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nombres = ((team ?? []) as any[]).map((t) => t.nombre as string).filter(Boolean)

  const push = await enviarPushAMiembros(nombres, {
    title: '📅 Fecha importante mañana',
    body,
    url: '/publicaciones/calendario',
    tag: 'fecha-importante',
  })
  return NextResponse.json({ ok: true, manana: mananaISO, fechas: filas.length, push })
}
