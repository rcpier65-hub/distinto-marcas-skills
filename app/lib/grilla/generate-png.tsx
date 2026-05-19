// app/lib/grilla/generate-png.tsx
// Wrapper que hace fetch al endpoint edge /api/render-grilla.
// Razón arquitectónica: @vercel/og REQUIERE edge runtime, pero Server Actions y
// Route Handlers default corren en nodejs runtime. La solución estándar es separar
// el render a un endpoint edge dedicado y hacer fetch desde nodejs.

export type GrillaData = {
  marca: { nombre: string; emoji: string; color: string }
  semanaInicio: string
  semanaFin: string
  publicaciones: number
  titulosPorDia?: string[]  // opcional: títulos para mostrar en cada card (lun-vie)
}

function getBaseUrl(): string {
  // En Vercel production hay VERCEL_URL; en local usar NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  return 'http://localhost:3000'
}

export async function generateGrillaPNG(data: GrillaData): Promise<Buffer> {
  const baseUrl = getBaseUrl()
  const params = new URLSearchParams({
    nombre: data.marca.nombre,
    emoji: data.marca.emoji,
    color: data.marca.color,
    inicio: data.semanaInicio,
    fin: data.semanaFin,
    pubs: String(data.publicaciones),
  })

  // Títulos por día (lun-vie) si se proveen
  if (data.titulosPorDia) {
    data.titulosPorDia.slice(0, 5).forEach((t, i) => {
      if (t) params.set(`dia${i + 1}`, t)
    })
  }

  const url = `${baseUrl}/api/render-grilla?${params.toString()}`
  const secret = process.env.CRON_SECRET
  if (!secret) {
    throw new Error('CRON_SECRET no configurado — necesario para auth interna entre runtimes')
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`render-grilla returned ${response.status}: ${text.slice(0, 200)}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
