// app/app/habitos/page.tsx
// Vista de hábitos diarios — grid de cards estilo Streaks/Habitify.
// Las tareas arrancan "no realizadas" cada mañana hasta que las marques.

import { requireUser } from '@/lib/auth/get-user'
import { listHabitosConEstado } from './_actions'
import { HabitoCard } from './_components/habito-card'
import { NuevoHabitoForm } from './_components/nuevo-habito-form'

export const dynamic = 'force-dynamic'

const DIAS_LARGO = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MESES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function formatTodayLabel(): string {
  const d = new Date()
  const dia = d.getDay() === 0 ? 7 : d.getDay()  // ISO weekday
  return `${DIAS_LARGO[dia]} ${d.getDate()} de ${MESES[d.getMonth() + 1]}`
}

export default async function HabitosPage() {
  await requireUser()

  const result = await listHabitosConEstado()
  const habitos = result.ok ? result.habitos : []
  const today = result.ok ? result.today : new Date().toISOString().slice(0, 10)
  const error = !result.ok ? result.error : null

  // Computar stats globales del día
  const completadosHoy = habitos.filter((h) => h.completado_hoy).length
  const totalHoy = habitos.length
  const pctHoy = totalHoy > 0 ? Math.round((completadosHoy / totalHoy) * 100) : 0

  return (
    <main className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* HEADER */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">🔥 Hábitos diarios</h1>
          <p className="text-sm text-muted-foreground capitalize">{formatTodayLabel()}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hoy</p>
          <p className="text-3xl font-bold tabular-nums">
            <span className={pctHoy === 100 ? 'text-emerald-400' : pctHoy >= 50 ? 'text-amber-400' : ''}>
              {completadosHoy}
            </span>
            <span className="text-muted-foreground">/{totalHoy}</span>
          </p>
        </div>
      </header>

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          ⚠️ {error}
        </div>
      )}

      {/* GRID DE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {habitos.map((h) => (
          <HabitoCard
            key={h.id}
            id={h.id}
            nombre={h.nombre}
            icono={h.icono}
            color={h.color}
            dias_activos={h.dias_activos}
            completado_hoy={h.completado_hoy}
            completado_at={h.completado_at}
            historial={h.historial}
            today={today}
            pct_cumplimiento={h.pct_cumplimiento}
            dias_esperados={h.dias_esperados}
            dias_cumplidos={h.dias_cumplidos}
          />
        ))}
        {habitos.length === 0 && !error && (
          <div className="col-span-full bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-sm text-muted-foreground">
            Sin hábitos todavía. Apretá <strong>+ Nuevo hábito</strong> abajo para empezar.
          </div>
        )}
      </div>

      {/* FORM NUEVO */}
      <section className="pt-2">
        <NuevoHabitoForm />
      </section>

      {/* HINT */}
      <p className="text-xs text-muted-foreground">
        💡 El heatmap muestra los últimos 49 días. Los días no-activos (ej. fin de semana si es hábito laboral) aparecen más opacos. El cuadrito con anillo azul es <strong>hoy</strong>.
      </p>
    </main>
  )
}
