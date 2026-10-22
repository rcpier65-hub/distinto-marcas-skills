// Node-only cryptography; imported by the private route and provisioning script.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

function key() {
  const raw = process.env.CLIENT_ACCESS_ENCRYPTION_KEY
  const value = Buffer.from(raw || '', 'base64')
  if (!raw || value.length !== 32) throw new Error('Accesos privados no configurados')
  return value
}
const context = (brand: string, resource: string) => `client-portal:v1:${brand}:${resource}`
export function encryptAccess(value: string, brand: string, resource: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv)
  cipher.setAAD(Buffer.from(context(brand, resource)))
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.')
}
export function decryptAccess(value: string, brand: string, resource: string) {
  const [version, iv, tag, encrypted, extra] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !encrypted || extra) throw new Error('Acceso no disponible')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAAD(Buffer.from(context(brand, resource)))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8')
}
export function hashAccessPin(pin: string) {
  const salt = randomBytes(16)
  return `v1.${salt.toString('base64url')}.${scryptSync(pin, salt, 32).toString('base64url')}`
}
export function verifyAccessPin(pin: string, stored: string) {
  const [version, salt, hash, extra] = stored.split('.')
  if (version !== 'v1' || !salt || !hash || extra || pin.length > 16) return false
  const expected = Buffer.from(hash, 'base64url')
  return expected.length === 32 && timingSafeEqual(scryptSync(pin, Buffer.from(salt, 'base64url'), 32), expected)
}
