// Normaliza la hora que manda Nay al formato que ya acepta agendarReunion
// (1 o 2 dígitos, minutos). "10am" y "10:30 pm" se convierten antes de
// entrar a la misma validación de la web.

export function normalizarHoraAgenda(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim().toLowerCase()
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!m) return null
  let h = Number(m[1])
  const min = m[2] ? Number(m[2]) : 0
  const ampm = m[3] ?? ''
  if (ampm === 'pm' && h < 12) h += 12
  if (ampm === 'am' && h === 12) h = 0
  if (!ampm && h > 23) return null
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}
