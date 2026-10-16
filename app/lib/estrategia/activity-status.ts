import type { Activity } from './model'

export function designFinished(p: {
  disenado?: boolean | null; diseno_terminado_at?: string | null;
  es_tarea_diseno?: boolean | null; fecha_publicacion?: string | null;
  estado_tarea?: string | null;
}) {
  // Grilla requires the design completion seal; moving publication stages is
  // not proof of finished artwork. Standalone design cards also have Listo.
  return !!p.disenado || !!p.diseno_terminado_at ||
    (!!p.es_tarea_diseno && !p.fecha_publicacion && ['listo', 'enviado', 'archivado'].includes(p.estado_tarea || ''))
}
export function weekWindow(today: string) {
  const d = new Date(`${today}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  const start = d.toISOString().slice(0, 10)
  d.setUTCDate(d.getUTCDate() + 6)
  return { start, end: d.toISOString().slice(0, 10) }
}
export function operational(a: Activity) {
  return !['Fecha importante', 'Reunión'].includes(a.kind)
}

export type WorkPeriod = 'todos' | 'mes' | 'semana' | 'sinfecha'
export const DEFAULT_WORK_PERIOD: WorkPeriod = 'todos'

export function creationDateLima(timestamp: string | null | undefined) {
  if (!timestamp) return null
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(date)
}

// The overview must include undated and overdue work until a date filter is chosen.
export function periodWork(activities: Activity[], today: string, period: WorkPeriod) {
  const week = weekWindow(today)
  return activities.filter(a => {
    if (!operational(a)) return false
    if (period === 'todos') return true
    if (period === 'sinfecha') return !a.date && !a.done
    // Creation places undated tasks in a work period, never on the delivery calendar.
    const date = a.date || (a.kind === 'Tarea' ? a.createdDate : null)
    return !!date && (period === 'semana'
      ? date >= week.start && date <= week.end
      : date.startsWith(today.slice(0, 7)))
  })
}
