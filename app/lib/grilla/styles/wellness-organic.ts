// app/lib/grilla/styles/wellness-organic.ts
// Kintu — Mood: botánico spa, esencial, calma orgánica.
// Características: Cormorant italic refinado, hojas SVG en esquinas,
// gotas decorativas, paleta verde profundo + menta.

import type { StyleBuilder } from './types'

export const wellnessOrganic: StyleBuilder = () => ({
  decorations: `
    <svg class="leaf leaf-tr" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M180 20 Q120 30 80 80 Q40 130 30 190 Q90 180 130 130 Q170 80 180 20 Z"
            fill="rgba(69,183,135,0.18)" stroke="rgba(69,183,135,0.35)" stroke-width="1"/>
      <path d="M180 20 Q105 105 30 190" stroke="rgba(69,183,135,0.4)" stroke-width="1.2" fill="none"/>
      <path d="M155 50 L100 80 M140 80 L80 110 M120 110 L60 140" stroke="rgba(69,183,135,0.3)" stroke-width="1" fill="none"/>
    </svg>
    <svg class="leaf leaf-bl" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 180 Q80 170 120 120 Q160 70 170 10 Q110 20 70 70 Q30 120 20 180 Z"
            fill="rgba(69,183,135,0.15)" stroke="rgba(69,183,135,0.3)" stroke-width="1"/>
      <path d="M20 180 Q95 95 170 10" stroke="rgba(69,183,135,0.35)" stroke-width="1.2" fill="none"/>
    </svg>
    <svg class="leaf-small leaf-s1" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 75 Q5 50 10 20 Q30 5 50 20 Q55 50 30 75 Z" fill="rgba(69,183,135,0.22)"/>
      <path d="M30 75 L30 15" stroke="rgba(69,183,135,0.5)" stroke-width="1"/>
    </svg>
    <svg class="leaf-small leaf-s2" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 75 Q5 50 10 20 Q30 5 50 20 Q55 50 30 75 Z" fill="rgba(69,183,135,0.22)"/>
      <path d="M30 75 L30 15" stroke="rgba(69,183,135,0.5)" stroke-width="1"/>
    </svg>
    <div class="drop drop-1"></div>
    <div class="drop drop-2"></div>
    <div class="drop drop-3"></div>
  `,
  extraCss: `
    /* Hojas grandes en esquinas opuestas */
    .leaf {
      position: absolute; pointer-events: none; z-index: 1;
    }
    .leaf-tr { top: -30px; right: -30px; width: 280px; height: 280px; }
    .leaf-bl { bottom: -30px; left: -30px; width: 260px; height: 260px; }

    /* Hojas pequeñas decorativas */
    .leaf-small {
      position: absolute; pointer-events: none; z-index: 1;
    }
    .leaf-s1 { top: 140px; left: 50px; width: 38px; transform: rotate(-25deg); }
    .leaf-s2 { top: 380px; right: 60px; width: 32px; transform: rotate(25deg); }

    /* Gotas de aceite esencial */
    .drop {
      position: absolute; background: var(--accent);
      width: 12px; height: 16px; opacity: .35;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      pointer-events: none; z-index: 1;
    }
    .drop-1 { top: 200px; right: 250px; }
    .drop-2 { top: 340px; left: 200px; width: 8px; height: 11px; opacity: .25; }
    .drop-3 { bottom: 220px; right: 180px; width: 10px; height: 14px; opacity: .3; }

    /* Hero: Cormorant Garamond italic delicado */
    .hero h1 {
      font-family: 'Cormorant Garamond', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 500 !important;
      font-size: 102px !important;
      letter-spacing: -0.5px !important;
      line-height: 1 !important;
      color: var(--primary);
    }
    .hero .sub {
      font-family: 'Nunito Sans', system-ui, sans-serif !important;
      font-weight: 400 !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      font-size: 14px !important;
    }

    /* Brand name elegante */
    .brand-name .big {
      font-family: 'Cormorant Garamond', Georgia, serif !important;
      font-weight: 600 !important;
      font-style: italic !important;
      font-size: 52px !important;
      letter-spacing: 1px !important;
    }
    .brand-name .small {
      font-family: 'Nunito Sans', system-ui, sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 4px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }

    /* Pill verde orgánica */
    .date-pill {
      background: var(--accent) !important;
      font-family: 'Nunito Sans', system-ui, sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2px !important;
      font-size: 16px !important;
      border-radius: 999px !important;
      padding: 11px 24px !important;
    }
    .date-pill::before { content: '♢ '; color: rgba(255,255,255,0.7); }

    /* Cards con borde verde claro + radius orgánico */
    .card {
      border-radius: 24px !important;
      background: var(--card-bg-active, var(--card-bg)) !important;
      border: 1px solid rgba(69,183,135,0.18);
      box-shadow: 0 4px 14px rgba(26,62,66,0.06);
      position: relative;
    }
    .card .date .day {
      font-family: 'Cormorant Garamond', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 500 !important;
    }
    .card .date .month {
      font-family: 'Nunito Sans', system-ui, sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2.5px !important;
      color: var(--accent) !important;
    }
    .card .bar {
      background: var(--accent) !important;
      border-radius: 99px !important;
      width: 2px !important;
    }
    .card .body .title {
      font-family: 'Cormorant Garamond', Georgia, serif !important;
      font-weight: 600 !important;
      font-size: 30px !important;
    }
    .card .body .meta {
      font-family: 'Nunito Sans', system-ui, sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 1px !important;
      text-transform: lowercase;
      font-size: 14px !important;
    }

    /* Divider con hojita en el centro */
    .divider .line {
      background: var(--accent) !important;
      opacity: .3;
      height: 1px !important;
    }
    .divider .dot {
      width: 16px !important; height: 16px !important;
      background: var(--accent) !important;
      border-radius: 0 100% 0 100% !important;
      transform: rotate(-45deg);
    }

    /* Footer */
    .footer .tagline {
      font-family: 'Cormorant Garamond', Georgia, serif !important;
      font-style: italic !important;
      font-size: 22px !important;
      color: var(--accent) !important;
    }
    .footer .agency {
      font-family: 'Nunito Sans', system-ui, sans-serif;
      font-weight: 700 !important;
      letter-spacing: 5px !important;
    }
  `,
})
