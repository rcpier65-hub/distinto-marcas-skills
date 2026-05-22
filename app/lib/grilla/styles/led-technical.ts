// app/lib/grilla/styles/led-technical.ts
// NovaLamps. Manual oficial págs. 7-9 (NOVALAMPS-MANUAL-BASICO.pdf).
// Paleta: Verde lima #D2DD00 PREDOMINANTE + Grafito #262726 + Blanco.
// Tipografía: Arial Regular/Bold → OSS Inter (NO Orbitron, NO mono).
// Mood: Sage+Creator+Ruler — autoritativa con calidez, aspiracional premium.
// NO sci-fi, NO terminal/code aesthetic, NO "// " ni "> ".
// Sí: lima saturado como acento dominante, contraste limpio, técnica accesible.

import type { StyleBuilder } from './types'

export const ledTechnical: StyleBuilder = () => ({
  decorations: `
    <div class="lime-block lime-tr"></div>
    <div class="lime-block lime-bl"></div>
    <div class="lime-band band-1"></div>
    <div class="lime-band band-2"></div>
    <div class="dot-grid"></div>
  `,
  extraCss: `
    /* Bloques lima en esquinas (predomina lima como dice el manual) */
    .lime-block {
      position: absolute; background: var(--accent); z-index: 0;
    }
    .lime-block.lime-tr { top: 0; right: 0; width: 240px; height: 6px; }
    .lime-block.lime-bl { bottom: 0; left: 0; width: 240px; height: 6px; }

    /* Bandas lima horizontales finas (luminosidad) */
    .lime-band {
      position: absolute; height: 2px; background: var(--accent);
      left: 8%; right: 8%; opacity: .55; z-index: 0;
    }
    .band-1 { top: 235px; }
    .band-2 { bottom: 135px; }

    /* Grid de puntos sutil (paneles LED) */
    .dot-grid {
      position: absolute; inset: 0;
      background-image: radial-gradient(circle, rgba(210,221,0,0.12) 1.5px, transparent 1.5px);
      background-size: 36px 36px;
      pointer-events: none; z-index: 0;
    }

    /* Hero: Inter ExtraBold limpio + acento lima en parte del título */
    .hero h1 {
      font-family: 'Inter', sans-serif !important;
      font-style: normal !important;
      font-weight: 900 !important;
      font-size: 96px !important;
      letter-spacing: -3.5px !important;
      line-height: 1 !important;
      color: var(--primary) !important;
    }
    .hero h1::first-letter {
      background: var(--accent);
      padding: 0 .15em;
      border-radius: 8px;
    }
    .hero .sub {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      color: var(--primary) !important;
      opacity: .65;
    }

    /* Brand name "Novalamps" mixed case (manual: escritura correcta) */
    .brand-name .big {
      font-family: 'Inter', sans-serif !important;
      font-weight: 900 !important;
      font-size: 50px !important;
      letter-spacing: -1.5px !important;
      text-transform: none !important;
    }
    .brand-name .small {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 4px !important;
      color: var(--primary) !important;
      background: var(--accent);
      padding: 4px 10px;
      display: inline-block;
      margin-bottom: 8px !important;
      border-radius: 3px;
    }

    /* Pill lima sólido con grafito (predomina lima) */
    .date-pill {
      background: var(--accent) !important;
      color: var(--primary) !important;
      font-family: 'Inter', sans-serif !important;
      font-weight: 800 !important;
      font-size: 16px !important;
      letter-spacing: 1.5px !important;
      border-radius: 4px !important;
      padding: 13px 26px !important;
    }

    /* Cards limpias con borde lima sólido izquierdo */
    .card {
      border-radius: 6px !important;
      border-left: 6px solid var(--accent) !important;
      box-shadow: 0 3px 12px rgba(38,39,38,0.06);
    }
    .card.is-alt {
      background: linear-gradient(90deg, rgba(210,221,0,0.18), rgba(210,221,0,0.05)) !important;
    }
    .card .date .day {
      font-family: 'Inter', sans-serif !important;
      font-weight: 900 !important;
      font-size: 64px !important;
      letter-spacing: -3px !important;
    }
    .card .date .month {
      font-family: 'Inter', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 3px !important;
      color: var(--primary) !important;
      opacity: .55;
    }
    .card .bar {
      display: none !important;
    }
    .card .body .title {
      font-family: 'Inter', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: -.3px !important;
    }
    .card .body .meta {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase;
      font-size: 12px !important;
      opacity: .7 !important;
    }

    /* Divider con punto lima */
    .divider .line {
      background: var(--primary) !important;
      opacity: .15;
      height: 1px !important;
    }
    .divider .dot {
      width: 14px !important; height: 14px !important;
      background: var(--accent) !important;
      border-radius: 3px !important;
    }

    /* Footer claro */
    .footer .tagline {
      font-family: 'Inter', sans-serif !important;
      font-style: normal !important;
      font-weight: 600 !important;
      letter-spacing: 2px !important;
      color: var(--primary) !important;
      font-size: 16px !important;
    }
    .footer .agency {
      font-family: 'Inter', sans-serif !important;
      font-weight: 800 !important;
      letter-spacing: 5px !important;
    }
    .footer .url {
      letter-spacing: 1.5px !important;
    }
  `,
})
