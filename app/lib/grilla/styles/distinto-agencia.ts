// app/lib/grilla/styles/distinto-agencia.ts
// Distinto Agencia — estilo "agency-bold" (marca propia de la agencia).
// Kit de Marca Distinto 2026 (Drive, verificado 26-jun-2026):
//   morado #BA41F7 (primario) + amarillo #F2CC2C (acento) + tipografía Inter Tight.
//   Isotipo = dos pétalos/hojas superpuestas (morado + amarillo).
//
// Mood: agencia creativa moderna. Lienzo lavanda muy claro, titulares Inter
// Tight extrabold morado-negro, date pill morado, acentos amarillos, y pétalos
// (eco del isotipo) flotando en las esquinas. Cards blancas/lavanda con borde
// de acento alternado morado/amarillo.

import type { StyleBuilder } from './types'

// Pétalo doble — eco del isotipo Distinto (una hoja morada + una amarilla).
const petalSvg = (c1: string, c2: string, opacity: number) => `
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="${opacity}">
    <path d="M30 58C16 52 10 40 12 27c1-7 5-13 5-13s9 3 13 11c1-9 9-16 9-16s5 8 5 17c0 13-7 25-14 32z"
          fill="${c1}"/>
    <path d="M40 50c10-5 16-15 15-26-1-6-4-11-4-11s-8 3-11 9c-1-7-7-13-7-13s-4 7-4 14c0 11 6 21 16 27z"
          fill="${c2}" fill-opacity="0.9"/>
  </svg>`

export const agencyBold: StyleBuilder = () => ({
  decorations: `
    <div class="da-blob da-blob-purple"></div>
    <div class="da-blob da-blob-yellow"></div>
    <div class="da-deco da-deco-tr">${petalSvg('#BA41F7', '#F2CC2C', 0.95)}</div>
    <div class="da-deco da-deco-bl">${petalSvg('#F2CC2C', '#BA41F7', 0.9)}</div>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Lavanda casi blanco + blobs morado/amarillo muy sutiles + pétalos. */
    .poster { background: var(--canvas) !important; }
    .da-blob {
      position: absolute; pointer-events: none; z-index: 0;
      filter: blur(4px);
    }
    .da-blob-purple {
      width: 500px; height: 320px; top: -160px; right: -170px;
      background: #BA41F7; opacity: 0.12; transform: rotate(-18deg);
      border-radius: 60% 40% 55% 45% / 60% 50% 50% 40%;
    }
    .da-blob-yellow {
      width: 440px; height: 280px; bottom: -150px; left: -160px;
      background: #F2CC2C; opacity: 0.16; transform: rotate(16deg);
      border-radius: 50% 50% 60% 40% / 50% 60% 40% 50%;
    }
    .da-deco { position: absolute; pointer-events: none; z-index: 1; }
    .da-deco svg { width: 100%; height: 100%; }
    .da-deco-tr { top: 250px; right: 50px; width: 84px; height: 84px; transform: rotate(10deg); }
    .da-deco-bl { bottom: 200px; left: 52px; width: 70px; height: 70px; transform: rotate(-14deg); }

    /* ═══════════════ HEADER ═══════════════
       Logo horizontal Distinto (morado+amarillo) a la izquierda, sin wrapper.
       brand-name oculto (el logo trae el wordmark). Date pill morado. */
    .header {
      position: relative; z-index: 3;
      align-items: center !important;
      margin-bottom: 4px !important;
    }
    .logo {
      margin: 0 !important;
      width: 320px !important;
      height: 104px !important;
      padding: 0 !important;
      background: transparent !important;
      object-fit: contain !important;
      object-position: left center !important;
      border-radius: 0 !important;
    }
    .brand-name { display: none !important; }
    .date-pill {
      margin-left: auto !important;
      background: #BA41F7 !important;
      color: #FFFFFF !important;
      font-family: 'Inter Tight', sans-serif !important;
      font-weight: 700 !important;
      font-size: 20px !important;
      letter-spacing: 0.4px !important;
      padding: 14px 26px !important;
      border-radius: 999px !important;
      box-shadow: 0 10px 26px rgba(186,65,247,0.28);
    }

    /* ═══════════════ HERO ═══════════════ */
    .hero {
      position: relative; z-index: 3;
      margin: 34px 0 30px !important;
    }
    .hero h1 {
      font-family: 'Inter Tight', sans-serif !important;
      font-style: normal !important;
      font-weight: 900 !important;
      font-size: 104px !important;
      letter-spacing: -2.5px !important;
      line-height: 0.95 !important;
      color: var(--primary) !important;
    }
    .hero .sub {
      font-family: 'Inter Tight', sans-serif !important;
      font-weight: 500 !important;
      font-size: 22px !important;
      letter-spacing: 0.2px !important;
      color: var(--primary) !important;
      opacity: 0.6 !important;
      margin-top: 14px !important;
    }
    /* Divisor: línea morada + rombo amarillo en el centro */
    .divider { margin-top: 18px !important; gap: 14px !important; }
    .divider .line {
      background: #BA41F7 !important;
      opacity: 0.55;
      height: 2px !important;
      width: 190px !important;
      border-radius: 2px !important;
    }
    .divider .dot {
      width: 13px !important; height: 13px !important;
      background: #F2CC2C !important;
      border-radius: 3px !important;
      transform: rotate(45deg);
      box-shadow: 0 0 0 3px rgba(242,204,44,0.25);
    }

    /* ═══════════════ CARDS ═══════════════
       Blancas/lavanda con borde izquierdo de acento alternado morado/amarillo,
       sombra suave, separador en la columna de fecha, número Inter Tight black. */
    .cards {
      position: relative; z-index: 3;
      gap: 16px !important;
    }
    .card {
      background: #FFFFFF !important;
      border-radius: 18px !important;
      padding: 22px 28px !important;
      gap: 24px !important;
      box-shadow: 0 8px 24px rgba(26,19,48,0.07) !important;
      border-left: 6px solid var(--acc-color) !important;
    }
    /* is-white → acento morado · is-alt → acento amarillo + fondo lavanda */
    .card.is-white { --acc-color: #BA41F7; }
    .card.is-alt   { background: #F4EEFC !important; --acc-color: #F2CC2C; }
    .card .bar { display: none !important; }
    .card .date {
      min-width: 92px !important;
      text-align: center !important;
      padding-right: 22px;
      border-right: 1px solid rgba(186,65,247,0.22);
      display: flex !important; flex-direction: column !important;
    }
    /* .day = número del día · .month = abreviatura del día de semana (Lun/Mar…) */
    .card .date .day {
      font-family: 'Inter Tight', sans-serif !important;
      font-weight: 900 !important;
      font-size: 52px !important;
      letter-spacing: -2px !important;
      color: var(--primary) !important;
      line-height: 0.92 !important;
      order: 2;
    }
    .card .date .month {
      font-family: 'Inter Tight', sans-serif !important;
      font-weight: 700 !important;
      font-size: 15px !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      color: var(--acc-color) !important;
      opacity: 1 !important;
      margin: 0 0 2px !important;
      order: 1;
    }
    .card .body .title {
      font-family: 'Inter Tight', sans-serif !important;
      font-weight: 800 !important;
      font-size: 28px !important;
      letter-spacing: -0.6px !important;
      color: var(--primary) !important;
      line-height: 1.12 !important;
    }
    .card .body .meta {
      font-family: 'Inter Tight', sans-serif !important;
      font-weight: 500 !important;
      font-size: 17px !important;
      letter-spacing: 0.2px !important;
      text-transform: none;
      color: var(--primary) !important;
      opacity: 0.58 !important;
      margin-top: 6px !important;
    }
    .card .icon {
      color: var(--acc-color) !important;
      opacity: 0.9;
      width: 56px !important;
      height: 56px !important;
    }

    /* Empty cards — dashed morado sutil sobre lavanda */
    .card.empty {
      background: transparent !important;
      border: 1.5px dashed rgba(186,65,247,0.32) !important;
      border-left: 1.5px dashed rgba(186,65,247,0.32) !important;
      box-shadow: none !important;
    }
    .card.empty .date { border-right-color: rgba(186,65,247,0.18); }
    .card.empty .date .day { color: var(--primary) !important; opacity: 0.4; }
    .card.empty .date .month { color: var(--primary) !important; opacity: 0.4; }
    .card.empty .body .title {
      color: var(--primary) !important; opacity: 0.42;
      font-weight: 600 !important; font-style: italic;
    }
    .card.empty .body .meta { color: var(--primary) !important; opacity: 0.3; }
    .card.empty .icon { color: var(--primary) !important; opacity: 0.18; }

    /* ═══════════════ FOOTER ═══════════════
       Ocultamos el agency-mark (el header YA es el logo Distinto) para no
       duplicar el logo; dejamos solo la URL. */
    .footer {
      position: relative; z-index: 3;
      padding-top: 22px !important;
      border-top: 1px solid rgba(186,65,247,0.22);
    }
    .footer .tagline { display: none !important; }
    .footer .agency-mark { display: none !important; }
    .footer .url {
      color: var(--primary) !important;
      opacity: 0.6 !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      font-weight: 700 !important;
      margin-top: 14px !important;
    }
  `,
})
