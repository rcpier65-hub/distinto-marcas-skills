'use client'

/* PublicarHoyView — flujo guiado para quien publica manualmente los
   videos. Pedro: por cada pieza de HOY, 4 pasos en orden:
     1. Descargar video (con música / sin música → links a Drive)
     2. Descargar portada (→ link a Drive)
     3. Copiar el copy (→ portapapeles)
     4. Música (→ abre el audio de TikTok)
   La persona hace clic en cada paso y publica en la red social. */

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Music, Copy, Check, ImageIcon, Film, ExternalLink, StickyNote, ChevronRight, Scissors, Type } from 'lucide-react'
import { MarcaLogo } from '@/components/marca-logo'

export type PublicarHoyItem = {
  id: string
  marcaSlug: string
  marcaNombre: string
  marcaColor: string
  marcaEmoji: string | null
  titulo: string
  copy: string | null
  indicaciones: string | null
  frase: string | null               // texto en pantalla del video (TikTok) — paso 6 condicional
  editando: boolean
  videoConMusica: string | null
  videoSinMusica: string | null
  portada: string | null
  enlaceMusica: string | null
  redes: string[]
  hora: string | null
}

const RED_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', tiktok: '🎵', linkedin: '💼',
}

function urlOk(u: string | null): string | null {
  if (!u) return null
  const t = u.trim()
  if (!t) return null
  return t.startsWith('http') ? t : `https://${t}`
}

export function PublicarHoyView({ items, fechaLabel }: { items: PublicarHoyItem[]; fechaLabel: string }) {
  return (
    <main className="container mx-auto p-4 sm:p-6 max-w-3xl space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Publicar hoy</h1>
        <p className="text-sm text-muted-foreground capitalize">{fechaLabel} · {items.length} {items.length === 1 ? 'pieza' : 'piezas'}</p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="font-semibold text-foreground">Nada para publicar hoy</p>
          <p className="text-sm text-muted-foreground mt-1">Cuando haya piezas programadas para hoy, aparecerán acá con sus pasos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => <PiezaCard key={it.id} item={it} />)}
        </div>
      )}
    </main>
  )
}

function PiezaCard({ item }: { item: PublicarHoyItem }) {
  const [copiado, setCopiado] = useState(false)
  const videoCM = urlOk(item.videoConMusica)
  const videoSM = urlOk(item.videoSinMusica)
  const portada = urlOk(item.portada)
  const musica = urlOk(item.enlaceMusica)

  async function copiarCopy() {
    if (!item.copy) { toast.error('Esta pieza no tiene copy'); return }
    try {
      await navigator.clipboard.writeText(item.copy)
      setCopiado(true)
      toast.success('Copy copiado — pégalo en la red social')
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <section
      className="rounded-2xl bg-white ring-1 ring-black/[0.06] shadow-sm overflow-hidden"
      style={{ borderLeft: `4px solid ${item.marcaColor}` }}
    >
      {/* Header — clickeable: abre el detalle completo de la publicación.
          Pasamos ?volver= para que el botón "Volver" del detalle regrese acá.
          Logo REAL de la marca + nombre prominente (Pedro: "que se note real"). */}
      <a
        href={`/publicaciones/${item.id}?volver=${encodeURIComponent('/publicaciones/publicar-hoy')}`}
        className="flex items-center gap-3 p-4 pb-3 border-b border-border/60 hover:bg-muted/40 transition-colors group"
        title="Abrir la publicación completa"
      >
        <MarcaLogo
          slug={item.marcaSlug}
          nombre={item.marcaNombre}
          emoji={item.marcaEmoji}
          size={40}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] leading-tight truncate group-hover:underline">{item.titulo}</p>
          <p className="text-[12px] leading-tight truncate mt-0.5">
            <span style={{ color: item.marcaColor, fontWeight: 600 }}>{item.marcaNombre}</span>
            {item.hora && <span className="text-muted-foreground"> · {item.hora}</span>}
            {item.redes.length > 0 && (
              <span className="text-muted-foreground"> · {item.redes.map((r) => RED_EMOJI[r] ?? r).join(' ')}</span>
            )}
          </p>
        </div>
        <span className="shrink-0 flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          <span className="hidden sm:inline">Ver</span>
          <ChevronRight className="w-4 h-4" />
        </span>
      </a>

      {/* Pasos */}
      <div className="p-4 space-y-2.5">
        {/* 1. Descargar video */}
        <Paso n={1} label="Descargar video" icon={<Film className="w-4 h-4" />}>
          {/* Si el video AÚN se está editando, tijerita animada avisando que
              todavía no está listo (mismo significado que en la grilla). */}
          {item.editando && (
            <div className="flex items-center gap-1.5 mb-2 text-[12.5px] font-semibold" style={{ color: '#0891b2' }}>
              <span className="mk-anim-editing inline-flex"><Scissors className="w-4 h-4" /></span>
              En edición… el video todavía se está editando
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            <LinkBtn href={videoCM} icon={<Music className="w-3.5 h-3.5" />} label="Con música" color="#16a34a" />
            <LinkBtn href={videoSM} icon={<Download className="w-3.5 h-3.5" />} label="Sin música" color="#2563eb" />
          </div>
        </Paso>

        {/* 2. Descargar portada */}
        <Paso n={2} label="Descargar portada" icon={<ImageIcon className="w-4 h-4" />}>
          <LinkBtn href={portada} icon={<Download className="w-3.5 h-3.5" />} label="Abrir portada" color="#9333ea" />
        </Paso>

        {/* 3. Copiar copy */}
        <Paso n={3} label="Copiar el copy" icon={<Copy className="w-4 h-4" />}>
          <button
            type="button"
            onClick={copiarCopy}
            disabled={!item.copy}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40"
            style={{ background: copiado ? '#16a34a' : '#0f172a' }}
          >
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? 'Copiado ✓' : 'Copiar copy'}
          </button>
          {item.copy && (
            <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 whitespace-pre-wrap">{item.copy}</p>
          )}
        </Paso>

        {/* 4. Música */}
        <Paso n={4} label="Música (TikTok)" icon={<Music className="w-4 h-4" />}>
          <LinkBtn
            href={musica ?? 'https://www.tiktok.com'}
            icon={<Music className="w-3.5 h-3.5" />}
            label={musica ? 'Abrir audio' : 'Abrir TikTok'}
            color="#ec4899"
          />
        </Paso>

        {/* 5. Indicaciones de publicación — lo que escribe Lorena en el
            detalle de la publicación (campo "Indicaciones"). */}
        <Paso n={5} label="Indicaciones (de Lorena)" icon={<StickyNote className="w-4 h-4" />} last={!(item.frase && item.frase.trim())}>
          {item.indicaciones && item.indicaciones.trim() ? (
            <div className="rounded-lg bg-[#16a34a]/8 border border-[#16a34a]/25 px-3 py-2.5 text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
              {item.indicaciones}
            </div>
          ) : (
            <span className="text-[12.5px] text-muted-foreground italic">Sin indicaciones para esta pieza.</span>
          )}
        </Paso>

        {/* 6. Frase de video — SOLO si la pieza tiene una frase en pantalla.
            Si no tiene, el flujo queda en 5 pasos. Pedro 20-jun-2026. */}
        {item.frase && item.frase.trim() && (
          <Paso n={6} label="Frase de video" icon={<Type className="w-4 h-4" />} last>
            <div className="rounded-lg bg-[#ba41f7]/8 border border-[#ba41f7]/30 px-3 py-2.5 text-[14px] font-semibold leading-relaxed text-foreground whitespace-pre-wrap">
              {item.frase}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Esta frase va en pantalla, sobre el video.</p>
          </Paso>
        )}
      </div>
    </section>
  )
}

function Paso({ n, label, icon, children, last }: {
  n: number; label: string; icon: React.ReactNode; children: React.ReactNode; last?: boolean
}) {
  return (
    <div className={`flex gap-3 ${last ? '' : 'pb-2.5 border-b border-border/40'}`}>
      <span className="w-6 h-6 rounded-full bg-muted text-foreground text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground mb-1.5">
          <span className="text-muted-foreground">{icon}</span> {label}
        </div>
        {children}
      </div>
    </div>
  )
}

function LinkBtn({ href, icon, label, color }: { href: string | null; icon: React.ReactNode; label: string; color: string }) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground bg-muted/50 cursor-not-allowed">
        {icon} {label} <span className="opacity-60">(no hay)</span>
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold text-white"
      style={{ background: color }}
    >
      {icon} {label} <ExternalLink className="w-3 h-3 opacity-80" />
    </a>
  )
}
