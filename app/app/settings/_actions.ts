// app/app/settings/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Actualiza el logo_url de una marca.
 * Pedro pega aquí la URL pública del logo (Drive, Imgur, CDN).
 * Drive URLs se normalizan automáticamente en el endpoint render-grilla.
 */
export async function updateMarcaLogoUrl(
  slug: string,
  logoUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const value = logoUrl.trim() || null
  const { error } = await service
    .from('marcas')
    .update({ logo_url: value })
    .eq('slug', slug)

  if (error) {
    console.error('[updateMarcaLogoUrl] error:', error)
    return { ok: false, error: error.message }
  }

  revalidatePath('/settings')
  return { ok: true }
}
