// app/components/plantillas-grilla/grilla-little-joe.tsx
// Plantilla Little Joe — réplica del PNG grilla-little-joe-18-24may.png
// Layout: bandera italiana arriba + "Grilla semanal" hero (semanal en rojo) +
// grid 2x2 de cards grandes con descripción + chips IG/TT/FB + REEL tag esquina
'use client'

import type { GrillaPublicacionLite } from './types'

const NAVY = '#0A2647'
const RED_ITA = '#CE2B37'
const GREEN_ITA = '#008C45'
const CANVAS = '#FAF6F0'
const ROSE_BG = '#FFF0F2'
const ROSE_BORDER = '#FBD5DB'

const DIAS_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_UP = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const MESES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

type Props = {
  semanaInicio: string
  semanaFin: string
  publicaciones: GrillaPublicacionLite[]
}

// Truncar a N caracteres con elipsis (para descripciones largas)
function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function platformShort(p: string): string {
  if (p === 'Instagram') return 'IG'
  if (p === 'Facebook') return 'FB'
  if (p === 'Tiktok') return 'TT'
  return p.slice(0, 2).toUpperCase()
}

export function GrillaLittleJoe({ semanaInicio, semanaFin, publicaciones }: Props) {
  const pubsConFecha = publicaciones.filter((p) => p.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha))

  const d1 = new Date(semanaInicio + 'T12:00:00Z')
  const d2 = new Date(semanaFin + 'T12:00:00Z')
  const datePill = `${d1.getUTCDate()} — ${d2.getUTCDate()} ${MESES_UP[d1.getUTCMonth()]} · ${d1.getUTCFullYear()}`
  const mesName = MESES_LONG[d1.getUTCMonth()]
  const subHeader = `${DIAS_LONG[d1.getUTCDay()].charAt(0).toUpperCase() + DIAS_LONG[d1.getUTCDay()].slice(1)} ${d1.getUTCDate()} al ${DIAS_LONG[d2.getUTCDay()]} ${d2.getUTCDate()} de ${mesName} · ${publicaciones.length} publicaciones`

  return (
    <div
      style={{
        width: 1080,
        height: 1620,
        background: CANVAS,
        padding: '0 80px 30px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Poppins, system-ui, -apple-system, sans-serif',
        color: NAVY,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700;800;900&display=swap" />

      {/* Bandera italiana arriba */}
      <div style={{ display: 'flex', height: 26, margin: '0 -80px' }}>
        <div style={{ flex: 1, background: GREEN_ITA }} />
        <div style={{ flex: 1, background: '#FFFFFF' }} />
        <div style={{ flex: 1, background: RED_ITA }} />
      </div>

      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 50, marginBottom: 30 }}>
        <div>
          <div style={{ display: 'flex', gap: 12, fontSize: 64, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
            <span style={{ color: NAVY }}>LITTLE</span>
            <span style={{ color: RED_ITA }}>JOE</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: NAVY, letterSpacing: 2, marginTop: 8 }}>
            HECHO EN ITALIA · PERÚ
          </div>
        </div>
        <div style={{
          background: NAVY,
          color: '#FFFFFF',
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: 0.8,
          padding: '16px 28px',
          borderRadius: 999,
          whiteSpace: 'nowrap',
        }}>
          {datePill}
        </div>
      </header>

      {/* Hero "Grilla semanal" */}
      <section style={{ marginBottom: 35 }}>
        <div style={{ fontSize: 110, fontWeight: 900, color: NAVY, lineHeight: 0.9, letterSpacing: -2 }}>
          Grilla
        </div>
        <div style={{ fontSize: 110, fontWeight: 900, color: RED_ITA, fontStyle: 'italic', lineHeight: 0.95, letterSpacing: -2, marginTop: 4 }}>
          semanal
        </div>
        <div style={{ fontSize: 22, color: NAVY, marginTop: 14, opacity: 0.85 }}>
          {subHeader}
        </div>
      </section>

      {/* Grid 2x2 cards */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 20,
        flex: 1,
      }}>
        {pubsConFecha.slice(0, 4).map((pub, idx) => {
          const fechaDate = new Date(pub.fecha + 'T12:00:00Z')
          const dia = fechaDate.getUTCDate()
          const diaShort = DIAS_SHORT_ES[fechaDate.getUTCDay()]
          const tipo = pub.tipo_contenido[0]?.toUpperCase() ?? ''
          // La card de "MIÉ" tenía un banner ROSE (alta prioridad). Aplicamos a la 2da
          const isPriority = idx === 1
          const cardBg = isPriority ? ROSE_BG : '#FFFFFF'
          const cardBorder = isPriority ? ROSE_BORDER : '#EAEAEA'

          return (
            <article
              key={pub.id}
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: 18,
                padding: '28px 30px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Day */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 56, fontWeight: 900, color: NAVY, lineHeight: 1 }}>{dia}</span>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: NAVY, letterSpacing: 2 }}>{diaShort.toUpperCase()}</span>
                  <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, letterSpacing: 1, opacity: 0.7 }}>
                    {MESES_UP[fechaDate.getUTCMonth()].slice(0, 3)}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div style={{ fontSize: 26, fontWeight: 800, color: NAVY, lineHeight: 1.15, letterSpacing: -0.3 }}>
                {pub.titulo}
              </div>

              {/* Spacer */}
              <div style={{ flex: 1, minHeight: 100 }} />

              {/* Dashed divider */}
              <div style={{ borderTop: '1px dashed rgba(10,38,71,0.25)' }} />

              {/* Footer: platforms + tipo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(pub.plataformas.length > 0 ? pub.plataformas : ['Instagram', 'Tiktok', 'Facebook']).slice(0, 3).map((p) => (
                    <span
                      key={p}
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: NAVY,
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: 'rgba(10,38,71,0.06)',
                      }}
                    >
                      {platformShort(p)}
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: RED_ITA, letterSpacing: 1 }}>
                  {tipo || 'REEL'}
                </span>
              </div>

              {/* Banner "ALTA PRIORIDAD" para la card priority */}
              {isPriority && (
                <div style={{
                  position: 'absolute',
                  top: 20,
                  right: -32,
                  background: RED_ITA,
                  color: '#FFFFFF',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1,
                  padding: '4px 36px',
                  transform: 'rotate(45deg)',
                }}>
                  ALTA PRIORIDAD
                </div>
              )}
            </article>
          )
        })}
      </section>

      {/* FOOTER */}
      <footer style={{ marginTop: 24, paddingTop: 20, borderTop: `2px solid ${NAVY}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, fontStyle: 'italic' }}>
          Pon una sonrisa <span style={{ color: RED_ITA }}>en el aire</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, letterSpacing: 2 }}>
          DISTINTO AGENCIA
        </div>
      </footer>
    </div>
  )
}
