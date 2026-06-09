// app/app/dashboard/_components/marca-card.tsx
// Tarjeta de marca con toggle Activa/Inactiva. "Pedir grilla" navega a /grilla/[slug].
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Power } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MarcaLogo } from '@/components/marca-logo'
import { toggleMarcaActiva } from '../_actions'

export type MarcaCardData = {
  slug: string
  nombre: string
  emoji_marca: string | null
  color_primario_hex: string | null
  activa: boolean
}

export function MarcaCard({ marca }: { marca: MarcaCardData }) {
  const [activa, setActiva] = useState(marca.activa)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !activa
    setActiva(next) // optimista
    startTransition(async () => {
      const r = await toggleMarcaActiva(marca.slug, next)
      if (!r.ok) {
        setActiva(!next) // revertir
        toast.error(r.error)
      } else {
        toast.success(next ? `✅ ${marca.nombre} activada` : `${marca.nombre} desactivada (oculta del menú)`)
      }
    })
  }

  return (
    <Card className={`transition-all ${activa ? 'hover:shadow-md' : 'opacity-60'}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 min-w-0">
          <CardTitle className="flex items-center gap-3 min-w-0 flex-1">
            <MarcaLogo slug={marca.slug} nombre={marca.nombre} emoji={marca.emoji_marca} size={44} />
            <span className="text-base truncate min-w-0">{marca.nombre}</span>
          </CardTitle>
          {/* Toggle activa / inactiva */}
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            title={activa ? 'Desactivar marca (se oculta del menú y selectores)' : 'Activar marca'}
            className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
              activa
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {activa ? 'Activa' : 'Inactiva'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-xs">
            {marca.slug}
          </Badge>
        </div>

        {marca.color_primario_hex && (
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded border border-border"
              style={{ backgroundColor: marca.color_primario_hex }}
            />
            <code className="text-xs text-muted-foreground">{marca.color_primario_hex}</code>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/grilla/${marca.slug}`}
            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-3"
          >
            🟢 Pedir grilla
          </Link>
          <Link
            href={`/publicaciones?marca=${marca.slug}`}
            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium border bg-background hover:bg-muted h-10 px-3"
          >
            📋 Publicaciones
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
