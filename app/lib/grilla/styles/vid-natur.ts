// app/lib/grilla/styles/vid-natur.ts
// Vid Natur — estilo "nature-vitality".
// Marca de suplementos naturales peruanos ("Extiende tu vitalidad").
// Paleta oficial del manual: naranja #FF6B00 (Pantone 1505C) + verde #449647
// + carbón #3B3F41 sobre crema cálido #FBF7EF. Tipografía Poppins (equivalente
// libre de Gotham) + Rubik para metadata.
//
// Mood: wellness cálido y vital. Cards blancas con acento izquierdo naranja/verde
// alternado + motivo de hoja (eco del isotipo). Date pill naranja, hero charcoal,
// firma "EXTIENDE TU VITALIDAD" naranja bajo el divisor verde.
//
// Diseño portado del componente React verificado app/components/plantillas-grilla/
// grilla-vid-natur.tsx al sistema de themes (HTML string) que usan las rutas
// /api/render-grilla y /api/render-grilla-html.

import type { StyleBuilder } from './types'

// Hoja/brote — eco del isotipo Vid Natur. `stroke`/`fill` se setean por color.
const leafSvg = (stroke: string, fill: string, fillOpacity: number) => `
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 54C20 50 14 40 14 28c0-8 4-15 4-15s9 3 14 10c5-7 14-10 14-10s4 7 4 15c0 12-6 22-18 26z"
          fill="${fill}" fill-opacity="${fillOpacity}"/>
    <path d="M32 54C20 50 14 40 14 28c0-8 4-15 4-15s9 3 14 10c5-7 14-10 14-10s4 7 4 15c0 12-6 22-18 26z"
          stroke="${stroke}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M32 52V24" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`

export const natureVitality: StyleBuilder = () => ({
  decorations: `
    <div class="vn-blob vn-blob-or"></div>
    <div class="vn-blob vn-blob-gr"></div>
    <div class="vn-deco vn-deco-tr">${leafSvg('#FF6B00', '#FF6B00', 0.14)}</div>
    <div class="vn-deco vn-deco-bl">${leafSvg('#449647', '#449647', 0.14)}</div>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Crema cálido + blobs orgánicos naranja/verde muy sutiles. */
    .poster {
      background: var(--canvas) !important;
    }
    .vn-blob {
      position: absolute; pointer-events: none; z-index: 0;
      filter: blur(2px);
    }
    .vn-blob-or {
      width: 460px; height: 280px; top: -130px; right: -150px;
      background: #FF6B00; opacity: 0.12; transform: rotate(-22deg);
      border-radius: 60% 40% 55% 45% / 60% 50% 50% 40%;
    }
    .vn-blob-gr {
      width: 420px; height: 260px; bottom: -120px; left: -150px;
      background: #449647; opacity: 0.13; transform: rotate(16deg);
      border-radius: 50% 50% 60% 40% / 50% 60% 40% 50%;
    }
    .vn-deco { position: absolute; pointer-events: none; z-index: 1; }
    .vn-deco svg { width: 100%; height: 100%; }
    .vn-deco-tr { top: 250px; right: 46px; width: 90px; height: 90px; transform: rotate(18deg); opacity: 0.9; }
    .vn-deco-bl { bottom: 200px; left: 48px; width: 76px; height: 76px; transform: rotate(-16deg); opacity: 0.9; }

    /* ═══════════════ HEADER ═══════════════
       Logo Vid Natur (PNG naranja+wordmark, casi cuadrado 1.21:1) a la izquierda,
       sin wrapper blanco. Date pill naranja a la derecha. brand-name oculto
       porque el logo ya trae el wordmark. */
    .header {
      position: relative; z-index: 3;
      align-items: center !important;
      margin-bottom: 6px !important;
    }
    .logo {
      margin: 0 !important;
      width: 200px !important;
      height: 150px !important;
      padding: 0 !important;
      background: transparent !important;
      object-fit: contain !important;
      object-position: left center !important;
    }
    .brand-name { display: none !important; }
    .date-pill {
      margin-left: auto !important;
      background: #FF6B00 !important;
      color: #FFFFFF !important;
      font-family: 'Poppins', sans-serif !important;
      font-weight: 600 !important;
      font-size: 21px !important;
      letter-spacing: 0.6px !important;
      padding: 15px 26px !important;
      border-radius: 999px !important;
      box-shadow: 0 10px 24px rgba(255,107,0,0.28);
    }

    /* ═══════════════ HERO ═══════════════ */
    .hero {
      position: relative; z-index: 3;
      margin: 36px 0 30px !important;
    }
    .hero h1 {
      font-family: 'Poppins', sans-serif !important;
      font-style: normal !important;
      font-weight: 800 !important;
      font-size: 92px !important;
      letter-spacing: -1.5px !important;
      line-height: 1.0 !important;
      color: var(--primary) !important;
    }
    .hero .sub {
      font-family: 'Rubik', sans-serif !important;
      font-weight: 400 !important;
      font-size: 23px !important;
      letter-spacing: 0.2px !important;
      color: var(--primary) !important;
      opacity: 0.62 !important;
      margin-top: 16px !important;
    }
    /* Divisor: línea verde + dot verde */
    .divider { margin-top: 20px !important; }
    .divider .line {
      background: #449647 !important;
      opacity: 0.5;
      height: 2px !important;
      width: 200px !important;
      border-radius: 2px !important;
    }
    .divider .dot {
      width: 14px !important; height: 14px !important;
      background: #449647 !important;
      border-radius: 50% !important;
    }
    /* Firma de marca bajo el divisor */
    .hero::after {
      content: 'EXTIENDE TU VITALIDAD';
      display: block;
      font-family: 'Rubik', sans-serif;
      font-weight: 600;
      font-size: 16px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #FF6B00;
      margin-top: 16px;
    }

    /* ═══════════════ CARDS ═══════════════
       Blancas con borde izquierdo de acento alternado naranja/verde + hoja a
       la derecha. La fecha va en una columna con separador sutil. */
    .cards {
      position: relative; z-index: 3;
      gap: 16px !important;
    }
    .card {
      background: #FFFFFF !important;
      border-radius: 20px !important;
      padding: 22px 28px !important;
      gap: 24px !important;
      box-shadow: 0 8px 22px rgba(59,63,65,0.06) !important;
      border-left: 6px solid var(--acc-color) !important;
    }
    /* is-white → acento naranja · is-alt → acento verde */
    .card.is-white { --acc-color: #FF6B00; }
    .card.is-alt   { background: #FFFFFF !important; --acc-color: #449647; }
    .card .bar { display: none !important; }
    .card .date {
      min-width: 92px !important;
      text-align: center !important;
      padding-right: 22px;
      border-right: 1px solid rgba(59,63,65,0.12);
    }
    /* .day = número del día · .month = abreviatura del día de semana (Lun/Mar…) */
    .card .date .day {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 800 !important;
      font-size: 46px !important;
      letter-spacing: -1px !important;
      color: var(--primary) !important;
      line-height: 0.95 !important;
      order: 2;
    }
    .card .date .month {
      font-family: 'Rubik', sans-serif !important;
      font-weight: 700 !important;
      font-size: 15px !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      color: var(--acc-color) !important;
      opacity: 1 !important;
      margin: 0 0 2px !important;
      order: 1;
    }
    .card .date { display: flex !important; flex-direction: column !important; }
    .card .body .title {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 700 !important;
      font-size: 27px !important;
      letter-spacing: -0.3px !important;
      color: var(--primary) !important;
      line-height: 1.18 !important;
    }
    .card .body .meta {
      font-family: 'Rubik', sans-serif !important;
      font-weight: 400 !important;
      font-size: 17px !important;
      letter-spacing: 0.2px !important;
      text-transform: none;
      color: var(--primary) !important;
      opacity: 0.62 !important;
      margin-top: 6px !important;
    }
    .card .icon {
      color: var(--acc-color) !important;
      opacity: 0.85;
      width: 56px !important;
      height: 56px !important;
    }

    /* Empty cards — dashed sutil sobre crema */
    .card.empty {
      background: transparent !important;
      border: 2px dashed rgba(59,63,65,0.18) !important;
      border-left: 2px dashed rgba(59,63,65,0.18) !important;
      box-shadow: none !important;
    }
    .card.empty .date { border-right-color: rgba(59,63,65,0.10); }
    .card.empty .date .day { color: var(--primary) !important; opacity: 0.4; }
    .card.empty .date .month { color: var(--primary) !important; opacity: 0.4; }
    .card.empty .body .title {
      color: var(--primary) !important; opacity: 0.45;
      font-weight: 500 !important; font-style: italic;
    }
    .card.empty .body .meta { color: var(--primary) !important; opacity: 0.3; }
    .card.empty .icon { color: var(--primary) !important; opacity: 0.18; }

    /* ═══════════════ FOOTER ═══════════════ */
    .footer {
      position: relative; z-index: 3;
      padding-top: 22px !important;
      border-top: 1px solid rgba(59,63,65,0.10);
    }
    .footer .tagline { display: none !important; }
    .footer .agency-mark { margin: 10px 0 8px !important; }
    .footer .agency-logo {
      height: 60px !important;
      max-width: 360px !important;
      filter: drop-shadow(0 3px 10px rgba(59,63,65,0.10));
    }
    .footer .url {
      color: var(--primary) !important;
      opacity: 0.55 !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      font-size: 12px !important;
      font-weight: 600 !important;
      margin-top: 4px !important;
    }
  `,
})
