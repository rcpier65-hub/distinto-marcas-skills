// app/lib/integrations/whatsapp-router.ts
//
// Router que decide entre el SERVICE INTERNO (services/whatsapp en Koyeb)
// o el MCP EXTERNO LEGACY (distinto-mcp.fly.dev/Rubi) según feature flag.
//
// Feature flag: env var WHATSAPP_USE_INTERNAL
//   - "true"  → usa el service interno (lib/integrations/whatsapp.ts)
//   - "false" o undefined → fallback al MCP Rubi externo (lib/integrations/rubi.ts)
//
// Esto permite migración suave: deployás el código nuevo con flag=false,
// confirmás que nada se rompió, después flipeás a true cuando el service
// interno esté listo y autenticado.

import {
  sendWhatsAppImageToGroup as rubiSendImageToGroup,
  sendWhatsAppImageToChatId as rubiSendImageToChatId,
  listWhatsAppGroups as rubiListGroups,
  type WhatsAppGroup as RubiGroup,
} from './rubi'
import {
  sendWhatsAppImageInternal,
  listWhatsAppGroupsInternal,
  getWhatsAppServiceStatus,
  type WhatsAppGroup as InternalGroup,
} from './whatsapp'

const USE_INTERNAL = process.env.WHATSAPP_USE_INTERNAL === 'true'

export const whatsappRoute = USE_INTERNAL ? 'internal' : 'rubi'

export type WhatsAppGroup = InternalGroup | RubiGroup

/**
 * Envía imagen a un chatId — usa service interno si flag activo, sino Rubi.
 * El service interno acepta mentions[] (array de números); Rubi NO los acepta
 * en el send_image (los infiere del caption `@<num>`).
 */
export async function sendWhatsAppImage(args: {
  chatId: string
  imageUrl: string
  caption: string
  mentions?: string[]
}): Promise<{ ok: true; messageId?: string | null } | { ok: false; error: string }> {
  if (USE_INTERNAL) {
    return sendWhatsAppImageInternal(args)
  }
  // Rubi: no soporta mentions array — el caption con @<num> se autoresuelve
  const r = await rubiSendImageToChatId(args.chatId, args.imageUrl, args.caption)
  if (!r.ok) return r
  return { ok: true }
}

/**
 * Envía imagen a un grupo por NOMBRE o ALIAS (legacy). Solo Rubi soporta esto;
 * el service interno requiere chatId siempre. Si flag interno, intenta resolver
 * el grupo por nombre a chatId via listGroups.
 */
export async function sendWhatsAppImageToNamedGroup(
  groupName: string,
  imageUrl: string,
  caption: string,
  byAlias = false,
): Promise<{ ok: true; messageId?: string | null } | { ok: false; error: string }> {
  if (USE_INTERNAL) {
    // Resolver nombre → chatId via listGroups
    const list = await listWhatsAppGroupsInternal()
    if (!list.ok) return list
    const grupo = list.groups.find((g) => g.nombre === groupName)
    if (!grupo) {
      return { ok: false, error: `grupo '${groupName}' no encontrado en service interno` }
    }
    return sendWhatsAppImageInternal({ chatId: grupo.chatId, imageUrl, caption })
  }
  const r = await rubiSendImageToGroup(groupName, imageUrl, caption, byAlias)
  if (!r.ok) return r
  return { ok: true }
}

/**
 * Lista grupos — Rubi o interno según flag. Mismo shape de salida.
 */
export async function listWhatsAppGroups(): Promise<
  { ok: true; groups: WhatsAppGroup[] } | { ok: false; error: string }
> {
  if (USE_INTERNAL) return listWhatsAppGroupsInternal()
  return rubiListGroups()
}

/**
 * Pre-flight check — útil ANTES de gastar Chromium + Storage upload para abortar
 * temprano si el servicio destino está caído.
 *
 * Para Rubi: usaría whatsapp_get_status (no implementado acá por simplicidad).
 * Para interno: GET /status.
 *
 * Devuelve { ok: true } si listo para enviar, { ok: false, ... } si no.
 */
export async function preflightWhatsApp(): Promise<
  { ok: true; route: 'internal' | 'rubi' } | { ok: false; error: string; route: 'internal' | 'rubi' }
> {
  if (USE_INTERNAL) {
    const r = await getWhatsAppServiceStatus()
    if (!r.ok) return { ok: false, error: r.error, route: 'internal' }
    if (r.status !== 'connected') {
      return {
        ok: false,
        error: `service interno status='${r.status}' — no listo para enviar`,
        route: 'internal',
      }
    }
    return { ok: true, route: 'internal' }
  }
  // Rubi: skip pre-flight (no hay endpoint barato en el wrapper actual).
  // Asumimos OK y dejamos que el envío falle si está caído.
  return { ok: true, route: 'rubi' }
}
