// app/app/dashboard/_components/marca-card.tsx
// El botón "Pedir grilla" ahora navega directo a /grilla/[slug] donde se renderiza
// la plantilla con datos reales de la BD (sin Chromium / sin Notion API).
'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type MarcaCardData = {
  slug: string
  nombre: string
  emoji_marca: string | null
  color_primario_hex: string | null
}

export function MarcaCard({ marca }: { marca: MarcaCardData }) {
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
