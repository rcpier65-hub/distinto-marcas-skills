// app/app/grabaciones/calendario/_components/agenda-calendar.tsx
//
// Agenda unificada de Grabaciones + Reuniones + eventos de Google Calendar,
// con TRES vistas tipo Google Calendar: Día · Semana (default) · Mes.
// Pedro 31-ago-2026: "necesito una vista semanal y una vista diaria; al
// abrir siempre debe mostrar la semanal".
//
// - Chips de filtro por TIPO (🎥 grabación / 🤝 reunión / G eventos GCal)
//   y por MARCA. Todo client-side: los eventos del rango ya vienen cargados.
// - Mes: click en un día → panel de detalle debajo. Semana: columnas por día
//   con los eventos completos. Día: detalle directo.
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { VistaAgenda } from './rango-nav'
import { vincularEventoGcal, editarReunionCal, eliminarReunionCal, editarEventoGoogle, moverPublicacion, moverFechaImportante } from '../_actions'
import { updateGrabacionFecha } from '../../_actions'
import { GrillaHoras, sePuedeMover, type Movimiento } from './grilla-horas'
import { EventoModal } from './evento-modal'
import { CalendarDays, Megaphone, Palette, Star, Users, Video, type LucideIcon } from 'lucide-react'
import { guardarFiltrosCalendario, type FiltrosCalendario } from './filtros'

export type AgendaEvento = {
  id: string
  tipo: 'grabacion' | 'reunion' | 'publicacion' | 'fecha' | 'gcal' | 'diseno'
  fecha: string            // YYYY-MM-DD (Lima)
  hora: string | null      // HH:MM (24h, Lima); null = día completo
  titulo: string
  marcaSlug: string | null
  marcaNombre: string | null
  marcaEmoji: string | null
  color: string            // color de la marca (o neutro para GCal)
  estado: string | null    // planeada/cumplida/cancelada · agendada/realizada/cancelada
  meetLink: string | null
  notas: string | null
  videosGrabados: number | null
  href?: string | null     // link interno (ej. tarea de diseño)
  duracionMin?: number | null  // eventos GCal: duración real (para vincular)
  /* Evento que vive solo en Google (agendado allá) aunque se muestre como
     grabación/reunión: se ofrece Vincular, no las acciones de la app. */
  origenGoogle?: boolean
}

type MarcaLite = { slug: string; nombre: string; emoji: string | null; color: string }
type MarcaOpcion = { id: string; slug: string; nombre: string; emoji: string | null }

type Props = {
  vista: VistaAgenda
  desde: string            // primer día del rango (en semana: lunes)
  eventos: AgendaEvento[]
  marcas: MarcaLite[]      // marcas presentes en el rango (para filtro + leyenda)
  hoy: string              // YYYY-MM-DD en Lima (calculado server-side)
  esDirector: boolean      // habilita vincular/editar/eliminar
  marcasTodas: MarcaOpcion[]  // todas las marcas (para el selector de vincular)
  filtrosIniciales: FiltrosCalendario  // chips + marca guardados (cookie)
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const CANCELADO = new Set(['cancelada', 'cancelado'])

function hora12(hm: string): string {
  const [h, m] = hm.split(':').map(Number)
  const ap = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12}${ap}` : `${h12}:${String(m).padStart(2, '0')}${ap}`
}

function fechaLarga(ymd: string): string {
  try {
    return new Date(`${ymd}T12:00:00-05:00`).toLocaleDateString('es-PE', {
      timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long',
    })
  } catch { return ymd }
}

function addDias(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/* Grid mensual 7-col empezando en LUNES (mismo criterio que el resto de la app). */
function buildMonthGrid(monthStartStr: string): (string | null)[] {
  const start = new Date(monthStartStr + 'T12:00:00Z')
  start.setUTCDate(1)
  const year = start.getUTCFullYear()
  const month = start.getUTCMonth()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const firstWeekday = start.getUTCDay()
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1

  const cells: (string | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/* Íconos de línea (lucide) en vez de emojis — Pedro 24-sep-2026: "esos
   íconos hazlos profesionales". */
const TIPO_META: Record<AgendaEvento['tipo'], { label: string; singular: string; Icon: LucideIcon }> = {
  grabacion:   { label: 'Grabaciones',        singular: 'Grabación',        Icon: Video },
  reunion:     { label: 'Reuniones',          singular: 'Reunión',          Icon: Users },
  publicacion: { label: 'Publicaciones',      singular: 'Publicación',      Icon: Megaphone },
  fecha:       { label: 'Fechas importantes', singular: 'Fecha importante', Icon: Star },
  diseno:      { label: 'Diseño',             singular: 'Diseño',           Icon: Palette },
  gcal:        { label: 'Google Calendar',    singular: 'Google Calendar',  Icon: CalendarDays },
}

function TipoIcono({ t, size = 13 }: { t: AgendaEvento['tipo']; size?: number }) {
  const { Icon } = TIPO_META[t]
  return <Icon size={size} strokeWidth={2} aria-hidden style={{ flexShrink: 0, display: 'inline-block', verticalAlign: '-0.15em' }} />
}

/* Sugerir la marca de un evento de GCal por su título (ej. "Reunión Centro
   Psicológico" → Manrique). Devuelve el id de la marca con más palabras del
   nombre presentes en el título, o '' si ninguna coincide. */
function sugerirMarca(titulo: string, marcas: MarcaOpcion[]): string {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const t = norm(titulo)
  let mejor = ''
  let mejorScore = 0
  for (const m of marcas) {
    const palabras = [...norm(m.nombre).split(/\s+/), ...m.slug.split('-')].filter((w) => w.length > 3)
    const score = new Set(palabras.filter((w) => t.includes(w))).size
    if (score > mejorScore) { mejorScore = score; mejor = m.id }
  }
  return mejor
}

export function AgendaCalendar({ vista, desde, eventos, marcas, hoy, esDirector, marcasTodas, filtrosIniciales }: Props) {
  /* Por defecto solo 🎥 Grabaciones y 🤝 Reuniones (Pedro 24-sep-2026). Lo
     que el usuario elija se guarda (cookie) y se mantiene al cambiar de
     semana/mes o volver a entrar. */
  const [tipos, setTipos] = useState<Record<AgendaEvento['tipo'], boolean>>(filtrosIniciales.tipos)
  const [marcaFiltro, setMarcaFiltroState] = useState<string>(filtrosIniciales.marca)
  const [diaSel, setDiaSel] = useState<string | null>(null)
  const [eventoSel, setEventoSel] = useState<AgendaEvento | null>(null)
  /* Vista mes: arrastrar un evento a otro día. */
  const [arrastrandoMes, setArrastrandoMes] = useState<AgendaEvento | null>(null)
  const [diaDestino, setDiaDestino] = useState<string | null>(null)
  const router = useRouter()
  /* Cambios hechos arrastrando, aplicados al instante (optimista) mientras se
     guardan; si falla, se revierten. */
  /* Solo se aplica mientras el server siga mandando la posición ANTERIOR: en
     cuanto llega la versión guardada, el cambio optimista deja de aplicar. */
  const [movidos, setMovidos] = useState<Record<string, { m: Movimiento; fecha: string; hora: string | null }>>({})
  const clave = (e: AgendaEvento) => `${e.tipo}-${e.id}`
  const eventosVivos = useMemo(() => eventos.map((e) => {
    const o = movidos[clave(e)]
    return o && o.fecha === e.fecha && o.hora === e.hora
      ? { ...e, fecha: o.m.fecha, hora: o.m.hora, duracionMin: o.m.duracionMin }
      : e
  }), [eventos, movidos])

  async function mover(e: AgendaEvento, m: Movimiento) {
    const k = clave(e)
    const original = eventos.find((x) => clave(x) === k)
    setMovidos((cur) => ({ ...cur, [k]: { m, fecha: original?.fecha ?? e.fecha, hora: original?.hora ?? e.hora } }))
    const esGoogle = e.tipo === 'gcal' || !!e.origenGoogle
    let r: { ok: true; gcalError?: string } | { ok: false; error: string }
    if (esGoogle) r = await editarEventoGoogle(e.id, { titulo: e.titulo, fecha: m.fecha, hora: m.hora, duracionMin: m.duracionMin })
    else if (e.tipo === 'reunion') r = await editarReunionCal(e.id, { fecha: m.fecha, hora: m.hora ?? '09:00', duracionMin: m.hora ? m.duracionMin : null })
    else if (e.tipo === 'grabacion') {
      const g = await updateGrabacionFecha(e.id, m.fecha, m.hora, m.hora ? m.duracionMin : null)
      r = g.ok ? { ok: true, gcalError: g.gcalError } : g
    }
    else if (e.tipo === 'publicacion') r = await moverPublicacion(e.id, m.fecha)
    else if (e.tipo === 'fecha') r = await moverFechaImportante(e.id, m.fecha)
    else r = { ok: false, error: 'Este evento no se puede mover desde el calendario.' }

    if (!r.ok) {
      setMovidos((cur) => { const n = { ...cur }; delete n[k]; return n })
      toast.error(r.error)
      return
    }
    if (r.gcalError) toast.warning(`Movido en la app, pero Google Calendar falló (${r.gcalError}).`, { duration: 8000 })
    else toast.success('Movido · sincronizado con Google Calendar')
    router.refresh()
  }

  function setMarcaFiltro(m: string) {
    setMarcaFiltroState(m)
    guardarFiltrosCalendario({ tipos, marca: m })
  }

  const counts = useMemo(() => ({
    grabacion:   eventos.filter((e) => e.tipo === 'grabacion').length,
    reunion:     eventos.filter((e) => e.tipo === 'reunion').length,
    publicacion: eventos.filter((e) => e.tipo === 'publicacion').length,
    fecha:       eventos.filter((e) => e.tipo === 'fecha').length,
    diseno:      eventos.filter((e) => e.tipo === 'diseno').length,
    gcal:        eventos.filter((e) => e.tipo === 'gcal').length,
  }), [eventos])

  const filtrados = useMemo(() => eventosVivos.filter((e) => {
    if (!tipos[e.tipo]) return false
    if (marcaFiltro !== 'todas') {
      // Los eventos GCal no tienen marca — con filtro de marca activo se ocultan.
      if (e.marcaSlug !== marcaFiltro) return false
    }
    return true
  }), [eventosVivos, tipos, marcaFiltro])

  const porDia = useMemo(() => {
    const map = new Map<string, AgendaEvento[]>()
    for (const e of filtrados) {
      const list = map.get(e.fecha) ?? []
      list.push(e)
      map.set(e.fecha, list)
    }
    // Día completo primero, luego por hora
    for (const list of map.values()) {
      list.sort((a, b) => (a.hora ?? '') < (b.hora ?? '') ? -1 : 1)
    }
    return map
  }, [filtrados])

  function toggleTipo(t: AgendaEvento['tipo']) {
    const nuevos = { ...tipos, [t]: !tipos[t] }
    setTipos(nuevos)
    guardarFiltrosCalendario({ tipos: nuevos, marca: marcaFiltro })
  }

  const diasSemana = useMemo(
    () => (vista === 'semana' ? Array.from({ length: 7 }, (_, i) => addDias(desde, i)) : []),
    [vista, desde],
  )

  return (
    <div className="space-y-3">
      {eventoSel && <EventoModal e={eventoSel} esDirector={esDirector} onCerrar={() => setEventoSel(null)} />}

      {/* ===== Filtros ===== */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(TIPO_META) as AgendaEvento['tipo'][]).map((t) => {
          // GCal, Publicaciones, Fechas y Diseño solo aparecen si hay eventos de ese tipo
          if ((t === 'gcal' || t === 'diseno' || t === 'publicacion' || t === 'fecha') && counts[t] === 0 && !tipos[t]) return null
          const on = tipos[t]
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleTipo(t)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12.5px] font-medium transition-colors ${
                on
                  ? 'bg-[#7170ff]/10 border-[#7170ff]/40 text-[#4f46e5]'
                  : 'bg-muted/30 border-border text-muted-foreground opacity-60'
              }`}
              title={on ? 'Ocultar' : 'Mostrar'}
            >
              <TipoIcono t={t} size={14} />
              {TIPO_META[t].label}
              <span className={`text-[11px] px-1.5 rounded-full ${on ? 'bg-[#7170ff]/15' : 'bg-muted'}`}>{counts[t]}</span>
            </button>
          )
        })}

        {/* Gestionar fechas importantes — solo cuando el chip ⭐ está prendido */}
        {tipos.fecha && counts.fecha > 0 && (
          <Link href="/fechas-importantes" className="text-[11.5px] text-muted-foreground underline hover:text-foreground">
            <Star size={12} style={{ display: 'inline', verticalAlign: '-0.1em' }} /> gestionar
          </Link>
        )}

        <select
          value={marcaFiltro}
          onChange={(e) => setMarcaFiltro(e.target.value)}
          className="h-8 px-2 rounded-full border border-border bg-card text-[12.5px] outline-none"
          title="Filtrar por marca"
        >
          <option value="todas">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m.slug} value={m.slug}>{m.emoji ? `${m.emoji} ` : ''}{m.nombre}</option>
          ))}
        </select>
      </div>

      {/* ===== VISTA MES ===== */}
      {vista === 'mes' && (
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="min-w-[640px] sm:min-w-0 border border-border rounded-xl overflow-hidden bg-card">
            <div className="grid grid-cols-7 bg-muted/40">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="text-[10px] uppercase tracking-wider font-medium text-center py-2 text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {buildMonthGrid(desde.slice(0, 7) + '-01').map((dayStr, i) => {
                if (!dayStr) {
                  return <div key={`empty-${i}`} className="min-h-[112px] border-r border-b border-border bg-muted/10" />
                }
                const events = porDia.get(dayStr) ?? []
                const isToday = dayStr === hoy
                const dow = new Date(dayStr + 'T12:00:00Z').getUTCDay()
                const isWeekend = dow === 0 || dow === 6
                const selected = dayStr === diaSel

                return (
                  <button
                    key={dayStr}
                    type="button"
                    onClick={() => setDiaSel(selected ? null : dayStr)}
                    onDragOver={(ev) => { if (esDirector && arrastrandoMes) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move' } }}
                    onDragEnter={() => { if (esDirector && arrastrandoMes) setDiaDestino(dayStr) }}
                    onDrop={(ev) => {
                      ev.preventDefault()
                      const e = arrastrandoMes
                      setArrastrandoMes(null); setDiaDestino(null)
                      if (e && e.fecha !== dayStr) void mover(e, { fecha: dayStr, hora: e.hora, duracionMin: e.duracionMin ?? 60 })
                    }}
                    className={`${diaDestino === dayStr && arrastrandoMes ? 'bg-[#7170ff]/10 ' : ''}min-h-[112px] border-r border-b border-border p-1.5 text-left hover:bg-muted/20 transition-colors flex flex-col gap-1 ${isWeekend ? 'bg-muted/5' : ''} ${selected ? 'ring-2 ring-inset ring-[#7170ff]' : ''}`}
                    title="Ver el detalle de este día"
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                        isToday ? 'bg-[#7170ff] text-white font-bold' : 'text-muted-foreground'
                      }`}
                    >
                      {parseInt(dayStr.slice(8), 10)}
                    </span>

                    <div className="flex flex-col gap-0.5 w-full">
                      {events.slice(0, 4).map((e) => (
                        <div
                          key={`${e.tipo}-${e.id}`}
                          role="button"
                          tabIndex={0}
                          draggable={esDirector && sePuedeMover(e)}
                          onDragStart={(ev) => { ev.stopPropagation(); ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', e.id); setArrastrandoMes(e) }}
                          onDragEnd={() => { setArrastrandoMes(null); setDiaDestino(null) }}
                          style={{ cursor: esDirector && sePuedeMover(e) ? 'grab' : 'pointer' }}
                          onClick={(ev) => { ev.stopPropagation(); setEventoSel(e) }}
                          onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.stopPropagation(); setEventoSel(e) } }}
                          title="Ver / editar"
                        >
                          <EventoChip e={e} />
                        </div>
                      ))}
                      {events.length > 4 && (
                        <div className="text-[9px] text-muted-foreground pl-1">+{events.length - 4} más</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== VISTA SEMANA (default): grilla de horas estilo Google Calendar ===== */}
      {vista === 'semana' && (
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <GrillaHoras dias={diasSemana} eventos={filtrados} hoy={hoy} puedeEditar={esDirector} onAbrir={setEventoSel} onMover={mover} />
        </div>
      )}

      {/* ===== VISTA DÍA ===== */}
      {vista === 'dia' && (
        <div className="space-y-3">
          <GrillaHoras dias={[desde]} eventos={filtrados} hoy={hoy} puedeEditar={esDirector} onAbrir={setEventoSel} onMover={mover} />
          <DetalleDia dia={desde} eventos={porDia.get(desde) ?? []} hoy={hoy} esDirector={esDirector} marcasTodas={marcasTodas} onAbrir={setEventoSel} />
        </div>
      )}

      {/* ===== Leyenda de marcas ===== */}
      {marcas.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          {marcas.map((m) => (
            <span key={m.slug} className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: m.color }} />
              {m.emoji} {m.nombre}
            </span>
          ))}
          <span className="inline-flex items-center gap-3">
            {(['grabacion', 'reunion', ...(counts.publicacion > 0 ? ['publicacion'] : []), ...(counts.gcal > 0 ? ['gcal'] : [])] as AgendaEvento['tipo'][]).map((t) => (
              <span key={t} className="inline-flex items-center gap-1"><TipoIcono t={t} size={12} /> {TIPO_META[t].singular.toLowerCase()}</span>
            ))}
          </span>
        </div>
      )}

      {/* ===== Panel del día seleccionado (vistas mes y semana) ===== */}
      {vista !== 'dia' && diaSel && (
        <DetalleDia dia={diaSel} eventos={porDia.get(diaSel) ?? []} hoy={hoy} esDirector={esDirector} marcasTodas={marcasTodas} onCerrar={() => setDiaSel(null)} onAbrir={setEventoSel} />
      )}
    </div>
  )
}

/* ===== Panel de detalle de UN día (vista día + panel de mes/semana) ===== */
function DetalleDia({ dia, eventos, hoy, esDirector, marcasTodas, onCerrar, onAbrir }: {
  dia: string; eventos: AgendaEvento[]; hoy: string
  esDirector: boolean; marcasTodas: MarcaOpcion[]; onCerrar?: () => void
  onAbrir: (e: AgendaEvento) => void
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-[15px] font-bold capitalize">
          <CalendarDays size={16} style={{ display: 'inline', verticalAlign: '-0.15em', marginRight: 6 }} />{fechaLarga(dia)}{dia === hoy ? ' · HOY' : ''}
        </h3>
        <div className="flex items-center gap-2">
          <Link
            href={`/grabaciones?desde=${dia}&hasta=${dia}`}
            className="text-[12px] font-medium px-3 h-8 inline-flex items-center rounded-lg border hover:bg-muted"
          >
            ＋ Nueva grabación este día
          </Link>
          {onCerrar && (
            <button type="button" onClick={onCerrar} className="text-[12px] px-2 h-8 rounded-lg border hover:bg-muted" title="Cerrar">✕</button>
          )}
        </div>
      </div>

      {eventos.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sin eventos este día. Usa el asistente de arriba para agendar una reunión, o el botón para planear una grabación.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {eventos.map((e) => {
            const cancelado = CANCELADO.has((e.estado ?? '').toLowerCase())
            return (
              <li
                key={`${e.tipo}-${e.id}`}
                className={`rounded-lg border border-border p-3 flex items-start gap-3 ${cancelado ? 'opacity-50' : ''}`}
                style={{ borderLeft: `4px solid ${e.color}` }}
              >
                <div className="w-16 shrink-0 text-[13px] font-bold">
                  {e.hora ? hora12(e.hora) : 'Todo el día'}
                </div>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => onAbrir(e)} title="Ver / editar"
                    className={`text-left text-[14px] font-semibold hover:underline ${cancelado ? 'line-through' : ''}`}>
                    <TipoIcono t={e.tipo} size={14} /> {e.titulo}
                  </button>
                  <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[12px] text-muted-foreground">
                    {e.marcaNombre && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: e.color }} />
                        {e.marcaEmoji} {e.marcaNombre}
                      </span>
                    )}
                    {e.estado && <span className="px-1.5 py-0.5 rounded bg-muted capitalize">{e.estado}</span>}
                    {e.tipo === 'grabacion' && e.videosGrabados != null && <span>{e.videosGrabados} videos</span>}
                  </div>
                  {e.notas && <p className="mt-1 text-[12.5px] text-muted-foreground line-clamp-2">{e.notas}</p>}

                  {/* Acciones por tipo (solo directores donde aplica) */}
                  {(e.tipo === 'gcal' || e.origenGoogle) && esDirector && (
                    <VincularGcal e={e} marcasTodas={marcasTodas} />
                  )}
                  {e.tipo === 'reunion' && !e.origenGoogle && esDirector && (
                    <ReunionAcciones e={e} />
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  {e.meetLink && (
                    <a
                      href={e.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-white text-[12px] font-semibold"
                      style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
                    >
                      ▶ Meet
                    </a>
                  )}
                  {e.meetLink && <CopiarMeet enlace={e.meetLink} />}
                  {e.href && (
                    <Link href={e.href} className="inline-flex items-center h-8 px-3 rounded-lg border text-[12px] font-medium hover:bg-muted">
                      {e.tipo === 'publicacion' ? 'Abrir publicación →' : e.tipo === 'fecha' ? 'Gestionar fechas →' : 'Abrir tarea →'}
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* Botoncito "copiar enlace de Meet" — para pegarlo y mandarlo a quien deba
   unirse (Pedro 31-ago-2026). Fallback textarea para navegadores/PWA donde
   navigator.clipboard no está disponible. */
function CopiarMeet({ enlace }: { enlace: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    let ok = false
    try {
      await navigator.clipboard.writeText(enlace)
      ok = true
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = enlace
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { ok = false }
    }
    if (ok) {
      setCopiado(true)
      toast.success('🔗 Enlace de Meet copiado — pégalo y envíalo a quien deba unirse')
      setTimeout(() => setCopiado(false), 2500)
    } else {
      toast.error('No pude copiar. Mantén presionado el botón ▶ Meet para copiar el enlace.')
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar el enlace de Meet para enviarlo"
      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border text-[12px] font-medium hover:bg-muted"
      style={copiado ? { borderColor: '#86efac', background: '#dcfce7', color: '#15803d' } : undefined}
    >
      {copiado ? '✓ Copiado' : '🔗 Copiar enlace'}
    </button>
  )
}

/* Vincular un evento suelto de Google Calendar a una marca como reunión o
   grabación del sistema (queda editable en la app y deja de ser 🟦). */
function VincularGcal({ e, marcasTodas }: { e: AgendaEvento; marcasTodas: MarcaOpcion[] }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [marcaId, setMarcaId] = useState(() => sugerirMarca(e.titulo, marcasTodas))
  const [tipo, setTipo] = useState<'reunion' | 'grabacion'>(/grab/i.test(e.titulo) ? 'grabacion' : 'reunion')
  const [cargando, setCargando] = useState(false)
  const [hecho, setHecho] = useState(false)

  async function vincular() {
    if (!marcaId) { toast.error('Elige la marca'); return }
    setCargando(true)
    const r = await vincularEventoGcal({
      gcalId: e.id, titulo: e.titulo, fecha: e.fecha, hora: e.hora,
      meetLink: e.meetLink, marcaId, tipo, duracionMin: e.duracionMin ?? null,
    })
    setCargando(false)
    if (!r.ok) { toast.error(r.error); return }
    setHecho(true)  // evita doble submit (filas duplicadas) mientras refresca
    toast.success(tipo === 'reunion' ? '✅ Vinculado como reunión de la marca' : '✅ Vinculado como grabación de la marca')
    router.refresh()
  }

  if (hecho) {
    return <div className="mt-1.5 text-[11.5px] font-medium text-emerald-700">✓ Vinculado — actualizando…</div>
  }
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="mt-1.5 inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border text-[11.5px] font-medium hover:bg-muted">
        🔗 Vincular a marca
      </button>
    )
  }
  return (
    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
      <select value={marcaId} onChange={(ev) => setMarcaId(ev.target.value)}
        className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] outline-none">
        <option value="">Marca…</option>
        {marcasTodas.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.nombre}</option>)}
      </select>
      <div className="inline-flex rounded-lg border border-border overflow-hidden">
        {(['reunion', 'grabacion'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTipo(t)}
            className={`h-8 px-2.5 text-[11.5px] font-medium ${tipo === t ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}>
            <TipoIcono t={t} size={12} /> {t === 'reunion' ? 'Reunión' : 'Grabación'}
          </button>
        ))}
      </div>
      <button type="button" onClick={vincular} disabled={cargando || !marcaId}
        className="h-8 px-3 rounded-lg text-white text-[12px] font-semibold disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
        {cargando ? '…' : 'Vincular'}
      </button>
      <button type="button" onClick={() => setAbierto(false)} className="h-8 px-2 rounded-lg border text-[12px]">✕</button>
    </div>
  )
}

/* Editar fecha/hora o eliminar una reunión — con sync a Google Calendar. */
function ReunionAcciones({ e }: { e: AgendaEvento }) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [fecha, setFecha] = useState(e.fecha)
  const [hora, setHora] = useState(e.hora ?? '09:00')
  const [cargando, setCargando] = useState(false)

  async function guardar() {
    setCargando(true)
    const r = await editarReunionCal(e.id, { fecha, hora })
    setCargando(false)
    if (!r.ok) { toast.error(r.error); return }
    if (r.gcalError) {
      toast.warning(`Reunión actualizada en la app, pero NO se pudo mover en Google Calendar (${r.gcalError}). Muévela a mano en Google.`, { duration: 8000 })
    } else {
      toast.success('✅ Reunión actualizada (también en Google Calendar)')
    }
    setEditando(false)
    router.refresh()
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar la reunión "${e.titulo}"? También se borra de Google Calendar.`)) return
    setCargando(true)
    const r = await eliminarReunionCal(e.id)
    setCargando(false)
    if (!r.ok) { toast.error(r.error); return }
    if (r.gcalError) {
      toast.warning(`Reunión eliminada de la app, pero NO se pudo borrar en Google Calendar (${r.gcalError}). Bórrala a mano en Google.`, { duration: 8000 })
    } else {
      toast.success('Reunión eliminada')
    }
    router.refresh()
  }

  if (!editando) {
    return (
      <div className="mt-1.5 flex items-center gap-1.5">
        <button type="button" onClick={() => { setFecha(e.fecha); setHora(e.hora ?? '09:00'); setEditando(true) }}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border text-[11.5px] font-medium hover:bg-muted">
          ✏️ Cambiar fecha/hora
        </button>
        <button type="button" onClick={eliminar} disabled={cargando}
          className="inline-flex items-center h-7 px-2 rounded-lg border text-[11.5px] text-red-600 hover:bg-red-50" title="Eliminar reunión">
          🗑
        </button>
      </div>
    )
  }
  return (
    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
      <input type="date" value={fecha} onChange={(ev) => setFecha(ev.target.value)}
        className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] outline-none" />
      <input type="time" value={hora} onChange={(ev) => setHora(ev.target.value)}
        className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] outline-none" />
      <button type="button" onClick={guardar} disabled={cargando}
        className="h-8 px-3 rounded-lg text-white text-[12px] font-semibold disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
        {cargando ? '…' : '✓ Guardar'}
      </button>
      <button type="button" onClick={() => setEditando(false)} className="h-8 px-2 rounded-lg border text-[12px]">✕</button>
    </div>
  )
}

/* Chip compacto dentro de la celda del día (vista MES). Grabación = sólido con
   color de marca; reunión = violeta claro con borde de marca; GCal = azul suave. */
function EventoChip({ e }: { e: AgendaEvento }) {
  const cancelado = CANCELADO.has((e.estado ?? '').toLowerCase())
  const base = 'text-[10px] px-1.5 py-0.5 rounded-sm truncate font-medium w-full text-left'
  const extra = cancelado ? ' opacity-50 line-through' : (e.estado === 'cumplida' || e.estado === 'realizada') ? ' ring-1 ring-emerald-300' : ''
  const hora = e.hora ? `${hora12(e.hora)} ` : ''

  if (e.tipo === 'grabacion') {
    return (
      <div className={base + extra + ' text-white'} style={{ background: e.color }} title={`Grabación: ${e.titulo}`}>
        <TipoIcono t="grabacion" size={10} /> {hora}{e.marcaNombre ?? e.titulo}
      </div>
    )
  }
  if (e.tipo === 'reunion') {
    return (
      <div
        className={base + extra}
        style={{ background: '#ede9fe', color: '#5b21b6', borderLeft: `3px solid ${e.color}` }}
        title={`Reunión: ${e.titulo}`}
      >
        <TipoIcono t="reunion" size={10} /> {hora}{e.titulo}
      </div>
    )
  }
  if (e.tipo === 'publicacion') {
    return (
      <div
        className={base + extra}
        style={{ background: '#ffe4e6', color: '#be123c', borderLeft: `3px solid ${e.color}` }}
        title={`Publicación: ${e.titulo}${e.marcaNombre ? ` · ${e.marcaNombre}` : ''}`}
      >
        <TipoIcono t="publicacion" size={10} /> {hora}{e.titulo}
      </div>
    )
  }
  if (e.tipo === 'fecha') {
    return (
      <div
        className={base + extra}
        style={{ background: '#fef9c3', color: '#a16207', borderLeft: `3px solid ${e.color}` }}
        title={`Fecha importante: ${e.titulo}${e.marcaNombre ? ` · ${e.marcaNombre}` : ''}`}
      >
        <TipoIcono t="fecha" size={10} /> {e.titulo}
      </div>
    )
  }
  if (e.tipo === 'diseno') {
    return (
      <div
        className={base + extra}
        style={{ background: '#fef3c7', color: '#92400e', borderLeft: `3px solid ${e.color}` }}
        title={`Diseño: ${e.titulo}`}
      >
        <TipoIcono t="diseno" size={10} /> {hora}{e.titulo}
      </div>
    )
  }
  return (
    <div className={base + extra} style={{ background: '#eff6ff', color: '#1d4ed8' }} title={e.titulo}>
      {hora}{e.titulo}
    </div>
  )
}
