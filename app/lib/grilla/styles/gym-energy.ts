// app/lib/grilla/styles/gym-energy.ts
// Distribuidora Fitness — ESTILO v2 (22 may 2026, definido por Pedro).
// Referencia visual: catálogo Warrior x DF (raw + crunch).
// Documentado en plugins/.../marca-3-distribuidora-fitness/09-estilo-diseno.md
//
// Mood: cinematográfico · dark grafito · humo naranja-rojizo · gym hardcore premium.
// Sistema: Background dark + "Fiery Red Smoke" overlay + chips naranjas angulares +
// Saira Condensed italic black para display.
//
// CAMBIO TOTAL vs v1: antes era blanco+Anton+speed lines. Ahora es DARK + SMOKE +
// SAIRA ITALIC + chips con corte angular. No mezclar las dos visiones.

import type { StyleBuilder } from './types'

export const gymEnergy: StyleBuilder = () => ({
  decorations: `
    <div class="smoke-layer"></div>
    <div class="vignette-tl"></div>
    <div class="vignette-tr"></div>
    <div class="vignette-bl"></div>
    <div class="vignette-br"></div>
  `,
  extraCss: `
    /* Background full dark con humo naranja-rojizo oficial */
    .poster {
      background: #0D0D0D !important;
      position: relative;
    }
    .smoke-layer {
      position: absolute; inset: 0; z-index: 0;
      background-image: url('/marcas/distribuidora-fitness/fiery-red-smoke.png');
      background-size: cover;
      background-position: center 35%;
      background-repeat: no-repeat;
      opacity: 0.85;
      mix-blend-mode: screen;
      pointer-events: none;
    }
    /* Vignette en esquinas para foco al contenido */
    .vignette-tl, .vignette-tr, .vignette-bl, .vignette-br {
      position: absolute; width: 360px; height: 360px;
      pointer-events: none; z-index: 1;
    }
    .vignette-tl { top: 0; left: 0;
      background: radial-gradient(ellipse at top left, rgba(0,0,0,0.65), transparent 70%); }
    .vignette-tr { top: 0; right: 0;
      background: radial-gradient(ellipse at top right, rgba(0,0,0,0.55), transparent 70%); }
    .vignette-bl { bottom: 0; left: 0;
      background: radial-gradient(ellipse at bottom left, rgba(0,0,0,0.5), transparent 70%); }
    .vignette-br { bottom: 0; right: 0;
      background: radial-gradient(ellipse at bottom right, rgba(0,0,0,0.6), transparent 70%); }

    /* HEADER ─────────────────────────────────────── */
    .header { position: relative; z-index: 3; }
    .brand-name .big {
      font-family: 'Saira Condensed', 'Bebas Neue', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 900 !important;
      font-size: 56px !important;
      letter-spacing: 1px !important;
      text-transform: uppercase;
      color: #FFFFFF !important;
      line-height: 0.9 !important;
    }
    .brand-name .small {
      font-family: 'Inter', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 3px !important;
      text-transform: uppercase;
      color: var(--accent) !important;
      opacity: 1 !important;
      font-size: 14px !important;
      margin-top: 8px !important;
    }

    /* Date pill — chip naranja con corte angular (firma visual DF) */
    .date-pill {
      background: var(--accent) !important;
      color: #FFFFFF !important;
      font-family: 'Saira Condensed', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 900 !important;
      font-size: 22px !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase;
      padding: 14px 30px !important;
      border-radius: 0 !important;
      clip-path: polygon(6% 0, 100% 0, 94% 100%, 0 100%);
      box-shadow: 0 8px 24px rgba(245,73,34,0.45);
    }

    /* HERO ─────────────────────────────────────── */
    .hero { position: relative; z-index: 3; }
    .hero h1 {
      font-family: 'Saira Condensed', 'Bebas Neue', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 900 !important;
      font-size: 158px !important;
      letter-spacing: -2px !important;
      line-height: 0.88 !important;
      text-transform: uppercase;
      color: #FFFFFF !important;
      text-shadow: 6px 6px 0 rgba(245,73,34,0.55), 8px 8px 30px rgba(245,73,34,0.3);
    }
    .hero .sub {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 5px !important;
      text-transform: uppercase;
      font-size: 14px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
      margin-top: 16px !important;
    }
    .hero .sub::before { content: '— '; }
    .hero .sub::after  { content: ' —'; }

    /* CARDS ─────────────────────────────────────── */
    .cards { position: relative; z-index: 3; }
    .card {
      background: rgba(31,31,29,0.92) !important;
      border-radius: 2px !important;
      border-left: 6px solid var(--accent) !important;
      box-shadow: 0 4px 14px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,73,34,0.18);
      padding: 18px 28px !important;
      backdrop-filter: blur(4px);
    }
    .card.is-alt {
      background: rgba(38,38,36,0.92) !important;
      border-left-color: #FF6B45 !important;
    }
    .card .date .day {
      font-family: 'Saira Condensed', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 900 !important;
      font-size: 76px !important;
      letter-spacing: -2px !important;
      color: var(--accent) !important;
      line-height: 0.9 !important;
    }
    .card .date .month {
      font-family: 'Inter', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 3px !important;
      color: #FFFFFF !important;
      opacity: 0.85;
      text-transform: uppercase;
      font-size: 14px !important;
    }
    .card .bar { display: none !important; }
    .card .body .title {
      font-family: 'Saira Condensed', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 800 !important;
      font-size: 30px !important;
      letter-spacing: 0 !important;
      text-transform: uppercase;
      color: #FFFFFF !important;
      line-height: 1.05 !important;
    }
    .card .body .meta {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      font-size: 12px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }
    .card .icon { color: var(--accent) !important; opacity: 0.7; }

    /* Cards vacías (sin publicación) */
    .card.empty {
      background: rgba(13,13,13,0.55) !important;
      border: 1px dashed rgba(245,73,34,0.35) !important;
      border-left: 1px dashed rgba(245,73,34,0.35) !important;
    }
    .card.empty .body .title,
    .card.empty .body .meta { color: #FFFFFF !important; opacity: 0.35; }
    .card.empty .date .day,
    .card.empty .date .month { opacity: 0.35; }

    /* DIVIDER — flecha naranja motion */
    .divider .line {
      background: linear-gradient(90deg, transparent, var(--accent)) !important;
      height: 3px !important;
      box-shadow: 0 0 12px rgba(245,73,34,0.5);
    }
    .divider .dot {
      background: transparent !important;
      width: 0 !important; height: 0 !important;
      border-radius: 0 !important;
      border-style: solid !important;
      border-width: 10px 0 10px 16px !important;
      border-color: transparent transparent transparent var(--accent) !important;
      filter: drop-shadow(0 0 8px rgba(245,73,34,0.6));
    }

    /* FOOTER ─────────────────────────────────────── */
    .footer .tagline {
      font-family: 'Saira Condensed', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 800 !important;
      text-transform: uppercase;
      letter-spacing: 4px !important;
      color: var(--accent) !important;
      font-size: 18px !important;
      margin-bottom: 12px !important;
    }
    /* Footer URL en blanco/gris sutil sobre dark */
    .footer .url {
      color: #FFFFFF !important;
      opacity: 0.5 !important;
      letter-spacing: 3px !important;
      text-transform: uppercase;
    }
    /* Logo Distinto sobre dark — invertir colores con CSS filter para
       que el morado/amarillo se mantenga visible sin perder identidad */
    .footer .agency-logo {
      filter: brightness(1) drop-shadow(0 0 12px rgba(255,255,255,0.15));
      height: 50px !important;
    }
  `,
})
