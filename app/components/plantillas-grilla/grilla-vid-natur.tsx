// app/components/plantillas-grilla/grilla-vid-natur.tsx
// Plantilla Vid Natur — marca natural/wellness ("Extiende tu vitalidad").
// Paleta del manual de marca: naranja #FF6B00 (Pantone 1505C) + verde #449647
// + carbón #3B3F41 + frambuesa #D24867. Tipografía Poppins/Rubik (Gotham es la
// principal del manual, no es libre → Poppins es el equivalente geométrico).
// Layout: fondo cálido claro, header con logo real + date pill naranja, hero
// "Esta semana en Vid Natur", cards horizontales con acento naranja/verde
// alternado y motivo de hoja. Footer con isotipo Distinto.
'use client'

import type { GrillaPublicacionLite } from './types'

const ORANGE = '#FF6B00'
const GREEN = '#449647'
const CHARCOAL = '#3B3F41'
const CANVAS = '#FBF7EF'        // crema cálido natural
const CARD_BG = '#FFFFFF'
const MUTED = 'rgba(59,63,65,0.62)'

const DIAS_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_UP = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const MESES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

type Props = {
  semanaInicio: string
  semanaFin: string
  publicaciones: GrillaPublicacionLite[]
  logoUrl?: string
  horaDefault?: string
}

function platformShort(p: string): string {
  if (p === 'Instagram') return 'IG'
  if (p === 'Facebook') return 'FB'
  if (p === 'Tiktok') return 'TikTok'
  return p.slice(0, 2).toUpperCase()
}

// Hoja/brote — eco del isotipo de Vid Natur, usado como acento en cada card.
function LeafIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
      <path
        d="M32 54C20 50 14 40 14 28c0-8 4-15 4-15s9 3 14 10c5-7 14-10 14-10s4 7 4 15c0 12-6 22-18 26z"
        fill={color}
        opacity={0.16}
      />
      <path
        d="M32 54C20 50 14 40 14 28c0-8 4-15 4-15s9 3 14 10c5-7 14-10 14-10s4 7 4 15c0 12-6 22-18 26z"
        stroke={color}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <path d="M32 52V24" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  )
}

export function GrillaVidNatur({
  semanaInicio,
  semanaFin,
  publicaciones,
  logoUrl = '/marcas/vid-natur/logo.png',
  horaDefault = '6:30 pm',
}: Props) {
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
        padding: '64px 76px 48px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Poppins, system-ui, -apple-system, sans-serif',
        color: CHARCOAL,
        boxSizing: 'border-box',
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility',
      }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=Rubik:wght@400;500;600;700&display=swap" />

      {/* Blobs decorativos orgánicos — naranja + verde */}
      <div style={{ position: 'absolute', width: 460, height: 280, top: -130, right: -150, background: ORANGE, opacity: 0.12, filter: 'blur(2px)', transform: 'rotate(-22deg)', borderRadius: '60% 40% 55% 45% / 60% 50% 50% 40%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 420, height: 260, bottom: -120, left: -150, background: GREEN, opacity: 0.13, filter: 'blur(2px)', transform: 'rotate(16deg)', borderRadius: '50% 50% 60% 40% / 50% 60% 40% 50%', pointerEvents: 'none' }} />

      {/* HEADER — logo real + date pill */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt="Vid Natur"
          style={{ width: 200, height: 'auto', flexShrink: 0, objectFit: 'contain' }}
          crossOrigin="anonymous"
        />
        <div style={{ flex: 1 }} />
        <div
          style={{
            background: ORANGE,
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 21,
            letterSpacing: 0.6,
            padding: '15px 26px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
            alignSelf: 'center',
            boxShadow: '0 10px 24px rgba(255,107,0,0.28)',
          }}
        >
          {datePill}
        </div>
      </header>

      {/* HERO */}
      <section style={{ textAlign: 'center', margin: '36px 0 30px' }}>
        <h1 style={{ fontSize: 74, fontWeight: 800, color: CHARCOAL, lineHeight: 1.02, letterSpacing: -1.2, margin: 0 }}>
          Esta semana en{' '}
          <span style={{ background: ORANGE, color: '#FFFFFF', padding: '2px 20px', borderRadius: 12, display: 'inline-block' }}>
            Vid Natur
          </span>
        </h1>
        <div style={{ fontFamily: 'Rubik, sans-serif', fontSize: 23, fontWeight: 400, color: MUTED, marginTop: 16 }}>
          {subHeader}
        </div>
        {/* Divisor con hojas + dot verde */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 20 }}>
          <span style={{ width: 200, height: 2, background: GREEN, opacity: 0.5, borderRadius: 2 }} />
          <span style={{ width: 26, height: 26, display: 'inline-block' }}><LeafIcon color={GREEN} /></span>
          <span style={{ width: 200, height: 2, background: GREEN, opacity: 0.5, borderRadius: 2 }} />
        </div>
        <div style={{ fontFamily: 'Rubik, sans-serif', fontSize: 16, fontWeight: 600, color: ORANGE, letterSpacing: 3, textTransform: 'uppercase', marginTop: 14 }}>
          Extiende tu vitalidad
        </div>
      </section>

      {/* CARDS */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        {pubsConFecha.slice(0, 7).map((pub, idx) => {
          const acc = idx % 2 === 0 ? ORANGE : GREEN
          const fechaDate = new Date(pub.fecha + 'T12:00:00Z')
          const dia = fechaDate.getUTCDate()
          const diaShort = DIAS_SHORT_ES[fechaDate.getUTCDay()]
          const plats = (pub.plataformas.length > 0 ? pub.plataformas : ['Instagram', 'Facebook'])
            .map(platformShort)
            .join(' · ')
          const tipoShort = pub.tipo_contenido[0]?.replace(/REEL.*/i, 'Reel') ?? 'Reel'
          const meta = [horaDefault, plats, tipoShort].filter(Boolean).join(' · ')

          return (
            <article
              key={pub.id}
              style={{
                background: CARD_BG,
                borderRadius: 20,
                padding: '22px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                borderLeft: `6px solid ${acc}`,
                boxShadow: '0 8px 22px rgba(59,63,65,0.06)',
              }}
            >
              {/* Fecha */}
              <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 92, paddingRight: 22, borderRight: `1px solid rgba(59,63,65,0.12)` }}>
                <div style={{ fontFamily: 'Rubik, sans-serif', fontSize: 15, fontWeight: 700, color: acc, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
                  {diaShort}
                </div>
                <div style={{ fontSize: 46, fontWeight: 800, color: CHARCOAL, lineHeight: 0.95 }}>
                  {dia}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: MUTED, letterSpacing: 1, marginTop: 2 }}>
                  {MESES_UP[fechaDate.getUTCMonth()]}
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 27, fontWeight: 700, color: CHARCOAL, lineHeight: 1.18, letterSpacing: -0.3 }}>
                  {pub.titulo}
                </div>
                <div style={{ fontFamily: 'Rubik, sans-serif', fontSize: 17, fontWeight: 400, color: MUTED }}>
                  {meta}
                </div>
              </div>

              {/* Hoja acento */}
              <div style={{ flexShrink: 0, width: 56, height: 56 }}>
                <LeafIcon color={acc} />
              </div>
            </article>
          )
        })}

        {pubsConFecha.length === 0 && (
          <div style={{ border: '2px dashed rgba(59,63,65,0.18)', borderRadius: 20, padding: 60, textAlign: 'center', color: MUTED, fontSize: 26 }}>
            Sin publicaciones programadas esta semana
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ marginTop: 'auto', paddingTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(59,63,65,0.1)' }}>
        <div style={{ fontFamily: 'Rubik, sans-serif', fontSize: 14, color: MUTED }}>
          Grilla semanal · {mesName.charAt(0).toUpperCase() + mesName.slice(1)} {d1.getUTCFullYear()}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, color: CHARCOAL, letterSpacing: 3, textTransform: 'uppercase' }}>
          <svg viewBox="0 0 200 110" style={{ width: 'auto', height: 30 }}>
            <defs>
              <mask id="vnDistintoBite">
                <rect width="200" height="110" fill="white" />
                <circle cx="168" cy="92" r="20" fill="black" />
              </mask>
            </defs>
            <circle cx="135" cy="58" r="46" fill="#C5A82D" mask="url(#vnDistintoBite)" />
            <circle cx="60" cy="55" r="50" fill="#8B2DC9" />
          </svg>
          <span>Distinto · Agencia</span>
        </div>
      </footer>
    </div>
  )
}
