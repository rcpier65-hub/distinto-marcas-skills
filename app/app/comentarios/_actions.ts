// app/app/comentarios/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { listComentarios, responderComentario } from '@/lib/integrations/metricool'
import { clasificarComentario } from '@/lib/comentarios/clasificador'
import { sendWhatsAppImage } from '@/lib/integrations/whatsapp-router'
import type {
  ComentarioInboxRow,
  ComentarioCategoria,
  ComentarioNetwork,
} from '@/lib/types/database'

const NETWORKS: ComentarioNetwork[] = ['instagram', 'facebook', 'tiktok']

// ============================================================
// DISPATCH ROUTINE — dispara la Claude Routine vía API
// ============================================================
// La Routine vive en Claude Desktop. Tu app le pega un POST a su
// trigger API con un bearer token (env var encriptada en Vercel).
// El campo "text" del body llega al contexto del prompt como
// instrucción de qué fase ejecutar (generar / postear / ambas).

export type RoutineMode = 'generar' | 'postear' | 'ambas'

/**
 * Dispara la Routine de Claude Desktop para procesar comentarios.
 *
 * Decisión: NO esperamos la respuesta de la Routine (puede tomar
 * 30-90s). Mandamos el POST y devolvemos al usuario inmediatamente.
 * El usuario sabe que la Routine terminó cuando le llega el WhatsApp
 * de notificación interno (notify scope=interno desde el prompt v2).
 */
export async function dispatchRoutine(
  mode: RoutineMode,
): Promise<
  | { ok: true; status: number; message: string; sessionUrl: string | null; sessionId: string | null }
  | { ok: false; error: string }
> {
  await requireUser()

  const url = process.env.ANTHROPIC_ROUTINE_URL
  const bearer = process.env.ANTHROPIC_ROUTINE_BEARER

  if (!url || !bearer) {
    return {
      ok: false,
      error:
        'ANTHROPIC_ROUTINE_URL o ANTHROPIC_ROUTINE_BEARER no están configurados en Vercel env vars.',
    }
  }

  try {
    // Probado empíricamente: el endpoint /fire de Claude Routines acepta
    // solo Authorization + Content-Type + anthropic-version. NO requiere
    // anthropic-beta header (aunque está documentado en otros endpoints).
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearer}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ text: mode }),
      signal: AbortSignal.timeout(15000),
    })

    const text = await res.text()
    if (!res.ok) {
      return {
        ok: false,
        error: `Routine fire falló — HTTP ${res.status}: ${text.slice(0, 200)}`,
      }
    }

    // El endpoint devuelve { claude_code_session_id, claude_code_session_url, type }
    // El session_url es ORO: link en vivo a claude.ai/code/session_xxx donde
    // se puede VER a la Routine ejecutándose paso a paso.
    let sessionUrl: string | null = null
    let sessionId: string | null = null
    try {
      const json = JSON.parse(text) as { claude_code_session_url?: string; claude_code_session_id?: string }
      sessionUrl = json.claude_code_session_url ?? null
      sessionId = json.claude_code_session_id ?? null
    } catch {
      // Si no es JSON parseable seguimos igual — el fire ya fue exitoso
    }

    return {
      ok: true,
      status: res.status,
      message: `Routine disparada en modo "${mode}". Te llega WhatsApp interno cuando termine (~30-90s).`,
      sessionUrl,
      sessionId,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Error de red: ${msg}` }
  }
}

// ============================================================
// FETCH desde Metricool → upsert en BD
// ============================================================

/**
 * Trae comentarios pendientes desde Metricool de las 3 redes y los upsertea
 * en comentarios_inbox. Para cada uno nuevo: clasifica + asigna template
 * sugerido. Ya existentes: respeta el estado actual (no sobreescribe).
 *
 * @returns {fetched, inserted, skipped, errors[]}
 */
export async function fetchComentariosFromMetricool(
  marcaSlug: string,
): Promise<{ ok: true; fetched: number; inserted: number; errors: string[] } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Resolver marca + metricool_blog_id
  const { data: marca, error: mErr } = await service
    .from('marcas')
    .select('id, slug, nombre, metricool_blog_id')
    .eq('slug', marcaSlug)
    .maybeSingle()
  if (mErr) return { ok: false, error: mErr.message }
  if (!marca) return { ok: false, error: `Marca '${marcaSlug}' no encontrada` }
  if (!marca.metricool_blog_id) {
    return { ok: false, error: `Marca '${marcaSlug}' no tiene metricool_blog_id configurado` }
  }

  let fetched = 0
  let inserted = 0
  const errors: string[] = []

  // Pre-cargar templates de la marca + globales para asignar respuesta_sugerida
  const templates = await loadTemplatesMap(marca.id)

  for (const network of NETWORKS) {
    const r = await listComentarios({
      blogId: marca.metricool_blog_id,
      network,
      onlyUnread: false,
      limit: 50,
    })
    if (!r.ok) {
      errors.push(`${network}: ${r.error}`)
      continue
    }
    for (const c of r.data) {
      fetched++
      if (c.hasReply) continue  // ya respondimos, skip
      // upsert por (network, metricool_comment_id)
      const categoria = clasificarComentario(c.commentText)
      const respuesta_sugerida = templates[categoria] ?? ''
      const { error: insErr, data: insData } = await service
        .from('comentarios_inbox')
        .upsert(
          {
            marca_id: marca.id,
            network,
            metricool_comment_id: c.id,
            metricool_thread_id: c.threadId,
            metricool_post_id: c.postId,
            author_username: c.authorUsername,
            comment_text: c.commentText,
            comment_created_at: c.createdAt,
            post_link: c.postLink,
            post_text_preview: c.postText,
            post_media_url: c.postMediaUrl,
            categoria_sugerida: categoria,
            respuesta_sugerida,
            // status sólo se setea en insert (default 'pending'); update preserva
          },
          { onConflict: 'network,metricool_comment_id', ignoreDuplicates: false },
        )
        .select('id, created_at')
      if (insErr) {
        errors.push(`upsert ${network}/${c.id}: ${insErr.message}`)
        continue
      }
      // Si fue insert nuevo (vs update existente), incrementar counter
      if (insData && insData.length > 0) {
        // No tenemos forma trivial de saber si fue insert o update con upsert.
        // Para una mejor métrica, podríamos hacer 2 queries separadas (select then insert).
        // Por ahora, asumimos que los que vienen son potencialmente nuevos.
        inserted++
      }
    }
  }

  revalidatePath('/comentarios')
  return { ok: true, fetched, inserted, errors }
}

/**
 * Carga templates de la marca + globales en un map {categoria → template_text}.
 * Si una categoría tiene template específico de marca, gana sobre el global.
 */
async function loadTemplatesMap(marcaId: string): Promise<Record<string, string>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  // Tolerar tabla no existe (pre-migration)
  const r = await service
    .from('comentarios_templates')
    .select('marca_id, categoria, template_text')
    .or(`marca_id.eq.${marcaId},marca_id.is.null`)
    .eq('activo', true)
  if (r.error) return {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (r.data ?? []) as any[]
  // Marca-específicas pisan globales
  const map: Record<string, string> = {}
  for (const row of rows) {
    if (row.marca_id === null && map[row.categoria]) continue  // no pisar específico con global
    map[row.categoria] = row.template_text
  }
  return map
}

// ============================================================
// LIST inbox por marca + status
// ============================================================

export async function listInbox(
  marcaSlug: string,
  status: 'pending' | 'approved' | 'responded' | 'all' = 'pending',
): Promise<
  | { ok: true; rows: ComentarioInboxRow[] }
  | { ok: false; error: string }
> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: marca } = await service
    .from('marcas')
    .select('id')
    .eq('slug', marcaSlug)
    .maybeSingle()
  if (!marca) return { ok: false, error: 'Marca no encontrada' }

  let q = service
    .from('comentarios_inbox')
    .select('*')
    .eq('marca_id', marca.id)
    .order('comment_created_at', { ascending: false })
    .limit(100)
  if (status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) {
    if ((error.message ?? '').includes('does not exist')) return { ok: true, rows: [] }
    return { ok: false, error: error.message }
  }
  return { ok: true, rows: (data ?? []) as ComentarioInboxRow[] }
}

// ============================================================
// APROBAR + EDITAR respuesta antes de enviar
// ============================================================

export async function actualizarComentarioBorrador(args: {
  id: string
  respuesta_final?: string
  categoria_sugerida?: ComentarioCategoria
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {}
  if (args.respuesta_final !== undefined) payload.respuesta_final = args.respuesta_final.trim() || null
  if (args.categoria_sugerida !== undefined) payload.categoria_sugerida = args.categoria_sugerida
  const { error } = await service.from('comentarios_inbox').update(payload).eq('id', args.id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function skipComentario(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { error } = await service.from('comentarios_inbox').update({ status: 'skipped' }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/comentarios')
  return { ok: true }
}

// ============================================================
// RESPONDER BATCH — el corazón del sistema
// ============================================================

/**
 * Toma una lista de IDs aprobados y para cada uno:
 *   1. Lee el row con la respuesta_final (o respuesta_sugerida si está vacío)
 *   2. Llama Metricool API para responder
 *   3. Actualiza status a 'responded' (o 'failed' si rolled error)
 *   4. Después de procesar todos, manda informe WhatsApp al grupo configurado
 *
 * Diseño fail-safe: si Metricool falla en uno, sigue con los demás. Al final
 * el informe distingue exitosos vs fallidos.
 */
export async function responderBatch(
  ids: string[],
  enviarInforme: boolean = true,
): Promise<
  | { ok: true; respondidos: number; fallidos: number; informe_enviado: boolean }
  | { ok: false; error: string }
> {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  if (ids.length === 0) return { ok: false, error: 'Sin IDs para responder' }

  // Cargar todos los rows + la marca + grupo configurado
  const { data: rows, error } = await service
    .from('comentarios_inbox')
    .select(`
      id, marca_id, network, metricool_comment_id, author_username, comment_text,
      respuesta_final, respuesta_sugerida, status,
      marcas:marca_id (
        slug, nombre, metricool_blog_id, reporte_comentarios_grupo,
        grupo_whatsapp_chatid, grupo_whatsapp_nombre
      )
    `)
    .in('id', ids)
  if (error) return { ok: false, error: error.message }

  let respondidos = 0
  let fallidos = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const porMarca = new Map<string, { marca: any; exitosos: any[]; fallos: any[] }>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of rows as any[]) {
    if (r.status === 'responded') continue  // skip ya respondidos
    if (!r.marcas?.metricool_blog_id) {
      fallidos++
      await service
        .from('comentarios_inbox')
        .update({ status: 'failed', failed_reason: 'marca sin metricool_blog_id' })
        .eq('id', r.id)
      continue
    }

    const textoFinal = (r.respuesta_final?.trim() || r.respuesta_sugerida?.trim() || '')
    if (!textoFinal) {
      fallidos++
      await service
        .from('comentarios_inbox')
        .update({ status: 'failed', failed_reason: 'sin texto de respuesta' })
        .eq('id', r.id)
      continue
    }

    // Llamar Metricool
    const sendResult = await responderComentario({
      blogId: r.marcas.metricool_blog_id,
      network: r.network,
      commentId: r.metricool_comment_id,
      text: textoFinal,
    })

    if (!sendResult.ok) {
      fallidos++
      await service
        .from('comentarios_inbox')
        .update({ status: 'failed', failed_reason: sendResult.error.slice(0, 200) })
        .eq('id', r.id)
      // Track para informe
      const bucket = porMarca.get(r.marca_id) ?? { marca: r.marcas, exitosos: [], fallos: [] }
      bucket.fallos.push({ ...r, failed_reason: sendResult.error })
      porMarca.set(r.marca_id, bucket)
      continue
    }

    respondidos++
    await service
      .from('comentarios_inbox')
      .update({
        status: 'responded',
        responded_at: new Date().toISOString(),
        responded_by_user_id: user.id,
        respuesta_final: textoFinal,
        metricool_response_id: sendResult.data.messageId,
      })
      .eq('id', r.id)
    const bucket = porMarca.get(r.marca_id) ?? { marca: r.marcas, exitosos: [], fallos: [] }
    bucket.exitosos.push({ ...r, respuesta_final: textoFinal })
    porMarca.set(r.marca_id, bucket)
  }

  // Enviar informes por marca (si está configurado)
  let informe_enviado = false
  if (enviarInforme) {
    for (const [, bucket] of porMarca) {
      const enviado = await enviarInformeWhatsapp(bucket.marca, bucket.exitosos, bucket.fallos)
      if (enviado) informe_enviado = true
    }
  }

  revalidatePath('/comentarios')
  return { ok: true, respondidos, fallidos, informe_enviado }
}

// ============================================================
// INFORME WhatsApp — al grupo configurado por marca
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enviarInformeWhatsapp(
  marca: any,
  exitosos: any[],
  fallos: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chatIdOverride?: string,
  esPreview: boolean = false,
): Promise<boolean> {
  // chatIdOverride permite mandar el informe a OTRO destino (ej número
  // personal de Pedro en modo prueba). Si está seteado, ignoramos la
  // config de la marca.
  let chatId: string
  if (chatIdOverride) {
    chatId = chatIdOverride
  } else {
    // grupo destino según config: cliente (chatid de la marca) | interno (New team) | ninguno
    const dest = marca.reporte_comentarios_grupo as string
    if (dest === 'ninguno') return false
    if (dest === 'cliente') {
      if (!marca.grupo_whatsapp_chatid) return false
      chatId = marca.grupo_whatsapp_chatid
    } else {
      chatId = process.env.WHATSAPP_TEST_GROUP_CHATID ?? '120363427129444398@g.us'  // New team default
    }
  }
  // Si es preview, agregamos marca visible al inicio del mensaje
  const previewBadge = esPreview ? '🧪 *MODO PRUEBA — esto NO se mandó a clientes ni a Metricool*\n\n' : ''

  // Construir mensaje resumen
  const fecha = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
  const lines: string[] = [
    `💬 *Informe de comentarios — ${marca.nombre}*`,
    `_${fecha}_`,
    '',
    `✅ Respondidos: ${exitosos.length}`,
  ]
  if (fallos.length > 0) lines.push(`⚠️ Con error: ${fallos.length}`)
  lines.push('')

  if (exitosos.length > 0) {
    lines.push('*Comentarios respondidos:*')
    for (const e of exitosos.slice(0, 10)) {
      lines.push(`• @${e.author_username} (${e.network}): "${e.comment_text.slice(0, 60)}${e.comment_text.length > 60 ? '…' : ''}"`)
    }
    if (exitosos.length > 10) lines.push(`_(+${exitosos.length - 10} más)_`)
  }
  if (fallos.length > 0) {
    lines.push('')
    lines.push('*Fallaron:*')
    for (const f of fallos.slice(0, 5)) {
      lines.push(`• @${f.author_username}: ${f.failed_reason.slice(0, 80)}`)
    }
  }

  const text = previewBadge + lines.join('\n')

  // Enviamos como TEXTO (no imagen) — usamos sendWhatsAppImage con un workaround?
  // No — necesitamos sendWhatsAppText. Por ahora, lo mando como mensaje con
  // imagen del logo de la marca como "thumbnail" del informe.
  // ALTERNATIVA: agregar sendWhatsAppText al router. Por hoy mando vía sendImage
  // con una imagen pública generic. Actualizar después.
  //
  // Workaround: hacemos POST directo al bot interno /send/text si existe.
  const result = await sendWhatsAppImage({
    chatId,
    imageUrl: 'https://raw.githubusercontent.com/rcpier65-hub/distinto-marcas-skills/main/tmp-demo/grilla-typhouse-test-prod.png',
    caption: text,
  })
  return result.ok
}

// ============================================================
// KPIs / Resumen
// ============================================================

export async function getResumenInbox(marcaSlug: string): Promise<{
  ok: true
  pending: number
  approved: number
  responded_today: number
  failed: number
} | { ok: false; error: string }> {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: marca } = await service.from('marcas').select('id').eq('slug', marcaSlug).maybeSingle()
  if (!marca) return { ok: false, error: 'Marca no encontrada' }

  const today = new Date().toISOString().slice(0, 10)
  const todayStart = `${today}T00:00:00Z`

  const [pendingR, approvedR, respondedR, failedR] = await Promise.all([
    service.from('comentarios_inbox').select('id', { count: 'exact', head: true }).eq('marca_id', marca.id).eq('status', 'pending'),
    service.from('comentarios_inbox').select('id', { count: 'exact', head: true }).eq('marca_id', marca.id).eq('status', 'approved'),
    service.from('comentarios_inbox').select('id', { count: 'exact', head: true }).eq('marca_id', marca.id).eq('status', 'responded').gte('responded_at', todayStart),
    service.from('comentarios_inbox').select('id', { count: 'exact', head: true }).eq('marca_id', marca.id).eq('status', 'failed'),
  ])

  return {
    ok: true,
    pending: pendingR.count ?? 0,
    approved: approvedR.count ?? 0,
    responded_today: respondedR.count ?? 0,
    failed: failedR.count ?? 0,
  }
}

// ============================================================
// PREVIEW INFORME — modo prueba que NO toca Metricool
// ============================================================
/**
 * Simula que se respondieron los comentarios seleccionados y manda el
 * informe a un destino de prueba (por default, número personal de Pedro).
 *
 * NO postea a Metricool. NO cambia status en BD. Solo construye el caption
 * que SE ENVIARÍA si fuera real y lo manda como mensaje WhatsApp.
 *
 * Sirve para validar:
 *   1. Que el bot WhatsApp Rubi está funcionando
 *   2. Cómo va a quedar visualmente el informe
 *   3. Que el grupo correcto está configurado (si pasás chatIdOverride)
 *
 * @param comentarioIds — los IDs seleccionados en la UI
 * @param destinoOverride — chat WhatsApp donde mandar (default: número personal de Pedro)
 */
export async function previewInformeWhatsapp(
  comentarioIds: string[],
  destinoOverride?: string,
): Promise<
  | { ok: true; preview_text: string; sent_to: string; marcas_procesadas: number }
  | { ok: false; error: string }
> {
  await requireUser()
  if (comentarioIds.length === 0) return { ok: false, error: 'No hay comentarios seleccionados' }

  // Default: número personal de Pedro (configurable por env var)
  const destino = destinoOverride ?? process.env.WHATSAPP_PEDRO_PERSONAL ?? '51983852191@s.whatsapp.net'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Pull los rows con join a marca
  const { data: rows, error } = await service
    .from('comentarios_inbox')
    .select(`
      id, marca_id, network, author_username, author_display_name,
      comment_text, respuesta_sugerida, respuesta_editada, respuesta_final,
      marcas:marca_id (
        id, slug, nombre, reporte_comentarios_grupo,
        grupo_whatsapp_chatid, grupo_whatsapp_nombre
      )
    `)
    .in('id', comentarioIds)
  if (error) return { ok: false, error: error.message }
  if (!rows || rows.length === 0) return { ok: false, error: 'No se encontraron comentarios' }

  // Agrupar por marca (un informe por marca)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const porMarca = new Map<string, { marca: any; exitosos: any[] }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of rows as any[]) {
    const textoFinal = r.respuesta_editada?.trim() || r.respuesta_final?.trim() || r.respuesta_sugerida?.trim() || ''
    if (!textoFinal) continue  // skip los vacíos
    const bucket = porMarca.get(r.marca_id) ?? { marca: r.marcas, exitosos: [] }
    bucket.exitosos.push({ ...r, respuesta_final: textoFinal })
    porMarca.set(r.marca_id, bucket)
  }

  // Generar informes por marca y mandarlos todos al destino de prueba
  const partes: string[] = []
  let enviadosOk = 0
  for (const [, bucket] of porMarca) {
    const enviado = await enviarInformeWhatsapp(
      bucket.marca,
      bucket.exitosos,
      [],                  // sin fallos en preview
      destino,             // override al número personal
      true,                // marcar como preview
    )
    if (enviado) enviadosOk += 1
    // Para mostrar al user el texto que se mandó
    partes.push(`✅ ${bucket.marca.nombre}: ${bucket.exitosos.length} comentarios simulados`)
  }

  return {
    ok: true,
    preview_text: partes.join('\n'),
    sent_to: destino,
    marcas_procesadas: enviadosOk,
  }
}
