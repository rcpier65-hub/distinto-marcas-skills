// app/app/grilla/[slug]/_actions.ts
// Server actions para la vista de grilla semanal.
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { generateGrillaPNG } from '@/lib/grilla/generate-png'
import { uploadGrillaPNG } from '@/lib/grilla/upload-png'
import type { GrillaPublicacion } from '@/lib/integrations/notion'

type Result = { ok: true; pngUrl: string } | { ok: false; error: string }

/**
 * Genera/regenera la grilla PNG para una marca + semana.
 * Lee publicaciones de NUESTRA BD (no Notion), genera PNG con plantilla,
 * sube a Supabase Storage, upserta el registro en grillas_pendientes.
 */
export async function generarGrillaParaSemana(
  slug: string,
  semanaInicio: string,
  semanaFin: string,
): Promise<Result> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Marca
  const { data: marca } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex, logo_url')
    .eq('slug', slug)
    .eq('activa', true)
    .maybeSingle()
  if (!marca) return { ok: false, error: 'Marca no encontrada' }

  // 2. Publicaciones de la semana
  const { data: pubsRaw } = await service
    .from('publicaciones')
    .select('id, nombre, fecha_publicacion, plataformas, tipo_contenido')
    .eq('marca_id', marca.id)
    .gte('fecha_publicacion', semanaInicio)
    .lte('fecha_publicacion', semanaFin)
    .order('fecha_publicacion', { ascending: true })

  type PubRow = {
    id: string
    nombre: string
    fecha_publicacion: string | null
    plataformas: string[] | null
    tipo_contenido: string[] | null
  }
  const publicaciones: GrillaPublicacion[] = (pubsRaw ?? [])
    .filter((p: PubRow) => p.fecha_publicacion)
    .map((p: PubRow) => ({
      notion_id: p.id,
      titulo: p.nombre,
      fecha: p.fecha_publicacion!,
      plataformas: p.plataformas ?? [],
      tipo_contenido: p.tipo_contenido ?? [],
      estado: null,
      url: '',
    }))

  // 3. Render PNG con Chromium
  let pngBuffer: Buffer
  try {
    pngBuffer = await generateGrillaPNG({
      marca: {
        slug: marca.slug,
        nombre: marca.nombre,
        emoji: marca.emoji_marca ?? '📊',
        color: marca.color_primario_hex ?? '#283B6F',
        logo_url: marca.logo_url,
      },
      semanaInicio,
      semanaFin,
      publicaciones,
    })
  } catch (e) {
    return { ok: false, error: `Render failed: ${(e as Error).message}` }
  }

  // 4. Upload a Storage
  const upload = await uploadGrillaPNG(pngBuffer, slug, semanaInicio)
  if (!upload.ok) return { ok: false, error: `Upload failed: ${upload.error}` }

  // 5. Upsert en grillas_pendientes
  const { data: existing } = await service
    .from('grillas_pendientes')
    .select('id')
    .eq('marca_id', marca.id)
    .eq('semana_inicio', semanaInicio)
    .maybeSingle()

  if (existing) {
    await service
      .from('grillas_pendientes')
      .update({
        png_url: upload.url,
        png_storage_path: upload.path,
        estado: 'esperando_aprobacion',
        procesada_at: new Date().toISOString(),
        publicaciones_count: publicaciones.length,
        notion_grilla_ids: publicaciones.map((p) => p.notion_id),
        error: null,
        pedida_por: user.id,
      })
      .eq('id', existing.id)
  } else {
    await service.from('grillas_pendientes').insert({
      marca_id: marca.id,
      semana_inicio: semanaInicio,
      semana_fin: semanaFin,
      estado: 'esperando_aprobacion',
      png_url: upload.url,
      png_storage_path: upload.path,
      publicaciones_count: publicaciones.length,
      notion_grilla_ids: publicaciones.map((p) => p.notion_id),
      procesada_at: new Date().toISOString(),
      pedida_por: user.id,
    })
  }

  revalidatePath(`/grilla/${slug}`)
  revalidatePath(`/marca/${slug}`)
  revalidatePath('/dashboard')
  return { ok: true, pngUrl: upload.url }
}
