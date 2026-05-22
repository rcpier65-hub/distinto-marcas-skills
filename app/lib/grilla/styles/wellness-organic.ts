// app/lib/grilla/styles/wellness-organic.ts
// Kintu. Manual oficial págs. 6-7 (KINTU-BRANDING.pdf, 15 pág).
// Paleta: Blanco + Menta #BBE0CD + Verde Kintu #45B787 + Verde profundo #1A3E42.
// Tipografía: SOLO Montserrat (todas las jerarquías) con tracking amplio en tagline.
// Mood: Caregiver+Sage+Innocent+Explorer — consciente, aterrizada NO esotérica.
// NO Cormorant (eso era invención), NO italic abusivo, NO cursi-spiritual.
// Sí: patrones orgánicos sutiles, hojas+gotas, mucho aire blanco.

import type { StyleBuilder } from './types'

export const wellnessOrganic: StyleBuilder = () => ({
  decorations: `
    <svg class="leaf leaf-tr" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M180 20 Q120 30 80 80 Q40 130 30 190 Q90 180 130 130 Q170 80 180 20 Z"
            fill="rgba(69,183,135,0.14)" stroke="rgba(69,183,135,0.28)" stroke-width="1"/>
      <path d="M180 20 Q105 105 30 190" stroke="rgba(69,183,135,0.32)" stroke-width="1.2" fill="none"/>
      <path d="M155 50 L100 80 M140 80 L80 110 M120 110 L60 140" stroke="rgba(69,183,135,0.24)" stroke-width="1" fill="none"/>
    </svg>
    <svg class="leaf leaf-bl" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 180 Q80 170 120 120 Q160 70 170 10 Q110 20 70 70 Q30 120 20 180 Z"
            fill="rgba(69,183,135,0.12)" stroke="rgba(69,183,135,0.24)" stroke-width="1"/>
      <path d="M20 180 Q95 95 170 10" stroke="rgba(69,183,135,0.28)" stroke-width="1.2" fill="none"/>
    </svg>
    <svg class="sprout sprout-1" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 75 Q5 50 10 20 Q30 5 50 20 Q55 50 30 75 Z" fill="rgba(69,183,135,0.22)"/>
      <path d="M30 75 L30 15" stroke="rgba(69,183,135,0.5)" stroke-width="1"/>
    </svg>
    <svg class="sprout sprout-2" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 75 Q5 50 10 20 Q30 5 50 20 Q55 50 30 75 Z" fill="rgba(69,183,135,0.18)"/>
      <path d="M30 75 L30 15" stroke="rgba(69,183,135,0.45)" stroke-width="1"/>
    </svg>
    <div class="drop drop-1"></div>
    <div class="drop drop-2"></div>
    <div class="drop drop-3"></div>
  `,
  extraCss: `
    /* Hojas grandes en esquinas — patrón orgánico oficial */
    .leaf {
      position: absolute; pointer-events: none; z-index: 1;
    }
    .leaf-tr { top: -40px; right: -40px; width: 320px; height: 320px; }
    .leaf-bl { bottom: -40px; left: -40px; width: 280px; height: 280px; }

    /* Brotes pequeños */
    .sprout {
      position: absolute; pointer-events: none; z-index: 1;
    }
    .sprout-1 { top: 220px; left: 60px; width: 40px; transform: rotate(-25deg); }
    .sprout-2 { top: 420px; right: 70px; width: 32px; transform: rotate(25deg); }

    /* Gotas de aceite esencial */
    .drop {
      position: absolute; background: var(--accent);
      width: 14px; height: 18px; opacity: .32;
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      pointer-events: none; z-index: 1;
    }
    .drop-1 { top: 290px; right: 230px; }
    .drop-2 { top: 380px; left: 220px; width: 9px; height: 12px; opacity: .22; }
    .drop-3 { bottom: 290px; right: 200px; width: 11px; height: 15px; opacity: .28; }

    /* Hero: Montserrat ExtraBold (manual oficial) — NO italic NO Cormorant */
    .hero h1 {
      font-family: 'Montserrat', sans-serif !important;
      font-style: normal !important;
      font-weight: 800 !important;
      font-size: 86px !important;
      letter-spacing: -2px !important;
      line-height: 1 !important;
      color: var(--primary);
    }
    .hero .sub {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 4px !important;
      text-transform: uppercase;
      font-size: 12px !important;
      color: var(--primary) !important;
      opacity: .65;
    }

    /* Brand name: wordmark lowercase (oficial) */
    .brand-name .big {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 800 !important;
      font-size: 64px !important;
      letter-spacing: -2px !important;
      text-transform: lowercase !important;
    }
    .brand-name .small {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 4.5px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }

    /* Pill verde orgánica con tracking amplio (tagline style del manual) */
    .date-pill {
      background: var(--accent) !important;
      color: #FFFFFF !important;
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2.5px !important;
      font-size: 14px !important;
      border-radius: 999px !important;
      padding: 13px 26px !important;
      text-transform: uppercase;
    }

    /* Cards radius orgánico + borde menta sutil */
    .card {
      border-radius: 22px !important;
      border: 1px solid rgba(69,183,135,0.18);
      box-shadow: 0 4px 14px rgba(26,62,66,0.06);
    }
    .card .date .day {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 800 !important;
      letter-spacing: -2px !important;
    }
    .card .date .month {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 3px !important;
      color: var(--accent) !important;
    }
    .card .bar {
      background: var(--accent) !important;
      border-radius: 99px !important;
      width: 2px !important;
    }
    .card .body .title {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: -.3px !important;
    }
    .card .body .meta {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase;
      font-size: 12px !important;
    }

    /* Divider con hojita central */
    .divider .line {
      background: var(--accent) !important;
      opacity: .25;
      height: 1px !important;
    }
    .divider .dot {
      width: 18px !important; height: 18px !important;
      background: var(--accent) !important;
      border-radius: 0 100% 0 100% !important;
      transform: rotate(-45deg);
    }

    /* Footer */
    .footer .tagline {
      font-family: 'Montserrat', sans-serif !important;
      font-style: normal !important;
      font-weight: 500 !important;
      letter-spacing: 3px !important;
      text-transform: uppercase;
      color: var(--accent) !important;
      font-size: 13px !important;
    }
    .footer .agency {
      font-family: 'Montserrat', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 5px !important;
    }
  `,
})
