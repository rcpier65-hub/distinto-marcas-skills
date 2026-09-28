// Token de dispositivo (PAT) para clientes como Kairos.
// El plaintext empieza con dst_live_ y solo se muestra al crearlo.
// En la base queda el SHA-256 hex; el prefijo visible identifica la clave sin revelarla.

import { createHash, randomBytes } from 'node:crypto'

export const DEVICE_KEY_PREFIX = 'dst_live_'

const SECRET_BYTES = 32
const VISIBLE_SECRET_CHARS = 8

export function isDeviceApiKeyToken(token: string): boolean {
  return token.startsWith(DEVICE_KEY_PREFIX)
}

export function hashDeviceApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex')
}

export function generateDeviceApiKey(): { token: string; prefix: string; hash: string } {
  const secret = randomBytes(SECRET_BYTES).toString('base64url')
  const token = `${DEVICE_KEY_PREFIX}${secret}`
  const prefix = token.slice(0, DEVICE_KEY_PREFIX.length + VISIBLE_SECRET_CHARS)
  return { token, prefix, hash: hashDeviceApiKey(token) }
}
