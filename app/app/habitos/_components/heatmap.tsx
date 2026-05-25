// app/app/habitos/_components/heatmap.tsx
//
// Grid 7×7 (7 filas x 7 cols) mostrando últimos 49 días con cuadritos
// color-coded: completado, no-activo, hoy, vacío.
// Header con días de la semana (M T W T F S S) marcados según si están
// en dias_activos del hábito.
'use client'

const DIAS_HEAD = ['M', 'T', 'W', 'T', 'F', 'S', 'S']  // Mon-Sun

type Props = {
  habitoColor: string         // hex color de la marca/hábito
  diasActivos: number[]       // ISO weekday 1-7
  historial: string[]         // YYYY-MM-DD completados en últimos 49 días
  today: string               // YYYY-MM-DD del día de hoy
}

function isoDayOfWeek(d: Date): number {
  const js = d.getDay()
  return js === 0 ? 7 : js
}

export function HabitoHeatmap({ habitoColor, diasActivos, historial, today }: Props) {
  const completedSet = new Set(historial)
  const todayDate = new Date(today + 'T12:00:00Z')

  // Construir 49 días hacia atrás, agrupados en columnas (semanas).
  // Cada COLUMNA = 1 semana (lun a dom). 7 columnas = 7 semanas = 49 días.
  // Días del pasado al presente: izquierda (más viejo) → derecha (más nuevo).
  const weeks: { date: Date; iso: number; dateStr: string; isFuture: boolean }[][] = []

  // Empezar 6 semanas atrás del LUNES de esta semana
  // Para alinear el header (M T W T F S S) con las celdas
  const todayIso = isoDayOfWeek(todayDate)
  const startOfThisWeek = new Date(todayDate)
  startOfThisWeek.setUTCDate(todayDate.getUTCDate() - (todayIso - 1))  // mover a lunes
  const startDate = new Date(startOfThisWeek)
  startDate.setUTCDate(startDate.getUTCDate() - 7 * 6)  // 6 semanas atrás

  for (let w = 0; w < 7; w++) {
    const weekCells: typeof weeks[number] = []
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate)
      cellDate.setUTCDate(startDate.getUTCDate() + w * 7 + d)
      const iso = isoDayOfWeek(cellDate)
      const dateStr = cellDate.toISOString().slice(0, 10)
      weekCells.push({
        date: cellDate,
        iso,
        dateStr,
        isFuture: cellDate > todayDate,
      })
    }
    weeks.push(weekCells)
  }

  return (
    <div className="space-y-1">
      {/* Header días de la semana — marca activos vs inactivos */}
      <div className="grid grid-cols-7 gap-1">
        {DIAS_HEAD.map((d, i) => {
          const iso = i + 1  // 1=Lun..7=Dom
          const isActive = diasActivos.includes(iso)
          return (
            <div
              key={`head-${i}`}
              className={`text-[10px] font-medium text-center rounded-sm py-0.5 ${
                isActive
                  ? 'bg-emerald-900/30 text-emerald-300'
                  : 'bg-slate-700/40 text-slate-400'
              }`}
            >
              {d}
            </div>
          )
        })}
      </div>

      {/* Grid 7×7 transpuesto para mostrar semanas como filas */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, wi) =>
          week.map((cell, di) => {
            const isToday = cell.dateStr === today
            const isCompleted = completedSet.has(cell.dateStr)
            const isActiveDay = diasActivos.includes(cell.iso)
            const isFuture = cell.isFuture

            let bg = 'bg-slate-800/60'  // default vacío
            let extra = ''
            if (isFuture) {
              bg = 'bg-slate-900/30'
            } else if (isCompleted) {
              bg = ''  // usamos style inline para color custom
              extra = 'ring-1 ring-white/10'
            } else if (!isActiveDay) {
              bg = 'bg-slate-800/30'  // día no-activo (fin de semana p.ej.)
            }

            return (
              <div
                key={`${wi}-${di}`}
                className={`aspect-square rounded-sm ${bg} ${extra} ${isToday ? 'ring-2 ring-sky-400' : ''}`}
                style={isCompleted ? { background: habitoColor } : undefined}
                title={`${cell.dateStr}${isCompleted ? ' · ✅ completado' : isFuture ? ' · futuro' : isActiveDay ? ' · pendiente' : ' · no aplica'}`}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
