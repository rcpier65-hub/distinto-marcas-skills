import type { Activity } from './model'
import type { AgendaEvento } from '@/app/grabaciones/calendario/_components/agenda-calendar'

export function calendarMonthRange(month: string) {
  if (!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mes inválido')
  const [year, mon] = month.split('-').map(Number)
  // Include the adjacent days visible in the monthly grid.
  const first = new Date(Date.UTC(year, mon - 1, 1, 12))
  first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7))
  const last = new Date(Date.UTC(year, mon, 0, 12))
  last.setUTCDate(last.getUTCDate() + (6 - (last.getUTCDay() + 6) % 7))
  return { desde: first.toISOString().slice(0, 10), hasta: last.toISOString().slice(0, 10) }
}

export function calendarDayHref(date: string, slug: string) {
  return `/grabaciones/calendario?vista=dia&desde=${date}&hasta=${date}&marca=${encodeURIComponent(slug)}`
}

export function recordingFinished(r: { fecha_real?: string | null; estado?: string | null }) {
  return !!r.fecha_real || ['cumplida', 'realizada'].includes(r.estado || '')
}

/** Read-through projection: keep Google IDs, never create a second booking. */
export function googleBrandActivities(events: AgendaEvento[], slug: string, linkedGoogleIds: Set<string>): Activity[] {
  const seen = new Set(linkedGoogleIds)
  return events.flatMap((e): Activity[] => {
    if (!e.origenGoogle || e.marcaSlug !== slug || !['grabacion', 'reunion'].includes(e.tipo) || seen.has(e.id)) return []
    seen.add(e.id)
    return [{
      id: `calendar:${e.id}`, sourceId: e.id, source: 'calendar',
      kind: e.tipo === 'grabacion' ? 'Grabación' : 'Reunión',
      title: e.titulo, date: e.fecha, time: e.hora || '',
      // A past Calendar appointment alone does not confirm that work happened.
      state: 'Agendada · Google Calendar', done: false,
      owner: e.tipo === 'grabacion' ? 'Equipo audiovisual' : 'Equipo',
      href: calendarDayHref(e.fecha, slug),
    }]
  })
}
