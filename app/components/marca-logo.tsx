// app/components/marca-logo.tsx
//
// Logo de marca reutilizable. Muestra el archivo estático
// /marcas/{slug}/logo.{ext} en un recuadro limpio. Si la marca no tiene logo
// (o falla la carga), cae al emoji de la marca. Un solo componente para toda
// la app → marcas consistentes y profesionales en sidebar, cards, tareas, etc.
'use client'

import { useState } from 'react'

// Excepciones de extensión (la mayoría son SVG vector; estas solo tienen PNG).
const EXT_OVERRIDE: Record<string, string> = { 'little-joe': 'png', 'vid-natur': 'png', 'mil-ideas': 'png' }

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
  // Cadena de extensiones a intentar en orden. Si la marca tiene override,
  // usamos SOLO esa (evita un 404 innecesario). Si no, probamos svg y luego
  // png — así una marca nueva (p.ej. un cliente) muestra su logo aunque solo
  // suban el PNG, sin tener que tocar este archivo.
  const chain = EXT_OVERRIDE[slug] ? [EXT_OVERRIDE[slug]] : ['svg', 'png']
  const [step, setStep] = useState(0)
  const px = `${size}px`

  // Fallback al emoji: sin slug, marca sin logo, o ya agotamos la cadena.
  if (!slug || SIN_LOGO.has(slug) || step >= chain.length) {
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

  const ext = chain[step]
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md bg-white border border-border/70 shrink-0 overflow-hidden ${className}`}
      style={{ width: px, height: px }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={ext}
        src={`/marcas/${slug}/logo.${ext}`}
        alt={nombre ?? slug}
        onError={() => setStep((s) => s + 1)}
        className="w-full h-full object-contain p-[2px]"
      />
    </span>
  )
}
