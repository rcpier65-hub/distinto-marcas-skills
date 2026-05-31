// app/app/api/cron/morning-fetch/route.ts
//
// CRON DIARIO 8AM — orquesta el morning digest de comentarios.
//
// Flujo:
//   1. Para cada marca con metricool_blog_id configurado:
//      a. Fetch comentarios pendientes de Metricool (3 redes)
//      b. Upsert en comentarios_inbox con status='pending', sin sugerencia
//      c. Trackear cuántos nuevos comentarios hay por marca
//   2. Para cada marca con comentarios pendientes:
//      a. Mandar WhatsApp al grupo del cliente:
//         "Buen día Dr. Manrique 👋 Hay 5 comentarios nuevos para revisar
//          en https://distinto-app.vercel.app/comentarios?marca=manrique"
//   3. Mandar resumen consolidado al grupo interno de Pedro:
//      "Morning digest: 9 marcas, 27 comentarios pendientes."
//
// La GENERACIÓN de respuestas IA NO se hace acá — eso lo hace una Routine
// externa que llama GET /api/v1/comentarios/pendientes después de este cron.
//
// Auth: Vercel cron manda Authorization: Bearer <CRON_SECRET> automáticamente
// si está configurado en vercel.json.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { listComentarios } from '@/lib/integrations/metricool'
import { clasificarComentario } from '@/lib/comentarios/clasificador'
import { sendWhatsAppWithMentions } from '@/lib/integrations/rubi'
import type { ComentarioNetwork } from '@/lib/types/database'

export const dynamic = 'force-dynamic'
export const maxDuration = 300  /* hasta 5 min: 9 marcas × 3 redes = ~27 calls Metricool */

const NETWORKS: ComentarioNetwork[] = ['instagram', 'facebook', 'tiktok']
// Destino del digest interno — preferimos chatId (no depende de nombres que cambien)
const PEDRO_INTERNAL_CHATID = process.env.WHATSAPP_INTERNAL_GROUP_CHATID ?? null
const PEDRO_INTERNAL_GROUP_NAME = process.env.WHATSAPP_INTERNAL_GROUP_ALIAS ?? 'New team'
// Feature flag — por defecto NO mandamos nada al grupo del cliente.
// Activar con MORNING_NOTIFY_CLIENTS=true cuando Pedro lo quiera.
const NOTIFY_CLIENT_GROUPS = process.env.MORNING_NOTIFY_CLIENTS === 'true'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://distinto-app.vercel.app'

type FetchSummary = {
  marca_slug: string
  marca_nombre: string
  emoji: string | null
  nuevos: number          /* comentarios nuevos esta corrida */
  total_pendientes: number /* total pending en BD post-corrida */
  errores: string[]
}

export async function GET(request: Request) {
  // Auth — Vercel cron pasa este header automáticamente
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const startTime = Date.now()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // ----- 1. Listar marcas activas con metricool_blog_id -----
  type MarcaRow = {
    id: string
    slug: string
    nombre: string
    emoji_marca: string | null
    metricool_blog_id: number | null
    decisor_tratamiento: string | null
    decisor_nombre: string | null
    grupo_whatsapp_chatid: string | null
    grupo_whatsapp_nombre: string | null
    grupo_whatsapp_alias: string | null
    mention_number: string | null
  }
  const { data: marcasRaw, error: marcasErr } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, metricool_blog_id, decisor_tratamiento, decisor_nombre, grupo_whatsapp_chatid, grupo_whatsapp_nombre, grupo_whatsapp_alias, mention_number')
    .eq('activa', true)
    .order('slug')
  if (marcasErr) {
    return NextResponse.json({ ok: false, error: marcasErr.message }, { status: 500 })
  }
  const marcas = (marcasRaw ?? []) as MarcaRow[]

  // ----- 2. Para cada marca, fetch + upsert comentarios -----
  const summaries: FetchSummary[] = []
  for (const m of marcas) {
    const summary: FetchSummary = {
      marca_slug: m.slug,
      marca_nombre: m.nombre,
      emoji: m.emoji_marca,
      nuevos: 0,
      total_pendientes: 0,
      errores: [],
    }
    if (!m.metricool_blog_id) {
      summary.errores.push('sin metricool_blog_id')
      summaries.push(summary)
      continue
    }

    for (const network of NETWORKS) {
      const r = await listComentarios({
        blogId: m.metricool_blog_id,
        network,
        onlyUnread: false,
        limit: 50,
      })
      if (!r.ok) {
        summary.errores.push(`${network}: ${r.error}`)
        continue
      }
      for (const c of r.data) {
        // 1. Verificar si ya existe en BD (por unique key network + comment_id)
        // Si existe, NO tocamos — preserva ediciones manuales (aprobaciones,
        // textos editados por Pedro, status custom, etc.).
        const { data: existing } = await service
          .from('comentarios_inbox')
          .select('id')
          .eq('network', network)
          .eq('metricool_comment_id', c.id)
          .maybeSingle()
        if (existing) continue

        // 2. Es nuevo → insert. Aceptamos también comentarios que YA tienen
        // reply de la página en Metricool (c.hasReply=true) — Pedro quiere
        // verlos para tener visibilidad completa. Status apropiado:
        //   - "responded" si ya hay reply (no requiere acción)
        //   - "pending"   si todavía no hay (requiere borrador)
        const categoria = clasificarComentario(c.commentText)
        const initialStatus = c.hasReply ? 'responded' : 'pending'

        const { error: insErr } = await service
          .from('comentarios_inbox')
          .insert({
            marca_id: m.id,
            network,
            metricool_comment_id: c.id,
            metricool_thread_id: c.threadId,
            metricool_post_id: c.postId,
            author_username: c.authorUsername,
            author_display_name: c.authorDisplayName,  // Migration 024
            author_avatar_url: c.authorAvatarUrl,      // Migration 024
            comment_text: c.commentText,
            comment_created_at: c.createdAt,
            post_link: c.postLink,
            post_text_preview: c.postText,
            post_media_url: c.postMediaUrl,
            categoria_sugerida: categoria,
            status: initialStatus,
          })
        if (insErr) {
          summary.errores.push(`insert ${network}/${c.id}: ${insErr.message}`)
          continue
        }
        summary.nuevos += 1
      }
    }

    // Total pendientes ahora en BD para esta marca
    const { count } = await service
      .from('comentarios_inbox')
      .select('id', { count: 'exact', head: true })
      .eq('marca_id', m.id)
      .eq('status', 'pending')
    summary.total_pendientes = count ?? 0
    summaries.push(summary)
  }

  // ----- 3. WhatsApp a cliente — solo si MORNING_NOTIFY_CLIENTS=true Y tiene pendientes Y grupo configurado -----
  //
  // Por defecto este bloque NO se ejecuta: Pedro quiere revisar los informes
  // antes de que lleguen al cliente. Para activar cuando esté listo:
  //   en Vercel → env vars (production): MORNING_NOTIFY_CLIENTS=true
  const notifsCliente: Array<{ marca: string; ok: boolean; error?: string }> = []
  if (NOTIFY_CLIENT_GROUPS) {
    for (const s of summaries) {
      if (s.total_pendientes === 0) continue
      const m = marcas.find((x) => x.slug === s.marca_slug)!
      if (!m.grupo_whatsapp_chatid && !m.grupo_whatsapp_nombre && !m.grupo_whatsapp_alias) continue

      const saludo = m.decisor_tratamiento && m.decisor_nombre
        ? `${m.decisor_tratamiento} ${m.decisor_nombre}`
        : (m.decisor_nombre ?? '👋')
      const mentionPart = m.mention_number ? `@${m.mention_number} ` : ''
      const url = `${APP_URL}/comentarios?marca=${s.marca_slug}`
      const text = [
        `${mentionPart}Buen día ${saludo} 👋`,
        ``,
        `📬 Hay *${s.total_pendientes}* ${s.total_pendientes === 1 ? 'comentario nuevo' : 'comentarios nuevos'} para revisar y responder hoy.`,
        ``,
        `Mira las sugerencias y aprueba las que quieras enviar:`,
        url,
      ].join('\n')

      const sendResult = await sendWhatsAppWithMentions({
        ...(m.grupo_whatsapp_chatid
          ? { chatId: m.grupo_whatsapp_chatid }
          : { group_name: m.grupo_whatsapp_nombre ?? m.grupo_whatsapp_alias! }),
        text,
        mentions: m.mention_number ? [m.mention_number] : [],
      })
      notifsCliente.push({
        marca: s.marca_slug,
        ok: sendResult.ok,
        error: sendResult.ok ? undefined : sendResult.error,
      })
    }
  }

  // ----- 4. WhatsApp INTERNO a Pedro con resumen consolidado -----
  let notifInterno: { ok: boolean; error?: string } = { ok: false, error: 'no-attempt' }
  const totalPendientes = summaries.reduce((acc, s) => acc + s.total_pendientes, 0)
  const totalNuevos = summaries.reduce((acc, s) => acc + s.nuevos, 0)
  const marcasConPendientes = summaries.filter((s) => s.total_pendientes > 0)
  if (totalPendientes > 0) {
    const lines = [
      `🌅 *Morning digest — ${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'short' })}*`,
      ``,
      `📊 ${totalPendientes} comentarios pendientes · ${totalNuevos} nuevos esta noche`,
      ``,
      `*Por marca:*`,
      ...marcasConPendientes.map((s) => {
        const link = `${APP_URL}/comentarios?marca=${s.marca_slug}`
        const nuevos = s.nuevos > 0 ? ` (${s.nuevos} nuevos)` : ''
        return `${s.emoji ?? '•'} ${s.marca_nombre}: ${s.total_pendientes} pend${nuevos}\n   ${link}`
      }),
      ``,
      `Panel general: ${APP_URL}/comentarios`,
      ``,
      NOTIFY_CLIENT_GROUPS
        ? `📤 Modo activo: estos avisos también se mandaron a cada grupo cliente.`
        : `🤫 Modo silencioso: ningún cliente fue notificado (MORNING_NOTIFY_CLIENTS=false).`,
    ]
    // Preferimos chatId directo (más confiable que resolver por nombre)
    const destinoInterno = PEDRO_INTERNAL_CHATID
      ? { chatId: PEDRO_INTERNAL_CHATID }
      : { group_name: PEDRO_INTERNAL_GROUP_NAME }
    const internoResult = await sendWhatsAppWithMentions({
      ...destinoInterno,
      text: lines.join('\n'),
      mentions: [],
    })
    notifInterno = internoResult.ok
      ? { ok: true }
      : { ok: false, error: internoResult.error }
  } else {
    notifInterno = { ok: true, error: 'no-pending-comments-to-notify' }
  }

  // ----- 5. Respuesta -----
  return NextResponse.json({
    ok: true,
    duration_ms: Date.now() - startTime,
    marcas_procesadas: summaries.length,
    total_pendientes: totalPendientes,
    total_nuevos: totalNuevos,
    notifs_cliente: notifsCliente,
    notif_interno: notifInterno,
    detalle_por_marca: summaries,
  })
}
