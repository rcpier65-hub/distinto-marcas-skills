// app/lib/utils/format-hora.ts
//
// Helpers de formato de hora 12h con AM/PM. Pedro pidió que las
// grabaciones (planificación y vista) usen AM/PM en lugar del 24h
// porque sus clientes y el equipo de campo (camarógrafos) lo leen
// más rápido en ese formato.
//
// La BD sigue guardando 'HH:MM:SS' en columnas tipo `time`. Estos
// helpers solo afectan la PRESENTACIÓN.

/**
 * Convierte 'HH:MM[:SS]' (24h) a 'h:MM AM/PM'.
 *
 *   '10:00'    → '10:00 AM'
 *   '14:30'    → '2:30 PM'
 *   '00:00'    → '12:00 AM' (medianoche)
 *   '12:00'    → '12:00 PM' (mediodía)
 *   '00:30:00' → '12:30 AM'
 *   ''         → ''
 *   null/undef → ''
 */
export function formatHora12(hora?: string | null): string {
  if (!hora) return ''
  const trimmed = String(hora).trim()
  if (!trimmed) return ''
  const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!m) return trimmed  /* devuelvo el input si no puedo parsear */
  const hh = parseInt(m[1], 10)
  const mm = m[2]
  const ampm = hh < 12 ? 'AM' : 'PM'
  const hour12 = ((hh + 11) % 12) + 1  /* 0→12, 13→1, ... */
  return `${hour12}:${mm} ${ampm}`
}

/**
 * Devuelve solo el sufijo AM/PM de una hora 24h. Útil para mostrar
 * al lado de un input type=time nativo (que ya muestra los números).
 */
export function sufijoAmPm(hora?: string | null): string {
  if (!hora) return ''
  const m = String(hora).match(/^(\d{1,2}):\d{2}/)
  if (!m) return ''
  return parseInt(m[1], 10) < 12 ? 'AM' : 'PM'
}
