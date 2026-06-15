'use client'

/* AvisoGrabaciones — panel de próximas grabaciones. Pedro: 'aviso que
   diga tienes grabación el día tal'. Se muestra en el inicio del equipo
   y, para el CEO, arriba del cockpit (justo después de las métricas)
   porque es lo más importante de la semana. */

import { Video } from 'lucide-react'

export type GrabacionProxima = {
  id: string
  fechaCorta: string   /* 'Mié 17 jun' */
  horaTexto: string    /* '10:00 AM' / '—' */
  marca: string
  marcaColor: string
  marcaEmoji: string | null
  esHoy: boolean
  esManana: boolean
}

export function AvisoGrabaciones({
  grabaciones,
  acento,
}: {
  grabaciones: GrabacionProxima[]
  acento: string
}) {
  const hayHoy = grabaciones.some((g) => g.esHoy)
  const hayManana = grabaciones.some((g) => g.esManana)
  const urgente = hayHoy || hayManana
  const bgColor = hayHoy ? '#fef2f2' : hayManana ? '#fffbeb' : '#fff'
  const borderColor = hayHoy ? '#fca5a5' : hayManana ? '#fcd34d' : `${acento}33`
  const titleColor = hayHoy ? '#991b1b' : hayManana ? '#92400e' : '#111827'

  const titulo = hayHoy
    ? '🎥 Tienes grabación hoy'
    : hayManana
    ? '🎥 Tienes grabación mañana'
    : `Próximas grabaciones`
  const showCount = grabaciones.length

  return (
    <section
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: urgente ? `0 4px 14px -6px ${borderColor}66` : '0 1px 2px rgba(16, 24, 40, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Video size={18} strokeWidth={2} color={titleColor} />
        <h3 style={{
          fontSize: 14, fontWeight: 600,
          color: titleColor,
          margin: 0,
          letterSpacing: '-0.005em',
          flex: 1,
        }}>
          {titulo}
        </h3>
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 999,
          background: `${titleColor}15`,
          color: titleColor,
        }}>
          {showCount}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {grabaciones.map((g) => (
          <a
            key={g.id}
            href="/grabaciones"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              textDecoration: 'none',
              background: '#fff',
              border: `1px solid ${borderColor}55`,
              transition: 'background 100ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
          >
            {g.marcaEmoji ? (
              <span style={{
                width: 28, height: 28,
                borderRadius: 8,
                background: `${g.marcaColor}14`,
                border: `1px solid ${g.marcaColor}33`,
                display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 14, lineHeight: 1,
                flexShrink: 0,
              }}>
                {g.marcaEmoji}
              </span>
            ) : (
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: g.marcaColor,
                flexShrink: 0,
              }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: '#111827',
                display: 'flex', alignItems: 'center', gap: 6,
                flexWrap: 'wrap',
              }}>
                <span>{g.marca}</span>
                {g.esHoy && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: '#fef2f2',
                    color: '#dc2626',
                    letterSpacing: '0.04em',
                  }}>HOY</span>
                )}
                {g.esManana && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: '#fffbeb',
                    color: '#92400e',
                    letterSpacing: '0.04em',
                  }}>MAÑANA</span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 1 }}>
                {g.fechaCorta} · <strong style={{ color: '#111827' }}>{g.horaTexto}</strong>
              </div>
            </div>
            <span style={{ color: '#d1d5db' }}>→</span>
          </a>
        ))}
      </div>
    </section>
  )
}
