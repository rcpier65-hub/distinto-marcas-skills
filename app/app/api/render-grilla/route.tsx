// app/app/api/render-grilla/route.tsx
// Renderer Chromium-based para grillas semanales pixel-perfect.
//
// Por qué Chromium en vez de @vercel/og:
//  - @vercel/og usa satori, que NO soporta Google Fonts auto-load,
//    SVG inline complejo, blobs orgánicos, ni masks. Las plantillas
//    de marca requieren todo eso.
//  - Chromium real renderiza HTML+CSS+SVG+Fonts pixel-perfect.
//
// Runtime: Node.js (NO edge — Chromium no corre en edge runtime).
// Memoria: 1024MB en vercel.json (ver config).
// Timeout: 60s (Vercel Hobby Free permite hasta 60s en Node runtime).

import { NextResponse } from 'next/server'
import chromium from '@sparticuz/chromium-min'
import puppeteer, { type Browser } from 'puppeteer-core'
import { buildGrillaHtml } from '@/lib/grilla/template-builder'

// URL del binary compilado con shared libs incluidas (libnss3, etc).
// Cambiar al actualizar @sparticuz/chromium-min — match con el major version.
// IMPORTANTE: desde v131+ las URLs incluyen sufijo de arquitectura (.x64.tar).
// Vercel Lambda corre en x64. Ver: https://github.com/Sparticuz/chromium/releases
const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v138.0.0/chromium-v138.0.0-pack.x64.tar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DIAS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_UP = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

// Theme-builder usa SIEMPRE las mismas 2 clases de card. Alternamos para variedad.
const CARD_CLASSES = ['is-white', 'is-alt']

// Logo file: usamos PNG si existe el archivo local, sino SVG placeholder.
const LOGO_EXTENSIONS_BY_SLUG: Record<string, 'svg' | 'png'> = {
  manrique: 'png',  // Manrique tiene PNG real
  lozano: 'svg',
  'distribuidora-fitness': 'svg',
  'little-joe': 'png',  // Typhouse rebrand (22 may 2026) — PNG recortado 771×253
  kintu: 'svg',
  novalamps: 'svg',
  'la-victoria': 'svg',
}

// SVG icon de "video" — para publicaciones tipo REEL/Video
const VIDEO_ICON_SVG = `<svg viewBox="0 0 64 64"><rect x="8" y="12" width="48" height="34" rx="3"/><path d="M27 22l12 7-12 7z" fill="currentColor" stroke="none"/><path d="M22 52h20"/><path d="M32 46v6"/></svg>`
// SVG icon de "imagen" — para POST estático
const IMAGE_ICON_SVG = `<svg viewBox="0 0 64 64"><rect x="8" y="12" width="48" height="40" rx="3"/><circle cx="22" cy="26" r="5"/><path d="M8 44l14-14 10 10 10-8 14 14"/></svg>`
// SVG icon de "mensaje" — para Testimonios o Stories
const MESSAGE_ICON_SVG = `<svg viewBox="0 0 64 64"><path d="M12 12h40c2 0 4 2 4 4v24c0 2-2 4-4 4H30l-10 8v-8h-8c-2 0-4-2-4-4V16c0-2 2-4 4-4z"/></svg>`
// SVG icon de "empty" — círculo con guión
const EMPTY_ICON_SVG = `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20"/><path d="M22 32h20"/></svg>`

/**
 * Normaliza URLs de Google Drive a su formato de descarga directa.
 * Drive expone los archivos en varios formatos; solo el ?export=download&id=
 * devuelve los bytes del archivo (no HTML del viewer).
 *
 * Convierte:
 *   https://drive.google.com/file/d/FILE_ID/view → https://drive.google.com/uc?export=download&id=FILE_ID
 *   https://drive.google.com/open?id=FILE_ID    → https://drive.google.com/uc?export=download&id=FILE_ID
 *   URLs ya en formato correcto → sin cambios
 *   URLs no-Drive → sin cambios
 */
function normalizeDriveUrl(rawUrl: string): string {
  if (!rawUrl.includes('drive.google.com')) return rawUrl
  // Pattern: /file/d/FILE_ID/...
  const m1 = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return `https://drive.google.com/uc?export=download&id=${m1[1]}`
  // Pattern: ?id=FILE_ID or &id=FILE_ID
  const m2 = rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2 && !rawUrl.includes('export=download')) {
    return `https://drive.google.com/uc?export=download&id=${m2[1]}`
  }
  return rawUrl
}

function pickIcon(tipo: string[]): string {
  const t = tipo.join(' ').toLowerCase()
  if (t.includes('reel') || t.includes('video') || t.includes('tiktok')) return VIDEO_ICON_SVG
  if (t.includes('story') || t.includes('testimon')) return MESSAGE_ICON_SVG
  return IMAGE_ICON_SVG
}

type Publicacion = {
  fecha: string // YYYY-MM-DD
  titulo: string
  plataformas: string
  tipo: string
}

export async function GET(request: Request) {
  const url = new URL(request.url)

  // Auth Bearer
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const slug = url.searchParams.get('slug') ?? 'manrique'
  const semanaInicio = url.searchParams.get('inicio') ?? '2026-05-18'
  const semanaFin = url.searchParams.get('fin') ?? '2026-05-24'
  // Publicaciones vienen como JSON serializado en query param
  const pubsJson = url.searchParams.get('pubs') ?? '[]'
  let publicaciones: Publicacion[] = []
  try {
    publicaciones = JSON.parse(pubsJson) as Publicacion[]
  } catch {
    publicaciones = []
  }

  // Construir URL del logo con jerarquía:
  //   1. Query param explícito (?logo=...)
  //   2. Fallback al placeholder local /marcas/{slug}/logo.{ext}
  const proto = url.protocol
  const host = url.host
  const logoOverride = url.searchParams.get('logo')
  let logoUrl: string
  if (logoOverride) {
    logoUrl = normalizeDriveUrl(logoOverride)
  } else {
    const logoExt = LOGO_EXTENSIONS_BY_SLUG[slug] ?? 'png'
    logoUrl = `${proto}//${host}/marcas/${slug}/logo.${logoExt}`
  }

  // Generar HTML con la plantilla maestra parametrizada por theme
  const agencyLogoUrl = `${proto}//${host}/agencia/distinto-horizontal.svg`
  const datePill = buildDatePill(semanaInicio, semanaFin)
  const dateSub = buildDateSub(semanaInicio, semanaFin)
  const cardsHtml = buildCardsHtml(semanaInicio, semanaFin, publicaciones)
  const html = buildGrillaHtml({
    slug,
    logoUrl,
    agencyLogoUrl,
    datePill,
    dateSub,
    cardsHtml,
  })

  // Setup @sparticuz/chromium-min v138 (Vercel)
  // En v138 la API se simplificó: solo setGraphicsMode + executablePath + args.
  // Desactivamos GPU porque solo hacemos screenshots (no WebGL).
  chromium.setGraphicsMode = false

  // Lanzar Chromium y renderizar
  let browser: Browser | null = null
  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--hide-scrollbars',
        '--disable-web-security',
      ],
      defaultViewport: { width: 1080, height: 1620, deviceScaleFactor: 1 },
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: 'shell',  // modo headless ligero (chromium-headless-shell)
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    // Esperar a que las Google Fonts terminen de cargar
    await page.evaluate(() => document.fonts.ready)
    // Screenshot del .poster (el contenedor principal)
    const posterElement = await page.$('.poster')
    if (!posterElement) throw new Error('.poster element not found in template')
    const pngBuffer = await posterElement.screenshot({ type: 'png', omitBackground: false })

    await browser.close()
    browser = null

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (e) {
    if (browser) await browser.close().catch(() => {})
    console.error('[render-grilla] Chromium error:', e)
    return NextResponse.json(
      { ok: false, error: 'Render failed', detail: (e as Error).message?.slice(0, 500) },
      { status: 500 },
    )
  }
}

function buildDatePill(inicio: string, fin: string): string {
  const d1 = new Date(inicio + 'T12:00:00Z')
  const d2 = new Date(fin + 'T12:00:00Z')
  const mes = MESES_UP[d1.getUTCMonth()]
  const año = d1.getUTCFullYear()
  return `${d1.getUTCDate()} — ${d2.getUTCDate()} ${mes} · ${año}`
}

function buildDateSub(inicio: string, fin: string): string {
  const d1 = new Date(inicio + 'T12:00:00Z')
  const d2 = new Date(fin + 'T12:00:00Z')
  const mes = MESES_LONG[d1.getUTCMonth()]
  const diaIni = DIAS_LONG[d1.getUTCDay()].toLowerCase()
  const diaFin = DIAS_LONG[d2.getUTCDay()].toLowerCase()
  return `${mes.charAt(0).toUpperCase() + mes.slice(1)} · Del ${diaIni} ${d1.getUTCDate()} al ${diaFin} ${d2.getUTCDate()}`
}

function buildCardsHtml(inicio: string, fin: string, publicaciones: Publicacion[]): string {
  // Alternamos entre 2 classes: is-white (cardBg) e is-alt (cardAltBg) del theme
  const cardClasses = CARD_CLASSES
  const d1 = new Date(inicio + 'T12:00:00Z')
  const d2 = new Date(fin + 'T12:00:00Z')
  const numDays = Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000)) + 1

  // Indexar publicaciones por fecha
  const pubsByFecha = new Map<string, Publicacion[]>()
  for (const p of publicaciones) {
    const arr = pubsByFecha.get(p.fecha) ?? []
    arr.push(p)
    pubsByFecha.set(p.fecha, arr)
  }

  const cards: string[] = []
  let colorIdx = 0

  for (let i = 0; i < numDays; i++) {
    const d = new Date(d1)
    d.setUTCDate(d1.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const day = d.getUTCDate()
    const dayShort = DIAS_SHORT[d.getUTCDay()]
    const pubs = pubsByFecha.get(iso) ?? []

    if (pubs.length === 0) {
      cards.push(`
    <article class="card empty">
      <div class="date"><div class="day">${day}</div><div class="month">${dayShort}</div></div>
      <div class="bar"></div>
      <div class="body">
        <div class="title">Sin publicación programada</div>
        <div class="meta">— Día sin contenido en grilla —</div>
      </div>
      <div class="icon">${EMPTY_ICON_SVG}</div>
    </article>`)
    } else {
      for (const pub of pubs) {
        const colorClass = cardClasses[colorIdx % cardClasses.length]
        colorIdx++
        const icon = pickIcon([pub.tipo])
        cards.push(`
    <article class="card ${colorClass}">
      <div class="date"><div class="day">${day}</div><div class="month">${dayShort}</div></div>
      <div class="bar"></div>
      <div class="body">
        <div class="title">${escapeHtml(pub.titulo)}</div>
        <div class="meta">${escapeHtml(pub.plataformas)}${pub.tipo ? ' · ' + escapeHtml(pub.tipo) : ''}</div>
      </div>
      <div class="icon">${icon}</div>
    </article>`)
      }
    }
  }

  return cards.join('\n')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
