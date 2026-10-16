import type { AgendaEvento } from '@/app/grabaciones/calendario/_components/agenda-calendar'

export function duracionDe(e: Pick<AgendaEvento, 'tipo' | 'duracionMin'>): number {
  if (e.duracionMin && e.duracionMin > 0) return e.duracionMin
  if (e.tipo === 'reunion') return 45
  if (e.tipo === 'publicacion') return 120
  return 60
}

export function minutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

export function horaCalendario(min: number): string {
  const h = Math.floor(min / 60) % 24, m = min % 60
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`
}

export function horarioEvento(e: Pick<AgendaEvento, 'hora' | 'duracionMin' | 'tipo'>): string {
  if (!e.hora) return 'Todo el día'
  const inicio = minutos(e.hora)
  return `${horaCalendario(inicio)} – ${horaCalendario(inicio + duracionDe(e))}`
}

type Intervalo = { ini: number; fin: number }
export function gruposIntervalos<T extends Intervalo>(eventos: T[]): T[][] {
  const grupos: T[][] = []
  let fin = -Infinity
  for (const evento of [...eventos].sort((a, b) => a.ini - b.ini || b.fin - a.fin)) {
    if (!grupos.length || evento.ini >= fin) {
      grupos.push([])
      fin = evento.fin
    }
    grupos[grupos.length - 1].push(evento)
    fin = Math.max(fin, evento.fin)
  }
  return grupos
}

// Every simultaneous event keeps its own column, including events contained in a longer one.
export function layoutDia<T extends Intervalo>(eventos: T[]) {
  return gruposIntervalos(eventos).flatMap(grupo => {
    const colocados: (T & { col: number; cols: number })[] = []
    for (const evento of grupo) {
      const ocupadas = new Set(colocados.filter(g => g.fin > evento.ini).map(g => g.col))
      let col = 0
      while (ocupadas.has(col)) col++
      colocados.push({ ...evento, col, cols: 1 })
    }
    const cols = Math.max(...colocados.map(g => g.col + 1))
    return colocados.map(g => ({ ...g, cols }))
  })
}

export function crucesAgenda(eventos: AgendaEvento[]) {
  const dias = new Map<string, { e: AgendaEvento; ini: number; fin: number }[]>()
  for (const e of eventos) {
    if (!e.hora || !['grabacion', 'reunion', 'gcal'].includes(e.tipo) || ['cancelada', 'cancelado', 'cancelled'].includes(e.estado?.toLowerCase() ?? '')) continue
    const ini = minutos(e.hora), dia = dias.get(e.fecha) ?? []
    dia.push({ e, ini, fin: ini + duracionDe(e) })
    dias.set(e.fecha, dia)
  }
  return [...dias].sort(([a], [b]) => a.localeCompare(b)).flatMap(([fecha, eventos]) =>
    gruposIntervalos(eventos).filter(g => g.length > 1).map(g => ({ fecha, eventos: g.map(x => x.e) })))
}
