// app/lib/grilla/styles/playful-italian.ts
// TYPHOUSE — REBRAND v4 (22 may 2026, Pedro: Little Joe → Typhouse).
// Logo Typhouse: símbolo TP celeste + gotas splash + wordmark "typhouse" sans bold.
//
// Mood: EDITORIAL LIMPIO CREATIVO · Agencia de diseño / branding
//   Canvas blanco crema warm sutil (no cielo cartoon — era Little Joe)
//   Acento celeste Typhouse #1FB3E8 (color del símbolo)
//   Tipografía Quicksand bold rounded (coherente con wordmark typhouse)
//   Decoraciones: gotas/salpicaduras celeste (concepto splash del logo)
//   NO mascota Joe, NO corazones, NO cielo, NO script cursive
//
// CAMBIO TOTAL vs v3 Little Joe: rebrand completo a marca de agencia/branding.

import type { StyleBuilder } from './types'

export const playfulItalian: StyleBuilder = () => ({
  decorations: `
    <svg class="splash splash-1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="30" r="5" fill="#1FB3E8" opacity="0.7"/>
      <circle cx="50" cy="15" r="3" fill="#1FB3E8" opacity="0.5"/>
      <circle cx="75" cy="40" r="4" fill="#1FB3E8" opacity="0.6"/>
      <circle cx="40" cy="60" r="3" fill="#1FB3E8" opacity="0.4"/>
      <circle cx="80" cy="75" r="5" fill="#1FB3E8" opacity="0.55"/>
    </svg>
    <svg class="splash splash-2" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="20" r="4" fill="#1FB3E8" opacity="0.55"/>
      <circle cx="60" cy="40" r="6" fill="#1FB3E8" opacity="0.7"/>
      <circle cx="25" cy="65" r="3" fill="#1FB3E8" opacity="0.45"/>
      <circle cx="80" cy="70" r="4" fill="#1FB3E8" opacity="0.6"/>
    </svg>
    <svg class="splash splash-3" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="30" r="3" fill="#1FB3E8" opacity="0.5"/>
      <circle cx="70" cy="50" r="5" fill="#1FB3E8" opacity="0.6"/>
      <circle cx="20" cy="70" r="4" fill="#1FB3E8" opacity="0.55"/>
    </svg>
    <div class="accent-bar top"></div>
    <div class="accent-bar bottom"></div>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Blanco crema warm — editorial limpio agencia */
    .poster {
      background: linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 60%, #F4F9FC 100%) !important;
      position: relative;
    }

    /* Splashes celeste — concepto del logo TP con gotas */
    .splash {
      position: absolute; pointer-events: none; z-index: 1;
    }
    .splash-1 { top: 200px; right: 60px; width: 120px; }
    .splash-2 { bottom: 240px; left: 50px; width: 110px; }
    .splash-3 { top: 880px; right: 200px; width: 80px; opacity: 0.75; }

    /* Barras estructurales celeste */
    .accent-bar {
      position: absolute; height: 4px; background: var(--accent);
      left: 70px; right: 70px; z-index: 2;
      border-radius: 999px;
    }
    .accent-bar.top { top: 28px; }
    .accent-bar.bottom { bottom: 28px; }

    /* ═══════════════ HEADER ═══════════════
       Logo Typhouse grande pegado izquierda. PNG horizontal con whitespace
       interno → object-position left + width grande para visibilidad. */
    .header {
      position: relative; z-index: 3;
      gap: 24px !important;
      margin-bottom: 22px !important;
      align-items: center !important;
    }
    .logo {
      margin: 0 !important;
      width: 340px !important;
      height: 105px !important;
      padding: 0 !important;
      object-position: left center !important;
      filter: drop-shadow(0 3px 10px rgba(31,179,232,0.18));
    }
    .brand-name { display: none !important; }

    /* Date pill — chip celeste rounded (signature visual) */
    .date-pill {
      margin-left: auto !important;
      background: var(--accent) !important;
      color: #FFFFFF !important;
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 700 !important;
      font-size: 16px !important;
      letter-spacing: 1.8px !important;
      text-transform: uppercase;
      padding: 14px 28px !important;
      border-radius: 999px !important;
      box-shadow: 0 8px 22px rgba(31,179,232,0.35);
      border: none !important;
    }

    /* ═══════════════ HERO ═══════════════
       Quicksand 700 + acento celeste (coherente con typhouse wordmark) */
    .hero {
      position: relative; z-index: 3;
      margin: 32px 0 28px !important;
      text-align: center !important;
    }
    .hero h1 {
      font-family: 'Quicksand', sans-serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      font-size: 130px !important;
      letter-spacing: -3px !important;
      line-height: 0.95 !important;
      color: var(--primary) !important;
    }
    .hero h1::first-letter {
      color: var(--accent);
    }
    .hero .sub {
      font-family: 'Quicksand', sans-serif !important;
      font-style: normal !important;
      font-weight: 600 !important;
      letter-spacing: 3.5px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      color: var(--primary) !important;
      opacity: 0.55 !important;
      margin-top: 14px !important;
    }
    .divider { margin-top: 18px !important; }
    .divider .line {
      background: var(--accent) !important;
      height: 3px !important;
      width: 80px !important;
      border-radius: 999px !important;
    }
    .divider .dot {
      width: 10px !important; height: 10px !important;
      background: var(--accent) !important;
      border-radius: 50% !important;
      transform: none !important;
      box-shadow: 0 0 8px rgba(31,179,232,0.5);
    }

    /* ═══════════════ CARDS ═══════════════
       Blancas radius medio con border-left celeste + DD celeste grande */
    .cards {
      position: relative; z-index: 3;
      gap: 11px !important;
    }
    .card {
      background: var(--card-bg) !important;
      border-radius: 14px !important;
      border: 1px solid rgba(31,179,232,0.18) !important;
      border-left: 5px solid var(--accent) !important;
      box-shadow: 0 6px 22px rgba(10,10,10,0.06);
      padding: 16px 26px !important;
      display: flex !important;
      align-items: center !important;
      gap: 22px !important;
    }
    .card.is-alt {
      background: var(--card-alt) !important;
    }
    .card .date {
      min-width: 84px !important;
      text-align: left !important;
      flex-shrink: 0;
    }
    .card .date .day {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 700 !important;
      font-size: 54px !important;
      letter-spacing: -2px !important;
      color: var(--accent) !important;
      line-height: 0.95 !important;
    }
    .card .date .month {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2.5px !important;
      color: var(--primary) !important;
      opacity: 0.5;
      text-transform: uppercase;
      font-size: 11px !important;
      margin-top: 2px !important;
    }
    .card .bar { display: none !important; }
    .card .body .title {
      font-family: 'Quicksand', sans-serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      font-size: 27px !important;
      letter-spacing: -0.2px !important;
      color: var(--primary) !important;
      line-height: 1.15 !important;
    }
    .card .body .meta {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      font-size: 11px !important;
      color: var(--accent) !important;
      opacity: 0.95 !important;
      margin-top: 4px !important;
    }
    .card .icon {
      color: var(--accent) !important;
      opacity: 0.65;
      width: 42px !important;
      height: 42px !important;
    }

    /* Empty cards — translúcidas con dashed celeste sutil */
    .card.empty {
      background: rgba(255,255,255,0.55) !important;
      border: 1.5px dashed rgba(31,179,232,0.35) !important;
      box-shadow: 0 3px 10px rgba(10,10,10,0.04);
    }
    .card.empty .date .day {
      color: var(--accent) !important;
      opacity: 0.5;
    }
    .card.empty .date .month {
      color: var(--primary) !important;
      opacity: 0.45;
    }
    .card.empty .body .title {
      color: var(--primary) !important;
      opacity: 0.5;
      font-style: italic !important;
      font-weight: 500 !important;
    }
    .card.empty .body .meta {
      color: var(--primary) !important;
      opacity: 0.35;
    }
    .card.empty .icon {
      color: var(--primary) !important;
      opacity: 0.22;
    }

    /* ═══════════════ FOOTER ═══════════════ */
    .footer {
      position: relative; z-index: 3;
      padding-top: 28px !important;
    }
    .footer .tagline { display: none !important; }
    .footer .agency-mark { margin: 10px 0 12px !important; }
    .footer .agency-logo {
      filter: drop-shadow(0 3px 12px rgba(10,10,10,0.10));
      height: 64px !important;
      max-width: 380px !important;
    }
    .footer .url {
      font-family: 'Quicksand', sans-serif !important;
      color: var(--accent) !important;
      opacity: 1 !important;
      letter-spacing: 2.5px !important;
      text-transform: lowercase;
      font-size: 12px !important;
      font-weight: 700 !important;
      margin-top: 6px !important;
    }
  `,
})
