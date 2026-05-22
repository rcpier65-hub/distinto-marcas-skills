// app/lib/grilla/styles/playful-italian.ts
// Little Joe Perú — ESTILO v3 (22 may 2026).
// Referencias: post "Día de la Madre 2026" + FONDO CIELO LITTLE JOE-100 oficial
// + Historia destacada mascota Joe rojo en cielo cartoon.
//
// Mood: CUTE CHARMING ITALIANO · cielo cartoon dulce + mascota Joe roja
//   Background: cielo cartoon oficial (fondo-cielo.jpg)
//   Script cursive Caveat para palabras destacadas rosa fucsia
//   Fraunces serif curvy para texto principal navy
//   Quicksand rounded para labels
//   Acentos: rosa fucsia (firma), rojo Joe (mascota), azul navy (texto)
//   Decoraciones: corazones, estrellitas, nubes adicionales
//
// CAMBIO TOTAL vs v2: v2 era azul royal sólido + Fraunces. Ahora fondo cielo
// cartoon oficial + script cursive rosa + paleta warm cute.

import type { StyleBuilder } from './types'

export const playfulItalian: StyleBuilder = () => ({
  decorations: `
    <div class="sky-overlay"></div>
    <svg class="cloud cloud-1" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 70 Q15 70 15 55 Q15 40 35 40 Q40 25 60 25 Q80 25 88 38 Q105 32 115 45 Q135 40 140 55 Q150 50 160 60 Q170 70 160 80 L40 80 Q25 80 30 70 Z" fill="white" opacity="0.96"/>
    </svg>
    <svg class="cloud cloud-2" viewBox="0 0 160 80" xmlns="http://www.w3.org/2000/svg">
      <path d="M25 55 Q12 55 12 42 Q12 30 28 30 Q35 18 50 18 Q66 18 72 30 Q88 25 95 40 Q108 38 110 50 Q118 45 125 55 Q132 65 122 70 L35 70 Q22 70 25 55 Z" fill="white" opacity="0.86"/>
    </svg>
    <svg class="cloud cloud-3" viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 50 Q10 50 10 38 Q10 26 24 26 Q30 16 44 16 Q58 16 64 26 Q78 22 84 35 Q96 32 98 44 Q108 40 112 50 Q118 60 108 65 L30 65 Q18 65 22 50 Z" fill="white" opacity="0.78"/>
    </svg>
    <svg class="heart heart-1" viewBox="0 0 24 24"><path d="M12 21s-7-5.5-7-11a4 4 0 0 1 7-3 4 4 0 0 1 7 3c0 5.5-7 11-7 11z" fill="#E63D6A"/></svg>
    <svg class="heart heart-2" viewBox="0 0 24 24"><path d="M12 21s-7-5.5-7-11a4 4 0 0 1 7-3 4 4 0 0 1 7 3c0 5.5-7 11-7 11z" fill="#E63D6A"/></svg>
    <svg class="heart heart-3" viewBox="0 0 24 24"><path d="M12 21s-7-5.5-7-11a4 4 0 0 1 7-3 4 4 0 0 1 7 3c0 5.5-7 11-7 11z" fill="#E63946"/></svg>
    <svg class="star star-1" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.5 5.8 21l2.3-7.1L2 9.4h7.6z" fill="#EAB308"/></svg>
    <svg class="star star-2" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.5 5.8 21l2.3-7.1L2 9.4h7.6z" fill="#EAB308"/></svg>
  `,
  extraCss: `
    /* ═══════════════ BACKGROUND ═══════════════
       Fondo cielo cartoon OFICIAL del cliente (Kit 2026). */
    .poster {
      background: #9DCEEC !important;
      background-image: url('/marcas/little-joe/fondo-cielo.jpg') !important;
      background-size: cover !important;
      background-position: center !important;
      position: relative;
    }
    /* Overlay sutil para mejorar legibilidad sobre el cielo */
    .sky-overlay {
      position: absolute; inset: 0; z-index: 0;
      background: linear-gradient(180deg, rgba(157,206,236,0.10) 0%, rgba(255,255,255,0.10) 100%);
      pointer-events: none;
    }

    /* Nubes decorativas adicionales (encima del fondo) */
    .cloud {
      position: absolute; pointer-events: none; z-index: 1;
      filter: drop-shadow(0 8px 16px rgba(26,58,110,0.08));
    }
    .cloud-1 { top: 320px; right: 50px; width: 180px; opacity: 0.92; }
    .cloud-2 { top: 780px; left: 30px; width: 150px; opacity: 0.82; }
    .cloud-3 { bottom: 280px; right: 90px; width: 130px; opacity: 0.75; }

    /* Corazones rosa fucsia + estrellas doradas dispersas */
    .heart, .star {
      position: absolute; pointer-events: none; z-index: 2;
    }
    .heart {
      filter: drop-shadow(0 0 8px rgba(230,61,106,0.5));
    }
    .heart-1 { top: 240px; left: 80px; width: 26px; }
    .heart-2 { top: 540px; right: 130px; width: 20px; opacity: 0.85; }
    .heart-3 { bottom: 350px; left: 110px; width: 22px; opacity: 0.9; }
    .star {
      filter: drop-shadow(0 0 6px rgba(234,179,8,0.6));
    }
    .star-1 { top: 380px; left: 280px; width: 18px; opacity: 0.85; }
    .star-2 { bottom: 480px; right: 200px; width: 16px; opacity: 0.78; }

    /* ═══════════════ HEADER ═══════════════
       Logo Little Joe® centrado arriba (espejo del post DM).
       Logo es BLANCO PNG → filter para volverlo navy/dark visible sobre cielo. */
    .header {
      position: relative; z-index: 3;
      gap: 24px !important;
      margin-bottom: 18px !important;
      align-items: center !important;
    }
    .logo {
      margin: 0 !important;
      width: 160px !important;
      height: 60px !important;
      padding: 0 !important;
      object-position: left center !important;
      /* PNG blanco → invertir para volverlo navy oscuro (espejo "Little Joe®" del post DM) */
      filter: brightness(0) invert(0.16);
      filter: drop-shadow(0 3px 10px rgba(255,255,255,0.5)) brightness(0) invert(0.16);
    }
    .brand-name { display: none !important; }

    /* Date pill — chip rosa fucsia con corazón (firma cute Little Joe) */
    .date-pill {
      margin-left: auto !important;
      background: var(--accent) !important;
      color: #FFFFFF !important;
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 700 !important;
      font-size: 16px !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase;
      padding: 12px 26px !important;
      border-radius: 999px !important;
      box-shadow: 0 8px 22px rgba(230,61,106,0.4);
      border: none !important;
    }
    .date-pill::before { content: '♥ '; color: #FFFFFF; }

    /* ═══════════════ HERO ═══════════════
       Script cursive Caveat para hero romántico (espejo "Feliz / madre" del post DM)
       En grilla usamos "Esta semana" con Caveat 156px navy + acento fucsia */
    .hero {
      position: relative; z-index: 3;
      margin: 30px 0 28px !important;
      text-align: center !important;
    }
    .hero h1 {
      font-family: 'Caveat', cursive !important;
      font-style: normal !important;
      font-weight: 700 !important;
      font-size: 156px !important;
      letter-spacing: -1px !important;
      line-height: 0.9 !important;
      color: var(--accent) !important;
      text-shadow: 3px 3px 0 rgba(255,255,255,0.8);
    }
    .hero .sub {
      font-family: 'Quicksand', sans-serif !important;
      font-style: normal !important;
      font-weight: 600 !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      font-size: 14px !important;
      color: var(--primary) !important;
      opacity: 0.85 !important;
      margin-top: 8px !important;
    }
    .divider { margin-top: 14px !important; }
    .divider .line {
      background: var(--accent) !important;
      height: 2px !important;
      width: 60px !important;
      border-radius: 999px !important;
      opacity: 0.65;
    }
    .divider .dot {
      width: 14px !important; height: 14px !important;
      background: var(--accent) !important;
      border-radius: 0 !important;
      transform: rotate(45deg);
      clip-path: path('M7 13s-7-5.5-7-11a4 4 0 0 1 7-3 4 4 0 0 1 7 3c0 5.5-7 11-7 11z');
      box-shadow: 0 0 10px rgba(230,61,106,0.5);
    }

    /* ═══════════════ CARDS BLANCAS ═══════════════
       Redondeadas + DD en script cursive fucsia + title sans rounded navy */
    .cards {
      position: relative; z-index: 3;
      gap: 11px !important;
    }
    .card {
      background: var(--card-bg) !important;
      border-radius: 22px !important;
      border: 2px solid rgba(230,61,106,0.18) !important;
      box-shadow: 0 8px 26px rgba(26,58,110,0.12);
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
      text-align: center !important;
      flex-shrink: 0;
    }
    .card .date .day {
      font-family: 'Caveat', cursive !important;
      font-weight: 700 !important;
      font-size: 72px !important;
      letter-spacing: -1px !important;
      color: var(--accent) !important;
      line-height: 0.85 !important;
    }
    .card .date .month {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 2.5px !important;
      color: var(--primary) !important;
      opacity: 0.55;
      text-transform: uppercase;
      font-size: 11px !important;
      margin-top: 2px !important;
    }
    .card .bar { display: none !important; }
    .card .body .title {
      font-family: 'Fraunces', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 600 !important;
      font-size: 26px !important;
      letter-spacing: -0.3px !important;
      color: var(--primary) !important;
      line-height: 1.15 !important;
    }
    .card .body .meta {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2px !important;
      text-transform: uppercase;
      font-size: 11px !important;
      color: var(--accent) !important;
      opacity: 0.85 !important;
      margin-top: 4px !important;
    }
    .card .icon {
      color: var(--accent) !important;
      opacity: 0.65;
      width: 42px !important;
      height: 42px !important;
    }

    /* Empty cards — translúcidas con dashed fucsia sutil */
    .card.empty {
      background: rgba(255,255,255,0.55) !important;
      border: 1.5px dashed rgba(230,61,106,0.35) !important;
      box-shadow: 0 4px 12px rgba(26,58,110,0.05);
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
      padding-top: 24px !important;
    }
    .footer .tagline { display: none !important; }
    .footer .agency-mark { margin: 10px 0 10px !important; }
    /* Logo Distinto color original sobre cielo claro */
    .footer .agency-logo {
      filter: drop-shadow(0 3px 12px rgba(26,58,110,0.15));
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
