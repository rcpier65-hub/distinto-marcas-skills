// app/lib/grilla/styles/wood-industrial.ts
// La Victoria (Distribuidora de Pino). Brochure oct 2025.
// Paleta: Verde bosque oscuro PRIMARIO + crema madera + marrón + texto oscuro.
// Tipografía: serif moderna semibold + sans serif tracking ancho.
// Mood: Ruler+Caregiver+Sage — profesional industrial B2B, autoridad sin arrogancia.
// NO callejero, NO memes, NO ofertón, NO tag "PREMIUM" forzado.
// Sí: vetas madera sutiles, palabras del brochure (abastecimiento, calidad).

import type { StyleBuilder } from './types'

export const woodIndustrial: StyleBuilder = () => ({
  decorations: `
    <svg class="wood-grain" viewBox="0 0 1080 1620" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <pattern id="grain" x="0" y="0" width="1080" height="200" patternUnits="userSpaceOnUse">
          <path d="M0 100 Q270 80 540 100 T1080 100" stroke="rgba(139,111,71,0.10)" stroke-width="1" fill="none"/>
          <path d="M0 130 Q270 145 540 125 T1080 135" stroke="rgba(139,111,71,0.08)" stroke-width="1" fill="none"/>
          <path d="M0 60 Q300 70 600 55 T1080 70" stroke="rgba(139,111,71,0.07)" stroke-width="1" fill="none"/>
          <path d="M0 170 Q260 160 520 175 T1080 165" stroke="rgba(139,111,71,0.08)" stroke-width="1" fill="none"/>
          <path d="M0 30 Q280 40 560 25 T1080 40" stroke="rgba(139,111,71,0.06)" stroke-width="0.8" fill="none"/>
        </pattern>
      </defs>
      <rect width="1080" height="1620" fill="url(#grain)"/>
    </svg>
    <svg class="wood-knot knot-1" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="40" rx="22" ry="14" fill="none" stroke="rgba(139,111,71,0.22)" stroke-width="1.5"/>
      <ellipse cx="40" cy="40" rx="14" ry="8" fill="none" stroke="rgba(139,111,71,0.18)" stroke-width="1"/>
      <ellipse cx="40" cy="40" rx="6" ry="3" fill="rgba(139,111,71,0.28)"/>
    </svg>
    <svg class="wood-knot knot-2" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="40" rx="18" ry="10" fill="none" stroke="rgba(139,111,71,0.18)" stroke-width="1.2"/>
      <ellipse cx="40" cy="40" rx="10" ry="5" fill="rgba(139,111,71,0.16)"/>
    </svg>
    <div class="green-block tl"></div>
    <div class="green-block br"></div>
  `,
  extraCss: `
    /* Wood grain layer sutil */
    .wood-grain {
      position: absolute; inset: 0; pointer-events: none; z-index: 0;
    }

    /* Nudos de madera (oficio carpintero) */
    .wood-knot {
      position: absolute; pointer-events: none; z-index: 1;
    }
    .knot-1 { top: 260px; right: 90px; width: 70px; }
    .knot-2 { bottom: 240px; left: 110px; width: 55px; transform: rotate(15deg); }

    /* Bloques verde bosque (autoridad B2B) */
    .green-block {
      position: absolute; background: var(--primary); z-index: 1;
    }
    .green-block.tl { top: 0; left: 0; width: 100px; height: 8px; }
    .green-block.br { bottom: 0; right: 0; width: 100px; height: 8px; }

    /* Hero: Playfair serif semibold (NO italic excesivo) */
    .hero h1 {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      font-size: 92px !important;
      letter-spacing: -2px !important;
      line-height: 1 !important;
      color: var(--primary);
    }
    .hero .sub {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 4px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      color: var(--accent) !important;
    }

    /* Brand name serif semibold + small en marrón con tracking ancho */
    .brand-name .big {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 50px !important;
      letter-spacing: 1px !important;
    }
    .brand-name .small {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 5px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }

    /* Pill verde bosque (autoridad) */
    .date-pill {
      background: var(--primary) !important;
      color: #FFFFFF !important;
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2.5px !important;
      font-size: 14px !important;
      border-radius: 2px !important;
      padding: 13px 24px !important;
      text-transform: uppercase;
      border-bottom: 3px solid var(--accent);
    }

    /* Cards estilo ficha técnica industrial */
    .card {
      border-radius: 4px !important;
      border-left: 5px solid var(--primary) !important;
      box-shadow: 0 3px 10px rgba(27,67,50,0.07);
    }
    .card .date .day {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 64px !important;
      letter-spacing: -2px !important;
    }
    .card .date .month {
      font-family: 'Inter', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 3px !important;
      color: var(--accent) !important;
    }
    .card .bar {
      background: var(--accent) !important;
      width: 2px !important;
      opacity: .7;
    }
    .card .body .title {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 27px !important;
    }
    .card .body .meta {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      font-size: 12px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }

    /* Divider con rombo verde (sello industrial) */
    .divider .line {
      background: var(--accent) !important;
      opacity: .35;
      height: 1px !important;
    }
    .divider .dot {
      width: 12px !important; height: 12px !important;
      background: var(--primary) !important;
      border-radius: 0 !important;
      transform: rotate(45deg);
    }

    /* Footer institucional */
    .footer .tagline {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 600 !important;
      color: var(--primary) !important;
      font-size: 20px !important;
    }
    .footer .agency {
      font-family: 'Inter', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 5px !important;
    }
  `,
})
