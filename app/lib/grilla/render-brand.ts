import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizeLogoUrl } from '@/lib/marcas/branding'
import { getTheme } from './themes'

type GrillaBrand = { nombre: string; color_primario_hex: string | null; logo_url: string | null }

/** Ambos renders comparten marca y recursos; no usan el host interno de Next. */
export async function loadGrillaBrand(slug: string, logoOverride: string | null) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Marca inválida')
  const { data: brand, error } = await createServiceClient().from('marcas')
    .select('nombre,color_primario_hex,logo_url').eq('slug', slug).eq('activa', true)
    .returns<GrillaBrand[]>().maybeSingle()
  if (error) throw new Error('No se pudo leer la identidad de la marca')
  if (!brand) throw new Error('Marca no encontrada')

  const custom = normalizeLogoUrl(logoOverride || brand.logo_url)
  const logoUrl = custom && /^https?:\/\//i.test(custom) ? custom : await localLogo(slug)
  return {
    theme: getTheme(slug, brand), logoUrl,
    // Incrustar los logos locales evita mixed content, redirecciones y recursos
    // inexistentes cuando Chromium renderiza detrás de Traefik.
    agencyLogoUrl: await imageData('agencia/distinto-horizontal.svg', 'image/svg+xml'),
    assetBaseUrl: (process.env.NEXT_PUBLIC_APP_URL || 'https://app.distintostudio.com').replace(/\/$/, ''),
  }
}

async function imageData(file: string, mime: string): Promise<string> {
  const bytes = await readFile(path.join(process.cwd(), 'public', file))
  return `data:${mime};base64,${bytes.toString('base64')}`
}

async function localLogo(slug: string): Promise<string | null> {
  for (const [ext, mime] of [['svg', 'image/svg+xml'], ['png', 'image/png'], ['webp', 'image/webp']]) {
    try { return await imageData(`marcas/${slug}/logo.${ext}`, mime) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
  return null
}

export async function canRenderGrilla(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') === `Bearer ${secret}`) return true
  const { getUser } = await import('@/lib/auth/get-user')
  return Boolean(await getUser())
}
