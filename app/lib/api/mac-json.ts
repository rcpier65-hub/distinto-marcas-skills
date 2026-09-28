// Helpers chicos para los GET de lista del Mac. No tocan secretos.

export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export function texto(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export function textoOrNull(value: unknown): string | null {
  const trimmed = texto(value)
  return trimmed.length > 0 ? trimmed : null
}

export function ymdOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 10) return null
  const ymd = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null
}

export function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((item) => item.length > 0)
}

export function tablaFalta(message: string): boolean {
  return /does not exist|Could not find the table|schema cache/i.test(message)
}
