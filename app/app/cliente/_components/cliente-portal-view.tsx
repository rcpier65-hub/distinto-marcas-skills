'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CheckCircle2, Clock, ExternalLink, LogOut, ChevronDown, ChevronLeft, ChevronRight,
  ThumbsUp, Sparkles, PartyPopper, CalendarDays, List, BarChart3, FileText,
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
}

const RED_EMOJI: Record<string, string> = { instagram: '📸', facebook: '👍', tiktok: '🎵', linkedin: '💼', youtube: '▶️' }
const RED_NOMBRE: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn', youtube: 'YouTube' }
const DIAS_SEM = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/* Colores por estado de una pieza (para los puntos del calendario y las píldoras). */
const C_APROBADO = '#16a34a'   // verde — el cliente ya lo aprobó
const C_PUBLICADO = '#14b8a6'  // teal  — ya se publicó
const C_PORPUB = '#f59e0b'     // ámbar — por publicar

function esPublicada(p: PubCliente) { return (p.estado ?? '') === 'publicado' }

function fechaBonita(iso: string | null): string {
  if (!iso) return ''
  const base = iso.includes('T') ? iso : iso + 'T12:00:00'
  try { return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(base)) } catch { return iso }
}
function capitalizar(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }
function ymd(y: number, m: number, d: number) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` }
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

  function esAprobado(p: PubCliente) { return !!p.aprobadoAt || !!aprobados[p.id] }
  function colorEstado(p: PubCliente) {
    if (esAprobado(p)) return C_APROBADO
    if (esPublicada(p)) return C_PUBLICADO
    return C_PORPUB
  }

  /* Agrupamos las piezas por día (YYYY-MM-DD). */
  const porDia = useMemo(() => {
    const m = new Map<string, PubCliente[]>()
    for (const p of pubs) {
      if (!p.fecha) continue
      const k = p.fecha.slice(0, 10)
      const arr = m.get(k)
      if (arr) arr.push(p); else m.set(k, [p])
    }
    return m
  }, [pubs])

  /* Mes visible (0-based). Arranca en el mes de hoy (Lima). */
  const [hY, hM] = hoy.split('-').map(Number)
  const [ym, setYm] = useState<{ y: number; m: number }>({ y: hY, m: hM - 1 })
  const [sel, setSel] = useState<string>(hoy)

  const { celdas, tituloMes } = useMemo(() => {
    const { y, m } = ym
    const primero = new Date(y, m, 1)
    const offset = (primero.getDay() + 6) % 7 // lunes = 0
    const dias = new Date(y, m + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < offset; i++) cells.push(null)
    for (let d = 1; d <= dias; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    const titulo = capitalizar(new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date(y, m, 1)))
    return { celdas: cells, tituloMes: titulo }
  }, [ym])

  function irMes(delta: number) {
    setYm((cur) => {
      const nd = new Date(cur.y, cur.m + delta, 1)
      const ny = nd.getFullYear(), nm = nd.getMonth()
      // Seleccionar el primer día con contenido del nuevo mes (o el día 1).
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

  const itemsDelDia = porDia.get(sel) ?? []

  /* Vista lista: separación clásica por publicar / publicadas. */
  const porPublicar = useMemo(
    () => pubs.filter((p) => !esPublicada(p)).sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? '')),
    [pubs],
  )
  const publicadas = useMemo(
    () => pubs.filter((p) => esPublicada(p)).sort((a, b) => (b.publicadoAt ?? b.fecha ?? '').localeCompare(a.publicadoAt ?? a.fecha ?? '')),
    [pubs],
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

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6 pb-28 space-y-5">
      {/* Realtime: el portal se actualiza solo cuando el equipo publica/cambia algo. */}
      <ClienteRealtime marcaId={marcaId} />

      {/* HEADER de marca — con el logo real de la marca. */}
      <header className="relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white" style={{ background: `linear-gradient(135deg, ${marcaColor}, ${marcaColor}b0 55%, #ec4899)` }}>
        <div aria-hidden className="absolute -top-10 -right-8 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div aria-hidden className="absolute -bottom-12 -left-6 w-36 h-36 rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }} />
        <div className="relative flex items-center gap-3">
          <div className="bg-white rounded-2xl p-2 shrink-0 shadow-lg">
            <MarcaLogo slug={marcaSlug} nombre={marcaNombre} emoji={marcaEmoji} size={48} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-white/85 font-bold">Portal del cliente</div>
            <h1 className="text-2xl font-extrabold leading-tight truncate">{marcaNombre}</h1>
            {contacto && <div className="text-[13px] text-white/90">Hola, {contacto} 👋</div>}
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
        <>
          {/* CALENDARIO */}
          <section className="rounded-3xl bg-card p-4 sm:p-5 shadow-sm ring-1 ring-black/[0.04]">
            {/* Navegación de mes */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => irMes(-1)} aria-label="Mes anterior" className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-muted transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-[15px] font-extrabold">{tituloMes}</div>
              <button onClick={() => irMes(1)} aria-label="Mes siguiente" className="w-9 h-9 rounded-xl inline-flex items-center justify-center hover:bg-muted transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Encabezado de días */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS_SEM.map((d, i) => (
                <div key={i} className="text-center text-[11px] font-bold text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Celdas */}
            <div className="grid grid-cols-7 gap-1">
              {celdas.map((d, i) => {
                if (d === null) return <div key={i} />
                const k = ymd(ym.y, ym.m, d)
                const items = porDia.get(k) ?? []
                const isHoy = k === hoy
                const isSel = k === sel
                const tiene = items.length > 0
                // Resaltado de días con publicaciones: fondo tintado + borde de
                // marca + número en color de marca. Seleccionado = relleno sólido;
                // hoy = anillo grueso.
                const bg = isSel ? marcaColor : tiene ? `${marcaColor}24` : 'transparent'
                const ring = isSel
                  ? undefined
                  : isHoy
                    ? `inset 0 0 0 2px ${marcaColor}`
                    : tiene
                      ? `inset 0 0 0 1.5px ${marcaColor}66`
                      : undefined
                const numColor = isSel ? '#fff' : tiene ? marcaColor : undefined
                return (
                  <button
                    key={i}
                    onClick={() => setSel(k)}
                    className="relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all active:scale-95"
                    style={{
                      background: bg,
                      color: numColor,
                      boxShadow: ring,
                      fontWeight: tiene || isHoy ? 800 : 500,
                    }}
                  >
                    <span className="text-[13px] leading-none">{d}</span>
                    {tiene && (
                      <span className="absolute bottom-1 flex items-center gap-[3px]">
                        {items.slice(0, 3).map((p, j) => (
                          <span key={j} className="w-[6px] h-[6px] rounded-full" style={{ background: isSel ? '#fff' : colorEstado(p) }} />
                        ))}
                        {items.length > 3 && <span className="text-[9px] font-extrabold leading-none" style={{ color: isSel ? '#fff' : marcaColor }}>+</span>}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Leyenda */}
            <div className="flex items-center justify-center gap-3 flex-wrap mt-3 pt-3 border-t text-[11px] text-muted-foreground">
              <Leyenda color={C_PORPUB} label="Por publicar" />
              <Leyenda color={C_PUBLICADO} label="Publicado" />
              <Leyenda color={C_APROBADO} label="Aprobado" />
            </div>
          </section>

          {/* DÍA SELECCIONADO */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold px-3 py-1.5 rounded-full" style={{ background: `${marcaColor}18`, color: marcaColor }}>
                <CalendarDays className="w-4 h-4" /> {capitalizar(fechaBonita(sel))}
              </span>
              {itemsDelDia.length > 0 && <span className="text-[12px] font-bold text-muted-foreground">{itemsDelDia.length}</span>}
            </div>
            {itemsDelDia.length === 0 ? (
              <Vacio texto="No hay publicaciones este día. Toca otro día del calendario." />
            ) : (
              <div className="space-y-2.5">{itemsDelDia.map(renderCard)}</div>
            )}
          </section>
        </>
      )}

      {vista === 'lista' && (
        <>
          {/* VISTA LISTA */}
          <section>
            <SecHeader icon={<Clock className="w-4 h-4" />} label="Por publicar" count={porPublicar.length} color={C_PORPUB} />
            {porPublicar.length === 0 ? (
              <Vacio texto="No hay publicaciones programadas por ahora." />
            ) : (
              <div className="space-y-2.5">{porPublicar.map(renderCard)}</div>
            )}
          </section>
          <section className="mt-5">
            <SecHeader icon={<CheckCircle2 className="w-4 h-4" />} label="Publicadas" count={publicadas.length} color={C_PUBLICADO} />
            {publicadas.length === 0 ? (
              <Vacio texto="Todavía no hay publicaciones publicadas." />
            ) : (
              <div className="space-y-2.5">{publicadas.map(renderCard)}</div>
            )}
          </section>
        </>
      )}

      {vista === 'stats' && (
        <StatsView pubs={pubs} publicadas={publicadas} porPublicar={porPublicar} color={marcaColor} hoy={hoy} esAprobado={esAprobado} />
      )}

      <p className="text-center text-[11px] text-muted-foreground pt-2">Portal de clientes · Distinto Agencia</p>
    </main>
  )
}

function ToggleBtn({ active, onClick, color, icon, label }: { active: boolean; onClick: () => void; color: string; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl text-[13px] font-bold transition-all"
      style={{ background: active ? '#fff' : 'transparent', color: active ? color : 'var(--muted-foreground, #64748b)', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : undefined }}
    >
      {icon} {label}
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
  const contenidoUrl = urlOk(p.video) ?? urlOk(p.driveResultado) ?? urlOk(p.portada)
  const embed = driveEmbed(p.video) ?? driveEmbed(p.driveResultado) ?? driveEmbed(p.portada)
  const hayContenido = !!contenidoUrl
  const esVideo = !!urlOk(p.video)
  return (
    <div className="rounded-2xl bg-card overflow-hidden shadow-sm ring-1 ring-black/[0.04] transition-shadow hover:shadow-md" style={{ borderLeft: `5px solid ${color}` }}>
      {/* Cabecera clickeable */}
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

      {/* Detalle expandible — el cliente VE el contenido antes de aprobar */}
      {abierto && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3">
          {embed ? (
            /* Reproductor del Drive DENTRO del portal. Formato vertical (reel/
               TikTok) centrado y acotado a la pantalla: el video se ve completo
               y el reproductor NO ocupa toda la pantalla. */
            <div
              className="mx-auto rounded-xl overflow-hidden bg-black"
              style={{ width: '100%', maxWidth: 300, aspectRatio: '9 / 16', maxHeight: '68vh' }}
            >
              <iframe src={embed} title={p.titulo} allow="autoplay; fullscreen" allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} />
            </div>
          ) : hayContenido ? (
            <a href={contenidoUrl!} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
              <Thumb portada={p.portada} color={color} emoji={emoji} big />
            </a>
          ) : (
            <div className="rounded-xl p-6 text-center text-[13px] text-muted-foreground" style={{ background: `${color}10` }}>
              ⏳ El equipo está preparando el contenido. Te avisamos cuando esté listo para revisar.
            </div>
          )}

          {esVideo && embed && <p className="text-[11px] text-muted-foreground text-center">▶️ Toca play para ver el video</p>}

          {/* Links del post publicado — el cliente va a ver el video en vivo. */}
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
                <ExternalLink className="w-3.5 h-3.5" /> Abrir {esVideo ? 'video' : 'contenido'}
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

/* Miniatura: imagen real si carga; si no, un fondo con el color de la marca y
   su emoji — nunca el ícono gris genérico. */
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

/* Estadísticas del cliente — métricas de ACTIVIDAD reales (no engagement, que
   no tenemos en la base): total publicadas, este mes, por publicar, aprobados,
   cadencia por mes y mix por red. */
function StatsView({ pubs, publicadas, porPublicar, color, hoy, esAprobado }: {
  pubs: PubCliente[]
  publicadas: PubCliente[]
  porPublicar: PubCliente[]
  color: string
  hoy: string
  esAprobado: (p: PubCliente) => boolean
}) {
  const [hy, hm] = hoy.split('-').map(Number)
  const mesActualKey = `${hy}-${String(hm).padStart(2, '0')}`
  const mesDe = (p: PubCliente) => (p.publicadoAt ?? p.fecha ?? '').slice(0, 7)

  const publicadasEsteMes = publicadas.filter((p) => mesDe(p) === mesActualKey).length
  const aprobados = pubs.filter(esAprobado).length

  // Cadencia: últimos 6 meses.
  const meses: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    let y = hy, m = hm - i
    while (m <= 0) { m += 12; y -= 1 }
    meses.push({ key: `${y}-${String(m).padStart(2, '0')}`, label: MESES_CORTOS[m - 1] })
  }
  const porMes = meses.map((mm) => ({ ...mm, n: publicadas.filter((p) => mesDe(p) === mm.key).length }))
  const maxMes = Math.max(1, ...porMes.map((m) => m.n))

  // Mix por red (solo publicadas).
  const redCount: Record<string, number> = {}
  for (const p of publicadas) for (const r of p.redes) redCount[r] = (redCount[r] ?? 0) + 1
  const redes = Object.entries(redCount).sort((a, b) => b[1] - a[1])
  const maxRed = Math.max(1, ...redes.map(([, n]) => n))

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi label="Publicadas" value={publicadas.length} color={color} icon="✅" />
        <Kpi label="Este mes" value={publicadasEsteMes} color={color} icon="📅" />
        <Kpi label="Por publicar" value={porPublicar.length} color={color} icon="⏳" />
        <Kpi label="Aprobados por ti" value={aprobados} color={color} icon="👍" />
      </div>

      {/* Publicaciones por mes */}
      <section className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-black/[0.04]">
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

      {/* Por red social */}
      <section className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-black/[0.04]">
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
