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
import { Download, Music, Copy, Check, ImageIcon, Film, ExternalLink } from 'lucide-react'

export type PublicarHoyItem = {
  id: string
  marcaNombre: string
  marcaColor: string
  marcaEmoji: string | null
  titulo: string
  copy: string | null
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
      {/* Header */}
      <div className="flex items-center gap-2.5 p-4 pb-3 border-b border-border/60">
        <span style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: `${item.marcaColor}1a`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>
          {item.marcaEmoji ?? '🎬'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] leading-tight truncate">{item.titulo}</p>
          <p className="text-[11.5px] text-muted-foreground">
            {item.marcaNombre}{item.hora ? ` · ${item.hora}` : ''}
            {item.redes.length > 0 && ' · ' + item.redes.map((r) => RED_EMOJI[r] ?? r).join(' ')}
          </p>
        </div>
      </div>

      {/* Pasos */}
      <div className="p-4 space-y-2.5">
        {/* 1. Descargar video */}
        <Paso n={1} label="Descargar video" icon={<Film className="w-4 h-4" />}>
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
        <Paso n={4} label="Música (TikTok)" icon={<Music className="w-4 h-4" />} last>
          <LinkBtn
            href={musica ?? 'https://www.tiktok.com'}
            icon={<Music className="w-3.5 h-3.5" />}
            label={musica ? 'Abrir audio' : 'Abrir TikTok'}
            color="#ec4899"
          />
        </Paso>
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
