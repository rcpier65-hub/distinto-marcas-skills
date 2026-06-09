// Genera los iconos PWA a partir del isotipo Distinto.
// Outputs en public/icons/ y favicon en public/.
//
// - icon-192.png       : Android home screen, manifest icon
// - icon-512.png       : Splash screen, app install dialog
// - icon-192-maskable  : Android adaptive icon (safe zone)
// - icon-512-maskable  : ídem en grande
// - apple-touch-icon.png (180x180) : iOS/macOS Safari
// - favicon-32.png + favicon.ico   : pestañas del browser

import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC_SVG = join(ROOT, 'public/brand/isotipo.svg')
const OUT_ICONS = join(ROOT, 'public/icons')
const OUT_PUBLIC = join(ROOT, 'public')

/* Color de marca Distinto: violeta #ba41f7. El isotipo viene del SVG
   (texto negro sobre transparente). Para fondos de PWA queremos
   blanco — el sistema operativo aplica el background del manifest
   detrás. Para maskable, usamos un padding del 20% (safe zone). */
const SVG_RAW = await readFile(SRC_SVG, 'utf-8')

await mkdir(OUT_ICONS, { recursive: true })

async function renderPng(size, opts = {}) {
  const { maskable = false, background = '#ffffff' } = opts
  // Para maskable: el icono debe estar centrado con 20% de padding (safe zone)
  // Hacemos el isotipo a ~60% del canvas si maskable, 80% normal
  const inner = maskable ? Math.round(size * 0.6) : Math.round(size * 0.8)
  const innerBuffer = await sharp(Buffer.from(SVG_RAW))
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  /* Componer sobre fondo blanco para maskable / 'any' */
  const pad = Math.round((size - inner) / 2)
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: innerBuffer, top: pad, left: pad }])
    .png()
    .toBuffer()
}

/* 192px y 512px normales + maskable */
const tasks = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-192-maskable.png', size: 192, maskable: true },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180 },  /* iOS/macOS */
]

for (const t of tasks) {
  const buf = await renderPng(t.size, { maskable: t.maskable })
  const out = join(OUT_ICONS, t.name)
  await writeFile(out, buf)
  console.log(`  ✓ ${t.name} (${t.size}×${t.size})`)
}

/* Favicon 32 */
const fav32 = await renderPng(32, {})
await writeFile(join(OUT_PUBLIC, 'favicon-32.png'), fav32)
console.log(`  ✓ favicon-32.png`)

/* Apple touch icon en la raíz también — Safari lo busca ahí por convención */
const apple = await renderPng(180, {})
await writeFile(join(OUT_PUBLIC, 'apple-touch-icon.png'), apple)
console.log(`  ✓ apple-touch-icon.png (raíz)`)

console.log('\nListo. Iconos generados en public/icons/ y public/')
