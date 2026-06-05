// app/app/grabaciones/_components/marca-grabacion-card.tsx
//
// Card de una marca en el control de grabaciones. Muestra:
//   - Header (emoji, nombre, objetivo editable)
//   - Barra de cumplimiento
//   - Lista de FECHAS de grabación del mes (editables/borrables, con estado)
//   - Botón "+ Agregar fecha de grabación"
//
// Cada fecha sincroniza con Google Calendar vía el server action (la
// columna google_event_id vincula la grabación con su evento).
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CalendarPlus, Check, X, Clock, Trash2, CalendarDays } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ObjetivoInput } from './objetivo-input'
import {
  createGrabacion,
  updateGrabacionFecha,
  updateGrabacionEstado,
  deleteGrabacion,
  type MarcaKPI,
  type GrabacionWithMarca,
} from '../_actions'

type Props = {
  kpi: MarcaKPI
  /** Mes activo en formato YYYY-MM para defaultear nuevas fechas */
  mesDefault: string
}

const ESTADO_CFG: Record<string, { label: string; color: string; bg: string; Icon: typeof Check }> = {
  planeada:  { label: 'Planeada',  color: '#b45309', bg: '#f59e0b18', Icon: Clock },
  cumplida:  { label: 'Cumplida',  color: '#047857', bg: '#10b98118', Icon: Check },
  cancelada: { label: 'Cancelada', color: '#be123c', bg: '#f43f5e18', Icon: X },
}

export function MarcaGrabacionCard({ kpi, mesDefault }: Props) {
  const [isPending, startTransition] = useTransition()
  const pct = kpi.cumplimiento_pct
  const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : pct > 0 ? 'bg-rose-400' : 'bg-muted'

  function handleAgregar() {
    // Default: día 15 del mes activo (mitad de mes, fácil de mover después)
    const fechaDefault = `${mesDefault}-15`
    startTransition(async () => {
      const r = await createGrabacion({ marca_slug: kpi.marca_slug, fecha_planeada: fechaDefault })
      if (r.ok) {
        toast.success(`Fecha agregada a ${kpi.marca_nombre} — ajustala al día real`)
      } else {
        toast.error(`Error: ${r.error}`)
      }
    })
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">{kpi.marca_emoji ?? '📊'}</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{kpi.marca_nombre}</p>
              <code className="text-[10px] text-muted-foreground font-mono">{kpi.marca_slug}</code>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Objetivo</p>
            <ObjetivoInput slug={kpi.marca_slug} initial={kpi.objetivo} />
          </div>
        </div>

        {/* Barra de cumplimiento */}
        <div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-1.5">
            <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono">
              <strong className="text-emerald-600">{kpi.cumplidas}</strong>
              {' / '}
              <span className="text-muted-foreground">{kpi.objetivo}</span>
              {' grabaciones'}
            </span>
            <span className={`font-semibold ${pct >= 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {pct}%
            </span>
          </div>
        </div>

        {/* LISTA DE FECHAS */}
        <div className="space-y-1.5 pt-1 border-t border-border/60">
          {kpi.grabaciones.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic py-1">
              Sin fechas este mes. Agregá la primera ↓
            </p>
          ) : (
            kpi.grabaciones.map((g) => (
              <FechaRow key={g.id} grabacion={g} disabled={isPending} />
            ))
          )}

          {/* Botón agregar fecha */}
          <button
            type="button"
            onClick={handleAgregar}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-1.5 h-8 mt-1 rounded-md border border-dashed border-[#ba41f7]/40 text-[#ba41f7] text-xs font-medium hover:bg-[#ba41f7]/8 disabled:opacity-50 transition-colors"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Agregar fecha de grabación
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

/* Fila de una fecha individual: fecha editable + chip estado + acciones. */
function FechaRow({ grabacion, disabled }: { grabacion: GrabacionWithMarca; disabled: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [fecha, setFecha] = useState(grabacion.fecha_planeada)
  const cfg = ESTADO_CFG[grabacion.estado] ?? ESTADO_CFG.planeada
  const busy = disabled || isPending

  function saveFecha() {
    if (fecha === grabacion.fecha_planeada) return
    startTransition(async () => {
      const r = await updateGrabacionFecha(grabacion.id, fecha)
      if (r.ok) toast.success('Fecha actualizada')
      else { setFecha(grabacion.fecha_planeada); toast.error(r.error) }
    })
  }

  function cambiarEstado(estado: 'planeada' | 'cumplida' | 'cancelada') {
    startTransition(async () => {
      const r = await updateGrabacionEstado({ id: grabacion.id, estado })
      if (r.ok) toast.success(`Marcada ${ESTADO_CFG[estado].label.toLowerCase()}`)
      else toast.error(r.error)
    })
  }

  function borrar() {
    if (!confirm('¿Eliminar esta fecha de grabación?')) return
    startTransition(async () => {
      const r = await deleteGrabacion(grabacion.id)
      if (r.ok) toast.success('Fecha eliminada')
      else toast.error(r.error)
    })
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      {/* Fecha editable */}
      <input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        onBlur={saveFecha}
        disabled={busy}
        className="h-7 px-1.5 rounded border border-input bg-background text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40 disabled:opacity-50 flex-1 min-w-0"
      />
      {/* Chip estado clickeable — cicla planeada→cumplida→cancelada→planeada */}
      <button
        type="button"
        onClick={() => {
          const next = grabacion.estado === 'planeada' ? 'cumplida'
            : grabacion.estado === 'cumplida' ? 'cancelada' : 'planeada'
          cambiarEstado(next)
        }}
        disabled={busy}
        title={`${cfg.label} — click para cambiar`}
        className="inline-flex items-center gap-1 h-7 px-2 rounded text-[10px] font-semibold shrink-0 disabled:opacity-50"
        style={{ color: cfg.color, background: cfg.bg }}
      >
        <cfg.Icon className="w-3 h-3" />
        {cfg.label}
      </button>
      {/* Borrar — visible en hover */}
      <button
        type="button"
        onClick={borrar}
        disabled={busy}
        title="Eliminar fecha"
        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
