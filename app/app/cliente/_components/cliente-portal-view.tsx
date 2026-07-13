'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, ExternalLink, LogOut, Image as ImageIcon } from 'lucide-react'
import { MarcaLogo } from '@/components/marca-logo'
import { ActivarNotificaciones } from '@/components/activar-notificaciones'
import { createClient } from '@/lib/supabase/client'

export type PubCliente = {
  id: string
  titulo: string
  fecha: string | null
  publicadoAt: string | null
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
  async function salir() {
    try { await createClient().auth.signOut() } catch { /* noop */ }
    router.push('/login')
    router.refresh()
  }

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6 pb-24 space-y-5">
      {/* Header de marca */}
      <header className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${marcaColor}, ${marcaColor}cc)` }}>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl p-1.5 shrink-0">
            <MarcaLogo slug={marcaSlug} nombre={marcaNombre} emoji={marcaEmoji} size={44} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-white/80 font-semibold">Portal del cliente</div>
            <h1 className="text-xl font-bold leading-tight truncate">{marcaEmoji ? marcaEmoji + ' ' : ''}{marcaNombre}</h1>
            {contacto && <div className="text-[12px] text-white/85">Hola, {contacto} 👋</div>}
          </div>
          <button onClick={salir} title="Cerrar sesión" className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium bg-white/15 hover:bg-white/25 rounded-lg px-2.5 py-1.5 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </header>

      {/* Activar notificaciones — botón prominente, a todo el ancho en celular. */}
      <div className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-sm min-w-0 flex-1">
          <div className="font-semibold">🔔 Avísame cuando publiquen</div>
          <div className="text-xs text-muted-foreground">Con un toque activas las notificaciones y recibes un aviso en tu celular apenas se publique tu contenido.</div>
        </div>
        <ActivarNotificaciones className="w-full sm:w-auto" />
      </div>

      {/* Por publicar */}
      <section>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Por publicar · {porPublicar.length}
        </div>
        {porPublicar.length === 0 ? (
          <Vacio texto="No hay publicaciones programadas por ahora." />
        ) : (
          <div className="space-y-2">{porPublicar.map((p) => <PubCard key={p.id} p={p} color={marcaColor} />)}</div>
        )}
      </section>

      {/* Publicadas */}
      <section>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#14b8a6' }} /> Publicadas · {publicadas.length}
        </div>
        {publicadas.length === 0 ? (
          <Vacio texto="Todavía no hay publicaciones publicadas." />
        ) : (
          <div className="space-y-2">{publicadas.map((p) => <PubCard key={p.id} p={p} color={marcaColor} publicada />)}</div>
        )}
      </section>

      <p className="text-center text-[11px] text-muted-foreground pt-2">Portal de clientes · Distinto Agencia</p>
    </main>
  )
}

function PubCard({ p, color, publicada }: { p: PubCliente; color: string; publicada?: boolean }) {
  const portada = urlOk(p.portada)
  const video = urlOk(p.video)
  return (
    <div className="rounded-xl border bg-card overflow-hidden" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex items-center gap-3 p-3">
        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
          {portada ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portada} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{p.titulo}</div>
          <div className="text-[12px] text-muted-foreground truncate">
            {publicada ? '✓ Publicado' : '📅'} {fechaBonita(p.publicadoAt ?? p.fecha)}
            {p.redes.length > 0 && <span> · {p.redes.map((r) => RED_EMOJI[r] ?? r).join(' ')}</span>}
          </div>
        </div>
        {video && (
          <a href={video} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold hover:underline" style={{ color }}>
            Ver <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return <div className="rounded-xl border border-dashed bg-muted/20 text-center text-sm text-muted-foreground py-6">{texto}</div>
}
