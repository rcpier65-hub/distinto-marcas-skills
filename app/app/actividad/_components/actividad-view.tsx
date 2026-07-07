'use client'

/* Reporte de actividad por persona — versión RICA y SIGNIFICATIVA.
   Pedro 07-jul-2026: "no muestres 'mandó a aprobar' (se ve básico); muestra
   las tareas que realmente importan + hábitos". Los datos vienen derivados de
   las tablas fuente (tareas completadas + videos editados) — NO del log crudo
   de cambios de estado. Agrupado por tipo (✅ Tareas terminadas · N) con los
   NOMBRES, colores/emojis por marca, hábitos del día, colores de la agencia. */

import { useMemo, useRef, useState, useEffect, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ClipboardList, Copy as CopyIcon, Check, ListChecks, AlignLeft, ChevronLeft, ChevronRight, CalendarDays, Image as ImageIcon, Download, X } from 'lucide-react'

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

function shiftFecha(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const dt = new Date(y, m - 1, d + dias)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function fechaCorta(fecha: string): string {
  try {
    const [y, m, d] = fecha.split('-').map(Number)
    const dia = new Intl.DateTimeFormat('es-PE', { weekday: 'long' }).format(new Date(y, m - 1, d))
    return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d}`
  } catch { return fecha }
}

/* Emoji + color por TIPO de acción. */
function accionMeta(accion: string): { emoji: string; color: string } {
  const a = accion.toLowerCase()
  if (a.includes('editó') || a.includes('editar') || a.includes('edición') || a.includes('video')) return { emoji: '✂️', color: '#8b5cf6' }
  if (a.includes('completó') || a.includes('terminó') || a.includes('tarea')) return { emoji: '✅', color: '#16a34a' }
  if (a.includes('diseñ') || a.includes('disen')) return { emoji: '🎨', color: '#ec4899' }
  if (a.includes('grab')) return { emoji: '🎥', color: '#f43f5e' }
  if (a.includes('coment') || a.includes('respond')) return { emoji: '💬', color: '#14b8a6' }
  if (a.includes('portada')) return { emoji: '🖼️', color: '#a855f7' }
  return { emoji: '⚡', color: AGENCY }
}

/* Etiqueta bonita del grupo (para el encabezado de cada bloque). */
function grupoLabel(accion: string): string {
  const a = accion.toLowerCase()
  if (a.includes('tarea')) return 'Tareas terminadas'
  if (a.includes('video') || a.includes('editó') || a.includes('edición')) return 'Videos editados'
  if (a.includes('diseñ') || a.includes('disen')) return 'Diseños terminados'
  if (a.includes('grab')) return 'Grabaciones'
  if (a.includes('coment') || a.includes('respond')) return 'Comentarios respondidos'
  return accion
}

/* Agrupa las filas por tipo de acción, más items primero. */
function gruposDe(arr: ActividadRow[]): [string, ActividadRow[]][] {
  const m = new Map<string, ActividadRow[]>()
  for (const r of arr) {
    const a = m.get(r.accion) ?? []
    a.push(r)
    m.set(r.accion, a)
  }
  return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length)
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

  // Personas con actividad (tareas/videos) O con hábitos ese día.
  const porPersona = useMemo(() => {
    const m = new Map<string, ActividadRow[]>()
    for (const r of rows) {
      const arr = m.get(r.actor_nombre) ?? []
      arr.push(r)
      m.set(r.actor_nombre, arr)
    }
    // Incluir personas que solo hicieron hábitos (sin tareas/videos ese día).
    for (const nombre of Object.keys(habitosPorPersona)) {
      if (!m.has(nombre) && (habitosPorPersona[nombre]?.length ?? 0) > 0) m.set(nombre, [])
    }
    return Array.from(m.entries()).sort((a, b) => {
      const na = a[1].length + (habitosPorPersona[a[0]]?.length ?? 0)
      const nb = b[1].length + (habitosPorPersona[b[0]]?.length ?? 0)
      return nb - na
    })
  }, [rows, habitosPorPersona])

  const totalTareas = rows.length

  /* Líneas de texto (estilo WhatsApp, con emojis) del reporte de UNA persona. */
  function lineasPersona(persona: string, arr: ActividadRow[]): string[] {
    const L: string[] = []
    const habs = habitosPorPersona[persona] ?? []
    L.push(`👤 *${persona}*`)
    for (const [accion, items] of gruposDe(arr)) {
      L.push(`${accionMeta(accion).emoji} *${grupoLabel(accion)} (${items.length})*`)
      for (const r of items) {
        const marca = r.marca_slug ? marcaMap.get(r.marca_slug) : null
        L.push(`   • ${r.detalle ?? grupoLabel(accion)}${marca ? ` (${marca.nombre})` : ''}${detallado ? ` · ${hora(r.created_at)}` : ''}`)
      }
    }
    if (habs.length > 0) {
      L.push(`🌱 *Hábitos (${habs.length})*`)
      for (const h of habs) L.push(`   • ${h.icono} ${h.nombre}${h.hora ? ` · ${h.hora}` : ''}`)
    }
    return L
  }

  function textoReporte(): string {
    const L: string[] = [`📋 *Reporte del día — ${fechaBonita(fecha)}*`, '']
    if (porPersona.length === 0) L.push('Sin actividad registrada.')
    for (const [persona, arr] of porPersona) { L.push(...lineasPersona(persona, arr), '') }
    L.push('— vía Distinto Agencia')
    return L.join('\n')
  }

  function textoReportePersona(persona: string, arr: ActividadRow[]): string {
    return [`📋 *Reporte del día — ${fechaBonita(fecha)}*`, '', ...lineasPersona(persona, arr), '', '— vía Distinto Agencia'].join('\n')
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoReporte())
      setCopiado(true)
      toast.success('Reporte copiado ✓ — pégalo en WhatsApp')
      setTimeout(() => setCopiado(false), 2500)
    } catch { toast.error('No se pudo copiar') }
  }

  async function copiarTexto(persona: string, arr: ActividadRow[]) {
    try {
      await navigator.clipboard.writeText(textoReportePersona(persona, arr))
      toast.success('Texto del reporte copiado ✓ — pégalo en WhatsApp')
    } catch { toast.error('No se pudo copiar el texto') }
  }

  function irAFecha(nueva: string) {
    const params = new URLSearchParams()
    if (nueva) params.set('fecha', nueva)
    router.push(`/actividad${params.toString() ? `?${params}` : ''}`)
  }

  /* ---------- Imagen del reporte (por persona) para WhatsApp ---------- */
  const [imagenDe, setImagenDe] = useState<[string, ActividadRow[]] | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [imgBusy, setImgBusy] = useState<false | 'copy' | 'download'>(false)

  useEffect(() => {
    if (!imagenDe) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setImagenDe(null) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [imagenDe])

  async function capturarBlob(): Promise<Blob> {
    if (!cardRef.current) throw new Error('sin tarjeta')
    const { toBlob } = await import('html-to-image')
    if (document.fonts?.ready) await document.fonts.ready
    const blob = await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true })
    if (!blob) throw new Error('No se pudo generar la imagen')
    return blob
  }

  function descargar(blob: Blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${(imagenDe?.[0] ?? 'dia').toLowerCase().replace(/\s+/g, '-')}-${fecha}.png`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  async function copiarImagen() {
    setImgBusy('copy')
    try {
      const blob = await capturarBlob()
      try {
        if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          toast.success('Imagen copiada ✓ — pégala en WhatsApp')
          return
        }
        throw new Error('sin portapapeles')
      } catch {
        descargar(blob)
        toast.success('Imagen descargada ✓ — adjúntala en WhatsApp')
      }
    } catch {
      toast.error('No se pudo generar la imagen')
    } finally { setImgBusy(false) }
  }

  async function descargarImagen() {
    setImgBusy('download')
    try { descargar(await capturarBlob()); toast.success('Imagen descargada ✓') }
    catch { toast.error('No se pudo generar la imagen') }
    finally { setImgBusy(false) }
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
        <div aria-hidden style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', filter: 'blur(6px)' }} />
        <div aria-hidden style={{ position: 'absolute', bottom: -70, left: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/85 text-[12px] font-semibold uppercase tracking-[0.14em] mb-1.5">
            <ClipboardList className="w-4 h-4" /> Reporte del día
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight capitalize leading-tight">
            {fechaBonita(fecha)}
          </h1>
          <p className="text-white/85 text-sm mt-1">
            {esAdmin
              ? <>Equipo Distinto · <strong className="text-white">{porPersona.length}</strong> {porPersona.length === 1 ? 'persona' : 'personas'} · <strong className="text-white">{totalTareas}</strong> {totalTareas === 1 ? 'cosa hecha' : 'cosas hechas'}</>
              : <>{miNombre} · <strong className="text-white">{totalTareas}</strong> {totalTareas === 1 ? 'tarea hecha' : 'tareas hechas'} hoy</>}
          </p>
        </div>
      </header>

      {/* ============ CONTROLES ============ */}
      <div className="flex items-center gap-2 flex-wrap">
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

        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-[12px]" title="Detallado agrega la hora de cada cosa">
          <button onClick={() => setDetallado(false)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-all ${!detallado ? 'bg-white text-foreground shadow-sm ring-1 ring-black/[0.04]' : 'text-muted-foreground'}`}>
            <ListChecks className="w-3.5 h-3.5" /> Resumido
          </button>
          <button onClick={() => setDetallado(true)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-medium transition-all ${detallado ? 'bg-white text-foreground shadow-sm ring-1 ring-black/[0.04]' : 'text-muted-foreground'}`}>
            <AlignLeft className="w-3.5 h-3.5" /> Con hora
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
          ⚙️ El historial todavía no está activado. Una vez activado, acá saldrá todo lo que hizo cada persona.
        </div>
      )}

      {!migracionPendiente && porPersona.length === 0 && (
        <div className="rounded-2xl border bg-white p-12 text-center">
          <div className="text-5xl mb-3">🌙</div>
          <p className="font-semibold text-foreground text-lg">Sin actividad este día</p>
          <p className="text-sm text-muted-foreground mt-1">Cuando el equipo termine tareas o edite videos, aparecerá acá.</p>
        </div>
      )}

      {/* ============ TARJETAS POR PERSONA ============ */}
      <div className="space-y-4">
        {porPersona.map(([persona, arr], idx) => {
          const rol = rolMeta(arr[0]?.rol ?? null)
          const habs = habitosPorPersona[persona] ?? []
          const grupos = gruposDe(arr)
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="hidden sm:inline text-[13px] font-bold px-2.5 py-1.5 rounded-xl" style={{ color: AGENCY, background: `${AGENCY}12` }}>
                    {arr.length + habs.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => copiarTexto(persona, arr)}
                    title="Copiar el texto del reporte para WhatsApp"
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    <CopyIcon className="w-3.5 h-3.5" /> Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setImagenDe([persona, arr])}
                    title="Generar la imagen del reporte para WhatsApp"
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-white transition-all"
                    style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY_2})`, boxShadow: '0 4px 12px -4px rgba(113,112,255,0.6)' }}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Imagen
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* --- Grupos: Tareas terminadas / Videos editados / … --- */}
                {grupos.map(([accion, items]) => {
                  const meta = accionMeta(accion)
                  return (
                    <div key={accion}>
                      <div className="flex items-center gap-2 mb-2 text-[12px] font-bold uppercase tracking-[0.04em]" style={{ color: meta.color }}>
                        <span className="text-[15px]">{meta.emoji}</span>
                        {grupoLabel(accion)} · {items.length}
                      </div>
                      <ul className="space-y-1.5">
                        {items.map((r, i) => {
                          const marca = r.marca_slug ? (marcaMap.get(r.marca_slug) ?? null) : null
                          return (
                            <li key={i} className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: marca?.color ?? meta.color }} />
                              <span className="text-[13.5px] font-medium text-foreground flex-1 min-w-0 truncate">
                                {r.detalle ?? grupoLabel(accion)}
                              </span>
                              {marca && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md shrink-0" style={{ color: marca.color, background: `${marca.color}16` }}>
                                  {marca.emoji ? `${marca.emoji} ` : ''}{marca.nombre}
                                </span>
                              )}
                              {detallado && <span className="font-mono text-[11px] text-muted-foreground tabular-nums shrink-0">{hora(r.created_at)}</span>}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}

                {arr.length === 0 && habs.length > 0 && (
                  <p className="text-[12.5px] text-muted-foreground italic">Sin tareas ni videos hoy — pero cumplió sus hábitos 👇</p>
                )}

                {/* --- Hábitos --- */}
                {habs.length > 0 && (
                  <div className="pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.04em] text-[#16a34a] mb-2">
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

      {/* ============ MODAL: IMAGEN PARA WHATSAPP ============ */}
      {imagenDe && (
        <div
          onClick={() => setImagenDe(null)}
          className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-3 sm:p-5 overflow-auto"
          style={{ background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(4px)' }}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[400px] flex flex-col gap-3 my-auto">
            <div className="flex items-center gap-2">
              <button onClick={copiarImagen} disabled={!!imgBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY_2})` }}>
                {imgBusy === 'copy' ? '⏳ Generando…' : <><ImageIcon className="w-4 h-4" /> Copiar imagen</>}
              </button>
              <button onClick={descargarImagen} disabled={!!imgBusy}
                className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-white text-foreground font-semibold text-sm border disabled:opacity-60">
                {imgBusy === 'download' ? '⏳' : <><Download className="w-4 h-4" /> Bajar</>}
              </button>
              <button onClick={() => setImagenDe(null)} aria-label="Cerrar"
                className="w-11 h-11 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ReporteImagenCard
              ref={cardRef}
              persona={imagenDe[0]}
              arr={imagenDe[1]}
              habs={habitosPorPersona[imagenDe[0]] ?? []}
              rol={rolMeta(imagenDe[1][0]?.rol ?? null)}
              fecha={fecha}
              marcaMap={marcaMap}
            />
          </div>
        </div>
      )}
    </main>
  )
}

/* ============ Tarjeta imagen (se captura con html-to-image) ============ */
const ReporteImagenCard = forwardRef<HTMLDivElement, {
  persona: string
  arr: ActividadRow[]
  habs: HabitoMini[]
  rol: { label: string; color: string }
  fecha: string
  marcaMap: Map<string, MarcaMini>
}>(function ReporteImagenCard({ persona, arr, habs, rol, fecha, marcaMap }, ref) {
  const grupos = gruposDe(arr)
  return (
    <div ref={ref} style={{ width: 384, background: 'linear-gradient(160deg, #f5f3ff 0%, #fdf2f8 55%, #fff7ed 100%)', padding: 26, fontFamily: 'Inter Tight, system-ui, sans-serif', color: '#0f172a', boxSizing: 'border-box', borderRadius: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY_2})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800 }}>
            {persona.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{persona}</div>
            <div style={{ fontSize: 11.5, color: rol.color, fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 }}>{rol.label}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1.5, color: '#a1a1c9' }}>REPORTE</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: AGENCY }}>{fechaCorta(fecha)}</div>
        </div>
      </div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(16,24,40,0.05)' }}>
          <div style={{ fontSize: 20 }}>✅</div>
          <div style={{ fontSize: 25, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{arr.length}</div>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1, color: '#64748b', marginTop: 3 }}>HECHAS</div>
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 8px rgba(16,24,40,0.05)' }}>
          <div style={{ fontSize: 20 }}>🌱</div>
          <div style={{ fontSize: 25, fontWeight: 800, color: AGENCY, lineHeight: 1 }}>{habs.length}</div>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1, color: '#64748b', marginTop: 3 }}>HÁBITOS</div>
        </div>
      </div>
      {/* Grupos */}
      {grupos.map(([accion, items]) => {
        const meta = accionMeta(accion)
        return (
          <div key={accion} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: meta.color, marginBottom: 8 }}>
              {meta.emoji} {grupoLabel(accion)} · {items.length}
            </div>
            {items.map((r, i) => {
              const marca = r.marca_slug ? marcaMap.get(r.marca_slug) : null
              return (
                <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '9px 11px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: marca?.color ?? meta.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.detalle ?? grupoLabel(accion)}</span>
                  {marca && <span style={{ fontSize: 10, fontWeight: 700, color: marca.color, background: `${marca.color}18`, padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>{marca.nombre}</span>}
                </div>
              )
            })}
          </div>
        )
      })}
      {arr.length === 0 && (
        <div style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic', marginBottom: 12 }}>Sin tareas ni videos — pero cumplió sus hábitos 🌱</div>
      )}
      {/* Hábitos */}
      {habs.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#16a34a', marginBottom: 8 }}>🌱 Hábitos del día</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {habs.map((h, i) => (
              <span key={i} style={{ fontSize: 11.5, background: `${h.color}18`, padding: '5px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span>{h.icono}</span><span style={{ fontWeight: 600 }}>{h.nombre}</span>{h.hora && <span style={{ color: '#94a3b8', fontSize: 10 }}>{h.hora}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* Footer */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(15,23,42,0.08)', textAlign: 'center', fontSize: 11, fontStyle: 'italic', color: '#94a3b8' }}>— vía Distinto Agencia</div>
    </div>
  )
})
