// app/app/dashboard/_components/marca-card.tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GrillaStatusBadge } from '@/components/grilla-status-badge'
import { pedirGrilla } from './pedir-grilla-action'
import { toast } from 'sonner'
import type { EstadoGrilla } from '@/lib/types/database'

export type MarcaCardData = {
  slug: string
  nombre: string
  emoji_marca: string | null
  color_primario_hex: string | null
  estado_grilla: EstadoGrilla | null
  semana_inicio: string | null
}

export function MarcaCard({ marca }: { marca: MarcaCardData }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticState, setOptimisticState] = useState<EstadoGrilla | null>(marca.estado_grilla)

  const yaTieneGrilla = optimisticState !== null && optimisticState !== 'cancelada'

  function handlePedir() {
    startTransition(async () => {
      setOptimisticState('pendiente')
      const result = await pedirGrilla(marca.slug)
      if (!result.ok) {
        setOptimisticState(marca.estado_grilla)
        toast.error(result.error)
      } else {
        toast.success(`Grilla pedida para ${marca.nombre}`)
      }
    })
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <span className="text-3xl">{marca.emoji_marca}</span>
          <span className="text-base">{marca.nombre}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {marca.slug}
          </Badge>
          <GrillaStatusBadge estado={optimisticState} />
        </div>

        {marca.color_primario_hex && (
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded border border-border"
              style={{ backgroundColor: marca.color_primario_hex }}
            />
            <code className="text-xs text-muted-foreground">
              {marca.color_primario_hex}
            </code>
          </div>
        )}

        <Button
          onClick={handlePedir}
          disabled={isPending || yaTieneGrilla}
          className="w-full"
          variant={yaTieneGrilla ? 'secondary' : 'default'}
        >
          {isPending
            ? 'Pidiendo...'
            : yaTieneGrilla
              ? 'Ya pedida esta semana'
              : '🟢 Pedir grilla'}
        </Button>
      </CardContent>
    </Card>
  )
}
