import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export function sha256(value: string) { return createHash('sha256').update(value).digest('base64url') }
export function nonce() { return randomBytes(32).toString('base64url') }
export function equalState(left: string, right: string) {
  const a = Buffer.from(left), b = Buffer.from(right)
  return a.length === b.length && a.length >= 32 && timingSafeEqual(a,b)
}
function key() {
  const raw = Buffer.from(process.env.META_MCP_ENCRYPTION_KEY || '', 'base64')
  if (raw.length !== 32) throw new Error('Configuración de Meta pendiente')
  return raw
}
export function encrypt(value: string, context: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv)
  cipher.setAAD(Buffer.from(context))
  const data = Buffer.concat([cipher.update(value,'utf8'),cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.')
}
export function decrypt(value: string, context: string) {
  const [v,iv,tag,data,...extra] = value.split('.')
  if(v!=='v1'||!iv||!tag||!data||extra.length)throw new Error('Autorización de Meta no disponible')
  const decipher = createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64url'))
  decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(tag,'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8')
}
