'use client'

/* Detalle de un evento del Calendario, estilo Google Calendar: al tocar un
   evento se abre esta ventana para ver y CAMBIAR título, fecha, hora y
   duración, eliminarlo, abrir el Meet, o marcar la grabación como cumplida.
   Pedro 24-sep-2026: "debo poder entrar al detalle de la reunión y cambiar
   tal cual se hace en Google Calendar".

   Cada tipo guarda donde corresponde (y se refleja en Google Calendar):
   - Reunión de la app → editarReunionCal / eliminarReunionCal
   - Grabación de la app → updateGrabacionFecha / updateGrabacionEstado
   - Evento solo de Google (incl. grabaciones/reuniones agendadas allá) →
     editarEventoGoogle / eliminarEventoGoogle
   - Publicación / fecha importante → solo lectura + enlace a su pantalla.
   Editar requiere permiso de calendario; el resto ve el detalle. */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarDays, CheckCircle2, Copy, ExternalLink, Trash2, Video, X } from 'lucide-react'
import type { AgendaEvento } from './agenda-calendar'
import { editarDetalleAgenda, eliminarEventoGoogle, eliminarReunionCal } from '../_actions'
import { updateGrabacionEstado } from '../../_actions'

import { horaFinalInput, minutosHasta, validarEdicionAgenda, type EdicionAgenda, type TipoAgendaEditable } from '@/lib/calendario/editar-validacion'

const ACENTO = '#7170ff'
const TITULO_TIPO: Record<AgendaEvento['tipo'], string> = {
  grabacion: 'Grabación', reunion: 'Reunión', publicacion: 'Publicación',
  fecha: 'Fecha importante', diseno: 'Diseño', gcal: 'Google Calendar',
}
function horaFin(hora: string, min: number): string {
  const [h, m] = hora.split(':').map(Number)
  const t = (h * 60 + m + min) % 1440
  const hh = Math.floor(t / 60)
  const mm = String(t % 60).padStart(2, '0')
  return `${hh % 12 || 12}:${mm} ${hh < 12 ? 'am' : 'pm'}`
}
function fechaLarga(ymd: string): string {
  return new Date(ymd + 'T12:00:00-05:00').toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long' })
}

export function EventoModal({ e, esDirector, onCerrar }: { e: AgendaEvento; esDirector: boolean; onCerrar: () => void }) {
  const router = useRouter()
  const esGoogle = e.tipo === 'gcal' || !!e.origenGoogle
  const esGrabacionApp = e.tipo === 'grabacion' && !esGoogle
  const esReunionApp = e.tipo === 'reunion' && !esGoogle
  const editable = esDirector && (esGoogle || esGrabacionApp || esReunionApp)
  /* Todos los eventos conservan su título al editarse. */
  const tituloEditable = editable
  /* Inicio y fin editables también para reuniones. */
  const duracionEditable = editable

  const [titulo, setTitulo] = useState(e.titulo)
  const [fecha, setFecha] = useState(e.fecha)
  const [todoElDia, setTodoElDia] = useState(!e.hora)
  const [hora, setHora] = useState(e.hora ?? '10:00')
  const [duracion, setDuracion] = useState<number>(e.duracionMin ?? (e.tipo === 'reunion' ? 45 : 60))
  const [tipo, setTipo] = useState<TipoAgendaEditable>(e.tipo === 'reunion' || e.tipo === 'grabacion' ? e.tipo : 'gcal')
  const [crearMeet, setCrearMeet] = useState(false)
  const input: EdicionAgenda = { origen: esGoogle ? 'gcal' : esReunionApp ? 'reunion' : 'grabacion', tipo, titulo, fecha, hora: todoElDia ? null : hora, duracionMin: duracion, crearMeet: tipo === 'reunion' && crearMeet }
  const errorEdicion = validarEdicionAgenda(input)
  const [guardando, setGuardando] = useState(false)

  const cambio = tipo !== e.tipo || crearMeet || titulo.trim() !== e.titulo || fecha !== e.fecha || (todoElDia ? null : hora) !== e.hora
    || (duracionEditable && !todoElDia && duracion !== (e.duracionMin ?? (e.tipo === 'reunion' ? 45 : 60)))

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCerrar])

  function listo(msg: string) {
    toast.success(msg)
    onCerrar()
    router.refresh()
  }

  async function guardar() {
    if (!cambio || guardando || errorEdicion) return
    setGuardando(true)
    try {
      const r = await editarDetalleAgenda(e.id, input)
      if (!r.ok) { toast.error(r.error); return }
      if (r.meetPendiente) toast.info('Google está generando el Meet. Vuelve a abrir el evento en unos segundos.')
      listo('Evento actualizado')
    } catch {
      toast.error('No se pudo confirmar el guardado. Actualiza el calendario antes de reintentar.')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    const que = esGrabacionApp ? 'cancelar esta grabación' : `eliminar "${e.titulo}"`
    if (!window.confirm(`¿Seguro que quieres ${que}? También se quita de Google Calendar.`)) return
    setGuardando(true)
    try {
      if (esGoogle) {
        const r = await eliminarEventoGoogle(e.id)
        if (!r.ok) { toast.error(r.error); return }
        listo('Evento eliminado de Google Calendar')
      } else if (esReunionApp) {
        const r = await eliminarReunionCal(e.id)
        if (!r.ok) { toast.error(r.error); return }
        if (r.gcalError) toast.warning(`Eliminada en la app, pero Google Calendar falló (${r.gcalError}).`, { duration: 8000 })
        listo('Reunión eliminada')
      } else if (esGrabacionApp) {
        const r = await updateGrabacionEstado({ id: e.id, estado: 'cancelada' })
        if (!r.ok) { toast.error(r.error); return }
        listo('Grabación cancelada')
      }
    } finally {
      setGuardando(false)
    }
  }

  async function marcarCumplida() {
    setGuardando(true)
    try {
      const r = await updateGrabacionEstado({ id: e.id, estado: 'cumplida' })
      if (!r.ok) { toast.error(r.error); return }
      listo('✅ Grabación marcada como cumplida')
    } finally {
      setGuardando(false)
    }
  }

  const campo = 'h-9 px-2.5 rounded-lg border border-border bg-card text-[13px] outline-none focus:border-[#7170ff]'

  const contenido = (
    <div
      onClick={onCerrar}
      style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        role="dialog"
        aria-label={`Detalle: ${e.titulo}`}
        onClick={(ev) => ev.stopPropagation()}
        style={{
          width: 'min(540px, 100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
          background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
        }}
      >
        {/* Cabecera con el color de la marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #f1f1f3' }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: e.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500 }}>
              {TITULO_TIPO[editable ? tipo : e.tipo]}{e.marcaNombre ? ` · ${e.marcaEmoji ?? ''} ${e.marcaNombre}` : ''}{esGoogle && e.tipo !== 'gcal' ? ' · desde Google Calendar' : ''}
            </div>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', lineHeight: 0, padding: 2 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Título */}
          {editable && tituloEditable ? (
            <input
              value={titulo}
              onChange={(ev) => setTitulo(ev.target.value)}
              placeholder="Título"
              aria-label="Título"
              style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', border: 'none', borderBottom: '2px solid #eef0f3', outline: 'none', padding: '4px 0', width: '100%' }}
              onFocus={(ev) => { ev.currentTarget.style.borderBottomColor = ACENTO }}
              onBlur={(ev) => { ev.currentTarget.style.borderBottomColor = '#eef0f3' }}
            />
          ) : (
            <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>{e.titulo}</div>
          )}

          {editable && (
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              Tipo de evento
              <select aria-label="Tipo de evento" className={campo} value={tipo} disabled={guardando}
                onChange={ev => { const t = ev.target.value as TipoAgendaEditable; setTipo(t); setCrearMeet(false); if (t === 'reunion') setTodoElDia(false) }}>
                <option value="reunion">Reunión</option>
                <option value="grabacion">Grabación</option>
                {esGoogle && <option value="gcal">Otro evento</option>}
              </select>
            </label>
          )}

          {/* Fecha y hora */}
          {editable ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <CalendarDays size={16} color="#64748b" />
                <input type="date" value={fecha} onChange={(ev) => setFecha(ev.target.value)} className={campo} aria-label="Fecha" />

              </div>
              {!todoElDia && duracionEditable && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs text-slate-600">Inicio
                    <input type="time" value={hora} onChange={ev => setHora(ev.target.value)} className={campo} aria-label="Hora de inicio" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate-600">Fin
                    <input type="time" value={horaFinalInput(hora, duracion)} onChange={ev => { if (ev.target.value) setDuracion(minutosHasta(hora, ev.target.value)) }} className={campo} aria-label="Hora de fin" />
                  </label>
                  <span className="col-span-2 text-xs text-slate-500">{Math.floor(duracion / 60) ? `${Math.floor(duracion / 60)} h ` : ''}{duracion % 60 ? `${duracion % 60} min` : ''}{horaFinalInput(hora, duracion) <= hora ? ' · termina al día siguiente' : ''} · hora de Lima</span>
                </div>
              )}
              {tipo !== 'reunion' && (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#475569', cursor: 'pointer', width: 'fit-content' }}>
                  <input type="checkbox" checked={todoElDia} onChange={(ev) => setTodoElDia(ev.target.checked)} />
                  Todo el día
                </label>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#334155' }}>
              <CalendarDays size={16} color="#64748b" />
              <span style={{ textTransform: 'capitalize' }}>{fechaLarga(e.fecha)}</span>
              {e.hora && <span>· {horaFin(e.hora, 0)}{e.duracionMin ? ` – ${horaFin(e.hora, e.duracionMin)}` : ''}</span>}
            </div>
          )}

          {e.estado && (
            <div style={{ fontSize: 12.5, color: '#475569' }}>
              Estado: <span style={{ padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', textTransform: 'capitalize' }}>{e.estado}</span>
              {e.videosGrabados != null && <span> · {e.videosGrabados} videos</span>}
            </div>
          )}
          {e.notas && <p style={{ fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap', margin: 0 }}>{e.notas}</p>}

          {(tipo === 'reunion' || e.meetLink) && (
            <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-600">Enlace de reunión</div>
              {e.meetLink ? <>
                <input aria-label="Enlace de reunión" value={e.meetLink} readOnly className="w-full text-sm bg-transparent text-slate-700 outline-none" onFocus={ev => ev.target.select()} />
                <div className="flex gap-2">
                  <a href={e.meetLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white"><Video size={15} /> Unirse a Meet</a>
                  <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(e.meetLink!); toast.success('Enlace copiado') } catch { toast.error('Selecciona el enlace y cópialo manualmente.') } }} className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm"><Copy size={15} /> Copiar</button>
                </div>
              </> : editable ? <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={crearMeet} onChange={ev => setCrearMeet(ev.target.checked)} /> Generar enlace de Google Meet al guardar
              </label> : <p className="text-sm text-slate-500">Sin enlace de reunión.</p>}
            </section>
          )}
          {editable && errorEdicion && <p role="alert" className="text-xs text-red-600">{errorEdicion}</p>}

          {/* Accesos */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {e.href && (
              <Link href={e.href} onClick={onCerrar}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12.5, fontWeight: 500, color: '#0f172a', textDecoration: 'none' }}>
                <ExternalLink size={14} /> {e.tipo === 'publicacion' ? 'Abrir publicación' : e.tipo === 'fecha' ? 'Gestionar fechas' : 'Abrir'}
              </Link>
            )}
            {esGrabacionApp && esDirector && e.estado !== 'cumplida' && (
              <button type="button" onClick={marcarCumplida} disabled={guardando}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 10, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                <CheckCircle2 size={15} /> Marcar cumplida
              </button>
            )}
          </div>

          {esDirector && esGoogle && (
            <p style={{ fontSize: 11.5, color: '#94a3b8', margin: 0 }}>
              Este evento vive en Google Calendar: los cambios se guardan allá. Para que cuente como grabación/reunión de la marca, ábrelo desde el día y usa &quot;Vincular&quot;.
            </p>
          )}
        </div>

        {/* Pie: eliminar · cancelar · guardar */}
        {editable && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid #f1f1f3' }}>
            <button type="button" onClick={eliminar} disabled={guardando}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', borderRadius: 10, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>
              <Trash2 size={15} /> {esGrabacionApp ? 'Cancelar grabación' : 'Eliminar'}
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={onCerrar}
              style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
              Cerrar
            </button>
            <button type="button" onClick={guardar} disabled={!cambio || guardando || !!errorEdicion}
              style={{ height: 36, padding: '0 16px', borderRadius: 10, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: cambio && !guardando ? 'pointer' : 'default', background: cambio ? `linear-gradient(135deg, ${ACENTO}, #ba41f7)` : '#cbd5e1' }}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(contenido, document.body) : null
}
