// app/lib/grilla/styles/wellness-organic.ts
// Kintu — ESTILO v2 (22 may 2026, combinando piezas reales del Drive cliente).
// Referencia visual: carrusel "¿Por qué nace Kintu? · CANSADAS de vivir aceleradas"
// + historias destacadas Kit 2026 + carrusel "Antes de estudiar o trabajar".
//
// Mood: Editorial wellness consciente · clean + orgánico · NO esotérico
//   Background blanco/crema + formas orgánicas verde-menta sutiles
//   Firma visual = TARJETA VERDE PROFUNDO con texto blanco extrabold uppercase
//     (espejo del bloque "CANSADAS" en el carrusel)
//   Tipografía: Montserrat estricto (manual oficial)
//   Hojas SVG line-art sutiles como decoración
//
// CAMBIO vs v1: la v1 tenía cards blancas básicas sin firma visual diferenciada.
// La v2 incorpora el patrón "tarjeta verde profundo" como firma editorial Kintu.

import type { StyleBuilder } from './types'

export const wellnessOrganic: StyleBuilder = () => ({
  decorations: `
    <svg class="organic-blob blob-tr" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
      <path d="M450 50 Q580 100 570 250 Q550 400 400 480 Q260 550 150 480 Q40 400 60 250 Q90 100 230 70 Q340 30 450 50 Z"
            fill="rgba(187,224,205,0.35)"/>
    </svg>
    <svg class="organic-blob blob-bl" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 450 Q20 300 80 200 Q150 80 280 100 Q420 130 480 250 Q540 380 460 480 Q360 570 220 540 Q80 510 50 450 Z"
            fill="rgba(187,224,205,0.28)"/>
    </svg>
    <svg class="leaf leaf-tr" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M180 20 Q120 30 80 80 Q40 130 30 190 Q90 180 130 130 Q170 80 180 20 Z"
            fill="rgba(69,183,135,0.16)" stroke="rgba(69,183,135,0.32)" stroke-width="1.2"/>
      <path d="M180 20 Q105 105 30 190" stroke="rgba(69,183,135,0.4)" stroke-width="1.2" fill="none"/>
      <path d="M155 50 L100 80 M140 80 L80 110 M120 110 L60 140" stroke="rgba(69,183,135,0.28)" stroke-width="1" fill="none"/>
    </svg>
    <svg class="leaf leaf-bl" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 180 Q80 170 120 120 Q160 70 170 10 Q110 20 70 70 Q30 120 20 180 Z"
            fill="rgba(69,183,135,0.14)" stroke="rgba(69,183,135,0.28)" stroke-width="1.2"/>
      <path d="M20 180 Q95 95 170 10" stroke="rgba(69,183,135,0.32)" stroke-width="1.2" fill="none"/>
    </svg>
    <svg class="sprout sprout-1" viewBox="0 0 60 90" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 85 L30 25" stroke="rgba(69,183,135,0.5)" stroke-width="1.5"/>
      <path d="M30 60 Q10 50 5 30 Q20 25 30 45 Z" fill="rgba(69,183,135,0.22)"/>
      <path d="M30 45 Q50 35 55 15 Q40 12 30 30 Z" fill="rgba(69,183,135,0.22)"/>
    </svg>
    <svg class="sprout sprout-2" viewBox="0 0 60 90" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 85 L30 25" stroke="rgba(69,183,135,0.45)" stroke-width="1.5"/>
      <path d="M30 60 Q10 50 5 30 Q20 25 30 45 Z" fill="rgba(69,183,135,0.18)"/>
    </svg>
    <svg class="dot-line" viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 20 Q50 5 100 20 T195 20" stroke="rgba(69,183,135,0.45)" stroke-width="2" fill="none" stroke-dasharray="3,8" stroke-linecap="round"/>
    </svg>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Blanco con formas orgánicas verde-menta sutiles. Aire generoso. */
    .poster {
      background: linear-gradient(180deg, #FFFFFF 0%, var(--canvas) 100%) !important;
    }

    /* Formas orgánicas amorfas verde-menta — el "mood" de fondo Kintu */
    .organic-blob {
      position: absolute; pointer-events: none; z-index: 0;
      filter: blur(1px);
    }
    .organic-blob.blob-tr { top: -150px; right: -200px; width: 540px; height: 540px; }
    .organic-blob.blob-bl { bottom: -200px; left: -240px; width: 480px; height: 480px; opacity: 0.6; }

    /* Hojas decorativas (más sutiles que la v1) */
    .leaf {
      position: absolute; pointer-events: none; z-index: 1;
    }
    .leaf-tr { top: 30px; right: 30px; width: 230px; height: 230px; opacity: 0.85; }
    .leaf-bl { bottom: 60px; left: 30px; width: 200px; height: 200px; opacity: 0.85; }

    /* Brotes pequeños y línea punteada (recurso visual del carrusel CANSADAS) */
    .sprout { position: absolute; pointer-events: none; z-index: 1; }
    .sprout-1 { top: 280px; left: 50px; width: 40px; transform: rotate(-15deg); }
    .sprout-2 { top: 380px; right: 60px; width: 32px; transform: rotate(20deg); }
    .dot-line {
      position: absolute; pointer-events: none; z-index: 1;
      top: 380px; right: 100px; width: 220px; height: 44px;
    }

    /* ═══════════════ HEADER ═══════════════
       Logo Kintu en positivo (verde oficial sobre blanco) sin wrapper.
       Aspect real 3.55:1 → 320×90px. Brand-name texto oculto (logo lo dice). */
    .header {
      position: relative; z-index: 3;
      gap: 24px !important;
      margin-bottom: 16px !important;
      align-items: center !important;
    }
    .logo {
      margin: 0 !important;
      width: 320px !important;
      height: 90px !important;
      padding: 0 !important;
      object-position: left center !important;
    }
    /* Oculto: el logo oficial ya dice "kintu" + "ESSENTIAL OILS" */
    .brand-name { display: none !important; }

    /* Date pill — FIRMA VISUAL KINTU: tarjeta verde profundo + texto blanco
       extrabold uppercase. Espejo del bloque 'CANSADAS' del carrusel. */
    .date-pill {
      margin-left: auto !important;
      background: var(--primary) !important;
      color: #FFFFFF !important;
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 800 !important;
      font-size: 16px !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      padding: 14px 28px !important;
      border-radius: 4px !important;
      box-shadow: 0 8px 22px rgba(26,62,66,0.18);
    }

    /* ═══════════════ HERO ═══════════════ */
    .hero {
      position: relative; z-index: 3;
      margin: 28px 0 24px !important;
    }
    .hero h1 {
      font-family: 'Montserrat', sans-serif !important;
      font-style: normal !important;
      font-weight: 800 !important;
      font-size: 96px !important;
      letter-spacing: -3px !important;
      line-height: 0.96 !important;
      color: var(--primary) !important;
    }
    /* Énfasis verde Kintu en una palabra del hero (efecto carrusel) */
    .hero h1::first-letter {
      color: var(--accent);
    }
    .hero .sub {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 3.5px !important;
      text-transform: uppercase;
      font-size: 14px !important;
      color: var(--primary) !important;
      opacity: 0.7 !important;
      margin-top: 14px !important;
    }
    /* Divider editorial — línea fina verde menta + dot verde Kintu */
    .divider { margin-top: 18px !important; }
    .divider .line {
      background: var(--highlight) !important;
      height: 2px !important;
      width: 100px !important;
      border-radius: 0 !important;
    }
    .divider .dot {
      width: 10px !important; height: 10px !important;
      background: var(--accent) !important;
      border-radius: 0 100% 0 100% !important;
      transform: rotate(-45deg);
    }

    /* ═══════════════ CARDS BLANCAS ═══════════════
       Diseño editorial wellness: card blanca + DD en tarjeta verde profundo
       (firma visual) + título y meta en verde profundo + verde Kintu accents */
    .cards {
      position: relative; z-index: 3;
      gap: 10px !important;
    }
    .card {
      background: #FFFFFF !important;
      border-radius: 14px !important;
      border: none !important;
      box-shadow: 0 4px 18px rgba(26,62,66,0.08), 0 0 0 1px rgba(69,183,135,0.10);
      padding: 16px 22px !important;
      display: flex !important;
      align-items: center !important;
      gap: 22px !important;
      position: relative;
    }
    .card.is-alt {
      background: var(--card-alt) !important;
    }
    /* Día (DD) en TARJETA VERDE PROFUNDO blanco extrabold (firma visual Kintu) */
    .card .date {
      background: var(--primary);
      color: #FFFFFF;
      padding: 12px 16px;
      border-radius: 10px;
      min-width: 90px !important;
      text-align: center !important;
      flex-shrink: 0;
    }
    .card .date .day {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 900 !important;
      font-size: 50px !important;
      letter-spacing: -2px !important;
      color: #FFFFFF !important;
      line-height: 0.92 !important;
    }
    .card .date .month {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 3px !important;
      color: var(--highlight) !important;
      opacity: 1;
      text-transform: uppercase;
      font-size: 11px !important;
      margin-top: 2px !important;
    }
    .card .bar { display: none !important; }
    .card .body .title {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 700 !important;
      font-size: 24px !important;
      letter-spacing: -0.4px !important;
      color: var(--primary) !important;
      line-height: 1.15 !important;
    }
    .card .body .meta {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      font-size: 11px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
      margin-top: 4px !important;
    }
    .card .icon {
      color: var(--accent) !important;
      opacity: 0.7;
      width: 44px !important;
      height: 44px !important;
    }

    /* Empty cards — fondo blanco más sutil, date verde menta clarito */
    .card.empty {
      background: rgba(255,255,255,0.55) !important;
      border: 1.5px dashed rgba(69,183,135,0.30) !important;
      box-shadow: none;
    }
    .card.empty .date {
      background: var(--highlight) !important;
      opacity: 0.6;
    }
    .card.empty .date .day {
      color: var(--primary) !important;
      opacity: 0.7;
    }
    .card.empty .date .month {
      color: var(--primary) !important;
      opacity: 0.6;
    }
    .card.empty .body .title {
      color: var(--primary) !important;
      opacity: 0.45;
      font-weight: 600 !important;
      font-style: italic;
    }
    .card.empty .body .meta {
      color: var(--primary) !important;
      opacity: 0.3;
    }
    .card.empty .icon {
      color: var(--primary) !important;
      opacity: 0.18;
    }

    /* ═══════════════ FOOTER ═══════════════ */
    .footer {
      position: relative; z-index: 3;
      padding-top: 22px !important;
    }
    /* Tagline oculto (Pedro: sin frase comercial en footer) */
    .footer .tagline { display: none !important; }
    /* Logo Distinto en color original sobre blanco (no necesita filter) */
    .footer .agency-mark { margin: 8px 0 8px !important; }
    .footer .agency-logo {
      filter: drop-shadow(0 3px 10px rgba(26,62,66,0.10));
      height: 64px !important;
      max-width: 380px !important;
    }
    .footer .url {
      color: var(--primary) !important;
      opacity: 0.5 !important;
      letter-spacing: 3px !important;
      text-transform: uppercase;
      font-size: 11px !important;
      font-weight: 600 !important;
      margin-top: 4px !important;
    }
  `,
})
