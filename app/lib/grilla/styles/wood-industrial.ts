// app/lib/grilla/styles/wood-industrial.ts
// La Victoria · Distribuidora de Pino — ESTILO v2 (22 may 2026).
// Referencia: pieza Día del Trabajador (foto full bleed verde bosque +
// serif moderna semibold blanco + firma "— TEXTO —") + brochure 2025.
//
// Mood: PROFESIONAL INDUSTRIAL CINEMATOGRÁFICO B2B
//   Canvas verde bosque muy oscuro (#0A2A1F) — el verde es protagonista
//   Cards crema blanco como paneles editoriales (madera natural)
//   Tipografía: Playfair Display semibold ALL CAPS blanco crema
//   Firma visual = pill verde + texto blanco con em-dashes "— TEXTO —"
//
// CAMBIO vs v1: la v1 era canvas crema con vetas + tag "PREMIUM" forzado.
// La v2 invierte: canvas dark + cards claras, sigue la referencia real.

import type { StyleBuilder } from './types'

export const woodIndustrial: StyleBuilder = () => ({
  decorations: `
    <div class="forest-overlay"></div>
    <div class="vignette-top"></div>
    <div class="vignette-bottom"></div>
    <svg class="wood-grain" viewBox="0 0 1080 1620" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <pattern id="grain" x="0" y="0" width="1080" height="220" patternUnits="userSpaceOnUse">
          <path d="M0 110 Q270 90 540 110 T1080 110" stroke="rgba(245,237,216,0.06)" stroke-width="1" fill="none"/>
          <path d="M0 145 Q270 158 540 138 T1080 148" stroke="rgba(245,237,216,0.05)" stroke-width="1" fill="none"/>
          <path d="M0 65 Q300 78 600 60 T1080 75" stroke="rgba(245,237,216,0.04)" stroke-width="0.8" fill="none"/>
          <path d="M0 185 Q260 175 520 188 T1080 180" stroke="rgba(245,237,216,0.05)" stroke-width="1" fill="none"/>
        </pattern>
      </defs>
      <rect width="1080" height="1620" fill="url(#grain)"/>
    </svg>
    <div class="corner-mark tl"></div>
    <div class="corner-mark tr"></div>
    <div class="corner-mark bl"></div>
    <div class="corner-mark br"></div>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Verde bosque MUY oscuro + gradiente para profundidad + vetas sutiles
       como overlay (textura madera fina, no protagonista) */
    .poster {
      background: radial-gradient(ellipse at 50% 30%, #0F3D2A 0%, #0A2A1F 60%, #051811 100%) !important;
      position: relative;
    }
    /* Overlay sutil de fotografía bosque/taller (textura aspiracional) */
    .forest-overlay {
      position: absolute; inset: 0; z-index: 0;
      background: radial-gradient(ellipse 800px 600px at 50% 80%, rgba(139,111,71,0.10) 0%, transparent 70%);
      pointer-events: none;
    }
    .vignette-top, .vignette-bottom {
      position: absolute; left: 0; right: 0; z-index: 1;
      pointer-events: none;
    }
    .vignette-top { top: 0; height: 240px;
      background: linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 100%); }
    .vignette-bottom { bottom: 0; height: 220px;
      background: linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 100%); }

    .wood-grain {
      position: absolute; inset: 0; z-index: 1;
      pointer-events: none; opacity: 0.6;
    }

    /* Marcas esquineras tipo certificación industrial */
    .corner-mark {
      position: absolute; width: 38px; height: 38px;
      border: 1.5px solid rgba(245,237,216,0.4);
      z-index: 2;
    }
    .corner-mark.tl { top: 30px; left: 30px; border-right: none; border-bottom: none; }
    .corner-mark.tr { top: 30px; right: 30px; border-left: none; border-bottom: none; }
    .corner-mark.bl { bottom: 30px; left: 30px; border-right: none; border-top: none; }
    .corner-mark.br { bottom: 30px; right: 30px; border-left: none; border-top: none; }

    /* ═══════════════ HEADER ═══════════════
       Logo La Victoria centrado izquierda (stack vertical aspect 1.57:1)
       Filter convierte verde bosque del logo a crema para verse sobre dark.
       Brand-name texto oculto (el logo dice "LA VICTORIA" + tagline). */
    .header {
      position: relative; z-index: 3;
      gap: 24px !important;
      margin-bottom: 18px !important;
      align-items: center !important;
    }
    .logo {
      margin: 0 !important;
      width: 180px !important;
      height: 115px !important;
      padding: 0 !important;
      object-position: left center !important;
      /* Logo SVG es verde bosque → invert lo lleva a crema/blanco visible sobre dark.
         brightness(0) lo vuelve negro puro, invert(1) lo flippea a blanco.
         Después sepia + saturate + hue-rotate lo tinta a crema dorada. */
      filter: brightness(0) invert(1) sepia(0.4) saturate(2) hue-rotate(-15deg);
    }
    .brand-name { display: none !important; }

    /* Date pill — FIRMA VISUAL LV: pill con em-dashes "— TEXTO —"
       Espejo del "— FELIZ DÍA DEL TRABAJADOR —" del post Día del Trabajador */
    .date-pill {
      margin-left: auto !important;
      background: transparent !important;
      color: var(--primary) !important;
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      font-size: 15px !important;
      letter-spacing: 3px !important;
      text-transform: uppercase;
      padding: 12px 24px !important;
      border-radius: 999px !important;
      border: 1.5px solid rgba(245,237,216,0.45) !important;
    }
    .date-pill::before { content: '— '; color: var(--accent); }
    .date-pill::after  { content: ' —'; color: var(--accent); }

    /* ═══════════════ HERO ═══════════════
       Serif moderna semibold ALL CAPS crema gigante (referencia post DT) */
    .hero {
      position: relative; z-index: 3;
      margin: 24px 0 26px !important;
    }
    .hero h1 {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      font-size: 124px !important;
      letter-spacing: -1px !important;
      line-height: 0.92 !important;
      text-transform: uppercase;
      color: var(--primary) !important;
    }
    .hero .sub {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 500 !important;
      letter-spacing: 1px !important;
      font-size: 20px !important;
      color: var(--accent) !important;
      opacity: 0.95 !important;
      margin-top: 14px !important;
      text-transform: none;
    }

    /* Divider — línea fina dorada + rombo */
    .divider { margin-top: 18px !important; }
    .divider .line {
      background: var(--accent) !important;
      opacity: 0.55;
      height: 1px !important;
      width: 100px !important;
    }
    .divider .dot {
      width: 8px !important; height: 8px !important;
      background: var(--accent) !important;
      border-radius: 0 !important;
      transform: rotate(45deg);
      opacity: 0.85;
    }

    /* ═══════════════ CARDS CREMA ═══════════════
       Paneles editoriales crema sobre verde bosque dark.
       Día (DD) en chip verde bosque + texto crema (firma visual aplicada). */
    .cards {
      position: relative; z-index: 3;
      gap: 10px !important;
    }
    .card {
      background: var(--card-bg) !important;
      border-radius: 4px !important;
      border-left: 5px solid var(--accent) !important;
      box-shadow: 0 8px 28px rgba(0,0,0,0.5);
      padding: 18px 26px !important;
      display: flex !important;
      align-items: center !important;
      gap: 22px !important;
    }
    .card.is-alt {
      background: var(--card-alt) !important;
      border-left-color: var(--highlight) !important;
    }
    .card .date {
      background: #0A2A1F;
      color: var(--primary);
      padding: 12px 18px;
      border-radius: 3px;
      min-width: 92px !important;
      text-align: center !important;
      flex-shrink: 0;
    }
    .card .date .day {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 46px !important;
      letter-spacing: -1px !important;
      color: var(--primary) !important;
      line-height: 0.95 !important;
    }
    .card .date .month {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 3px !important;
      color: var(--accent) !important;
      opacity: 0.85;
      text-transform: uppercase;
      font-size: 11px !important;
      margin-top: 3px !important;
    }
    .card .bar { display: none !important; }
    .card .body .title {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 26px !important;
      letter-spacing: -0.2px !important;
      color: #0A2A1F !important;
      line-height: 1.1 !important;
    }
    .card .body .meta {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      font-size: 11px !important;
      color: var(--highlight) !important;
      opacity: 1 !important;
      margin-top: 4px !important;
    }
    .card .icon {
      color: var(--highlight) !important;
      opacity: 0.75;
      width: 44px !important;
      height: 44px !important;
    }

    /* Empty cards — fondo translúcido sobre dark, dashed crema sutil */
    .card.empty {
      background: rgba(245,237,216,0.06) !important;
      border: 1.5px dashed rgba(245,237,216,0.30) !important;
      box-shadow: none;
    }
    .card.empty .date {
      background: rgba(245,237,216,0.10) !important;
    }
    .card.empty .date .day {
      color: var(--primary) !important;
      opacity: 0.45;
    }
    .card.empty .date .month {
      color: var(--accent) !important;
      opacity: 0.5;
    }
    .card.empty .body .title {
      color: var(--primary) !important;
      opacity: 0.50;
      font-weight: 500 !important;
      font-style: italic !important;
    }
    .card.empty .body .meta {
      color: var(--primary) !important;
      opacity: 0.35;
    }
    .card.empty .icon {
      color: var(--primary) !important;
      opacity: 0.22;
    }

    /* ═══════════════ FOOTER ═══════════════
       Logo Distinto en NEGATIVO (blanco/crema) sobre verde bosque dark */
    .footer {
      position: relative; z-index: 3;
      padding-top: 24px !important;
    }
    /* Tagline oculto (Pedro confirmó sin frase comercial) */
    .footer .tagline { display: none !important; }
    .footer .agency-mark { margin: 10px 0 10px !important; }
    .footer .agency-logo {
      filter: brightness(0) invert(1);
      filter: drop-shadow(0 3px 14px rgba(245,237,216,0.18)) brightness(0) invert(1);
      height: 72px !important;
      max-width: 420px !important;
      opacity: 0.92;
    }
    .footer .url {
      color: var(--primary) !important;
      opacity: 0.6 !important;
      letter-spacing: 4px !important;
      text-transform: uppercase;
      font-size: 12px !important;
      font-weight: 600 !important;
      font-family: 'Inter', sans-serif !important;
      margin-top: 6px !important;
    }
    .footer .url::before { content: '— '; color: var(--accent); opacity: 0.7; }
    .footer .url::after  { content: ' —'; color: var(--accent); opacity: 0.7; }
  `,
})
