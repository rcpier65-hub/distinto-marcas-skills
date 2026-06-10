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
import { formatHora12, sufijoAmPm } from '@/lib/utils/format-hora'
import { CalendarPlus, Check, X, Clock, Trash2, CalendarDays, AlertTriangle, ShieldCheck, Link2, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MarcaLogo } from '@/components/marca-logo'
import { ObjetivoInput } from './objetivo-input'
import {
  createGrabacion,
  updateGrabacionFecha,
  updateGrabacionEstado,
  deleteGrabacion,
  toggleCoordinacionConfirmada,
  updateGrabacionEnlaceGuiones,
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

  /* Optimistic toggle del check 'coordinación confirmada con cliente' */
  const [confirmada, setConfirmada] = useState<boolean>(kpi.coordinacionConfirmada)
  function toggleConfirmada() {
    const next = !confirmada
    setConfirmada(next)
    startTransition(async () => {
      const r = await toggleCoordinacionConfirmada(kpi.marca_slug, next)
      if (!r.ok) {
        setConfirmada(!next)
        toast.error(r.error)
      } else {
        toast.success(next ? 'Coordinación marcada como confirmada' : 'Coordinación pendiente')
      }
    })
  }

  /* Pedro: si las grabaciones planeadas/cumplidas NO alcanzan el objetivo
     y la coordinación NO está confirmada → alerta arriba del card. */
  const faltanGrabaciones = kpi.objetivo > 0 && (kpi.planeadas + kpi.cumplidas) < kpi.objetivo
  const mostrarAlerta = faltanGrabaciones && !confirmada

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
        {/* Alerta: falta coordinación con cliente para alcanzar el objetivo */}
        {mostrarAlerta && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-[11.5px] leading-snug">
              <strong className="block">Falta coordinación con el cliente</strong>
              <span className="text-amber-700">
                Faltan {kpi.objetivo - (kpi.planeadas + kpi.cumplidas)} grabaciones para llegar al objetivo del mes.
                Confirma fechas con la marca antes de cerrar el calendario.
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MarcaLogo slug={kpi.marca_slug} nombre={kpi.marca_nombre} emoji={kpi.marca_emoji} size={32} />
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

          {/* Botón añadir fecha (Pedro pidió cambiar el label
              de 'Agregar fecha de grabación' a simplemente 'Añadir'). */}
          <button
            type="button"
            onClick={handleAgregar}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-1.5 h-8 mt-1 rounded-md border border-dashed border-[#ba41f7]/40 text-[#ba41f7] text-xs font-medium hover:bg-[#ba41f7]/8 disabled:opacity-50 transition-colors"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Añadir
          </button>
        </div>

        {/* Check 'Coordinación confirmada' — Pedro lo pidió debajo del
            card. Cuando está marcado, las fechas planeadas son creíbles
            (validadas con el cliente) y la alerta de coordinación
            desaparece. */}
        <label
          className="flex items-start gap-2 pt-2 border-t border-border/60 cursor-pointer select-none"
          title="Marcar cuando las fechas estén coordinadas y confirmadas con el cliente"
        >
          <input
            type="checkbox"
            checked={confirmada}
            onChange={toggleConfirmada}
            disabled={isPending}
            className="mt-0.5 w-4 h-4 rounded border-input accent-emerald-500 cursor-pointer disabled:opacity-50"
          />
          <div className="text-[11.5px] leading-snug">
            <span className={`font-semibold ${confirmada ? 'text-emerald-700' : 'text-foreground'}`}>
              {confirmada ? (
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Coordinación confirmada
                </span>
              ) : (
                'Marcar como confirmada y creíble'
              )}
            </span>
            <span className="block text-muted-foreground text-[10.5px]">
              {confirmada
                ? 'Las fechas planeadas están validadas con el cliente.'
                : 'Las fechas planeadas todavía no se confirmaron con el cliente.'}
            </span>
          </div>
        </label>
      </CardContent>
    </Card>
  )
}

/* Fila de una fecha individual: fecha + hora opcional editables + chip
   estado + acciones. La hora se guarda en hora_planeada (time) y es
   opcional — si Pedro deja vacío el input, la grabación queda como
   "día sin hora específica". */
function FechaRow({ grabacion, disabled }: { grabacion: GrabacionWithMarca; disabled: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [fecha, setFecha] = useState(grabacion.fecha_planeada)
  /* hora_planeada viene de BD como "HH:MM:SS"; el input type=time
     funciona con HH:MM (acepta también HH:MM:SS pero recorta segs). */
  const [hora, setHora] = useState((grabacion.hora_planeada ?? '').slice(0, 5))
  /* Pedro: enlace de guiones (suele ser un Drive). Editable inline. */
  const [enlace, setEnlace] = useState(grabacion.enlace_guiones ?? '')
  const cfg = ESTADO_CFG[grabacion.estado] ?? ESTADO_CFG.planeada
  const busy = disabled || isPending

  const fechaInicial = grabacion.fecha_planeada
  const horaInicial = (grabacion.hora_planeada ?? '').slice(0, 5)
  const enlaceInicial = grabacion.enlace_guiones ?? ''

  function saveEnlace() {
    if (enlace === enlaceInicial) return
    startTransition(async () => {
      const r = await updateGrabacionEnlaceGuiones(grabacion.id, enlace)
      if (r.ok) toast.success(enlace ? 'Enlace de guiones guardado' : 'Enlace eliminado')
      else {
        setEnlace(enlaceInicial)
        toast.error(r.error)
      }
    })
  }

  function saveFecha() {
    if (fecha === fechaInicial && hora === horaInicial) return
    startTransition(async () => {
      /* Mando hora aunque no haya cambiado, para que el server action
         persista ambos campos en el mismo update. Empty string → null. */
      const r = await updateGrabacionFecha(grabacion.id, fecha, hora || null)
      if (r.ok) toast.success(hora ? 'Fecha y hora actualizadas' : 'Fecha actualizada')
      else {
        setFecha(fechaInicial)
        setHora(horaInicial)
        toast.error(r.error)
      }
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
    <div className="space-y-1 group">
      <div className="flex items-center gap-1.5">
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
      {/* Hora opcional. Empty value = sin hora. Pedro pidió AM/PM —
          mostramos sufijo al lado del input nativo (que en macOS muestra
          24h). */}
      <input
        type="time"
        value={hora}
        onChange={(e) => setHora(e.target.value)}
        onBlur={saveFecha}
        disabled={busy}
        title={hora ? `Hora: ${hora}` : 'Hora opcional — deja vacío para solo día'}
        className="h-7 px-1.5 rounded border border-input bg-background text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40 disabled:opacity-50 w-[70px] shrink-0"
      />
      {hora && (
        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums shrink-0" title={`${hora} = ${formatHora12(hora)}`}>
          {sufijoAmPm(hora)}
        </span>
      )}
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
      {/* Segunda línea: enlace de guiones (Drive). Pedro pidió este
          espacio para pegar el link de los guiones que se van a grabar.
          Indentado para alinear visualmente con el contenido de arriba. */}
      <div className="flex items-center gap-1.5 pl-5">
        <Link2 className="w-3 h-3 text-muted-foreground/70 shrink-0" />
        <input
          type="url"
          value={enlace}
          onChange={(e) => setEnlace(e.target.value)}
          onBlur={saveEnlace}
          disabled={busy}
          placeholder="Enlace de guiones (Google Drive, Notion…)"
          title={enlace ? `Enlace: ${enlace}` : 'Pegar enlace de guiones'}
          className="h-6 px-2 rounded border border-input bg-background text-[10.5px] focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40 disabled:opacity-50 flex-1 min-w-0 placeholder:text-muted-foreground/60"
        />
        {enlace && (
          <a
            href={enlace.startsWith('http') ? enlace : `https://${enlace}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir en nueva pestaña"
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-[#ba41f7] hover:bg-[#ba41f7]/8 shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}
