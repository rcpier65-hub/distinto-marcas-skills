'use client'

/* "Grabaciones y Reuniones" del PORTAL DEL CLIENTE — mismo diseño que el
   calendario unificado de la agencia (/grabaciones/calendario), pero SOLO con
   los eventos de SU marca. Pedro 31-ago-2026: "debe ser igual al que ya
   tenemos de grabación y reuniones pero que salga solo sus reuniones de la
   marca". Sin Google Calendar personal ni asistente (cosas de la agencia).
   Navegación de rango 100% client-side (el portal no navega por URL).
   Debajo, el cliente puede AGENDAR una grabación (avisa al equipo). */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Clapperboard, Loader2 } from 'lucide-react'
import { agendarGrabacionCliente } from '../_actions'
import type { Reunion, GrabacionCliente } from '@/lib/portal/coordinacion'

type VistaAgenda = 'dia' | 'semana' | 'mes'

type Evento = {
  id: string
  tipo: 'grabacion' | 'reunion'
  fecha: string
  hora: string | null
  titulo: string
  estado: string | null
  meetLink: string | null
  notas: string | null
  videosGrabados: number | null
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const CANCELADO = new Set(['cancelada', 'cancelado'])
const TIPO_META = {
  grabacion: { label: 'Grabaciones', icon: '🎥' },
  reunion:   { label: 'Reuniones',   icon: '🤝' },
} as const

function addDias(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function lunesDe(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00Z')
  const dow = d.getUTCDay()
  return addDias(ymd, -(dow === 0 ? 6 : dow - 1))
}
function mesRango(ymd: string, delta: number): string {
  const d = new Date(ymd + 'T12:00:00Z')
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1, 12)).toISOString().slice(0, 10)
}
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
function tsALima(iso: string): { ymd: string; hm: string } {
  const d = new Date(iso)
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return { ymd, hm }
}
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

const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function AgendaClienteView({ reuniones, grabaciones, color, marcaNombre, hoy }: {
  reuniones: Reunion[]
  grabaciones: GrabacionCliente[]
  color: string
  marcaNombre: string
  hoy: string
}) {
  /* SEMANA por defecto — igual que el calendario de la agencia. */
  const [vista, setVista] = useState<VistaAgenda>('semana')
  const [desde, setDesde] = useState<string>(() => lunesDe(hoy))
  const [diaSel, setDiaSel] = useState<string | null>(null)
  const [tipos, setTipos] = useState<Record<'grabacion' | 'reunion', boolean>>({ grabacion: true, reunion: true })

  const eventos = useMemo<Evento[]>(() => {
    const out: Evento[] = []
    for (const g of grabaciones) {
      out.push({
        id: g.id, tipo: 'grabacion',
        /* Cumplida con fecha real distinta → se muestra el día que SÍ se grabó. */
        fecha: g.estado === 'cumplida' && g.fechaReal ? g.fechaReal : g.fechaPlaneada,
        hora: g.horaPlaneada ? g.horaPlaneada.slice(0, 5) : null,
        titulo: `Grabación · ${marcaNombre}`, estado: g.estado,
        meetLink: null, notas: g.notas, videosGrabados: g.videosGrabados,
      })
    }
    for (const r of reuniones) {
      const { ymd, hm } = tsALima(r.fechaHora)
      /* Meet sin protocolo ("meet.google.com/xyz") también cuenta como link. */
      const crudo = (r.lugarEnlace ?? '').trim()
      const link = /^https?:\/\//i.test(crudo) ? crudo
        : /^(meet\.google\.com|www\.)/i.test(crudo) ? `https://${crudo}` : null
      out.push({
        id: r.id, tipo: 'reunion', fecha: ymd, hora: hm,
        titulo: r.titulo || 'Reunión', estado: r.estado,
        meetLink: link,
        notas: r.notas ?? (r.modalidad === 'presencial' && crudo && !link ? `Lugar: ${crudo}` : null),
        videosGrabados: null,
      })
    }
    return out
  }, [grabaciones, reuniones, marcaNombre])

  const filtrados = useMemo(() => eventos.filter((e) => tipos[e.tipo]), [eventos, tipos])

  const porDia = useMemo(() => {
    const map = new Map<string, Evento[]>()
    for (const e of filtrados) {
      const list = map.get(e.fecha) ?? []
      list.push(e)
      map.set(e.fecha, list)
    }
    for (const list of map.values()) list.sort((a, b) => (a.hora ?? '') < (b.hora ?? '') ? -1 : 1)
    return map
  }, [filtrados])

  const counts = useMemo(() => ({
    grabacion: eventos.filter((e) => e.tipo === 'grabacion').length,
    reunion: eventos.filter((e) => e.tipo === 'reunion').length,
  }), [eventos])

  /* Navegación del rango (client-side). */
  function cambiarVista(v: VistaAgenda) {
    setVista(v); setDiaSel(null)
    if (v === 'dia') setDesde(hoy)
    else if (v === 'semana') setDesde(lunesDe(hoy))
    else setDesde(mesRango(hoy, 0))
  }
  function mover(delta: -1 | 1) {
    setDiaSel(null)
    setDesde((cur) => vista === 'dia' ? addDias(cur, delta) : vista === 'semana' ? addDias(cur, delta * 7) : mesRango(cur, delta))
  }
  function irHoy() { cambiarVista(vista) }

  const diasSemana = useMemo(
    () => (vista === 'semana' ? Array.from({ length: 7 }, (_, i) => addDias(desde, i)) : []),
    [vista, desde],
  )
  const monthDate = new Date(desde + 'T12:00:00Z')
  const fmtCorto = (ymd: string) =>
    new Date(ymd + 'T12:00:00-05:00').toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short' })
  const rangoLabel = vista === 'dia'
    ? fechaLarga(desde)
    : vista === 'semana'
      ? `${fmtCorto(desde)} – ${fmtCorto(addDias(desde, 6))}`
      : `${MESES_L[monthDate.getUTCMonth()]} ${monthDate.getUTCFullYear()}`

  return (
    <div className="space-y-4">
      {/* Header estilo agencia */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold leading-tight">📅 Grabaciones y Reuniones</h2>
          <p className="text-[13px] text-muted-foreground capitalize">{rangoLabel} · {counts.grabacion} grabaciones · {counts.reunion} reuniones</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border overflow-hidden">
            {(['dia', 'semana', 'mes'] as VistaAgenda[]).map((v) => (
              <button key={v} type="button" onClick={() => cambiarVista(v)}
                className="h-8 px-3 text-xs font-medium"
                style={v === vista ? { background: color, color: '#fff' } : { background: 'transparent', color: '#6b7280' }}>
                {v === 'dia' ? 'Día' : v === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1">
            <button type="button" onClick={() => mover(-1)} className="h-8 w-8 rounded border hover:bg-muted text-sm" title="Anterior">←</button>
            <button type="button" onClick={() => mover(1)} className="h-8 w-8 rounded border hover:bg-muted text-sm" title="Siguiente">→</button>
            <button type="button" onClick={irHoy} className="h-8 px-2.5 rounded border text-xs ml-1 font-bold" style={{ borderColor: color, color }}>Hoy</button>
          </div>
        </div>
      </header>

      {/* Filtros por tipo — mismos chips que la agencia */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['grabacion', 'reunion'] as const).map((t) => {
          const on = tipos[t]
          return (
            <button key={t} type="button" onClick={() => setTipos((c) => ({ ...c, [t]: !c[t] }))}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12.5px] font-medium transition-colors"
              style={on ? { background: `${color}12`, borderColor: `${color}55`, color } : { color: '#9ca3af', opacity: 0.7 }}>
              <span>{TIPO_META[t].icon}</span> {TIPO_META[t].label}
              <span className="text-[11px] px-1.5 rounded-full" style={{ background: on ? `${color}18` : '#f3f4f6' }}>{counts[t]}</span>
            </button>
          )
        })}
      </div>

      {/* ===== VISTA MES ===== */}
      {vista === 'mes' && (
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="min-w-[640px] sm:min-w-0 border rounded-xl overflow-hidden bg-card">
            <div className="grid grid-cols-7 bg-muted/40">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="text-[10px] uppercase tracking-wider font-medium text-center py-2 text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {buildMonthGrid(desde.slice(0, 7) + '-01').map((dayStr, i) => {
                if (!dayStr) return <div key={`e-${i}`} className="min-h-[96px] border-r border-b bg-muted/10" />
                const events = porDia.get(dayStr) ?? []
                const isToday = dayStr === hoy
                const selected = dayStr === diaSel
                return (
                  <button key={dayStr} type="button" onClick={() => setDiaSel(selected ? null : dayStr)}
                    className={`min-h-[96px] border-r border-b p-1.5 text-left hover:bg-muted/20 transition-colors flex flex-col gap-1 ${selected ? 'ring-2 ring-inset' : ''}`}
                    style={selected ? { ['--tw-ring-color' as never]: color } : undefined}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs"
                      style={isToday ? { background: color, color: '#fff', fontWeight: 700 } : { color: '#6b7280' }}>
                      {parseInt(dayStr.slice(8), 10)}
                    </span>
                    <div className="flex flex-col gap-0.5 w-full">
                      {events.slice(0, 3).map((e) => <ChipMes key={`${e.tipo}-${e.id}`} e={e} color={color} />)}
                      {events.length > 3 && <div className="text-[9px] text-muted-foreground pl-1">+{events.length - 3} más</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== VISTA SEMANA (default) ===== */}
      {vista === 'semana' && (
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="min-w-[700px] border rounded-xl overflow-hidden bg-card grid grid-cols-7">
            {diasSemana.map((dayStr, i) => {
              const events = porDia.get(dayStr) ?? []
              const isToday = dayStr === hoy
              return (
                <div key={dayStr} className="min-h-[280px] border-r last:border-r-0 flex flex-col">
                  <button type="button" onClick={() => setDiaSel(diaSel === dayStr ? null : dayStr)}
                    className="px-2 py-2 text-center border-b hover:bg-muted/20"
                    style={{ background: isToday ? `${color}10` : 'var(--muted, #f8fafc)' }}
                    title="Ver el detalle de este día">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{DIAS_SEMANA[i]}</div>
                    <div className="mx-auto mt-0.5 w-7 h-7 rounded-full inline-flex items-center justify-center text-sm"
                      style={isToday ? { background: color, color: '#fff', fontWeight: 700 } : undefined}>
                      {parseInt(dayStr.slice(8), 10)}
                    </div>
                  </button>
                  <div className="p-1.5 flex flex-col gap-1.5">
                    {events.length === 0 && <div className="text-[10px] text-muted-foreground/60 text-center pt-4">—</div>}
                    {events.map((e) => <CardSemana key={`${e.tipo}-${e.id}`} e={e} color={color} />)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== VISTA DÍA ===== */}
      {vista === 'dia' && <DetalleDia dia={desde} eventos={porDia.get(desde) ?? []} hoy={hoy} color={color} />}

      {/* Panel del día seleccionado (mes/semana) */}
      {vista !== 'dia' && diaSel && (
        <DetalleDia dia={diaSel} eventos={porDia.get(diaSel) ?? []} hoy={hoy} color={color} onCerrar={() => setDiaSel(null)} />
      )}

      <p className="text-[11px] text-muted-foreground">🎥 grabación · 🤝 reunión — toca un día para ver su detalle. Las reuniones con Meet tienen botón para entrar.</p>

      {/* Agendar grabación (capacidad existente del cliente) */}
      <AgendarGrabacionForm color={color} hoy={hoy} />
    </div>
  )
}

/* Panel de detalle de un día — mismo diseño que la agencia. */
function DetalleDia({ dia, eventos, hoy, color, onCerrar }: {
  dia: string; eventos: Evento[]; hoy: string; color: string; onCerrar?: () => void
}) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-[15px] font-bold capitalize">📅 {fechaLarga(dia)}{dia === hoy ? ' · HOY' : ''}</h3>
        {onCerrar && <button type="button" onClick={onCerrar} className="text-[12px] px-2 h-8 rounded-lg border hover:bg-muted" title="Cerrar">✕</button>}
      </div>
      {eventos.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Sin grabaciones ni reuniones este día.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {eventos.map((e) => {
            const cancelado = CANCELADO.has((e.estado ?? '').toLowerCase())
            return (
              <li key={`${e.tipo}-${e.id}`} className={`rounded-lg border p-3 flex items-start gap-3 ${cancelado ? 'opacity-50' : ''}`}
                style={{ borderLeft: `4px solid ${color}` }}>
                <div className="w-16 shrink-0 text-[13px] font-bold">{e.hora ? hora12(e.hora) : 'Todo el día'}</div>
                <div className="min-w-0 flex-1">
                  <div className={`text-[14px] font-semibold ${cancelado ? 'line-through' : ''}`}>{TIPO_META[e.tipo].icon} {e.titulo}</div>
                  <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[12px] text-muted-foreground">
                    {e.estado && <span className="px-1.5 py-0.5 rounded bg-muted capitalize">{e.estado}</span>}
                    {e.tipo === 'grabacion' && e.videosGrabados != null && <span>{e.videosGrabados} videos</span>}
                  </div>
                  {e.notas && <p className="mt-1 text-[12.5px] text-muted-foreground line-clamp-2">{e.notas}</p>}
                </div>
                {e.meetLink && !cancelado && (
                  <a href={e.meetLink} target="_blank" rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-lg text-white text-[12px] font-semibold"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    ▶ Meet
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* Chip compacto (vista mes) — grabación sólida con color de marca; reunión violeta. */
function ChipMes({ e, color }: { e: Evento; color: string }) {
  const cancelado = CANCELADO.has((e.estado ?? '').toLowerCase())
  const base = 'text-[10px] px-1.5 py-0.5 rounded-sm truncate font-medium w-full text-left'
  const extra = cancelado ? ' opacity-50 line-through' : (e.estado === 'cumplida' || e.estado === 'realizada') ? ' ring-1 ring-emerald-300' : ''
  const hora = e.hora ? `${hora12(e.hora)} ` : ''
  if (e.tipo === 'grabacion') {
    return <div className={base + extra + ' text-white'} style={{ background: color }} title={e.titulo}>🎥 {hora}Grabación</div>
  }
  return (
    <div className={base + extra} style={{ background: '#ede9fe', color: '#5b21b6', borderLeft: `3px solid ${color}` }} title={e.titulo}>
      🤝 {hora}{e.titulo}
    </div>
  )
}

/* Card de la vista semana — hora arriba + título, como la agencia. */
function CardSemana({ e, color }: { e: Evento; color: string }) {
  const cancelado = CANCELADO.has((e.estado ?? '').toLowerCase())
  const cumplido = e.estado === 'cumplida' || e.estado === 'realizada'
  const esGrab = e.tipo === 'grabacion'
  const card = (
    <div className={`rounded-md px-1.5 py-1 w-full ${cancelado ? 'opacity-50' : ''} ${cumplido ? 'ring-1 ring-emerald-300' : ''}`}
      style={esGrab ? { background: color, color: '#fff' } : { background: '#ede9fe', color: '#5b21b6', borderLeft: `3px solid ${color}` }}
      title={e.titulo}>
      <div className="text-[10px] font-bold" style={{ opacity: 0.85 }}>{e.hora ? hora12(e.hora) : 'Todo el día'} {TIPO_META[e.tipo].icon}</div>
      <div className={`text-[11px] font-medium leading-tight ${cancelado ? 'line-through' : ''}`} style={{ wordBreak: 'break-word' }}>
        {esGrab ? 'Grabación' : e.titulo}
      </div>
    </div>
  )
  if (e.meetLink && !cancelado) {
    return <a href={e.meetLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>{card}</a>
  }
  return card
}

/* El cliente agenda su propia sesión de grabación (le avisa al equipo). */
function AgendarGrabacionForm({ color, hoy }: { color: string; hoy: string }) {
  const router = useRouter()
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function agendar() {
    if (!fecha) { toast.error('Elige la fecha de la grabación'); return }
    setGuardando(true)
    const r = await agendarGrabacionCliente({ fecha, hora: hora || undefined, notas: notas || undefined })
    setGuardando(false)
    if (!r.ok) { toast.error(r.error); return }
    setFecha(''); setHora(''); setNotas('')
    toast.success('🎥 ¡Grabación agendada! Ya le avisamos al equipo.')
    router.refresh()
  }

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-white shrink-0" style={{ background: color }}>
          <Clapperboard className="w-4.5 h-4.5" />
        </span>
        <div>
          <h3 className="text-[15px] font-bold leading-tight">Agendar una grabación</h3>
          <p className="text-[12px] text-muted-foreground">Elige el día y el equipo recibe el aviso al instante.</p>
        </div>
      </div>
      <div className="flex items-end gap-2 flex-wrap">
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Fecha
          <input type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="h-10 px-3 rounded-lg border bg-background text-[14px] outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Hora (opcional)
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
            className="h-10 px-3 rounded-lg border bg-background text-[14px] outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground flex-1 min-w-[180px]">Nota (opcional)
          <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={500} placeholder="Ej. grabar en la tienda nueva…"
            className="h-10 px-3 rounded-lg border bg-background text-[14px] outline-none" />
        </label>
        <button type="button" onClick={agendar} disabled={guardando || !fecha}
          className="h-10 px-4 rounded-xl text-white font-bold text-[13.5px] disabled:opacity-50 inline-flex items-center gap-1.5"
          style={{ background: color }}>
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />} Agendar y avisar
        </button>
      </div>
    </section>
  )
}
