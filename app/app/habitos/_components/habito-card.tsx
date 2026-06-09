// app/app/habitos/_components/habito-card.tsx
//
// Card con icono+nombre, botón ¡Hecho!, heatmap y % cumplimiento.
// Estilo dark mode similar al screenshot que mandó Pedro.
'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { toggleHabitoHoy, archivarHabito, eliminarHabito } from '../_actions'
import { HabitoHeatmap } from './heatmap'

type Props = {
  id: string
  nombre: string
  icono: string
  color: string
  dias_activos: number[]
  completado_hoy: boolean
  completado_at: string | null
  historial: string[]
  today: string
  pct_cumplimiento: number
  dias_esperados: number
  dias_cumplidos: number
}

export function HabitoCard(props: Props) {
  const [completado, setCompletado] = useState(props.completado_hoy)
  const [isPending, startTransition] = useTransition()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  /* Cerrar el menú al hacer click fuera */
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleHabitoHoy(props.id)
      if (result.ok) {
        setCompletado(result.completado)
        toast.success(result.completado ? `✅ ${props.nombre} marcado` : `↶ ${props.nombre} desmarcado`)
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  function handleArchive() {
    setMenuOpen(false)
    if (!confirm(`¿Archivar "${props.nombre}"?\n\nLa historia se conserva. Puedes reactivarlo desde Settings.`)) return
    startTransition(async () => {
      const result = await archivarHabito(props.id)
      if (result.ok) toast.success(`📦 ${props.nombre} archivado`)
      else toast.error(`Error: ${result.error}`)
    })
  }

  function handleDelete() {
    setMenuOpen(false)
    if (!confirm(
      `¿Eliminar "${props.nombre}" definitivamente?\n\n` +
      `Esto borra el hábito Y todo su historial de completados. ` +
      `NO se puede recuperar. Si solo quieres pausarlo, mejor archívalo.`
    )) return
    startTransition(async () => {
      const result = await eliminarHabito(props.id)
      if (result.ok) toast.success(`🗑️ ${props.nombre} eliminado`)
      else toast.error(`Error: ${result.error}`)
    })
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
      {/* HEADER: icono + nombre + menú */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{props.icono}</span>
          <h3 className="font-semibold text-slate-100 truncate">{props.nombre}</h3>
        </div>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            disabled={isPending}
            className="text-slate-500 hover:text-slate-300 text-xs h-6 w-6 rounded hover:bg-slate-800 disabled:opacity-50"
            title="Opciones"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden"
            >
              <button
                role="menuitem"
                onClick={handleArchive}
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 flex items-center gap-2"
              >
                <span>📦</span>
                <span className="flex-1">Archivar</span>
                <span className="text-xs text-slate-500">conserva historial</span>
              </button>
              <div className="border-t border-slate-800" />
              <button
                role="menuitem"
                onClick={handleDelete}
                className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-950/40 flex items-center gap-2"
              >
                <span>🗑️</span>
                <span className="flex-1">Eliminar</span>
                <span className="text-xs text-red-400/70">borra todo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTÓN ¡HECHO! */}
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`w-full h-10 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
          completado
            ? 'bg-emerald-600/20 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-600/30'
            : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
        }`}
        style={completado ? { borderColor: props.color, color: props.color } : undefined}
      >
        {isPending ? '…' : completado ? '✅ ¡Hecho!' : '¡Hecho!'}
      </button>

      {/* HEATMAP */}
      <HabitoHeatmap
        habitoColor={props.color}
        diasActivos={props.dias_activos}
        historial={props.historial}
        today={props.today}
      />

      {/* % cumplimiento + ring visual */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          <strong className="text-slate-200 text-base">{props.pct_cumplimiento}%</strong>{' '}
          <span className="text-slate-500">({props.dias_cumplidos}/{props.dias_esperados})</span>
        </span>
        <ProgressRing pct={props.pct_cumplimiento} color={props.color} />
      </div>
    </div>
  )
}

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const radius = 10
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" className="rotate-[-90deg]">
      <circle cx="13" cy="13" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
      <circle
        cx="13"
        cy="13"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}
