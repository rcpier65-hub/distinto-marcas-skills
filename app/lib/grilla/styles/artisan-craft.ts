// app/lib/grilla/styles/artisan-craft.ts
// Muebles Lozano — ESTILO v2 (22 may 2026).
// Referencia visual: post "Día de la Madre 2026" + brochure + manual 2019.
//
// Mood: EDITORIAL ELEGANTE DARK LUXURY · Magazine de interiorismo premium
//   Canvas negro `#0C0C12` (manual oficial) protagonista
//   Acentos amarillo dorado `#DCC32C` para énfasis y palabras destacadas
//   Hero serif italic delgada blanco + palabra destacada amarilla
//   Sans uppercase tracking ancho para labels institucionales
//   Barra amarilla vertical pequeña como firma visual
//
// CAMBIO TOTAL vs v1: la v1 era Oswald industrial-blueprint con crema warm.
// La v2 sigue el post DM real: editorial dark luxury con serif italic + amarillo.

import type { StyleBuilder } from './types'

export const artisanCraft: StyleBuilder = () => ({
  decorations: `
    <div class="bar-firma top"></div>
    <div class="bar-firma bottom"></div>
    <div class="gold-glow"></div>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Negro oficial #0C0C12. Sutil glow dorado central para profundidad. */
    .poster {
      background: #0C0C12 !important;
      position: relative;
    }
    /* Glow dorado central muy sutil — profundidad sin saturar */
    .gold-glow {
      position: absolute; inset: 0; z-index: 0;
      background: radial-gradient(ellipse 900px 700px at 50% 35%, rgba(220,195,44,0.06) 0%, transparent 70%);
      pointer-events: none;
    }

    /* Barras amarillas verticales en bordes del poster (firma visual editorial) */
    .bar-firma {
      position: absolute; width: 3px; background: var(--accent);
      z-index: 2; box-shadow: 0 0 12px rgba(220,195,44,0.4);
    }
    .bar-firma.top { top: 70px; bottom: 50%; left: 60px; }
    .bar-firma.bottom { top: 50%; bottom: 70px; right: 60px; }

    /* ═══════════════ HEADER ═══════════════
       Logo arriba izquierda + brand-name visible (post DM lo muestra completo).
       Logo aspect 1.09:1 → 90×82px (cuadrado pequeño). El brand-name es la
       "firma" tipográfica del header (espejo del post DM "MUEBLES LOZANO"). */
    .header {
      position: relative; z-index: 3;
      gap: 22px !important;
      margin-bottom: 20px !important;
      align-items: center !important;
    }
    .logo {
      margin: 0 !important;
      width: 100px !important;
      height: 92px !important;
      padding: 0 !important;
      object-position: left center !important;
      /* Logo original es negro+amarillo. Sobre dark, el negro desaparece.
         Filter: invert para que el negro→blanco + sepia+saturate refuerza
         el amarillo. (similar lógica a LV pero con tinte amarillo no madera) */
      filter: brightness(0) invert(1) sepia(0.5) saturate(2.5) hue-rotate(5deg);
    }
    /* Brand-name VISIBLE (post DM lo usa). Versión "MUEBLES LOZANO" serif fina
       + sub "MUEBLES A MEDIDA · LIMA, PERÚ" sans tracking ancho */
    .brand-name { display: flex !important; flex-direction: column; gap: 4px; flex: 1; }
    .brand-name .big {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: normal !important;
      font-weight: 500 !important;
      font-size: 36px !important;
      letter-spacing: 5px !important;
      text-transform: uppercase;
      color: var(--primary) !important;
      line-height: 1 !important;
    }
    .brand-name .small {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 3px !important;
      text-transform: uppercase;
      color: var(--primary) !important;
      opacity: 0.55 !important;
      font-size: 11px !important;
    }

    /* Date pill — sans uppercase tracking ancho amarillo + underline
       (espejo del "DÍA DE LA MADRE · 2026" del post DM) */
    .date-pill {
      margin-left: auto !important;
      background: transparent !important;
      color: var(--accent) !important;
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      letter-spacing: 3px !important;
      text-transform: uppercase;
      padding: 8px 0 !important;
      border-radius: 0 !important;
      border-bottom: 2px solid var(--accent) !important;
    }

    /* ═══════════════ HERO ═══════════════
       Serif italic delgada blanco + última palabra en amarillo
       (espejo del "un lugar / único." del post DM) */
    .hero {
      position: relative; z-index: 3;
      margin: 32px 0 30px !important;
      text-align: center !important;
    }
    .hero h1 {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 500 !important;
      font-size: 124px !important;
      letter-spacing: -2px !important;
      line-height: 0.95 !important;
      color: var(--primary) !important;
    }
    /* Última letra del hero en amarillo (acento sutil) */
    .hero h1::first-line { color: var(--primary); }
    .hero .sub {
      font-family: 'Inter', sans-serif !important;
      font-style: normal !important;
      font-weight: 500 !important;
      letter-spacing: 4px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
      margin-top: 14px !important;
    }
    /* Underline amarillo debajo del sub (firma visual del post DM) */
    .divider { margin-top: 10px !important; }
    .divider .line {
      background: var(--accent) !important;
      opacity: 1;
      height: 2px !important;
      width: 60px !important;
      box-shadow: 0 0 10px rgba(220,195,44,0.4);
    }
    .divider .dot { display: none !important; }

    /* ═══════════════ CARDS BLANCAS (paneles editoriales) ═══════════════
       Cards blancas con borde amarillo izquierdo + título serif fino
       + DD en serif italic dorado grande (espejo del estilo Playfair italic) */
    .cards {
      position: relative; z-index: 3;
      gap: 11px !important;
    }
    .card {
      background: var(--card-bg) !important;
      border-radius: 2px !important;
      border-left: 4px solid var(--accent) !important;
      box-shadow: 0 8px 30px rgba(0,0,0,0.55);
      padding: 16px 26px !important;
      display: flex !important;
      align-items: center !important;
      gap: 22px !important;
    }
    .card.is-alt {
      background: var(--card-alt) !important;
    }
    .card .date {
      min-width: 88px !important;
      text-align: left !important;
      flex-shrink: 0;
    }
    .card .date .day {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 600 !important;
      font-size: 56px !important;
      letter-spacing: -1px !important;
      color: var(--accent) !important;
      line-height: 0.95 !important;
    }
    .card .date .month {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 3px !important;
      color: #0C0C12 !important;
      opacity: 0.55;
      text-transform: uppercase;
      font-size: 11px !important;
      margin-top: 4px !important;
    }
    .card .bar { display: none !important; }
    .card .body .title {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 500 !important;
      font-size: 26px !important;
      letter-spacing: 0 !important;
      color: #0C0C12 !important;
      line-height: 1.15 !important;
    }
    .card .body .meta {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      font-size: 11px !important;
      color: #0C0C12 !important;
      opacity: 0.55 !important;
      margin-top: 4px !important;
    }
    .card .icon {
      color: var(--accent) !important;
      opacity: 0.65;
      width: 42px !important;
      height: 42px !important;
    }

    /* Empty cards — translúcido sobre dark con dashed amarillo sutil */
    .card.empty {
      background: rgba(255,255,255,0.05) !important;
      border: 1px dashed rgba(220,195,44,0.3) !important;
      box-shadow: none;
    }
    .card.empty .date .day {
      color: var(--accent) !important;
      opacity: 0.4;
    }
    .card.empty .date .month {
      color: var(--primary) !important;
      opacity: 0.45;
    }
    .card.empty .body .title {
      color: var(--primary) !important;
      opacity: 0.5;
      font-style: italic !important;
      font-weight: 500 !important;
    }
    .card.empty .body .meta {
      color: var(--primary) !important;
      opacity: 0.32;
    }
    .card.empty .icon {
      color: var(--primary) !important;
      opacity: 0.22;
    }

    /* ═══════════════ FOOTER ═══════════════ */
    .footer {
      position: relative; z-index: 3;
      padding-top: 28px !important;
    }
    .footer .tagline { display: none !important; }
    .footer .agency-mark { margin: 10px 0 12px !important; }
    .footer .agency-logo {
      filter: brightness(0) invert(1);
      filter: drop-shadow(0 3px 14px rgba(255,255,255,0.15)) brightness(0) invert(1);
      height: 70px !important;
      max-width: 420px !important;
      opacity: 0.92;
    }
    .footer .url {
      font-family: 'Inter', sans-serif !important;
      color: var(--accent) !important;
      opacity: 1 !important;
      letter-spacing: 3px !important;
      text-transform: lowercase;
      font-size: 13px !important;
      font-weight: 500 !important;
      margin-top: 8px !important;
    }
  `,
})
