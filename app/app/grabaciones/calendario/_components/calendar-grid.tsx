// app/app/grabaciones/calendario/_components/calendar-grid.tsx
//
// Grid mensual 7-col (lun-dom). Cada celda muestra el día + chips de
// grabaciones de ese día con color por marca.
// Click en chip → modal detalle (TODO).
// Click en día vacío → form crear (TODO — por ahora link a /grabaciones).
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { GrabacionEstado } from '@/lib/types/database'

type Grabacion = {
  id: string
  marca_id: string
  marca_slug: string
  marca_nombre: string
  marca_emoji: string | null
  color_calendario: string
  fecha_planeada: string  // YYYY-MM-DD
  fecha_real: string | null
  estado: GrabacionEstado
  videos_grabados: number | null
}

type Props = {
  // Primer día del mes a renderizar (YYYY-MM-01)
  mes: string
  grabaciones: Grabacion[]
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const ESTADO_BORDER: Record<GrabacionEstado, string> = {
  planeada: '',
  cumplida: 'ring-2 ring-emerald-300',
  cancelada: 'opacity-50 line-through',
}

export function CalendarGrid({ mes, grabaciones }: Props) {
  const grid = useMemo(() => buildMonthGrid(mes), [mes])
  const grabsByDay = useMemo(() => {
    const map = new Map<string, Grabacion[]>()
    for (const g of grabaciones) {
      const list = map.get(g.fecha_planeada) ?? []
      list.push(g)
      map.set(g.fecha_planeada, list)
    }
    return map
  }, [grabaciones])

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    /* En mobile el mes de 7 columnas se aplastaba. Lo envolvemos en un
       contenedor con scroll horizontal y le damos ancho mínimo a la grilla
       para que las celdas queden legibles y se deslice de lado (mismo
       patrón que el calendario de Publicaciones). En ≥640px ocupa todo. */
    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
     <div className="min-w-[640px] sm:min-w-0 border border-border rounded-lg overflow-hidden bg-card">
      {/* Header días de la semana */}
      <div className="grid grid-cols-7 bg-muted/40">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-[10px] uppercase tracking-wider font-medium text-center py-2 text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-7">
        {grid.map((cell, i) => {
          if (!cell) {
            // Celda vacía (días de meses adyacentes)
            return <div key={`empty-${i}`} className="min-h-[110px] border-r border-b border-border bg-muted/10" />
          }
          const dayStr = cell.toISOString().slice(0, 10)
          const events = grabsByDay.get(dayStr) ?? []
          const isToday = dayStr === todayStr
          const isWeekend = cell.getDay() === 0 || cell.getDay() === 6

          return (
            <Link
              key={dayStr}
              href={`/grabaciones?desde=${dayStr}&hasta=${dayStr}`}
              className={`min-h-[110px] border-r border-b border-border p-1.5 text-left hover:bg-muted/20 transition-colors flex flex-col gap-0.5 ${isWeekend ? 'bg-muted/5' : ''}`}
              title="Ver / agregar grabaciones de este día"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                  {cell.getDate()}
                </span>
                {isToday && <span className="text-[9px] uppercase tracking-wider text-primary font-medium">HOY</span>}
              </div>

              <div className="flex flex-col gap-0.5">
                {events.slice(0, 4).map((g) => (
                  <div
                    key={g.id}
                    className={`text-[10px] px-1.5 py-0.5 rounded-sm truncate text-white font-medium ${ESTADO_BORDER[g.estado]}`}
                    style={{ background: g.color_calendario }}
                    title={`${g.marca_nombre} · ${g.estado}${g.videos_grabados ? ` · ${g.videos_grabados} videos` : ''}`}
                  >
                    {g.marca_emoji} {g.marca_nombre}
                  </div>
                ))}
                {events.length > 4 && (
                  <div className="text-[9px] text-muted-foreground">+{events.length - 4} más</div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
     </div>
    </div>
  )
}

/**
 * Construye una matriz de fechas para mostrar el mes en grid 7-col.
 * Llena con null las celdas anteriores al primer día y después del último.
 * Empieza el grid en LUNES (no domingo como en US).
 */
function buildMonthGrid(monthStartStr: string): (Date | null)[] {
  const start = new Date(monthStartStr + 'T12:00:00Z')
  start.setUTCDate(1)
  const year = start.getUTCFullYear()
  const month = start.getUTCMonth()
  const daysInMonth = new Date(year, month + 1, 0).getUTCDate()

  // ¿En qué día de la semana cae el día 1? (0=Sun en JS, queremos 0=Lun)
  const firstWeekday = start.getUTCDay()  // 0..6 (Dom..Sáb)
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1  // mover Dom al fin

  const cells: (Date | null)[] = []
  // Padding inicial (días vacíos antes del 1)
  for (let i = 0; i < offset; i++) cells.push(null)
  // Días del mes
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(Date.UTC(year, month, d, 12, 0, 0)))
  }
  // Padding final hasta completar la última semana
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
