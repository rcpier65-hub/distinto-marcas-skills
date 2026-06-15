// app/components/plantillas-grilla/index.tsx
// Selector de plantilla por marca slug. Cada marca puede tener su componente
// específico; si no, cae al GrillaGenerica que usa el color de la marca.
'use client'

import { GrillaManrique } from './grilla-manrique'
import { GrillaLittleJoe } from './grilla-little-joe'
import { GrillaNovaLamps } from './grilla-novalamps'
import { GrillaVidNatur } from './grilla-vid-natur'
import { GrillaGenerica } from './grilla-generica'
import type { GrillaPublicacionLite } from './types'

type Marca = {
  slug: string
  nombre: string
  emoji_marca: string | null
  color_primario_hex: string | null
}

type Props = {
  marca: Marca
  semanaInicio: string
  semanaFin: string
  publicaciones: GrillaPublicacionLite[]
}

export function GrillaPlantilla({ marca, semanaInicio, semanaFin, publicaciones }: Props) {
  // Switch por slug — agregar nuevas plantillas acá conforme se diseñen
  switch (marca.slug) {
    case 'manrique':
      return (
        <GrillaManrique
          semanaInicio={semanaInicio}
          semanaFin={semanaFin}
          publicaciones={publicaciones}
        />
      )

    case 'little-joe':
      return (
        <GrillaLittleJoe
          semanaInicio={semanaInicio}
          semanaFin={semanaFin}
          publicaciones={publicaciones}
        />
      )

    case 'novalamps':
      return (
        <GrillaNovaLamps
          semanaInicio={semanaInicio}
          semanaFin={semanaFin}
          publicaciones={publicaciones}
        />
      )

    case 'vid-natur':
      return (
        <GrillaVidNatur
          semanaInicio={semanaInicio}
          semanaFin={semanaFin}
          publicaciones={publicaciones}
        />
      )

    // TODO: agregar más plantillas específicas (lozano, kintu, la-victoria, distribuidora-fitness)

    default:
      return (
        <GrillaGenerica
          marcaNombre={marca.nombre}
          marcaEmoji={marca.emoji_marca ?? '📊'}
          marcaColor={marca.color_primario_hex ?? '#283B6F'}
          semanaInicio={semanaInicio}
          semanaFin={semanaFin}
          publicaciones={publicaciones}
        />
      )
  }
}

export type { GrillaPublicacionLite }
