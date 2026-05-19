// app/lib/grilla/generate-png.tsx
import { ImageResponse } from '@vercel/og'

export type GrillaData = {
  marca: { nombre: string; emoji: string; color: string }
  semanaInicio: string
  semanaFin: string
  publicaciones: number
}

export async function generateGrillaPNG(data: GrillaData): Promise<Buffer> {
  const img = new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1620px',
          background: data.marca.color,
          padding: '80px',
          display: 'flex',
          flexDirection: 'column',
          color: 'white',
          fontFamily: 'system-ui',
        }}
      >
        <div style={{ fontSize: 200, marginBottom: 40 }}>{data.marca.emoji}</div>
        <div style={{ fontSize: 96, fontWeight: 800 }}>{data.marca.nombre}</div>
        <div style={{ fontSize: 72, marginTop: 60, opacity: 0.9 }}>¿Qué se viene?</div>
        <div style={{ fontSize: 56, marginTop: 30, opacity: 0.8 }}>
          Semana {data.semanaInicio} → {data.semanaFin}
        </div>
        <div style={{ fontSize: 48, marginTop: 80, opacity: 0.7 }}>
          {data.publicaciones} publicaciones programadas
        </div>
        <div style={{ marginTop: 'auto', fontSize: 32, opacity: 0.6 }}>
          Generado por Distinto App
        </div>
      </div>
    ),
    { width: 1080, height: 1620 }
  )

  const arrayBuffer = await img.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
