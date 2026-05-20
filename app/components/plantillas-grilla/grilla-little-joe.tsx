// app/components/plantillas-grilla/grilla-little-joe.tsx
// Plantilla Little Joe — versión oficial según skill `marca-4-little-joe`
//   Colores oficiales: ink #1A1A1A · coral #E84A40 · cream #FAF3E8 · mustard #E5B043
//   Fonts: Archivo Black (display, Google Fonts) + Inter (body)
//   Layout: bandas tricolor italiana (coral + cream + mustard) + mascot smile +
//           cards sticker style (border 3px + offset shadow) + claim
//           "PON UNA SONRISA EN EL AIRE" en footer
'use client'

import type { GrillaPublicacionLite } from './types'

const INK = '#1A1A1A'
const CORAL = '#E84A40'
const CREAM = '#FAF3E8'
const MUSTARD = '#E5B043'
const SHADOW = 'rgba(26,26,26,0.95)'

// 5 variantes de card según manual:
// v1 blanca / v2 cream / v3 coral statement (UNA VEZ) / v4 white shadow coral / v5 cream
const CARD_VARIANTS = ['white', 'cream', 'coral', 'white-shadow', 'cream'] as const
type CardVariant = (typeof CARD_VARIANTS)[number]

const DIAS_SHORT_ES = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MESES_UP = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const MESES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

type Props = {
  semanaInicio: string
  semanaFin: string
  publicaciones: GrillaPublicacionLite[]
  logoUrl?: string
}

// Inferir icono por keywords (banco oficial: botella, reloj, auto, pelota fútbol, burbuja 99)
type IconKey = 'spray' | 'clock' | 'car' | 'ball' | 'bubble99' | 'heart'

function inferIcon(titulo: string, tipos: string[]): IconKey {
  const lower = titulo.toLowerCase()
  if (/testimon|fan|histori|reseñ|experien/.test(lower)) return 'bubble99'
  if (/fútbol|cristal|alianza|universitario|garra|crema|pasión|club|estadio/.test(lower)) return 'ball'
  if (/auto|carro|vehícul|coche|rejilla|espejo|conducir|manejar/.test(lower)) return 'car'
  if (/dura|45 días|tiempo|cuanto dura/.test(lower)) return 'clock'
  if (/amor|cariñ|regalo|detalle/.test(lower)) return 'heart'
  const t = tipos.join(' ').toLowerCase()
  if (t.includes('reel') || t.includes('video') || t.includes('tiktok')) return 'spray'
  return 'spray'
}

function pickVariant(idx: number, totalPubs: number): CardVariant {
  // La v3 (coral statement) SOLO aparece una vez. Forzamos en posición 2 si hay >=3 pubs.
  if (totalPubs >= 3 && idx === 2) return 'coral'
  // Resto rotación blanca/cream alternando
  const nonCoral = ['white', 'cream', 'white-shadow', 'cream', 'white'] as const
  return nonCoral[idx % nonCoral.length]
}

export function GrillaLittleJoe({
  semanaInicio, semanaFin, publicaciones,
  logoUrl = '/marcas/little-joe/logo.png',
}: Props) {
  const pubsConFecha = publicaciones
    .filter((p) => p.fecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 5)  // máx 5 cards

  const d1 = new Date(semanaInicio + 'T12:00:00Z')
  const d2 = new Date(semanaFin + 'T12:00:00Z')
  const datePill = `${d1.getUTCDate()} — ${d2.getUTCDate()} ${MESES_UP[d1.getUTCMonth()]} · ${d1.getUTCFullYear()}`
  const mesName = MESES_LONG[d1.getUTCMonth()]
  const subHeader = `${mesName.charAt(0).toUpperCase() + mesName.slice(1)} · Del ${d1.getUTCDate()} al ${d2.getUTCDate()}`

  return (
    <div
      style={{
        width: 1080,
        height: 1620,
        background: CREAM,
        position: 'relative',
        overflow: 'hidden',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        color: INK,
        boxSizing: 'border-box',
      }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@300;400;500;600;700;800;900&display=swap" />

      {/* BANDAS ITALIANAS — coral + cream + mustard (NO verde-blanco-rojo) */}
      <div style={{ display: 'flex', height: 12, flexShrink: 0 }}>
        <div style={{ flex: 1, background: CORAL }} />
        <div style={{ flex: 1, background: CREAM, borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${INK}` }} />
        <div style={{ flex: 1, background: MUSTARD }} />
      </div>

      {/* CONTENT WRAPPER */}
      <div style={{ flex: 1, padding: '50px 70px 30px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Mascot smile decorativo en esquina superior derecha */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 40,
            width: 130,
            height: 130,
            borderRadius: '50%',
            background: MUSTARD,
            border: `4px solid ${INK}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `6px 6px 0 ${SHADOW}`,
          }}
        >
          {/* Cara smiley simple CSS */}
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="28" cy="32" r="4" fill={INK} />
            <circle cx="52" cy="32" r="4" fill={INK} />
            <path d="M22 48 Q40 64, 58 48" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        {/* HEADER */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 30, maxWidth: 720 }}>
          {/* Logo cuadrado coral rotado con J */}
          <div
            style={{
              width: 80,
              height: 80,
              background: CORAL,
              transform: 'rotate(-6deg)',
              border: `3px solid ${INK}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `4px 4px 0 ${SHADOW}`,
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 56, color: '#FFFFFF', lineHeight: 1, paddingBottom: 6 }}>J</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 56, color: INK, lineHeight: 1, letterSpacing: -1 }}>
              LITTLE JOE
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: INK, letterSpacing: 2, marginTop: 6, opacity: 0.7 }}>
              HECHO EN ITALIA · PERÚ
            </div>
          </div>
        </header>

        {/* Date pill alineada izquierda */}
        <div style={{ marginBottom: 24 }}>
          <span style={{
            display: 'inline-block',
            background: INK,
            color: CREAM,
            fontFamily: 'Archivo Black, sans-serif',
            fontSize: 22,
            letterSpacing: 1,
            padding: '12px 24px',
            border: `3px solid ${INK}`,
            boxShadow: `4px 4px 0 ${CORAL}`,
          }}>
            {datePill}
          </span>
        </div>

        {/* HERO */}
        <section style={{ marginBottom: 30 }}>
          <div
            style={{
              fontFamily: 'Archivo Black, sans-serif',
              fontSize: 130,
              color: INK,
              lineHeight: 0.9,
              letterSpacing: -3,
            }}
          >
            ¿QUÉ SE
          </div>
          <div
            style={{
              fontFamily: 'Archivo Black, sans-serif',
              fontSize: 130,
              color: CORAL,
              fontStyle: 'italic',
              lineHeight: 0.9,
              letterSpacing: -3,
              marginTop: 4,
            }}
          >
            VIENE?
          </div>
          <div style={{ fontSize: 22, color: INK, marginTop: 16, fontWeight: 500, opacity: 0.85 }}>
            {subHeader} · {pubsConFecha.length} {pubsConFecha.length === 1 ? 'publicación' : 'publicaciones'}
          </div>
        </section>

        {/* CARDS sticker style */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          {pubsConFecha.map((pub, idx) => {
            const variant = pickVariant(idx, pubsConFecha.length)
            const fechaDate = new Date(pub.fecha + 'T12:00:00Z')
            const dia = fechaDate.getUTCDate()
            const diaShort = DIAS_SHORT_ES[fechaDate.getUTCDay()]
            const tipo = pub.tipo_contenido[0]?.toUpperCase() ?? 'REEL'
            const icon = inferIcon(pub.titulo, pub.tipo_contenido)

            // Estilos por variant
            const isCoral = variant === 'coral'
            const cardBg = variant === 'cream' ? '#FFF8EE' : variant === 'coral' ? CORAL : '#FFFFFF'
            const txtColor = isCoral ? CREAM : INK
            const shadowColor = variant === 'white-shadow' ? CORAL : INK
            const platforms = (pub.plataformas.length > 0 ? pub.plataformas : ['Instagram', 'Facebook', 'Tiktok']).slice(0, 3)

            return (
              <article
                key={pub.id}
                style={{
                  background: cardBg,
                  border: `3px solid ${INK}`,
                  borderRadius: 14,
                  padding: '20px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  boxShadow: `6px 6px 0 ${shadowColor}`,
                  minHeight: 110,
                  position: 'relative',
                }}
              >
                {/* Día */}
                <div style={{ flexShrink: 0, minWidth: 100, textAlign: 'left' }}>
                  <div style={{
                    fontFamily: 'Archivo Black, sans-serif',
                    fontSize: 64,
                    color: txtColor,
                    lineHeight: 0.9,
                    letterSpacing: -1,
                  }}>
                    {dia}
                  </div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: txtColor,
                    letterSpacing: 2,
                    marginTop: 2,
                    opacity: isCoral ? 0.9 : 0.7,
                  }}>
                    {diaShort}
                  </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{
                    fontFamily: 'Archivo Black, sans-serif',
                    fontSize: 26,
                    color: txtColor,
                    lineHeight: 1.1,
                    letterSpacing: -0.3,
                  }}>
                    {pub.titulo}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {platforms.map((p) => (
                      <span
                        key={p}
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: isCoral ? CREAM : INK,
                          padding: '3px 10px',
                          background: isCoral ? 'rgba(255,255,255,0.2)' : 'rgba(26,26,26,0.08)',
                          border: `1.5px solid ${isCoral ? CREAM : INK}`,
                          borderRadius: 999,
                          letterSpacing: 1,
                        }}
                      >
                        {p === 'Instagram' ? 'IG' : p === 'Facebook' ? 'FB' : p === 'Tiktok' ? 'TT' : p.slice(0, 2).toUpperCase()}
                      </span>
                    ))}
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: isCoral ? CREAM : CORAL,
                      letterSpacing: 1,
                      marginLeft: 6,
                    }}>
                      · {tipo}
                    </span>
                  </div>
                </div>

                {/* Icon */}
                <div style={{ flexShrink: 0, width: 70, height: 70, color: isCoral ? CREAM : INK }}>
                  <IconSvg type={icon} />
                </div>
              </article>
            )
          })}

          {pubsConFecha.length === 0 && (
            <div style={{
              background: 'transparent',
              border: `3px dashed ${INK}`,
              borderRadius: 14,
              padding: 60,
              textAlign: 'center',
              color: INK,
              opacity: 0.5,
              fontFamily: 'Archivo Black, sans-serif',
              fontSize: 28,
            }}>
              Sin publicaciones esta semana
            </div>
          )}
        </section>

        {/* FOOTER — claim oficial */}
        <footer style={{ marginTop: 30, paddingTop: 24, borderTop: `2px solid ${INK}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontFamily: 'Archivo Black, sans-serif',
            fontSize: 22,
            color: INK,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            Pon una sonrisa <span style={{ color: CORAL, fontStyle: 'italic' }}>en el aire</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: INK, letterSpacing: 2 }}>
            DISTINTO · AGENCIA
          </div>
        </footer>
      </div>
    </div>
  )
}

// ============================================================
// Icons SVG — banco oficial Little Joe (spray, reloj, auto, balón, 99)
// ============================================================
function IconSvg({ type }: { type: 'spray' | 'clock' | 'car' | 'ball' | 'bubble99' | 'heart' }) {
  const common = {
    viewBox: '0 0 64 64',
    width: '100%',
    height: '100%',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (type === 'spray') {
    return (
      <svg {...common}>
        <rect x="20" y="20" width="24" height="32" rx="3" />
        <rect x="24" y="12" width="16" height="8" />
        <path d="M18 28h-6 M18 36h-6 M50 28h6 M50 36h6" />
      </svg>
    )
  }
  if (type === 'clock') {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="22" />
        <path d="M32 16v16l10 6" />
      </svg>
    )
  }
  if (type === 'car') {
    return (
      <svg {...common}>
        <path d="M8 36l4-12c1-3 3-4 6-4h28c3 0 5 1 6 4l4 12" />
        <rect x="6" y="36" width="52" height="12" rx="2" />
        <circle cx="18" cy="48" r="4" />
        <circle cx="46" cy="48" r="4" />
      </svg>
    )
  }
  if (type === 'ball') {
    return (
      <svg {...common}>
        <circle cx="32" cy="32" r="22" />
        <path d="M32 10v44 M10 32h44 M16 18l32 28 M48 18L16 46" />
      </svg>
    )
  }
  if (type === 'bubble99') {
    return (
      <svg {...common}>
        <path d="M12 12h40c2 0 4 2 4 4v22c0 2-2 4-4 4H30l-10 8v-8h-8c-2 0-4-2-4-4V16c0-2 2-4 4-4z" />
        <text x="32" y="32" fontFamily="Archivo Black, sans-serif" fontWeight="900" fontSize="16" fill="currentColor" stroke="none" textAnchor="middle">99</text>
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M32 54s-20-11.5-20-26a10 10 0 0120-3 10 10 0 0120 3c0 14.5-20 26-20 26z" />
    </svg>
  )
}
