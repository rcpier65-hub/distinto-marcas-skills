// app/app/grabaciones/calendario/_components/agenda-calendar.tsx
//
// Calendario mensual UNIFICADO de Grabaciones + Reuniones + eventos de
// Google Calendar, estilo Google Calendar. Pedro 31-ago-2026: "quiero que
// esté ordenado por calendario, no marcas, con filtros de reuniones y de
// grabaciones, sincronizado con el Google Calendar".
//
// - Chips de filtro por TIPO (🎥 grabación / 🤝 reunión / G eventos GCal)
//   y por MARCA. Todo client-side: los eventos del mes ya vienen cargados.
// - Click en un día → panel de detalle debajo con horas, Meet, notas y
//   accesos rápidos (editar grabaciones del día / agendar con el asistente).
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export type AgendaEvento = {
  id: string
  tipo: 'grabacion' | 'reunion' | 'gcal'
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
}

type MarcaLite = { slug: string; nombre: string; emoji: string | null; color: string }

type Props = {
  mes: string              // YYYY-MM-01
  eventos: AgendaEvento[]
  marcas: MarcaLite[]      // marcas presentes en el mes (para filtro + leyenda)
  hoy: string              // YYYY-MM-DD en Lima (calculado server-side)
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

const TIPO_META: Record<AgendaEvento['tipo'], { label: string; icon: string }> = {
  grabacion: { label: 'Grabaciones', icon: '🎥' },
  reunion:   { label: 'Reuniones',   icon: '🤝' },
  gcal:      { label: 'Google Calendar', icon: '🟦' },
}

export function AgendaCalendar({ mes, eventos, marcas, hoy }: Props) {
  const [tipos, setTipos] = useState<Record<AgendaEvento['tipo'], boolean>>({
    grabacion: true, reunion: true, gcal: true,
  })
  const [marcaFiltro, setMarcaFiltro] = useState<string>('todas')
  const [diaSel, setDiaSel] = useState<string | null>(null)

  const grid = useMemo(() => buildMonthGrid(mes), [mes])

  const counts = useMemo(() => ({
    grabacion: eventos.filter((e) => e.tipo === 'grabacion').length,
    reunion:   eventos.filter((e) => e.tipo === 'reunion').length,
    gcal:      eventos.filter((e) => e.tipo === 'gcal').length,
  }), [eventos])

  const filtrados = useMemo(() => eventos.filter((e) => {
    if (!tipos[e.tipo]) return false
    if (marcaFiltro !== 'todas') {
      // Los eventos GCal no tienen marca — con filtro de marca activo se ocultan.
      if (e.marcaSlug !== marcaFiltro) return false
    }
    return true
  }), [eventos, tipos, marcaFiltro])

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

  const eventosDia = diaSel ? (porDia.get(diaSel) ?? []) : []

  function toggleTipo(t: AgendaEvento['tipo']) {
    setTipos((cur) => ({ ...cur, [t]: !cur[t] }))
  }

  return (
    <div className="space-y-3">
      {/* ===== Filtros ===== */}
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(TIPO_META) as AgendaEvento['tipo'][]).map((t) => {
          // El chip de GCal solo aparece si hay eventos externos (o sea, si está conectado)
          if (t === 'gcal' && counts.gcal === 0) return null
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
              <span>{TIPO_META[t].icon}</span>
              {TIPO_META[t].label}
              <span className={`text-[11px] px-1.5 rounded-full ${on ? 'bg-[#7170ff]/15' : 'bg-muted'}`}>{counts[t]}</span>
            </button>
          )
        })}

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

      {/* ===== Grid mensual ===== */}
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
            {grid.map((dayStr, i) => {
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
                  className={`min-h-[112px] border-r border-b border-border p-1.5 text-left hover:bg-muted/20 transition-colors flex flex-col gap-1 ${isWeekend ? 'bg-muted/5' : ''} ${selected ? 'ring-2 ring-inset ring-[#7170ff]' : ''}`}
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
                    {events.slice(0, 4).map((e) => <EventoChip key={`${e.tipo}-${e.id}`} e={e} />)}
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

      {/* ===== Leyenda de marcas ===== */}
      {marcas.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          {marcas.map((m) => (
            <span key={m.slug} className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: m.color }} />
              {m.emoji} {m.nombre}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">🎥 grabación · 🤝 reunión{counts.gcal > 0 ? ' · 🟦 Google Calendar' : ''}</span>
        </div>
      )}

      {/* ===== Panel del día seleccionado ===== */}
      {diaSel && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-[15px] font-bold capitalize">📅 {fechaLarga(diaSel)}</h3>
            <div className="flex items-center gap-2">
              <Link
                href={`/grabaciones?desde=${diaSel}&hasta=${diaSel}`}
                className="text-[12px] font-medium px-3 h-8 inline-flex items-center rounded-lg border hover:bg-muted"
              >
                ＋ Nueva grabación este día
              </Link>
              <button type="button" onClick={() => setDiaSel(null)} className="text-[12px] px-2 h-8 rounded-lg border hover:bg-muted" title="Cerrar">✕</button>
            </div>
          </div>

          {eventosDia.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Sin eventos este día. Usa el asistente de arriba para agendar una reunión, o el botón para planear una grabación.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {eventosDia.map((e) => {
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
                      <div className={`text-[14px] font-semibold ${cancelado ? 'line-through' : ''}`}>
                        {TIPO_META[e.tipo].icon} {e.titulo}
                      </div>
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
                    </div>
                    {e.meetLink && (
                      <a
                        href={e.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-lg text-white text-[12px] font-semibold"
                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
                      >
                        ▶ Meet
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

/* Chip compacto dentro de la celda del día. Grabación = sólido con color de
   marca; reunión = violeta claro con borde de marca; GCal = azul suave. */
function EventoChip({ e }: { e: AgendaEvento }) {
  const cancelado = CANCELADO.has((e.estado ?? '').toLowerCase())
  const base = 'text-[10px] px-1.5 py-0.5 rounded-sm truncate font-medium w-full text-left'
  const extra = cancelado ? ' opacity-50 line-through' : (e.estado === 'cumplida' || e.estado === 'realizada') ? ' ring-1 ring-emerald-300' : ''
  const hora = e.hora ? `${hora12(e.hora)} ` : ''

  if (e.tipo === 'grabacion') {
    return (
      <div className={base + extra + ' text-white'} style={{ background: e.color }} title={`🎥 ${e.titulo}`}>
        🎥 {hora}{e.marcaNombre ?? e.titulo}
      </div>
    )
  }
  if (e.tipo === 'reunion') {
    return (
      <div
        className={base + extra}
        style={{ background: '#ede9fe', color: '#5b21b6', borderLeft: `3px solid ${e.color}` }}
        title={`🤝 ${e.titulo}`}
      >
        🤝 {hora}{e.titulo}
      </div>
    )
  }
  return (
    <div className={base + extra} style={{ background: '#eff6ff', color: '#1d4ed8' }} title={e.titulo}>
      {hora}{e.titulo}
    </div>
  )
}
