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
import { formatHora12 } from '@/lib/utils/format-hora'
import { CalendarPlus, Check, X, Clock, Trash2, CalendarDays, Link2, Pencil, FileText, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MarcaLogo } from '@/components/marca-logo'
import { DateField, TimeField } from '@/components/datetime-fields'
import { ObjetivoInput } from './objetivo-input'
import {
  createGrabacion,
  updateGrabacionFecha,
  updateGrabacionEstado,
  deleteGrabacion,
  updateGrabacionEnlaceGuiones,
  updateGrabacionGuionListo,
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

/* Pill de fecha (día / número / mes) para la vista limpia del FechaRow. */
const DIAS_PILL = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MESES_PILL = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function pillDeFecha(iso: string): { dia: string; numero: number; mes: string } {
  const [y, m, d] = (iso || '').split('-').map(Number)
  if (!y || !m || !d) return { dia: '—', numero: 0, mes: '' }
  const dt = new Date(y, m - 1, d)
  return { dia: DIAS_PILL[dt.getDay()], numero: d, mes: MESES_PILL[m - 1] }
}
/* "1h" / "1h 30m" / "45m" desde minutos. */
function duracionLabel(min: number): string {
  if (min <= 0) return ''
  return min >= 60
    ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}`
    : `${min}m`
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
  /* Patrón vista/editar: por defecto se ve limpio (pill fecha + hora
     legible + estado). Al tocar el lápiz se abre el panel de edición
     con los inputs. Pedro: "los veo confusos, no los entiendo bien". */
  const [editing, setEditing] = useState(false)
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
  /* Pedro: check por grabación "guion listo" vs "aún falta el guion". */
  const [guionListo, setGuionListo] = useState<boolean>(grabacion.guion_listo)
  const cfg = ESTADO_CFG[grabacion.estado] ?? ESTADO_CFG.planeada
  const busy = disabled || isPending

  function toggleGuion() {
    const next = !guionListo
    setGuionListo(next) // optimista
    startTransition(async () => {
      const r = await updateGrabacionGuionListo(grabacion.id, next)
      if (r.ok) toast.success(next ? 'Guion marcado como listo' : 'Guion marcado como pendiente')
      else {
        setGuionListo(!next)
        toast.error(r.error)
      }
    })
  }

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

  /* Guarda con valores EXPLÍCITOS (los pickers custom disparan onChange al
     elegir, no hay onBlur; y setState es async, así que pasamos los valores
     nuevos directos en vez de leer el state). */
  function saveFechaVals(f: string, h: string, hf: string) {
    if (f === fechaInicial && h === horaInicial && hf === horaFinInicial) return
    startTransition(async () => {
      /* Si hay hora-inicio y hora-fin, calcula duración para que el
         evento de GCal salga con el bloque correcto. Si no hay hora,
         null (evento all-day). */
      const dur = (h && hf) ? Math.max(5, diffMin(h, hf)) : null
      const r = await updateGrabacionFecha(grabacion.id, f, h || null, dur)
      if (r.ok) {
        if (r.gcalSynced) {
          toast.success(h ? `${formatHora12(h)}${hf ? ' – ' + formatHora12(hf) : ''} guardado` : 'Fecha actualizada')
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

  const pill = pillDeFecha(fecha)
  const durMin = (hora && horaFin) ? diffMin(hora, horaFin) : 0
  const horaUrl = enlace ? (enlace.startsWith('http') ? enlace : `https://${enlace}`) : null

  /* ============== VISTA LIMPIA (default) ============== */
  if (!editing) {
    return (
      <div className="group flex items-stretch rounded-2xl bg-white/70 ring-1 ring-black/[0.06] hover:ring-black/[0.12] hover:shadow-sm transition-all overflow-hidden">
        {/* Pill de fecha — ancla visual, tintado por estado */}
        <div
          className="flex flex-col items-center justify-center w-14 shrink-0 py-2"
          style={{ background: `${cfg.color}16` }}
          title={`${pill.dia} ${pill.numero} ${pill.mes}`}
        >
          <span className="text-[9px] font-bold uppercase tracking-wide leading-none" style={{ color: cfg.color }}>{pill.dia}</span>
          <span className="text-[19px] font-extrabold leading-none mt-0.5" style={{ color: cfg.color }}>{pill.numero || '—'}</span>
          <span className="text-[8px] uppercase leading-none mt-0.5" style={{ color: cfg.color }}>{pill.mes}</span>
        </div>

        {/* Centro: hora legible + estado + guiones */}
        <div className="flex-1 min-w-0 py-2 px-3 flex flex-col justify-center gap-1.5">
          <div className="text-[13px] font-semibold text-foreground leading-tight">
            {hora ? (
              <>
                {formatHora12(hora)}
                {horaFin && <span className="text-muted-foreground font-medium"> – {formatHora12(horaFin)}</span>}
                {durMin > 0 && <span className="text-muted-foreground font-normal text-[11px]"> · {duracionLabel(durMin)}</span>}
              </>
            ) : (
              <span className="text-muted-foreground font-medium">Sin hora definida</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Estado clickeable — cicla planeada→cumplida→cancelada */}
            <button
              type="button"
              onClick={() => {
                const next = grabacion.estado === 'planeada' ? 'cumplida'
                  : grabacion.estado === 'cumplida' ? 'cancelada' : 'planeada'
                cambiarEstado(next)
              }}
              disabled={busy}
              title={`${cfg.label} — click para cambiar`}
              className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-semibold shrink-0 disabled:opacity-50"
              style={{ color: cfg.color, background: cfg.bg }}
            >
              <cfg.Icon className="w-3 h-3" />
              {cfg.label}
            </button>
            {/* Guion listo / falta — toggle clickeable. Verde = listo,
                ámbar (alerta) = aún falta. Pedro lo pidió por grabación. */}
            <button
              type="button"
              onClick={toggleGuion}
              disabled={busy}
              title={guionListo ? 'Guion listo — click para marcar pendiente' : 'Aún falta el guion — click para marcar listo'}
              className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-semibold shrink-0 disabled:opacity-50 ${
                guionListo
                  ? 'text-emerald-700 bg-emerald-100'
                  : 'text-amber-700 bg-amber-100'
              }`}
            >
              {guionListo ? <FileText className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {guionListo ? 'Guion listo' : 'Falta guion'}
            </button>
            {horaUrl && (
              <a
                href={horaUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir guiones"
                className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-medium text-[#ba41f7] bg-[#ba41f7]/10 hover:bg-[#ba41f7]/18 shrink-0"
              >
                <Link2 className="w-3 h-3" /> Ver
              </a>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-0.5 pr-2 shrink-0">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={busy}
            title="Editar fecha y hora"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-[#ba41f7] hover:bg-[#ba41f7]/10 transition-colors disabled:opacity-50"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={borrar}
            disabled={busy}
            title="Eliminar"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  /* ============== PANEL DE EDICIÓN ============== */
  return (
    <div className="rounded-2xl ring-1 ring-[#ba41f7]/30 bg-[#ba41f7]/[0.04] p-3 space-y-2.5">
      {/* Fecha */}
      <div>
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1 mb-1">
          <CalendarDays className="w-3 h-3" /> Fecha
        </label>
        <DateField
          value={fecha}
          onChange={(v) => { setFecha(v); saveFechaVals(v, hora, horaFin) }}
          disabled={busy}
        />
      </div>

      {/* Hora inicio + fin */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" /> Inicio
          </label>
          <TimeField
            value={hora}
            onChange={(v) => {
              let nf = horaFin
              if (v && !horaFin) nf = horaPlus(v, 60)
              else if (v && horaFin && v >= horaFin) nf = horaPlus(v, Math.max(15, diffMin(hora || '00:00', horaFin) || 60))
              setHora(v); setHoraFin(nf); saveFechaVals(fecha, v, nf)
            }}
            disabled={busy}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1 mb-1">
            Fin {durMin > 0 && <span className="text-[#ba41f7] normal-case font-bold">· {duracionLabel(durMin)}</span>}
          </label>
          <TimeField
            value={horaFin}
            onChange={(v) => { setHoraFin(v); saveFechaVals(fecha, hora, v) }}
            disabled={busy || !hora}
          />
        </div>
      </div>

      {/* Enlace de guiones */}
      <div>
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1 mb-1">
          <Link2 className="w-3 h-3" /> Enlace de guiones <span className="normal-case font-normal opacity-60">(opcional)</span>
        </label>
        <input
          type="url"
          value={enlace}
          onChange={(e) => setEnlace(e.target.value)}
          onBlur={saveEnlace}
          disabled={busy}
          placeholder="Google Drive, Notion…"
          className="h-9 w-full px-2.5 rounded-lg border border-input bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40 disabled:opacity-50 placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-0.5">
        <button
          type="button"
          onClick={borrar}
          disabled={busy}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" /> Eliminar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-[#ba41f7] text-white text-[12px] font-semibold hover:bg-[#a936e0] disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" /> Listo
        </button>
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
      {/* Fecha (picker moderno) */}
      <DateField value={fecha} onChange={setFecha} disabled={busy} />
      {/* Inicio + Fin */}
      <div className="grid grid-cols-2 gap-2 items-start">
        <div>
          <label className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" /> Inicio
          </label>
          <TimeField
            value={hora}
            onChange={(v) => {
              let nf = horaFin
              if (v && (!horaFin || v >= horaFin)) nf = horaPlus(v, Math.max(15, diffMin(hora || '00:00', horaFin) || 60))
              setHora(v); setHoraFin(nf)
            }}
            disabled={busy}
          />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1 mb-1">
            Fin
            {hora && horaFin && (
              <span className="text-[#ba41f7] normal-case font-bold">
                · {diffMin(hora, horaFin) >= 60
                  ? `${Math.floor(diffMin(hora, horaFin) / 60)}h${diffMin(hora, horaFin) % 60 ? ` ${diffMin(hora, horaFin) % 60}m` : ''}`
                  : `${diffMin(hora, horaFin)}m`}
              </span>
            )}
          </label>
          <TimeField value={horaFin} onChange={setHoraFin} disabled={busy || !hora} />
        </div>
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
