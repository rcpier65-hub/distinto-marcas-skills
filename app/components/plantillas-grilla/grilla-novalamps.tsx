// app/components/plantillas-grilla/grilla-novalamps.tsx
// Plantilla NovaLamps — réplica del PNG novalamps-grilla-18-24-may-2026.png
// Layout: dark mode con fondo gris oscuro, header con range pill +
// "Esta semana en Novalamps", cards verticales compactas con hora a la derecha
'use client'

import type { GrillaPublicacionLite } from './types'

const DARK_BG = '#1F2127'
const CARD_BG = '#2A2D35'
const ACCENT_YELLOW = '#E8C77E'
const TEXT_WHITE = '#F5F0E8'
const TEXT_MUTED = 'rgba(245,240,232,0.65)'

const DIAS_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_UP = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const MESES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

type Props = {
  semanaInicio: string
  semanaFin: string
  publicaciones: GrillaPublicacionLite[]
  horaDefault?: string
}

function platformShort(p: string): string {
  if (p === 'Instagram') return 'IG'
  if (p === 'Facebook') return 'FB'
  if (p === 'Tiktok') return 'TT'
  return p.slice(0, 2).toUpperCase()
}

export function GrillaNovaLamps({ semanaInicio, semanaFin, publicaciones, horaDefault = '6:30 pm' }: Props) {
  const pubsConFecha = publicaciones.filter((p) => p.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha))

  const d1 = new Date(semanaInicio + 'T12:00:00Z')
  const d2 = new Date(semanaFin + 'T12:00:00Z')
  const datePill = `${d1.getUTCDate()} — ${d2.getUTCDate()} ${MESES_UP[d1.getUTCMonth()]} · ${d1.getUTCFullYear()}`
  const subHeader = `${publicaciones.length} publicaciones programadas · Del lun ${d1.getUTCDate()} al dom ${d2.getUTCDate()} de ${MESES_LONG[d1.getUTCMonth()]}`

  return (
    <div
      style={{
        width: 1080,
        height: 1620,
        background: DARK_BG,
        padding: '60px 70px 40px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Poppins, system-ui, -apple-system, sans-serif',
        color: TEXT_WHITE,
        boxSizing: 'border-box',
      }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" />

      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div style={{
          background: 'rgba(245,240,232,0.08)',
          color: TEXT_WHITE,
          fontWeight: 600,
          fontSize: 18,
          letterSpacing: 1,
          padding: '10px 22px',
          borderRadius: 999,
          border: '1px solid rgba(245,240,232,0.15)',
        }}>
          {datePill}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_MUTED, letterSpacing: 2 }}>
          GRILLA SEMANAL · CONTENIDO
        </div>
      </header>

      {/* Hero */}
      <section style={{ marginBottom: 40 }}>
        <div style={{
          fontSize: 70,
          fontWeight: 900,
          color: TEXT_WHITE,
          lineHeight: 1,
          letterSpacing: -1,
        }}>
          Esta semana en{' '}
          <span style={{
            background: ACCENT_YELLOW,
            color: DARK_BG,
            padding: '4px 18px',
            borderRadius: 8,
            fontStyle: 'italic',
            display: 'inline-block',
          }}>
            Novalamps
          </span>
        </div>
        <div style={{ fontSize: 18, color: TEXT_MUTED, marginTop: 16 }}>
          {subHeader}
        </div>
      </section>

      {/* Cards verticales compactas */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {pubsConFecha.slice(0, 7).map((pub) => {
          const fechaDate = new Date(pub.fecha + 'T12:00:00Z')
          const dia = fechaDate.getUTCDate()
          const diaShort = DIAS_SHORT_ES[fechaDate.getUTCDay()]
          const tipo = pub.tipo_contenido[0]?.toUpperCase() ?? 'REEL'
          const plats = (pub.plataformas.length > 0 ? pub.plataformas : ['Instagram', 'Facebook'])
            .map(platformShort)
            .join(' · ')

          return (
            <article
              key={pub.id}
              style={{
                background: CARD_BG,
                borderRadius: 14,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 24,
              }}
            >
              {/* Fecha izquierda */}
              <div style={{
                flexShrink: 0,
                minWidth: 80,
                textAlign: 'center',
                borderRight: '1px solid rgba(245,240,232,0.15)',
                paddingRight: 20,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: ACCENT_YELLOW, letterSpacing: 2, marginBottom: 2 }}>
                  {diaShort.toUpperCase()}
                </div>
                <div style={{ fontSize: 38, fontWeight: 800, color: TEXT_WHITE, lineHeight: 1 }}>
                  {dia}
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: TEXT_MUTED, letterSpacing: 1, marginTop: 4 }}>
                  {MESES_UP[fechaDate.getUTCMonth()]}
                </div>
              </div>

              {/* Title + meta center */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: TEXT_WHITE, lineHeight: 1.2 }}>
                  {pub.titulo}
                </div>
                <div style={{ fontSize: 13, color: TEXT_MUTED }}>
                  Reel {tipo === 'REEL' ? 'estándar' : tipo.toLowerCase()} · {plats}
                </div>
              </div>

              {/* Hora a la derecha */}
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED, letterSpacing: 2, marginBottom: 2 }}>
                  HORA
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: ACCENT_YELLOW }}>
                  {horaDefault}
                </div>
              </div>
            </article>
          )
        })}
      </section>

      {/* FOOTER */}
      <footer style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(245,240,232,0.1)' }}>
        <div style={{ fontSize: 12, color: TEXT_MUTED }}>
          Semana 21 · mayo 2026
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_WHITE, letterSpacing: 2 }}>
          AGENCIA DISTINTO
        </div>
      </footer>
    </div>
  )
}
