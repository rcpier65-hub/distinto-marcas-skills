// app/lib/grilla/upload-png.ts
import { createServiceClient } from '@/lib/supabase/service'

export async function uploadGrillaPNG(
  pngBuffer: Buffer,
  marcaSlug: string,
  semanaInicio: string
): Promise<{ ok: true; url: string; path: string } | { ok: false; error: string }> {
  const supabase = createServiceClient()
  const path = `${marcaSlug}/${semanaInicio}.png`

  const { error: uploadError } = await supabase.storage
    .from('grillas-png')
    .upload(path, pngBuffer, {
      contentType: 'image/png',
      upsert: true,
    })

  if (uploadError) {
    return { ok: false, error: uploadError.message }
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from('grillas-png')
    .createSignedUrl(path, 60 * 60 * 24 * 7)

  if (signedError || !signedData) {
    return { ok: false, error: signedError?.message ?? 'No signed URL' }
  }

  return { ok: true, url: signedData.signedUrl, path }
}
