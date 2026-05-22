// app/lib/grilla/styles/gym-energy.ts
// Distribuidora Fitness — ESTILO v3 (22 may 2026, feedback "más blanco" de Pedro).
// Referencia: catálogo Warrior x DF + skill `09-estilo-diseno.md`.
//
// Mood: MAGAZINE EDITORIAL GYM PREMIUM
//   Dark + Fiery Red Smoke = "stage" cinematográfico atmosférico
//   Cards BLANCAS = paneles de información que rompen con luz (jerarquía)
//   Logos en NEGATIVO (blanco via filter CSS) — manual permite versión negativa
//   Saira Condensed italic 900 = velocidad / fuerza / hardcore gym
//
// Cambio vs v2: cards dark → blancas, logos full color → blanco filter.
// Resuelve: "más blanco" + logos legibles + jerarquía editorial.

import type { StyleBuilder } from './types'

export const gymEnergy: StyleBuilder = () => ({
  decorations: `
    <div class="smoke-layer"></div>
    <div class="smoke-darker"></div>
    <div class="vignette-top"></div>
    <div class="vignette-bottom"></div>
    <div class="orange-accent-line top"></div>
    <div class="orange-accent-line bottom"></div>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Dark grafito + capa "Fiery Red Smoke" oficial + vignettes para foco */
    .poster {
      background: #0D0D0D !important;
      position: relative;
    }
    .smoke-layer {
      position: absolute; inset: 0; z-index: 0;
      background-image: url('/marcas/distribuidora-fitness/fiery-red-smoke.png');
      background-size: cover;
      background-position: center 40%;
      background-repeat: no-repeat;
      opacity: 0.78;
      mix-blend-mode: screen;
      pointer-events: none;
    }
    /* Capa adicional para profundidad y oscurecer parte inferior */
    .smoke-darker {
      position: absolute; inset: 0; z-index: 0;
      background:
        linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.55) 100%);
      pointer-events: none;
    }
    /* Vignette focal */
    .vignette-top, .vignette-bottom {
      position: absolute; left: 0; right: 0; z-index: 1;
      pointer-events: none;
    }
    .vignette-top { top: 0; height: 280px;
      background: linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 100%); }
    .vignette-bottom { bottom: 0; height: 220px;
      background: linear-gradient(0deg, rgba(0,0,0,0.65) 0%, transparent 100%); }

    /* Acentos naranjas estructurales (firma de marca) */
    .orange-accent-line {
      position: absolute; height: 4px; background: var(--accent);
      left: 70px; right: 70px; z-index: 2;
      box-shadow: 0 0 18px rgba(245,73,34,0.55);
    }
    .orange-accent-line.top { top: 32px; }
    .orange-accent-line.bottom { bottom: 32px; }

    /* ═══════════════ HEADER ═══════════════
       Logo DF en NEGATIVO (blanco via filter) sin wrapper. Flota sobre smoke. */
    .header {
      position: relative; z-index: 3;
      gap: 24px !important;
      margin-bottom: 16px !important;
    }
    /* El logo se rinde en blanco para integrarse con el dark canvas */
    .logo {
      filter: brightness(0) invert(1);
      filter: drop-shadow(0 4px 20px rgba(255,255,255,0.12)) brightness(0) invert(1);
      margin: 0 !important;
      width: 140px !important;
      height: 140px !important;
    }
    .brand-name .big {
      font-family: 'Saira Condensed', 'Bebas Neue', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 900 !important;
      font-size: 58px !important;
      letter-spacing: 0.5px !important;
      text-transform: uppercase;
      color: #FFFFFF !important;
      line-height: 0.92 !important;
    }
    .brand-name .small {
      font-family: 'Inter', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 3.5px !important;
      text-transform: uppercase;
      color: var(--accent) !important;
      opacity: 1 !important;
      font-size: 13px !important;
      margin-bottom: 10px !important;
    }

    /* Date pill — chip blanco con corte angular + texto naranja
       (rompe el dark, espejo del precio "S./200" en Warrior) */
    .date-pill {
      background: #FFFFFF !important;
      color: var(--accent) !important;
      font-family: 'Saira Condensed', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 900 !important;
      font-size: 21px !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase;
      padding: 14px 32px !important;
      border-radius: 0 !important;
      clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    /* ═══════════════ HERO ═══════════════ */
    .hero {
      position: relative; z-index: 3;
      margin: 22px 0 24px !important;
    }
    .hero h1 {
      font-family: 'Saira Condensed', 'Bebas Neue', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 900 !important;
      font-size: 156px !important;
      letter-spacing: -2px !important;
      line-height: 0.88 !important;
      text-transform: uppercase;
      color: #FFFFFF !important;
      text-shadow:
        4px 4px 0 rgba(245,73,34,0.85),
        8px 8px 40px rgba(245,73,34,0.4);
    }
    .hero .sub {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 5px !important;
      text-transform: uppercase;
      font-size: 14px !important;
      color: #FFFFFF !important;
      opacity: 0.85 !important;
      margin-top: 16px !important;
    }
    /* Divider — barra naranja sólida (más editorial que la flecha previa) */
    .divider { margin-top: 18px !important; }
    .divider .line {
      background: var(--accent) !important;
      height: 4px !important;
      width: 80px !important;
      box-shadow: 0 0 14px rgba(245,73,34,0.6);
      border-radius: 0 !important;
    }
    .divider .dot {
      width: 8px !important; height: 8px !important;
      background: var(--accent) !important;
      border-radius: 0 !important;
      transform: rotate(45deg);
      box-shadow: 0 0 10px rgba(245,73,34,0.7);
    }

    /* ═══════════════ CARDS BLANCAS (paneles editoriales) ═══════════════
       Lo que rompe el dark — espejo de los chips de precio en Warrior.
       Texto dark grafito, día (DD) naranja italic grande, plataformas
       naranja uppercase. Border-left naranja gruesa = continuidad con
       el resto del sistema. */
    .cards {
      position: relative; z-index: 3;
      gap: 12px !important;
    }
    .card {
      background: #FFFFFF !important;
      border-radius: 4px !important;
      border-left: 7px solid var(--accent) !important;
      box-shadow: 0 6px 28px rgba(0,0,0,0.55);
      padding: 18px 30px !important;
      position: relative;
    }
    .card.is-alt {
      background: #FAFAFA !important;
      border-left-color: #FF6B45 !important;
    }
    .card .date .day {
      font-family: 'Saira Condensed', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 900 !important;
      font-size: 72px !important;
      letter-spacing: -2px !important;
      color: var(--accent) !important;
      line-height: 0.88 !important;
    }
    .card .date .month {
      font-family: 'Inter', sans-serif !important;
      font-weight: 800 !important;
      letter-spacing: 3px !important;
      color: #1A1818 !important;
      opacity: 0.55;
      text-transform: uppercase;
      font-size: 13px !important;
      margin-top: 4px !important;
    }
    .card .bar { display: none !important; }
    .card .body .title {
      font-family: 'Saira Condensed', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 800 !important;
      font-size: 28px !important;
      letter-spacing: 0 !important;
      text-transform: uppercase;
      color: #1A1818 !important;
      line-height: 1.05 !important;
    }
    .card .body .meta {
      font-family: 'Inter', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      font-size: 11px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
      margin-top: 4px !important;
    }
    .card .icon {
      color: var(--accent) !important;
      opacity: 0.8;
      width: 52px !important;
      height: 52px !important;
    }

    /* Cards vacías (sin publicación) — fondo gris claro semi-translúcido
       sobre el dark, dashed border naranja sutil */
    .card.empty {
      background: rgba(255,255,255,0.06) !important;
      border: 1.5px dashed rgba(245,73,34,0.5) !important;
      border-left: 1.5px dashed rgba(245,73,34,0.5) !important;
      box-shadow: none;
    }
    .card.empty .body .title {
      color: #FFFFFF !important;
      opacity: 0.45;
      font-weight: 700 !important;
    }
    .card.empty .body .meta {
      color: #FFFFFF !important;
      opacity: 0.3;
    }
    .card.empty .date .day {
      color: rgba(245,73,34,0.5) !important;
    }
    .card.empty .date .month {
      color: #FFFFFF !important;
      opacity: 0.35;
    }
    .card.empty .icon {
      color: #FFFFFF !important;
      opacity: 0.2;
    }

    /* ═══════════════ FOOTER ═══════════════ */
    .footer {
      position: relative; z-index: 3;
      padding-top: 22px !important;
    }
    .footer .tagline {
      font-family: 'Saira Condensed', Impact, sans-serif !important;
      font-style: italic !important;
      font-weight: 800 !important;
      text-transform: uppercase;
      letter-spacing: 4px !important;
      color: #FFFFFF !important;
      font-size: 19px !important;
      margin-bottom: 14px !important;
    }
    /* Logo Distinto en NEGATIVO sobre dark — filter convierte morado+amarillo
       a blanco puro, manteniendo formas. Drop-shadow sutil para presencia. */
    .footer .agency-mark { margin: 6px 0 8px !important; }
    .footer .agency-logo {
      filter: brightness(0) invert(1);
      filter: drop-shadow(0 2px 10px rgba(255,255,255,0.15)) brightness(0) invert(1);
      height: 52px !important;
      opacity: 0.95;
    }
    .footer .url {
      color: #FFFFFF !important;
      opacity: 0.45 !important;
      letter-spacing: 3.5px !important;
      text-transform: uppercase;
      font-size: 11px !important;
      margin-top: 4px !important;
    }
  `,
})
