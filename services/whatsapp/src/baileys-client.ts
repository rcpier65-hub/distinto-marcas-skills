// services/whatsapp/src/baileys-client.ts
//
// Wrapper de @whiskeysockets/baileys con sesión persistente.
// La sesión se guarda en AUTH_DIR (default /data en Koyeb persistent volume).
//
// Reconexión automática salvo en logout explícito (donde requiere nuevo QR).
// Expone API pequeña tipada que consume `server.ts` desde los endpoints HTTP.

import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket,
  type AnyMessageContent,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import QRCode from 'qrcode'
import { mkdir } from 'node:fs/promises'

const AUTH_DIR = process.env.AUTH_DIR ?? '/data/auth'
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'warn'

const logger = pino({ level: LOG_LEVEL }).child({ module: 'baileys-client' })

export type ClientStatus =
  | 'connecting'      // arrancando
  | 'qr'              // esperando escaneo QR (primera vez o logout)
  | 'connected'       // sesión activa y enviando
  | 'disconnected'    // sesión cerrada — reconectando
  | 'stopped'         // detenido permanentemente

type GroupSummary = {
  chatId: string
  nombre: string
  miembros: number
}

type SendImageInput = {
  chatId: string
  imageUrl: string
  caption?: string
  mentions?: string[]  // formato '51902414745' (sin '@')
}

type SendTextInput = {
  chatId: string
  text: string
  mentions?: string[]
}

// Estado del módulo — single-tenant (un solo bot por instancia)
let sock: WASocket | null = null
let status: ClientStatus = 'connecting'
let lastQrDataUrl: string | null = null   // PNG data URL del último QR para mostrar en /qr
let lastQrRawText: string | null = null
let connectedAt: Date | null = null
let myJid: string | null = null  // ej. 51941397982@s.whatsapp.net

export function getStatus() {
  return {
    status,
    connectedAt: connectedAt?.toISOString() ?? null,
    myJid,
    hasQr: !!lastQrDataUrl,
  }
}

export function getQrCode() {
  return { dataUrl: lastQrDataUrl, rawText: lastQrRawText }
}

/**
 * Inicia (o reinicia) la conexión Baileys. Idempotente — si ya hay sock activo,
 * no hace nada. Llamar al arrancar el server y como reconexión.
 */
export async function startClient() {
  if (sock && status === 'connected') {
    logger.info('startClient: ya conectado, skip')
    return
  }
  status = 'connecting'

  // Asegurarse de que el dir de auth existe (en Koyeb /data es el persistent volume)
  await mkdir(AUTH_DIR, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  logger.info({ version, authDir: AUTH_DIR }, 'starting baileys socket')

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,  // lo emitimos por /qr endpoint en su lugar
    logger: pino({ level: 'error' }), // silenciar logs internos de baileys (verbosos)
    browser: ['Distinto Agency', 'Chrome', '1.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      // Generar QR data URL para mostrar en /qr endpoint
      lastQrRawText = qr
      lastQrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 })
      status = 'qr'
      logger.warn('QR code disponible — escaneá en /qr')
    }

    if (connection === 'open') {
      status = 'connected'
      connectedAt = new Date()
      lastQrDataUrl = null
      lastQrRawText = null
      myJid = sock?.user?.id ?? null
      logger.info({ myJid }, '✅ baileys conectado')
    }

    if (connection === 'close') {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode
      const shouldReconnect = code !== DisconnectReason.loggedOut
      logger.warn({ code, shouldReconnect }, 'conexión cerrada')

      if (shouldReconnect) {
        status = 'disconnected'
        // Reintento con backoff exponencial liviano (max 30s)
        const delay = Math.min(30_000, 1000 * Math.pow(2, reconnectAttempts++))
        setTimeout(() => startClient().catch((e) => logger.error(e, 'reconnect failed')), delay)
      } else {
        status = 'stopped'
        logger.error('sesión cerrada por logout — escanear QR nuevo en /qr')
        // Re-arranca para emitir QR
        setTimeout(() => startClient().catch((e) => logger.error(e, 'restart for QR failed')), 2000)
      }
    }
  })
}

let reconnectAttempts = 0

/**
 * Envía una imagen al chat especificado. Si caption contiene @<num>, agregamos
 * el array de mentions correspondiente para que WhatsApp lo renderice como
 * mention clickeable.
 */
export async function sendImage(input: SendImageInput) {
  if (!sock || status !== 'connected') {
    throw new Error(`bot no conectado (status: ${status})`)
  }

  // Convertir mentions de '51902414745' a '51902414745@s.whatsapp.net' (JID format)
  const mentionJids = (input.mentions ?? []).map((n) => `${n}@s.whatsapp.net`)

  const content: AnyMessageContent = {
    image: { url: input.imageUrl },
    caption: input.caption,
    mentions: mentionJids.length > 0 ? mentionJids : undefined,
  }

  const result = await sock.sendMessage(input.chatId, content)
  return { messageId: result?.key?.id ?? null }
}

/**
 * Envía un mensaje de texto. Mismo manejo de mentions que sendImage.
 */
export async function sendText(input: SendTextInput) {
  if (!sock || status !== 'connected') {
    throw new Error(`bot no conectado (status: ${status})`)
  }

  const mentionJids = (input.mentions ?? []).map((n) => `${n}@s.whatsapp.net`)
  const content: AnyMessageContent = {
    text: input.text,
    mentions: mentionJids.length > 0 ? mentionJids : undefined,
  }
  const result = await sock.sendMessage(input.chatId, content)
  return { messageId: result?.key?.id ?? null }
}

/**
 * Lista los grupos donde el bot está agregado. Usa fetchAllParticipating
 * (cache local de Baileys, instantáneo después del sync inicial).
 */
export async function listGroups(): Promise<GroupSummary[]> {
  if (!sock || status !== 'connected') {
    throw new Error(`bot no conectado (status: ${status})`)
  }
  const groups = await sock.groupFetchAllParticipating()
  return Object.values(groups).map((g) => ({
    chatId: g.id,
    nombre: g.subject ?? '(sin nombre)',
    miembros: g.participants?.length ?? 0,
  }))
}
