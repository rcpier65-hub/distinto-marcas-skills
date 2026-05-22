// app/lib/grilla/styles/clinical-warm.ts
// Manrique — Centro Psicológico. Manual oficial págs. 4-5.
// Paleta: Navy #283B6F + Raspberry #D9536C + Sky #9AC2E8 + Crema.
// Tipografía: SOLO Poppins (todas las jerarquías, según manual).
// Mood: Sage+Caregiver — autoridad clínica con calidez familiar.
// NO usar Playfair italic ni serif. NO negro puro. Sin emojis infantiles.

import type { StyleBuilder } from './types'

export const clinicalWarm: StyleBuilder = () => ({
  decorations: `
    <div class="blob tr"></div>
    <div class="blob bl"></div>
    <div class="dots-pattern dots-tl"></div>
    <div class="dots-pattern dots-br"></div>
  `,
  extraCss: `
    /* Blobs raspberry orgánicos en esquinas opuestas */
    .blob {
      position: absolute; background: var(--accent); opacity: .12;
      filter: blur(3px); border-radius: 50%; pointer-events: none; z-index: 0;
    }
    .blob.tr { width: 460px; height: 260px; top: -130px; right: -150px;
      transform: rotate(-22deg);
      border-radius: 60% 40% 50% 50% / 60% 50% 50% 40%; }
    .blob.bl { width: 500px; height: 300px; bottom: -150px; left: -180px;
      transform: rotate(18deg);
      border-radius: 50% 50% 60% 40% / 50% 60% 40% 50%; }

    /* Pattern de puntos (módulo ABA es nodos — guiño al sistema visual) */
    .dots-pattern {
      position: absolute; width: 110px; height: 110px;
      background-image: radial-gradient(circle, var(--accent) 1.4px, transparent 1.4px);
      background-size: 14px 14px; opacity: .22; z-index: 0;
    }
    .dots-tl { top: 210px; left: 30px; }
    .dots-br { bottom: 200px; right: 30px; opacity: .18; }

    /* Hero: Poppins peso pesado, NO italic (manual dice Poppins family). */
    .hero h1 {
      font-family: 'Poppins', sans-serif !important;
      font-style: normal !important;
      font-weight: 700 !important;
      font-size: 88px !important;
      letter-spacing: -2px !important;
      line-height: 1 !important;
      color: var(--primary);
    }
    .hero .sub {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 400 !important;
      letter-spacing: .3px !important;
      font-size: 18px !important;
      opacity: .85;
    }

    /* Brand name Poppins SemiBold/Bold */
    .brand-name .big {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 700 !important;
      font-size: 46px !important;
      letter-spacing: 0 !important;
    }
    .brand-name .small {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 4px !important;
    }

    /* Pill navy oficial */
    .date-pill {
      background: var(--primary) !important;
      font-family: 'Poppins', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 1.2px !important;
      font-size: 16px !important;
      border-radius: 999px !important;
      padding: 12px 24px !important;
    }

    /* Cards limpias con sombra muy sutil */
    .card {
      border-radius: 20px !important;
      box-shadow: 0 3px 12px rgba(40,59,111,0.06);
    }
    .card .date .day {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 800 !important;
      letter-spacing: -2px !important;
    }
    .card .date .month {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 600 !important;
      letter-spacing: 2.5px !important;
    }
    .card .body .title {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 600 !important;
    }
    .card .body .meta {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 400 !important;
    }

    /* Divider con dot raspberry + halo (guiño nodos ABA) */
    .divider .line {
      background: var(--highlight) !important;
      height: 2px !important;
    }
    .divider .dot {
      width: 12px !important; height: 12px !important;
      background: var(--accent) !important;
      box-shadow: 0 0 0 5px rgba(217,83,108,0.18);
    }

    /* Footer */
    .footer .tagline {
      font-family: 'Poppins', sans-serif !important;
      font-style: normal !important;
      font-weight: 500 !important;
      font-size: 17px !important;
    }
    .footer .agency {
      font-family: 'Poppins', sans-serif !important;
      font-weight: 700 !important;
    }
  `,
})
