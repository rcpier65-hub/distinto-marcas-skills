// Explicit dates take precedence over relative dates and weekday names.
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const date = new Date(`${fecha}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === fecha
}

export function fechaExplicita(texto: string, hoy: string): { encontrada: boolean; fecha: string | null } {
  const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\bsetiembre\b/g, 'septiembre')
  const iso = t.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  const nombre = t.match(new RegExp(`\\b(\\d{1,2})\\s+(?:de\\s+)?(${MESES.join('|')})\\b(?:\\s+(?:(?:de|del)\\s+)?(\\d{4})\\b)?`))
  const numerica = t.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{4}))?\b/)
  if (!iso && !nombre && !numerica) return { encontrada: false, fecha: null }
  const dia = Number(iso ? iso[3] : nombre ? nombre[1] : numerica![1])
  const mes = iso ? Number(iso[2]) : nombre ? MESES.indexOf(nombre[2]) + 1 : Number(numerica![2])
  const anoDicho = iso ? iso[1] : nombre ? nombre[3] : numerica![3]
  let ano = Number(anoDicho || hoy.slice(0, 4))
  const format = () => `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  // Without a year, choose the next occurrence of that month/day, including today.
  if (!anoDicho && format() < hoy) ano++
  const fecha = format()
  return { encontrada: true, fecha: fechaValida(fecha) ? fecha : null }
}
