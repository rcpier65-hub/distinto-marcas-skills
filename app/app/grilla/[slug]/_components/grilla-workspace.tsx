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
  envio_real_habilitado: boolean
  grupo_nombre: string | null  // nombre humano del grupo destino real (para tooltip/UI)
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
  const [isTesting, startTesting] = useTransition()
  // Bust de cache para el iframe: token que cambia al apretar "Recargar
  // preview" o al primer mount. Algunos navegadores ignoran Cache-Control:
  // no-store dentro de iframes, así que un param ?_v= rompe el cache HTTP.
  const [bust, setBust] = useState(() => Date.now())

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
      _v: String(bust),
    })
    return `/api/render-grilla-html?${params.toString()}`
  }, [marca.slug, semanaInicio, semanaFin, publicaciones, bust])

  function handleEnviar() {
    if (!confirm(`¿Enviar grilla al grupo WhatsApp de ${marca.nombre}?\n\nEl PNG se genera ahora con la plantilla profesional y se manda al cliente.`)) return
    startSending(async () => {
      toast.loading('Generando PNG + enviando al grupo (~10s)…', { id: 'send' })
      const result = await enviarGrillaAlGrupo(marca.slug, semanaInicio, semanaFin, caption, 'real')
      if (result.ok) {
        toast.success(`✅ Enviada al grupo "${result.grupo}"`, { id: 'send' })
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`, { id: 'send' })
      }
    })
  }

  function handleProbar() {
    if (!confirm(`¿Enviar grilla a "New team" para PROBAR?\n\nMismo PNG y mismo caption que se mandaría al cliente — sólo cambia el grupo destino. No se marca como enviada en BD.`)) return
    startTesting(async () => {
      toast.loading('Probando — generando PNG + enviando a New team (~10s)…', { id: 'test' })
      const result = await enviarGrillaAlGrupo(marca.slug, semanaInicio, semanaFin, caption, 'test')
      if (result.ok) {
        toast.success(`🧪 Prueba enviada a "${result.grupo}"`, { id: 'test' })
        // En test no refrescamos la página — la grilla no cambió de estado.
      } else {
        toast.error(`Error en prueba: ${result.error}`, { id: 'test' })
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

  /* Estado del botón "Copiar imagen". Visualmente distinto del envío
     porque acá no estamos enviando — solo generamos PNG + copiamos. */
  const [isCopyingImage, setIsCopyingImage] = useState(false)

  /* URL del PNG real (mismo endpoint que usa "Enviar"). Construimos
     una vez con los mismos params del preview HTML. Si los datos
     cambian (zoom/recargar), la URL se mantiene — solo cambia bust. */
  const pngEndpointUrl = useMemo(() => {
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
    return `/api/render-grilla?${params.toString()}`
  }, [marca.slug, semanaInicio, semanaFin, publicaciones])

  /* Copiar PNG al portapapeles.
     CRITICAL: la Clipboard API requiere que ClipboardItem se cree DENTRO
     del mismo user gesture. Si hago `const blob = await fetch(...)` y
     LUEGO `clipboard.write([new ClipboardItem({...blob})])`, Safari falla
     porque el user gesture se perdió en el await.
     Solución: pasar la PROMESA del blob directo al ClipboardItem
     (Safari 16+ y Chrome lo soportan). */
  async function handleCopyImage() {
    if (isCopyingImage) return
    setIsCopyingImage(true)
    toast.loading('Generando PNG (~10s)…', { id: 'copy-img' })
    try {
      const blobPromise = fetch(pngEndpointUrl).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.blob()
      })
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobPromise }),
      ])
      toast.success('Imagen copiada al portapapeles ✓ — ya podés pegarla', {
        id: 'copy-img',
      })
    } catch (err) {
      /* Fallback para Safari < 16 o cuando el navegador no soporta
         pasar promesas: bajamos el blob primero y reintentamos. Si
         este path corre fuera del user gesture, igual va a fallar en
         Safari, pero al menos Chrome/Edge funcionan. */
      try {
        const res = await fetch(pngEndpointUrl)
        const blob = await res.blob()
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ])
        toast.success('Imagen copiada al portapapeles ✓', { id: 'copy-img' })
      } catch (fallbackErr) {
        const msg = fallbackErr instanceof Error ? fallbackErr.message : String(err)
        toast.error(`No se pudo copiar: ${msg}`, { id: 'copy-img' })
      }
    } finally {
      setIsCopyingImage(false)
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
          <Button
            onClick={handleProbar}
            disabled={isSending || isTesting}
            size="lg"
            variant="secondary"
            title="Envía el mismo PNG + caption a New team (grupo interno de prueba). No persiste cambios."
          >
            {isTesting ? '⏳ Probando…' : '🧪 Probar (New team)'}
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={isSending || isTesting || !marca.envio_real_habilitado}
            size="lg"
            title={
              !marca.envio_real_habilitado
                ? `🔒 Envío real DESHABILITADO. Activá el toggle "Envío real ON" en Settings para ${marca.nombre}.`
                : `Envía al grupo WhatsApp real del cliente${marca.grupo_nombre ? `: ${marca.grupo_nombre}` : ''}`
            }
          >
            {isSending ? '⏳ Enviando…' : marca.envio_real_habilitado ? '📤 Enviar al grupo WhatsApp' : '🔒 Envío real OFF'}
          </Button>
        </div>
        {!marca.envio_real_habilitado && (
          <p className="w-full text-[11px] text-muted-foreground mt-1">
            🔒 Envío real está deshabilitado para esta marca. <a href="/settings" className="underline">Configurá en Settings</a> antes de habilitarlo.
          </p>
        )}
      </div>

      {/* SPLIT: preview HTML iframe + caption */}
      <div className="grid lg:grid-cols-[1fr_420px] gap-4">
        {/* PREVIEW iframe — HTML en vivo, NO PNG */}
        <Card>
          <CardContent className="p-4 flex flex-col items-center bg-muted/30">
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground flex-wrap">
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
              <button
                type="button"
                onClick={handleCopyImage}
                disabled={isCopyingImage}
                className="ml-auto px-2 py-0.5 rounded text-xs border hover:bg-muted disabled:opacity-60 disabled:cursor-wait"
                title="Genera el PNG profesional 1080×1620 y lo copia al portapapeles — listo para pegar en WhatsApp, Drive, donde sea"
              >
                {isCopyingImage ? '⏳ Copiando…' : '📋 Copiar imagen'}
              </button>
              <button
                type="button"
                onClick={() => setBust(Date.now())}
                className="px-2 py-0.5 rounded text-xs border hover:bg-muted"
                title="Forzar recarga del iframe (rompe el cache del navegador)"
              >
                ↻ Recargar
              </button>
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
