// app/components/plantillas-grilla/grilla-manrique.tsx
// Plantilla "¿Qué se viene?" Manrique — versión refinada (18-24 may pattern)
// Réplica fiel del PNG tmp-demo/manrique-grilla-18-24-may-2026.png
'use client'

import type { GrillaPublicacionLite } from './types'

const NAVY = '#283B6F'
const RASPBERRY = '#D9536C'
const SKY = '#9AC2E8'
const CANVAS = '#FBF6F2'

// 4 variantes de color de card (cíclico)
const CARD_BG = {
  blue: '#E5EEF8',
  rose: '#F4C9D2',
  cream: '#FBF1DC',
  white: '#FFFFFF',
} as const

const CARD_ACC = {
  blue: '#6FAEDB',
  rose: '#D9536C',
  cream: '#D4A93E',
  white: '#9AC2E8',
} as const

const CARD_VARIANTS: Array<keyof typeof CARD_BG> = ['blue', 'rose', 'cream', 'white']

const DIAS_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_UP = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const MESES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

type Props = {
  semanaInicio: string
  semanaFin: string
  publicaciones: GrillaPublicacionLite[]
  logoUrl?: string
  horaDefault?: string  // ej "6:30 pm"
}

// Inferir icono según keywords del título (más expresivo que solo por tipo)
type IconKey = 'video' | 'heart' | 'price' | 'question' | 'message' | 'image'

function inferIconFromTitle(titulo: string, tipos: string[]): IconKey {
  const lower = titulo.toLowerCase()
  // Por título keywords
  if (/famil|amor|cariñ|abrazo|afecto|amig/.test(lower)) return 'heart'
  if (/cuánto|cuesta|precio|paquete|costo|valor/.test(lower)) return 'price'
  if (/pregunta|cómo|qué|cuál|por qué|\?/.test(lower)) return 'question'
  if (/testimon|experiencia|historia|frase|reseña/.test(lower)) return 'message'
  // Por tipo
  const t = tipos.join(' ').toLowerCase()
  if (t.includes('reel') || t.includes('video') || t.includes('tiktok')) return 'video'
  if (t.includes('story')) return 'message'
  return 'video'
}

export function GrillaManrique({
  semanaInicio, semanaFin, publicaciones,
  logoUrl = '/marcas/manrique/logo.png',
  horaDefault = '6:30 pm',
}: Props) {
  // Solo publicaciones con fecha (filtramos días vacíos)
  const pubsConFecha = publicaciones.filter((p) => p.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha))

  const d1 = new Date(semanaInicio + 'T12:00:00Z')
  const d2 = new Date(semanaFin + 'T12:00:00Z')
  const datePill = `${d1.getUTCDate()} — ${d2.getUTCDate()} ${MESES_UP[d1.getUTCMonth()]} · ${d1.getUTCFullYear()}`
  const mesName = MESES_LONG[d1.getUTCMonth()]
  const subHeader = `${mesName.charAt(0).toUpperCase() + mesName.slice(1)} · Del ${DIAS_LONG[d1.getUTCDay()]} ${d1.getUTCDate()} al ${DIAS_LONG[d2.getUTCDay()]} ${d2.getUTCDate()}`

  return (
    <div
      style={{
        width: 1080,
        height: 1620,
        background: CANVAS,
        position: 'relative',
        overflow: 'hidden',
        padding: '70px 80px 55px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Poppins, system-ui, -apple-system, sans-serif',
        color: NAVY,
        boxSizing: 'border-box',
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility',
      }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500;1,600&family=Poppins:wght@300;400;500;600;700;800&display=swap" />

      {/* Blobs decorativos raspberry */}
      <div
        style={{
          position: 'absolute',
          background: RASPBERRY,
          opacity: 0.18,
          filter: 'blur(2px)',
          width: 380,
          height: 220,
          top: -110,
          right: -130,
          transform: 'rotate(-25deg)',
          borderRadius: '60% 40% 50% 50% / 60% 50% 50% 40%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          background: RASPBERRY,
          opacity: 0.18,
          filter: 'blur(2px)',
          width: 420,
          height: 260,
          bottom: -120,
          left: -150,
          transform: 'rotate(15deg)',
          borderRadius: '50% 50% 60% 40% / 50% 60% 40% 50%',
          pointerEvents: 'none',
        }}
      />

      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt="Manrique"
          style={{ width: 160, height: 160, flexShrink: 0, objectFit: 'contain', margin: '-20px -10px -20px -20px' }}
          crossOrigin="anonymous"
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 400, letterSpacing: 1, color: NAVY, lineHeight: 1, marginBottom: 4 }}>
            CENTRO PSICOLÓGICO
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: 1, color: NAVY, lineHeight: 1 }}>
            MANRIQUE
          </div>
        </div>
        <div
          style={{
            background: NAVY,
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: 0.8,
            padding: '16px 28px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            alignSelf: 'center',
          }}
        >
          {datePill}
        </div>
      </header>

      {/* HERO */}
      <section style={{ textAlign: 'center', margin: '50px 0 40px' }}>
        <h1
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 132,
            color: NAVY,
            lineHeight: 0.95,
            letterSpacing: -1,
            whiteSpace: 'nowrap',
            margin: 0,
          }}
        >
          ¿Qué se viene?
        </h1>
        <div style={{ fontSize: 26, fontWeight: 400, color: NAVY, marginTop: 14, letterSpacing: 0.3 }}>
          {subHeader}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 22 }}>
          <span style={{ width: 240, height: 2, background: SKY, borderRadius: 2 }} />
          <span style={{ width: 12, height: 12, background: SKY, borderRadius: '50%' }} />
          <span style={{ width: 240, height: 2, background: SKY, borderRadius: 2 }} />
        </div>
      </section>

      {/* CARDS — solo publicaciones reales, color cíclico */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 10 }}>
        {pubsConFecha.map((pub, idx) => {
          const variant = CARD_VARIANTS[idx % CARD_VARIANTS.length]
          const bg = CARD_BG[variant]
          const acc = CARD_ACC[variant]
          const fechaDate = new Date(pub.fecha + 'T12:00:00Z')
          const dia = fechaDate.getUTCDate()
          const diaShort = DIAS_SHORT_ES[fechaDate.getUTCDay()]
          const icon = inferIconFromTitle(pub.titulo, pub.tipo_contenido)
          const plataformasShort = pub.plataformas
            .map((p) => p === 'Instagram' ? 'IG' : p === 'Facebook' ? 'FB' : p === 'Tiktok' ? 'TikTok' : p)
            .join(' · ')
          const tipoShort = pub.tipo_contenido[0]?.replace(/REEL.*/, 'Reel') ?? ''
          const meta = [horaDefault, plataformasShort, tipoShort].filter(Boolean).join(' · ')

          return (
            <article
              key={pub.id}
              style={{
                background: bg,
                borderRadius: 24,
                padding: '24px 32px',
                minHeight: 130,
                display: 'flex',
                alignItems: 'center',
                gap: 26,
              }}
            >
              {/* Fecha */}
              <div style={{ flexShrink: 0, textAlign: 'left', minWidth: 110 }}>
                <div style={{ fontSize: 78, fontWeight: 700, color: NAVY, lineHeight: 0.9, letterSpacing: -1 }}>
                  {dia}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: acc, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                  {diaShort}
                </div>
              </div>

              {/* Bar */}
              <div style={{ width: 3, height: 90, background: acc, borderRadius: 2, opacity: 0.9, flexShrink: 0 }} />

              {/* Body */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: NAVY, lineHeight: 1.15, letterSpacing: -0.3 }}>
                  {pub.titulo}
                </div>
                <div style={{ fontSize: 19, fontWeight: 400, color: NAVY, opacity: 0.85, letterSpacing: 0.2 }}>
                  {meta}
                </div>
              </div>

              {/* Icon */}
              <div style={{ flexShrink: 0, width: 80, height: 80, color: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconSvg type={icon} />
              </div>
            </article>
          )
        })}

        {pubsConFecha.length === 0 && (
          <div style={{
            background: 'transparent',
            border: '2px dashed rgba(40,59,111,0.18)',
            borderRadius: 24,
            padding: 60,
            textAlign: 'center',
            color: NAVY,
            opacity: 0.5,
            fontSize: 28,
          }}>
            Sin publicaciones programadas esta semana
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ marginTop: 'auto', paddingTop: 24, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 22,
            fontWeight: 700,
            color: NAVY,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          <svg viewBox="0 0 200 110" style={{ width: 'auto', height: 38 }}>
            <defs>
              <mask id="distintoBite">
                <rect width="200" height="110" fill="white" />
                <circle cx="168" cy="92" r="20" fill="black" />
              </mask>
            </defs>
            <circle cx="135" cy="58" r="46" fill="#C5A82D" mask="url(#distintoBite)" />
            <circle cx="60" cy="55" r="50" fill="#8B2DC9" />
          </svg>
          <span>DISTINTO · AGENCIA</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 300, color: NAVY, marginTop: 6, letterSpacing: 0.8, opacity: 0.85 }}>
          www.agenciadistinto.com
        </div>
      </footer>
    </div>
  )
}

// ============================================================
// Icons SVG — uno por tipo de tema
// ============================================================
function IconSvg({ type }: { type: 'video' | 'heart' | 'price' | 'question' | 'message' | 'image' }) {
  const common = {
    viewBox: '0 0 64 64',
    width: '100%',
    height: '100%',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (type === 'video') {
    return (
      <svg {...common}>
        <rect x="8" y="12" width="48" height="34" rx="3" />
        <path d="M27 22l12 7-12 7z" fill="currentColor" stroke="none" />
        <path d="M22 52h20" />
        <path d="M32 46v6" />
      </svg>
    )
  }
  if (type === 'heart') {
    return (
      <svg {...common}>
        <path d="M32 54s-20-11.5-20-26a10 10 0 0120-3 10 10 0 0120 3c0 14.5-20 26-20 26z" />
      </svg>
    )
  }
  if (type === 'price') {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="22" />
        <path d="M32 16v32" />
        <path d="M40 24c0-3-4-4-8-4s-8 1-8 5 4 5 8 6 8 2 8 6-4 5-8 5-8-1-8-4" />
      </svg>
    )
  }
  if (type === 'question') {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="22" />
        <path d="M24 26c0-4 4-8 8-8s8 4 8 8c0 6-8 6-8 12" />
        <circle cx="32" cy="46" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (type === 'message') {
    return (
      <svg {...common}>
        <path d="M12 12h40c2 0 4 2 4 4v24c0 2-2 4-4 4H30l-10 8v-8h-8c-2 0-4-2-4-4V16c0-2 2-4 4-4z" />
        <text x="32" y="36" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="14" fill="currentColor" stroke="none" textAnchor="middle">99</text>
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="8" y="12" width="48" height="40" rx="3" />
      <circle cx="22" cy="26" r="5" />
      <path d="M8 44l14-14 10 10 10-8 14 14" />
    </svg>
  )
}
