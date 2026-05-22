// app/lib/grilla/styles/gym-energy.ts
// Distribuidora Fitness. Manual oficial págs. 6-11 (IDEOTAS!, ago 2024).
// Paleta: Naranja DF #F54922 + Negro suave #333333 (NO #000) + Blanco.
// Tipografía: Stretch Pro bold-extended + Infinite Light/Thin.
// OSS: Anton (display) + Inter (cuerpo).
// Mood: Hero+Jester — energético pero NO gritón, divertido pero NO payaso.
// NO skew exagerado, NO speed lines agresivas, NO glow excesivo.
// Sí: naranja dominante, tipografía bold extended, contraste alto pero limpio.

import type { StyleBuilder } from './types'

export const gymEnergy: StyleBuilder = () => ({
  decorations: `
    <div class="orange-band orange-top"></div>
    <div class="orange-band orange-bottom"></div>
    <div class="bold-bar bar-1"></div>
    <div class="bold-bar bar-2"></div>
    <div class="bold-bar bar-3"></div>
  `,
  extraCss: `
    /* Bandas naranjas horizontales (energía sin chaos) */
    .orange-band {
      position: absolute; height: 6px; background: var(--accent);
      left: 0; right: 0; z-index: 1;
    }
    .orange-band.orange-top { top: 220px; }
    .orange-band.orange-bottom { bottom: 110px; }

    /* Barras gruesas decorativas (gym, pesa, fuerza) */
    .bold-bar {
      position: absolute; background: var(--accent); z-index: 1;
    }
    .bold-bar.bar-1 { top: 250px; right: 40px; width: 4px; height: 80px; opacity: .8; }
    .bold-bar.bar-2 { top: 270px; right: 56px; width: 4px; height: 50px; opacity: .5; }
    .bold-bar.bar-3 { bottom: 140px; left: 40px; width: 4px; height: 70px; opacity: .8; }

    /* Hero: Anton tamaño grande, sin skew (manual no lo permite) */
    .hero h1 {
      font-family: 'Anton', Impact, sans-serif !important;
      font-style: normal !important;
      font-weight: 400 !important;
      font-size: 132px !important;
      letter-spacing: -1px !important;
      line-height: 0.88 !important;
      text-transform: uppercase;
      color: var(--primary);
    }
    .hero h1::first-letter { color: var(--accent); }
    .hero .sub {
      font-family: 'Inter', sans-serif !important;
      font-weight: 300 !important;
      letter-spacing: 5px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      color: var(--accent) !important;
    }

    /* Pill naranja sólido (no gradiente, no skew) */
    .date-pill {
      background: var(--accent) !important;
      color: #FFFFFF !important;
      font-family: 'Anton', Impact, sans-serif !important;
      font-weight: 400 !important;
      font-size: 22px !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      padding: 12px 26px !important;
      border-radius: 4px !important;
    }

    /* Brand name Anton bold + small en gray suave */
    .brand-name .big {
      font-family: 'Anton', Impact, sans-serif !important;
      font-weight: 400 !important;
      font-size: 56px !important;
      letter-spacing: 0 !important;
      text-transform: uppercase;
    }
    .brand-name .small {
      font-family: 'Inter', sans-serif !important;
      font-weight: 300 !important;
      letter-spacing: 5px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }

    /* Cards limpias con borde izquierdo naranja sólido */
    .card {
      border-radius: 4px !important;
      border-left: 6px solid var(--accent) !important;
      box-shadow: 0 2px 10px rgba(51,51,51,0.06);
    }
    .card .date .day {
      font-family: 'Anton', Impact, sans-serif !important;
      font-weight: 400 !important;
      font-size: 70px !important;
      letter-spacing: -1px !important;
      color: var(--accent) !important;
    }
    .card .date .month {
      font-family: 'Inter', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 3px !important;
      color: var(--primary) !important;
      opacity: .7;
    }
    .card .bar { display: none !important; }
    .card .body .title {
      font-family: 'Inter', sans-serif !important;
      font-weight: 800 !important;
      text-transform: uppercase;
      font-size: 24px !important;
      letter-spacing: -.3px !important;
    }
    .card .body .meta {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }

    /* Divider con flecha sólida derecha */
    .divider .line {
      background: var(--accent) !important;
      height: 3px !important;
    }
    .divider .dot {
      background: transparent !important;
      width: 0 !important; height: 0 !important;
      border-radius: 0 !important;
      border-style: solid !important;
      border-width: 8px 0 8px 14px !important;
      border-color: transparent transparent transparent var(--accent) !important;
    }

    /* Footer firme */
    .footer .tagline {
      font-family: 'Inter', sans-serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      text-transform: uppercase;
      letter-spacing: 3px !important;
      color: var(--accent) !important;
      font-size: 14px !important;
    }
    .footer .agency {
      font-family: 'Anton', Impact, sans-serif !important;
      letter-spacing: 6px !important;
    }
  `,
})
