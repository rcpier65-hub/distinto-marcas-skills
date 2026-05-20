// app/app/grilla/[slug]/_components/grilla-workspace.tsx
// Client component que:
//  - Renderiza la plantilla seleccionada en un <div ref> (preview escalada visualmente)
//  - Muestra el caption editable al costado
//  - Botón "Descargar PNG" usa html2canvas-pro para capturar el ref → PNG
//  - Botón "Copiar caption" copia al clipboard
//  - (Próximo) Botón "Enviar a WhatsApp" sube el PNG a Storage y dispara Rubi
'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GrillaPlantilla, type GrillaPublicacionLite } from '@/components/plantillas-grilla'

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
  captionDefault: string
}

export function GrillaWorkspace({
  marca, semanaInicio, semanaFin, publicaciones, captionDefault,
}: Props) {
  const plantillaRef = useRef<HTMLDivElement>(null)
  const [caption, setCaption] = useState(captionDefault)
  const [isDownloading, startDownload] = useTransition()
  const [zoom, setZoom] = useState(0.4)

  async function handleDownloadPNG() {
    if (!plantillaRef.current) {
      toast.error('No se encontró la plantilla')
      return
    }
    startDownload(async () => {
      try {
        // Import dinámico para no bloatear el bundle inicial
        const html2canvas = (await import('html2canvas-pro')).default
        const node = plantillaRef.current!
        const canvas = await html2canvas(node, {
          width: 1080,
          height: 1620,
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
        })
        canvas.toBlob((blob) => {
          if (!blob) {
            toast.error('No se pudo generar el PNG')
            return
          }
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `grilla-${marca.slug}-${semanaInicio}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          toast.success('PNG descargado ✓')
        }, 'image/png')
      } catch (e) {
        console.error(e)
        toast.error(`Error: ${(e as Error).message}`)
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

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">{marca.emoji_marca ?? '📊'}</span>
            <span>Grilla semanal · {marca.nombre}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Badge variant="outline" className="font-mono mr-2">{semanaInicio} → {semanaFin}</Badge>
            {publicaciones.length} {publicaciones.length === 1 ? 'publicación' : 'publicaciones'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleDownloadPNG} disabled={isDownloading} size="lg">
            {isDownloading ? 'Generando…' : '📥 Descargar PNG'}
          </Button>
        </div>
      </div>

      {/* SPLIT: preview + caption */}
      <div className="grid lg:grid-cols-[1fr_420px] gap-4">
        {/* PREVIEW de plantilla escalada */}
        <Card>
          <CardContent className="p-4 flex flex-col items-center bg-muted/30">
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <span>Zoom:</span>
              {[0.3, 0.4, 0.5, 0.75, 1].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoom(z)}
                  className={`px-2 py-0.5 rounded text-xs ${zoom === z ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'}`}
                >
                  {Math.round(z * 100)}%
                </button>
              ))}
            </div>
            {/* Wrapper escalado para que la plantilla 1080x1620 quepa en pantalla */}
            <div
              style={{
                width: 1080 * zoom,
                height: 1620 * zoom,
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
            >
              <div
                ref={plantillaRef}
                style={{
                  width: 1080,
                  height: 1620,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <GrillaPlantilla
                  marca={marca}
                  semanaInicio={semanaInicio}
                  semanaFin={semanaFin}
                  publicaciones={publicaciones}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Plantilla 1080×1620 (Instagram Story / Reel) — el PNG se descarga a tamaño real
            </p>
          </CardContent>
        </Card>

        {/* CAPTION editable */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  💬 Caption para WhatsApp
                </h3>
                <Button onClick={handleCopyCaption} variant="outline" size="sm">
                  📋 Copiar
                </Button>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={20}
                className="w-full p-3 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-vertical"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {caption.length} caracteres · Editá si necesitás ajustar antes de enviar
              </p>
            </CardContent>
          </Card>

          {/* Lista publicaciones de la semana */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                📅 Publicaciones de esta semana
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
