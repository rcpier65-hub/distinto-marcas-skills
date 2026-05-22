// app/lib/grilla/styles/gym-energy.ts
// Distribuidora Fitness — Mood: energía explosiva, gym moderno, agresivo.
// Características: Anton condensed display, líneas diagonales naranjas
// tipo "motion blur", glow naranja en cards, paleta negro + naranja.

import type { StyleBuilder } from './types'

export const gymEnergy: StyleBuilder = () => ({
  decorations: `
    <div class="speed-line sl-1"></div>
    <div class="speed-line sl-2"></div>
    <div class="speed-line sl-3"></div>
    <div class="chevron-bg"></div>
    <div class="orange-glow tr"></div>
    <div class="orange-glow bl"></div>
  `,
  extraCss: `
    /* Glow naranja en esquinas (puro RGB sin blur expensive) */
    .orange-glow {
      position: absolute; background: radial-gradient(circle, rgba(245,73,34,0.32) 0%, transparent 70%);
      pointer-events: none; z-index: 0;
    }
    .orange-glow.tr { width: 600px; height: 600px; top: -300px; right: -300px; }
    .orange-glow.bl { width: 600px; height: 600px; bottom: -300px; left: -300px; }

    /* Speed lines diagonales (motion blur visual) */
    .speed-line {
      position: absolute; height: 3px;
      background: linear-gradient(90deg, transparent, var(--accent), transparent);
      transform: rotate(-15deg); opacity: .55; z-index: 1;
    }
    .speed-line.sl-1 { top: 12%; left: -10%; width: 50%; }
    .speed-line.sl-2 { top: 18%; left: 35%; width: 35%; height: 2px; opacity: .35; }
    .speed-line.sl-3 { top: 88%; left: -5%; width: 65%; opacity: .4; }

    /* Chevron pattern sutil de fondo */
    .chevron-bg {
      position: absolute; inset: 0;
      background-image: linear-gradient(135deg, transparent 49%, rgba(26,26,31,0.025) 49%, rgba(26,26,31,0.025) 51%, transparent 51%);
      background-size: 30px 30px;
      pointer-events: none; z-index: 0;
    }

    /* Hero: Anton condensed MASSIVE, mayúsculas */
    .hero h1 {
      font-family: 'Anton', Impact, sans-serif !important;
      font-style: normal !important;
      font-weight: 400 !important;
      font-size: 142px !important;
      letter-spacing: 2px !important;
      line-height: 0.88 !important;
      text-transform: uppercase;
      color: var(--primary);
      text-shadow: 4px 4px 0 var(--accent), 5px 5px 0 var(--primary);
    }
    .hero .sub {
      font-family: 'Barlow Condensed', Impact, sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 4px !important;
      text-transform: uppercase;
      font-size: 16px !important;
    }

    /* Pill con gradiente naranja agresivo */
    .date-pill {
      background: linear-gradient(135deg, var(--accent), var(--highlight)) !important;
      color: var(--primary) !important;
      font-family: 'Barlow Condensed', Impact, sans-serif !important;
      font-weight: 800 !important;
      font-size: 20px !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      padding: 12px 26px !important;
      border-radius: 4px !important;
      box-shadow: 0 4px 12px rgba(245,73,34,0.4);
      transform: skew(-8deg);
    }

    /* Brand name agresivo */
    .brand-name .big {
      font-family: 'Anton', Impact, sans-serif !important;
      font-weight: 400 !important;
      font-size: 54px !important;
      letter-spacing: 1px !important;
      text-transform: uppercase;
    }
    .brand-name .small {
      font-family: 'Barlow Condensed', Impact, sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 5px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }

    /* Cards con sombra naranja sutil + bordes cuadrados con cut corner */
    .card {
      border-radius: 4px !important;
      box-shadow: 0 4px 16px rgba(245,73,34,0.12);
      border-left: 5px solid var(--accent) !important;
      position: relative;
    }
    .card::after {
      content: ''; position: absolute; top: 0; right: 0;
      width: 0; height: 0;
      border-style: solid;
      border-width: 0 24px 24px 0;
      border-color: transparent var(--accent) transparent transparent;
      opacity: .6;
    }
    .card .date .day {
      font-family: 'Anton', Impact, sans-serif !important;
      font-size: 72px !important;
      font-weight: 400 !important;
      letter-spacing: -1px !important;
    }
    .card .date .month {
      font-family: 'Barlow Condensed', Impact, sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 3px !important;
      color: var(--accent) !important;
    }
    .card .bar {
      display: none !important;
    }
    .card .body .title {
      font-weight: 800 !important;
      text-transform: uppercase;
      letter-spacing: 0 !important;
      font-size: 26px !important;
    }
    .card .body .meta {
      font-family: 'Barlow Condensed', Impact, sans-serif !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      font-weight: 600 !important;
      font-size: 14px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }

    /* Divider con flecha hacia derecha (motion) */
    .divider .line {
      background: linear-gradient(90deg, transparent, var(--accent)) !important;
      height: 3px !important;
      opacity: 1;
    }
    .divider .dot {
      background: var(--accent) !important;
      width: 0 !important; height: 0 !important;
      border-radius: 0 !important;
      border-style: solid !important;
      border-width: 8px 0 8px 12px !important;
      border-color: transparent transparent transparent var(--accent) !important;
    }

    /* Footer */
    .footer .tagline {
      font-family: 'Barlow Condensed', Impact, sans-serif;
      text-transform: uppercase;
      letter-spacing: 4px;
      font-style: normal !important;
      font-weight: 700;
      color: var(--accent) !important;
      font-size: 16px !important;
    }
    .footer .agency {
      font-family: 'Anton', Impact, sans-serif;
      letter-spacing: 6px !important;
    }
  `,
})
