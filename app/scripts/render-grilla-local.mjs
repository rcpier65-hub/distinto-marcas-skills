// scripts/render-grilla-local.mjs
// Debug: renderiza la grilla con Chromium del Mac (no serverless) para comparar
// contra el render serverless en Vercel y aislar si el bug es el render o el HTML.
//
// Uso: node scripts/render-grilla-local.mjs [slug] [inicio] [fin] [out]
// Default: little-joe 2026-05-18 2026-05-24 /tmp/grilla-debug.png

import puppeteer from 'puppeteer-core'

const SLUG = process.argv[2] ?? 'little-joe'
const INICIO = process.argv[3] ?? '2026-05-18'
const FIN = process.argv[4] ?? '2026-05-24'
const OUT = process.argv[5] ?? '/tmp/grilla-debug.png'

// Llamamos el endpoint HTML público (no requiere auth) para obtener el HTML
// con los mismos parámetros que usaría el endpoint PNG serverless.
const pubs = [
  { fecha: '2026-05-18', titulo: 'Branding de marca', plataformas: 'Instagram · TikTok', tipo: 'Reel' },
  { fecha: '2026-05-20', titulo: 'Identidad visual', plataformas: 'Instagram', tipo: 'Carrusel' },
  { fecha: '2026-05-22', titulo: 'Casos de éxito', plataformas: 'Instagram · Facebook', tipo: 'Post' },
]
const params = new URLSearchParams({
  slug: SLUG,
  inicio: INICIO,
  fin: FIN,
  pubs: JSON.stringify(pubs),
})

const htmlUrl = `https://distinto-app.vercel.app/api/render-grilla-html?${params.toString()}`
console.log('[debug] Loading HTML from:', htmlUrl)

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  defaultViewport: { width: 1080, height: 1620, deviceScaleFactor: 1 },
  args: ['--hide-scrollbars', '--no-sandbox'],
})

const page = await browser.newPage()
await page.setViewport({ width: 1080, height: 1620, deviceScaleFactor: 1 })
await page.goto(htmlUrl, { waitUntil: 'networkidle0', timeout: 30000 })

// Esperar fonts
await page.evaluate(() => document.fonts.ready)
await new Promise(r => setTimeout(r, 1500))

const poster = await page.$('.poster')
if (!poster) {
  console.error('[debug] .poster element NOT FOUND')
  await browser.close()
  process.exit(1)
}

const bbox = await poster.boundingBox()
console.log('[debug] .poster bbox:', bbox)

await poster.screenshot({ path: OUT, type: 'png', omitBackground: false })
console.log('[debug] Screenshot saved →', OUT)

await browser.close()
