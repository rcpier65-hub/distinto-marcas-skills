'use client'

/* EXPLORADOR de Drive dentro del portal (Pedro 17-jul-2026).
 * Navega carpetas y abre archivos SIN salir de la app, usando el token de la
 * agencia por detrás (rutas /api/drive/*). El cliente no necesita cuenta de
 * Google. Solo ve la carpeta de su marca. */

import { useCallback, useEffect, useState } from 'react'
import {
  Folder, ChevronRight, ArrowLeft, ExternalLink, Loader2, FileText, Film, Image as ImageIcon,
  FileSpreadsheet, File as FileIcon, X, Download,
} from 'lucide-react'

type Item = {
  id: string
  nombre: string
  mimeType: string
  esCarpeta: boolean
  esGoogleDoc: boolean
  webViewLink: string | null
}
type Miga = { id: string; nombre: string }

/* Extrae el id de carpeta de un enlace de Drive (versión cliente). */
function folderIdDe(url: string | null | undefined): string | null {
  if (!url) return null
  const u = String(url)
  return (u.match(/[?&]id=([-\w]+)/)?.[1]) ?? (u.match(/\/folders\/([-\w]+)/)?.[1]) ?? (u.match(/\/d\/([-\w]+)/)?.[1]) ?? null
}

function tipoDe(mt: string): 'img' | 'video' | 'pdf' | 'doc' | 'hoja' | 'otro' {
  if (mt.startsWith('image/')) return 'img'
  if (mt.startsWith('video/')) return 'video'
  if (mt === 'application/pdf') return 'pdf'
  if (mt.includes('spreadsheet')) return 'hoja'
  if (mt.includes('document') || mt.startsWith('text/')) return 'doc'
  return 'otro'
}

function IconoArchivo({ mt, color }: { mt: string; color: string }) {
  const t = tipoDe(mt)
  const C = t === 'video' ? Film : t === 'img' ? ImageIcon : t === 'hoja' ? FileSpreadsheet : t === 'doc' || t === 'pdf' ? FileText : FileIcon
  return <C className="w-8 h-8" style={{ color }} />
}

export function DriveExplorer({ color, driveUrl }: { color: string; driveUrl: string }) {
  const [migas, setMigas] = useState<Miga[]>([{ id: '', nombre: 'Inicio' }])
  const [items, setItems] = useState<Item[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<{ msg: string; sinPermiso?: boolean } | null>(null)
  const [preview, setPreview] = useState<Item | null>(null)

  const folderActual = migas[migas.length - 1].id

  const cargar = useCallback(async (folderId: string) => {
    setCargando(true); setError(null)
    try {
      const url = folderId ? `/api/drive/list?folder=${encodeURIComponent(folderId)}` : '/api/drive/list'
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        const sinPermiso = data?.codigo === 'sin_token' || res.status === 409
        setError({
          msg: sinPermiso
            ? 'El equipo aún no conectó Drive. Mientras tanto, abre tu carpeta en Google Drive.'
            : (data?.error ?? 'No se pudo cargar la carpeta.'),
          sinPermiso,
        })
        setItems([])
        return
      }
      setItems(data.items ?? [])
    } catch {
      setError({ msg: 'No se pudo cargar la carpeta.' })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar(folderActual) }, [folderActual, cargar])

  function entrar(it: Item) {
    if (it.esCarpeta) { setMigas((m) => [...m, { id: it.id, nombre: it.nombre }]); return }
    if (it.esGoogleDoc && it.webViewLink) { window.open(it.webViewLink, '_blank', 'noopener'); return }
    const t = tipoDe(it.mimeType)
    if (t === 'img' || t === 'video' || t === 'pdf') setPreview(it)
    else window.open(`/api/drive/file/${it.id}?dl=1`, '_blank', 'noopener') // descarga
  }

  function irA(indice: number) { setMigas((m) => m.slice(0, indice + 1)) }

  const folderId = folderIdDe(driveUrl)

  /* Mientras el equipo no reconecte Google, mostramos la carpeta EMBEBIDA de
     Drive. No necesita token: Google la sirve directo si la carpeta está
     compartida como "cualquiera con el enlace". Así el cliente ve TODAS las
     carpetas igual que antes, y navega dentro del iframe. Cuando el equipo
     reconecte, el explorador in-app (de abajo) toma el control solito.
     Pedro 19-jul-2026. */
  if (error?.sinPermiso && folderId) {
    return (
      <div className="rounded-2xl border bg-card overflow-hidden">
        <iframe
          src={`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`}
          title="Carpetas de tu marca en Drive"
          className="w-full block bg-white"
          style={{ height: 560, border: 0 }}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 border-t">
          <span className="text-[12px] text-muted-foreground">Todas las carpetas de tu marca. Doble clic para entrar.</span>
          <a href={driveUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-white font-bold text-[12.5px] shrink-0" style={{ background: color }}>
            <ExternalLink className="w-4 h-4" /> Abrir en Google Drive
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 px-3 py-2.5 border-b overflow-x-auto">
        {migas.length > 1 && (
          <button onClick={() => setMigas((m) => m.slice(0, -1))} aria-label="Atrás" className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-0.5 text-[13px] font-semibold min-w-0">
          {migas.map((mg, i) => (
            <span key={mg.id || 'root'} className="inline-flex items-center gap-0.5 shrink-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              <button onClick={() => irA(i)} className="px-1.5 py-0.5 rounded hover:bg-muted truncate max-w-[160px]"
                style={i === migas.length - 1 ? { color } : { color: 'var(--muted-foreground, #64748b)' }}>
                {mg.nombre}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-3 min-h-[300px]">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-6 h-6 animate-spin" /> <span className="text-[13px]">Cargando…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-3 px-6">
            <p className="text-[13px] text-muted-foreground">{error.msg}</p>
            <a href={driveUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-white font-bold text-[13px]" style={{ background: color }}>
              <ExternalLink className="w-4 h-4" /> Abrir en Google Drive
            </a>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-[13px] text-muted-foreground py-16">Esta carpeta está vacía.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((it) => (
              <button key={it.id} onClick={() => entrar(it)}
                className="rounded-xl border p-3 flex flex-col items-center gap-2 text-center hover:shadow-sm hover:bg-muted/40 transition-all">
                <div className="w-full aspect-square rounded-lg flex items-center justify-center overflow-hidden" style={{ background: `${color}0d` }}>
                  {it.esCarpeta ? (
                    <Folder className="w-10 h-10" style={{ color }} fill={`${color}33`} />
                  ) : tipoDe(it.mimeType) === 'img' ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={`/api/drive/file/${it.id}`} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <IconoArchivo mt={it.mimeType} color={color} />
                  )}
                </div>
                <div className="text-[12px] font-semibold leading-tight line-clamp-2 w-full">{it.nombre}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Vista de archivo (imagen / video / pdf) */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" style={{ background: 'rgba(15,23,42,0.8)' }} onClick={() => setPreview(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card w-full max-w-3xl max-h-[92vh] rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b">
              <div className="text-[13px] font-bold truncate">{preview.nombre}</div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={`/api/drive/file/${preview.id}?dl=1`} className="w-9 h-9 rounded-lg inline-flex items-center justify-center hover:bg-muted" title="Descargar" download>
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => setPreview(null)} className="w-9 h-9 rounded-lg inline-flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 bg-black/90 flex items-center justify-center overflow-auto" style={{ minHeight: 320 }}>
              {tipoDe(preview.mimeType) === 'img' ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={`/api/drive/file/${preview.id}`} alt={preview.nombre} className="max-w-full max-h-[80vh] object-contain" />
              ) : tipoDe(preview.mimeType) === 'video' ? (
                /* eslint-disable-next-line jsx-a11y/media-has-caption */
                <video src={`/api/drive/file/${preview.id}`} controls playsInline className="max-w-full max-h-[80vh]" />
              ) : (
                <iframe src={`/api/drive/file/${preview.id}`} title={preview.nombre} className="w-full" style={{ height: '80vh', border: 0, background: '#fff' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
