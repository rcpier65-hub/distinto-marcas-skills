// app/lib/grilla/template-builder.ts
// Generador de HTML de la grilla semanal. Una sola plantilla "maestra" basada
// en Manrique, parametrizada por theme. Todas las marcas usan el MISMO layout
// pero con sus colores/fuentes/identidad.
//
// Filosofía: consistency over customization. Si después una marca pide layout
// drásticamente diferente, se hace una plantilla custom. Por ahora, una sola.

import { getTheme, type GrillaTheme } from './themes'

export type TemplateInput = {
  slug: string
  logoUrl: string
  datePill: string       // "18 — 24 MAY · 2026"
  dateSub: string        // "Mayo · Del lunes 18 al domingo 24"
  cardsHtml: string      // HTML pre-generado de las cards
}

export function buildGrillaHtml(input: TemplateInput): string {
  const t = getTheme(input.slug)
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Grilla ${input.slug}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${t.fontsUrl}" rel="stylesheet">
<style>
  ${buildCss(t)}
</style>
</head>
<body>
<div class="poster">
  <div class="blob tr"></div>
  <div class="blob bl"></div>

  <header class="header">
    <img class="logo" src="${escapeHtml(input.logoUrl)}" alt="${escapeHtml(t.brandBig)}" />
    <div class="brand-name">
      <div class="small">${escapeHtml(t.brandSmall)}</div>
      <div class="big">${escapeHtml(t.brandBig)}</div>
    </div>
    <div class="date-pill">${escapeHtml(input.datePill)}</div>
  </header>

  <section class="hero">
    <h1>¿Qué se viene?</h1>
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
    <div class="agency">
      <span class="agency-dot"></span>
      DISTINTO · AGENCIA
      <span class="agency-dot"></span>
    </div>
    <div class="url">${escapeHtml(t.footerUrl)}</div>
  </footer>
</div>
</body>
</html>`
}

/**
 * CSS común parametrizado por theme.
 * Se basa en la plantilla de Manrique que ya funciona bien — solo cambian
 * los valores de color/fuente que vienen del theme.
 */
function buildCss(t: GrillaTheme): string {
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
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #2c2c2c; font-family: var(--sans); color: var(--text);
    -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
  body { display: flex; justify-content: center; padding: 0; margin: 0; }
  .poster { width: 1080px; height: 1620px; background: var(--canvas); position: relative;
    overflow: hidden; padding: 55px 70px 45px; display: flex; flex-direction: column;
    box-shadow: 0 30px 80px rgba(0,0,0,.35); }
  .blob { position: absolute; background: var(--accent); opacity: .18;
    filter: blur(2px); border-radius: 50%; pointer-events: none; }
  .blob.tr { width: 380px; height: 220px; top: -110px; right: -130px;
    transform: rotate(-25deg); border-radius: 60% 40% 50% 50% / 60% 50% 50% 40%; }
  .blob.bl { width: 420px; height: 260px; bottom: -120px; left: -150px;
    transform: rotate(15deg); border-radius: 50% 50% 60% 40% / 50% 60% 40% 50%; }

  .header { display: flex; align-items: center; gap: 20px; margin-bottom: 8px;
    position: relative; z-index: 2; }
  .logo { width: 160px; height: 160px; flex-shrink: 0; object-fit: contain;
    margin: -20px -10px -20px -20px; background: var(--white); border-radius: 12px;
    padding: 14px; }
  .brand-name { flex: 1; }
  .brand-name .small { font-size: 18px; font-weight: 500; letter-spacing: 4px;
    color: var(--primary); line-height: 1; margin-bottom: 6px; opacity: .85;
    text-transform: uppercase; }
  .brand-name .big { font-size: 48px; font-weight: 800; letter-spacing: 1px;
    color: var(--primary); line-height: 1; }
  .date-pill { background: var(--primary); color: var(--white); font-weight: 600;
    font-size: 18px; letter-spacing: .8px; padding: 12px 22px; border-radius: 999px;
    white-space: nowrap; align-self: center; }

  .hero { text-align: center; margin: 24px 0 26px; position: relative; z-index: 2; }
  .hero h1 { font-family: var(--serif); font-style: italic; font-weight: 500;
    font-size: 96px; color: var(--primary); line-height: .95; letter-spacing: -1px;
    white-space: nowrap; }
  .hero .sub { font-size: 20px; font-weight: 400; color: var(--primary);
    margin-top: 10px; letter-spacing: .3px; opacity: .85; }
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
  .card .date .day { font-size: 58px; font-weight: 800; color: var(--primary);
    line-height: .9; letter-spacing: -1px; }
  .card .date .month { font-size: 16px; font-weight: 700; color: var(--acc-color, var(--primary));
    letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
  .card .bar { width: 3px; height: 64px; background: var(--acc-color, var(--primary));
    border-radius: 2px; opacity: .8; flex-shrink: 0; }
  .card .body { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .card .body .title { font-size: 28px; font-weight: 700; color: var(--primary);
    line-height: 1.1; letter-spacing: -.3px; }
  .card .body .meta { font-size: 15px; font-weight: 500; color: var(--primary);
    letter-spacing: .2px; opacity: .75; }
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
    color: var(--accent); margin-bottom: 8px; }
  .footer .agency { display: inline-flex; align-items: center; gap: 12px;
    font-size: 18px; font-weight: 700; color: var(--primary);
    letter-spacing: 4px; text-transform: uppercase; }
  .footer .agency-dot { width: 7px; height: 7px; background: var(--accent);
    border-radius: 50%; }
  .footer .url { font-size: 12px; font-weight: 400; color: var(--primary);
    margin-top: 6px; letter-spacing: 2px; opacity: .65; }
  `
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
