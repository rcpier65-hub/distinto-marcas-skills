'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckCircle2, Clock, ExternalLink, LogOut, ChevronDown, ChevronLeft, ChevronRight,
  ThumbsUp, Sparkles, PartyPopper, CalendarDays, List, BarChart3, FileText, Play, X, Palette, Send,
  ClipboardList, CalendarClock, Clapperboard, Video, MapPin, CalendarPlus, Trash2, Download, LayoutGrid, HardDrive, ListTodo, Bell, Star, Copy, Check,
  TrendingUp,
} from 'lucide-react'
import { MarcaLogo } from '@/components/marca-logo'
import { aclarar, oscurecer, esClaro } from '@/lib/marcas/branding'
import { ActivarNotificaciones } from '@/components/activar-notificaciones'
import { FechasClienteView, type FechaClienteItem } from './fechas-cliente-view'
import { ReporteMarcaView } from '@/components/reportes/reporte-marca-view'
import { PinGate } from '@/components/reportes/pin-gate'
import type { MesReporte } from '@/lib/reportes/typhouse'
import { createClient } from '@/lib/supabase/client'
import { aprobarVideoCliente, enviarObservacionCliente, agendarGrabacionCliente, eliminarObservacionCliente, cambiarFechaPublicacionCliente, enviarCorreccionesCliente } from '../_actions'
import { ClienteRealtime } from './cliente-realtime'
import { DriveExplorer } from './drive-explorer'
import type { Observacion, Reunion, GrabacionCliente } from '@/lib/portal/coordinacion'

/* Botón de "copiar" el texto de una publicación con un clic — el cliente lo pega
   donde quiera para publicarlo por su cuenta (Pedro 27-jul-2026). Usa la
   Clipboard API en contexto seguro (HTTPS) con fallback para móviles viejos. */
function CopiarTextoBtn({ texto, color }: { texto: string; color: string }) {
  const [copiado, setCopiado] = useState(false)
  async function copiar() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto)
      } else {
        const ta = document.createElement('textarea')
        ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
      }
      setCopiado(true)
      toast.success('Texto copiado — pégalo donde quieras publicarlo')
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      toast.error('No se pudo copiar el texto')
    }
  }
  return (
    <button type="button" onClick={copiar}
      className="mt-2 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-bold border transition-colors hover:opacity-80"
      style={{ borderColor: `${color}55`, color }}>
      {copiado ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar texto</>}
    </button>
  )
}

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
const DIAS_SEM_LARGO = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/* Colores por estado de una pieza (puntos del calendario, chips, píldoras). */
const C_APROBADO = '#16a34a'   // verde — el cliente ya lo aprobó
const C_PUBLICADO = '#94a3b8'  // gris  — ya se publicó (Pedro: que se vea "cerrado")
const C_EDITANDO = '#a1887f'   // marrón/gris — aún en edición/preparación (NO está listo). Pedro 5-ago-2026.

/* "Publicada" = tiene publicado_at (señal robusta que pone "Video ya subido" y
   que el form NO revierte) O estado 'publicado'. Antes solo miraba estado, que
   el autosave del detalle a veces revertía → quedaba en "Por publicar". Pedro 14-jul. */
function esPublicada(p: PubCliente) { return !!p.publicadoAt || (p.estado ?? '') === 'publicado' }
/* Pieza de DISEÑO de Aylin (banner, post, catálogo, imágenes…): es trabajo de
   diseño, NO un video del flujo de aprobar/publicar. Va a su propia sección para
   no mezclarlo con las publicaciones de video. Pedro 14-jul-2026. */
/* Un pub cuenta como "diseño de Aylin" (banner/post SIN flujo de video → va a la
   sección Diseños, no al calendario) SOLO si está marcado es_tarea_diseno Y NO
   tiene video. Si tiene video, es contenido de calendario aunque el flag esté mal
   puesto — así los REELS/videos mal marcados como diseño (ej. "PINTURAS ANGELUS",
   que pasó por 'Diseñar' y quedó con el flag) igual salen en el calendario del
   cliente. Pedro 5-ago-2026: "todo lo de la grilla debe salir en el calendario". */
function esDisenoPieza(p: PubCliente) { return p.esDiseno && !urlOk(p.video) }
/* Etapa del proceso de un video, para mostrarla ABAJO de la card del calendario.
   Sale de `estado` / `estado_tarea`, que Erick o el editor configuran en la app
   de la agencia. Solo se muestra en videos NO publicados (los publicados ya
   están cerrados). Pedro 17-jul-2026. */
function procesoLabel(p: PubCliente): string | null {
  if (esPublicada(p)) return null
  const e = (p.estado ?? '').toLowerCase()
  const t = p.estadoTarea ?? ''
  if (t === 'pausada') return 'En pausa'
  if (e === 'aprobar' || e === 'enviado') return 'Listo para revisar'
  if (e === 'editando' || e === 'editar') return 'En edición'
  if (e === 'disenar' || e === 'disenando') return 'En diseño'
  if (e === 'programar' || e === 'programar_anuncios') return 'Programado'
  if (t === 'en_progreso') return 'En proceso'
  if (t === 'listo') return 'Listo'
  if (e === 'idear' || e === 'tareas') return 'En preparación'
  return null
}
/* Texto CORTO del estado del video para el calendario (bajo el puntito del día).
   Así el cliente ve de un vistazo si está "Editando" (no listo) o "Aprobado".
   Pedro 5-ago-2026. */
function estadoCortoCal(p: PubCliente): string {
  if (esPublicada(p)) return 'Publicado'
  if (p.aprobadoAt) return 'Aprobado'
  const proc = procesoLabel(p)
  if (proc === 'En edición') return 'Editando'
  if (proc === 'En preparación') return 'Preparando'
  if (proc === 'En proceso') return 'En proceso'
  if (proc === 'En pausa') return 'En pausa'
  if (proc === 'En diseño') return 'En diseño'
  if (proc === 'Listo para revisar' || proc === 'Programado' || proc === 'Listo') return 'Por publicar'
  return 'Por publicar'
}
/* ¿El video ya está "listo" (para revisar/programado) o todavía en edición? Usa
   el mismo criterio que colorEstado para el color del puntito/celda. */
function estaListoParaCliente(p: PubCliente): boolean {
  const proc = procesoLabel(p)
  return proc === 'Listo para revisar' || proc === 'Programado' || proc === 'Listo'
}
/* Etiqueta de estado de un diseño para el cliente. Mapea las columnas del
   tablero de Aylin a palabras claras para el cliente. Pedro 12-ago-2026. */
function disenoLabel(p: PubCliente): string {
  switch (p.estadoTarea) {
    case 'listo':
    case 'enviado':      return 'Entregado'
    case 'en_progreso':  return 'En diseño'
    case 'pausada':      return 'En pausa'
    default:             return 'En cola' // sin_empezar / null → por hacer
  }
}
/* ¿Un diseño ya está terminado (para separarlo en "Listos")? */
function disenoTerminado(p: PubCliente): boolean {
  return p.estadoTarea === 'listo' || p.estadoTarea === 'enviado'
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
/* Convierte el link de Drive en un embed reproducible dentro del portal.
   Se usa SOLO como respaldo: el reproductor bueno es el nativo (ver abajo). */
function driveEmbed(url: string | null): string | null {
  const id = driveId(url)
  return id ? `https://drive.google.com/file/d/${id}/preview` : null
}
/* Miniatura REAL del video (un fotograma), no un placeholder. Verificado
   contra los videos de Mil Ideas: devuelve image/jpeg. Pedro 15-jul-2026. */
function driveThumbUrl(url: string | null, w = 800): string | null {
  const id = driveId(url)
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${w}` : null
}
/* Portada REAL de una publicación: la portada subida, o si no hay, un fotograma
   del video/diseño en Drive. Se usa igual en las cards y en las filas de la
   lista para que ambas muestren la imagen del video. Pedro 17-jul-2026. */
function portadaDe(p: PubCliente): string | null {
  return urlOk(p.portada) ?? driveThumbUrl(p.video) ?? driveThumbUrl(p.driveResultado)
}
/* Video servido por NUESTRA app (/api/video/ID), que lo trae de Drive por
   detrás. Drive NO le entrega el MP4 a un <video> del navegador desde otro
   sitio (da "Format error" — probado), pero sí a una petición del servidor.
   Con esto el cliente tiene reproductor nativo: pantalla completa, calidad
   original y descarga, sin el iframe de Drive. Pedro 15-jul-2026. */
function videoAppUrl(url: string | null): string | null {
  const id = driveId(url)
  return id ? `/api/video/${id}` : null
}


/* Menú del portal. Una sola lista alimenta el sidebar (PC) y el toggle (móvil),
   así nunca se desincronizan. Pedro 17-jul-2026. */
const NAV = [
  { id: 'cal', label: 'Calendario', corto: 'Calendario', Icono: CalendarDays },
  { id: 'lista', label: 'Lista', corto: 'Lista', Icono: List },
  { id: 'stats', label: 'Estadísticas', corto: 'Stats', Icono: BarChart3 },
  { id: 'fechas', label: 'Fechas importantes', corto: 'Fechas', Icono: Star },
  { id: 'observaciones', label: 'Observaciones', corto: 'Observ.', Icono: ClipboardList },
  { id: 'reuniones', label: 'Reuniones', corto: 'Reuniones', Icono: CalendarClock },
  { id: 'grabaciones', label: 'Grabación', corto: 'Grabación', Icono: Clapperboard },
  { id: 'diseno', label: 'Diseño', corto: 'Diseño', Icono: Palette },
  /* Reporte mensual (embudo/inversión) — solo aparece si la marca tiene
     reporte cargado (prop reporteNombre) y pide código al abrirlo. */
  { id: 'reporte', label: 'Reporte mensual', corto: 'Reporte', Icono: TrendingUp },
] as const
type VistaId = (typeof NAV)[number]['id']

/* Encabezado de sección plegable del menú lateral, igual que la app
   (▼ WORKSPACE / MARCAS). El chevron gira al colapsar. Pedro 19-jul-2026. */
function GrupoSidebar({ titulo, abierto, onToggle }: { titulo: string; abierto: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className="w-full flex items-center gap-1 px-2 py-1.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/50 transition-colors">
      <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${abierto ? '' : '-rotate-90'}`} /> {titulo}
    </button>
  )
}

export function ClientePortalView({
  marcaId, marcaNombre, marcaSlug, marcaEmoji, marcaColor, marcaLogoUrl, driveUrl, contacto, hoy, pubs: pubsIniciales, observaciones, reuniones, grabaciones, fechasImportantes = [],
  reporteNombre = null, reporteMeses = null,
}: {
  marcaId: string
  marcaNombre: string
  marcaSlug: string
  marcaEmoji: string | null
  marcaColor: string
  marcaLogoUrl: string | null
  driveUrl: string | null
  contacto: string | null
  hoy: string
  pubs: PubCliente[]
  observaciones: Observacion[]
  reuniones: Reunion[]
  grabaciones: GrabacionCliente[]
  fechasImportantes?: FechaClienteItem[]
  /* Reporte mensual de la marca: nombre para mostrar + data. meses=null con
     nombre presente = candado (aún sin código). nombre=null = sin reporte. */
  reporteNombre?: string | null
  reporteMeses?: MesReporte[] | null
}) {
  const router = useRouter()
  /* pubs en estado local: para poder MOVER una tarjeta de fecha al instante
     (arrastrar) sin esperar al servidor. Se resincroniza cuando el server trae
     data nueva. Pedro 17-jul-2026. */
  const [pubs, setPubs] = useState<PubCliente[]>(pubsIniciales)
  useEffect(() => { setPubs(pubsIniciales) }, [pubsIniciales])
  const [aprobados, setAprobados] = useState<Record<string, string>>({})
  const [expandido, setExpandido] = useState<string | null>(null)
  const [aprobando, setAprobando] = useState<string | null>(null)
  const [vista, setVista] = useState<VistaId | 'drive' | 'pendientes'>('cal')
  /* ¿Esta marca tiene reporte mensual cargado? (si no, el ítem no aparece) */
  const tieneReporte = !!reporteNombre
  const navVisible = NAV.filter(({ id }) => id !== 'reporte' || tieneReporte)
  /* Secciones plegables del menú lateral (como la app: ▼ WORKSPACE / MARCAS).
     Pedro 19-jul-2026. */
  const [secAbierta, setSecAbierta] = useState<{ marca: boolean; herram: boolean }>({ marca: true, herram: true })
  /* "Tareas pendientes" también se despliega en sub-opciones (Publicaciones /
     Diseños), como "Publicaciones" en la app. Pedro 19-jul-2026. */
  const [tareasAbierto, setTareasAbierto] = useState(true)
  const [pendFiltro, setPendFiltro] = useState<'todas' | 'publicaciones' | 'disenos'>('todas')
  /* Modo del calendario. Arranca en MES (dashboard principal); el cliente puede
     luego elegir Semana o Día. Pedro 14-jul-2026. */
  const [calMode, setCalMode] = useState<'dia' | 'semana' | 'mes'>('mes')
  /* Presentación de la pestaña LISTA: cuadrícula (cards) o lista (filas).
     Toggle en la esquina de la vista Lista, estilo Assets. Pedro 17-jul-2026. */
  const [listaFmt, setListaFmt] = useState<'grid' | 'lista'>('grid')
  /* Publicación abierta en la ventana de detalle (al tocar una tarjeta del
     calendario). El cliente ve el video ahí y puede aprobarlo. */
  const [modalPub, setModalPub] = useState<PubCliente | null>(null)
  // Día abierto en el pop-up del calendario mensual (cuando ese día tiene VARIAS
  // publicaciones y hay que elegir cuál ver). Con una sola, se abre el video
  // directo sin pop-up intermedio. Pedro 5-ago-2026.
  const [diaPopup, setDiaPopup] = useState<string | null>(null)

  function esAprobado(p: PubCliente) { return !!p.aprobadoAt || !!aprobados[p.id] }
  /* Prioridad: PUBLICADO (gris, ya cerrado) gana sobre aprobado. Así un video ya
     subido se ve gris aunque también estuviera aprobado. Pedro 17-jul-2026. */
  function colorEstado(p: PubCliente) {
    if (esPublicada(p)) return C_PUBLICADO      // gris — ya cerrado (lo pidió Pedro)
    if (esAprobado(p)) return C_APROBADO        // verde — aprobado (semántico)
    // Solo los YA LISTOS (para revisar / programados) van en color de marca; los
    // que aún se editan van en marrón/gris para que NO parezcan listos. Pedro 5-ago.
    if (estaListoParaCliente(p)) return marcaColor
    return C_EDITANDO                            // marrón/gris — aún en edición/preparación
  }
  function estadoLabel(p: PubCliente) { return esPublicada(p) ? 'Publicado' : esAprobado(p) ? 'Aprobado' : 'Por publicar' }
  function redesStr(p: PubCliente) { return p.redes.map((r) => RED_EMOJI[r] ?? r).join('') }

  /* Videos (flujo de publicación) vs diseños de Aylin (banners, posts…). */
  const pubsNormales = useMemo(() => pubs.filter((p) => !esDisenoPieza(p)), [pubs])
  const disenos = useMemo(
    () => pubs.filter(esDisenoPieza).sort((a, b) => (a.fechaEntrega ?? a.fecha ?? '9999').localeCompare(b.fechaEntrega ?? b.fecha ?? '9999')),
    [pubs],
  )
  /* Tareas PENDIENTES de la marca: videos que aún no se publican + diseños que
     todavía no están listos. Es el trabajo que el equipo aún le debe al
     cliente. Pedro 17-jul-2026. */
  const pendientes = useMemo(
    () => [
      ...pubsNormales.filter((p) => !esPublicada(p)),
      ...disenos.filter((p) => !disenoTerminado(p)),
    ],
    [pubsNormales, disenos],
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

  const tituloMes = useMemo(
    () => capitalizar(new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date(ym.y, ym.m, 1))),
    [ym],
  )
  /* Semanas (lunes→domingo) que cubren el mes visible — para mostrar el Mes como
     semanas apiladas, cada una igual a la vista Semana. */
  const monthWeeks = useMemo(() => {
    const lastDay = new Date(ym.y, ym.m + 1, 0).getDate()
    const lastOfMonth = ymd(ym.y, ym.m, lastDay)
    let ws = mondayOf(ymd(ym.y, ym.m, 1))
    const weeks: string[][] = []
    while (ws <= lastOfMonth) {
      weeks.push(Array.from({ length: 7 }, (_, i) => addDays(ws, i)))
      ws = addDays(ws, 7)
    }
    return weeks
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
        key={p.id} p={p} color={marcaColor}
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

  /* Mover una publicación a otra fecha (arrastrar en el calendario o el selector
     del detalle). Optimista: la card se mueve al instante; si el server falla,
     revierte. Solo aplica a NO publicadas. Pedro 17-jul-2026. */
  function moverPub(pubId: string, nuevaFecha: string) {
    const actual = pubs.find((p) => p.id === pubId)
    if (!actual || esPublicada(actual) || actual.fecha === nuevaFecha) return
    setPubs((prev) => prev.map((p) => (p.id === pubId ? { ...p, fecha: nuevaFecha } : p)))
    cambiarFechaPublicacionCliente(pubId, nuevaFecha).then((r) => {
      if (!r.ok) { toast.error(r.error || 'No se pudo cambiar la fecha'); router.refresh() }
      else { toast.success('📅 Fecha actualizada. Ya le avisamos al equipo.'); router.refresh() }
    })
  }

  /* Deep-link: si el cliente entra desde la notificación push (/cliente?pub=ID),
     abrimos directo esa publicación para que vea el video recién subido y sus
     links de TikTok/Instagram. Pedro 14-jul-2026. */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const qs = new URLSearchParams(window.location.search)
    // Deep-links de notificaciones: reunión nueva o respuesta a observaciones.
    if (qs.get('reunion')) { setVista('reuniones'); return }
    if (qs.get('obs')) { setVista('observaciones'); return }
    const pubId = qs.get('pub')
    if (!pubId) return
    const p = pubs.find((x) => x.id === pubId)
    if (p) setModalPub(p)
  }, [pubs])

  // Hero de la marca: degradado con SU color (ya no el rosa fijo) y texto
  // oscuro cuando la marca es clara (lima, dorado) para que se lea bien.
  const heroClaro = esClaro(marcaColor)
  const heroTxt = heroClaro ? oscurecer(marcaColor, 0.72) : '#ffffff'
  const heroGrad = `linear-gradient(135deg, ${aclarar(marcaColor, 0.14)} 0%, ${marcaColor} 45%, ${oscurecer(marcaColor, 0.32)} 100%)`
  const heroVelo = heroClaro ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.15)'
  const heroVelo2 = heroClaro ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.10)'
  const heroBtn = heroClaro ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.20)'

  return (
    /* ESTRUCTURA (Pedro 17-jul-2026): en PC, menú lateral fijo + panel al centro
       ocupando toda la pantalla. En MÓVIL se queda EXACTAMENTE como estaba
       (cabecera + toggle arriba), que ya funcionaba bien. */
    <div className="lg:flex lg:h-[100dvh] lg:overflow-hidden">
      <ClienteRealtime marcaId={marcaId} />

      {/* ===== MENÚ LATERAL — solo PC ===== */}
      <aside className="hidden lg:flex lg:flex-col w-[250px] shrink-0 border-r bg-card">
        {/* El logo arranca a la MISMA altura que el hero "Bienvenida…" del
            panel (que tiene lg:py-9 = 36px arriba), para que no quede flotando
            pegado al techo. Pedro 17-jul-2026. */}
        <div className="flex items-center gap-3 px-5 pt-9 pb-6 border-b">
          <div className="rounded-xl p-1.5 shrink-0" style={{ background: `${marcaColor}14` }}>
            <MarcaLogo slug={marcaSlug} nombre={marcaNombre} emoji={marcaEmoji} logoUrl={marcaLogoUrl} size={32} />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-[14px] leading-tight truncate">{marcaNombre}</div>
            <div className="text-[11px] text-muted-foreground">Portal del cliente</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {/* ===== Sección plegable: TU MARCA ===== */}
          <GrupoSidebar titulo="Tu marca" abierto={secAbierta.marca} onToggle={() => setSecAbierta((s) => ({ ...s, marca: !s.marca }))} />
          {secAbierta.marca && navVisible.map(({ id, label, Icono }) => {
            const activo = vista === id
            return (
              <button
                key={id}
                onClick={() => setVista(id)}
                className="w-full flex items-center gap-3 h-10 px-3 rounded-lg text-[13.5px] font-semibold transition-colors"
                style={activo ? { background: `${marcaColor}18`, color: marcaColor } : { color: 'var(--muted-foreground, #64748b)' }}
              >
                <Icono className="w-4 h-4 shrink-0" /> {label}
              </button>
            )
          })}

          {/* ===== Sección plegable: HERRAMIENTAS ===== */}
          <div className="pt-2 mt-2 border-t">
            <GrupoSidebar titulo="Herramientas" abierto={secAbierta.herram} onToggle={() => setSecAbierta((s) => ({ ...s, herram: !s.herram }))} />
            {secAbierta.herram && (
              <>
                {/* Tareas pendientes — se despliega en Publicaciones / Diseños. */}
                <button
                  onClick={() => setTareasAbierto((a) => !a)}
                  className="w-full flex items-center gap-2.5 h-10 px-3 rounded-lg text-[13.5px] font-semibold transition-colors"
                  style={vista === 'pendientes' ? { color: marcaColor } : { color: 'var(--muted-foreground, #64748b)' }}
                >
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${tareasAbierto ? '' : '-rotate-90'}`} />
                  <ListTodo className="w-4 h-4 shrink-0" /> Tareas pendientes
                  {pendientes.length > 0 && (
                    <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold text-white inline-flex items-center justify-center" style={{ background: marcaColor }}>{pendientes.length}</span>
                  )}
                </button>
                {tareasAbierto && (
                  <div className="ml-4 pl-2 border-l space-y-0.5">
                    {([
                      { id: 'todas', label: 'Todas' },
                      { id: 'publicaciones', label: 'Publicaciones' },
                      { id: 'disenos', label: 'Diseños' },
                    ] as const).map((f) => {
                      const act = vista === 'pendientes' && pendFiltro === f.id
                      return (
                        <button key={f.id}
                          onClick={() => { setVista('pendientes'); setPendFiltro(f.id) }}
                          className="w-full text-left h-9 px-3 rounded-lg text-[13px] font-semibold transition-colors"
                          style={act ? { background: `${marcaColor}18`, color: marcaColor } : { color: 'var(--muted-foreground, #64748b)' }}>
                          {f.label}
                        </button>
                      )
                    })}
                  </div>
                )}
                {driveUrl && (
                  /* Pedro 5-ago-2026: el botón lleva DIRECTO a la carpeta de Drive
                     de la marca (abre Google Drive en otra pestaña), sin abrir una
                     sección interna. Cada marca → su propia carpeta (driveUrl). */
                  <a
                    href={driveUrl}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 h-10 px-3 rounded-lg text-[13.5px] font-semibold transition-colors hover:bg-muted"
                    style={{ color: 'var(--muted-foreground, #64748b)' }}
                  >
                    <HardDrive className="w-4 h-4 shrink-0" /> Drive · Almacenamiento
                  </a>
                )}
              </>
            )}
          </div>
        </nav>

        <div className="p-3 border-t">
          <button
            onClick={salir}
            className="w-full flex items-center gap-2.5 h-10 px-3 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ===== PANEL CENTRAL ===== */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto">
        {/* Aire: padding generoso arriba/lados y un ancho máximo para que en
            pantallas grandes no quede estirado de borde a borde. */}
        <div className="p-4 sm:p-6 lg:px-10 lg:py-9 pb-28 lg:pb-12 space-y-6 lg:space-y-7 max-w-[1500px] mx-auto">

          {/* HERO — el degradado de la marca. Va en móvil Y en PC: a Pedro le
              gustaba y da la bienvenida. Grande y con aire. */}
          <header className="relative overflow-hidden rounded-2xl p-6 sm:p-8 lg:p-10" style={{ background: heroGrad, color: heroTxt }}>
            <div aria-hidden className="absolute -top-12 -right-10 w-44 h-44 lg:w-64 lg:h-64 rounded-full" style={{ background: heroVelo }} />
            <div aria-hidden className="absolute -bottom-14 -left-8 w-40 h-40 lg:w-56 lg:h-56 rounded-full" style={{ background: heroVelo2 }} />
            <div className="relative flex items-center gap-4 lg:gap-6">
              <div className="bg-white rounded-2xl p-2 lg:p-3 shrink-0 shadow-lg">
                <MarcaLogo slug={marcaSlug} nombre={marcaNombre} emoji={marcaEmoji} logoUrl={marcaLogoUrl} size={48} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] lg:text-xs uppercase tracking-widest font-bold" style={{ opacity: 0.82 }}>
                  {marcaNombre} · Portal del cliente
                </div>
                {/* Solo "Bienvenido" (no solo Andrea usa la cuenta del cliente)
                    + bajada profesional. Pedro 17-jul-2026. */}
                <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-extrabold leading-tight mt-0.5">
                  Bienvenido 👋
                </h1>
                <p className="text-[13px] lg:text-[15px] mt-1 max-w-xl" style={{ opacity: 0.9 }}>
                  Tu espacio central con Distinto Agencia: revisa, aprueba y da seguimiento a todo el contenido de tu marca en un solo lugar.
                </p>
              </div>
              {/* En PC el "Salir" vive en el menú lateral. */}
              <button onClick={salir} title="Cerrar sesión" className="lg:hidden relative shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-xl px-3 py-2 transition-opacity hover:opacity-80" style={{ background: heroBtn, color: heroTxt }}>
                <LogOut className="w-3.5 h-3.5" /> Salir
              </button>
            </div>
          </header>

          {/* Activar notificaciones */}
          <div className="rounded-2xl border-2 bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderColor: `${marcaColor}33` }}>
            <div className="text-sm min-w-0 flex-1">
              <div className="font-bold flex items-center gap-1.5"><Bell className="w-4 h-4 shrink-0" style={{ color: marcaColor }} /> Avísame cuando publiquen</div>
              <div className="text-xs text-muted-foreground">Con un toque activas las notificaciones y recibes un aviso en tu celular apenas se publique tu contenido.</div>
            </div>
            <ActivarNotificaciones className="w-full sm:w-auto" />
          </div>

          {/* Toggle — solo MÓVIL (en PC está el menú lateral) */}
          <div className="lg:hidden grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-muted/60 w-full">
            {navVisible.map(({ id, corto, Icono }) => (
              <ToggleBtn
                key={id}
                active={vista === id}
                onClick={() => setVista(id)}
                color={marcaColor}
                icon={<Icono className="w-4 h-4" />}
                label={corto}
              />
            ))}
          </div>
          {/* Tareas pendientes + Drive — acceso en móvil (en PC va en el menú). */}
          <button
            onClick={() => { setVista('pendientes'); setPendFiltro('todas') }}
            className="lg:hidden w-full flex items-center justify-center gap-2 h-11 rounded-2xl text-[13.5px] font-bold border-2"
            style={vista === 'pendientes'
              ? { background: `${marcaColor}14`, color: marcaColor, borderColor: `${marcaColor}55` }
              : { color: 'var(--muted-foreground, #64748b)', borderColor: 'var(--border, #e5e7eb)' }}
          >
            <ListTodo className="w-4 h-4" /> Tareas pendientes
            {pendientes.length > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold text-white inline-flex items-center justify-center" style={{ background: marcaColor }}>{pendientes.length}</span>
            )}
          </button>
          {driveUrl && (
            /* Directo a la carpeta de Drive de la marca (Pedro 5-ago-2026). */
            <a
              href={driveUrl}
              target="_blank" rel="noopener noreferrer"
              className="lg:hidden w-full flex items-center justify-center gap-2 h-11 rounded-2xl text-[13.5px] font-bold border-2"
              style={{ color: 'var(--muted-foreground, #64748b)', borderColor: 'var(--border, #e5e7eb)' }}
            >
              <HardDrive className="w-4 h-4" /> Drive · Almacenamiento
            </a>
          )}

      {vista === 'cal' && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-card p-4 sm:p-5 lg:p-7 border">
            {/* Barra: navegación + modo Día/Semana/Mes + conteo */}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-5 lg:mb-6">
              <div className="flex items-center gap-1.5">
                <button onClick={navPrev} aria-label="Anterior" className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-muted transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <div className="font-extrabold text-[15px] lg:text-lg text-center min-w-[130px] lg:min-w-[190px] capitalize">{navLabel}</div>
                <button onClick={navNext} aria-label="Siguiente" className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-muted transition-colors"><ChevronRight className="w-5 h-5" /></button>
                <button onClick={navHoy} className="ml-1 h-9 px-3.5 rounded-xl text-[13px] font-bold transition-colors" style={{ background: `${marcaColor}18`, color: marcaColor }}>Hoy</button>
              </div>
              <div className="flex items-center gap-1 p-1.5 rounded-xl bg-muted/60">
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
                puedeMover={(p) => !esPublicada(p)} onMover={moverPub}
              />
            )}

            {/* MES — en MÓVIL una grilla compacta 7×n (tocar un día abre su vista);
                en DESKTOP las semanas apiladas con tarjetas (WeekView). Antes el
                móvil apilaba WeekViews con scroll horizontal y solo se veían 2
                días por semana. Pedro 27-jul-2026. */}
            {calMode === 'mes' && (
              <>
                <MobileMonthGrid
                  monthWeeks={monthWeeks} porDia={porDia} hoy={hoy} marcaColor={marcaColor}
                  mesFiltro={ym.m} colorEstado={colorEstado}
                  onPickDay={(k) => {
                    // Pedro 5-ago-2026: al tocar un día, MOSTRAR EL VIDEO DIRECTO
                    // en un pop-up, no mandar a la sección "Día". Con 1 publicación
                    // se abre su detalle (video) al toque; con varias, un pop-up
                    // para elegir cuál ver.
                    const items = porDia.get(k) ?? []
                    if (items.length === 1) setModalPub(items[0])
                    else if (items.length > 1) setDiaPopup(k)
                  }}
                />
                <div className="hidden lg:block space-y-4">
                  {monthWeeks.map((wk, i) => (
                    <WeekView key={i} weekDays={wk} porDia={porDia} hoy={hoy} marcaColor={marcaColor}
                      colorEstado={colorEstado} estadoLabel={estadoLabel} redesStr={redesStr}
                      onChip={onChip} expandidoId={expandido} mesFiltro={ym.m}
                      puedeMover={(p) => !esPublicada(p)} onMover={moverPub} />
                  ))}
                </div>
              </>
            )}

            {/* Leyenda */}
            <div className="flex items-center justify-center gap-3 flex-wrap mt-3 pt-3 border-t text-[11px] text-muted-foreground">
              <Leyenda color={C_EDITANDO} label="En edición" />
              <Leyenda color={marcaColor} label="Por publicar" />
              <Leyenda color={C_APROBADO} label="Aprobado" />
              <Leyenda color={C_PUBLICADO} label="Publicado" />
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

      {vista === 'lista' && (() => {
        /* Contenedor de cada sección según el toggle: cuadrícula (varias
           columnas) o lista (una columna de filas). */
        const cont = listaFmt === 'grid'
          ? 'space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:items-start'
          : 'space-y-2'
        return (
          <>
            {/* Encabezado del área + toggle Lista/Cuadrícula a la derecha. Los
                DISEÑOS ya no van acá: tienen su propia pestaña "Diseño". */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-[15px] font-extrabold">Tus publicaciones</div>
              <ToggleFmt value={listaFmt} onChange={setListaFmt} color={marcaColor} />
            </div>

            <section>
              <SecHeader icon={<Clock className="w-4 h-4" />} label="Por publicar" count={porPublicar.length} color={marcaColor} />
              {porPublicar.length === 0 ? (
                <Vacio texto="No hay publicaciones programadas por ahora." />
              ) : listaFmt === 'grid' ? (
                <div className={cont}>{porPublicar.map(renderCard)}</div>
              ) : (
                <div className={cont}>{porPublicar.map((p) => (
                  <FilaCompacta key={p.id} p={p} color={colorEstado(p)} badge={estadoLabel(p)} proceso={procesoLabel(p)} onClick={() => onChip(p)} />
                ))}</div>
              )}
            </section>

            <section className="mt-5">
              <SecHeader icon={<CheckCircle2 className="w-4 h-4" />} label="Publicadas" count={publicadas.length} color={C_PUBLICADO} />
              {publicadas.length === 0 ? (
                <Vacio texto="Todavía no hay publicaciones publicadas." />
              ) : listaFmt === 'grid' ? (
                <div className={cont}>{publicadas.map(renderCard)}</div>
              ) : (
                <div className={cont}>{publicadas.map((p) => (
                  <FilaCompacta key={p.id} p={p} color={colorEstado(p)} badge={estadoLabel(p)} onClick={() => onChip(p)} />
                ))}</div>
              )}
            </section>
          </>
        )
      })()}

      {/* Pestaña propia de DISEÑO: banners/posts que hace el equipo, con el estado
          que va marcando el diseñador. Pedro 5-ago-2026. */}
      {vista === 'diseno' && (
        <div className="space-y-4">
          <div>
            <SecHeader icon={<Palette className="w-4 h-4" />} label="Área de diseño" count={disenos.length} color="#8b5cf6" />
            <p className="text-[12px] text-muted-foreground -mt-1">Banners, posts y piezas gráficas que el equipo diseña para tu marca. El estado lo va marcando el diseñador. 🎨</p>
          </div>
          {disenos.length === 0 ? (
            <Vacio texto="Todavía no hay diseños. Cuando el equipo empiece uno, aparecerá acá con su estado." />
          ) : (() => {
            const enProceso = disenos.filter((p) => !disenoTerminado(p))
            const listos = disenos.filter((p) => disenoTerminado(p))
            return (
              <>
                {enProceso.length > 0 && (
                  <section>
                    <SecHeader icon={<Clock className="w-4 h-4" />} label="En proceso / pendientes" count={enProceso.length} color="#8b5cf6" />
                    <div className="space-y-2">
                      {enProceso.map((p) => (
                        <FilaCompacta key={p.id} p={p} color="#8b5cf6" badge={disenoLabel(p)} onClick={() => setModalPub(p)} />
                      ))}
                    </div>
                  </section>
                )}
                {listos.length > 0 && (
                  <section className="mt-4">
                    <SecHeader icon={<CheckCircle2 className="w-4 h-4" />} label="Listos" count={listos.length} color={C_PUBLICADO} />
                    <div className="space-y-2">
                      {listos.map((p) => (
                        <FilaCompacta key={p.id} p={p} color="#8b5cf6" badge={disenoLabel(p)} onClick={() => setModalPub(p)} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )
          })()}
        </div>
      )}

      {vista === 'stats' && (
        <StatsView pubs={pubsNormales} publicadas={publicadas} porPublicar={porPublicar} enDisenoCount={disenos.length} color={marcaColor} hoy={hoy} esAprobado={esAprobado} />
      )}

      {vista === 'fechas' && (
        <FechasClienteView fechas={fechasImportantes} color={marcaColor} marcaNombre={marcaNombre} />
      )}

      {vista === 'observaciones' && (
        <ObservacionesView observaciones={observaciones} color={marcaColor} />
      )}

      {vista === 'reuniones' && (
        <ReunionesView reuniones={reuniones} color={marcaColor} />
      )}

      {vista === 'grabaciones' && (
        <GrabacionesView grabaciones={grabaciones} color={marcaColor} hoy={hoy} />
      )}

      {/* Reporte mensual — privado: si aún no ingresó el código (meses=null),
          se muestra el candado; al validar, el server refresca y manda la data. */}
      {vista === 'reporte' && tieneReporte && (
        reporteMeses
          ? <ReporteMarcaView nombre={reporteNombre!} meses={reporteMeses} />
          : <div className="pt-8"><PinGate titulo="Reporte mensual" /></div>
      )}

      {vista === 'pendientes' && (
        <TareasPendientesView items={pendientes} color={marcaColor} onChip={onChip} estadoLabel={estadoLabel} esAprobado={esAprobado}
          filtro={pendFiltro} onFiltro={setPendFiltro} />
      )}

      {vista === 'drive' && driveUrl && (
        <DriveView driveUrl={driveUrl} color={marcaColor} />
      )}

      <p className="text-center text-[11px] text-muted-foreground pt-2">Portal de clientes · Distinto Agencia</p>

      {/* Pop-up del día (solo cuando ese día tiene VARIAS publicaciones): lista
          los videos de ese día para elegir cuál ver. Con una sola, no aparece —
          se abre el video directo. Pedro 5-ago-2026. */}
      {diaPopup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(15,23,42,0.55)' }} onClick={() => setDiaPopup(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-background w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold px-3 py-1.5 rounded-full" style={{ background: `${marcaColor}18`, color: marcaColor }}>
                <CalendarDays className="w-4 h-4" /> {capitalizar(fechaBonita(diaPopup))}
              </span>
              <button onClick={() => setDiaPopup(null)} className="shrink-0 inline-flex items-center gap-1 text-[13px] font-bold px-3 h-9 rounded-xl hover:bg-muted transition-colors"><X className="w-4 h-4" /> Cerrar</button>
            </div>
            <p className="text-[12px] text-muted-foreground mb-2.5">Toca un video para verlo. 👇</p>
            <div className="space-y-2">
              {(porDia.get(diaPopup) ?? []).map((p) => (
                <FilaCompacta key={p.id} p={p} color={colorEstado(p)} badge={estadoLabel(p)} proceso={procesoLabel(p)} onClick={() => { setDiaPopup(null); setModalPub(p) }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {modalPub && (
        <DetalleModal
          p={modalPub} color={marcaColor}
          publicada={esPublicada(modalPub)}
          aprobado={esAprobado(modalPub)}
          aprobandoAhora={aprobando === modalPub.id}
          onAprobar={() => aprobar(modalPub.id)}
          puedeAprobar={!esPublicada(modalPub)}
          onCambiarFecha={(f) => { moverPub(modalPub.id, f); setModalPub(null) }}
          onClose={() => setModalPub(null)}
        />
      )}
        </div>
      </div>
    </div>
  )
}

/* Ventana de detalle de una publicación (al tocarla en el calendario). Muestra
   el video (chico) y el botón Aprobar. Es un panel centrado/hoja inferior — NO
   el reproductor a pantalla completa. */
function DetalleModal({ p, color, publicada, aprobado, aprobandoAhora, onAprobar, puedeAprobar, onCambiarFecha, onClose }: {
  p: PubCliente; color: string; publicada: boolean
  aprobado: boolean; aprobandoAhora: boolean; onAprobar: () => void; puedeAprobar: boolean
  onCambiarFecha?: (fecha: string) => void; onClose: () => void
}) {
  const esDiseno = esDisenoPieza(p)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ background: 'rgba(15,23,42,0.5)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b bg-card">
          {esDiseno ? (
            <div className="text-[13px] font-bold flex items-center gap-1.5 min-w-0" style={{ color: '#8b5cf6' }}>
              <Palette className="w-4 h-4 shrink-0" /> <span className="truncate">Diseño de Aylin</span>
            </div>
          ) : (
            <div className="text-[13px] font-bold flex items-center gap-1.5 min-w-0" style={{ color }}>
              <CalendarDays className="w-4 h-4 shrink-0" /> <span className="truncate">{capitalizar(fechaBonita(p.fecha)) || 'Publicación'}</span>
            </div>
          )}
          <button onClick={onClose} className="shrink-0 inline-flex items-center gap-1 text-[13px] font-bold px-3 h-9 rounded-xl hover:bg-muted transition-colors"><X className="w-4 h-4" /> Cerrar</button>
        </div>
        {esDiseno ? (
          <DisenoDetalle p={p} />
        ) : (
          <div className="p-3 space-y-3">
            {/* Cambiar fecha — el cliente puede reprogramar la publicación (útil
                en celular, donde no se puede arrastrar). Solo si no está
                publicada. Pedro 17-jul-2026. */}
            {puedeAprobar && onCambiarFecha && (
              <label className="flex items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-[13px] font-semibold">
                <span className="inline-flex items-center gap-1.5" style={{ color }}><CalendarDays className="w-4 h-4" /> Cambiar fecha</span>
                <input
                  type="date"
                  defaultValue={p.fecha ?? ''}
                  onChange={(e) => { if (e.target.value) onCambiarFecha(e.target.value) }}
                  className="h-9 px-2 rounded-lg border bg-background text-[13px] text-foreground"
                />
              </label>
            )}
            <PubCard p={p} color={color} publicada={publicada} abierto onToggle={onClose}
              aprobado={aprobado} aprobandoAhora={aprobandoAhora} onAprobar={onAprobar} puedeAprobar={puedeAprobar} />
          </div>
        )}
      </div>
    </div>
  )
}

/* Detalle de un DISEÑO de Aylin (banner, post, catálogo…). NO es video: se
   muestra la pieza (o su link de Drive) y NO tiene botón Aprobar — los diseños
   se coordinan directo con el equipo; el portal solo los deja registrados para
   que el cliente los vea. Pedro 15-jul-2026. */
function DisenoDetalle({ p }: { p: PubCliente }) {
  const PURPLE = '#8b5cf6'
  const link = urlOk(p.driveResultado) ?? urlOk(p.portada) ?? urlOk(p.video)
  const embed = driveEmbed(p.driveResultado) ?? driveEmbed(p.portada) ?? driveEmbed(p.video)
  const imgDirecta = !embed
    ? (urlOk(p.portada) ?? (link && /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(link) ? link : null))
    : null
  return (
    <div className="p-3 space-y-3">
      <div className="text-[16px] font-extrabold leading-tight">{p.titulo}</div>

      {/* Vista de la pieza: embebe el Drive o muestra la imagen; si no, aviso. */}
      {embed ? (
        <div className="rounded-xl overflow-hidden border bg-black/5" style={{ aspectRatio: '4 / 5' }}>
          <iframe src={embed} title={p.titulo} allow="autoplay" style={{ width: '100%', height: '100%', border: 0 }} />
        </div>
      ) : imgDirecta ? (
        <a href={link ?? imgDirecta} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgDirecta} alt={p.titulo} className="w-full h-auto" />
        </a>
      ) : (
        <div className="rounded-xl p-8 text-center flex flex-col items-center" style={{ background: `${PURPLE}10` }}>
          <Palette className="w-12 h-12 mb-2" style={{ color: PURPLE }} strokeWidth={1.75} />
          <p className="text-[13px] text-muted-foreground">Pieza gráfica del equipo. Ábrela en Drive para verla en grande.</p>
        </div>
      )}

      {/* Estado + fecha de entrega */}
      <div className="flex items-center gap-2 flex-wrap text-[12px]">
        <span className="inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full" style={{ background: `${PURPLE}18`, color: PURPLE }}>
          <Palette className="w-3.5 h-3.5" /> {disenoLabel(p)}
        </span>
        {p.fechaEntrega && <span className="text-muted-foreground inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 shrink-0" /> Entrega: {capitalizar(fechaBonita(p.fechaEntrega))}</span>}
      </div>

      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-white font-bold text-[14px]"
          style={{ background: `linear-gradient(135deg, ${PURPLE}, #a855f7)` }}>
          <ExternalLink className="w-4 h-4" /> Ver diseño en Drive
        </a>
      )}

      {p.copy && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Detalle</div>
          <p className="text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed">{p.copy}</p>
          <CopiarTextoBtn texto={p.copy} color={PURPLE} />
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1 pt-1">
        <Palette className="w-3 h-3" style={{ color: PURPLE }} /> Este diseño lo coordinas directo con el equipo. Acá queda registrado para que lo veas.
      </p>
    </div>
  )
}

/* ===== Grilla SEMANAL — columnas por día (estilo grilla del equipo) ===== */
/* Grilla mensual COMPACTA para MÓVIL: 7 columnas de celdas cuadradas con el día
   y puntitos (uno por publicación, con el color de su estado). Tocar un día con
   contenido abre la vista "Día". Reemplaza el scroll horizontal que hacía ver
   solo 2 días por semana. Pedro 27-jul-2026. */
function MobileMonthGrid({ monthWeeks, porDia, hoy, marcaColor, mesFiltro, colorEstado, onPickDay }: {
  monthWeeks: string[][]
  porDia: Map<string, PubCliente[]>
  hoy: string
  marcaColor: string
  mesFiltro: number
  colorEstado: (p: PubCliente) => string
  onPickDay: (iso: string) => void
}) {
  const cabecera = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const dias = monthWeeks.flat()
  return (
    <div className="lg:hidden">
      <div className="grid grid-cols-7">
        {cabecera.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground py-1.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dias.map((k) => {
          const dt = parseYmd(k)
          const items = porDia.get(k) ?? []
          const isHoy = k === hoy
          const fuera = dt.getMonth() !== mesFiltro
          const hasItems = items.length > 0
          // Color representativo del día = el del primer contenido (verde=aprobado,
          // gris=publicado, marrón=en edición, marca=listo). Tiñe la celda + puntitos.
          const colDia = hasItems ? colorEstado(items[0]) : marcaColor
          return (
            <button
              key={k}
              type="button"
              onClick={hasItems ? () => onPickDay(k) : undefined}
              aria-disabled={!hasItems}
              className="aspect-square min-w-0 rounded-lg flex flex-col items-center justify-start px-0.5 pt-1 transition-colors overflow-hidden"
              style={{
                background: isHoy ? marcaColor : hasItems ? `${colDia}22` : 'transparent',
                opacity: fuera ? 0.3 : 1,
                cursor: hasItems ? 'pointer' : 'default',
              }}
            >
              <span className="text-[12px] font-bold leading-none" style={{ color: isHoy ? '#fff' : undefined }}>{dt.getDate()}</span>
              {hasItems && (
                <>
                  <span className="mt-1 flex flex-wrap items-center justify-center gap-[3px] max-w-full leading-none">
                    {items.slice(0, 3).map((p) => (
                      <span key={p.id} className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: isHoy ? '#fff' : colorEstado(p) }} />
                    ))}
                    {items.length > 3 && (
                      <span className="text-[8px] font-bold leading-none" style={{ color: isHoy ? '#fff' : colDia }}>+{items.length - 3}</span>
                    )}
                  </span>
                  {/* Texto corto del estado (Editando/Aprobado/Por publicar…) para que
                      no parezca que todo está listo. Pedro 5-ago-2026. */}
                  <span className="mt-0.5 text-[7.5px] font-bold leading-tight text-center w-full truncate px-0.5" style={{ color: isHoy ? '#fff' : colDia }}>
                    {estadoCortoCal(items[0])}{items.length > 1 ? ` +${items.length - 1}` : ''}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-2.5">Toca un día con contenido para ver sus publicaciones. 👆</p>
    </div>
  )
}

function WeekView({ weekDays, porDia, hoy, marcaColor, colorEstado, estadoLabel, redesStr, onChip, expandidoId, mesFiltro, puedeMover, onMover }: {
  weekDays: string[]
  porDia: Map<string, PubCliente[]>
  hoy: string
  marcaColor: string
  colorEstado: (p: PubCliente) => string
  estadoLabel: (p: PubCliente) => string
  redesStr: (p: PubCliente) => string
  onChip: (p: PubCliente) => void
  expandidoId: string | null
  mesFiltro?: number
  puedeMover?: (p: PubCliente) => boolean
  onMover?: (pubId: string, fecha: string) => void
}) {
  /* Día sobre el que se está soltando una tarjeta (para resaltarlo). */
  const [dropDia, setDropDia] = useState<string | null>(null)

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 lg:grid lg:grid-cols-7 lg:gap-2.5 lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0">
      {weekDays.map((k) => {
        const dt = parseYmd(k)
        const dow = (dt.getDay() + 6) % 7
        const items = porDia.get(k) ?? []
        const isHoy = k === hoy
        const fuera = mesFiltro != null && dt.getMonth() !== mesFiltro
        const esDrop = dropDia === k
        return (
          <div
            key={k}
            className="min-w-[150px] flex-shrink-0 lg:min-w-0 lg:flex-shrink rounded-xl transition-colors"
            style={{ opacity: fuera ? 0.38 : 1, background: esDrop ? `${marcaColor}14` : undefined, outline: esDrop ? `2px dashed ${marcaColor}` : undefined }}
            onDragOver={(e) => { if (onMover) { e.preventDefault(); if (dropDia !== k) setDropDia(k) } }}
            onDragLeave={() => { if (dropDia === k) setDropDia(null) }}
            onDrop={(e) => {
              setDropDia(null)
              const id = e.dataTransfer.getData('text/plain')
              if (id && onMover) onMover(id, k)
            }}
          >
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
                const proceso = procesoLabel(p)
                const arrastrable = !!(puedeMover?.(p) && onMover)
                return (
                  /* Alto FIJO para que todas las cajitas midan igual: el título
                     ocupa siempre 2 líneas y el estado/proceso van pegados abajo.
                     Arrastrable si no está publicada. Pedro 17-jul-2026. */
                  <button
                    key={p.id}
                    onClick={() => onChip(p)}
                    draggable={arrastrable}
                    onDragStart={(e) => { if (arrastrable) e.dataTransfer.setData('text/plain', p.id) }}
                    title={arrastrable ? 'Arrástrala para cambiar la fecha' : undefined}
                    className={`w-full text-left rounded-lg p-2 h-[78px] flex flex-col transition-all hover:shadow-sm ${arrastrable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    style={{ borderLeft: `3px solid ${c}`, background: activo ? `${c}2e` : `${c}12`, boxShadow: activo ? `0 0 0 1.5px ${c}` : undefined }}
                  >
                    <div className="text-[12px] font-bold leading-tight line-clamp-2">{p.titulo}</div>
                    <div className="mt-auto">
                      <div className="text-[10px] font-semibold flex items-center gap-1" style={{ color: c }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: c }} /> {estadoLabel(p)}{redes ? ` · ${redes}` : ''}
                      </div>
                      {proceso && (
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1"><Clapperboard className="w-3 h-3 shrink-0" /> <span className="truncate">{proceso}</span></div>
                      )}
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
      className="w-full min-w-0 inline-flex items-center justify-center gap-1 px-1 h-9 rounded-xl text-[12px] sm:text-[13px] font-bold whitespace-nowrap transition-all"
      style={{ background: active ? '#fff' : 'transparent', color: active ? color : 'var(--muted-foreground, #64748b)', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : undefined }}>
      <span className="shrink-0">{icon}</span> {label}
    </button>
  )
}

/* Formato fecha corta + hora (Lima) — usado en observaciones. */
function fmtHoraMsg(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch { return '' }
}
/* Formato fecha larga + hora (Lima) — usado en reuniones. */
function fmtFechaHora(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch { return '' }
}

/* ===== OBSERVACIONES — el CLIENTE deja feedback; el equipo (Erick) lo ve.
   De una vía: cliente → equipo (con push a Erick + Pedro). Pedro 15-jul-2026. */
function ObservacionesView({ observaciones, color }: { observaciones: Observacion[]; color: string }) {
  const router = useRouter()
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [extra, setExtra] = useState<Observacion[]>([])
  const prevLen = useRef(observaciones.length)

  // Al llegar data nueva del server (realtime/refresh) limpiamos los optimistas.
  useEffect(() => {
    if (observaciones.length !== prevLen.current) {
      setExtra([]); setBorradas([]); prevLen.current = observaciones.length
    }
  }, [observaciones.length])

  // Ids borrados localmente (optimista) para que desaparezcan al instante.
  const [borradas, setBorradas] = useState<string[]>([])
  const todas = [...extra, ...observaciones].filter((o) => !borradas.includes(o.id)) // más recientes primero

  async function borrar(o: Observacion) {
    if (!confirm('¿Borrar esta observación? El equipo dejará de verla.')) return
    setBorradas((prev) => [...prev, o.id]) // optimista
    // Si era una optimista (aún sin guardar), solo la quitamos de la lista.
    if (o.id.startsWith('tmp-')) { setExtra((prev) => prev.filter((x) => x.id !== o.id)); return }
    const r = await eliminarObservacionCliente(o.id)
    if (!r.ok) {
      toast.error(r.error || 'No se pudo borrar')
      setBorradas((prev) => prev.filter((x) => x !== o.id)) // revertir
      return
    }
    toast.success('Observación borrada')
    router.refresh()
  }

  async function doSend() {
    const t = texto.trim()
    if (!t || enviando) return
    setEnviando(true)
    const tmpId = `tmp-${todas.length}-${t.length}`
    setExtra((prev) => [{ id: tmpId, autorNombre: null, texto: t, atendida: false, createdAt: new Date().toISOString() }, ...prev])
    setTexto('')
    const r = await enviarObservacionCliente(t)
    if (!r.ok) {
      toast.error(r.error || 'No se pudo enviar la observación')
      setExtra((prev) => prev.filter((m) => m.id !== tmpId))
      setTexto(t)
    } else {
      router.refresh()
    }
    setEnviando(false)
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-card p-4 border">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl" style={{ background: `${color}18`, color }}>
            <ClipboardList className="w-4 h-4" />
          </span>
          <div>
            <div className="font-bold text-[15px] leading-tight">Observaciones</div>
            <div className="text-[11px] text-muted-foreground">Déjanos tus comentarios o pedidos; el equipo los revisa.</div>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); doSend() }} className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend() } }}
            rows={2}
            maxLength={2000}
            placeholder="Escribe tu observación…"
            className="flex-1 resize-none max-h-28 rounded-2xl border px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          <button type="submit" disabled={!texto.trim() || enviando}
            className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-2xl text-white transition-opacity disabled:opacity-40"
            style={{ background: color }} aria-label="Enviar observación">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {todas.length === 0 ? (
        <Vacio texto="Aún no dejaste observaciones. Escribe la primera arriba 👆" />
      ) : (
        <div className="space-y-2.5">
          {todas.map((o) => (
            <div key={o.id} className="rounded-2xl bg-card p-3.5 border" style={{ borderLeft: `4px solid ${color}` }}>
              <div className="text-[14px] text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">{o.texto}</div>
              <div className="flex items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
                  <span className="shrink-0">{fmtHoraMsg(o.createdAt)}</span>
                  {o.atendida
                    ? <span className="shrink-0 inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.14)', color: '#15803d' }}><CheckCircle2 className="w-3 h-3" /> Atendida</span>
                    : <span className="shrink-0 inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}14`, color }}><Clock className="w-3 h-3" /> Enviada</span>}
                </div>
                <button onClick={() => borrar(o)} title="Borrar esta observación" aria-label="Borrar esta observación"
                  className="shrink-0 w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* ===== REUNIONES — el equipo las agenda; el cliente las ve (solo lectura). ===== */
function ReunionesView({ reuniones, color }: { reuniones: Reunion[]; color: string }) {
  const ahora = Date.now()
  const esProxima = (r: Reunion) => r.estado === 'agendada' && new Date(r.fechaHora).getTime() >= ahora - 3600_000
  const proximas = reuniones.filter(esProxima)
  const pasadas = reuniones.filter((r) => !esProxima(r)).reverse()

  return (
    <section className="space-y-4">
      <SecHeader icon={<CalendarClock className="w-4 h-4" />} label="Próximas reuniones" count={proximas.length} color={color} />
      {proximas.length === 0 ? (
        <Vacio texto="No tienes reuniones agendadas por ahora. El equipo te avisa cuando programe una." />
      ) : (
        <div className="space-y-2.5">{proximas.map((r) => <ReunionCard key={r.id} r={r} color={color} />)}</div>
      )}
      {pasadas.length > 0 && (
        <div className="mt-5">
          <SecHeader icon={<CheckCircle2 className="w-4 h-4" />} label="Anteriores" count={pasadas.length} color="#64748b" />
          <div className="space-y-2.5">{pasadas.map((r) => <ReunionCard key={r.id} r={r} color={color} pasada />)}</div>
        </div>
      )}
    </section>
  )
}

function ReunionCard({ r, color, pasada }: { r: Reunion; color: string; pasada?: boolean }) {
  const enlace = r.modalidad === 'virtual' ? urlOk(r.lugarEnlace) : null
  return (
    <div className="rounded-2xl bg-card p-3.5 border" style={{ borderLeft: `4px solid ${color}`, opacity: pasada ? 0.7 : 1 }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[15px] font-bold leading-tight">{r.titulo}</div>
          <div className="text-[12px] text-muted-foreground mt-0.5 capitalize flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 shrink-0" /> {fmtFechaHora(r.fechaHora)}</div>
        </div>
        {r.estado === 'cancelada' && <span className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(220,38,38,0.12)', color: '#b91c1c' }}>Cancelada</span>}
        {r.estado === 'realizada' && <span className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(22,163,74,0.12)', color: '#15803d' }}>Realizada</span>}
      </div>
      <div className="flex items-center gap-1.5 mt-2 text-[12px] font-semibold" style={{ color }}>
        {r.modalidad === 'virtual' ? <><Video className="w-3.5 h-3.5" /> Virtual</> : <><MapPin className="w-3.5 h-3.5" /> Presencial</>}
        {r.modalidad === 'presencial' && r.lugarEnlace && <span className="text-muted-foreground font-normal">· {r.lugarEnlace}</span>}
      </div>
      {r.notas && <p className="text-[13px] text-foreground/80 whitespace-pre-wrap mt-2 leading-relaxed">{r.notas}</p>}
      {enlace && r.estado === 'agendada' && (
        <a href={enlace} target="_blank" rel="noopener noreferrer"
          className="mt-3 w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl text-white font-bold text-[13px]"
          style={{ background: color }}>
          <Video className="w-4 h-4" /> Unirse a la reunión
        </a>
      )}
    </div>
  )
}

/* ===== FECHAS DE GRABACIÓN — el cliente ve sus sesiones y también puede
   AGENDAR una él mismo (si el equipo no alcanzó a hacerlo). Al agendar le
   llega push a Erick + Pedro. Pedro 15-jul-2026. ===== */
function GrabacionesView({ grabaciones, color, hoy }: { grabaciones: GrabacionCliente[]; color: string; hoy: string }) {
  const router = useRouter()
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  const esProxima = (g: GrabacionCliente) => g.estado === 'planeada' && g.fechaPlaneada >= hoy
  const proximas = grabaciones.filter(esProxima).sort((a, b) => a.fechaPlaneada.localeCompare(b.fechaPlaneada))
  const historial = grabaciones.filter((g) => !esProxima(g))

  async function agendar() {
    if (!fecha) { toast.error('Elige la fecha de la grabación'); return }
    setGuardando(true)
    const r = await agendarGrabacionCliente({ fecha, hora, notas })
    setGuardando(false)
    if (!r.ok) { toast.error(r.error); return }
    setFecha(''); setHora(''); setNotas('')
    toast.success('🎥 ¡Grabación agendada! Ya le avisamos al equipo.')
    router.refresh()
  }

  return (
    <section className="space-y-4">
      {/* Agendar una grabación */}
      <div className="rounded-2xl bg-card p-4 border space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl" style={{ background: `${color}18`, color }}>
            <CalendarPlus className="w-4 h-4" />
          </span>
          <div>
            <div className="font-bold text-[15px] leading-tight">Agendar una grabación</div>
            <div className="text-[11px] text-muted-foreground">Elige el día y le avisamos al equipo al instante.</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] font-semibold text-muted-foreground flex flex-col gap-1">
            Fecha
            <input type="date" value={fecha} min={hoy} onChange={(e) => setFecha(e.target.value)}
              className="h-11 px-3 rounded-xl border bg-background text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-black/10" />
          </label>
          <label className="text-[11px] font-semibold text-muted-foreground flex flex-col gap-1">
            Hora (opcional)
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)}
              className="h-11 px-3 rounded-xl border bg-background text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-black/10" />
          </label>
        </div>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} maxLength={500}
          placeholder="Nota para el equipo (opcional): lugar, qué grabar…"
          className="w-full resize-none rounded-xl border bg-background px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-black/10" />
        <button onClick={agendar} disabled={!fecha || guardando}
          className="w-full h-11 rounded-xl text-white font-bold text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: color }}>
          <CalendarPlus className="w-4 h-4" /> {guardando ? 'Agendando…' : 'Agendar y avisar al equipo'}
        </button>
      </div>

      <SecHeader icon={<Clapperboard className="w-4 h-4" />} label="Próximas grabaciones" count={proximas.length} color={color} />
      {proximas.length === 0 ? (
        <Vacio texto="No hay grabaciones programadas por ahora." />
      ) : (
        <div className="space-y-2.5">{proximas.map((g) => <GrabacionCard key={g.id} g={g} color={color} />)}</div>
      )}
      {historial.length > 0 && (
        <div className="mt-5">
          <SecHeader icon={<CheckCircle2 className="w-4 h-4" />} label="Historial" count={historial.length} color="#64748b" />
          <div className="space-y-2.5">{historial.map((g) => <GrabacionCard key={g.id} g={g} color={color} pasada />)}</div>
        </div>
      )}
    </section>
  )
}

function GrabacionCard({ g, color, pasada }: { g: GrabacionCliente; color: string; pasada?: boolean }) {
  const badge = g.estado === 'cumplida'
    ? { t: 'Grabada', bg: 'rgba(22,163,74,0.12)', c: '#15803d' }
    : g.estado === 'cancelada'
      ? { t: 'Cancelada', bg: 'rgba(220,38,38,0.12)', c: '#b91c1c' }
      : { t: 'Programada', bg: `${color}14`, c: color }
  const fecha = g.fechaReal ?? g.fechaPlaneada
  return (
    <div className="rounded-2xl bg-card p-3.5 border flex items-center gap-3" style={{ borderLeft: `4px solid ${badge.c}`, opacity: pasada ? 0.8 : 1 }}>
      <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${badge.c}18`, color: badge.c }}><Video className="w-5 h-5" /></span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold capitalize leading-tight">
          {capitalizar(fechaBonita(fecha))}{g.horaPlaneada ? ` · ${g.horaPlaneada.slice(0, 5)}` : ''}
        </div>
        <div className="text-[12px] text-muted-foreground mt-0.5 truncate">
          {g.estado === 'cumplida' && g.videosGrabados ? `${g.videosGrabados} videos grabados` : 'Sesión de grabación'}
          {g.notas ? ` · ${g.notas}` : ''}
        </div>
        {g.agendadaPorCliente && (
          <div className="text-[11px] font-semibold mt-1 inline-flex items-center gap-1" style={{ color }}>
            <CalendarPlus className="w-3 h-3" /> Agendada por ti
          </div>
        )}
      </div>
      <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: badge.bg, color: badge.c }}>{badge.t}</span>
    </div>
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

/* Botón del toggle Lista/Cuadrícula (icono + texto). */
/* Tareas PENDIENTES de la marca — TODO lo que falta hacer, separado por quién
   debe actuar. Pedro 17-jul-2026:
     1) Para aprobar (acción del CLIENTE) — videos listos esperando su OK.
     2) En proceso (el EQUIPO) — videos que aún se están armando.
     3) Aprobados · por publicar (el EQUIPO) — ya los aprobó, faltan subir.
     4) Diseños en proceso (el EQUIPO). */
function hayVideoListo(p: PubCliente): boolean {
  return !!urlOk(p.video) || !!urlOk(p.driveResultado) ||
    ['aprobar', 'enviado', 'programar', 'programar_anuncios'].includes((p.estado ?? '').toLowerCase())
}

function TareasPendientesView({ items, color, onChip, estadoLabel, esAprobado, filtro, onFiltro }: {
  items: PubCliente[]
  color: string
  onChip: (p: PubCliente) => void
  estadoLabel: (p: PubCliente) => string
  esAprobado: (p: PubCliente) => boolean
  filtro: 'todas' | 'publicaciones' | 'disenos'
  onFiltro: (f: 'todas' | 'publicaciones' | 'disenos') => void
}) {
  const videos = items.filter((p) => !esDisenoPieza(p))
  const disenos = items.filter(esDisenoPieza)
  // ¿Qué grupos mostrar según el filtro elegido en el sidebar / chips?
  const verVideos = filtro === 'todas' || filtro === 'publicaciones'
  const verDisenos = filtro === 'todas' || filtro === 'disenos'

  // Videos que el CLIENTE debe aprobar: no aprobados todavía y ya hay algo que ver.
  const paraAprobar = videos.filter((p) => !esAprobado(p) && hayVideoListo(p))
  // Aprobados por el cliente pero aún no publicados: le toca al equipo.
  const porPublicar = videos.filter((p) => esAprobado(p))
  // En proceso: ni aprobados ni con video listo → el equipo los está armando.
  const enProceso = videos.filter((p) => !esAprobado(p) && !hayVideoListo(p))

  const Fila = (p: PubCliente, badge: { txt: string; c: string }) => {
    const dis = esDisenoPieza(p)
    const fecha = dis ? p.fechaEntrega ?? p.fecha : p.fecha
    return (
      <button key={p.id} onClick={() => onChip(p)}
        className="w-full text-left rounded-2xl bg-card p-3 flex items-center gap-3 border hover:shadow-sm transition-shadow"
        style={{ borderLeft: `4px solid ${badge.c}` }}>
        <Thumb portada={dis ? p.portada : portadaDe(p)} color={badge.c} kind={dis ? 'diseno' : 'video'} size={48} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold truncate">{p.titulo}</div>
          <div className="text-[12px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
            <span>{dis ? 'Diseño' : 'Video'}</span> · <CalendarDays className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{fecha ? fechaBonita(fecha) : 'Sin fecha'}</span>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${badge.c}1f`, color: badge.c }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: badge.c }} /> {badge.txt}
        </span>
      </button>
    )
  }

  // Total visible según el filtro (para encabezado y estado vacío).
  const mostrados = (verVideos ? videos.length : 0) + (verDisenos ? disenos.length : 0)
  const chips: { id: 'todas' | 'publicaciones' | 'disenos'; label: string; n: number }[] = [
    { id: 'todas', label: 'Todas', n: items.length },
    { id: 'publicaciones', label: 'Publicaciones', n: videos.length },
    { id: 'disenos', label: 'Diseños', n: disenos.length },
  ]

  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-card p-4 sm:p-5 border flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl shrink-0" style={{ background: `${color}18`, color }}>
          <ListTodo className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-[16px] leading-tight">Tareas pendientes</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">
            {items.length === 0 ? 'No hay nada pendiente por ahora.' : `${items.length} pendiente${items.length === 1 ? '' : 's'} en tu marca.`}
          </div>
        </div>
      </div>

      {/* Chips de filtro (para móvil, donde no se ve el sidebar). */}
      {items.length > 0 && (
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-0.5">
          {chips.map((c) => {
            const act = filtro === c.id
            return (
              <button key={c.id} onClick={() => onFiltro(c.id)}
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-bold border transition-colors"
                style={act ? { background: color, color: '#fff', borderColor: color } : { color: 'var(--muted-foreground, #64748b)' }}>
                {c.label}
                <span className="min-w-4 h-4 px-1 rounded-full text-[10px] inline-flex items-center justify-center font-bold"
                  style={act ? { background: 'rgba(255,255,255,0.28)', color: '#fff' } : { background: `${color}1f`, color }}>{c.n}</span>
              </button>
            )
          })}
        </div>
      )}

      {items.length === 0 ? (
        <Vacio texto="🎉 ¡Todo al día! No tienes tareas pendientes." />
      ) : mostrados === 0 ? (
        <Vacio texto={filtro === 'disenos' ? '🎨 No hay diseños pendientes.' : '🎬 No hay publicaciones pendientes.'} />
      ) : (
        <>
          {verVideos && paraAprobar.length > 0 && (
            <section>
              <SecHeader icon={<ThumbsUp className="w-4 h-4" />} label="Para aprobar (tú)" count={paraAprobar.length} color={C_APROBADO} />
              <p className="text-[12px] text-muted-foreground -mt-1 mb-2">Míralos y aprueba: el equipo espera tu OK para publicarlos. 👇</p>
              <div className="space-y-2">{paraAprobar.map((p) => Fila(p, { txt: 'Por aprobar', c: C_APROBADO }))}</div>
            </section>
          )}
          {verVideos && enProceso.length > 0 && (
            <section>
              <SecHeader icon={<Clapperboard className="w-4 h-4" />} label="Videos en proceso" count={enProceso.length} color={color} />
              <div className="space-y-2">{enProceso.map((p) => Fila(p, { txt: procesoLabel(p) ?? estadoLabel(p), c: color }))}</div>
            </section>
          )}
          {verVideos && porPublicar.length > 0 && (
            <section>
              <SecHeader icon={<Clock className="w-4 h-4" />} label="Aprobados · por publicar" count={porPublicar.length} color="#0ea5e9" />
              <div className="space-y-2">{porPublicar.map((p) => Fila(p, { txt: 'Por publicar', c: '#0ea5e9' }))}</div>
            </section>
          )}
          {verDisenos && disenos.length > 0 && (
            <section>
              <SecHeader icon={<Palette className="w-4 h-4" />} label="Diseños en proceso" count={disenos.length} color="#8b5cf6" />
              <div className="space-y-2">{disenos.map((p) => Fila(p, { txt: disenoLabel(p), c: '#8b5cf6' }))}</div>
            </section>
          )}
        </>
      )}
    </section>
  )
}

/* Almacenamiento en Drive de la marca. Muestra la carpeta embebida (si es
   pública) y un botón para abrirla en Google Drive con la sesión del cliente.
   Pedro 17-jul-2026. */
function DriveView({ driveUrl, color }: { driveUrl: string; color: string }) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-card p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl shrink-0" style={{ background: `${color}18`, color }}>
          <HardDrive className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-[16px] leading-tight">Almacenamiento en Drive</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">Todos los archivos de tu marca: fotos, videos y material del equipo. Navega las carpetas aquí mismo.</div>
        </div>
        <a href={driveUrl} target="_blank" rel="noopener noreferrer"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-white font-bold text-[14px] shrink-0"
          style={{ background: color }}>
          <ExternalLink className="w-4 h-4" /> Abrir en Google Drive
        </a>
      </div>

      {/* Explorador in-app: navega carpetas y abre archivos sin salir. */}
      <DriveExplorer color={color} driveUrl={driveUrl} />
    </section>
  )
}

/* Toggle Lista / Cuadrícula — pastilla con dos íconos (como la referencia de
   Pedro), el lado activo pintado con el color de la marca. Pedro 17-jul-2026. */
function ToggleFmt({ value, onChange, color }: { value: 'grid' | 'lista'; onChange: (v: 'grid' | 'lista') => void; color: string }) {
  return (
    <div className="inline-flex items-center rounded-full border overflow-hidden shrink-0" style={{ borderColor: `${color}55` }}>
      <button onClick={() => onChange('lista')} aria-label="Ver en lista" title="Lista"
        className="w-11 h-9 inline-flex items-center justify-center transition-colors"
        style={value === 'lista' ? { background: color, color: '#fff' } : { color: 'var(--muted-foreground, #64748b)' }}>
        <List className="w-4 h-4" />
      </button>
      <button onClick={() => onChange('grid')} aria-label="Ver en cuadrícula" title="Cuadrícula"
        className="w-11 h-9 inline-flex items-center justify-center transition-colors"
        style={value === 'grid' ? { background: color, color: '#fff' } : { color: 'var(--muted-foreground, #64748b)' }}>
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  )
}

/* Fila compacta de una publicación/diseño para el modo LISTA. */
function FilaCompacta({ p, color, badge, proceso, onClick }: {
  p: PubCliente; color: string; badge: string; proceso?: string | null; onClick: () => void
}) {
  const dis = esDisenoPieza(p)
  return (
    <button onClick={onClick}
      className="w-full text-left rounded-2xl bg-card p-3 border flex items-center gap-3 transition-shadow hover:shadow-md"
      style={{ borderLeft: `5px solid ${color}` }}>
      <Thumb portada={portadaDe(p)} color={color} kind={dis ? 'diseno' : 'video'} size={54} />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-bold truncate">{p.titulo}</div>
        <div className="text-[12px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
          {p.fecha ? <><CalendarDays className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{fechaBonita(p.fecha)}</span></> : <span>Sin fecha</span>}
          {proceso ? <> · <Clapperboard className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{proceso}</span></> : null}
        </div>
      </div>
      <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${color}18`, color }}>{badge}</span>
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

function PubCard({ p, color, publicada, abierto, onToggle, aprobado, aprobandoAhora, onAprobar, puedeAprobar }: {
  p: PubCliente; color: string; publicada?: boolean
  abierto: boolean; onToggle: () => void
  aprobado: boolean; aprobandoAhora: boolean; onAprobar: () => void; puedeAprobar?: boolean
}) {
  const dis = esDisenoPieza(p)
  const [playing, setPlaying] = useState(false)
  /* Si el reproductor nativo falla (video no público, etc.) caemos solos al
     iframe de Drive: el cliente nunca se queda sin poder ver el video. */
  const [videoFallo, setVideoFallo] = useState(false)
  const contenidoUrl = urlOk(p.video) ?? urlOk(p.driveResultado) ?? urlOk(p.portada)
  const embed = driveEmbed(p.video) ?? driveEmbed(p.driveResultado) ?? driveEmbed(p.portada)
  const hayContenido = !!contenidoUrl
  const esVideo = !!urlOk(p.video)

  /* Reproductor NATIVO: si el video vive en Drive, usamos el MP4 directo. Da
     pantalla completa, calidad original, y controles decentes en celular. El
     iframe de Drive queda solo de respaldo (salía cortado y con controles
     gigantes). La portada es un fotograma REAL del video. Pedro 15-jul-2026. */
  const videoDirecto = videoAppUrl(p.video) ?? videoAppUrl(p.driveResultado)
  const portadaReal = urlOk(p.portada) ?? driveThumbUrl(p.video) ?? driveThumbUrl(p.driveResultado)

  /* CORRECCIONES: el cliente marca el segundo del video (currentTime del <video>)
     y escribe qué corregir; puede añadir varias y enviarlas todas al equipo.
     Pedro 5-ago-2026. */
  const videoRef = useRef<HTMLVideoElement>(null)
  const [modoCorr, setModoCorr] = useState(false)
  const [correcciones, setCorrecciones] = useState<Array<{ segundo: number | null; texto: string }>>([{ segundo: null, texto: '' }])
  const [enviandoCorr, setEnviandoCorr] = useState(false)
  const [corrEnviadas, setCorrEnviadas] = useState(false)
  const mmss = (s: number | null) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`)
  function marcarSegundo(i: number) {
    const v = videoRef.current
    if (!v || !isFinite(v.currentTime)) { toast.error('Reproduce el video y pausa en el segundo a corregir'); return }
    const s = Math.floor(v.currentTime)
    setCorrecciones((cs) => cs.map((c, idx) => (idx === i ? { ...c, segundo: s } : c)))
  }
  function addCorreccion() { setCorrecciones((cs) => [...cs, { segundo: null, texto: '' }]) }
  function quitarCorreccion(i: number) { setCorrecciones((cs) => (cs.length === 1 ? cs : cs.filter((_, idx) => idx !== i))) }
  async function enviarCorr() {
    const items = correcciones.filter((c) => c.texto.trim())
    if (items.length === 0) { toast.error('Escribe al menos una corrección'); return }
    setEnviandoCorr(true)
    const r = await enviarCorreccionesCliente(p.id, items)
    setEnviandoCorr(false)
    if (r.ok) { setCorrEnviadas(true); setModoCorr(false); toast.success('✍️ Correcciones enviadas al equipo') }
    else toast.error(r.error)
  }

  return (
    <div className="rounded-2xl bg-card overflow-hidden border transition-shadow hover:shadow-md" style={{ borderLeft: `5px solid ${color}` }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3 text-left">
        {/* Portada = fotograma real del video (antes salía el cuadro de color). */}
        <Thumb portada={portadaReal} color={color} kind={dis ? 'diseno' : 'video'} size={54} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold truncate">{p.titulo}</div>
          <div className="text-[12px] text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
            {publicada
              ? <span className="inline-flex items-center gap-1" style={{ color: '#0f766e', fontWeight: 600 }}><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Publicado {fechaBonita(p.publicadoAt ?? p.fecha)}</span>
              : <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 shrink-0" /> {fechaBonita(p.fecha)}</span>}
            {p.redes.length > 0 && <span>· {p.redes.map((r) => RED_EMOJI[r] ?? r).join(' ')}</span>}
          </div>
        </div>
        {aprobado && <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(22,163,74,0.14)', color: '#15803d' }}><ThumbsUp className="w-3 h-3" /> Aprobado</span>}
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3">
          {videoDirecto && !videoFallo ? (
            /* Reproductor NATIVO del navegador: el video completo (nada
               cortado), con su botón de PANTALLA COMPLETA, calidad original y
               un fotograma real de portada. Reemplaza al iframe de Drive, que
               en celular salía cortado y con controles enormes. */
            <div className="mx-auto rounded-xl overflow-hidden bg-black" style={{ width: '100%', maxWidth: 260, aspectRatio: '9 / 16' }}>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                src={videoDirecto}
                poster={portadaReal ?? undefined}
                controls
                playsInline
                preload="metadata"
                onError={() => setVideoFallo(true)}
                /* Red de seguridad para videos H.265/HEVC (el "Alta eficiencia"
                   del iPhone): el navegador reproduce el AUDIO pero no dibuja
                   la imagen — no lanza error, así que se quedaba congelado en la
                   portada. Si al arrancar no hay ni un cuadro dibujado, caemos
                   al reproductor de Drive, que sí los convierte. La solución de
                   fondo es subirlos en H.264. Pedro 16-jul-2026. */
                onLoadedMetadata={(e) => { if (!e.currentTarget.videoWidth) setVideoFallo(true) }}
                onPlaying={(e) => {
                  const v = e.currentTarget
                  setTimeout(() => {
                    const q = v.getVideoPlaybackQuality?.()
                    if (!v.videoWidth || (q && q.totalVideoFrames === 0)) setVideoFallo(true)
                  }, 1500)
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000' }}
              />
            </div>
          ) : embed ? (
            playing ? (
              <div className="mx-auto rounded-xl overflow-hidden bg-black" style={{ width: '100%', maxWidth: 260, aspectRatio: '9 / 16' }}>
                <iframe src={embed} title={p.titulo} allow="autoplay; fullscreen" allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} />
              </div>
            ) : (
              <button onClick={() => setPlaying(true)} className="relative w-full block rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
                <Thumb portada={portadaReal} color={color} kind={dis ? 'diseno' : 'video'} big />
                <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.28)' }}>
                  <span className="flex items-center justify-center rounded-full shadow-lg" style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.95)' }}>
                    <Play className="w-6 h-6" fill="#111" style={{ color: '#111', marginLeft: 3 }} />
                  </span>
                </span>
              </button>
            )
          ) : hayContenido ? (
            <a href={contenidoUrl!} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
              <Thumb portada={portadaReal} color={color} kind={dis ? 'diseno' : 'video'} big />
            </a>
          ) : (
            <div className="rounded-xl p-6 text-center text-[13px] text-muted-foreground" style={{ background: `${color}10` }}>
              ⏳ El equipo está preparando el contenido. Te avisamos cuando esté listo para revisar.
            </div>
          )}

          {videoDirecto && !videoFallo ? (
            <p className="text-[11px] text-muted-foreground text-center">
              ▶️ Toca para reproducir · usa ⛶ para verlo en <strong>pantalla completa</strong>
            </p>
          ) : embed ? (
            <p className="text-[11px] text-muted-foreground text-center">
              {playing ? '▶️ Se ve acá mismo · para verlo grande usa “Ver en Drive”' : '▶️ Toca para ver el video aquí'}
            </p>
          ) : null}

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
              <CopiarTextoBtn texto={p.copy} color={color} />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {/* Descargar el ORIGINAL en alta calidad. `?dl=1&name=` hace que se
                guarde como .mp4 con el nombre de la publicación (antes bajaba
                un archivo sin extensión que el celular tomaba por .html). */}
            {videoDirecto && (
              <a href={`${videoDirecto}?dl=1&name=${encodeURIComponent(p.titulo)}`} download
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[13px] font-bold text-white" style={{ background: color }}>
                <Download className="w-4 h-4" /> Descargar en alta calidad
              </a>
            )}
            {contenidoUrl && (
              <a href={contenidoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[13px] font-semibold border" style={{ borderColor: `${color}55`, color }}>
                <ExternalLink className="w-3.5 h-3.5" /> Ver {esVideo ? 'video' : 'contenido'} en Drive
              </a>
            )}
            {puedeAprobar && !aprobado && hayContenido && !modoCorr && !corrEnviadas && (
              <>
                <button onClick={onAprobar} disabled={aprobandoAhora} className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 h-11 rounded-xl text-white font-bold text-[14px] disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: '0 6px 16px -6px rgba(22,163,74,0.7)' }}>
                  <ThumbsUp className="w-5 h-5" /> {aprobandoAhora ? 'Aprobando…' : 'Aprobar'}
                </button>
                <button onClick={() => setModoCorr(true)} className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-[14px] border-2" style={{ borderColor: `${color}66`, color }}>
                  ✍️ Mandar correcciones
                </button>
              </>
            )}
            {aprobado && (
              <span className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-[13px] font-bold" style={{ background: 'rgba(22,163,74,0.12)', color: '#15803d' }}>
                <PartyPopper className="w-4 h-4" /> ¡Aprobado por ti!
              </span>
            )}
            {corrEnviadas && !aprobado && (
              <span className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-[13px] font-bold" style={{ background: `${color}18`, color }}>
                <CheckCircle2 className="w-4 h-4" /> Correcciones enviadas
              </span>
            )}
          </div>

          {/* Panel de CORRECCIONES por segundo del video (Pedro 5-ago-2026). */}
          {modoCorr && (
            <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: `${color}44`, background: `${color}08` }}>
              <div className="text-[12.5px] font-extrabold flex items-center gap-1.5" style={{ color }}>✍️ Correcciones del video</div>
              <p className="text-[11.5px] text-muted-foreground -mt-1.5">Reproduce el video de arriba, pausa en el momento a corregir y toca <strong>“Marcar segundo”</strong>. Luego escribe qué cambiar. Puedes añadir varias.</p>
              {correcciones.map((c, i) => (
                <div key={i} className="rounded-lg border bg-card p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-muted-foreground">Corrección {i + 1}</span>
                    {correcciones.length > 1 && (
                      <button type="button" onClick={() => quitarCorreccion(i)} className="text-[11px] font-semibold text-red-500 inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Quitar</button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => marcarSegundo(i)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-bold text-white shrink-0" style={{ background: color }}>🎯 Marcar segundo</button>
                    <span className="text-[13px] font-extrabold tabular-nums px-2.5 py-1 rounded-md" style={{ background: `${color}14`, color }}>{mmss(c.segundo)}</span>
                  </div>
                  <textarea value={c.texto} onChange={(e) => setCorrecciones((cs) => cs.map((x, idx) => (idx === i ? { ...x, texto: e.target.value } : x)))} rows={2} placeholder="¿Qué hay que corregir en ese momento?"
                    className="w-full px-3 py-2 rounded-lg border bg-background text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-black/10" />
                </div>
              ))}
              <button type="button" onClick={addCorreccion} className="w-full h-10 rounded-lg border-2 border-dashed text-[13px] font-bold inline-flex items-center justify-center gap-1.5" style={{ borderColor: `${color}55`, color }}>➕ Añadir más correcciones</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setModoCorr(false)} className="flex-1 h-11 rounded-xl font-bold text-[13px] border hover:bg-muted transition-colors">Cancelar</button>
                <button type="button" onClick={enviarCorr} disabled={enviandoCorr} className="flex-1 h-11 rounded-xl font-bold text-[14px] text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#ef4444,#f97316)' }}>{enviandoCorr ? 'Enviando…' : 'Enviar correcciones'}</button>
              </div>
            </div>
          )}

          {puedeAprobar && !aprobado && hayContenido && !modoCorr && !corrEnviadas && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" style={{ color }} /> Míralo y toca <strong>“Aprobar”</strong>, o usa <strong>“Mandar correcciones”</strong> si algo debe cambiar. El equipo recibe el aviso al instante.</p>
          )}
        </div>
      )}
    </div>
  )
}

/* Miniatura de una pieza. Si hay portada real la muestra; si no, cae a un
   cuadrito con el color de la marca y el ICONO del sistema (lucide) según el
   tipo — claqueta para video, paleta para diseño. Pedro 24-jul-2026: "usa los
   iconos de la agencia, no emojis". */
function Thumb({ portada, color, kind = 'video', size, big }: { portada: string | null; color: string; kind?: 'video' | 'diseno'; size?: number; big?: boolean }) {
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
  const iconPx = big ? 48 : Math.round((size ?? 54) * 0.44)
  const Icono = kind === 'diseno' ? Palette : Clapperboard
  return (
    <div className="rounded-xl shrink-0 flex items-center justify-center overflow-hidden" style={{ ...wrap, background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
      <Icono style={{ width: iconPx, height: iconPx, color: '#fff' }} strokeWidth={1.75} />
    </div>
  )
}

/* Cabecera de sección al estilo de la app Distinto: ícono en un cuadrito
   tintado + título en negrita + contador discreto. Pedro 19-jul-2026. */
function SecHeader({ icon, label, count, color }: { icon: ReactNode; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0" style={{ background: `${color}14`, color }}>
        {icon}
      </span>
      <h3 className="text-[15px] font-bold tracking-tight">{label}</h3>
      <span className="text-[12px] font-bold px-2 py-0.5 rounded-md text-muted-foreground bg-muted">{count}</span>
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
        <Kpi label="Publicadas" value={publicadas.length} color={color} icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
        <Kpi label="Este mes" value={publicadasEsteMes} color={color} icon={<CalendarDays className="w-3.5 h-3.5" />} />
        <Kpi label="Por publicar" value={porPublicar.length} color={color} icon={<Clock className="w-3.5 h-3.5" />} />
        <Kpi label="Diseños" value={enDisenoCount} color={color} icon={<Palette className="w-3.5 h-3.5" />} />
        <Kpi label="Aprobados por ti" value={aprobados} color={color} icon={<ThumbsUp className="w-3.5 h-3.5" />} />
      </div>

      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
        <section className="rounded-2xl bg-card p-4 lg:p-5 border">
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

        <section className="rounded-2xl bg-card p-4 lg:p-5 border">
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

function Kpi({ label, value, color, icon }: { label: string; value: number; color: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-3.5 border">
      <div className="text-3xl font-extrabold leading-none" style={{ color }}>{value}</div>
      <div className="text-[12px] text-muted-foreground font-semibold mt-1.5 flex items-center gap-1"><span style={{ color }}>{icon}</span> {label}</div>
    </div>
  )
}
