// app/lib/grilla/styles/clinical-warm.ts
// Manrique — Centro Psicológico. Mood: clínico cálido, familiar, refinado.
// Características: Playfair italic, blobs raspberry suaves, paleta navy + crema.

import type { StyleBuilder } from './types'

export const clinicalWarm: StyleBuilder = () => ({
  decorations: `
    <div class="blob tr"></div>
    <div class="blob bl"></div>
    <div class="dots-pattern"></div>
  `,
  extraCss: `
    /* Blobs raspberry orgánicos en esquinas */
    .blob {
      position: absolute; background: var(--accent); opacity: .14;
      filter: blur(2px); border-radius: 50%; pointer-events: none;
    }
    .blob.tr { width: 420px; height: 240px; top: -120px; right: -140px;
      transform: rotate(-25deg);
      border-radius: 60% 40% 50% 50% / 60% 50% 50% 40%; }
    .blob.bl { width: 460px; height: 280px; bottom: -130px; left: -160px;
      transform: rotate(15deg);
      border-radius: 50% 50% 60% 40% / 50% 60% 40% 50%; }

    /* Pattern decorativo de puntos en esquina superior izquierda */
    .dots-pattern {
      position: absolute; top: 200px; left: 40px; width: 90px; height: 90px;
      background-image: radial-gradient(circle, var(--accent) 1.5px, transparent 1.5px);
      background-size: 15px 15px; opacity: .25; z-index: 1;
    }

    /* Hero refinement: italic Playfair elegante */
    .hero h1 {
      font-style: italic; font-weight: 500;
      text-shadow: 0 1px 0 rgba(40,59,111,0.04);
    }

    /* Cards con borde redondeado suave + sombra muy sutil */
    .card { box-shadow: 0 2px 8px rgba(40,59,111,0.04); border-radius: 20px; }

    /* Divider clínico: línea fina + dot pequeño raspberry */
    .divider .line { background: var(--highlight); }
    .divider .dot { box-shadow: 0 0 0 4px rgba(217,83,108,0.18); }
  `,
})
