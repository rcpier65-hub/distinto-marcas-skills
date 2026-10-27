'use client'

import { useState } from 'react'
import { Download, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { idPortadaDrive, nombrePortada } from '@/lib/cliente/portada'

/** Mantiene la pantalla actual y muestra el error si Drive no entrega la imagen. */
export function DescargarPortada({ id, titulo, url, color = '#9333ea', tipo }: {
  id: string; titulo: string; url: string; color?: string; tipo?: 'cruda' | 'editada'
}) {
  const [busy, setBusy] = useState(false)
  const style = { color, borderColor: `${color}55` }
  const className = 'inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg text-[12.5px] font-semibold border bg-card disabled:opacity-60'
  // Los enlaces que no son de Drive conservan su destino; no se admiten como proxy.
  if (!idPortadaDrive(url)) return <a href={url} download className={className} style={style} aria-label={`Descargar portada de ${titulo}`}><Download className="w-3.5 h-3.5" />Descargar portada</a>

  async function descargar() {
    if (busy) return
    setBusy(true)
    try {
      const r = await fetch(`/api/drive/portada/${id}${tipo ? `?tipo=${tipo}` : ''}`, {
        cache: 'no-store', signal: AbortSignal.timeout(30000),
      })
      if (!r.ok) {
        const mensaje = (await r.text()).trim()
        throw new Error(mensaje && mensaje.length < 220 && !mensaje.includes('<') ? mensaje : 'No se pudo descargar la portada. Intenta de nuevo.')
      }
      const blob = await r.blob()
      if (!blob.size || !blob.type.startsWith('image/')) throw new Error('No se recibió una imagen. Recarga la página e inicia sesión de nuevo si es necesario.')
      const filename = r.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]
        ?? nombrePortada(titulo, blob.type.split('/')[1].replace('jpeg', 'jpg'))
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Safari necesita que la URL siga disponible mientras inicia la descarga.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
      toast.success('Descarga iniciada. Revisa Descargas o Archivos en tu celular.')
    } catch (e) {
      toast.error(e instanceof Error && e.name === 'TimeoutError' ? 'La descarga tardó demasiado. Intenta de nuevo.' : e instanceof Error ? e.message : 'No se pudo descargar la portada.')
    } finally { setBusy(false) }
  }
  return <button type="button" onClick={() => void descargar()} disabled={busy} className={className} style={style} aria-label={`Descargar portada de ${titulo}`} aria-busy={busy}>
    {busy ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
    {busy ? 'Descargando…' : 'Descargar portada'}
  </button>
}
