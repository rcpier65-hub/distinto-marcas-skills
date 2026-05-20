// app/app/settings/_components/logo-url-input.tsx
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateMarcaLogoUrl } from '../_actions'

type Props = {
  slug: string
  marcaNombre: string
  emojiMarca: string | null
  initialUrl: string | null
}

export function LogoUrlInput({ slug, marcaNombre, emojiMarca, initialUrl }: Props) {
  const [value, setValue] = useState(initialUrl ?? '')
  const [savedValue, setSavedValue] = useState(initialUrl ?? '')
  const [isPending, startTransition] = useTransition()

  // Auto-save al perder focus (si cambió)
  function handleBlur() {
    if (value === savedValue) return
    startTransition(async () => {
      const result = await updateMarcaLogoUrl(slug, value)
      if (result.ok) {
        setSavedValue(value)
        toast.success(`Logo de ${marcaNombre} actualizado`)
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  // Detectar si es Drive URL y mostrar tip
  const isDriveUrl = value.includes('drive.google.com')
  const hasFileFormat = value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) !== null

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2 min-w-[200px]">
        <span className="text-2xl">{emojiMarca ?? '📊'}</span>
        <div>
          <div className="font-medium text-sm">{marcaNombre}</div>
          <code className="font-mono text-[10px] text-muted-foreground">{slug}</code>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            placeholder="https://drive.google.com/file/d/FILE_ID/view o cualquier URL pública"
            className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {isPending && <span className="text-[10px] text-muted-foreground">guardando…</span>}
          {!isPending && value === savedValue && savedValue !== '' && (
            <span className="text-[10px] text-green-600">✓</span>
          )}
        </div>

        {/* Tips contextuales */}
        {isDriveUrl && hasFileFormat && (
          <p className="text-[10px] text-muted-foreground mt-1">
            ✓ URL de Drive detectada — se va a convertir automáticamente a formato de descarga directa
          </p>
        )}
        {isDriveUrl && !hasFileFormat && (
          <p className="text-[10px] text-orange-600 mt-1">
            ⚠ Asegurate de que el archivo esté como "Cualquier persona con el enlace" en Drive
          </p>
        )}
        {value && !isDriveUrl && (
          <p className="text-[10px] text-muted-foreground mt-1">
            URL externa — debe ser PNG/JPG/SVG público
          </p>
        )}
      </div>

      {/* Preview thumbnail */}
      {savedValue && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={savedValue.includes('drive.google.com') && savedValue.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
            ? `https://drive.google.com/uc?export=download&id=${savedValue.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)![1]}`
            : savedValue}
          alt={`Logo ${marcaNombre}`}
          className="w-12 h-12 object-contain rounded border bg-muted/30"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
        />
      )}
    </div>
  )
}
