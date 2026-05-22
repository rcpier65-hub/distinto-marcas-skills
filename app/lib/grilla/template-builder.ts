// app/lib/grilla/template-builder.ts
// Generador de HTML de la grilla semanal.
// Filosofía: una BASE común (estructura HTML + CSS reset/grid) + DELTAS por
// marca (decoraciones, extra CSS, hero override). El dispatcher lee
// theme.style y llama al style module correspondiente.
//
// Esto permite que cada marca tenga su propio "mood" sin duplicar el HTML
// completo. Manrique es clinical-warm, Lozano es artisan-craft, etc.
// (Ver styles/ para cada implementación.)

import { getTheme, type GrillaTheme } from './themes'
import { getStyleBuilder } from './styles'

export type TemplateInput = {
  slug: string
  logoUrl: string
  agencyLogoUrl?: string // URL del logo SVG de Distinto Agencia (default: /agencia/distinto-horizontal.svg)
  datePill: string       // "18 — 24 MAY · 2026"
  dateSub: string        // "Mayo · Del lunes 18 al domingo 24"
  cardsHtml: string      // HTML pre-generado de las cards
}

export function buildGrillaHtml(input: TemplateInput): string {
  const t = getTheme(input.slug)
  const blocks = getStyleBuilder(t.style)(t)
  const heroTitle = blocks.heroTitleOverride ?? t.heroTitle ?? '¿Qué se viene?'

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Grilla ${input.slug}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${t.fontsUrl}" rel="stylesheet">
<style>
  ${buildBaseCss(t)}
  ${blocks.extraCss}
</style>
</head>
<body>
<div class="poster">
  ${blocks.decorations}

  <header class="header">
    <img class="logo" src="${escapeHtml(input.logoUrl)}" alt="${escapeHtml(t.brandBig)}" />
    <div class="brand-name">
      <div class="small">${escapeHtml(t.brandSmall)}</div>
      <div class="big">${escapeHtml(t.brandBig)}</div>
    </div>
    <div class="date-pill">${escapeHtml(input.datePill)}</div>
  </header>

  <section class="hero">
    <h1>${escapeHtml(heroTitle)}</h1>
    <div class="sub">${escapeHtml(input.dateSub)}</div>
    <div class="divider">
      <span class="line"></span><span class="dot"></span><span class="line"></span>
    </div>
  </section>

  <section class="cards">
    ${input.cardsHtml}
  </section>

  <footer class="footer">
    <div class="tagline">${escapeHtml(t.tagline)}</div>
    <div class="agency-mark">
      <img class="agency-logo" src="${escapeHtml(input.agencyLogoUrl ?? '/agencia/distinto-horizontal.svg')}" alt="Distinto · Agencia de Marketing" />
    </div>
    <div class="url">${escapeHtml(t.footerUrl)}</div>
    ${blocks.footerExtra ?? ''}
  </footer>
</div>
</body>
</html>`
}

/**
 * CSS BASE común a todas las marcas. Define el grid, layout, dimensiones
 * fijas 1080x1620, y un mood neutro. Cada style module sobreescribe lo
 * que necesita vía `extraCss` (que se concatena DESPUÉS de este base).
 */
function buildBaseCss(t: GrillaTheme): string {
  const logoBg = t.logoBg ?? '#FFFFFF'
  const logoPad = t.logoPad ?? '14px'
  return `
  :root {
    --primary:    ${t.primary};
    --accent:     ${t.accent};
    --highlight:  ${t.highlight};
    --canvas:     ${t.canvas};
    --white:      #FFFFFF;
    --text:       ${t.text};
    --card-bg:    ${t.cardBg};
    --card-alt:   ${t.cardAltBg};
    --serif:      ${t.fontSerif};
    --sans:       ${t.fontSans};
    --logo-bg:    ${logoBg};
    --logo-pad:   ${logoPad};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #2c2c2c; font-family: var(--sans); color: var(--text);
    -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
  body { display: flex; justify-content: center; padding: 0; margin: 0; }
  .poster { width: 1080px; height: 1620px; background: var(--canvas); position: relative;
    overflow: hidden; padding: 55px 70px 45px; display: flex; flex-direction: column;
    box-shadow: 0 30px 80px rgba(0,0,0,.35); }

  .header { display: flex; align-items: center; gap: 20px; margin-bottom: 8px;
    position: relative; z-index: 2; }
  .logo { width: 160px; height: 160px; flex-shrink: 0; object-fit: contain;
    margin: -20px -10px -20px -20px; background: var(--logo-bg); border-radius: 12px;
    padding: var(--logo-pad); }
  .brand-name { flex: 1; }
  .brand-name .small { font-size: 18px; font-weight: 500; letter-spacing: 4px;
    color: var(--primary); line-height: 1; margin-bottom: 6px; opacity: .85;
    text-transform: uppercase; }
  .brand-name .big { font-family: var(--serif); font-size: 48px; font-weight: 800;
    letter-spacing: 1px; color: var(--primary); line-height: 1; }
  .date-pill { background: var(--primary); color: var(--white); font-weight: 600;
    font-size: 18px; letter-spacing: .8px; padding: 12px 22px; border-radius: 999px;
    white-space: nowrap; align-self: center; }

  .hero { text-align: center; margin: 24px 0 26px; position: relative; z-index: 2; }
  .hero h1 { font-family: var(--serif); font-weight: 500;
    font-size: 96px; color: var(--primary); line-height: .95; letter-spacing: -1px;
    white-space: nowrap; }
  .hero .sub { font-family: var(--sans); font-size: 20px; font-weight: 400;
    color: var(--primary); margin-top: 10px; letter-spacing: .3px; opacity: .85; }
  .divider { display: flex; align-items: center; justify-content: center;
    gap: 10px; margin-top: 14px; }
  .divider .line { width: 180px; height: 2px; background: var(--highlight);
    border-radius: 2px; }
  .divider .dot  { width: 10px; height: 10px; background: var(--accent);
    border-radius: 50%; }

  .cards { display: flex; flex-direction: column; gap: 14px; margin-top: 6px;
    position: relative; z-index: 2; }
  .card { background: var(--card-bg-active, var(--card-bg)); border-radius: 18px;
    padding: 18px 28px; display: flex; align-items: center; gap: 22px;
    min-height: 96px; position: relative; }
  .card .date { flex-shrink: 0; text-align: left; min-width: 90px; }
  .card .date .day { font-family: var(--serif); font-size: 58px; font-weight: 800;
    color: var(--primary); line-height: .9; letter-spacing: -1px; }
  .card .date .month { font-family: var(--sans); font-size: 16px; font-weight: 700;
    color: var(--acc-color, var(--primary)); letter-spacing: 2px; text-transform: uppercase;
    margin-top: 2px; }
  .card .bar { width: 3px; height: 64px; background: var(--acc-color, var(--primary));
    border-radius: 2px; opacity: .8; flex-shrink: 0; }
  .card .body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .card .body .title { font-family: var(--sans); font-size: 28px; font-weight: 700;
    color: var(--primary); line-height: 1.1; letter-spacing: -.3px; }
  .card .body .meta { font-family: var(--sans); font-size: 15px; font-weight: 500;
    color: var(--primary); letter-spacing: .2px; opacity: .75; }
  .card .icon { flex-shrink: 0; width: 64px; height: 64px; color: var(--primary); }
  .card .icon svg { width: 100%; height: 100%; stroke: currentColor; fill: none;
    stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

  .card.empty { background: transparent; border: 2px dashed rgba(0,0,0,.12);
    min-height: 64px; padding: 14px 28px; }
  .card.empty .body .title { font-size: 18px; font-weight: 500; opacity: .45; }
  .card.empty .body .meta { font-size: 13px; opacity: .35; }
  .card.empty .bar { opacity: 0; }
  .card.empty .date .day { font-size: 38px; opacity: .35; }
  .card.empty .date .month { opacity: .35; }
  .card.empty .icon { opacity: .2; width: 36px; height: 36px; }

  .card.is-white { --card-bg-active: var(--card-bg);  --acc-color: var(--accent); }
  .card.is-alt   { --card-bg-active: var(--card-alt); --acc-color: var(--primary); }

  .footer { margin-top: auto; padding-top: 14px; text-align: center;
    position: relative; z-index: 2; }
  .footer .tagline { font-family: var(--serif); font-style: italic; font-size: 18px;
    color: var(--accent); margin-bottom: 10px; }
  .footer .agency-mark { display: flex; justify-content: center; align-items: center;
    margin: 8px 0 6px; }
  .footer .agency-logo { height: 56px; width: auto; max-width: 320px;
    object-fit: contain; }
  .footer .url { font-size: 12px; font-weight: 400; color: var(--primary);
    margin-top: 4px; letter-spacing: 2px; opacity: .65; }
  `
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
