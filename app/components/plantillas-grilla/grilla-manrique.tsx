// app/components/plantillas-grilla/grilla-manrique.tsx
// Plantilla "¿Qué se viene?" Manrique como componente React.
// Replica exactamente el HTML original de plugins/distinto-marcas/skills/marca-2-manrique/
// Renderiza con datos reales de publicaciones (semana actual).
//
// El componente está pensado para ser renderizado dentro de un <div ref={...}>
// que luego se pasa a html2canvas para generar el PNG.
'use client'

import type { GrillaPublicacionLite } from './types'

const NAVY = '#283B6F'
const RASPBERRY = '#D9536C'
const SKY = '#9AC2E8'
const CANVAS = '#FBF6F2'
const CARD_WHITE = '#FFFFFF'
const CARD_ROSE = '#F4C9D2'
const ACC_SKY = '#9AC2E8'
const ACC_ROSE = '#D9536C'

const DIAS_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_UP = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const MESES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

type Props = {
  semanaInicio: string  // YYYY-MM-DD
  semanaFin: string
  publicaciones: GrillaPublicacionLite[]
  logoUrl?: string  // default: /marcas/manrique/logo.png
}

// Color rotation por card (alternancia visual)
const CARD_VARIANTS = ['white', 'rose', 'white', 'rose'] as const

function pickIconForTipo(tipo: string[]): 'video' | 'message' | 'image' {
  const t = tipo.join(' ').toLowerCase()
  if (t.includes('reel') || t.includes('video') || t.includes('tiktok')) return 'video'
  if (t.includes('story') || t.includes('testimon')) return 'message'
  return 'image'
}

export function GrillaManrique({ semanaInicio, semanaFin, publicaciones, logoUrl = '/marcas/manrique/logo.png' }: Props) {
  // Calcular días del rango
  const d1 = new Date(semanaInicio + 'T12:00:00Z')
  const d2 = new Date(semanaFin + 'T12:00:00Z')
  const numDias = Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000)) + 1

  // Indexar publicaciones por fecha (YYYY-MM-DD)
  const pubsByFecha = new Map<string, GrillaPublicacionLite[]>()
  for (const p of publicaciones) {
    const arr = pubsByFecha.get(p.fecha) ?? []
    arr.push(p)
    pubsByFecha.set(p.fecha, arr)
  }

  // Date pill: "18 — 24 MAY · 2026"
  const datePill = `${d1.getUTCDate()} — ${d2.getUTCDate()} ${MESES_UP[d1.getUTCMonth()]} · ${d1.getUTCFullYear()}`
  // Subheader: "Mayo · Del lunes 18 al domingo 24"
  const mesName = MESES_LONG[d1.getUTCMonth()]
  const subHeader = `${mesName.charAt(0).toUpperCase() + mesName.slice(1)} · Del ${DIAS_LONG[d1.getUTCDay()]} ${d1.getUTCDate()} al ${DIAS_LONG[d2.getUTCDay()]} ${d2.getUTCDate()}`

  // Build cards (una por día)
  const cards: Array<{ dia: number; diaShort: string; pubs: GrillaPublicacionLite[] }> = []
  let colorIdx = 0
  for (let i = 0; i < numDias; i++) {
    const d = new Date(d1)
    d.setUTCDate(d1.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const pubs = pubsByFecha.get(iso) ?? []
    cards.push({
      dia: d.getUTCDate(),
      diaShort: DIAS_SHORT_ES[d.getUTCDay()],
      pubs,
    })
  }

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
      {/* Google Fonts inline */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500;1,600&family=Poppins:wght@300;400;500;600;700;800&display=swap" />

      {/* Blobs decorativos */}
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
          alt="Centro Psicológico Manrique ABA"
          style={{
            width: 200,
            height: 200,
            flexShrink: 0,
            objectFit: 'contain',
            margin: '-30px -20px -30px -30px',
          }}
          crossOrigin="anonymous"
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 400, letterSpacing: 1, color: NAVY, lineHeight: 1, marginBottom: 4 }}>
            CENTRO PSICOLÓGICO
          </div>
          <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: 1, color: NAVY, lineHeight: 1 }}>
            MANRIQUE
          </div>
        </div>
        <div
          style={{
            background: NAVY,
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 24,
            letterSpacing: 0.8,
            padding: '18px 30px',
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

      {/* CARDS */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 10 }}>
        {cards.map((card, idx) => {
          const isEmpty = card.pubs.length === 0
          // Para cards con publicación, alternar color (rotación)
          let variant = 'empty'
          if (!isEmpty) {
            variant = CARD_VARIANTS[colorIdx % CARD_VARIANTS.length]
            colorIdx++
          }

          const cardBg = variant === 'rose' ? CARD_ROSE : CARD_WHITE
          const acc = variant === 'rose' ? ACC_ROSE : ACC_SKY

          if (isEmpty) {
            return (
              <article
                key={idx}
                style={{
                  background: 'transparent',
                  border: '2px dashed rgba(40,59,111,0.18)',
                  borderRadius: 24,
                  padding: '20px 36px',
                  minHeight: 90,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 28,
                }}
              >
                <div style={{ flexShrink: 0, textAlign: 'left', minWidth: 120 }}>
                  <div style={{ fontSize: 58, fontWeight: 700, color: NAVY, lineHeight: 0.9, letterSpacing: -1, opacity: 0.35 }}>
                    {card.dia}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: NAVY, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4, opacity: 0.35 }}>
                    {card.diaShort}
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 26, fontWeight: 500, color: NAVY, opacity: 0.5, lineHeight: 1.1 }}>
                    Sin publicación programada
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 400, color: NAVY, opacity: 0.4 }}>
                    — Día sin contenido en grilla —
                  </div>
                </div>
              </article>
            )
          }

          // Card con publicación(es)
          return card.pubs.map((pub, pubIdx) => {
            const iconType = pickIconForTipo(pub.tipo_contenido)
            return (
              <article
                key={`${idx}-${pubIdx}`}
                style={{
                  background: cardBg,
                  borderRadius: 24,
                  padding: '28px 36px',
                  minHeight: 140,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 28,
                }}
              >
                <div style={{ flexShrink: 0, textAlign: 'left', minWidth: 120 }}>
                  <div style={{ fontSize: 82, fontWeight: 700, color: NAVY, lineHeight: 0.9, letterSpacing: -1 }}>
                    {card.dia}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: acc, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                    {card.diaShort}
                  </div>
                </div>
                <div style={{ width: 3, height: 100, background: acc, borderRadius: 2, opacity: 0.9, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 36, fontWeight: 700, color: NAVY, lineHeight: 1.1, letterSpacing: -0.3 }}>
                    {pub.titulo}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 400, color: NAVY, opacity: 0.9, letterSpacing: 0.2 }}>
                    {pub.plataformas.join(' · ')}{pub.tipo_contenido.length > 0 ? ' · ' + pub.tipo_contenido.join(' · ') : ''}
                  </div>
                </div>
                <div style={{ flexShrink: 0, width: 90, height: 90, color: NAVY }}>
                  <IconSvg type={iconType} />
                </div>
              </article>
            )
          })
        })}
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

function IconSvg({ type }: { type: 'video' | 'message' | 'image' }) {
  if (type === 'video') {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="12" width="48" height="34" rx="3" />
        <path d="M27 22l12 7-12 7z" fill="currentColor" stroke="none" />
        <path d="M22 52h20" />
        <path d="M32 46v6" />
      </svg>
    )
  }
  if (type === 'message') {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 12h40c2 0 4 2 4 4v24c0 2-2 4-4 4H30l-10 8v-8h-8c-2 0-4-2-4-4V16c0-2 2-4 4-4z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="12" width="48" height="40" rx="3" />
      <circle cx="22" cy="26" r="5" />
      <path d="M8 44l14-14 10 10 10-8 14 14" />
    </svg>
  )
}
