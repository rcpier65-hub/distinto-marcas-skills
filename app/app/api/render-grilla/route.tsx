// app/app/api/render-grilla/route.tsx
// Route handler edge para generar PNG con @vercel/og.
// Satori (motor de @vercel/og) requiere display: 'flex' EXPLÍCITO en TODOS los divs con >1 hijo.
// No soporta: display: '-webkit-box', algunas propiedades modernas de CSS.
import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: Request) {
  const url = new URL(request.url)

  // Auth Bearer
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const nombre = url.searchParams.get('nombre') ?? 'Marca'
  const emoji = url.searchParams.get('emoji') ?? '📊'
  const color = url.searchParams.get('color') ?? '#283B6F'
  const semanaInicio = url.searchParams.get('inicio') ?? '2026-01-01'
  const semanaFin = url.searchParams.get('fin') ?? '2026-01-07'
  const publicaciones = parseInt(url.searchParams.get('pubs') ?? '5', 10)
  const titulos = [
    url.searchParams.get('dia1') ?? '',
    url.searchParams.get('dia2') ?? '',
    url.searchParams.get('dia3') ?? '',
    url.searchParams.get('dia4') ?? '',
    url.searchParams.get('dia5') ?? '',
  ]

  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']
  const fechaInicio = new Date(semanaInicio + 'T12:00:00Z')
  const formatRange = (d1: Date, d2: Date): string => {
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', timeZone: 'UTC' }
    return `${d1.toLocaleDateString('es-PE', opts)} → ${d2.toLocaleDateString('es-PE', opts)}`
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1620px',
          background: color,
          padding: '80px 70px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
          color: 'white',
        }}
      >
        {/* HEADER ROW — pill marca + pill fecha */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 999,
              padding: '20px 36px',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          >
            <span style={{ fontSize: 56, marginRight: 16 }}>{emoji}</span>
            <span style={{ fontSize: 36, fontWeight: 700 }}>{nombre}</span>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              fontWeight: 600,
              padding: '14px 24px',
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 16,
            }}
          >
            {formatRange(fechaInicio, new Date(semanaFin + 'T12:00:00Z'))}
          </div>
        </div>

        {/* HERO — gran "¿Qué se viene?" */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 170,
              fontWeight: 900,
              fontStyle: 'italic',
              lineHeight: 1,
              letterSpacing: -3,
            }}
          >
            ¿Qué se
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 170,
              fontWeight: 900,
              fontStyle: 'italic',
              lineHeight: 1,
              letterSpacing: -3,
              marginTop: 6,
            }}
          >
            viene?
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              fontWeight: 500,
              marginTop: 50,
              opacity: 0.92,
            }}
          >
            Esta semana · {publicaciones} {publicaciones === 1 ? 'publicación' : 'publicaciones'}
          </div>
        </div>

        {/* MINI-CARDS días */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 30 }}>
          {dias.map((dia, i) => {
            const fecha = new Date(fechaInicio)
            fecha.setUTCDate(fecha.getUTCDate() + i)
            const titulo = titulos[i]
            return (
              <div
                key={dia}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1,
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 18,
                  padding: '22px 14px',
                  border: '2px solid rgba(255,255,255,0.25)',
                  minHeight: 220,
                }}
              >
                <div style={{ display: 'flex', fontSize: 22, opacity: 0.85, fontWeight: 600 }}>{dia}</div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 56,
                    fontWeight: 800,
                    marginTop: 4,
                    lineHeight: 1,
                  }}
                >
                  {fecha.getUTCDate()}
                </div>
                {titulo && (
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 18,
                      marginTop: 14,
                      textAlign: 'center',
                      opacity: 0.9,
                      lineHeight: 1.2,
                      fontWeight: 500,
                    }}
                  >
                    {titulo.length > 60 ? titulo.slice(0, 57) + '...' : titulo}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* FOOTER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 22,
            opacity: 0.75,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          <div style={{ display: 'flex' }}>Distinto Agencia · Grilla semanal</div>
          <div style={{ display: 'flex' }}>distinto-app.vercel.app</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1620 }
  )
}
