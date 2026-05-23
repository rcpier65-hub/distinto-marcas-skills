// services/whatsapp/src/server.ts
//
// HTTP API protegida con shared secret (header X-Secret).
// Endpoints expuestos a la app Distinto Vercel para mandar/listar/probar WhatsApp.
//
// Diseño:
//   - JSON in/out (excepto /qr que devuelve HTML para mostrar la imagen).
//   - Errores 4xx para input inválido, 5xx para bot offline o WhatsApp error.
//   - Sin rate limiting interno — la app llama 1-10 veces por día, no es problema.

import express, { type Request, type Response, type NextFunction } from 'express'
import pino from 'pino'
import {
  startClient,
  getStatus,
  getQrCode,
  sendImage,
  sendText,
  listGroups,
} from './baileys-client.js'

const PORT = parseInt(process.env.PORT ?? '8000', 10)
const SHARED_SECRET = process.env.WHATSAPP_SHARED_SECRET ?? ''
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' }).child({ module: 'server' })

if (!SHARED_SECRET) {
  logger.error('WHATSAPP_SHARED_SECRET no está set — abortando')
  process.exit(1)
}

const app = express()
app.use(express.json({ limit: '2mb' }))

// Middleware de auth para endpoints sensibles.
// EXCEPCIÓN: /qr y /status pueden no requerir auth si querés inspección desde browser.
// Pero por defecto los protejo todos. /qr lo desproteges manualmente abajo si querés.
function requireSecret(req: Request, res: Response, next: NextFunction) {
  const provided = req.headers['x-secret']
  if (!provided || provided !== SHARED_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized — header X-Secret faltante o inválido' })
  }
  next()
}

// Healthcheck público (Koyeb lo usa para saber si el container está vivo)
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() })
})

// === Endpoints protegidos ===

app.get('/status', requireSecret, (_req, res) => {
  res.json({ ok: true, ...getStatus() })
})

// QR como HTML — útil para escanear desde browser
// PROTEGIDO con ?key= query param porque vas a abrirlo en tu Mac
app.get('/qr', (req, res) => {
  if (req.query.key !== SHARED_SECRET) {
    return res.status(401).send('Falta ?key=<secret> en la URL')
  }
  const { dataUrl, rawText } = getQrCode()
  const s = getStatus()
  if (!dataUrl) {
    return res.send(`
      <html><body style="font-family: system-ui; padding: 40px; text-align: center;">
        <h1>Sin QR activo</h1>
        <p>Estado actual: <strong>${s.status}</strong></p>
        <p>${s.status === 'connected' ? '✅ Bot ya está conectado, no necesita QR.' : 'El bot está arrancando…'}</p>
        <p>JID: ${s.myJid ?? '—'}</p>
        <script>setTimeout(() => location.reload(), 3000)</script>
      </body></html>
    `)
  }
  res.send(`
    <html>
      <head><title>WhatsApp QR — Distinto</title></head>
      <body style="font-family: system-ui; padding: 40px; text-align: center; background: #fafafa;">
        <h1>Escaneá con WhatsApp</h1>
        <p>Abrí WhatsApp → Configuración → Dispositivos vinculados → Vincular un dispositivo</p>
        <img src="${dataUrl}" alt="WhatsApp QR" style="border: 8px solid white; box-shadow: 0 8px 30px rgba(0,0,0,0.1); border-radius: 8px;" />
        <p style="font-size: 12px; color: #666; margin-top: 20px;">Estado actual: <strong>${s.status}</strong></p>
        <p style="font-size: 11px; color: #999;">Esta página se refresca cada 5s para mostrar QR actualizado.</p>
        <script>setTimeout(() => location.reload(), 5000)</script>
      </body>
    </html>
  `)
})

app.get('/groups', requireSecret, async (_req, res) => {
  try {
    const groups = await listGroups()
    res.json({ ok: true, groups })
  } catch (e) {
    logger.error(e, 'listGroups failed')
    res.status(500).json({ ok: false, error: (e as Error).message })
  }
})

app.post('/send/image', requireSecret, async (req, res) => {
  const { chatId, imageUrl, caption, mentions } = req.body ?? {}
  if (!chatId || !imageUrl) {
    return res.status(400).json({ ok: false, error: 'chatId e imageUrl requeridos' })
  }
  try {
    const result = await sendImage({ chatId, imageUrl, caption, mentions })
    res.json({ ok: true, ...result })
  } catch (e) {
    logger.error(e, 'sendImage failed')
    res.status(500).json({ ok: false, error: (e as Error).message })
  }
})

app.post('/send/text', requireSecret, async (req, res) => {
  const { chatId, text, mentions } = req.body ?? {}
  if (!chatId || !text) {
    return res.status(400).json({ ok: false, error: 'chatId y text requeridos' })
  }
  try {
    const result = await sendText({ chatId, text, mentions })
    res.json({ ok: true, ...result })
  } catch (e) {
    logger.error(e, 'sendText failed')
    res.status(500).json({ ok: false, error: (e as Error).message })
  }
})

// 404 default
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'not found' })
})

app.listen(PORT, () => {
  logger.info(`HTTP server listening on :${PORT}`)
})

// Arranca Baileys en paralelo al server (no await — el server responde
// /healthz aun mientras Baileys está conectando)
startClient().catch((e) => logger.error(e, 'startClient initial failed'))
