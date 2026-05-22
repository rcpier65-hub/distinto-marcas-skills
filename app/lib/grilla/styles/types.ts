// app/lib/grilla/styles/types.ts
// Contrato común para todos los style modules.
// Cada marca implementa un builder que devuelve "bloques" inyectados
// en la plantilla base. La filosofía: NO duplicar el HTML completo,
// solo declarar las diferencias (extra CSS, decoraciones, override hero).

import type { GrillaTheme } from '../themes'

export type StyleBlocks = {
  /** CSS adicional/override que se concatena después del CSS base */
  extraCss: string
  /** HTML de decoraciones que se inyecta como primer hijo de .poster
   *  (antes del header). Suelen ser blobs, gridlines, leaves, glow, etc. */
  decorations: string
  /** Override opcional del heading del hero. Si vacío, usa theme.heroTitle */
  heroTitleOverride?: string
  /** Bloque opcional dentro del footer (debajo del tagline). Ej. sub-marca,
   *  micro-pattern, decoración propia. */
  footerExtra?: string
}

export type StyleBuilder = (theme: GrillaTheme) => StyleBlocks
