// app/app/grilla/[slug]/_components/grilla-workspace.tsx
// Preview HTML en vivo (iframe del endpoint render-grilla-html).
// El PNG se genera SOLO al hacer click "Enviar al grupo" — just-in-time.
// Pattern: single source of truth (mismo HTML para preview y PNG final).
'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { enviarGrillaAlGrupo } from '../_actions'

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
  pngUrl: string | null  // legacy — ya no se usa para preview
  estado: string | null
}

export function GrillaWorkspace({
  marca, semanaInicio, semanaFin, publicaciones, captionDefault, estado,
}: Props) {
  const router = useRouter()
  const [caption, setCaption] = useState(captionDefault)
  const [zoom, setZoom] = useState(0.45)
  const [isSending, startSending] = useTransition()

  // URL del iframe — el endpoint /api/render-grilla-html devuelve el HTML
  // de la grilla con las publicaciones reales. Se actualiza si cambia algo.
  const previewUrl = useMemo(() => {
    const pubs = publicaciones.map((p) => ({
      fecha: p.fecha,
      titulo: p.titulo,
      plataformas: p.plataformas.join(' · '),
      tipo: p.tipo_contenido.join(' · '),
    }))
    const params = new URLSearchParams({
      slug: marca.slug,
      inicio: semanaInicio,
      fin: semanaFin,
      pubs: JSON.stringify(pubs),
    })
    return `/api/render-grilla-html?${params.toString()}`
  }, [marca.slug, semanaInicio, semanaFin, publicaciones])

  function handleEnviar() {
    if (!confirm(`¿Enviar grilla al grupo WhatsApp de ${marca.nombre}? El PNG se genera ahora con la plantilla profesional.`)) return
    startSending(async () => {
      toast.loading('Generando PNG + enviando al grupo (~10s)…', { id: 'send' })
      const result = await enviarGrillaAlGrupo(marca.slug, semanaInicio, semanaFin, caption)
      if (result.ok) {
        toast.success(`✅ Enviada al grupo "${result.grupo}"`, { id: 'send' })
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`, { id: 'send' })
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
          <Button onClick={handleEnviar} disabled={isSending} size="lg">
            {isSending ? '⏳ Enviando…' : '📤 Enviar al grupo WhatsApp'}
          </Button>
        </div>
      </div>

      {/* SPLIT: preview HTML iframe + caption */}
      <div className="grid lg:grid-cols-[1fr_420px] gap-4">
        {/* PREVIEW iframe — HTML en vivo, NO PNG */}
        <Card>
          <CardContent className="p-4 flex flex-col items-center bg-muted/30">
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <span>Zoom:</span>
              {[0.3, 0.4, 0.45, 0.5, 0.6, 0.75, 1].map((z) => (
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
            <div
              style={{
                width: 1080 * zoom,
                height: 1620 * zoom,
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                background: 'white',
              }}
            >
              <iframe
                src={previewUrl}
                title="Preview grilla"
                style={{
                  width: 1080,
                  height: 1620,
                  border: 'none',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Preview HTML en vivo · El PNG 1080×1620 se genera al apretar Enviar
            </p>
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
                {caption.length} caracteres · Se manda este texto + PNG al grupo cuando apriete Enviar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                📅 Publicaciones de la semana ({publicaciones.length})
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
