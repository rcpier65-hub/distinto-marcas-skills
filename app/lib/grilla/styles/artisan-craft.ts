// app/lib/grilla/styles/artisan-craft.ts
// Muebles Lozano. Manual oficial págs. 4-11 (LOGOS PERÚ, dic 2019).
// Paleta: Amarillo dorado #DCC32C + Negro azulado #0C0C12.
// Tipografía: Opificio Neue (sin bold real, énfasis por borde) + Myriad Pro.
// OSS: Oswald (display sin bold) + Inter (sans cuerpo).
// Mood: Caregiver+Creator — cálido oficio peruano, NO industrial brutalist.
// NO Bebas Neue masivo, NO grid blueprint duro. Sí líneas finas que evocan medida.

import type { StyleBuilder } from './types'

export const artisanCraft: StyleBuilder = () => ({
  decorations: `
    <div class="warm-glow"></div>
    <div class="rule-line rule-top"></div>
    <div class="rule-line rule-bottom"></div>
    <div class="amber-block tl"></div>
    <div class="amber-block br"></div>
  `,
  extraCss: `
    /* Glow cálido amarillo en background (oficio, no blueprint frío) */
    .warm-glow {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 700px 500px at 50% 0%, rgba(220,195,44,0.10), transparent 70%);
      pointer-events: none; z-index: 0;
    }

    /* Líneas finas amarillas (sutiles, marcan medida sin gritar industrial) */
    .rule-line {
      position: absolute; height: 1px; background: var(--accent); opacity: .25;
      z-index: 1;
    }
    .rule-top { top: 240px; left: 70px; right: 70px; }
    .rule-bottom { bottom: 120px; left: 70px; right: 70px; }

    /* Bloques esquinas estilo sello carpintería (no marcas técnicas frías) */
    .amber-block {
      position: absolute; width: 8px; height: 60px;
      background: var(--accent); z-index: 1;
    }
    .amber-block.tl { top: 200px; left: 30px; }
    .amber-block.br { bottom: 180px; right: 30px; }

    /* Hero: Oswald medium (no bold extremo — la marca cálida no admite Bebas masivo) */
    .hero h1 {
      font-family: 'Oswald', 'Impact', sans-serif !important;
      font-style: normal !important;
      font-weight: 500 !important;
      font-size: 110px !important;
      letter-spacing: 2px !important;
      line-height: 0.95 !important;
      text-transform: uppercase;
      color: var(--primary);
    }
    .hero .sub {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      font-size: 14px !important;
      color: var(--primary) !important;
      opacity: .7;
    }
    .hero .sub::before { content: '— '; color: var(--accent); }
    .hero .sub::after  { content: ' —'; color: var(--accent); }

    /* Pill negro con borde amarillo (oficio premium) */
    .date-pill {
      background: var(--primary) !important;
      color: var(--accent) !important;
      font-family: 'Oswald', Impact, sans-serif !important;
      font-weight: 500 !important;
      font-size: 18px !important;
      letter-spacing: 2.5px !important;
      border-radius: 4px !important;
      padding: 12px 24px !important;
      border: 1px solid var(--accent);
    }

    /* Brand name Oswald medium + tracking respirado */
    .brand-name .big {
      font-family: 'Oswald', Impact, sans-serif !important;
      font-weight: 500 !important;
      font-size: 50px !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
    }
    .brand-name .small {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 5px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }

    /* Cards con borde amarillo abajo (sello) + radius pequeño cálido */
    .card {
      border-radius: 6px !important;
      border-bottom: 3px solid var(--accent);
      box-shadow: 0 2px 8px rgba(12,12,18,0.05);
    }
    .card .date .day {
      font-family: 'Oswald', Impact, sans-serif !important;
      font-weight: 500 !important;
      font-size: 66px !important;
      letter-spacing: 1px !important;
    }
    .card .date .month {
      font-family: 'Oswald', Impact, sans-serif !important;
      font-weight: 400 !important;
      letter-spacing: 3px !important;
      color: var(--primary) !important;
      opacity: .55;
    }
    .card .bar {
      background: var(--accent) !important;
      width: 3px !important;
    }
    .card .body .title {
      font-family: 'Inter', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: -.2px !important;
    }
    .card .body .meta {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      opacity: 1 !important;
      color: var(--accent) !important;
    }

    /* Divider con clavo dorado (oficio carpintería) */
    .divider .line {
      background: var(--primary) !important;
      opacity: .25;
      height: 1px !important;
    }
    .divider .dot {
      background: var(--accent) !important;
      width: 10px !important; height: 10px !important;
      border-radius: 0 !important;
      transform: rotate(45deg);
      box-shadow: 0 0 0 3px rgba(220,195,44,0.18);
    }

    /* Footer */
    .footer .tagline {
      font-family: 'Inter', sans-serif !important;
      font-style: italic !important;
      font-weight: 500 !important;
      color: var(--primary) !important;
      opacity: .75;
    }
    .footer .agency {
      font-family: 'Oswald', Impact, sans-serif !important;
      font-weight: 400 !important;
      letter-spacing: 6px !important;
    }
  `,
})
