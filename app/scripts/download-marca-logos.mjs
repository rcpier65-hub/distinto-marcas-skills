#!/usr/bin/env node
/**
 * Descarga los logos de cada marca desde Google Drive a public/marcas/{slug}/logo.png
 *
 * Uso:
 *   node scripts/download-marca-logos.mjs
 *   node scripts/download-marca-logos.mjs --only=lozano,manrique
 *
 * Primera vez:
 *   1. Necesitás credenciales OAuth de Google. Bajalas desde Google Cloud Console:
 *      → https://console.cloud.google.com/apis/credentials
 *      → Create OAuth 2.0 Client ID (type: Desktop App)
 *      → Download JSON → guardalo como `scripts/credentials.json` (gitignored)
 *   2. El primer run abre tu browser para autorizar → token queda en `scripts/token.json`
 *   3. Re-runs usan el token guardado (no abre browser)
 *
 * Para agregar una marca nueva, agregá una línea al LOGOS array con su file ID de Drive.
 * Para encontrar el file ID: abrí el archivo en Drive → URL `https://drive.google.com/file/d/{FILE_ID}/view`
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { authenticate } from '@google-cloud/local-auth'
import { google } from 'googleapis'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TOKEN_PATH = resolve(__dirname, 'token.json')
const CREDENTIALS_PATH = resolve(__dirname, 'credentials.json')
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

const PUBLIC_MARCAS_DIR = resolve(__dirname, '..', 'public', 'marcas')

// ============================================================
// Mapeo de logos por marca
// ============================================================
// Source: 1. GESTIÓN > CUENTAS > {marca}/01 - IDENTIDAD DE MARCA/
// IDs verificados con tool de Drive el 2026-05-20.
const LOGOS = [
  {
    slug: 'manrique',
    fileId: '1QnCURrdr9wwNmbkSSFZ0Y_DlPb92r2Tz',
    fileName: 'logo-manrique.png',
    driveFolder: '1penkWthHbPHMraU7Zu6wug6aEEMWoKNc',
    driveFolderName: '2. Centro Psicológico Manrique ABA',
    notes: '153 KB. Versión PNG principal. También existe manrique_logo.svg (ID: 1PZsN-xJnmVVMfKFo8CqH7dpZqth3jr1H)',
  },
  {
    slug: 'lozano',
    fileId: '1JcGAEzTRvvphkoa_kHnVrfMHBHmPr0VE',
    fileName: 'logo-lozano.png',
    driveFolder: '1TTrX8bKz63QhYNFstVUB_nTmmf6Xw4om',
    driveFolderName: '1. Muebles Lozano',
    notes: '120 KB. Logo completo con wordmark.',
  },
  {
    slug: 'novalamps',
    fileId: '1F-tGrsUowAb1EQpUq-jlrBFwU2kwAb-n',
    fileName: 'logo-novalamps-negro-verde.png',
    driveFolder: '15BY95V0wC-PcAl5Ko5bcO7DTJvz_Jit9',
    driveFolderName: '7. NovaLamps',
    notes: '11 KB. PNG negro+verde lima. Carpeta LOGO tiene varias variantes.',
  },

  // ──────────────────────────────────────────────────────────
  // TODO: completar IDs cuando Pedro confirme cuál es el logo principal
  // ──────────────────────────────────────────────────────────
  // {
  //   slug: 'distribuidora-fitness',
  //   fileId: '???',
  //   fileName: '???',
  //   driveFolder: '12RGhdLvul0u75iUETeQVlzO7UJKwS6N_',
  //   driveFolderName: '3. Distribuidora Fitness Marketing',
  //   notes: 'Pendiente: ubicar logo oficial en folder IDENTIDAD DE MARCA',
  // },
  // {
  //   slug: 'little-joe',
  //   fileId: '???',
  //   fileName: '???',
  //   driveFolder: '1Noc-_cfl9XVGm8LCW99xSpVxsjRypT0d',
  //   driveFolderName: '4. Little Joe',
  //   notes: 'Pendiente: ubicar logo oficial. Marca italiana, posible logo en KIT DE MARCA 2026',
  // },
  // {
  //   slug: 'kintu',
  //   fileId: '???',
  //   fileName: '???',
  //   driveFolder: '14xhorhp6fp5lJ7bB_XWKjvTI4-D4cvKv',
  //   driveFolderName: '6. Kintu',
  //   notes: 'Pendiente: ubicar logo oficial. Posible logo en BRANDING o KIT DE MARCA 2026',
  // },
  // {
  //   slug: 'la-victoria',
  //   fileId: '???',
  //   fileName: '???',
  //   driveFolder: '1IenWPwFfuTqkZv4w_NaJ1fQwSls9uIwg',
  //   driveFolderName: '8. La Victoria',
  //   notes: 'Pendiente: ubicar logo oficial. Carpeta IDENTIDAD DE MARCA aún vacía en sub-carpetas',
  // },
]

// ============================================================
// Auth + descarga
// ============================================================

async function loadSavedCredentialsIfExist() {
  try {
    const content = await readFile(TOKEN_PATH, 'utf8')
    const credentials = JSON.parse(content)
    return google.auth.fromJSON(credentials)
  } catch {
    return null
  }
}

async function saveCredentials(client) {
  const content = await readFile(CREDENTIALS_PATH, 'utf8')
  const keys = JSON.parse(content)
  const key = keys.installed || keys.web
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  })
  await writeFile(TOKEN_PATH, payload)
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist()
  if (client) return client
  if (!existsSync(CREDENTIALS_PATH)) {
    console.error(`❌ Falta ${CREDENTIALS_PATH}`)
    console.error('   Bajá credentials.json desde Google Cloud Console:')
    console.error('   https://console.cloud.google.com/apis/credentials')
    console.error('   Crear OAuth 2.0 Client ID tipo "Desktop App" → Download JSON')
    process.exit(1)
  }
  client = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH })
  if (client.credentials) await saveCredentials(client)
  return client
}

async function downloadFile(drive, fileId, destPath) {
  const dir = dirname(destPath)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  )
  await writeFile(destPath, Buffer.from(res.data))
  const stats = await import('node:fs').then((m) => m.promises.stat(destPath))
  return stats.size
}

// ============================================================
// Main
// ============================================================

async function main() {
  // Parse --only=slug1,slug2
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const only = onlyArg ? onlyArg.split('=')[1].split(',') : null

  const auth = await authorize()
  const drive = google.drive({ version: 'v3', auth })

  console.log(`📥 Descargando logos a ${PUBLIC_MARCAS_DIR}\n`)

  let ok = 0
  let skip = 0
  let fail = 0

  for (const logo of LOGOS) {
    if (only && !only.includes(logo.slug)) {
      console.log(`  ⏭  ${logo.slug.padEnd(25)} (skip — no en --only)`)
      skip++
      continue
    }

    const dest = resolve(PUBLIC_MARCAS_DIR, logo.slug, 'logo.png')

    try {
      const size = await downloadFile(drive, logo.fileId, dest)
      console.log(`  ✅ ${logo.slug.padEnd(25)} ${size.toLocaleString()} bytes ← ${logo.fileName}`)
      ok++
    } catch (e) {
      console.error(`  ❌ ${logo.slug.padEnd(25)} ${e.message}`)
      fail++
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Total: ${ok} ok · ${skip} skip · ${fail} fail`)

  if (fail > 0) process.exit(1)
}

main().catch((e) => {
  console.error('❌ Fatal:', e)
  process.exit(1)
})
