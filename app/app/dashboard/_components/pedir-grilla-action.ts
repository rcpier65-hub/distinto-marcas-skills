// app/app/dashboard/_components/pedir-grilla-action.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/auth/get-user'
import { generateGrillaPNG } from '@/lib/grilla/generate-png'
import { uploadGrillaPNG } from '@/lib/grilla/upload-png'
import { buildCaptionDefault } from '@/lib/grilla/build-caption'
import { queryGrillaForBrand, buildTitulosPorDia, type GrillaPublicacion } from '@/lib/integrations/notion'
import { revalidatePath } from 'next/cache'

type PedirGrillaResult =
  | { ok: true; grilla_id: string; marca_slug: string }
  | { ok: false; error: string }

/**
 * Genera la grilla COMPLETA en una sola transacción:
 * 1. INSERT en grillas_pendientes
 * 2. Lee publicaciones reales de Notion (filtradas por proyecto + Grilla de FIT)
 * 3. Genera PNG con @vercel/og usando los títulos reales por día
 * 4. Sube PNG a Supabase Storage
 * 5. Genera caption con bloque por publicación (real, no template)
 * 6. UPDATE con png_url + caption + estado=esperando_aprobacion
 */
export async function pedirGrilla(marcaSlug: string): Promise<PedirGrillaResult> {
  const user = await requireUser()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Buscar marca (incluyendo notion_proyecto_id)
  const { data: marca, error: marcaError } = await supabase
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex, decisor_nombre, decisor_tratamiento, tono_voz, notion_proyecto_id')
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

  // 4. Fetch Notion (puede fallar — manejamos cada caso)
  let publicaciones: GrillaPublicacion[] = []
  let notionErrorMsg: string | null = null

  if (!marca.notion_proyecto_id) {
    notionErrorMsg = `Marca '${marca.slug}' no tiene notion_proyecto_id configurado en BD.`
  } else if (!process.env.NOTION_TOKEN || !process.env.NOTION_GRILLA_DB_ID) {
    notionErrorMsg = 'NOTION_TOKEN o NOTION_GRILLA_DB_ID no configurados en Vercel.'
  } else {
    try {
      publicaciones = await queryGrillaForBrand({
        notionProyectoId: marca.notion_proyecto_id,
        semanaInicio: semana_inicio,
        semanaFin: semana_fin,
      })
    } catch (e) {
      notionErrorMsg = `Error consultando Notion: ${(e as Error).message}`
      console.error('[pedirGrilla] Notion error:', e)
    }
  }

  if (notionErrorMsg) {
    // No bloqueamos: dejamos que Pedro vea el preview con error visible.
    // Pero marcamos la grilla con error para que el dashboard lo muestre.
    console.warn('[pedirGrilla]', notionErrorMsg)
  }

  if (!notionErrorMsg && publicaciones.length === 0) {
    notionErrorMsg = 'Notion devolvió 0 publicaciones para esta semana. Revisá que las páginas tengan "Grilla de FIT" en el rango y proyecto correcto.'
    console.warn('[pedirGrilla]', notionErrorMsg)
  }

  // 5. Construir títulos por día (lun-vie) para PNG
  const titulosPorDia = buildTitulosPorDia(publicaciones, semana_inicio)
  const totalPubs = publicaciones.length

  // 6. Generar PNG
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
      publicaciones: totalPubs,
      titulosPorDia,
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

  // 7. Generar caption usando publicaciones reales
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
    publicaciones,
  })

  // 8. UPDATE con todo (y error si lo hubo)
  await service
    .from('grillas_pendientes')
    .update({
      estado: 'esperando_aprobacion',
      procesada_at: new Date().toISOString(),
      png_url: pngUrl,
      png_storage_path: pngPath,
      caption,
      error: notionErrorMsg,
      publicaciones_count: totalPubs,
      notion_grilla_ids: publicaciones.map((p) => p.notion_id),
    })
    .eq('id', grillaId)

  // 9. Log auditoría
  await service.from('aprobaciones').insert({
    grilla_id: grillaId,
    usuario_id: user.id,
    accion: 'solicitar',
    via: 'dashboard',
    comentario: `Grilla generada via dashboard. ${totalPubs} publicaciones de Notion.`,
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
