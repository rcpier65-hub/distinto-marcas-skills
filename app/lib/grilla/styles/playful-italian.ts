// app/lib/grilla/styles/playful-italian.ts
// Little Joe — Mood: italiano dulce, charming, optimismo.
// Características: Fraunces serif rounded, nubes SVG en cielo, estrellas
// doradas dispersas, paleta azul royal + rojo amor.

import type { StyleBuilder } from './types'

export const playfulItalian: StyleBuilder = () => ({
  decorations: `
    <svg class="cloud cloud-1" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 70 Q15 70 15 55 Q15 40 35 40 Q40 25 60 25 Q80 25 88 38 Q105 32 115 45 Q135 40 140 55 Q150 50 160 60 Q170 70 160 80 L40 80 Q25 80 30 70 Z" fill="white" opacity=".9"/>
    </svg>
    <svg class="cloud cloud-2" viewBox="0 0 160 80" xmlns="http://www.w3.org/2000/svg">
      <path d="M25 55 Q12 55 12 42 Q12 30 28 30 Q35 18 50 18 Q66 18 72 30 Q88 25 95 40 Q108 38 110 50 Q118 45 125 55 Q132 65 122 70 L35 70 Q22 70 25 55 Z" fill="white" opacity=".75"/>
    </svg>
    <svg class="cloud cloud-3" viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 50 Q10 50 10 38 Q10 26 24 26 Q30 16 44 16 Q58 16 64 26 Q78 22 84 35 Q96 32 98 44 Q108 40 112 50 Q118 60 108 65 L30 65 Q18 65 22 50 Z" fill="white" opacity=".7"/>
    </svg>
    <svg class="star star-1" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.5 5.8 21l2.3-7.1L2 9.4h7.6z" fill="#EAB308"/></svg>
    <svg class="star star-2" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.5 5.8 21l2.3-7.1L2 9.4h7.6z" fill="#EAB308"/></svg>
    <svg class="star star-3" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.5 5.8 21l2.3-7.1L2 9.4h7.6z" fill="#EAB308"/></svg>
    <svg class="star star-4" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.5 5.8 21l2.3-7.1L2 9.4h7.6z" fill="#EAB308"/></svg>
    <div class="hill"></div>
  `,
  extraCss: `
    /* Canvas cielo italiano: gradiente azul muy suave */
    .poster {
      background: linear-gradient(180deg, #F0F7FF 0%, var(--canvas) 60%, #FAFCFF 100%) !important;
    }

    /* Colina decorativa abajo (silueta verde claro) */
    .hill {
      position: absolute; bottom: 0; left: 0; right: 0; height: 80px;
      background: radial-gradient(ellipse at 50% 100%, rgba(30,58,138,0.06), transparent 60%);
      pointer-events: none; z-index: 0;
    }

    /* Nubes flotantes */
    .cloud {
      position: absolute; pointer-events: none; z-index: 1;
      filter: drop-shadow(0 4px 12px rgba(30,58,138,0.08));
    }
    .cloud-1 { top: 40px; right: 50px; width: 180px; }
    .cloud-2 { top: 150px; left: 40px; width: 140px; }
    .cloud-3 { top: 320px; right: 200px; width: 110px; opacity: .6; }

    /* Estrellas doradas dispersas */
    .star {
      position: absolute; pointer-events: none; z-index: 1;
      filter: drop-shadow(0 0 4px rgba(234,179,8,0.5));
    }
    .star-1 { top: 250px; right: 80px; width: 28px; }
    .star-2 { top: 380px; left: 100px; width: 20px; opacity: .8; }
    .star-3 { top: 100px; left: 60px; width: 16px; opacity: .7; }
    .star-4 { bottom: 200px; right: 100px; width: 24px; opacity: .9; }

    /* Hero: Fraunces serif redondeado y warm */
    .hero h1 {
      font-family: 'Fraunces', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 500 !important;
      font-size: 88px !important;
      letter-spacing: -1px !important;
      line-height: 1.05 !important;
      color: var(--primary);
    }
    .hero h1::before {
      content: '☁ '; font-style: normal; color: var(--accent);
      font-size: 0.6em; vertical-align: middle;
    }
    .hero .sub {
      font-family: 'Quicksand', system-ui, sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 1px !important;
      font-size: 19px !important;
      color: var(--primary);
    }

    /* Brand name redondeado */
    .brand-name .big {
      font-family: 'Fraunces', Georgia, serif !important;
      font-weight: 700 !important;
      font-style: italic !important;
      letter-spacing: -1px !important;
    }
    .brand-name .small {
      font-family: 'Quicksand', system-ui, sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 3px !important;
      color: var(--accent) !important;
      opacity: 1 !important;
    }

    /* Pill rounded pill con corazón */
    .date-pill {
      background: var(--accent) !important;
      font-family: 'Quicksand', system-ui, sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 1px !important;
      border-radius: 999px !important;
      padding: 12px 24px !important;
      box-shadow: 0 4px 14px rgba(230,57,70,0.3);
    }
    .date-pill::before { content: '♥ '; color: white; }

    /* Cards super redondeadas con shadow suave + estrellita */
    .card {
      border-radius: 28px !important;
      box-shadow: 0 6px 20px rgba(30,58,138,0.08), 0 0 0 1px rgba(255,255,255,0.6) inset;
      border: 2px solid rgba(255,255,255,0.8);
    }
    .card .date .day {
      font-family: 'Fraunces', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 600 !important;
    }
    .card .date .month {
      font-family: 'Quicksand', system-ui, sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 2.5px !important;
      color: var(--accent) !important;
    }
    .card .bar {
      background: var(--accent) !important;
      border-radius: 99px !important;
    }
    .card .body .title {
      font-family: 'Quicksand', system-ui, sans-serif !important;
      font-weight: 700 !important;
    }
    .card .body .meta {
      font-family: 'Quicksand', system-ui, sans-serif !important;
      font-weight: 500 !important;
    }

    /* Divider con estrella central dorada */
    .divider .line {
      background: var(--highlight) !important;
      height: 2px;
    }
    .divider .dot {
      width: 18px !important; height: 18px !important;
      background: #EAB308 !important;
      box-shadow: 0 0 12px rgba(234,179,8,0.6);
      transform: rotate(0deg);
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    }

    /* Footer warm */
    .footer .tagline {
      font-family: 'Fraunces', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 500 !important;
      color: var(--accent) !important;
      font-size: 20px !important;
    }
    .footer .agency {
      font-family: 'Quicksand', system-ui, sans-serif;
      font-weight: 700 !important;
      letter-spacing: 5px !important;
    }
  `,
})
