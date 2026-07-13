'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Clock, ExternalLink, LogOut, ChevronDown, ThumbsUp, Sparkles, PartyPopper } from 'lucide-react'
import { MarcaLogo } from '@/components/marca-logo'
import { ActivarNotificaciones } from '@/components/activar-notificaciones'
import { createClient } from '@/lib/supabase/client'
import { aprobarVideoCliente } from '../_actions'

export type PubCliente = {
  id: string
  titulo: string
  fecha: string | null
  publicadoAt: string | null
  aprobadoAt: string | null
  redes: string[]
  portada: string | null
  video: string | null
  copy: string | null
  estado: string | null
}

const RED_EMOJI: Record<string, string> = { instagram: '📸', facebook: '👍', tiktok: '🎵', linkedin: '💼', youtube: '▶️' }

function fechaBonita(iso: string | null): string {
  if (!iso) return ''
  const base = iso.includes('T') ? iso : iso + 'T12:00:00'
  try { return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(base)) } catch { return iso }
}
function urlOk(u: string | null): string | null {
  if (!u) return null
  const t = u.trim()
  if (!t) return null
  return t.startsWith('http') ? t : `https://${t}`
}

export function ClientePortalView({ marcaNombre, marcaSlug, marcaEmoji, marcaColor, contacto, publicadas, porPublicar }: {
  marcaNombre: string
  marcaSlug: string
  marcaEmoji: string | null
  marcaColor: string
  contacto: string | null
  publicadas: PubCliente[]
  porPublicar: PubCliente[]
}) {
  const router = useRouter()
  const [aprobados, setAprobados] = useState<Record<string, string>>({})
  const [expandido, setExpandido] = useState<string | null>(null)
  const [aprobando, setAprobando] = useState<string | null>(null)

  function esAprobado(p: PubCliente) { return !!p.aprobadoAt || !!aprobados[p.id] }

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

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6 pb-28 space-y-5">
      {/* HEADER de marca */}
      <header className="relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white" style={{ background: `linear-gradient(135deg, ${marcaColor}, ${marcaColor}b0 55%, #ec4899)` }}>
        <div aria-hidden className="absolute -top-10 -right-8 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div aria-hidden className="absolute -bottom-12 -left-6 w-36 h-36 rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }} />
        <div className="relative flex items-center gap-3">
          <div className="bg-white rounded-2xl p-2 shrink-0 shadow-lg">
            <MarcaLogo slug={marcaSlug} nombre={marcaNombre} emoji={marcaEmoji} size={44} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-widest text-white/85 font-bold">Portal del cliente</div>
            <h1 className="text-2xl font-extrabold leading-tight truncate">{marcaEmoji ? marcaEmoji + ' ' : ''}{marcaNombre}</h1>
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

      {/* POR PUBLICAR — aquí el cliente aprueba */}
      <section>
        <SecHeader icon={<Clock className="w-4 h-4" />} label="Por publicar" count={porPublicar.length} color="#f59e0b" />
        {porPublicar.length === 0 ? (
          <Vacio texto="No hay publicaciones programadas por ahora." />
        ) : (
          <div className="space-y-2.5">
            {porPublicar.map((p) => (
              <PubCard key={p.id} p={p} color={marcaColor} emoji={marcaEmoji}
                abierto={expandido === p.id} onToggle={() => setExpandido((e) => e === p.id ? null : p.id)}
                aprobado={esAprobado(p)} aprobandoAhora={aprobando === p.id} onAprobar={() => aprobar(p.id)} puedeAprobar />
            ))}
          </div>
        )}
      </section>

      {/* PUBLICADAS */}
      <section>
        <SecHeader icon={<CheckCircle2 className="w-4 h-4" />} label="Publicadas" count={publicadas.length} color="#14b8a6" />
        {publicadas.length === 0 ? (
          <Vacio texto="Todavía no hay publicaciones publicadas." />
        ) : (
          <div className="space-y-2.5">
            {publicadas.map((p) => (
              <PubCard key={p.id} p={p} color={marcaColor} emoji={marcaEmoji} publicada
                abierto={expandido === p.id} onToggle={() => setExpandido((e) => e === p.id ? null : p.id)}
                aprobado={esAprobado(p)} aprobandoAhora={false} onAprobar={() => {}} />
            ))}
          </div>
        )}
      </section>

      <p className="text-center text-[11px] text-muted-foreground pt-2">Portal de clientes · Distinto Agencia</p>
    </main>
  )
}

function PubCard({ p, color, emoji, publicada, abierto, onToggle, aprobado, aprobandoAhora, onAprobar, puedeAprobar }: {
  p: PubCliente; color: string; emoji: string | null; publicada?: boolean
  abierto: boolean; onToggle: () => void
  aprobado: boolean; aprobandoAhora: boolean; onAprobar: () => void; puedeAprobar?: boolean
}) {
  const video = urlOk(p.video)
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

      {/* Detalle expandible */}
      {abierto && (
        <div className="px-3 pb-3 pt-1 border-t space-y-3">
          {/* Imagen grande / placeholder */}
          <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
            <Thumb portada={p.portada} color={color} emoji={emoji} big />
          </div>
          {p.copy && <p className="text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-6">{p.copy}</p>}

          <div className="flex items-center gap-2 flex-wrap">
            {video && (
              <a href={video} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-semibold text-white" style={{ background: color }}>
                Ver video <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {/* Aprobar (solo por-publicar y no aprobado aún) */}
            {puedeAprobar && !aprobado && (
              <button onClick={onAprobar} disabled={aprobandoAhora} className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 h-11 rounded-xl text-white font-bold text-[14px] disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: '0 6px 16px -6px rgba(22,163,74,0.7)' }}>
                <ThumbsUp className="w-5 h-5" /> {aprobandoAhora ? 'Aprobando…' : 'Aprobar video'}
              </button>
            )}
            {aprobado && (
              <span className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-[13px] font-bold" style={{ background: 'rgba(22,163,74,0.12)', color: '#15803d' }}>
                <PartyPopper className="w-4 h-4" /> ¡Aprobado por ti! Ya le avisamos al equipo.
              </span>
            )}
          </div>
          {puedeAprobar && !aprobado && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" style={{ color }} /> Al aprobar, el equipo recibe el aviso y lo programa para publicar.</p>
          )}
        </div>
      )}
    </div>
  )
}

/* Miniatura: imagen real si carga; si no (o es un link de Drive), un fondo con
   el color de la marca y su emoji — nunca el ícono gris genérico. */
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
