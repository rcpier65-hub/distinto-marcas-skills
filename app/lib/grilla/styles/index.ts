// app/lib/grilla/styles/index.ts
// Dispatcher: dado un StyleName, retorna el builder correspondiente.
// El switch exhaustivo + el type `never` en default garantizan en compile-time
// que si se agrega un nuevo StyleName a themes.ts, TypeScript te obliga a
// mapearlo acá. Sin escape hatches.

import type { StyleName } from '../themes'
import type { StyleBuilder } from './types'

import { clinicalWarm } from './clinical-warm'
import { artisanCraft } from './artisan-craft'
import { gymEnergy } from './gym-energy'
import { playfulItalian } from './playful-italian'
import { wellnessOrganic } from './wellness-organic'
import { ledTechnical } from './led-technical'
import { woodIndustrial } from './wood-industrial'
import { natureVitality } from './vid-natur'
import { artisanBoutique } from './mil-ideas'
import { agencyBold } from './distinto-agencia'
import { studioTech } from './distinto-studio'
import { industrialPractical } from './praktico'

export function getStyleBuilder(style: StyleName): StyleBuilder {
  switch (style) {
    case 'clinical-warm':    return clinicalWarm
    case 'artisan-craft':    return artisanCraft
    case 'gym-energy':       return gymEnergy
    case 'playful-italian':  return playfulItalian
    case 'wellness-organic': return wellnessOrganic
    case 'led-technical':    return ledTechnical
    case 'wood-industrial':  return woodIndustrial
    case 'nature-vitality':  return natureVitality
    case 'artisan-boutique': return artisanBoutique
    case 'agency-bold':      return agencyBold
    case 'studio-tech':            return studioTech
    case 'industrial-practical':   return industrialPractical
    default: {
      // Exhaustiveness check — TS error si se agrega un StyleName sin caso
      const _exhaustive: never = style
      void _exhaustive
      return clinicalWarm
    }
  }
}

export type { StyleBlocks, StyleBuilder } from './types'
