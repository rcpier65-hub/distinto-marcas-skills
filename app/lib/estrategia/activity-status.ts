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
