// app/lib/grilla/styles/led-technical.ts
// NovaLamps — Mood: tech LED, futurista, premium iluminación.
// Características: canvas oscuro grafito, Orbitron display, LEDs lima con
// glow, líneas tipo circuito, paleta dark mode con accent lima brillante.

import type { StyleBuilder } from './types'

export const ledTechnical: StyleBuilder = () => ({
  decorations: `
    <div class="circuit-grid"></div>
    <div class="led led-1"></div>
    <div class="led led-2"></div>
    <div class="led led-3"></div>
    <div class="led led-4"></div>
    <div class="led led-5"></div>
    <div class="led-strip strip-top"></div>
    <div class="led-strip strip-bottom"></div>
    <div class="corner-tech tl"></div>
    <div class="corner-tech tr"></div>
    <div class="corner-tech bl"></div>
    <div class="corner-tech br"></div>
  `,
  extraCss: `
    /* Canvas oscuro con gradiente sutil */
    .poster {
      background: radial-gradient(ellipse at 50% 0%, #1A1A18 0%, #0F0F0E 60%, #050505 100%) !important;
    }

    /* Grid de circuito sutil */
    .circuit-grid {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(228,240,0,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(228,240,0,0.04) 1px, transparent 1px);
      background-size: 60px 60px;
      pointer-events: none; z-index: 0;
    }

    /* LEDs brillantes (puntos con glow) */
    .led {
      position: absolute; width: 8px; height: 8px;
      background: var(--accent);
      border-radius: 50%;
      box-shadow: 0 0 12px var(--accent), 0 0 24px rgba(228,240,0,0.5);
      pointer-events: none; z-index: 2;
    }
    .led-1 { top: 280px; left: 40px; }
    .led-2 { top: 300px; right: 60px; }
    .led-3 { top: 700px; left: 80px; width: 6px; height: 6px; }
    .led-4 { top: 950px; right: 70px; }
    .led-5 { bottom: 280px; left: 60px; width: 6px; height: 6px; }

    /* LED strips horizontales (líneas iluminadas) */
    .led-strip {
      position: absolute; height: 2px;
      background: linear-gradient(90deg, transparent, var(--accent), transparent);
      box-shadow: 0 0 8px var(--accent);
      z-index: 1;
    }
    .strip-top { top: 240px; left: 10%; right: 10%; }
    .strip-bottom { bottom: 130px; left: 15%; right: 15%; }

    /* Marcas tech en esquinas */
    .corner-tech {
      position: absolute; width: 32px; height: 32px;
      border: 2px solid var(--accent); z-index: 2;
      box-shadow: 0 0 8px rgba(228,240,0,0.5);
    }
    .corner-tech.tl { top: 24px; left: 24px; border-right: none; border-bottom: none; }
    .corner-tech.tr { top: 24px; right: 24px; border-left: none; border-bottom: none; }
    .corner-tech.bl { bottom: 24px; left: 24px; border-right: none; border-top: none; }
    .corner-tech.br { bottom: 24px; right: 24px; border-left: none; border-top: none; }

    /* Hero: Orbitron tech display */
    .hero h1 {
      font-family: 'Orbitron', 'JetBrains Mono', monospace !important;
      font-style: normal !important;
      font-weight: 900 !important;
      font-size: 88px !important;
      letter-spacing: 8px !important;
      line-height: 1 !important;
      text-transform: uppercase;
      color: var(--accent) !important;
      text-shadow: 0 0 20px rgba(228,240,0,0.5);
    }
    .hero .sub {
      font-family: 'JetBrains Mono', monospace !important;
      font-weight: 400 !important;
      letter-spacing: 4px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      color: var(--text) !important;
      opacity: .65;
    }
    .hero .sub::before { content: '> '; color: var(--accent); }

    /* Logo en card oscura con borde lima */
    .logo {
      background: var(--card-bg) !important;
      border: 1px solid rgba(228,240,0,0.3);
    }

    /* Brand name tech */
    .brand-name .big {
      font-family: 'Orbitron', monospace !important;
      font-weight: 700 !important;
      font-size: 46px !important;
      letter-spacing: 4px !important;
      color: var(--accent) !important;
      text-shadow: 0 0 16px rgba(228,240,0,0.4);
    }
    .brand-name .small {
      font-family: 'JetBrains Mono', monospace !important;
      font-weight: 500 !important;
      letter-spacing: 3px !important;
      color: var(--text) !important;
      opacity: .65 !important;
    }

    /* Pill negra con borde lima glow */
    .date-pill {
      background: transparent !important;
      border: 1.5px solid var(--accent);
      color: var(--accent) !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-weight: 500 !important;
      font-size: 16px !important;
      letter-spacing: 2px !important;
      border-radius: 4px !important;
      box-shadow: 0 0 16px rgba(228,240,0,0.35);
    }

    /* Cards oscuras con borde glow */
    .card {
      background: var(--card-bg-active, var(--card-bg)) !important;
      border-radius: 4px !important;
      border: 1px solid rgba(228,240,0,0.18) !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      position: relative;
    }
    .card.is-white { --card-bg-active: #1C1C1A; }
    .card.is-alt   { --card-bg-active: #262624; }

    /* Línea LED en cada card */
    .card::before {
      content: ''; position: absolute; top: 50%; left: 0;
      width: 4px; height: 30px;
      background: var(--accent);
      box-shadow: 0 0 10px var(--accent);
      transform: translateY(-50%);
    }

    .card .date .day {
      font-family: 'Orbitron', monospace !important;
      font-weight: 700 !important;
      font-size: 56px !important;
      color: var(--accent) !important;
      letter-spacing: -1px !important;
    }
    .card .date .month {
      font-family: 'JetBrains Mono', monospace !important;
      font-weight: 500 !important;
      letter-spacing: 2.5px !important;
      color: var(--text) !important;
      opacity: .8;
    }
    .card .bar { display: none !important; }
    .card .body .title {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      color: var(--text) !important;
      font-size: 26px !important;
    }
    .card .body .meta {
      font-family: 'JetBrains Mono', monospace !important;
      font-weight: 400 !important;
      letter-spacing: 1.5px !important;
      color: var(--accent) !important;
      opacity: .85 !important;
      font-size: 13px !important;
      text-transform: lowercase;
    }
    .card .icon { color: var(--accent) !important; opacity: .7; }

    .card.empty {
      background: transparent !important;
      border: 1px dashed rgba(228,240,0,0.3) !important;
    }
    .card.empty::before { display: none; }
    .card.empty .body .title,
    .card.empty .body .meta { color: var(--text) !important; opacity: .35; }

    /* Divider tech */
    .divider .line {
      background: linear-gradient(90deg, transparent, var(--accent), transparent) !important;
      height: 1px !important;
      box-shadow: 0 0 6px var(--accent);
    }
    .divider .dot {
      background: var(--accent) !important;
      box-shadow: 0 0 12px var(--accent);
      width: 8px !important; height: 8px !important;
    }

    /* Footer tech */
    .footer .tagline {
      font-family: 'JetBrains Mono', monospace !important;
      font-style: normal !important;
      color: var(--accent) !important;
      text-transform: uppercase;
      letter-spacing: 3px;
      font-size: 14px !important;
    }
    .footer .tagline::before { content: '// '; }
    .footer .agency {
      font-family: 'Orbitron', monospace;
      color: var(--text) !important;
      letter-spacing: 6px !important;
    }
    .footer .agency-dot { background: var(--accent) !important; box-shadow: 0 0 6px var(--accent); }
    .footer .url { color: var(--text) !important; opacity: .5 !important; }
  `,
})
