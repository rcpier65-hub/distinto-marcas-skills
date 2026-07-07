'use client'

/* Reporte de actividad por persona — versión RICA (Pedro 07-jul-2026:
   "que sea dinámico, con emojis, colorido con los colores de la agencia,
   tareas/hábitos, más completo y con más opciones").
   Resumido = stat-pills coloridas por tipo de acción · Detallado = timeline.
   Agency colors: violeta #7170ff + morado #ba41f7. Cada acción tiene emoji
   y color por tipo; cada marca su color/emoji; hábitos con su hora. */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ClipboardList, Copy as CopyIcon, Check, ListChecks, AlignLeft, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

export type ActividadRow = {
  actor_nombre: string
  rol: string | null
  accion: string
  entidad_tipo: string | null
  marca_slug: string | null
  detalle: string | null
  created_at: string
}

export type MarcaMini = { slug: string; nombre: string; color: string; emoji: string | null }
export type HabitoMini = { nombre: string; icono: string; color: string; hora: string | null }

const TZ = 'America/Lima'
const AGENCY = '#7170ff'
const AGENCY_2 = '#ba41f7'

function hora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-PE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function fechaBonita(fecha: string): string {
  try {
    const [y, m, d] = fecha.split('-').map(Number)
    return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d))
  } catch { return fecha }
}

/* Suma/resta días a una fecha YYYY-MM-DD (sin líos de timezone). */
function shiftFecha(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d + dias)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/* Emoji + color por TIPO de acción (heurística por palabras clave). */
function accionMeta(accion: string): { emoji: string; color: string } {
  const a = accion.toLowerCase()
  if (a.includes('editó') || a.includes('editar') || a.includes('edición') || a.includes('video')) return { emoji: '✂️', color: '#8b5cf6' }
  if (a.includes('completó') || a.includes('terminó') || a.includes('tarea')) return { emoji: '✅', color: '#16a34a' }
  if (a.includes('aprob')) return { emoji: '👍', color: '#3b82f6' }
  if (a.includes('diseñ') || a.includes('disen')) return { emoji: '🎨', color: '#ec4899' }
  if (a.includes('envi') || a.includes('enviado')) return { emoji: '📤', color: '#06b6d4' }
  if (a.includes('public')) return { emoji: '🚀', color: '#f59e0b' }
  if (a.includes('grab')) return { emoji: '🎥', color: '#f43f5e' }
  if (a.includes('coment') || a.includes('respond')) return { emoji: '💬', color: '#14b8a6' }
  if (a.includes('portada')) return { emoji: '🖼️', color: '#a855f7' }
  if (a.includes('estado')) return { emoji: '🔄', color: AGENCY }
  if (a.includes('cre') || a.includes('agreg') || a.includes('nueva')) return { emoji: '✨', color: '#a855f7' }
  return { emoji: '⚡', color: AGENCY }
}

/* Etiqueta + color por rol. */
function rolMeta(rol: string | null): { label: string; color: string } {
  const r = (rol ?? '').toLowerCase()
  if (r.includes('director') || r.includes('admin')) return { label: 'Admin', color: '#f59e0b' }
  if (r.includes('editor')) return { label: 'Editor', color: '#8b5cf6' }
  if (r.includes('disen')) return { label: 'Diseño', color: '#ec4899' }
  if (r.includes('community')) return { label: 'Community', color: '#22c55e' }
  if (r.includes('social')) return { label: 'Social Media', color: '#22c55e' }
  if (!rol) return { label: 'Equipo', color: AGENCY }
  return { label: rol.replace(/_/g, ' '), color: AGENCY }
}

export function ActividadView({
  rows, fecha, esAdmin, miNombre, migracionPendiente,
  marcas = [], habitosPorPersona = {},
}: {
  rows: ActividadRow[]
  fecha: string
  esAdmin: boolean
  miNombre: string
  migracionPendiente: boolean
  marcas?: MarcaMini[]
  habitosPorPersona?: Record<string, HabitoMini[]>
}) {
  const router = useRouter()
  const [detallado, setDetallado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const marcaMap = useMemo(() => {
    const m = new Map<string, MarcaMini>()
    for (const x of marcas) m.set(x.slug, x)
    return m
  }, [marcas])

  // Agrupar por persona, más activos primero.
  const porPersona = useMemo(() => {
    const m = new Map<string, ActividadRow[]>()
    for (const r of rows) {
      const arr = m.get(r.actor_nombre) ?? []
      arr.push(r)
      m.set(r.actor_nombre, arr)
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [rows])

  const totalAcciones = rows.length

  function resumen(arr: ActividadRow[]): { accion: string; n: number }[] {
    const c = new Map<string, number>()
    for (const r of arr) c.set(r.accion, (c.get(r.accion) ?? 0) + 1)
    return Array.from(c.entries()).map(([accion, n]) => ({ accion, n })).sort((a, b) => b.n - a.n)
  }

  /* Marcas tocadas por una persona (con conteo) — para el "breakdown" por marca. */
  function marcasDe(arr: ActividadRow[]): { m: MarcaMini; n: number }[] {
    const c = new Map<string, number>()
    for (const r of arr) if (r.marca_slug) c.set(r.marca_slug, (c.get(r.marca_slug) ?? 0) + 1)
    return Array.from(c.entries())
      .map(([slug, n]) => ({ m: marcaMap.get(slug) ?? { slug, nombre: slug, color: '#94a3b8', emoji: null }, n }))
      .sort((a, b) => b.n - a.n)
  }

  function textoReporte(): string {
    const L: string[] = [`📋 *Reporte de actividad — ${fechaBonita(fecha)}*`, '']
    if (porPersona.length === 0) L.push('Sin actividad registrada.')
    for (const [persona, arr] of porPersona) {
      L.push(`👤 *${persona}* · ${arr.length} ${arr.length === 1 ? 'acción' : 'acciones'}`)
      if (detallado) {
        for (const r of arr.slice().reverse()) {
          const { emoji } = accionMeta(r.accion)
          const marca = r.marca_slug ? marcaMap.get(r.marca_slug) : null
          L.push(`   ${hora(r.created_at)} · ${emoji} ${r.accion}${r.detalle ? ` — ${r.detalle}` : ''}${marca ? ` (${marca.emoji ?? ''} ${marca.nombre})` : (r.marca_slug ? ` (${r.marca_slug})` : '')}`)
        }
      } else {
        for (const { accion, n } of resumen(arr)) L.push(`   ${accionMeta(accion).emoji} ${accion}: ${n}`)
      }
      const habs = habitosPorPersona[persona] ?? []
      if (habs.length > 0) L.push(`   🌱 Hábitos: ${habs.map((h) => `${h.icono} ${h.nombre}`).join(', ')}`)
      L.push('')
    }
    L.push('— vía Distinto Agencia')
    return L.join('\n')
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoReporte())
      setCopiado(true)
      toast.success('Reporte copiado ✓ — pégalo en WhatsApp')
      setTimeout(() => setCopiado(false), 2500)
    } catch { toast.error('No se pudo copiar') }
  }

  function irAFecha(nueva: string) {
    const params = new URLSearchParams()
    if (nueva) params.set('fecha', nueva)
    router.push(`/actividad${params.toString() ? `?${params}` : ''}`)
  }

  const hoyLima = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const esHoy = fecha === hoyLima

  return (
    <main className="container mx-auto p-3 sm:p-6 max-w-3xl space-y-5 pb-16">
      {/* ============ HERO ============ */}
      <header
        className="rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${AGENCY} 0%, ${AGENCY_2} 55%, #ec4899 100%)`, boxShadow: '0 12px 34px -10px rgba(113,112,255,0.45)' }}
      >
        {/* Brillos decorativos */}
        <div aria-hidden style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', filter: 'blur(6px)' }} />
        <div aria-hidden style={{ position: 'absolute', bottom: -70, left: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/85 text-[12px] font-semibold uppercase tracking-[0.14em] mb-1.5">
            <ClipboardList className="w-4 h-4" /> Reporte de actividad
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight capitalize leading-tight">
            {fechaBonita(fecha)}
          </h1>
          <p className="text-white/85 text-sm mt-1">
            {esAdmin
              ? <>Equipo Distinto · <strong className="text-white">{porPersona.length}</strong> {porPersona.length === 1 ? 'persona' : 'personas'} · <strong className="text-white">{totalAcciones}</strong> {totalAcciones === 1 ? 'acción' : 'acciones'}</>
              : <>{miNombre} · <strong className="text-white">{totalAcciones}</strong> {totalAcciones === 1 ? 'acción' : 'acciones'} hoy</>}
          </p>
        </div>
      </header>

      {/* ============ CONTROLES ============ */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Navegación de fecha */}
        <div className="flex items-center gap-1">
          <button onClick={() => irAFecha(shiftFecha(fecha, -1))} title="Día anterior"
            className="w-9 h-9 rounded-lg border border-input bg-background hover:bg-muted flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date" value={fecha} onChange={(e) => e.target.value && irAFecha(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-background text-sm"
          />
          <button onClick={() => irAFecha(shiftFecha(fecha, 1))} disabled={esHoy} title="Día siguiente"
            className="w-9 h-9 rounded-lg border border-input bg-background hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!esHoy && (
          <button onClick={() => irAFecha(hoyLima)}
            className="h-9 px-3 rounded-lg border border-input bg-background hover:bg-muted text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors">
            <CalendarDays className="w-3.5 h-3.5" /> Hoy
          </button>
        )}

        {/* Toggle Resumido / Detallado */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-[12px]">
          <button onClick={() => setDetallado(false)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-all ${!detallado ? 'bg-white text-foreground shadow-sm ring-1 ring-black/[0.04]' : 'text-muted-foreground'}`}>
            <ListChecks className="w-3.5 h-3.5" /> Resumido
          </button>
          <button onClick={() => setDetallado(true)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-all ${detallado ? 'bg-white text-foreground shadow-sm ring-1 ring-black/[0.04]' : 'text-muted-foreground'}`}>
            <AlignLeft className="w-3.5 h-3.5" /> Detallado
          </button>
        </div>

        <button onClick={copiar}
          className="ml-auto inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-all"
          style={{ background: copiado ? '#16a34a' : `linear-gradient(135deg, ${AGENCY}, ${AGENCY_2})`, boxShadow: '0 6px 16px -6px rgba(113,112,255,0.5)' }}>
          {copiado ? <Check className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
          {copiado ? 'Copiado' : 'Copiar reporte'}
        </button>
      </div>

      {migracionPendiente && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-4 text-sm">
          ⚙️ El historial todavía no está activado. Falta crear la tabla <code>actividad</code> en
          Supabase. Una vez activado, acá empezará a salir todo lo que hace cada persona.
        </div>
      )}

      {!migracionPendiente && porPersona.length === 0 && (
        <div className="rounded-2xl border bg-white p-12 text-center">
          <div className="text-5xl mb-3">🌙</div>
          <p className="font-semibold text-foreground text-lg">Sin actividad este día</p>
          <p className="text-sm text-muted-foreground mt-1">Cuando el equipo trabaje, sus acciones aparecerán acá con todo el detalle.</p>
        </div>
      )}

      {/* ============ TARJETAS POR PERSONA ============ */}
      <div className="space-y-4">
        {porPersona.map(([persona, arr], idx) => {
          const rol = rolMeta(arr[0]?.rol ?? null)
          const habs = habitosPorPersona[persona] ?? []
          const brk = marcasDe(arr)
          return (
            <section
              key={persona}
              className="rounded-2xl bg-white ring-1 ring-black/[0.06] shadow-sm overflow-hidden"
              style={{ animation: 'mk-slide-up 0.45s cubic-bezier(.22,1,.36,1) both', animationDelay: `${Math.min(idx * 70, 500)}ms` }}
            >
              {/* Header persona */}
              <div className="flex items-center justify-between gap-2 p-4 pb-3 border-b border-border/60">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY_2})`, boxShadow: '0 4px 12px -3px rgba(113,112,255,0.5)' }}
                  >
                    {persona.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-[15px] leading-tight truncate">{persona}</p>
                    <span
                      className="inline-flex items-center mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full capitalize"
                      style={{ color: rol.color, background: `${rol.color}18` }}
                    >
                      {rol.label}
                    </span>
                  </div>
                </div>
                <span
                  className="text-[13px] font-bold shrink-0 px-3 py-1.5 rounded-xl"
                  style={{ color: AGENCY, background: `${AGENCY}12` }}
                >
                  {arr.length} {arr.length === 1 ? 'acción' : 'acciones'}
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* --- ACCIONES --- */}
                {detallado ? (
                  <ol className="relative space-y-3 pl-1">
                    {arr.map((r, i) => {
                      const meta = accionMeta(r.accion)
                      const marca = r.marca_slug ? (marcaMap.get(r.marca_slug) ?? null) : null
                      return (
                        <li key={i} className="flex items-start gap-3">
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] shrink-0"
                            style={{ background: `${meta.color}16` }}
                          >
                            {meta.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{hora(r.created_at)}</span>
                              <span className="text-[13.5px] font-medium text-foreground">{r.accion}</span>
                              {marca && (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                                  style={{ color: marca.color, background: `${marca.color}16` }}
                                >
                                  {marca.emoji ? `${marca.emoji} ` : ''}{marca.nombre}
                                </span>
                              )}
                            </div>
                            {r.detalle && <p className="text-[12.5px] text-muted-foreground truncate">{r.detalle}</p>}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {resumen(arr).map(({ accion, n }) => {
                      const meta = accionMeta(accion)
                      return (
                        <span
                          key={accion}
                          className="inline-flex items-center gap-2 text-[12.5px] font-medium pl-2 pr-1 py-1 rounded-full"
                          style={{ background: `${meta.color}12`, color: '#0f172a', border: `1px solid ${meta.color}28` }}
                        >
                          <span>{meta.emoji}</span>
                          <span>{accion}</span>
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-white text-[11px] font-bold" style={{ background: meta.color }}>{n}</span>
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* --- BREAKDOWN POR MARCA --- */}
                {brk.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Marcas</span>
                    {brk.map(({ m, n }) => (
                      <span key={m.slug} className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2 py-1 rounded-lg" style={{ background: `${m.color}12`, color: m.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                        {m.emoji ? `${m.emoji} ` : ''}{m.nombre}
                        <span className="opacity-70">· {n}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* --- HÁBITOS --- */}
                {habs.length > 0 && (
                  <div className="pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#16a34a] mt-3 mb-2">
                      🌱 Hábitos del día · {habs.length}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {habs.map((h, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-[12.5px] px-2.5 py-1 rounded-full" style={{ background: `${h.color}14`, color: '#0f172a' }}>
                          <span>{h.icono}</span>
                          <span className="font-medium">{h.nombre}</span>
                          {h.hora && <span className="font-mono text-[11px] text-muted-foreground">{h.hora}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
