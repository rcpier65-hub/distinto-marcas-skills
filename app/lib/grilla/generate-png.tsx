// app/lib/grilla/generate-png.tsx
import { ImageResponse } from '@vercel/og'

export type GrillaData = {
  marca: { nombre: string; emoji: string; color: string }
  semanaInicio: string
  semanaFin: string
  publicaciones: number
}

/**
 * Genera un PNG 1080x1620 (ratio 2:3, ideal para IG/TikTok stories)
 * con un diseño limpio shadcn-style.
 *
 * Decisiones de diseño:
 * - Fondo: color de marca (sólido)
 * - Header pill blanco transparente con nombre marca
 * - Hero "¿Qué se viene?" en serif gigante (Playfair Display fallback)
 * - 5 cards verticales semitransparentes (lun-vie) o N según data
 * - Footer con nombre app y fecha generación
 */
export async function generateGrillaPNG(data: GrillaData): Promise<Buffer> {
  const { marca, semanaInicio, semanaFin, publicaciones } = data

  // Color de fondo (con un overlay sutil oscuro para que texto blanco se vea bien)
  const bgColor = marca.color
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']
  const fechaInicio = new Date(semanaInicio + 'T12:00:00')
  const formatFecha = (d: Date) =>
    d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })

  const img = new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1620px',
          background: bgColor,
          padding: '70px 60px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: 'white',
          position: 'relative',
        }}
      >
        {/* Overlay sutil para profundidad */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.25) 100%)',
          }}
        />

        {/* HEADER — pill con marca */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: 999,
              padding: '20px 32px',
              border: '2px solid rgba(255,255,255,0.25)',
            }}
          >
            <span style={{ fontSize: 56 }}>{marca.emoji}</span>
            <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: -0.5 }}>
              {marca.nombre}
            </span>
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              opacity: 0.85,
              padding: '14px 22px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 16,
            }}
          >
            {formatFecha(fechaInicio)} →{' '}
            {formatFecha(new Date(semanaFin + 'T12:00:00'))}
          </div>
        </div>

        {/* HERO */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGrow: 1,
            marginTop: -50,
            zIndex: 1,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 160,
              fontWeight: 800,
              fontStyle: 'italic',
              lineHeight: 0.9,
              letterSpacing: -3,
              textShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            ¿Qué se
          </div>
          <div
            style={{
              fontSize: 160,
              fontWeight: 800,
              fontStyle: 'italic',
              lineHeight: 0.9,
              letterSpacing: -3,
              marginTop: -10,
              textShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            viene?
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 500,
              marginTop: 40,
              opacity: 0.9,
              letterSpacing: 1,
            }}
          >
            Esta semana — {publicaciones} {publicaciones === 1 ? 'publicación' : 'publicaciones'}
          </div>
        </div>

        {/* MINI-CARDS días de la semana */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            zIndex: 1,
            marginBottom: 30,
          }}
        >
          {dias.map((dia, i) => {
            const fecha = new Date(fechaInicio)
            fecha.setDate(fecha.getDate() + i)
            return (
              <div
                key={dia}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 20,
                  padding: '22px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  border: '2px solid rgba(255,255,255,0.25)',
                }}
              >
                <div style={{ fontSize: 24, opacity: 0.85, fontWeight: 600 }}>
                  {dia}
                </div>
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 800,
                    marginTop: 8,
                    lineHeight: 1,
                  }}
                >
                  {fecha.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* FOOTER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
            fontSize: 22,
            opacity: 0.7,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <span>Distinto Agencia · Grilla semanal</span>
          <span>distinto-app.vercel.app</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1620 }
  )

  const arrayBuffer = await img.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
