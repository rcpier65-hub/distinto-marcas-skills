// app/lib/grilla/styles/led-technical.ts
// Novalamps — ESTILO v2 (22 may 2026).
// Referencia: post "Día de la Madre 2026" Novalamps + manual oficial.
//
// Mood: EDITORIAL DARK LUXURY · Iluminación premium aspiracional
//   Canvas grafito muy oscuro `#1A1A1A` con glow lima sutil
//   Verde lima `#D2DD00` PROTAGONISTA como acento (manual: "debe predominar")
//   Serif moderna ALL CAPS blanco grande (espejo del "HACEN DEL ESPACIO UN HOGAR")
//   Script italic Caveat para palabras destacadas con underline lima ("Día")
//   Logo "novaLamps eléctrika" en header
//
// CAMBIO TOTAL vs v1: v1 era Inter blanco con lima dominante en chips/blocks.
// v2 sigue el post DM real: dark editorial + serif Playfair + lima underlines.

import type { StyleBuilder } from './types'

export const ledTechnical: StyleBuilder = () => ({
  decorations: `
    <div class="lime-glow"></div>
    <div class="lime-accent top"></div>
    <div class="lime-accent bottom"></div>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Grafito muy oscuro con glow lima central. */
    .poster {
      background: radial-gradient(ellipse at 50% 30%, #262726 0%, #1A1A1A 60%, #0D0D0D 100%) !important;
      position: relative;
    }
    /* Glow lima central muy sutil (firma visual NovaLamps) */
    .lime-glow {
      position: absolute; inset: 0; z-index: 0;
      background: radial-gradient(ellipse 1000px 700px at 50% 40%, rgba(210,221,0,0.08) 0%, transparent 70%);
      pointer-events: none;
    }
    /* Barras finas verde lima en bordes (acento estructural) */
    .lime-accent {
      position: absolute; height: 2px; background: var(--accent);
      left: 70px; right: 70px; z-index: 2;
      box-shadow: 0 0 14px rgba(210,221,0,0.5);
    }
    .lime-accent.top { top: 30px; }
    .lime-accent.bottom { bottom: 28px; }

    /* ═══════════════ HEADER ═══════════════
       Logo "novaLamps eléctrika" izquierda (aspect 4.32:1 banner).
       Brand-name visible con sub-marca eléctrika. */
    .header {
      position: relative; z-index: 3;
      gap: 22px !important;
      margin-bottom: 18px !important;
      align-items: center !important;
    }
    .logo {
      margin: 0 !important;
      width: 280px !important;
      height: 65px !important;
      padding: 0 !important;
      object-position: left center !important;
      /* Logo es negro + verde lima. Sobre canvas dark, el negro desaparece.
         Filter: invert para que el negro→blanco, conservando lima saturado */
      filter: brightness(0) invert(1) sepia(0.3) saturate(2) hue-rotate(35deg);
    }
    .brand-name { display: none !important; }

    /* Date pill — sans uppercase tracking + underline verde lima
       (espejo del estilo de los labels del post DM NovaLamps) */
    .date-pill {
      margin-left: auto !important;
      background: transparent !important;
      color: var(--accent) !important;
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      letter-spacing: 3px !important;
      text-transform: uppercase;
      padding: 8px 0 !important;
      border-radius: 0 !important;
      border-bottom: 2px solid var(--accent) !important;
      box-shadow: none !important;
    }

    /* ═══════════════ HERO ═══════════════
       Serif moderna ALL CAPS blanco gigante (espejo "HACEN DEL ESPACIO UN HOGAR") */
    .hero {
      position: relative; z-index: 3;
      margin: 30px 0 28px !important;
      text-align: center !important;
    }
    .hero h1 {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-style: normal !important;
      font-weight: 600 !important;
      font-size: 116px !important;
      letter-spacing: -1px !important;
      line-height: 0.95 !important;
      text-transform: uppercase;
      color: var(--primary) !important;
    }
    .hero .sub {
      font-family: 'Inter', sans-serif !important;
      font-style: normal !important;
      font-weight: 500 !important;
      letter-spacing: 4px !important;
      text-transform: uppercase;
      font-size: 13px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
      margin-top: 18px !important;
    }
    /* Divider — underline verde lima delgado (firma visual) */
    .divider { margin-top: 12px !important; }
    .divider .line {
      background: var(--accent) !important;
      height: 2px !important;
      width: 80px !important;
      box-shadow: 0 0 10px rgba(210,221,0,0.5);
    }
    .divider .dot { display: none !important; }

    /* ═══════════════ CARDS BLANCAS ═══════════════
       Editoriales sobre dark. Día (DD) en chip grafito + texto verde lima
       como acento dominante (manual: lima debe predominar). */
    .cards {
      position: relative; z-index: 3;
      gap: 11px !important;
    }
    .card {
      background: var(--card-bg) !important;
      border-radius: 4px !important;
      border-left: 5px solid var(--accent) !important;
      box-shadow: 0 8px 28px rgba(0,0,0,0.55);
      padding: 16px 26px !important;
      display: flex !important;
      align-items: center !important;
      gap: 22px !important;
    }
    .card.is-alt {
      background: var(--card-alt) !important;
    }
    .card .date {
      background: #1A1A1A;
      color: var(--accent);
      padding: 12px 18px;
      border-radius: 3px;
      min-width: 92px !important;
      text-align: center !important;
      flex-shrink: 0;
    }
    .card .date .day {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 700 !important;
      font-size: 48px !important;
      letter-spacing: -1px !important;
      color: var(--accent) !important;
      line-height: 0.95 !important;
    }
    .card .date .month {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 3px !important;
      color: var(--primary) !important;
      opacity: 0.85;
      text-transform: uppercase;
      font-size: 11px !important;
      margin-top: 3px !important;
    }
    .card .bar { display: none !important; }
    .card .body .title {
      font-family: 'Playfair Display', Georgia, serif !important;
      font-weight: 600 !important;
      font-size: 26px !important;
      letter-spacing: -0.2px !important;
      color: #1A1A1A !important;
      line-height: 1.15 !important;
      text-transform: uppercase;
    }
    .card .body .meta {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2.5px !important;
      text-transform: uppercase;
      font-size: 11px !important;
      color: #1A1A1A !important;
      opacity: 0.55 !important;
      margin-top: 4px !important;
    }
    .card .icon {
      color: #1A1A1A !important;
      opacity: 0.55;
      width: 42px !important;
      height: 42px !important;
    }

    /* Empty cards — translúcido sobre dark con dashed lima sutil */
    .card.empty {
      background: rgba(255,255,255,0.05) !important;
      border: 1.5px dashed rgba(210,221,0,0.32) !important;
      box-shadow: none;
    }
    .card.empty .date {
      background: rgba(255,255,255,0.06) !important;
    }
    .card.empty .date .day {
      color: var(--accent) !important;
      opacity: 0.4;
    }
    .card.empty .date .month {
      color: var(--primary) !important;
      opacity: 0.4;
    }
    .card.empty .body .title {
      color: var(--primary) !important;
      opacity: 0.50;
      font-style: italic !important;
      font-weight: 500 !important;
      text-transform: none !important;
    }
    .card.empty .body .meta {
      color: var(--primary) !important;
      opacity: 0.32;
    }
    .card.empty .icon {
      color: var(--primary) !important;
      opacity: 0.22;
    }

    /* ═══════════════ FOOTER ═══════════════ */
    .footer {
      position: relative; z-index: 3;
      padding-top: 26px !important;
    }
    .footer .tagline { display: none !important; }
    .footer .agency-mark { margin: 10px 0 12px !important; }
    .footer .agency-logo {
      filter: brightness(0) invert(1);
      filter: drop-shadow(0 3px 14px rgba(210,221,0,0.15)) brightness(0) invert(1);
      height: 72px !important;
      max-width: 420px !important;
      opacity: 0.92;
    }
    .footer .url {
      font-family: 'Inter', sans-serif !important;
      color: var(--accent) !important;
      opacity: 1 !important;
      letter-spacing: 3px !important;
      text-transform: lowercase;
      font-size: 12px !important;
      font-weight: 500 !important;
      margin-top: 8px !important;
    }
  `,
})
