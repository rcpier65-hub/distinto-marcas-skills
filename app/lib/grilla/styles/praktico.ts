// app/lib/grilla/styles/praktico.ts
// Praktico — Distribuidor Mayorista de Productos Prácticos.
// Guía visual de marca (imagen compartida 27-jun-2026):
//   Negro #000000 (fondo protagonista) + Madera Natural #C89A62 (acento)
//   + Blanco #FFFFFF + Gris Oscuro #2D2D2D.
//   Estética: funcional/industrial, producto protagonista, textos directos.
//   Tipografía: sans-serif moderna contundente → Barlow Condensed (display)
//   + DM Sans (body). Ambiente taller/industria.

import type { StyleBuilder } from './types'

export const industrialPractical: StyleBuilder = () => ({
  decorations: `
    <div class="pk-grid"></div>
    <div class="pk-corner pk-corner-tr"></div>
    <div class="pk-corner pk-corner-bl"></div>
    <div class="pk-stripe pk-stripe-1"></div>
    <div class="pk-stripe pk-stripe-2"></div>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Negro industrial puro + cuadrícula técnica muy sutil + esquinas geométricas. */
    .poster { background: var(--canvas) !important; }

    /* Cuadrícula industrial fina (estética blueprint/taller) */
    .pk-grid {
      position: absolute; inset: 0; z-index: 0; pointer-events: none;
      background-image:
        linear-gradient(rgba(200,154,98,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(200,154,98,0.07) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(ellipse 90% 80% at 50% 50%, #000 40%, transparent 100%);
      -webkit-mask-image: radial-gradient(ellipse 90% 80% at 50% 50%, #000 40%, transparent 100%);
    }

    /* Esquinas geométricas (corchetes de ángulo — estética técnica industrial) */
    .pk-corner {
      position: absolute; z-index: 1; pointer-events: none;
      width: 32px; height: 32px;
      border-color: rgba(200,154,98,0.55);
      border-style: solid;
    }
    .pk-corner-tr { top: 44px; right: 44px; border-width: 2px 2px 0 0; }
    .pk-corner-bl { bottom: 44px; left: 44px; border-width: 0 0 2px 2px; }

    /* Franjas doradas verticales muy sutiles en bordes */
    .pk-stripe {
      position: absolute; z-index: 0; pointer-events: none;
      width: 3px; top: 0; bottom: 0;
      background: linear-gradient(to bottom, transparent 0%, rgba(200,154,98,0.25) 30%, rgba(200,154,98,0.25) 70%, transparent 100%);
    }
    .pk-stripe-1 { left: 34px; }
    .pk-stripe-2 { right: 34px; }

    /* ═══════════════ HEADER ═══════════════
       Logo Praktico = wordmark tipográfico puro (igual al logo oficial).
       El <img> se oculta; el wordmark se renderiza via .brand-name con Nunito
       (fuente web que replica la sans-serif geométrica redondeada del logo real).
       Date pill: dorado sólido con texto negro. */
    .header {
      position: relative; z-index: 3;
      align-items: center !important;
      gap: 0 !important;
      margin-bottom: 4px !important;
    }
    /* Ocultar el placeholder SVG — el wordmark va todo en .brand-name */
    .logo { display: none !important; }
    .brand-name { flex: 1; }
    .brand-name .small {
      font-family: 'Nunito', sans-serif !important;
      font-size: 10px !important; font-weight: 400 !important;
      letter-spacing: 3.5px !important; text-transform: uppercase;
      color: rgba(255,255,255,0.55) !important;
      margin-bottom: 4px !important;
    }
    .brand-name .big {
      font-family: 'Nunito', sans-serif !important;
      font-size: 52px !important; font-weight: 700 !important;
      letter-spacing: -1px !important; text-transform: none;
      color: #FFFFFF !important;
      line-height: 1 !important;
    }
    .date-pill {
      margin-left: auto !important;
      background: #C89A62 !important;
      color: #0A0A0A !important;
      font-family: 'Barlow Condensed', sans-serif !important;
      font-weight: 800 !important;
      font-size: 20px !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase;
      padding: 12px 24px !important;
      border-radius: 4px !important;
      box-shadow: 0 8px 24px rgba(200,154,98,0.35);
    }

    /* ═══════════════ HERO ═══════════════
       Barlow Condensed extrabold blanco mayúsculas — eco de los títulos de los posts
       ("SOLUCIONES QUE HACEN EL TRABAJO", "HERRAMIENTAS EN LAS QUE PUEDES CONFIAR"). */
    .hero {
      position: relative; z-index: 3;
      margin: 38px 0 28px !important;
    }
    .hero h1 {
      font-family: 'Barlow Condensed', sans-serif !important;
      font-style: normal !important;
      font-weight: 900 !important;
      font-size: 100px !important;
      letter-spacing: 1px !important;
      line-height: 0.9 !important;
      color: #FFFFFF !important;
      text-transform: uppercase;
    }
    /* Palabra de acento dorado en el hero (segunda línea si aplica) */
    .hero h1 span { color: #C89A62 !important; }
    .hero .sub {
      font-family: 'DM Sans', sans-serif !important;
      font-weight: 400 !important;
      font-size: 18px !important;
      letter-spacing: 0.5px !important;
      color: rgba(255,255,255,0.55) !important;
      margin-top: 14px !important;
    }
    /* Divisor: línea dorada con punto rombo central */
    .divider { margin-top: 20px !important; gap: 14px !important; }
    .divider .line {
      height: 2px !important; width: 180px !important; border-radius: 0 !important;
      background: rgba(200,154,98,0.55) !important;
    }
    .divider .dot {
      width: 10px !important; height: 10px !important;
      background: #C89A62 !important;
      border-radius: 1px !important;
      transform: rotate(45deg);
    }

    /* ═══════════════ CARDS ═══════════════
       Gris oscuro #141414 con borde izquierdo dorado — estética de panel industrial.
       Número grande DM Sans black blanco. Etiqueta de día dorada uppercase. */
    .cards {
      position: relative; z-index: 3;
      gap: 14px !important;
    }
    .card {
      background: #111111 !important;
      border-radius: 6px !important;
      padding: 20px 26px !important;
      gap: 22px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04) !important;
      border-left: 5px solid #C89A62 !important;
    }
    .card.is-alt {
      background: #161616 !important;
      border-left-color: rgba(200,154,98,0.6) !important;
    }
    .card .bar { display: none !important; }
    .card .date {
      min-width: 88px !important;
      text-align: center !important;
      padding-right: 20px;
      border-right: 1px solid rgba(200,154,98,0.22);
      display: flex !important; flex-direction: column !important;
    }
    /* .day = número · .month = abreviatura del día (Lun/Mar…) */
    .card .date .day {
      font-family: 'DM Sans', sans-serif !important;
      font-weight: 800 !important;
      font-size: 50px !important;
      letter-spacing: -2px !important;
      color: #FFFFFF !important;
      line-height: 0.9 !important;
      order: 2;
    }
    .card .date .month {
      font-family: 'DM Sans', sans-serif !important;
      font-weight: 700 !important;
      font-size: 13px !important;
      letter-spacing: 3px !important;
      text-transform: uppercase;
      color: #C89A62 !important;
      opacity: 1 !important;
      margin: 0 0 2px !important;
      order: 1;
    }
    .card .body .title {
      font-family: 'Barlow Condensed', sans-serif !important;
      font-weight: 700 !important;
      font-size: 28px !important;
      letter-spacing: 0.3px !important;
      text-transform: uppercase;
      color: #FFFFFF !important;
      line-height: 1.08 !important;
    }
    .card .body .meta {
      font-family: 'DM Sans', sans-serif !important;
      font-weight: 400 !important;
      font-size: 15px !important;
      letter-spacing: 0.3px !important;
      text-transform: none;
      color: rgba(255,255,255,0.45) !important;
      margin-top: 5px !important;
    }
    .card .icon {
      color: #C89A62 !important;
      opacity: 0.75;
      width: 52px !important; height: 52px !important;
    }

    /* Empty cards — dashed dorado muy sutil sobre negro */
    .card.empty {
      background: rgba(255,255,255,0.02) !important;
      border: 1.5px dashed rgba(200,154,98,0.28) !important;
      border-left: 1.5px dashed rgba(200,154,98,0.28) !important;
      box-shadow: none !important;
    }
    .card.empty .date { border-right-color: rgba(200,154,98,0.15); }
    .card.empty .date .day { color: #FFFFFF !important; opacity: 0.3; }
    .card.empty .date .month { color: #FFFFFF !important; opacity: 0.3; }
    .card.empty .body .title {
      color: #FFFFFF !important; opacity: 0.35;
      font-weight: 500 !important; font-style: italic; text-transform: none;
    }
    .card.empty .body .meta { color: #FFFFFF !important; opacity: 0.22; }
    .card.empty .icon { color: #FFFFFF !important; opacity: 0.15; }

    /* ═══════════════ FOOTER ═══════════════
       URL en dorado con tracking ancho — eco de los textos en los posts del manual. */
    .footer {
      position: relative; z-index: 3;
      padding-top: 20px !important;
      border-top: 1px solid rgba(200,154,98,0.22);
    }
    .footer .tagline { display: none !important; }
    .footer .agency-mark { display: none !important; }
    .footer .url {
      color: #C89A62 !important;
      opacity: 0.8 !important;
      letter-spacing: 3px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      font-weight: 700 !important;
      margin-top: 12px !important;
      font-family: 'DM Sans', sans-serif !important;
    }
  `,
})
