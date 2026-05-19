// app/app/dashboard/_components/pedir-grilla-action.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/auth/get-user'
import { generateGrillaPNG } from '@/lib/grilla/generate-png'
import { uploadGrillaPNG } from '@/lib/grilla/upload-png'
import { buildCaptionDefault } from '@/lib/grilla/build-caption'
import { revalidatePath } from 'next/cache'

type PedirGrillaResult =
  | { ok: true; grilla_id: string; marca_slug: string }
  | { ok: false; error: string }

/**
 * Genera la grilla COMPLETA en una sola transacción:
 * 1. INSERT en grillas_pendientes
 * 2. Genera PNG con @vercel/og
 * 3. Sube PNG a Supabase Storage
 * 4. Genera caption sugerido (editable después)
 * 5. UPDATE con png_url + caption + estado=esperando_aprobacion
 *
 * Devuelve el marca_slug para que el cliente pueda redirigir a /marca/[slug]
 */
export async function pedirGrilla(marcaSlug: string): Promise<PedirGrillaResult> {
  const user = await requireUser()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Buscar marca
  const { data: marca, error: marcaError } = await supabase
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex, decisor_nombre, decisor_tratamiento, tono_voz')
    .eq('slug', marcaSlug)
    .eq('activa', true)
    .single()

  if (marcaError || !marca) {
    return { ok: false, error: `Marca '${marcaSlug}' no encontrada o inactiva` }
  }

  // 2. Calcular semana
  const { semana_inicio, semana_fin } = calcularSemanaActual()

  // 3. INSERT (idempotente: si ya hay una para esta marca+semana, la actualizamos)
  let grillaId: string
  const { data: grillaInsert, error: insertError } = await supabase
    .from('grillas_pendientes')
    .insert({
      marca_id: marca.id,
      semana_inicio,
      semana_fin,
      estado: 'procesando',
      pedida_por: user.id,
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      // Ya existe — reusar y volver a procesar
      const { data: existing } = await supabase
        .from('grillas_pendientes')
        .select('id')
        .eq('marca_id', marca.id)
        .eq('semana_inicio', semana_inicio)
        .single()
      if (!existing) {
        return { ok: false, error: 'No pudimos encontrar la grilla existente' }
      }
      grillaId = existing.id
      // Reset estado a procesando
      await service
        .from('grillas_pendientes')
        .update({ estado: 'procesando', error: null })
        .eq('id', grillaId)
    } else {
      console.error('[pedirGrilla] insert error:', insertError)
      return { ok: false, error: 'No pudimos crear la grilla. Probá de nuevo.' }
    }
  } else {
    grillaId = grillaInsert!.id
  }

  // 4. Generar PNG
  let pngUrl: string | null = null
  let pngPath: string | null = null
  try {
    const pngBuffer = await generateGrillaPNG({
      marca: {
        nombre: marca.nombre,
        emoji: marca.emoji_marca ?? '📊',
        color: marca.color_primario_hex ?? '#283B6F',
      },
      semanaInicio: semana_inicio,
      semanaFin: semana_fin,
      publicaciones: 5,  // TODO Plan 7: leer de Notion
    })
    const upload = await uploadGrillaPNG(pngBuffer, marca.slug, semana_inicio)
    if (upload.ok) {
      pngUrl = upload.url
      pngPath = upload.path
    } else {
      console.error('[pedirGrilla] PNG upload failed:', upload.error)
    }
  } catch (e) {
    console.error('[pedirGrilla] PNG generation failed:', e)
  }

  // 5. Generar caption
  const caption = buildCaptionDefault({
    marca: {
      nombre: marca.nombre,
      decisor_tratamiento: marca.decisor_tratamiento,
      decisor_nombre: marca.decisor_nombre,
      emoji_marca: marca.emoji_marca,
      tono_voz: marca.tono_voz,
    },
    semana_inicio,
    semana_fin,
  })

  // 6. UPDATE con todo
  await service
    .from('grillas_pendientes')
    .update({
      estado: 'esperando_aprobacion',
      procesada_at: new Date().toISOString(),
      png_url: pngUrl,
      png_storage_path: pngPath,
      caption,
    })
    .eq('id', grillaId)

  // 7. Log auditoría
  await service.from('aprobaciones').insert({
    grilla_id: grillaId,
    usuario_id: user.id,
    accion: 'solicitar',
    via: 'dashboard',
    comentario: 'Grilla generada via dashboard',
  })

  revalidatePath('/dashboard')
  revalidatePath(`/marca/${marca.slug}`)
  return { ok: true, grilla_id: grillaId, marca_slug: marca.slug }
}

function calcularSemanaActual(): { semana_inicio: string; semana_fin: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    semana_inicio: monday.toISOString().slice(0, 10),
    semana_fin: sunday.toISOString().slice(0, 10),
  }
}
