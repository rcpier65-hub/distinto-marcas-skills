// Fuentes para «Próximas»: marca_reuniones + Google Calendar (best-effort).
// Fallback: notas en_curso / con started_at futuro.

import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { listCalendarEvents } from '@/lib/integrations/google-calendar'
import type { ProximaItem } from './types'

function limaYmd(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

function endIsoFromStart(startIso: string, durationMin: number | null): string | null {
  if (!durationMin || durationMin <= 0) return null
  const t = new Date(startIso).getTime() + durationMin * 60_000
  return new Date(t).toISOString()
}

/** Agenda de la próxima semana (Lima) para el home de Notas y reuniones. */
export async function getProximasSemana(): Promise<ProximaItem[]> {
  const hoy = limaYmd()
  const hasta = addDaysYmd(hoy, 7)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const items: ProximaItem[] = []
  const seen = new Set<string>()

  try {
    const { data } = await service
      .from('marca_reuniones')
      .select('id, titulo, fecha_hora, lugar_enlace, estado')
      .gte('fecha_hora', `${hoy}T00:00:00-05:00`)
      .lte('fecha_hora', `${hasta}T23:59:59-05:00`)
      .order('fecha_hora', { ascending: true })
      .limit(40)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (data ?? []) as any[]) {
      const key = `mr:${r.id}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push({
        id: String(r.id),
        titulo: String(r.titulo ?? 'Reunión'),
        startsAt: String(r.fecha_hora),
        endsAt: null,
        fuente: 'marca_reuniones',
        meetLink: r.lugar_enlace ?? null,
      })
    }
  } catch { /* tabla puede faltar en algún entorno */ }

  try {
    const gcal = await listCalendarEvents(hoy, hasta)
    for (const ev of gcal) {
      if (ev.allDay || !ev.hora) continue
      const startsAt = `${ev.fecha}T${ev.hora}:00-05:00`
      const key = `gc:${ev.id}`
      if (seen.has(key)) continue
      /* Dedup blando por título+fecha contra marca_reuniones */
      const dup = items.some((i) => {
        const di = limaYmd(new Date(i.startsAt))
        return di === ev.fecha && i.titulo.trim().toLowerCase() === ev.summary.trim().toLowerCase()
      })
      if (dup) continue
      seen.add(key)
      items.push({
        id: ev.id,
        titulo: ev.summary,
        startsAt,
        endsAt: endIsoFromStart(startsAt, ev.durationMin),
        fuente: 'google_calendar',
        meetLink: ev.meetLink,
      })
    }
  } catch { /* GCal opcional */ }

  if (items.length === 0) {
    try {
      const { data } = await service
        .from('notas_reuniones')
        .select('id, titulo, started_at, created_at, estado')
        .in('estado', ['en_curso', 'borrador'])
        .order('updated_at', { ascending: false })
        .limit(8)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const n of (data ?? []) as any[]) {
        const startsAt = (n.started_at ?? n.created_at) as string
        items.push({
          id: String(n.id),
          titulo: String(n.titulo ?? 'Nota'),
          startsAt,
          endsAt: null,
          fuente: 'nota',
        })
      }
    } catch { /* tabla nueva */ }
  }

  items.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  return items.slice(0, 20)
}
