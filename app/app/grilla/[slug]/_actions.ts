// app/app/grilla/[slug]/_actions.ts
// Server actions para la vista de grilla semanal.
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { generateGrillaPNG } from '@/lib/grilla/generate-png'
import { uploadGrillaPNG } from '@/lib/grilla/upload-png'
import { sendWhatsAppImageToGroup, sendWhatsAppImageToChatId } from '@/lib/integrations/rubi'
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

/**
 * Envía la grilla al grupo WhatsApp configurado en marca.grupo_whatsapp_alias
 * o marca.grupo_whatsapp_nombre. Genera el PNG JUST-IN-TIME (no usa cache).
 *
 * Flujo:
 *  1. Resolver grupo (alias o nombre)
 *     - modo='real' → grupo del cliente (marca.grupo_whatsapp_*)
 *     - modo='test' → grupo de testing interno (env WHATSAPP_TEST_GROUP_NAME, default "New team")
 *  2. Regenerar PNG fresh con publicaciones actuales
 *  3. Upload Storage (URL signed accesible públicamente)
 *  4. Llamar Rubi whatsapp_send_image con la URL + caption
 *  5. Si modo='real' → update grilla a estado='enviada' + log aprobación
 *     Si modo='test' → NO persistir (no contaminar estado de grilla del cliente)
 */
type EnviarResult =
  | { ok: true; messageId?: string; grupo: string; modo: 'real' | 'test' }
  | { ok: false; error: string }

export async function enviarGrillaAlGrupo(
  slug: string,
  semanaInicio: string,
  semanaFin: string,
  caption: string,
  modo: 'real' | 'test' = 'real',
): Promise<EnviarResult> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // 1. Marca + grupo — SELECT tolerante a Migration 015 no aplicada.
  // Si las columnas nuevas no existen, fallback al SELECT legacy. Los campos
  // nuevos quedan undefined → defaults: envio_real_habilitado=false (lock ON),
  // chatId=null (cae a alias/nombre), mention_number=null (sin @ prefix).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let marca: any = null
  {
    const r1 = await service
      .from('marcas')
      .select(
        'id, slug, nombre, emoji_marca, color_primario_hex, logo_url, ' +
        'grupo_whatsapp_nombre, grupo_whatsapp_alias, grupo_whatsapp_chatid, ' +
        'mention_number, envio_real_habilitado'
      )
      .eq('slug', slug)
      .eq('activa', true)
      .maybeSingle()
    if (r1.error && (r1.error.message ?? '').includes('does not exist')) {
      const r2 = await service
        .from('marcas')
        .select(
          'id, slug, nombre, emoji_marca, color_primario_hex, logo_url, ' +
          'grupo_whatsapp_nombre, grupo_whatsapp_alias'
        )
        .eq('slug', slug)
        .eq('activa', true)
        .maybeSingle()
      marca = r2.data
    } else {
      marca = r1.data
    }
  }
  if (!marca) return { ok: false, error: 'Marca no encontrada' }

  // SAFETY LOCK — en modo real, exigir envio_real_habilitado=true
  if (modo === 'real' && !marca.envio_real_habilitado) {
    return {
      ok: false,
      error: `Envío real DESHABILITADO para '${marca.nombre}'. Activá el toggle en Settings o usá el botón 🧪 Probar.`,
    }
  }

  // Resolución del grupo destino según el modo
  // - test: chatId hardcoded de "New team" (independiente de config de marca).
  // - real: prioridad chatId > alias > nombre (chatId es bullet-proof).
  let grupo: string | null = null  // descriptor humano para logs/UI
  let realChatId: string | null = null  // chatId directo si está configurado
  let testChatId: string | null = null
  let byAlias = false
  if (modo === 'test') {
    testChatId = process.env.WHATSAPP_TEST_GROUP_CHATID ?? '120363427129444398@g.us'
    grupo = 'New team (test)'
  } else {
    realChatId = marca.grupo_whatsapp_chatid as string | null
    const grupoAlias = marca.grupo_whatsapp_alias as string | null
    const grupoNombre = marca.grupo_whatsapp_nombre as string | null
    grupo = realChatId ?? grupoAlias ?? grupoNombre
    byAlias = !realChatId && !!grupoAlias
    if (!grupo) {
      return {
        ok: false,
        error: `Marca '${marca.slug}' no tiene grupo_whatsapp configurado. Configurá en Settings.`,
      }
    }
  }

  // 2. Publicaciones actualizadas
  const { data: pubsRaw } = await service
    .from('publicaciones')
    .select('id, nombre, fecha_publicacion, plataformas, tipo_contenido')
    .eq('marca_id', marca.id)
    .gte('fecha_publicacion', semanaInicio)
    .lte('fecha_publicacion', semanaFin)
    .order('fecha_publicacion', { ascending: true })

  type PubRow = {
    id: string; nombre: string; fecha_publicacion: string | null
    plataformas: string[] | null; tipo_contenido: string[] | null
  }
  const publicaciones: GrillaPublicacion[] = (pubsRaw ?? [])
    .filter((p: PubRow) => p.fecha_publicacion)
    .map((p: PubRow) => ({
      notion_id: p.id, titulo: p.nombre, fecha: p.fecha_publicacion!,
      plataformas: p.plataformas ?? [], tipo_contenido: p.tipo_contenido ?? [],
      estado: null, url: '',
    }))

  // 3. PNG just-in-time
  let pngBuffer: Buffer
  try {
    pngBuffer = await generateGrillaPNG({
      marca: {
        slug: marca.slug, nombre: marca.nombre,
        emoji: marca.emoji_marca ?? '📊',
        color: marca.color_primario_hex ?? '#283B6F',
        logo_url: marca.logo_url,
      },
      semanaInicio, semanaFin, publicaciones,
    })
  } catch (e) {
    return { ok: false, error: `Render failed: ${(e as Error).message}` }
  }

  // 4. Upload Storage (URL signed para que Rubi pueda descargar)
  const upload = await uploadGrillaPNG(pngBuffer, slug, semanaInicio)
  if (!upload.ok) return { ok: false, error: `Upload: ${upload.error}` }

  // 5. Envío vía Rubi MCP
  // - test: usa chatId hardcoded "New team" + caption con mention a Pedro.
  // - real: usa chatId de marca (preferred) o alias/group_name como fallback.
  //   Si marca.mention_number está set, antepone @<num> al caption para que
  //   el cliente reciba un mensaje "tagueado" al decisor (formato verificado
  //   con Manrique: el @<num> en caption se renderiza como mention clickeable).
  let rubiResult
  if (modo === 'test' && testChatId) {
    const testNumber = process.env.WHATSAPP_TEST_MENTION_NUMBER ?? '51983852191'
    const captionTest = [
      `🧪 *PRUEBA — Grilla ${marca.nombre}*`,
      `@${testNumber} esto es cómo le llegaría al cliente. NO se ha enviado al grupo real.`,
      ``,
      caption,
    ].join('\n')
    rubiResult = await sendWhatsAppImageToChatId(testChatId, upload.url, captionTest)
  } else {
    const mentionNum = marca.mention_number as string | null
    const captionReal = mentionNum ? `@${mentionNum} ${caption}` : caption
    if (realChatId) {
      // Path bullet-proof — chatId directo
      rubiResult = await sendWhatsAppImageToChatId(realChatId, upload.url, captionReal)
    } else {
      // Fallback legacy — alias o group_name (sigue funcionando para marcas
      // viejas sin chatId configurado, ej. Manrique antes de Migration 015)
      rubiResult = await sendWhatsAppImageToGroup(grupo!, upload.url, captionReal, byAlias)
    }
  }
  if (!rubiResult.ok) {
    return { ok: false, error: `WhatsApp: ${rubiResult.error}` }
  }

  // 6. Persistencia — SOLO en modo real.
  // En modo test no marcamos la grilla del cliente como "enviada" — sería falso
  // y confundiría el estado en dashboard. Tampoco loggeamos aprobación.
  if (modo === 'real') {
    const { data: existing } = await service
      .from('grillas_pendientes')
      .select('id')
      .eq('marca_id', marca.id)
      .eq('semana_inicio', semanaInicio)
      .maybeSingle()

    const enviadaAt = new Date().toISOString()
    if (existing) {
      await service.from('grillas_pendientes').update({
        png_url: upload.url, png_storage_path: upload.path, caption,
        estado: 'enviada', enviada_at: enviadaAt,
        publicaciones_count: publicaciones.length,
        notion_grilla_ids: publicaciones.map((p) => p.notion_id),
      }).eq('id', existing.id)
    } else {
      await service.from('grillas_pendientes').insert({
        marca_id: marca.id, semana_inicio: semanaInicio, semana_fin: semanaFin,
        png_url: upload.url, png_storage_path: upload.path, caption,
        estado: 'enviada', enviada_at: enviadaAt,
        pedida_por: user.id,
        publicaciones_count: publicaciones.length,
        notion_grilla_ids: publicaciones.map((p) => p.notion_id),
      })
    }

    // Log en aprobaciones
    await service.from('aprobaciones').insert({
      grilla_id: existing?.id ?? null,
      usuario_id: user.id, accion: 'aprobar', via: 'dashboard',
      comentario: `Enviada a grupo "${grupo}" via Rubi`,
    })

    revalidatePath(`/grilla/${slug}`)
    revalidatePath(`/marca/${slug}`)
    revalidatePath('/dashboard')
  }

  return { ok: true, grupo, modo }
}
