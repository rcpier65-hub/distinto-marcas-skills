// app/app/api/render-grilla-html/route.ts
// Devuelve el HTML de la grilla (mismo theme system que /api/render-grilla)
// pero SIN convertir a PNG. Sirve para preview en vivo en iframe.
//
// Mucho más rápido que render-grilla (no usa Chromium): ~100ms vs ~7s.

import { NextResponse } from 'next/server'
import { buildGrillaHtml } from '@/lib/grilla/template-builder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DIAS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_UP = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

const VIDEO_ICON_SVG = `<svg viewBox="0 0 64 64"><rect x="8" y="12" width="48" height="34" rx="3"/><path d="M27 22l12 7-12 7z" fill="currentColor" stroke="none"/><path d="M22 52h20"/><path d="M32 46v6"/></svg>`
const IMAGE_ICON_SVG = `<svg viewBox="0 0 64 64"><rect x="8" y="12" width="48" height="40" rx="3"/><circle cx="22" cy="26" r="5"/><path d="M8 44l14-14 10 10 10-8 14 14"/></svg>`
const MESSAGE_ICON_SVG = `<svg viewBox="0 0 64 64"><path d="M12 12h40c2 0 4 2 4 4v24c0 2-2 4-4 4H30l-10 8v-8h-8c-2 0-4-2-4-4V16c0-2 2-4 4-4z"/></svg>`
const EMPTY_ICON_SVG = `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20"/><path d="M22 32h20"/></svg>`

function pickIcon(tipo: string): string {
  const t = tipo.toLowerCase()
  if (t.includes('reel') || t.includes('video') || t.includes('tiktok')) return VIDEO_ICON_SVG
  if (t.includes('story') || t.includes('testimon')) return MESSAGE_ICON_SVG
  return IMAGE_ICON_SVG
}

type Pub = { fecha: string; titulo: string; plataformas: string; tipo: string }

export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug') ?? 'manrique'
  const semanaInicio = url.searchParams.get('inicio') ?? '2026-05-18'
  const semanaFin = url.searchParams.get('fin') ?? '2026-05-24'
  const logoOverride = url.searchParams.get('logo')
  let pubs: Pub[] = []
  try {
    pubs = JSON.parse(url.searchParams.get('pubs') ?? '[]')
  } catch {}

  // Logo URL — usa override si vino, sino el archivo local oficial.
  // Por default usamos SVG (vector, escala perfecto al render Chromium 1080×1620).
  // Little Joe es excepción: solo hay PNG blanco oficial (sin SVG vector aún).
  const proto = url.protocol
  const host = url.host
  const ext = slug === 'little-joe' ? 'png' : 'svg'
  const logoUrl = logoOverride
    ? normalizeDriveUrl(logoOverride)
    : `${proto}//${host}/marcas/${slug}/logo.${ext}`

  // Logo Distinto Agencia (footer) — URL absoluta para que Chromium PNG la cargue
  const agencyLogoUrl = `${proto}//${host}/agencia/distinto-horizontal.svg`

  const datePill = buildDatePill(semanaInicio, semanaFin)
  const dateSub = buildDateSub(semanaInicio, semanaFin)
  const cardsHtml = buildCardsHtml(semanaInicio, semanaFin, pubs)
  const html = buildGrillaHtml({ slug, logoUrl, agencyLogoUrl, datePill, dateSub, cardsHtml })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function normalizeDriveUrl(rawUrl: string): string {
  if (!rawUrl.includes('drive.google.com')) return rawUrl
  const m1 = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return `https://drive.google.com/uc?export=download&id=${m1[1]}`
  const m2 = rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2 && !rawUrl.includes('export=download')) {
    return `https://drive.google.com/uc?export=download&id=${m2[1]}`
  }
  return rawUrl
}

function buildDatePill(inicio: string, fin: string): string {
  const d1 = new Date(inicio + 'T12:00:00Z')
  const d2 = new Date(fin + 'T12:00:00Z')
  return `${d1.getUTCDate()} — ${d2.getUTCDate()} ${MESES_UP[d1.getUTCMonth()]} · ${d1.getUTCFullYear()}`
}

function buildDateSub(inicio: string, fin: string): string {
  const d1 = new Date(inicio + 'T12:00:00Z')
  const d2 = new Date(fin + 'T12:00:00Z')
  return `${MESES_LONG[d1.getUTCMonth()].charAt(0).toUpperCase() + MESES_LONG[d1.getUTCMonth()].slice(1)} · Del ${DIAS_LONG[d1.getUTCDay()].toLowerCase()} ${d1.getUTCDate()} al ${DIAS_LONG[d2.getUTCDay()].toLowerCase()} ${d2.getUTCDate()}`
}

function buildCardsHtml(inicio: string, fin: string, publicaciones: Pub[]): string {
  const cardClasses = ['is-white', 'is-alt']
  const d1 = new Date(inicio + 'T12:00:00Z')
  const d2 = new Date(fin + 'T12:00:00Z')
  const numDays = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1
  const pubsByFecha = new Map<string, Pub[]>()
  for (const p of publicaciones) {
    const arr = pubsByFecha.get(p.fecha) ?? []
    arr.push(p)
    pubsByFecha.set(p.fecha, arr)
  }
  const cards: string[] = []
  let colorIdx = 0
  for (let i = 0; i < numDays; i++) {
    const d = new Date(d1); d.setUTCDate(d1.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const day = d.getUTCDate()
    const dayShort = DIAS_SHORT[d.getUTCDay()]
    const pubs = pubsByFecha.get(iso) ?? []
    if (pubs.length === 0) {
      cards.push(`<article class="card empty"><div class="date"><div class="day">${day}</div><div class="month">${dayShort}</div></div><div class="bar"></div><div class="body"><div class="title">Sin publicación programada</div><div class="meta">— Día sin contenido en grilla —</div></div><div class="icon">${EMPTY_ICON_SVG}</div></article>`)
    } else {
      for (const pub of pubs) {
        const cls = cardClasses[colorIdx % cardClasses.length]; colorIdx++
        cards.push(`<article class="card ${cls}"><div class="date"><div class="day">${day}</div><div class="month">${dayShort}</div></div><div class="bar"></div><div class="body"><div class="title">${escapeHtml(pub.titulo)}</div><div class="meta">${escapeHtml(pub.plataformas)}${pub.tipo ? ' · ' + escapeHtml(pub.tipo) : ''}</div></div><div class="icon">${pickIcon(pub.tipo)}</div></article>`)
      }
    }
  }
  return cards.join('\n')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
