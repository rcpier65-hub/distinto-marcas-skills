// app/lib/grilla/generate-png.tsx
// Wrapper que hace fetch al endpoint /api/render-grilla (Node runtime + Chromium).
//
// El endpoint corre Chromium real para renderizar la plantilla HTML de cada marca
// pixel-perfect. Pasamos: slug, semana, y publicaciones (JSON serializado).

import type { GrillaPublicacion } from '@/lib/integrations/notion'

export type GrillaData = {
  marca: { slug: string; nombre: string; emoji: string; color: string; logo_url?: string | null }
  semanaInicio: string
  semanaFin: string
  publicaciones: GrillaPublicacion[]
}

function getBaseUrl(): string {
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

  // Adaptar publicaciones al shape esperado por el endpoint
  const pubs = data.publicaciones.map((p) => ({
    fecha: p.fecha,
    titulo: p.titulo,
    plataformas: p.plataformas.join(' · '),
    tipo: p.tipo_contenido.join(' · '),
  }))

  const params = new URLSearchParams({
    slug: data.marca.slug,
    inicio: data.semanaInicio,
    fin: data.semanaFin,
    pubs: JSON.stringify(pubs),
  })
  // Logo URL custom (Drive, Imgur, etc.) si la marca tiene uno configurado.
  // El endpoint normaliza URLs de Drive automáticamente.
  if (data.marca.logo_url) {
    params.set('logo', data.marca.logo_url)
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
