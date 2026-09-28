// Fechas en America/Lima para los GET de la app macOS.
// Lima no tiene horario de verano: sumar días en UTC al mediodía no cruza de día.

export const LIMA_TZ = 'America/Lima'

export function ymdLima(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function isYmd(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`))
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetweenYmd(desde: string, hasta: string): number {
  const ms = Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/** Primer y último día del mes de `hoy` (YYYY-MM-DD en Lima). */
export function monthBoundsLima(hoy = ymdLima()): { desde: string; hasta: string } {
  const [y, m] = hoy.split('-').map(Number)
  const desde = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(Date.UTC(y, m, 0))
  return { desde, hasta: last.toISOString().slice(0, 10) }
}

/** ISO timestamptz → fecha y hora en Lima. */
export function limaParts(iso: string): { ymd: string; hm: string | null } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    const ymd = iso.slice(0, 10)
    return { ymd: isYmd(ymd) ? ymd : iso.slice(0, 10), hm: null }
  }
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
  const hm = new Intl.DateTimeFormat('en-GB', {
    timeZone: LIMA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
  return { ymd, hm: hm.slice(0, 5) }
}

export function appBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://distinto-app.vercel.app').replace(/\/$/, '')
}
