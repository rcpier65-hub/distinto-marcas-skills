// app/app/dashboard/_components/marca-card.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const estado = marca.estado_grilla
  const yaTieneGrillaActiva =
    estado === 'esperando_aprobacion' || estado === 'aprobada' || estado === 'enviada'

  function handlePedir() {
    startTransition(async () => {
      toast.loading(`Generando grilla de ${marca.nombre}...`, { id: marca.slug })
      const result = await pedirGrilla(marca.slug)
      if (!result.ok) {
        toast.error(result.error, { id: marca.slug })
      } else {
        toast.success(`Grilla lista — revisá el preview`, { id: marca.slug })
        router.push(`/marca/${marca.slug}`)
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
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-xs">
            {marca.slug}
          </Badge>
          <GrillaStatusBadge estado={estado} />
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

        {yaTieneGrillaActiva ? (
          <Link
            href={`/marca/${marca.slug}`}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
          >
            {estado === 'esperando_aprobacion' && '👀 Ver preview y aprobar'}
            {estado === 'aprobada' && '✅ Aprobada — ver detalle'}
            {estado === 'enviada' && '📤 Enviada — ver detalle'}
          </Link>
        ) : (
          <Button onClick={handlePedir} disabled={isPending} className="w-full">
            {isPending ? 'Generando...' : '🟢 Pedir grilla'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
