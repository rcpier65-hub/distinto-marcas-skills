// app/lib/grilla/styles/mil-ideas.ts
// Mil Ideas — estilo "artisan-boutique".
// Importadora boutique de decoración para el hogar ("Creamos emociones
// visibles"). Decoración con alma: figuras protectoras, esculturas, piezas
// con significado. Mood: cálido, premium, artesanal-elegante.
//
// Paleta REAL (muestreada del logo coral + milideas.pe, verificado 23-jun-2026):
//   coral #D8480C (dominante) · dorados #E2A23A/#FFBA00 · crema #FAF5EE ·
//   durazno #FBC5A9 · espresso #3D2E26 (texto).
// Tipografía: Playfair Display (eco del wordmark Boston Angel) + Poppins body.
//
// El logo coral ya trae el wordmark "Mil Ideas" → ocultamos .brand-name.
// Firma de marca en el hero: "CREAMOS EMOCIONES VISIBLES".

import type { StyleBuilder } from './types'

// Pequeño rombo ornamental dorado — eco de las piezas decorativas de la marca.
const diamondSvg = (color: string, opacity: number) => `
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 4 L44 32 L32 60 L20 32 Z" stroke="${color}" stroke-width="2"
          stroke-linejoin="round" opacity="${opacity}"/>
    <path d="M32 16 L38 32 L32 48 L26 32 Z" fill="${color}" fill-opacity="${opacity * 0.55}"/>
  </svg>`

export const artisanBoutique: StyleBuilder = () => ({
  decorations: `
    <div class="mi-blob mi-blob-coral"></div>
    <div class="mi-blob mi-blob-gold"></div>
    <div class="mi-deco mi-deco-tr">${diamondSvg('#E2A23A', 0.9)}</div>
    <div class="mi-deco mi-deco-bl">${diamondSvg('#D8480C', 0.8)}</div>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Crema cálido + blobs orgánicos coral/dorado muy sutiles + rombos
       ornamentales en las esquinas (eco de las piezas decorativas). */
    .poster { background: var(--canvas) !important; }
    .mi-blob {
      position: absolute; pointer-events: none; z-index: 0;
      filter: blur(3px);
    }
    .mi-blob-coral {
      width: 480px; height: 300px; top: -150px; right: -160px;
      background: #D8480C; opacity: 0.10; transform: rotate(-20deg);
      border-radius: 60% 40% 55% 45% / 60% 50% 50% 40%;
    }
    .mi-blob-gold {
      width: 440px; height: 280px; bottom: -140px; left: -160px;
      background: #E2A23A; opacity: 0.14; transform: rotate(14deg);
      border-radius: 50% 50% 60% 40% / 50% 60% 40% 50%;
    }
    .mi-deco { position: absolute; pointer-events: none; z-index: 1; }
    .mi-deco svg { width: 100%; height: 100%; }
    .mi-deco-tr { top: 240px; right: 52px; width: 78px; height: 78px; transform: rotate(8deg); }
    .mi-deco-bl { bottom: 196px; left: 54px; width: 66px; height: 66px; transform: rotate(-10deg); }

    /* ═══════════════ HEADER ═══════════════
       Logo coral (banner 3.3:1) a la izquierda, sin wrapper. brand-name oculto
       porque el logo ya trae el wordmark. Date pill coral a la derecha. */
    .header {
      position: relative; z-index: 3;
      align-items: center !important;
      margin-bottom: 4px !important;
    }
    .logo {
      margin: 0 !important;
      width: 300px !important;
      height: 96px !important;
      padding: 0 !important;
      background: transparent !important;
      object-fit: contain !important;
      object-position: left center !important;
      border-radius: 0 !important;
    }
    .brand-name { display: none !important; }
    .date-pill {
      margin-left: auto !important;
      background: #D8480C !important;
      color: #FFF7F0 !important;
      font-family: 'Poppins', sans-serif !important;
      font-weight: 600 !important;
      font-size: 20px !important;
      letter-spacing: 0.6px !important;
      padding: 14px 26px !important;
      border-radius: 999px !important;
      box-shadow: 0 10px 24px rgba(216,72,12,0.26);
    }

    /* ═══════════════ HERO ═══════════════ */
    .hero {
      position: relative; z-index: 3;
      margin: 34px 0 30px !important;
    }
    .hero h1 {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 600 !important;
      font-size: 100px !important;
      letter-spacing: -1px !important;
      line-height: 0.98 !important;
      color: var(--primary) !important;
    }
    .hero .sub {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 400 !important;
      font-size: 22px !important;
      letter-spacing: 0.3px !important;
      color: var(--primary) !important;
      opacity: 0.62 !important;
      margin-top: 16px !important;
    }
    /* Divisor: regla dorada fina + rombo coral en el centro */
    .divider { margin-top: 18px !important; gap: 14px !important; }
    .divider .line {
      background: #E2A23A !important;
      opacity: 0.7;
      height: 1.5px !important;
      width: 190px !important;
      border-radius: 2px !important;
    }
    .divider .dot {
      width: 12px !important; height: 12px !important;
      background: #D8480C !important;
      border-radius: 2px !important;
      transform: rotate(45deg);
    }
    /* Firma de marca bajo el divisor */
    .hero::after {
      content: 'CREAMOS EMOCIONES VISIBLES';
      display: block;
      font-family: 'Poppins', sans-serif;
      font-weight: 600;
      font-size: 15px;
      letter-spacing: 3.5px;
      text-transform: uppercase;
      color: #D8480C;
      margin-top: 16px;
    }

    /* ═══════════════ CARDS ═══════════════
       Blancas con borde izquierdo de acento alternado coral/dorado, sombra
       cálida, separador dorado en la columna de fecha, número serif. */
    .cards {
      position: relative; z-index: 3;
      gap: 16px !important;
    }
    .card {
      background: #FFFFFF !important;
      border-radius: 18px !important;
      padding: 22px 28px !important;
      gap: 24px !important;
      box-shadow: 0 8px 22px rgba(61,46,38,0.07) !important;
      border-left: 6px solid var(--acc-color) !important;
    }
    /* is-white → acento coral · is-alt → acento dorado + fondo durazno */
    .card.is-white { --acc-color: #D8480C; }
    .card.is-alt   { background: #FCEFE6 !important; --acc-color: #E2A23A; }
    .card .bar { display: none !important; }
    .card .date {
      min-width: 92px !important;
      text-align: center !important;
      padding-right: 22px;
      border-right: 1px solid rgba(226,162,58,0.35);
      display: flex !important; flex-direction: column !important;
    }
    /* .day = número del día · .month = abreviatura del día de semana (Lun/Mar…) */
    .card .date .day {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 52px !important;
      letter-spacing: -1px !important;
      color: var(--primary) !important;
      line-height: 0.95 !important;
      order: 2;
    }
    .card .date .month {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 600 !important;
      font-size: 15px !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      color: var(--acc-color) !important;
      opacity: 1 !important;
      margin: 0 0 2px !important;
      order: 1;
    }
    .card .body .title {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 700 !important;
      font-size: 27px !important;
      letter-spacing: -0.3px !important;
      color: var(--primary) !important;
      line-height: 1.16 !important;
    }
    .card .body .meta {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 400 !important;
      font-size: 17px !important;
      letter-spacing: 0.2px !important;
      text-transform: none;
      color: var(--primary) !important;
      opacity: 0.6 !important;
      margin-top: 6px !important;
    }
    .card .icon {
      color: var(--acc-color) !important;
      opacity: 0.85;
      width: 56px !important;
      height: 56px !important;
    }

    /* Empty cards — dashed dorado sutil sobre crema */
    .card.empty {
      background: transparent !important;
      border: 1.5px dashed rgba(226,162,58,0.45) !important;
      border-left: 1.5px dashed rgba(226,162,58,0.45) !important;
      box-shadow: none !important;
    }
    .card.empty .date { border-right-color: rgba(226,162,58,0.22); }
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
      border-top: 1px solid rgba(226,162,58,0.30);
    }
    .footer .tagline { display: none !important; }
    .footer .agency-mark { margin: 10px 0 8px !important; }
    .footer .agency-logo {
      height: 58px !important;
      max-width: 360px !important;
      filter: drop-shadow(0 3px 10px rgba(61,46,38,0.10));
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
