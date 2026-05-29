// app/app/api/v1/whatsapp/notify/route.ts
//
// POST /api/v1/whatsapp/notify
//
// Envía un mensaje WhatsApp a un grupo. Usado por:
//   - Routine externa para notificar "ya generé X sugerencias para Manrique, revisalas"
//   - Cron interno para morning digest
//   - Triggers manuales desde admin
//
// Body (JSON):
//   {
//     "marca_slug": "manrique" (opcional si chat_id directo),
//     "chat_id": "120363..." (opcional si marca_slug — usa grupo configurado de la marca),
//     "text": "el mensaje",
//     "mentions": ["51983852191"] (opcional — números a mencionar con @),
//     "scope": "cliente" | "interno" (default "cliente" → grupo del cliente; "interno" → grupo Pedro)
//   }
//
// Auth: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsAppWithMentions, sendWhatsAppMessage } from '@/lib/integrations/rubi'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Destino del scope "interno" (grupo Pedro / equipo).
// Preferimos chatId (más confiable, no depende de nombres que cambian).
// Si no está, caemos a nombre de grupo (WAHA hace lookup case-insensitive).
const PEDRO_INTERNAL_CHATID = process.env.WHATSAPP_INTERNAL_GROUP_CHATID ?? null
const PEDRO_INTERNAL_NAME = process.env.WHATSAPP_INTERNAL_GROUP_ALIAS ?? 'New team'

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 })
}

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('JSON inválido')
  }
  if (!body || typeof body !== 'object') return badRequest('Body vacío')

  const b = body as Record<string, unknown>
  const text = typeof b.text === 'string' ? b.text : null
  if (!text) return badRequest('text requerido')
  if (text.length > 4000) return badRequest('text >4000 chars')

  const scope = (b.scope === 'interno' ? 'interno' : 'cliente') as 'cliente' | 'interno'
  const marcaSlug = typeof b.marca_slug === 'string' ? b.marca_slug : null
  let chatId = typeof b.chat_id === 'string' ? b.chat_id : null
  let groupName: string | null = null
  const mentions = Array.isArray(b.mentions) ? (b.mentions as string[]) : undefined

  // Resolver destino
  if (!chatId) {
    if (scope === 'interno') {
      // Grupo interno de Pedro — preferimos chatId, fallback a nombre
      if (PEDRO_INTERNAL_CHATID) {
        chatId = PEDRO_INTERNAL_CHATID
      } else {
        groupName = PEDRO_INTERNAL_NAME
      }
    } else {
      // Grupo del cliente — necesita marca_slug
      if (!marcaSlug) return badRequest('marca_slug o chat_id requerido')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = createServiceClient() as any
      const { data: marca } = await service
        .from('marcas')
        .select('grupo_whatsapp_chatid, grupo_whatsapp_nombre, grupo_whatsapp_alias')
        .eq('slug', marcaSlug)
        .maybeSingle()
      if (!marca) return badRequest(`marca '${marcaSlug}' no encontrada`)
      chatId = marca.grupo_whatsapp_chatid ?? null
      groupName = marca.grupo_whatsapp_nombre ?? marca.grupo_whatsapp_alias ?? null
      if (!chatId && !groupName) {
        return badRequest(`marca '${marcaSlug}' sin grupo WhatsApp configurado`)
      }
    }
  }

  // Enviar via Rubi (acepta chatId o nombre de grupo)
  // FIX 2026-05-29: la tool whatsapp_send_with_mentions REQUIERE al menos 1
  // mention. Si no hay menciones, usar whatsapp_send_message (sin mentions).
  const hasMentions = mentions && mentions.length > 0
  const destinoArgs = chatId ? { chatId } : { group_name: groupName! }
  const result = hasMentions
    ? await sendWhatsAppWithMentions({ ...destinoArgs, text, mentions: mentions! })
    : await sendWhatsAppMessage({ ...destinoArgs, text })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }

  /* result.data tiene el response del MCP; lo devolvemos como echo para tracking */
  return NextResponse.json({
    ok: true,
    scope,
    target: chatId ?? groupName,
    rubi_response: result.data,
  })
}
