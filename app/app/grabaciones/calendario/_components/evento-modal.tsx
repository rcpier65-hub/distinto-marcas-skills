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
   Editar es solo para directores; el resto ve el detalle. */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarDays, CheckCircle2, Clock, ExternalLink, Trash2, Video, X } from 'lucide-react'
import type { AgendaEvento } from './agenda-calendar'
import { editarEventoGoogle, editarReunionCal, eliminarEventoGoogle, eliminarReunionCal } from '../_actions'
import { updateGrabacionEstado, updateGrabacionFecha } from '../../_actions'

const ACENTO = '#7170ff'
const TITULO_TIPO: Record<AgendaEvento['tipo'], string> = {
  grabacion: 'Grabación', reunion: 'Reunión', publicacion: 'Publicación',
  fecha: 'Fecha importante', diseno: 'Diseño', gcal: 'Google Calendar',
}
const DURACIONES = [15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480]

function etiquetaDuracion(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
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
  /* El título de una grabación de la app lo define su marca (no se edita). */
  const tituloEditable = esGoogle || esReunionApp
  /* Las reuniones de la app conservan la duración que tengan en Google. */
  const duracionEditable = esGoogle || esGrabacionApp

  const [titulo, setTitulo] = useState(e.titulo)
  const [fecha, setFecha] = useState(e.fecha)
  const [todoElDia, setTodoElDia] = useState(!e.hora)
  const [hora, setHora] = useState(e.hora ?? '10:00')
  const [duracion, setDuracion] = useState<number>(e.duracionMin ?? (e.tipo === 'reunion' ? 45 : 60))
  const [guardando, setGuardando] = useState(false)

  const cambio = titulo.trim() !== e.titulo || fecha !== e.fecha || (todoElDia ? null : hora) !== e.hora
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
    if (!cambio || guardando) return
    setGuardando(true)
    try {
      if (esGoogle) {
        const r = await editarEventoGoogle(e.id, { titulo, fecha, hora: todoElDia ? null : hora, duracionMin: duracion })
        if (!r.ok) { toast.error(r.error); return }
        listo('✅ Evento actualizado en Google Calendar')
      } else if (esReunionApp) {
        const r = await editarReunionCal(e.id, { fecha, hora: todoElDia ? '09:00' : hora, ...(titulo.trim() !== e.titulo ? { titulo } : {}) })
        if (!r.ok) { toast.error(r.error); return }
        if (r.gcalError) toast.warning(`Guardado en la app, pero Google Calendar falló (${r.gcalError}).`, { duration: 8000 })
        listo('✅ Reunión actualizada (también en Google Calendar)')
      } else if (esGrabacionApp) {
        const r = await updateGrabacionFecha(e.id, fecha, todoElDia ? null : hora, todoElDia ? null : duracion)
        if (!r.ok) { toast.error(r.error); return }
        if (r.gcalError) toast.warning(`Guardado en la app, pero Google Calendar falló (${r.gcalError}).`, { duration: 8000 })
        listo('✅ Grabación actualizada (también en Google Calendar)')
      }
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
          width: 'min(460px, 100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
          background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
        }}
      >
        {/* Cabecera con el color de la marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #f1f1f3' }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: e.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500 }}>
              {TITULO_TIPO[e.tipo]}{e.marcaNombre ? ` · ${e.marcaEmoji ?? ''} ${e.marcaNombre}` : ''}{esGoogle && e.tipo !== 'gcal' ? ' · desde Google Calendar' : ''}
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

          {/* Fecha y hora */}
          {editable ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <CalendarDays size={16} color="#64748b" />
                <input type="date" value={fecha} onChange={(ev) => setFecha(ev.target.value)} className={campo} aria-label="Fecha" />
                {!todoElDia && (
                  <input type="time" value={hora} onChange={(ev) => setHora(ev.target.value)} className={campo} aria-label="Hora de inicio" />
                )}
              </div>
              {!todoElDia && duracionEditable && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Clock size={16} color="#64748b" />
                  <select value={duracion} onChange={(ev) => setDuracion(Number(ev.target.value))} className={campo} aria-label="Duración">
                    {[...new Set([...DURACIONES, duracion])].sort((a, b) => a - b).map((m) => (
                      <option key={m} value={m}>{etiquetaDuracion(m)}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: 12.5, color: '#64748b' }}>termina {horaFin(hora, duracion)}</span>
                </div>
              )}
              {(esGoogle || esGrabacionApp) && (
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

          {/* Accesos */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {e.meetLink && (
              <a href={e.meetLink} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 10, color: '#fff', fontSize: 12.5, fontWeight: 600, background: 'linear-gradient(135deg,#10b981,#059669)', textDecoration: 'none' }}>
                <Video size={15} /> Unirse a Meet
              </a>
            )}
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
            <button type="button" onClick={guardar} disabled={!cambio || guardando}
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
