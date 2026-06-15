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

/* Helpers para manipular horas "HH:MM". Compartidos entre el row inline
   y el form de nueva grabación. */
function horaPlus(hora: string, addMin: number): string {
  const [h, m] = hora.split(':').map(Number)
  const total = (h * 60 + m + addMin + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
function diffMin(inicio: string, fin: string): number {
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fin.split(':').map(Number)
  const a = hi * 60 + mi
  const b = hf * 60 + mf
  return b >= a ? b - a : 1440 - a + b
}

const ESTADO_CFG: Record<string, { label: string; color: string; bg: string; Icon: typeof Check }> = {
  planeada:  { label: 'Planeada',  color: '#b45309', bg: '#f59e0b18', Icon: Clock },
  cumplida:  { label: 'Cumplida',  color: '#047857', bg: '#10b98118', Icon: Check },
  cancelada: { label: 'Cancelada', color: '#be123c', bg: '#f43f5e18', Icon: X },
}

export function MarcaGrabacionCard({ kpi, mesDefault }: Props) {
  const [isPending, startTransition] = useTransition()
  /* Pedro: "cuando hago clic en añadir me debe salir un popup para
     llenar los datos de la grabacion". Antes el botón creaba con
     defaults y forzaba a editar después. Ahora abre un mini-form
     inline en el lugar del botón. */
  const [formOpen, setFormOpen] = useState(false)
  const pct = kpi.cumplimiento_pct
  const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : pct > 0 ? 'bg-rose-400' : 'bg-muted'
  /* Color de la marca para el tinte glass de la card (Pedro pidió que
     todas las cards tengan el mismo estilo glass que próximas). */
  const cardColor = kpi.color_primario_hex ?? '#737373'

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

  /* Default rendering del form: HOY si estamos en el mes activo, sino
     día 1 del mes activo. Hora 10:00 → 11:00. */
  function defaultFormFecha(): string {
    const hoyIso = new Date().toISOString().slice(0, 10)
    const mesActual = hoyIso.slice(0, 7)
    return mesActual === mesDefault ? hoyIso : `${mesDefault}-01`
  }

  function handleCrearGrabacion(payload: {
    fecha: string
    hora: string
    horaFin: string
  }) {
    const dur = (payload.hora && payload.horaFin)
      ? Math.max(5, diffMin(payload.hora, payload.horaFin))
      : 60
    startTransition(async () => {
      const r = await createGrabacion({
        marca_slug: kpi.marca_slug,
        fecha_planeada: payload.fecha,
        hora_planeada: payload.hora || undefined,
        duracion_min: dur,
      })
      if (r.ok) {
        toast.success(`Grabación agregada a ${kpi.marca_nombre}`)
        setFormOpen(false)
      } else {
        toast.error(`Error: ${r.error}`)
      }
    })
  }

  return (
    <Card
      className="relative overflow-hidden border-white/60 ring-1 ring-black/[0.04] rounded-3xl shadow-[0_6px_30px_-14px_rgba(0,0,0,0.18)] hover:shadow-[0_14px_44px_-14px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 transition-all duration-300"
      style={{
        background: `linear-gradient(145deg, ${cardColor}14 0%, rgba(255,255,255,0.6) 55%)`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Tira de acento superior con el color de la marca */}
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: cardColor }} aria-hidden />
      <CardContent className="pt-5 pb-4 space-y-3">
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

        {/* Header — más limpio y con aire (Pedro). Sin el slug técnico
            mono, logo más grande, nombre prominente. */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <MarcaLogo slug={kpi.marca_slug} nombre={kpi.marca_nombre} emoji={kpi.marca_emoji} size={38} />
            <div className="min-w-0">
              <p className="font-semibold text-[15px] truncate leading-tight tracking-tight">{kpi.marca_nombre}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {kpi.cumplidas} de {kpi.objetivo || '—'} este mes
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Objetivo</p>
            <ObjetivoInput slug={kpi.marca_slug} initial={kpi.objetivo} />
          </div>
        </div>

        {/* Barra de cumplimiento */}
        <div>
          <div className="h-2 rounded-full bg-black/5 overflow-hidden mb-1.5">
            <div className={`h-full ${barColor} transition-all rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">Cumplimiento del mes</span>
            <span className={`font-bold ${pct >= 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-muted-foreground'}`}>
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

          {/* Botón Añadir → abre mini-popup inline. Cuando está abierto,
              reemplaza el botón por el form en su lugar (no overlay, para
              que Pedro vea el contexto de la lista mientras llena). */}
          {formOpen ? (
            <NuevaFechaInline
              defaultFecha={defaultFormFecha()}
              busy={isPending}
              onCancel={() => setFormOpen(false)}
              onSubmit={handleCrearGrabacion}
            />
          ) : (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-1.5 h-8 mt-1 rounded-md border border-dashed border-[#ba41f7]/40 text-[#ba41f7] text-xs font-medium hover:bg-[#ba41f7]/8 disabled:opacity-50 transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Añadir
            </button>
          )}
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
  /* Hora fin = hora_planeada + duracion_min, calculada al render.
     Pedro: "no me sale para poner hora de finalizacion eso esta
     complicado porque no podre poner a que hora terminara la
     grabacion". El input es independiente del de inicio. Si Pedro
     borra ambas, el evento queda como all-day. */
  const horaInicialVal = (grabacion.hora_planeada ?? '').slice(0, 5)
  const duracionInicial = grabacion.duracion_min ?? 60
  const [horaFin, setHoraFin] = useState(
    horaInicialVal ? horaPlus(horaInicialVal, duracionInicial) : '',
  )
  /* Pedro: enlace de guiones (suele ser un Drive). Editable inline. */
  const [enlace, setEnlace] = useState(grabacion.enlace_guiones ?? '')
  const cfg = ESTADO_CFG[grabacion.estado] ?? ESTADO_CFG.planeada
  const busy = disabled || isPending

  const fechaInicial = grabacion.fecha_planeada
  const horaInicial = horaInicialVal
  const horaFinInicial = horaInicialVal ? horaPlus(horaInicialVal, duracionInicial) : ''
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
    if (fecha === fechaInicial && hora === horaInicial && horaFin === horaFinInicial) return
    startTransition(async () => {
      /* Si hay hora-inicio y hora-fin, calcula duración para que el
         evento de GCal salga con el bloque correcto. Si no hay hora,
         null en ambos (evento all-day). */
      const dur = (hora && horaFin) ? Math.max(5, diffMin(hora, horaFin)) : null
      const r = await updateGrabacionFecha(grabacion.id, fecha, hora || null, dur)
      if (r.ok) {
        if (r.gcalSynced) {
          toast.success(hora ? `${hora}${horaFin ? '–' + horaFin : ''} guardado y sincronizado` : 'Fecha actualizada')
        } else {
          /* La fila local se guardó OK pero el evento de GCal NO se
             actualizó. Pedro debe saber para reabrir GCal y revisar. */
          toast.warning('Guardado en la app, pero NO se sincronizó con Google Calendar', {
            description: r.gcalError ?? 'Revisa que GCal esté conectado en /grabaciones',
            duration: 7000,
          })
        }
      }
      else {
        setFecha(fechaInicial)
        setHora(horaInicial)
        setHoraFin(horaFinInicial)
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

  /* Mejor visual: pill-grouped (fecha + hora-inicio + hora-fin en un mismo
     contenedor con bg unificado), labels micro, focus-ring violeta.
     Estilo equivalente al date/time picker de Linear/GCal pero usando
     los inputs nativos por dentro. */
  return (
    <div className="space-y-1.5 group">
      <div className="flex items-center gap-2 flex-wrap">
      {/* Pill grupo: fecha + horas. Bg unificado, bordes en grupo, hover
          ring violeta. Mas compacto — el ancho de cada control redujo
          para que entre con el chip de estado en cards angostas (Pedro:
          "verifica el card porque la hora de finalizacion se esconde"). */}
      <div
        className="inline-flex items-stretch h-9 rounded-lg bg-white border border-input shadow-sm focus-within:ring-2 focus-within:ring-[#ba41f7]/40 focus-within:border-[#ba41f7]/40 transition-all"
        title="Fecha y horario de la grabación"
      >
        <div className="flex items-center gap-1 px-2 border-r border-input/60">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            onBlur={saveFecha}
            disabled={busy}
            className="h-7 w-[108px] bg-transparent text-[11.5px] font-mono focus:outline-none disabled:opacity-50"
          />
        </div>
        <div className="flex items-center gap-1 px-1.5 border-r border-input/60">
          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="time"
            value={hora}
            onChange={(e) => {
              const nuevaHora = e.target.value
              setHora(nuevaHora)
              if (nuevaHora && !horaFin) setHoraFin(horaPlus(nuevaHora, 60))
              else if (nuevaHora && horaFin && nuevaHora >= horaFin) {
                setHoraFin(horaPlus(nuevaHora, Math.max(15, diffMin(hora || '00:00', horaFin) || 60)))
              }
            }}
            onBlur={saveFecha}
            disabled={busy}
            step={300}
            placeholder="--:--"
            title={hora ? `Inicio: ${hora}` : 'Hora inicio — deja vacío para día completo'}
            className="h-7 w-[55px] bg-transparent text-[11.5px] font-mono focus:outline-none disabled:opacity-50"
          />
        </div>
        <div className="flex items-center gap-1 px-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground shrink-0">→</span>
          <input
            type="time"
            value={horaFin}
            onChange={(e) => setHoraFin(e.target.value)}
            onBlur={saveFecha}
            disabled={busy || !hora}
            step={300}
            placeholder="--:--"
            title={!hora ? 'Pon hora de inicio primero' : (horaFin ? `Fin: ${horaFin}` : 'Hora fin')}
            className="h-7 w-[55px] bg-transparent text-[11.5px] font-mono focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
          />
        </div>
      </div>
      {/* Duración como chip al lado de la pill — antes estaba dentro y
          se cortaba cuando la pantalla era angosta. */}
      {hora && horaFin && (
        <span
          className="text-[10px] font-semibold text-muted-foreground tabular-nums shrink-0 px-1.5 py-0.5 rounded bg-muted/40"
          title={`Duración: ${diffMin(hora, horaFin)} min`}
        >
          {diffMin(hora, horaFin) >= 60
            ? `${Math.floor(diffMin(hora, horaFin) / 60)}h${diffMin(hora, horaFin) % 60 ? ` ${diffMin(hora, horaFin) % 60}m` : ''}`
            : `${diffMin(hora, horaFin)}m`}
        </span>
      )}
      {/* AM/PM badge afuera de la pill — solo si hay hora */}
      {hora && (
        <span
          className="text-[10px] font-bold text-muted-foreground tabular-nums shrink-0 px-1.5 py-0.5 rounded bg-muted/40"
          title={`${hora} = ${formatHora12(hora)}`}
        >
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
        className="inline-flex items-center gap-1 h-9 px-2.5 rounded-lg text-[11px] font-semibold shrink-0 shadow-sm disabled:opacity-50"
        style={{ color: cfg.color, background: cfg.bg }}
      >
        <cfg.Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </button>
      {/* Borrar — visible en hover */}
      <button
        type="button"
        onClick={borrar}
        disabled={busy}
        title="Eliminar fecha"
        className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 disabled:opacity-50"
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

/* Mini-popup inline para "+ Añadir". Reemplaza el botón cuando está
   abierto; tiene fecha + hora-inicio + hora-fin compactos (mismo estilo
   visual que el pill del FechaRow para consistencia) + ✓ Crear / ✕ Cancelar.
   Pedro: "cuando hago clic en añadir me debe salir un popup para llenar
   los datos de la grabacion es decir solo fecha y hora". */
function NuevaFechaInline({
  defaultFecha,
  busy,
  onCancel,
  onSubmit,
}: {
  defaultFecha: string
  busy: boolean
  onCancel: () => void
  onSubmit: (payload: { fecha: string; hora: string; horaFin: string }) => void
}) {
  const [fecha, setFecha] = useState(defaultFecha)
  const [hora, setHora] = useState('10:00')
  const [horaFin, setHoraFin] = useState('11:00')

  function submit() {
    if (!fecha || !hora || !horaFin) return
    onSubmit({ fecha, hora, horaFin })
  }

  return (
    <div className="mt-1 p-2.5 rounded-lg border-2 border-dashed border-[#ba41f7]/40 bg-[#ba41f7]/5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mismo pill compacto que FechaRow */}
        <div
          className="inline-flex items-stretch h-9 rounded-lg bg-white border border-input shadow-sm focus-within:ring-2 focus-within:ring-[#ba41f7]/40 focus-within:border-[#ba41f7]/40 transition-all"
        >
          <div className="flex items-center gap-1 px-2 border-r border-input/60">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={busy}
              autoFocus
              className="h-7 w-[108px] bg-transparent text-[11.5px] font-mono focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-1 px-1.5 border-r border-input/60">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="time"
              value={hora}
              onChange={(e) => {
                const v = e.target.value
                setHora(v)
                if (v && (!horaFin || v >= horaFin)) {
                  setHoraFin(horaPlus(v, Math.max(15, diffMin(hora || '00:00', horaFin) || 60)))
                }
              }}
              disabled={busy}
              step={300}
              className="h-7 w-[55px] bg-transparent text-[11.5px] font-mono focus:outline-none disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-1 px-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground shrink-0">→</span>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              disabled={busy}
              step={300}
              className="h-7 w-[55px] bg-transparent text-[11.5px] font-mono focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>
        {/* Chip duración */}
        {hora && horaFin && (
          <span className="text-[10px] font-semibold text-muted-foreground tabular-nums shrink-0 px-1.5 py-0.5 rounded bg-white/70">
            {diffMin(hora, horaFin) >= 60
              ? `${Math.floor(diffMin(hora, horaFin) / 60)}h${diffMin(hora, horaFin) % 60 ? ` ${diffMin(hora, horaFin) % 60}m` : ''}`
              : `${diffMin(hora, horaFin)}m`}
          </span>
        )}
      </div>
      {/* Acciones */}
      <div className="flex items-center gap-1.5 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-8 px-3 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-muted/60 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !fecha || !hora || !horaFin}
          className="h-8 px-3 rounded-md bg-[#ba41f7] text-white text-[12px] font-semibold hover:bg-[#a936e0] disabled:opacity-50 inline-flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          {busy ? 'Creando…' : 'Crear'}
        </button>
      </div>
    </div>
  )
}
