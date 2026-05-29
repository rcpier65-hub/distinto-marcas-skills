// app/lib/integrations/rubi.ts
/**
 * Facade legacy de WhatsApp.
 *
 * Antes: este módulo hablaba con el MCP server `distinto-mcp` (JSON-RPC
 * 2.0 + handshake en 3 pasos). Eso dejó al sistema dependiendo de un
 * componente intermedio que se rompió y bloqueó al cron autónomo.
 *
 * Ahora: las funciones públicas que ya usaban 9 callers se MANTIENEN con
 * la misma firma, pero por dentro llaman al cliente HTTP nativo de WAHA
 * (`./waha.ts`). El MCP queda solo para Claude Desktop / uso manual.
 *
 * Si en el futuro el shape de retorno necesita cambios, conviene migrar
 * los callers directamente a `waha.ts` (que es más explícito).
 */

import {
  wahaSendText,
  wahaSendImage,
  wahaListGroups,
  type WahaGroup,
} from './waha'

export type RubiToolCallResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string }

/**
 * Envía un mensaje de texto a un número WhatsApp individual.
 */
export async function sendWhatsAppToPhone(
  phone: string,
  text: string,
): Promise<RubiToolCallResult> {
  return wahaSendText({ phone, text })
}

/**
 * Envía un mensaje a un grupo WhatsApp por alias o nombre.
 *
 * Nota: en WAHA puro no hay aliases — `byAlias=true` se trata como
 * `group_name` (la resolución por nombre soporta substring case-insensitive).
 * Para producción se prefiere `sendWhatsAppImageToChatId` con el chatId
 * guardado en `marcas.grupo_whatsapp_chatid`.
 */
export async function sendWhatsAppToGroup(
  groupName: string,
  text: string,
  byAlias = false,
): Promise<RubiToolCallResult> {
  return wahaSendText(
    byAlias ? { alias: groupName, text } : { group_name: groupName, text },
  )
}

/**
 * Envía una IMAGEN a un grupo WhatsApp por alias o nombre, con caption opcional.
 * `imageUrl` debe ser una URL pública accesible desde WAHA.
 */
export async function sendWhatsAppImageToGroup(
  groupName: string,
  imageUrl: string,
  caption: string,
  byAlias = false,
): Promise<RubiToolCallResult> {
  return wahaSendImage(
    byAlias
      ? { alias: groupName, imageUrl, caption }
      : { group_name: groupName, imageUrl, caption },
  )
}

/**
 * Envía una IMAGEN a un chat WhatsApp por chatId directo (`...@g.us`).
 *
 * Versión bullet-proof: no depende de aliases ni de resolución por nombre.
 * Si el caption contiene `@<numero>`, WhatsApp lo renderiza automáticamente
 * como mention clickeable cuando el número pertenece al grupo destino.
 */
export async function sendWhatsAppImageToChatId(
  chatId: string,
  imageUrl: string,
  caption: string,
): Promise<RubiToolCallResult> {
  return wahaSendImage({ chatId, imageUrl, caption })
}

/**
 * Envía mensaje de texto a un grupo mencionando uno o varios números.
 * Usar cuando hay que renderizar el `@<numero>` como mention clickeable.
 *
 * Acepta cualquiera de los formatos de destino. `mentions` es un array
 * de números (con o sin sufijo @c.us — la lib normaliza).
 */
export async function sendWhatsAppWithMentions(args: {
  chatId?: string
  alias?: string
  group_name?: string
  text: string
  mentions: string[]
}): Promise<RubiToolCallResult> {
  return wahaSendText(args)
}

/**
 * Envía mensaje de texto plano (sin menciones) a un chat.
 * Acepta cualquiera de: chatId | alias | group_name.
 */
export async function sendWhatsAppMessage(args: {
  chatId?: string
  alias?: string
  group_name?: string
  text: string
}): Promise<RubiToolCallResult> {
  return wahaSendText(args)
}

/**
 * Lista los grupos WhatsApp disponibles donde el bot está agregado.
 * Devuelve nombre, chatId, alias (null en WAHA puro) y miembros.
 */
export type WhatsAppGroup = WahaGroup

export async function listWhatsAppGroups(): Promise<
  { ok: true; groups: WhatsAppGroup[] } | { ok: false; error: string }
> {
  return wahaListGroups()
}
