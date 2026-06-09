// app/components/marca-logo.tsx
//
// Logo de marca reutilizable. Muestra el archivo estático
// /marcas/{slug}/logo.{ext} en un recuadro limpio. Si la marca no tiene logo
// (o falla la carga), cae al emoji de la marca. Un solo componente para toda
// la app → marcas consistentes y profesionales en sidebar, cards, tareas, etc.
'use client'

import { useState } from 'react'

// Excepciones de extensión (la mayoría son SVG vector; Little Joe solo tiene PNG).
const EXT_OVERRIDE: Record<string, string> = { 'little-joe': 'png' }

// Slugs internos / sin logo → directo al emoji (evita 404).
const SIN_LOGO = new Set(['interno', 'unknown', 'warrior-supps', 'oral-bueaty'])

export function MarcaLogo({
  slug,
  nombre,
  emoji,
  size = 28,
  className = '',
}: {
  slug: string
  nombre?: string
  emoji?: string | null
  size?: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const px = `${size}px`

  // Fallback al emoji
  if (failed || !slug || SIN_LOGO.has(slug)) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-md bg-muted shrink-0 ${className}`}
        style={{ width: px, height: px, fontSize: Math.round(size * 0.55) }}
        aria-label={nombre ?? slug}
      >
        {emoji ?? '🏷️'}
      </span>
    )
  }

  const ext = EXT_OVERRIDE[slug] ?? 'svg'
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md bg-white border border-border/70 shrink-0 overflow-hidden ${className}`}
      style={{ width: px, height: px }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/marcas/${slug}/logo.${ext}`}
        alt={nombre ?? slug}
        onError={() => setFailed(true)}
        className="w-full h-full object-contain p-[2px]"
      />
    </span>
  )
}
