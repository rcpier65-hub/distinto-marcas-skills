// app/app/grilla/[slug]/_components/grilla-workspace.tsx
// Muestra el PNG REAL generado por Chromium (no un mock React).
// Si no existe png_url todavía, ofrece botón "Generar grilla" que dispara el render.
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { generarGrillaParaSemana } from '../_actions'

type Marca = {
  slug: string
  nombre: string
  emoji_marca: string | null
  color_primario_hex: string | null
}

type PubLite = {
  id: string
  titulo: string
  fecha: string
  plataformas: string[]
  tipo_contenido: string[]
}

type Props = {
  marca: Marca
  semanaInicio: string
  semanaFin: string
  publicaciones: PubLite[]
  captionDefault: string
  pngUrl: string | null
  estado: string | null
}

export function GrillaWorkspace({
  marca, semanaInicio, semanaFin, publicaciones, captionDefault, pngUrl, estado,
}: Props) {
  const router = useRouter()
  const [caption, setCaption] = useState(captionDefault)
  const [currentPngUrl, setCurrentPngUrl] = useState<string | null>(pngUrl)
  const [isGenerating, startGenerating] = useTransition()

  function handleGenerar() {
    startGenerating(async () => {
      toast.loading('Generando grilla (Chromium + plantilla profesional, ~7s)…', { id: 'gen' })
      const result = await generarGrillaParaSemana(marca.slug, semanaInicio, semanaFin)
      if (result.ok) {
        // Cache-bust: agregamos timestamp para forzar reload del PNG
        setCurrentPngUrl(`${result.pngUrl}&v=${Date.now()}`)
        toast.success('Grilla generada ✓', { id: 'gen' })
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`, { id: 'gen' })
      }
    })
  }

  async function handleCopyCaption() {
    try {
      await navigator.clipboard.writeText(caption)
      toast.success('Caption copiado al portapapeles ✓')
    } catch {
      toast.error('No se pudo copiar (permisos)')
    }
  }

  function handleDownloadPNG() {
    if (!currentPngUrl) return
    const a = document.createElement('a')
    a.href = currentPngUrl
    a.download = `grilla-${marca.slug}-${semanaInicio}.png`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">{marca.emoji_marca ?? '📊'}</span>
            <span>Grilla semanal · {marca.nombre}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">{semanaInicio} → {semanaFin}</Badge>
            <span>{publicaciones.length} {publicaciones.length === 1 ? 'publicación' : 'publicaciones'}</span>
            {estado && <Badge variant={estado === 'enviada' ? 'default' : 'secondary'}>{estado}</Badge>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentPngUrl && (
            <Button onClick={handleDownloadPNG} variant="outline">
              📥 Descargar PNG
            </Button>
          )}
          <Button onClick={handleGenerar} disabled={isGenerating} size="lg">
            {isGenerating ? '⏳ Generando…' : currentPngUrl ? '🔄 Regenerar' : '✨ Generar grilla'}
          </Button>
        </div>
      </div>

      {/* SPLIT: preview PNG real + caption */}
      <div className="grid lg:grid-cols-[1fr_420px] gap-4">
        {/* PREVIEW del PNG real */}
        <Card>
          <CardContent className="p-4 flex flex-col items-center bg-muted/30">
            {currentPngUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPngUrl}
                  alt="Grilla generada"
                  className="max-w-full h-auto rounded-lg border bg-white shadow-md"
                  style={{ maxHeight: '85vh' }}
                />
                <p className="text-[10px] text-muted-foreground mt-2">
                  PNG 1080×1620 — renderizado con Chromium + plantilla profesional
                </p>
              </>
            ) : (
              <div className="aspect-[2/3] w-full max-w-[400px] flex flex-col items-center justify-center text-center p-8 bg-background border border-dashed border-border rounded-lg">
                <div className="text-5xl mb-3 opacity-50">🖼️</div>
                <p className="text-sm text-muted-foreground mb-1">
                  Aún no se generó la grilla para esta semana.
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Click en <strong>Generar grilla</strong> arriba para crear el PNG con la plantilla profesional de la marca.
                </p>
                {publicaciones.length === 0 && (
                  <p className="text-xs text-orange-600 mt-2">
                    ⚠ No hay publicaciones en /publicaciones para esta semana. La grilla va a salir con días vacíos.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CAPTION editable + lista publicaciones */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  💬 Caption WhatsApp
                </h3>
                <Button onClick={handleCopyCaption} variant="outline" size="sm">
                  📋 Copiar
                </Button>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={16}
                className="w-full p-3 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-vertical"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {caption.length} caracteres · Editá antes de enviar
              </p>
            </CardContent>
          </Card>

          {/* Lista publicaciones de la semana */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                📅 Publicaciones de la semana
              </h3>
              {publicaciones.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No hay publicaciones programadas. Agregalas en{' '}
                  <a href={`/publicaciones?marca=${marca.slug}`} className="text-blue-600 hover:underline">/publicaciones</a>
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {publicaciones.map((p) => (
                    <li key={p.id} className="flex items-start gap-2 leading-tight">
                      <span className="font-mono text-muted-foreground shrink-0">{p.fecha.slice(5)}</span>
                      <a
                        href={`/publicaciones/${p.id}`}
                        className="flex-1 font-medium hover:underline truncate"
                      >
                        {p.titulo}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
