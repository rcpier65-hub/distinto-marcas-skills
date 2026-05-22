// app/lib/grilla/styles/wood-industrial.ts
// La Victoria — Mood: madera premium, industrial pero refinado.
// Características: Playfair display + Libre Caslon, vetas madera SVG sutiles
// en fondo, paleta verde bosque + marrones cálidos.

import type { StyleBuilder } from './types'

export const woodIndustrial: StyleBuilder = () => ({
  decorations: `
    <svg class="wood-grain" viewBox="0 0 1080 1620" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <pattern id="grain" x="0" y="0" width="1080" height="200" patternUnits="userSpaceOnUse">
          <path d="M0 100 Q270 80 540 100 T1080 100" stroke="rgba(139,111,71,0.12)" stroke-width="1.2" fill="none"/>
          <path d="M0 130 Q270 145 540 125 T1080 135" stroke="rgba(139,111,71,0.10)" stroke-width="1" fill="none"/>
          <path d="M0 60 Q300 70 600 55 T1080 70" stroke="rgba(139,111,71,0.08)" stroke-width="1" fill="none"/>
          <path d="M0 170 Q260 160 520 175 T1080 165" stroke="rgba(139,111,71,0.10)" stroke-width="1" fill="none"/>
          <path d="M0 30 Q280 40 560 25 T1080 40" stroke="rgba(139,111,71,0.07)" stroke-width="0.8" fill="none"/>
        </pattern>
      </defs>
      <rect width="1080" height="1620" fill="url(#grain)"/>
    </svg>
    <svg class="wood-knot knot-1" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="40" rx="22" ry="14" fill="none" stroke="rgba(139,111,71,0.25)" stroke-width="1.5"/>
      <ellipse cx="40" cy="40" rx="14" ry="8" fill="none" stroke="rgba(139,111,71,0.2)" stroke-width="1"/>
      <ellipse cx="40" cy="40" rx="6" ry="3" fill="rgba(139,111,71,0.3)"/>
    </svg>
    <svg class="wood-knot knot-2" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="40" rx="18" ry="10" fill="none" stroke="rgba(139,111,71,0.2)" stroke-width="1.2"/>
      <ellipse cx="40" cy="40" rx="10" ry="5" fill="rgba(139,111,71,0.18)"/>
    </svg>
    <div class="industrial-tag"></div>
  `,
  extraCss: `
    /* Wood grain layer */
    .wood-grain {
      position: absolute; inset: 0; pointer-events: none; z-index: 0;
    }

    /* Wood knots (nudos de madera) */
    .wood-knot {
      position: absolute; pointer-events: none; z-index: 1;
    }
    .knot-1 { top: 240px; right: 80px; width: 70px; }
    .knot-2 { bottom: 220px; left: 100px; width: 55px; transform: rotate(15deg); }

    /* Industrial tag corner */
    .industrial-tag {
      position: absolute; top: 30px; right: 0;
      background: var(--primary);
      color: var(--canvas);
      padding: 8px 14px 8px 18px;
      font-family: 'Libre Caslon Text', Georgia, serif;
      font-size: 11px; font-weight: 700; letter-spacing: 3px;
      text-transform: uppercase;
      z-index: 2;
      clip-path: polygon(8px 0, 100% 0, 100% 100%, 0 100%);
    }
    .industrial-tag::before { content: 'PREMIUM · 15 AÑOS'; color: var(--highlight); }

    /* Hero: Playfair italic refinado */
    .hero h1 {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 600 !important;
      font-size: 94px !important;
      letter-spacing: -1px !important;
      line-height: 1 !important;
      color: var(--primary);
    }
    .hero .sub {
      font-family: 'Libre Caslon Text', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 400 !important;
      letter-spacing: 2px !important;
      font-size: 18px !important;
      color: var(--accent) !important;
    }

    /* Brand name premium */
    .brand-name .big {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 50px !important;
      letter-spacing: 0 !important;
    }
    .brand-name .big::after {
      content: ''; display: block; width: 60px; height: 2px;
      background: var(--accent); margin-top: 6px;
    }
    .brand-name .small {
      font-family: 'Libre Caslon Text', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 400 !important;
      letter-spacing: 4px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }

    /* Pill estilo madera estampada */
    .date-pill {
      background: var(--accent) !important;
      color: var(--canvas) !important;
      font-family: 'Libre Caslon Text', Georgia, serif !important;
      font-weight: 700 !important;
      letter-spacing: 3px !important;
      font-size: 15px !important;
      border-radius: 2px !important;
      padding: 12px 22px !important;
      border-bottom: 3px solid var(--primary);
      text-transform: uppercase;
    }

    /* Cards estilo tarjeta de inventario industrial */
    .card {
      border-radius: 6px !important;
      border-left: 5px solid var(--accent) !important;
      box-shadow: 0 3px 12px rgba(27,67,50,0.08), inset 0 0 0 1px rgba(139,111,71,0.08);
      position: relative;
    }
    .card::before {
      content: ''; position: absolute; top: 8px; right: 8px;
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--accent); opacity: .6;
    }
    .card .date .day {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 700 !important;
      font-size: 64px !important;
    }
    .card .date .month {
      font-family: 'Libre Caslon Text', Georgia, serif !important;
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
      font-size: 26px !important;
    }
    .card .body .meta {
      font-family: 'Libre Caslon Text', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 400 !important;
      letter-spacing: 1.5px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
      font-size: 14px !important;
    }

    /* Divider con escudo central */
    .divider .line {
      background: var(--accent) !important;
      opacity: .4;
      height: 1px !important;
    }
    .divider .dot {
      width: 14px !important; height: 14px !important;
      background: var(--accent) !important;
      border-radius: 0 !important;
      transform: rotate(45deg);
      border: 2px solid var(--canvas);
      box-shadow: 0 0 0 1px var(--accent);
    }

    /* Footer premium */
    .footer .tagline {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 600 !important;
      color: var(--accent) !important;
      font-size: 19px !important;
    }
    .footer .agency {
      font-family: 'Libre Caslon Text', Georgia, serif;
      letter-spacing: 5px !important;
    }
  `,
})
