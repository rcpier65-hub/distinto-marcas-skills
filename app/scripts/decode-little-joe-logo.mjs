// Decodifica el logo FONDO NEGRO PNG-8 de Little Joe a archivo binario.
// Uso: NEW_LOGO_BASE64=<contenido> node scripts/decode-little-joe-logo.mjs
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const txtFile = resolve(import.meta.dirname, 'little-joe-logo.b64.txt')
const b64 = readFileSync(txtFile, 'utf8').replace(/\s+/g, '')
const buf = Buffer.from(b64, 'base64')
const out = resolve(import.meta.dirname, '..', 'public', 'marcas', 'little-joe', 'logo.png')
writeFileSync(out, buf)
console.log(`✅ Saved ${buf.length} bytes to ${out}`)
