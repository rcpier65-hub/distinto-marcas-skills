// app/app/habitos/_components/habitos-tracker.tsx
//
// Tracker de hábitos rediseñado — vista SEMANAL (círculos por día, clickeables)
// y MENSUAL (grilla de puntos tipo "contribuciones"). Estilo Distinto: violeta
// #ba41f7 para cumplido, superficies claras consistentes con el resto de la app.
// Marcado optimista (cambia al instante, revierte si el server falla).
'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { toggleHabitoFecha } from '../_actions'

const VIOLETA = '#ba41f7'

export type HabitoTrackerData = {
  id: string
  nombre: string
  icono: string
  color: string | null
  historial: string[]   // YYYY-MM-DD cumplidos (últimas ~7 semanas)
}

type Props = { habitos: HabitoTrackerData[]; today: string }

/* ---------- helpers de fecha (local, noon para evitar saltos de TZ) ---------- */
function parseYMD(s: string): Date { return new Date(s + 'T12:00:00') }
function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']            // getDay() 0=Dom..6=Sáb
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function HabitosTracker({ habitos, today }: Props) {
  const [vista, setVista] = useState<'semana' | 'mes'>('semana')
  const [, startTransition] = useTransition()

  // Estado optimista: set de claves "habitoId|fecha" cumplidas.
  const [done, setDone] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const h of habitos) for (const f of h.historial) s.add(`${h.id}|${f}`)
    return s
  })

  function toggle(habitoId: string, fecha: string) {
    if (fecha > today) return
    const key = `${habitoId}|${fecha}`
    const was = done.has(key)
    setDone((prev) => { const n = new Set(prev); if (was) n.delete(key); else n.add(key); return n })
    startTransition(async () => {
      const r = await toggleHabitoFecha(habitoId, fecha)
      if (!r.ok) {
        setDone((prev) => { const n = new Set(prev); if (was) n.add(key); else n.delete(key); return n })
        toast.error(r.error)
      }
    })
  }

  // Últimos 7 días (hoy a la derecha)
  const semana = useMemo(() => {
    const hoy = parseYMD(today)
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(hoy, i - 6)
      return { ymd: toYMD(d), letra: LETRA[d.getDay()], num: d.getDate(), esHoy: toYMD(d) === today }
    })
  }, [today])

  // Grilla del mes actual: columnas = semanas, filas = L..D
  const mes = useMemo(() => {
    const hoy = parseYMD(today)
    const año = hoy.getFullYear(); const m = hoy.getMonth()
    const primero = new Date(año, m, 1); const ultimo = new Date(año, m + 1, 0)
    const offIni = (primero.getDay() + 6) % 7    // 0=Lun
    const offFin = (ultimo.getDay() + 6) % 7
    const start = addDays(primero, -offIni)
    const end = addDays(ultimo, 6 - offFin)
    const dias: { ymd: string; inMonth: boolean; esHoy: boolean; futuro: boolean }[] = []
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const ymd = toYMD(d)
      dias.push({ ymd, inMonth: d.getMonth() === m, esHoy: ymd === today, futuro: ymd > today })
    }
    const cols = dias.length / 7
    return { dias, cols, label: `${MESES[m]} ${año}` }
  }, [today])

  return (
    <div className="space-y-4">
      {/* Toggle Semana / Mes */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
          {(['semana', 'mes'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className="h-8 px-4 rounded-md text-sm font-medium transition-colors"
              style={vista === v ? { background: VIOLETA, color: '#fff' } : { color: 'var(--muted-foreground, #71717a)' }}
            >
              {v === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
        {vista === 'mes' && <span className="text-xs text-muted-foreground capitalize">{mes.label}</span>}
      </div>

      {habitos.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-8 text-center">
          Aún no tienes hábitos. Crea el primero abajo 👇
        </p>
      )}

      {/* ---------- VISTA SEMANA ---------- */}
      {vista === 'semana' && habitos.map((h) => {
        const cumplidosSemana = semana.filter((d) => done.has(`${h.id}|${d.ymd}`)).length
        return (
          <div key={h.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{h.icono}</span>
                <h3 className="font-semibold text-base truncate">{h.nombre}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 ml-9">{cumplidosSemana}/7 esta semana</p>
            </div>
            <div className="flex items-center gap-1.5">
              {semana.map((d) => {
                const ok = done.has(`${h.id}|${d.ymd}`)
                return (
                  <button
                    key={d.ymd}
                    onClick={() => toggle(h.id, d.ymd)}
                    className="flex flex-col items-center gap-1 group"
                    title={d.ymd}
                  >
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                      style={
                        ok
                          ? { background: VIOLETA, color: '#fff', boxShadow: `0 2px 8px ${VIOLETA}55` }
                          : d.esHoy
                          ? { border: `2px solid ${VIOLETA}`, background: `${VIOLETA}14`, color: VIOLETA }
                          : { border: '1.5px solid var(--border, #e4e4e7)', color: '#a1a1aa' }
                      }
                    >
                      {ok ? <Check className="w-4 h-4" strokeWidth={3} /> : <span className="text-xs tabular-nums">{d.num}</span>}
                    </span>
                    <span className={`text-[10px] ${d.esHoy ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{d.letra}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* ---------- VISTA MES ---------- */}
      {vista === 'mes' && habitos.map((h) => {
        const delMes = mes.dias.filter((d) => d.inMonth)
        const cumplidosMes = delMes.filter((d) => done.has(`${h.id}|${d.ymd}`)).length
        const pasados = delMes.filter((d) => !d.futuro).length
        const pct = pasados > 0 ? Math.round((cumplidosMes / pasados) * 100) : 0
        const hoyOk = done.has(`${h.id}|${today}`)
        return (
          <div key={h.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{h.icono}</span>
                  <h3 className="font-semibold text-base truncate">{h.nombre}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-9">
                  {cumplidosMes} días este mes · <span style={{ color: VIOLETA }}>{pct}%</span>
                </p>
              </div>
              {/* Estado de HOY — clickeable */}
              <button
                onClick={() => toggle(h.id, today)}
                title="Marcar hoy"
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all"
                style={hoyOk
                  ? { background: VIOLETA, color: '#fff', boxShadow: `0 2px 10px ${VIOLETA}55` }
                  : { border: `2px solid ${VIOLETA}`, background: `${VIOLETA}10`, color: VIOLETA }}
              >
                {hoyOk ? <Check className="w-5 h-5" strokeWidth={3} /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: VIOLETA }} />}
              </button>
            </div>

            {/* Grilla de puntos del mes */}
            <div className="flex gap-2">
              <div className="flex flex-col justify-between py-0.5 text-[9px] text-muted-foreground">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => <span key={i} className="leading-none h-3.5 flex items-center">{l}</span>)}
              </div>
              <div className="grid grid-flow-col gap-1" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}>
                {mes.dias.map((d, idx) => {
                  const ok = done.has(`${h.id}|${d.ymd}`)
                  const clickable = d.inMonth && !d.futuro
                  return (
                    <button
                      key={idx}
                      disabled={!clickable}
                      onClick={() => clickable && toggle(h.id, d.ymd)}
                      title={d.inMonth ? d.ymd : ''}
                      className="w-3.5 h-3.5 rounded-[3px] transition-all disabled:cursor-default"
                      style={
                        !d.inMonth
                          ? { background: 'transparent' }
                          : ok
                          ? { background: VIOLETA }
                          : d.esHoy
                          ? { background: `${VIOLETA}22`, outline: `1.5px solid ${VIOLETA}`, outlineOffset: '-1.5px' }
                          : d.futuro
                          ? { background: 'var(--muted, #f4f4f5)' }
                          : { background: 'var(--border, #e4e4e7)' }
                      }
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
