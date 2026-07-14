'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckCircle2, Clock, ExternalLink, LogOut, ChevronDown, ChevronLeft, ChevronRight,
  ThumbsUp, Sparkles, PartyPopper, CalendarDays, List, BarChart3, FileText, Play, X, Palette,
} from 'lucide-react'
import { MarcaLogo } from '@/components/marca-logo'
import { ActivarNotificaciones } from '@/components/activar-notificaciones'
import { createClient } from '@/lib/supabase/client'
import { aprobarVideoCliente } from '../_actions'
import { ClienteRealtime } from './cliente-realtime'

export type PubCliente = {
  id: string
  titulo: string
  fecha: string | null
  publicadoAt: string | null
  aprobadoAt: string | null
  redes: string[]
  portada: string | null
  video: string | null
  driveResultado: string | null
  linkTiktok: string | null
  linkInstagram: string | null
  copy: string | null
  guion: string | null
  estado: string | null
  fechaEntrega: string | null
  esDiseno: boolean
  estadoTarea: string | null
}

const RED_EMOJI: Record<string, string> = { instagram: '📸', facebook: '👍', tiktok: '🎵', linkedin: '💼', youtube: '▶️' }
const RED_NOMBRE: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn', youtube: 'YouTube' }
const DIAS_SEM = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DIAS_SEM_LARGO = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/* Colores por estado de una pieza (puntos del calendario, chips, píldoras). */
const C_APROBADO = '#16a34a'   // verde — el cliente ya lo aprobó
const C_PUBLICADO = '#14b8a6'  // teal  — ya se publicó
const C_PORPUB = '#f59e0b'     // ámbar — por publicar

function esPublicada(p: PubCliente) { return (p.estado ?? '') === 'publicado' }
/* "En diseño" = tarea de diseño (Aylin) que aún se está trabajando. Se muestran
   en su propia sección para que el cliente vea qué se está diseñando para él. */
function enDiseno(p: PubCliente) {
  return p.esDiseno && !esPublicada(p) && (p.estadoTarea === 'sin_empezar' || p.estadoTarea === 'en_progreso' || p.estadoTarea === 'pausada' || p.estadoTarea == null)
}

function fechaBonita(iso: string | null): string {
  if (!iso) return ''
  const base = iso.includes('T') ? iso : iso + 'T12:00:00'
  try { return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(base)) } catch { return iso }
}
function capitalizar(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }
function ymd(y: number, m: number, d: number) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }
/* Helpers de fecha basados en strings YYYY-MM-DD (TZ-safe: no usan UTC). */
function parseYmd(s: string): Date { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
function toYmd(dt: Date): string { return ymd(dt.getFullYear(), dt.getMonth(), dt.getDate()) }
function addDays(s: string, n: number): string { const dt = parseYmd(s); dt.setDate(dt.getDate() + n); return toYmd(dt) }
function mondayOf(s: string): string { const dt = parseYmd(s); const off = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - off); return toYmd(dt) }
function rangoSemana(a: string, b: string): string {
  const da = parseYmd(a), db = parseYmd(b)
  if (da.getMonth() === db.getMonth()) return `${da.getDate()} – ${db.getDate()} ${MESES_CORTOS[db.getMonth()]} ${db.getFullYear()}`
  return `${da.getDate()} ${MESES_CORTOS[da.getMonth()]} – ${db.getDate()} ${MESES_CORTOS[db.getMonth()]} ${db.getFullYear()}`
}

function urlOk(u: string | null): string | null {
  if (!u) return null
  const t = u.trim()
  if (!t) return null
  return t.startsWith('http') ? t : `https://${t}`
}
/* Extrae el ID de un enlace de Google Drive (open?id=, uc?id=, /file/d/ID/). */
function driveId(url: string | null): string | null {
  if (!url) return null
  const u = url.trim()
  if (!/drive\.google\.com|docs\.google\.com/.test(u)) return null
  return (u.match(/[?&]id=([-\w]+)/)?.[1]) ?? (u.match(/\/d\/([-\w]+)/)?.[1]) ?? null
}
/* Convierte el link de Drive en un embed reproducible dentro del portal. */
function driveEmbed(url: string | null): string | null {
  const id = driveId(url)
  return id ? `https://drive.google.com/file/d/${id}/preview` : null
}

export function ClientePortalView({
  marcaId, marcaNombre, marcaSlug, marcaEmoji, marcaColor, contacto, hoy, pubs,
}: {
  marcaId: string
  marcaNombre: string
  marcaSlug: string
  marcaEmoji: string | null
  marcaColor: string
  contacto: string | null
  hoy: string
  pubs: PubCliente[]
}) {
  const router = useRouter()
  const [aprobados, setAprobados] = useState<Record<string, string>>({})
  const [expandido, setExpandido] = useState<string | null>(null)
  const [aprobando, setAprobando] = useState<string | null>(null)
  const [vista, setVista] = useState<'cal' | 'lista' | 'stats'>('cal')
  /* Modo del calendario. Arranca en MES (dashboard principal); el cliente puede
     luego elegir Semana o Día. Pedro 14-jul-2026. */
  const [calMode, setCalMode] = useState<'dia' | 'semana' | 'mes'>('mes')
  /* Publicación abierta en la ventana de detalle (al tocar una tarjeta del
     calendario). El cliente ve el video ahí y puede aprobarlo. */
  const [modalPub, setModalPub] = useState<PubCliente | null>(null)

  function esAprobado(p: PubCliente) { return !!p.aprobadoAt || !!aprobados[p.id] }
  function colorEstado(p: PubCliente) {
    if (esAprobado(p)) return C_APROBADO
    if (esPublicada(p)) return C_PUBLICADO
    return C_PORPUB
  }
  function estadoLabel(p: PubCliente) { return esAprobado(p) ? 'Aprobado' : esPublicada(p) ? 'Publicado' : 'Por publicar' }
  function redesStr(p: PubCliente) { return p.redes.map((r) => RED_EMOJI[r] ?? r).join('') }

  /* Piezas "normales" (publicaciones) vs diseños en proceso de Aylin. */
  const pubsNormales = useMemo(() => pubs.filter((p) => !enDiseno(p)), [pubs])
  const disenosEnProceso = useMemo(
    () => pubs.filter(enDiseno).sort((a, b) => (a.fechaEntrega ?? a.fecha ?? '9999').localeCompare(b.fechaEntrega ?? b.fecha ?? '9999')),
    [pubs],
  )

  /* Agrupamos las publicaciones por día (YYYY-MM-DD) para el calendario. */
  const porDia = useMemo(() => {
    const m = new Map<string, PubCliente[]>()
    for (const p of pubsNormales) {
      if (!p.fecha) continue
      const k = p.fecha.slice(0, 10)
      const arr = m.get(k)
      if (arr) arr.push(p); else m.set(k, [p])
    }
    return m
  }, [pubsNormales])

  const [hY, hM] = hoy.split('-').map(Number)
  const [ym, setYm] = useState<{ y: number; m: number }>({ y: hY, m: hM - 1 })
  const [sel, setSel] = useState<string>(hoy)
  const [weekStart, setWeekStart] = useState<string>(() => mondayOf(hoy))

  const { celdas, tituloMes } = useMemo(() => {
    const { y, m } = ym
    const primero = new Date(y, m, 1)
    const offset = (primero.getDay() + 6) % 7
    const dias = new Date(y, m + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= dias; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const titulo = capitalizar(new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date(y, m, 1)))
    return { celdas: cells, tituloMes: titulo }
  }, [ym])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekLabel = rangoSemana(weekDays[0], weekDays[6])
  const weekCount = weekDays.reduce((n, k) => n + (porDia.get(k)?.length ?? 0), 0)
  const mesPrefix = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}`
  const mesCount = useMemo(() => pubsNormales.filter((p) => (p.fecha ?? '').startsWith(mesPrefix)).length, [pubsNormales, mesPrefix])

  const itemsDelDia = porDia.get(sel) ?? []

  function irMes(delta: number) {
    setYm((cur) => {
      const nd = new Date(cur.y, cur.m + delta, 1)
      const ny = nd.getFullYear(), nm = nd.getMonth()
      let primerConContenido: string | null = null
      const dias = new Date(ny, nm + 1, 0).getDate()
      for (let d = 1; d <= dias; d++) {
        const k = ymd(ny, nm, d)
        if (porDia.has(k)) { primerConContenido = k; break }
      }
      setSel(primerConContenido ?? ymd(ny, nm, 1))
      return { y: ny, m: nm }
    })
  }
  function navPrev() {
    if (calMode === 'dia') setSel((s) => addDays(s, -1))
    else if (calMode === 'semana') setWeekStart((w) => addDays(w, -7))
    else irMes(-1)
  }
  function navNext() {
    if (calMode === 'dia') setSel((s) => addDays(s, 1))
    else if (calMode === 'semana') setWeekStart((w) => addDays(w, 7))
    else irMes(1)
  }
  function navHoy() { setSel(hoy); setWeekStart(mondayOf(hoy)); setYm({ y: hY, m: hM - 1 }) }
  const navLabel = calMode === 'dia' ? capitalizar(fechaBonita(sel)) : calMode === 'semana' ? weekLabel : tituloMes
  const navCount = calMode === 'dia' ? itemsDelDia.length : calMode === 'semana' ? weekCount : mesCount

  /* Vista lista: separación por publicar / publicadas (sin los diseños en proceso). */
  const porPublicar = useMemo(
    () => pubsNormales.filter((p) => !esPublicada(p)).sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? '')),
    [pubsNormales],
  )
  const publicadas = useMemo(
    () => pubsNormales.filter((p) => esPublicada(p)).sort((a, b) => (b.publicadoAt ?? b.fecha ?? '').localeCompare(a.publicadoAt ?? a.fecha ?? '')),
    [pubsNormales],
  )

  async function salir() {
    try { await createClient().auth.signOut() } catch { /* noop */ }
    router.push('/login'); router.refresh()
  }

  async function aprobar(id: string) {
    setAprobando(id)
    const r = await aprobarVideoCliente(id)
    setAprobando(null)
    if (!r.ok) { toast.error(r.error); return }
    setAprobados((s) => ({ ...s, [id]: r.aprobadoAt }))
    toast.success('🎉 ¡Aprobado! Le avisamos al equipo.')
  }

  function renderCard(p: PubCliente) {
    return (
      <PubCard
        key={p.id} p={p} color={marcaColor} emoji={marcaEmoji}
        publicada={esPublicada(p)}
        abierto={expandido === p.id}
        onToggle={() => setExpandido((e) => e === p.id ? null : p.id)}
        aprobado={esAprobado(p)}
        aprobandoAhora={aprobando === p.id}
        onAprobar={() => aprobar(p.id)}
        puedeAprobar={!esPublicada(p)}
      />
    )
  }

  /* Al tocar una tarjeta del calendario (Semana/Mes): abre la ventana de
     detalle para ver el video y aprobarlo. */
  function onChip(p: PubCliente) { setModalPub(p) }

  return (
    <main className="mx-auto max-w-2xl lg:max-w-6xl p-4 sm:p-6 lg:p-8 pb-28 space-y-5 lg:space-y-6">
      <ClienteRealtime marcaId={marcaId} />

      {/* HEADER de marca */}
      <header className="relative overflow-hidden rounded-3xl p-5 sm:p-6 lg:p-8 text-white" style={{ background: `linear-gradient(135deg, ${marcaColor}, ${marcaColor}b0 55%, #ec4899)` }}>
        <div aria-hidden className="absolute -top-10 -right-8 w-40 h-40 lg:w-56 lg:h-56 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div aria-hidden className="absolute -bottom-12 -left-6 w-36 h-36 lg:w-52 lg:h-52 rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }} />
        <div className="relative flex items-center gap-3 lg:gap-5">
          <div className="bg-white rounded-2xl p-2 lg:p-3 shrink-0 shadow-lg">
            <MarcaLogo slug={marcaSlug} nombre={marcaNombre} emoji={marcaEmoji} size={48} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] lg:text-xs uppercase tracking-widest text-white/85 font-bold">Portal del cliente</div>
            <h1 className="text-2xl lg:text-4xl font-extrabold leading-tight truncate">{marcaNombre}</h1>
            {contacto && <div className="text-[13px] lg:text-[15px] text-white/90">Hola, {contacto} 👋</div>}
          </div>
          <button onClick={salir} title="Cerrar sesión" className="relative shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </header>

      {/* Activar notificaciones */}
      <div className="rounded-2xl border-2 bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderColor: `${marcaColor}33` }}>
        <div className="text-sm min-w-0 flex-1">
          <div className="font-bold flex items-center gap-1.5"><span>🔔</span> Avísame cuando publiquen</div>
          <div className="text-xs text-muted-foreground">Con un toque activas las notificaciones y recibes un aviso en tu celular apenas se publique tu contenido.</div>
        </div>
        <ActivarNotificaciones className="w-full sm:w-auto" />
      </div>

      {/* Toggle Calendario / Lista / Estadísticas */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/60 w-full max-w-[380px] mx-auto">
        <ToggleBtn active={vista === 'cal'} onClick={() => setVista('cal')} color={marcaColor} icon={<CalendarDays className="w-4 h-4" />} label="Calendario" />
        <ToggleBtn active={vista === 'lista'} onClick={() => setVista('lista')} color={marcaColor} icon={<List className="w-4 h-4" />} label="Lista" />
        <ToggleBtn active={vista === 'stats'} onClick={() => setVista('stats')} color={marcaColor} icon={<BarChart3 className="w-4 h-4" />} label="Stats" />
      </div>

      {vista === 'cal' && (
        <div className="space-y-4">
          <section className="rounded-3xl bg-card p-4 sm:p-5 lg:p-6 shadow-sm ring-1 ring-black/[0.04]">
            {/* Barra: navegación + modo Día/Semana/Mes + conteo */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1.5">
                <button onClick={navPrev} aria-label="Anterior" className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-muted transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <div className="font-extrabold text-[15px] lg:text-lg text-center min-w-[130px] lg:min-w-[190px] capitalize">{navLabel}</div>
                <button onClick={navNext} aria-label="Siguiente" className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-muted transition-colors"><ChevronRight className="w-5 h-5" /></button>
                <button onClick={navHoy} className="ml-1 h-9 px-3.5 rounded-xl text-[13px] font-bold transition-colors" style={{ background: `${marcaColor}18`, color: marcaColor }}>Hoy</button>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60">
                <ModoBtn active={calMode === 'mes'} onClick={() => setCalMode('mes')} color={marcaColor} label="Mes" />
                <ModoBtn active={calMode === 'semana'} onClick={() => setCalMode('semana')} color={marcaColor} label="Semana" />
                <ModoBtn active={calMode === 'dia'} onClick={() => setCalMode('dia')} color={marcaColor} label="Día" />
              </div>
              <div className="text-[12px] font-semibold text-muted-foreground w-full text-center sm:w-auto sm:text-right">
                {navCount} publicaci{navCount === 1 ? 'ón' : 'ones'}
              </div>
            </div>

            {/* SEMANA — columnas por día, como la grilla del equipo */}
            {calMode === 'semana' && (
              <WeekView
                weekDays={weekDays} porDia={porDia} hoy={hoy} marcaColor={marcaColor}
                colorEstado={colorEstado} estadoLabel={estadoLabel} redesStr={redesStr}
                onChip={onChip} expandidoId={expandido}
              />
            )}

            {/* MES — calendario con las TARJETAS dentro de cada día (como la
                semana, pero mes completo). Pedro 14-jul-2026. */}
            {calMode === 'mes' && (
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="min-w-[560px] lg:min-w-0">
                  <div className="grid grid-cols-7 gap-1 lg:gap-1.5 mb-1">
                    {DIAS_SEM_LARGO.map((d, i) => <div key={i} className="text-center text-[10px] lg:text-[12px] font-bold text-muted-foreground py-1">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden" style={{ background: 'var(--border, #e5e7eb)', border: '1px solid var(--border, #e5e7eb)' }}>
                    {celdas.map((d, i) => {
                      if (d === null) return <div key={i} className="bg-muted/20 min-h-[68px] lg:min-h-[104px]" />
                      const k = ymd(ym.y, ym.m, d)
                      const items = porDia.get(k) ?? []
                      const isHoy = k === hoy
                      return (
                        <div key={i} className="p-1 lg:p-1.5 min-h-[68px] lg:min-h-[104px] flex flex-col gap-1"
                          style={{ background: isHoy ? `${marcaColor}12` : 'var(--card, #fff)', boxShadow: isHoy ? `inset 0 0 0 2px ${marcaColor}` : undefined }}>
                          <div className="text-[11px] lg:text-[13px] font-extrabold leading-none" style={{ color: isHoy ? marcaColor : undefined }}>{d}</div>
                          <div className="flex flex-col gap-1 overflow-hidden">
                            {items.slice(0, 3).map((p) => {
                              const c = colorEstado(p)
                              const activo = p.id === expandido
                              return (
                                <button key={p.id} onClick={() => onChip(p)}
                                  className="text-left rounded px-1.5 py-1 leading-tight transition-all"
                                  style={{ borderLeft: `3px solid ${c}`, background: activo ? `${c}30` : `${c}18`, boxShadow: activo ? `0 0 0 1.5px ${c}` : undefined }}>
                                  <span className="block text-[9px] lg:text-[11px] font-bold truncate" style={{ color: c }}>{p.titulo}</span>
                                </button>
                              )
                            })}
                            {items.length > 3 && <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground">+{items.length - 3} más</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Leyenda */}
            <div className="flex items-center justify-center gap-3 flex-wrap mt-3 pt-3 border-t text-[11px] text-muted-foreground">
              <Leyenda color={C_PORPUB} label="Por publicar" />
              <Leyenda color={C_PUBLICADO} label="Publicado" />
              <Leyenda color={C_APROBADO} label="Aprobado" />
            </div>
          </section>

          {/* DÍA — lista de tarjetas del día (Semana/Mes abren ventana al tocar) */}
          {calMode === 'dia' && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 text-[13px] lg:text-sm font-bold px-3 py-1.5 rounded-full" style={{ background: `${marcaColor}18`, color: marcaColor }}>
                  <CalendarDays className="w-4 h-4" /> {capitalizar(fechaBonita(sel))}
                </span>
                {itemsDelDia.length > 0 && <span className="text-[12px] font-bold text-muted-foreground">{itemsDelDia.length}</span>}
              </div>
              {itemsDelDia.length === 0 ? (
                <Vacio texto="No hay publicaciones este día. Usa ‹ › para ver otro día." />
              ) : (
                <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">{itemsDelDia.map(renderCard)}</div>
              )}
            </section>
          )}
        </div>
      )}

      {vista === 'lista' && (
        <>
          {disenosEnProceso.length > 0 && (
            <section>
              <SecHeader icon={<Palette className="w-4 h-4" />} label="En diseño" count={disenosEnProceso.length} color="#8b5cf6" />
              <p className="text-[12px] text-muted-foreground -mt-1 mb-2.5">El equipo está diseñando estas piezas para tu marca. 🎨</p>
              <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:items-start">{disenosEnProceso.map(renderCard)}</div>
            </section>
          )}
          <section>
            <SecHeader icon={<Clock className="w-4 h-4" />} label="Por publicar" count={porPublicar.length} color={C_PORPUB} />
            {porPublicar.length === 0 ? (
              <Vacio texto="No hay publicaciones programadas por ahora." />
            ) : (
              <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:items-start">{porPublicar.map(renderCard)}</div>
            )}
          </section>
          <section className="mt-5">
            <SecHeader icon={<CheckCircle2 className="w-4 h-4" />} label="Publicadas" count={publicadas.length} color={C_PUBLICADO} />
            {publicadas.length === 0 ? (
              <Vacio texto="Todavía no hay publicaciones publicadas." />
            ) : (
              <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:items-start">{publicadas.map(renderCard)}</div>
            )}
          </section>
        </>
      )}

      {vista === 'stats' && (
        <StatsView pubs={pubsNormales} publicadas={publicadas} porPublicar={porPublicar} enDisenoCount={disenosEnProceso.length} color={marcaColor} hoy={hoy} esAprobado={esAprobado} />
      )}

      <p className="text-center text-[11px] text-muted-foreground pt-2">Portal de clientes · Distinto Agencia</p>

      {modalPub && (
        <DetalleModal
          p={modalPub} color={marcaColor} emoji={marcaEmoji}
          publicada={esPublicada(modalPub)}
          aprobado={esAprobado(modalPub)}
          aprobandoAhora={aprobando === modalPub.id}
          onAprobar={() => aprobar(modalPub.id)}
          puedeAprobar={!esPublicada(modalPub)}
          onClose={() => setModalPub(null)}
        />
      )}
    </main>
  )
}

/* Ventana de detalle de una publicación (al tocarla en el calendario). Muestra
   el video (chico) y el botón Aprobar. Es un panel centrado/hoja inferior — NO
   el reproductor a pantalla completa. */
function DetalleModal({ p, color, emoji, publicada, aprobado, aprobandoAhora, onAprobar, puedeAprobar, onClose }: {
  p: PubCliente; color: string; emoji: string | null; publicada: boolean
  aprobado: boolean; aprobandoAhora: boolean; onAprobar: () => void; puedeAprobar: boolean; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ background: 'rgba(15,23,42,0.5)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b bg-card">
          <div className="text-[13px] font-bold flex items-center gap-1.5 min-w-0" style={{ color }}>
            <CalendarDays className="w-4 h-4 shrink-0" /> <span className="truncate">{capitalizar(fechaBonita(p.fecha)) || 'Publicación'}</span>
          </div>
          <button onClick={onClose} className="shrink-0 inline-flex items-center gap-1 text-[13px] font-bold px-3 h-9 rounded-xl hover:bg-muted transition-colors"><X className="w-4 h-4" /> Cerrar</button>
        </div>
        <div className="p-3">
          <PubCard p={p} color={color} emoji={emoji} publicada={publicada} abierto onToggle={onClose}
            aprobado={aprobado} aprobandoAhora={aprobandoAhora} onAprobar={onAprobar} puedeAprobar={puedeAprobar} />
        </div>
      </div>
    </div>
  )
}

/* ===== Grilla SEMANAL — columnas por día (estilo grilla del equipo) ===== */
function WeekView({ weekDays, porDia, hoy, marcaColor, colorEstado, estadoLabel, redesStr, onChip, expandidoId }: {
  weekDays: string[]
  porDia: Map<string, PubCliente[]>
  hoy: string
  marcaColor: string
  colorEstado: (p: PubCliente) => string
  estadoLabel: (p: PubCliente) => string
  redesStr: (p: PubCliente) => string
  onChip: (p: PubCliente) => void
  expandidoId: string | null
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 lg:grid lg:grid-cols-7 lg:gap-2.5 lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0">
      {weekDays.map((k) => {
        const dt = parseYmd(k)
        const dow = (dt.getDay() + 6) % 7
        const items = porDia.get(k) ?? []
        const isHoy = k === hoy
        return (
          <div key={k} className="min-w-[150px] flex-shrink-0 lg:min-w-0 lg:flex-shrink">
            <div className="rounded-xl px-2 py-1.5 mb-2 text-center" style={{ background: isHoy ? marcaColor : 'var(--muted, #f1f5f9)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isHoy ? '#fff' : 'var(--muted-foreground, #94a3b8)' }}>{DIAS_SEM_LARGO[dow]}</div>
              <div className="text-lg font-extrabold leading-tight" style={{ color: isHoy ? '#fff' : undefined }}>{dt.getDate()}</div>
              {items.length > 0 && <div className="text-[10px] font-bold" style={{ color: isHoy ? '#fff' : 'var(--muted-foreground, #94a3b8)' }}>{items.length} pub</div>}
            </div>
            <div className="space-y-1.5 min-h-[40px]">
              {items.length === 0 ? (
                <div className="text-center text-[11px] text-muted-foreground/40 py-2">—</div>
              ) : items.map((p) => {
                const c = colorEstado(p)
                const activo = p.id === expandidoId
                const redes = redesStr(p)
                return (
                  <button key={p.id} onClick={() => onChip(p)}
                    className="w-full text-left rounded-lg p-2 transition-all hover:shadow-sm"
                    style={{ borderLeft: `3px solid ${c}`, background: activo ? `${c}2e` : `${c}12`, boxShadow: activo ? `0 0 0 1.5px ${c}` : undefined }}>
                    <div className="text-[12px] font-bold leading-tight line-clamp-2">{p.titulo}</div>
                    <div className="text-[10px] font-semibold mt-1 flex items-center gap-1" style={{ color: c }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: c }} /> {estadoLabel(p)}{redes ? ` · ${redes}` : ''}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ToggleBtn({ active, onClick, color, icon, label }: { active: boolean; onClick: () => void; color: string; icon: ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl text-[13px] font-bold transition-all"
      style={{ background: active ? '#fff' : 'transparent', color: active ? color : 'var(--muted-foreground, #64748b)', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : undefined }}>
      {icon} {label}
    </button>
  )
}

function ModoBtn({ active, onClick, color, label }: { active: boolean; onClick: () => void; color: string; label: string }) {
  return (
    <button onClick={onClick}
      className="h-8 px-3 rounded-lg text-[12.5px] font-bold transition-all"
      style={{ background: active ? '#fff' : 'transparent', color: active ? color : 'var(--muted-foreground, #64748b)', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : undefined }}>
      {label}
    </button>
  )
}

function Leyenda({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} /> {label}
    </span>
  )
}

function PubCard({ p, color, emoji, publicada, abierto, onToggle, aprobado, aprobandoAhora, onAprobar, puedeAprobar }: {
  p: PubCliente; color: string; emoji: string | null; publicada?: boolean
  abierto: boolean; onToggle: () => void
  aprobado: boolean; aprobandoAhora: boolean; onAprobar: () => void; puedeAprobar?: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const contenidoUrl = urlOk(p.video) ?? urlOk(p.driveResultado) ?? urlOk(p.portada)
  const embed = driveEmbed(p.video) ?? driveEmbed(p.driveResultado) ?? driveEmbed(p.portada)
  const hayContenido = !!contenidoUrl
  const esVideo = !!urlOk(p.video)
  return (
    <div className="rounded-2xl bg-card overflow-hidden shadow-sm ring-1 ring-black/[0.04] transition-shadow hover:shadow-md" style={{ borderLeft: `5px solid ${color}` }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left">
        <Thumb portada={p.portada} color={color} emoji={emoji} size={54} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold truncate">{p.titulo}</div>
          <div className="text-[12px] text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
            {publicada
              ? <span style={{ color: '#0f766e', fontWeight: 600 }}>✓ Publicado {fechaBonita(p.publicadoAt ?? p.fecha)}</span>
              : <span>📅 {fechaBonita(p.fecha)}</span>}
            {p.redes.length > 0 && <span>· {p.redes.map((r) => RED_EMOJI[r] ?? r).join(' ')}</span>}
          </div>
        </div>
        {aprobado && <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(22,163,74,0.14)', color: '#15803d' }}><ThumbsUp className="w-3 h-3" /> Aprobado</span>}
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3">
          {embed ? (
            playing ? (
              <div className="mx-auto rounded-xl overflow-hidden bg-black" style={{ width: '100%', maxWidth: 200, aspectRatio: '9 / 16', maxHeight: 340 }}>
                <iframe src={embed} title={p.titulo} allow="autoplay; fullscreen" allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} />
              </div>
            ) : (
              <button onClick={() => setPlaying(true)} className="relative w-full block rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
                <Thumb portada={p.portada} color={color} emoji={emoji} big />
                <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.28)' }}>
                  <span className="flex items-center justify-center rounded-full shadow-lg" style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.95)' }}>
                    <Play className="w-6 h-6" fill="#111" style={{ color: '#111', marginLeft: 3 }} />
                  </span>
                </span>
              </button>
            )
          ) : hayContenido ? (
            <a href={contenidoUrl!} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
              <Thumb portada={p.portada} color={color} emoji={emoji} big />
            </a>
          ) : (
            <div className="rounded-xl p-6 text-center text-[13px] text-muted-foreground" style={{ background: `${color}10` }}>
              ⏳ El equipo está preparando el contenido. Te avisamos cuando esté listo para revisar.
            </div>
          )}

          {embed && (
            <p className="text-[11px] text-muted-foreground text-center">
              {playing ? '▶️ Se ve acá mismo · para verlo grande usa “Ver en Drive”' : '▶️ Toca para ver el video aquí'}
            </p>
          )}

          {(urlOk(p.linkTiktok) || urlOk(p.linkInstagram)) && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Ver publicado en</div>
              <div className="flex items-center gap-2 flex-wrap">
                {urlOk(p.linkTiktok) && (
                  <a href={urlOk(p.linkTiktok)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-bold text-white" style={{ background: '#111' }}>
                    🎵 TikTok <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {urlOk(p.linkInstagram) && (
                  <a href={urlOk(p.linkInstagram)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)' }}>
                    📸 Instagram <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {p.guion && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Guión</div>
              <div className="text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed rounded-xl p-3 max-h-56 overflow-y-auto" style={{ background: `${color}0d` }}>{p.guion}</div>
            </div>
          )}

          {p.copy && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Texto de la publicación</div>
              <p className="text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed">{p.copy}</p>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {contenidoUrl && (
              <a href={contenidoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[13px] font-semibold border" style={{ borderColor: `${color}55`, color }}>
                <ExternalLink className="w-3.5 h-3.5" /> Ver {esVideo ? 'video' : 'contenido'} en Drive
              </a>
            )}
            {puedeAprobar && !aprobado && hayContenido && (
              <button onClick={onAprobar} disabled={aprobandoAhora} className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 h-11 rounded-xl text-white font-bold text-[14px] disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: '0 6px 16px -6px rgba(22,163,74,0.7)' }}>
                <ThumbsUp className="w-5 h-5" /> {aprobandoAhora ? 'Aprobando…' : 'Aprobar'}
              </button>
            )}
            {aprobado && (
              <span className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-[13px] font-bold" style={{ background: 'rgba(22,163,74,0.12)', color: '#15803d' }}>
                <PartyPopper className="w-4 h-4" /> ¡Aprobado por ti!
              </span>
            )}
          </div>
          {puedeAprobar && !aprobado && hayContenido && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" style={{ color }} /> Míralo y, si te gusta, toca “Aprobar”. El equipo recibe el aviso al instante.</p>
          )}
        </div>
      )}
    </div>
  )
}

function Thumb({ portada, color, emoji, size, big }: { portada: string | null; color: string; emoji: string | null; size?: number; big?: boolean }) {
  const [failed, setFailed] = useState(false)
  const url = urlOk(portada)
  const dim = big ? undefined : size ?? 54
  const wrap = big ? { width: '100%', height: '100%' } : { width: dim, height: dim }
  if (url && !failed) {
    return (
      <div className="rounded-xl overflow-hidden shrink-0" style={wrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" onError={() => setFailed(true)} className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className="rounded-xl shrink-0 flex items-center justify-center overflow-hidden" style={{ ...wrap, background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
      <span style={{ fontSize: big ? 56 : 24 }}>{emoji ?? '✨'}</span>
    </div>
  )
}

function SecHeader({ icon, label, count, color }: { icon: ReactNode; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold px-3 py-1.5 rounded-full" style={{ background: `${color}18`, color }}>
        {icon} {label}
      </span>
      <span className="text-[12px] font-bold text-muted-foreground">{count}</span>
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return <div className="rounded-2xl border-2 border-dashed bg-muted/20 text-center text-sm text-muted-foreground py-7">{texto}</div>
}

/* Estadísticas del cliente — métricas de ACTIVIDAD reales. */
function StatsView({ pubs, publicadas, porPublicar, enDisenoCount, color, hoy, esAprobado }: {
  pubs: PubCliente[]
  publicadas: PubCliente[]
  porPublicar: PubCliente[]
  enDisenoCount: number
  color: string
  hoy: string
  esAprobado: (p: PubCliente) => boolean
}) {
  const [hy, hm] = hoy.split('-').map(Number)
  const mesActualKey = `${hy}-${String(hm).padStart(2, '0')}`
  const mesDe = (p: PubCliente) => (p.publicadoAt ?? p.fecha ?? '').slice(0, 7)

  const publicadasEsteMes = publicadas.filter((p) => mesDe(p) === mesActualKey).length
  const aprobados = pubs.filter(esAprobado).length

  const meses: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    let y = hy, m = hm - i
    while (m <= 0) { m += 12; y -= 1 }
    meses.push({ key: `${y}-${String(m).padStart(2, '0')}`, label: MESES_CORTOS[m - 1] })
  }
  const porMes = meses.map((mm) => ({ ...mm, n: publicadas.filter((p) => mesDe(p) === mm.key).length }))
  const maxMes = Math.max(1, ...porMes.map((m) => m.n))

  const redCount: Record<string, number> = {}
  for (const p of publicadas) for (const r of p.redes) redCount[r] = (redCount[r] ?? 0) + 1
  const redes = Object.entries(redCount).sort((a, b) => b[1] - a[1])
  const maxRed = Math.max(1, ...redes.map(([, n]) => n))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 lg:gap-4">
        <Kpi label="Publicadas" value={publicadas.length} color={color} icon="✅" />
        <Kpi label="Este mes" value={publicadasEsteMes} color={color} icon="📅" />
        <Kpi label="Por publicar" value={porPublicar.length} color={color} icon="⏳" />
        <Kpi label="En diseño" value={enDisenoCount} color={color} icon="🎨" />
        <Kpi label="Aprobados por ti" value={aprobados} color={color} icon="👍" />
      </div>

      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
        <section className="rounded-3xl bg-card p-4 lg:p-5 shadow-sm ring-1 ring-black/[0.04]">
          <div className="text-[13px] font-bold mb-3 flex items-center gap-1.5"><BarChart3 className="w-4 h-4" style={{ color }} /> Publicaciones por mes</div>
          <div className="flex items-end justify-between gap-2">
            {porMes.map((m) => {
              const h = m.n ? Math.max(8, Math.round((m.n / maxMes) * 90)) : 3
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[11px] font-bold h-4 leading-4" style={{ color }}>{m.n || ''}</div>
                  <div className="w-full rounded-t-md transition-all" style={{ height: h, background: m.n ? color : `${color}22` }} />
                  <div className="text-[10px] font-semibold text-muted-foreground">{m.label}</div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-card p-4 lg:p-5 shadow-sm ring-1 ring-black/[0.04]">
          <div className="text-[13px] font-bold mb-3">Por red social</div>
          {redes.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Aún no hay publicaciones con red asignada.</p>
          ) : (
            <div className="space-y-2.5">
              {redes.map(([r, n]) => (
                <div key={r} className="flex items-center gap-2">
                  <span className="text-[13px] w-24 shrink-0">{RED_EMOJI[r] ?? '•'} {RED_NOMBRE[r] ?? r}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(n / maxRed) * 100}%`, background: color }} />
                  </div>
                  <span className="text-[13px] font-bold w-6 text-right">{n}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="text-[11px] text-muted-foreground text-center px-4">
        Resumen de la actividad de tu contenido con Distinto Agencia.
      </p>
    </div>
  )
}

function Kpi({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-black/[0.04]">
      <div className="text-3xl font-extrabold leading-none" style={{ color }}>{value}</div>
      <div className="text-[12px] text-muted-foreground font-semibold mt-1.5">{icon} {label}</div>
    </div>
  )
}
