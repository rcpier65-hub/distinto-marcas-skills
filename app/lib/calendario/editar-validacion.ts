export type TipoAgendaEditable = 'reunion' | 'grabacion' | 'gcal'
export type EdicionAgenda = {
  origen: TipoAgendaEditable
  tipo: TipoAgendaEditable
  titulo: string
  fecha: string
  hora: string | null
  duracionMin: number
  crearMeet?: boolean
}

export function validarEdicionAgenda(input: EdicionAgenda): string | null {
  if (!input || !['reunion', 'grabacion', 'gcal'].includes(input.origen)
    || !['reunion', 'grabacion', 'gcal'].includes(input.tipo)) return 'Tipo de evento inválido.'
  if (input.origen !== 'gcal' && input.tipo === 'gcal') return 'Selecciona reunión o grabación.'
  if (typeof input.titulo !== 'string' || !input.titulo.trim() || input.titulo.length > 300) return 'Ponle un título de hasta 300 caracteres.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha) || !Number.isFinite(Date.parse(input.fecha))
    || new Date(input.fecha).toISOString().slice(0, 10) !== input.fecha) return 'Fecha inválida.'
  if (input.hora !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.hora)) return 'Hora inválida.'
  if (!Number.isInteger(input.duracionMin) || input.duracionMin < 5 || input.duracionMin > 1440) return 'La duración debe ser de 5 minutos a 24 horas.'
  if (input.tipo === 'reunion' && !input.hora) return 'Indica la hora de la reunión.'
  if (input.crearMeet && input.tipo !== 'reunion') return 'Meet solo se genera para una reunión.'
  return null
}

export function horaFinalInput(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number)
  const fin = (h * 60 + m + minutos) % 1440
  return `${String(Math.floor(fin / 60)).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`
}
export function minutosHasta(hora: string, fin: string): number {
  const valor = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
  return (valor(fin) - valor(hora) + 1440) % 1440 || 1440
}
