// app/app/marca/[slug]/_actions.ts
'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/auth/get-user'
import { sendWhatsAppToGroup } from '@/lib/integrations/rubi'
import { generateGrillaPNG } from '@/lib/grilla/generate-png'
import { uploadGrillaPNG } from '@/lib/grilla/upload-png'
import { revalidatePath } from 'next/cache'

export type AprobarResult =
  | { ok: true; mensaje_id: string | null; grupo: string }
  | { ok: false; error: string }

/**
 * Aprueba la grilla y la envía al grupo del cliente via Rubi WhatsApp.
 * Acepta el caption editado por el usuario (puede haber cambiado en el preview).
 */
export async function aprobarYEnviar(
  grillaId: string,
  captionEditado: string
): Promise<AprobarResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  // 1. Cargar grilla + marca
  const { data: grilla } = await supabase
    .from('grillas_pendientes')
    .select(`
      id, marca_id, png_url,
      marca:marcas(id, slug, nombre, emoji_marca, grupo_whatsapp_nombre, grupo_whatsapp_alias)
    `)
    .eq('id', grillaId)
    .maybeSingle()

  if (!grilla) {
    return { ok: false, error: 'Grilla no encontrada' }
  }

  const marca = Array.isArray(grilla.marca) ? grilla.marca[0] : grilla.marca
  if (!marca) {
    return { ok: false, error: 'Marca no encontrada' }
  }

  // 2. Validar que la marca tiene grupo configurado
  const grupo = marca.grupo_whatsapp_alias ?? marca.grupo_whatsapp_nombre
  if (!grupo) {
    return {
      ok: false,
      error: `${marca.nombre} no tiene grupo WhatsApp configurado. Configurá en Settings antes de aprobar.`,
    }
  }

  // 3. Enviar al grupo via Rubi
  const sendResult = await sendWhatsAppToGroup(
    grupo,
    captionEditado,
    !!marca.grupo_whatsapp_alias
  )

  if (!sendResult.ok) {
    return { ok: false, error: `Rubi devolvió error: ${sendResult.error}` }
  }

  // 4. Extraer messageId si está en el resultado de Rubi
  let mensajeId: string | null = null
  try {
    const data = sendResult.data as { content?: Array<{ text?: string }> }
    const text = data?.content?.[0]?.text ?? ''
    const match = text.match(/messageId=([A-Za-z0-9]+)/)
    if (match) mensajeId = match[1]
  } catch {
    // ignorar parse error
  }

  // 5. Actualizar estado a enviada
  await supabase
    .from('grillas_pendientes')
    .update({
      estado: 'enviada',
      enviada_at: new Date().toISOString(),
      caption: captionEditado,
      mensaje_id_cliente: mensajeId,
      aprobada_at: new Date().toISOString(),
    })
    .eq('id', grillaId)

  // 6. Log envío
  await supabase.from('envios').insert({
    grilla_id: grillaId,
    marca_id: marca.id,
    tipo: 'whatsapp_grupo',
    destino: grupo,
    caption: captionEditado,
    mensaje_id: mensajeId,
    success: true,
  })

  // 7. Log aprobación
  await supabase.from('aprobaciones').insert({
    grilla_id: grillaId,
    usuario_id: user.id,
    accion: 'aprobar',
    via: 'dashboard',
    comentario: 'Aprobado y enviado al grupo desde preview web',
  })

  revalidatePath(`/marca/${marca.slug}`)
  revalidatePath('/dashboard')
  return { ok: true, mensaje_id: mensajeId, grupo }
}

/**
 * Cancela una grilla en esperando_aprobacion.
 */
export async function cancelarGrilla(grillaId: string, marcaSlug: string): Promise<void> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  await supabase
    .from('grillas_pendientes')
    .update({ estado: 'cancelada', cancelada_at: new Date().toISOString() })
    .eq('id', grillaId)

  await supabase.from('aprobaciones').insert({
    grilla_id: grillaId,
    usuario_id: user.id,
    accion: 'rechazar',
    via: 'dashboard',
    comentario: 'Cancelada desde preview web',
  })

  revalidatePath(`/marca/${marcaSlug}`)
  revalidatePath('/dashboard')
}

/**
 * Regenera el PNG (útil si el diseño no convence).
 */
export async function regenerarPng(grillaId: string, marcaSlug: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  const { data: grilla } = await supabase
    .from('grillas_pendientes')
    .select(`
      id, semana_inicio, semana_fin,
      marca:marcas(slug, nombre, emoji_marca, color_primario_hex)
    `)
    .eq('id', grillaId)
    .maybeSingle()

  if (!grilla) return
  const marca = Array.isArray(grilla.marca) ? grilla.marca[0] : grilla.marca
  if (!marca) return

  // Re-query Notion para obtener publicaciones actualizadas
  const { queryGrillaForBrand } = await import('@/lib/integrations/notion')
  let publicaciones: import('@/lib/integrations/notion').GrillaPublicacion[] = []
  // marca puede no traer notion_proyecto_id desde el JOIN; lo re-fetcheamos
  const { data: marcaFull } = await supabase
    .from('marcas')
    .select('notion_proyecto_id')
    .eq('slug', marca.slug)
    .single()
  if (marcaFull?.notion_proyecto_id && process.env.NOTION_TOKEN && process.env.NOTION_GRILLA_DB_ID) {
    try {
      publicaciones = await queryGrillaForBrand({
        notionProyectoId: marcaFull.notion_proyecto_id,
        semanaInicio: grilla.semana_inicio,
        semanaFin: grilla.semana_fin,
      })
    } catch (e) {
      console.error('[regenerarPng] Notion error:', e)
    }
  }

  try {
    const pngBuffer = await generateGrillaPNG({
      marca: {
        slug: marca.slug,
        nombre: marca.nombre,
        emoji: marca.emoji_marca ?? '📊',
        color: marca.color_primario_hex ?? '#283B6F',
      },
      semanaInicio: grilla.semana_inicio,
      semanaFin: grilla.semana_fin,
      publicaciones,
    })
    const upload = await uploadGrillaPNG(pngBuffer, marca.slug, grilla.semana_inicio)
    if (upload.ok) {
      await supabase
        .from('grillas_pendientes')
        .update({ png_url: upload.url, png_storage_path: upload.path })
        .eq('id', grillaId)
    }
  } catch (e) {
    console.error('[regenerarPng] error:', e)
  }

  revalidatePath(`/marca/${marcaSlug}`)
}
