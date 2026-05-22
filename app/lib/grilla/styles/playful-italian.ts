// app/lib/grilla/styles/playful-italian.ts
// Little Joe. Marca italiana — mood Lover+Innocent+Caregiver.
// Tono: cute, aspiracional emocional, NO masculinizado, NO ofertón.
// Paleta: Azul royal italiano + dorado estrella + cielo cálido.
// Tipografía: Quicksand rounded + Fraunces curvy (mood charming).
// NO "♥" en pill (ofertón), NO promesas comerciales.
// Sí: nubes flotando, estrellas doradas que evocan la fragancia, "Joe" como hilo.

import type { StyleBuilder } from './types'

export const playfulItalian: StyleBuilder = () => ({
  decorations: `
    <svg class="cloud cloud-1" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 70 Q15 70 15 55 Q15 40 35 40 Q40 25 60 25 Q80 25 88 38 Q105 32 115 45 Q135 40 140 55 Q150 50 160 60 Q170 70 160 80 L40 80 Q25 80 30 70 Z" fill="white" opacity="0.92"/>
    </svg>
    <svg class="cloud cloud-2" viewBox="0 0 160 80" xmlns="http://www.w3.org/2000/svg">
      <path d="M25 55 Q12 55 12 42 Q12 30 28 30 Q35 18 50 18 Q66 18 72 30 Q88 25 95 40 Q108 38 110 50 Q118 45 125 55 Q132 65 122 70 L35 70 Q22 70 25 55 Z" fill="white" opacity="0.78"/>
    </svg>
    <svg class="cloud cloud-3" viewBox="0 0 140 70" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 50 Q10 50 10 38 Q10 26 24 26 Q30 16 44 16 Q58 16 64 26 Q78 22 84 35 Q96 32 98 44 Q108 40 112 50 Q118 60 108 65 L30 65 Q18 65 22 50 Z" fill="white" opacity="0.7"/>
    </svg>
    <svg class="star star-1" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.5 5.8 21l2.3-7.1L2 9.4h7.6z" fill="#EAB308"/></svg>
    <svg class="star star-2" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.5 5.8 21l2.3-7.1L2 9.4h7.6z" fill="#EAB308"/></svg>
    <svg class="star star-3" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.5 5.8 21l2.3-7.1L2 9.4h7.6z" fill="#EAB308"/></svg>
    <svg class="star star-4" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.5 5.8 21l2.3-7.1L2 9.4h7.6z" fill="#EAB308"/></svg>
    <svg class="star star-5" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1L12 16.5 5.8 21l2.3-7.1L2 9.4h7.6z" fill="#EAB308"/></svg>
  `,
  extraCss: `
    /* Cielo italiano warm: gradiente sutil azul-blanco-warm */
    .poster {
      background: linear-gradient(180deg, #DCE8FA 0%, var(--canvas) 50%, #FAFCFF 100%) !important;
    }

    /* Nubes flotantes (Joe vive en el aire — "pon una sonrisa en el aire") */
    .cloud {
      position: absolute; pointer-events: none; z-index: 1;
      filter: drop-shadow(0 6px 16px rgba(30,58,138,0.10));
    }
    .cloud-1 { top: 50px; right: 40px; width: 200px; }
    .cloud-2 { top: 180px; left: 30px; width: 160px; }
    .cloud-3 { top: 380px; right: 220px; width: 130px; opacity: .65; }

    /* Estrellas doradas (la fragancia que brilla) */
    .star {
      position: absolute; pointer-events: none; z-index: 1;
      filter: drop-shadow(0 0 6px rgba(234,179,8,0.55));
    }
    .star-1 { top: 260px; right: 90px; width: 30px; }
    .star-2 { top: 410px; left: 130px; width: 20px; opacity: .82; }
    .star-3 { top: 130px; left: 280px; width: 14px; opacity: .68; }
    .star-4 { bottom: 220px; right: 130px; width: 26px; opacity: .92; }
    .star-5 { bottom: 320px; left: 60px; width: 18px; opacity: .75; }

    /* Hero: Fraunces serif curvy + Joe en optimismo */
    .hero h1 {
      font-family: 'Fraunces', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 700 !important;
      font-size: 96px !important;
      letter-spacing: -1.5px !important;
      line-height: 1 !important;
      color: var(--primary);
    }
    .hero .sub {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 1.5px !important;
      font-size: 18px !important;
      color: var(--primary);
      opacity: .85;
    }

    /* Brand name LITTLE JOE con Joe en italic Fraunces (mascota viva) */
    .brand-name .big {
      font-family: 'Fraunces', Georgia, serif !important;
      font-weight: 700 !important;
      font-style: italic !important;
      font-size: 52px !important;
      letter-spacing: -1px !important;
    }
    .brand-name .small {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 4px !important;
      color: var(--primary) !important;
      opacity: .75 !important;
    }

    /* Pill rounded con tipo Quicksand — SIN corazón (no ofertón) */
    .date-pill {
      background: var(--primary) !important;
      color: #FFFFFF !important;
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 1.5px !important;
      font-size: 16px !important;
      border-radius: 999px !important;
      padding: 13px 26px !important;
      box-shadow: 0 6px 18px rgba(30,58,138,0.22);
    }

    /* Cards super redondeadas con shadow azul suave + borde blanco interior */
    .card {
      border-radius: 28px !important;
      box-shadow: 0 8px 24px rgba(30,58,138,0.10), inset 0 0 0 1px rgba(255,255,255,0.7);
    }
    .card .date .day {
      font-family: 'Fraunces', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 700 !important;
    }
    .card .date .month {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 2.5px !important;
      color: var(--primary) !important;
      opacity: .65;
    }
    .card .bar {
      background: var(--accent) !important;
      border-radius: 99px !important;
      width: 4px !important;
    }
    .card .body .title {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 700 !important;
    }
    .card .body .meta {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 500 !important;
      opacity: .75 !important;
    }

    /* Divider con estrella dorada central (oficial) */
    .divider .line {
      background: var(--primary) !important;
      opacity: .15;
      height: 1.5px !important;
    }
    .divider .dot {
      width: 22px !important; height: 22px !important;
      background: var(--accent) !important;
      box-shadow: 0 0 14px rgba(234,179,8,0.55);
      border-radius: 0 !important;
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    }

    /* Footer charming */
    .footer .tagline {
      font-family: 'Fraunces', Georgia, serif !important;
      font-style: italic !important;
      font-weight: 700 !important;
      color: var(--primary) !important;
      font-size: 22px !important;
    }
    .footer .agency {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 700 !important;
      letter-spacing: 5px !important;
    }
  `,
})
