// app/app/habitos/_components/habitos-tracker.tsx
//
// Tracker de hábitos rediseñado — vista SEMANAL (círculos por día, clickeables)
// y MENSUAL (grilla de puntos tipo "contribuciones"). Estilo Distinto: violeta
// #ba41f7 para cumplido, superficies claras consistentes con el resto de la app.
// Marcado optimista (cambia al instante, revierte si el server falla).
'use client'

import { useMemo, useState, useTransition, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Check, MoreVertical, Archive, Trash2 } from 'lucide-react'
import { toggleHabitoFecha, archivarHabito, eliminarHabito } from '../_actions'

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

/** Donut de progreso tipo métrica: % al centro + leyenda cumplido / no cumplido. */
function DonutMetrica({ pct, cumplidos, noCumplidos }: { pct: number; cumplidos: number; noCumplidos: number }) {
  const r = 54
  const c = 2 * Math.PI * r
  const filled = (Math.max(0, Math.min(100, pct)) / 100) * c
  return (
    <div className="flex flex-col items-center gap-3 shrink-0">
      <div className="relative w-[148px] h-[148px]">
        <svg width="148" height="148" viewBox="0 0 148 148">
          <circle cx="74" cy="74" r={r} fill="none" stroke="#ececf1" strokeWidth="16" />
          <circle
            cx="74" cy="74" r={r} fill="none" stroke={VIOLETA} strokeWidth="16" strokeLinecap="round"
            strokeDasharray={`${filled} ${c}`} transform="rotate(-90 74 74)"
            style={{ transition: 'stroke-dasharray 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums leading-none">{pct}%</span>
          <span className="text-[10px] tracking-widest text-muted-foreground mt-1">CUMPLIDO</span>
        </div>
      </div>
      <div className="w-full max-w-[190px] space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: VIOLETA }} /> Cumplido</span>
          <span className="tabular-nums"><strong>{cumplidos}</strong> <span className="text-muted-foreground text-xs">{pct}%</span></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: '#e4e4e7' }} /> No cumplido</span>
          <span className="tabular-nums"><strong>{noCumplidos}</strong> <span className="text-muted-foreground text-xs">{100 - pct}%</span></span>
        </div>
      </div>
    </div>
  )
}

/**
 * Menú "⋯" por hábito con dos acciones:
 *   📦 Archivar  → marca activo=false, conserva historial
 *   🗑️ Eliminar  → DELETE completo del hábito + completados (irreversible)
 *
 * Pedro pidió poder eliminar. Diferenciamos Archivar (recuperable) de
 * Eliminar (definitivo) con colores distintos para que no se confundan.
 */
function HabitoMenu({ habitoId, nombre }: { habitoId: string; nombre: string }) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [open])

  function handleArchivar() {
    setOpen(false)
    if (!confirm(`¿Archivar "${nombre}"?\n\nEl hábito se oculta de la vista pero conserva su historial. Puedes reactivarlo después desde Settings.`)) return
    startTransition(async () => {
      const r = await archivarHabito(habitoId)
      if (r.ok) toast.success(`📦 ${nombre} archivado`)
      else toast.error(r.error)
    })
  }

  function handleEliminar() {
    setOpen(false)
    if (!confirm(`¿Eliminar "${nombre}" definitivamente?\n\nEsto borra el hábito Y todo su historial de días cumplidos. NO se puede recuperar. Si solo quieres pausarlo, mejor archívalo.`)) return
    startTransition(async () => {
      const r = await eliminarHabito(habitoId)
      if (r.ok) toast.success(`🗑️ ${nombre} eliminado`)
      else toast.error(r.error)
    })
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title="Opciones"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 min-w-[200px] rounded-lg border border-border bg-card shadow-lg overflow-hidden"
        >
          <button
            role="menuitem"
            onClick={handleArchivar}
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
          >
            <Archive className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1">Archivar</span>
            <span className="text-[10px] text-muted-foreground">conserva historial</span>
          </button>
          <div className="border-t border-border" />
          <button
            role="menuitem"
            onClick={handleEliminar}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span className="flex-1">Eliminar</span>
            <span className="text-[10px] text-red-500/80">borra todo</span>
          </button>
        </div>
      )}
    </div>
  )
}

export function HabitosTracker({ habitos, today }: Props) {
  const [vista, setVista] = useState<'semana' | 'mes'>('semana')
  const [, startTransition] = useTransition()

  // Estado optimista: set de claves "habitoId|fecha" cumplidas.
  const [done, setDone] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const h of habitos) for (const f of h.historial) s.add(`${h.id}|${f}`)
    return s
  })

  /* Pedro: 'NO dejar marcar vista diaria o semanal en el módulo de
     hábitos, solo se puede marcar el día que estamos. Si pasa ese día
     ya no se puede marcar, ni después ni antes.'
     → Bloqueamos cualquier fecha distinta de HOY (ni futuros ni pasados). */
  function toggle(habitoId: string, fecha: string) {
    if (fecha !== today) {
      if (fecha > today) toast.error('No puedes marcar días futuros')
      else toast.error('Solo puedes marcar el hábito el mismo día. Hoy ya pasó esa fecha.')
      return
    }
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
    const dias: { ymd: string; dia: number; inMonth: boolean; esHoy: boolean; futuro: boolean }[] = []
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const ymd = toYMD(d)
      dias.push({ ymd, dia: d.getDate(), inMonth: d.getMonth() === m, esHoy: ymd === today, futuro: ymd > today })
    }
    return { dias, label: `${MESES[m]} ${año}` }
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
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{h.icono}</span>
                <h3 className="font-semibold text-base truncate">{h.nombre}</h3>
                {/* Menú archivar/eliminar */}
                <HabitoMenu habitoId={h.id} nombre={h.nombre} />
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
        return (
          <div key={h.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            {/* Título + menú archivar/eliminar a la derecha */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-2xl">{h.icono}</span>
                <h3 className="font-semibold text-base truncate">{h.nombre}</h3>
              </div>
              <HabitoMenu habitoId={h.id} nombre={h.nombre} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 ml-9">
              {cumplidosMes} días este mes · <span style={{ color: VIOLETA }}>{pct}%</span>
            </p>

            {/* Calendario + donut, centrados juntos */}
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 mt-4">
              {/* Calendario del mes — 7 columnas (Lun→Dom) */}
              <div className="max-w-md w-full shrink-0">
                  <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => (
                      <span key={i} className="text-[10px] text-center text-muted-foreground">{l}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {mes.dias.map((d, idx) => {
                      if (!d.inMonth) return <span key={idx} aria-hidden />   // relleno fuera del mes
                      const ok = done.has(`${h.id}|${d.ymd}`)
                      const clickable = !d.futuro
                      return (
                        <button
                          key={idx}
                          disabled={!clickable}
                          onClick={() => clickable && toggle(h.id, d.ymd)}
                          title={d.ymd}
                          className="aspect-square rounded-md flex items-center justify-center text-[11px] tabular-nums transition-all disabled:cursor-default hover:opacity-90"
                          style={
                            ok
                              ? { background: VIOLETA, color: '#fff', fontWeight: 600 }
                              : d.esHoy
                              ? { border: `2px solid ${VIOLETA}`, background: `${VIOLETA}12`, color: VIOLETA, fontWeight: 700 }
                              : d.futuro
                              ? { background: 'var(--muted, #f4f4f5)', color: '#c4c4cc' }
                              : { background: 'var(--border, #e4e4e7)', color: '#71717a' }
                          }
                        >
                          {d.dia}
                        </button>
                      )
                    })}
                  </div>
                </div>

              {/* Donut de métrica a la derecha */}
              <DonutMetrica pct={pct} cumplidos={cumplidosMes} noCumplidos={pasados - cumplidosMes} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
