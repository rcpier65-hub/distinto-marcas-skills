// app/lib/grilla/styles/artisan-craft.ts
// Muebles Lozano — Mood: blueprint técnico, oficio, madera fina.
// Características: Bebas Neue display masivo, grid de medidas tipo papel
// técnico, paleta negro + dorado.

import type { StyleBuilder } from './types'

export const artisanCraft: StyleBuilder = () => ({
  decorations: `
    <div class="blueprint-grid"></div>
    <div class="ruler ruler-top"></div>
    <div class="ruler ruler-left"></div>
    <div class="corner-mark tl"></div>
    <div class="corner-mark tr"></div>
    <div class="corner-mark bl"></div>
    <div class="corner-mark br"></div>
  `,
  extraCss: `
    /* Canvas: papel técnico crema con grid sutil */
    .blueprint-grid {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(220,195,44,0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(220,195,44,0.06) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none; z-index: 0;
    }

    /* Reglas de medición en bordes */
    .ruler {
      position: absolute; background: var(--accent); opacity: .4;
      z-index: 1;
    }
    .ruler-top { top: 30px; left: 70px; right: 70px; height: 1px; }
    .ruler-left { top: 30px; bottom: 80px; left: 30px; width: 1px; }

    /* Marcas de esquina tipo blueprint */
    .corner-mark {
      position: absolute; width: 28px; height: 28px;
      border: 2px solid var(--accent); opacity: .6; z-index: 1;
    }
    .corner-mark.tl { top: 22px; left: 22px; border-right: none; border-bottom: none; }
    .corner-mark.tr { top: 22px; right: 22px; border-left: none; border-bottom: none; }
    .corner-mark.bl { bottom: 22px; left: 22px; border-right: none; border-top: none; }
    .corner-mark.br { bottom: 22px; right: 22px; border-left: none; border-top: none; }

    /* Hero: Bebas Neue MASIVO, no italic */
    .hero h1 {
      font-family: 'Bebas Neue', Impact, sans-serif !important;
      font-style: normal !important;
      font-weight: 400 !important;
      font-size: 132px !important;
      letter-spacing: 4px !important;
      line-height: 0.9 !important;
      text-transform: uppercase;
      color: var(--primary);
    }
    .hero .sub {
      font-family: var(--sans);
      font-weight: 500;
      letter-spacing: 3px !important;
      text-transform: uppercase;
      font-size: 14px !important;
    }
    .hero .sub::before { content: '— '; }
    .hero .sub::after  { content: ' —'; }

    /* Pill negra con tipografía industrial */
    .date-pill {
      font-family: 'Bebas Neue', Impact, sans-serif !important;
      font-weight: 400 !important;
      font-size: 22px !important;
      letter-spacing: 3px !important;
      background: var(--primary);
      border-radius: 0 !important;
      padding: 14px 26px !important;
      border-left: 4px solid var(--accent);
    }

    /* Brand name con peso tipo cartel de carpintería */
    .brand-name .big {
      font-family: 'Bebas Neue', Impact, sans-serif !important;
      font-weight: 400 !important;
      font-size: 56px !important;
      letter-spacing: 4px !important;
    }
    .brand-name .small {
      letter-spacing: 6px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
      font-weight: 700 !important;
    }

    /* Cards estilo ficha técnica: sin radius, borde inferior dorado, números display */
    .card {
      border-radius: 0 !important;
      border-bottom: 3px solid var(--accent);
      padding: 18px 28px !important;
    }
    .card .date .day {
      font-family: 'Bebas Neue', Impact, sans-serif !important;
      font-size: 72px !important;
      font-weight: 400 !important;
      letter-spacing: 2px !important;
    }
    .card .date .month {
      font-family: 'Bebas Neue', Impact, sans-serif !important;
      font-weight: 400 !important;
      letter-spacing: 4px !important;
      color: var(--accent) !important;
    }
    .card .bar {
      background: var(--accent) !important;
      width: 4px !important;
    }
    .card .body .title {
      font-weight: 600 !important;
      letter-spacing: 0 !important;
    }
    .card .body .meta {
      font-family: 'Bebas Neue', Impact, sans-serif !important;
      letter-spacing: 3px !important;
      text-transform: uppercase;
      font-size: 14px !important;
      opacity: 1 !important;
      color: var(--accent) !important;
    }

    /* Divider con marcas de regla */
    .divider .line {
      background: var(--primary) !important;
      height: 1px !important;
      opacity: .35;
    }
    .divider .dot {
      background: var(--accent) !important;
      border-radius: 0 !important;
      width: 14px !important; height: 14px !important;
      transform: rotate(45deg);
    }

    /* Footer industrial */
    .footer .agency {
      font-family: 'Bebas Neue', Impact, sans-serif;
      letter-spacing: 8px !important;
    }
    .footer .tagline {
      font-style: italic;
      color: var(--primary) !important;
      opacity: .75;
    }
  `,
})
