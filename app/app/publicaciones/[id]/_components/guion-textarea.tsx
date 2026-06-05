// app/app/publicaciones/[id]/_components/guion-textarea.tsx
//
// Textarea simple para el guión técnico.
// Reemplaza el componente <GuionTecnicoTable> (tabla estructurada de
// escenas) porque Pedro pidió poder pegar el guion como texto plano
// igual que está en Notion (con tabs, párrafos, columnas, etc.) sin
// estar atado a un schema Diálogo/Plano/Notas.
//
// El campo se guarda en publicaciones.guion (text).
// El sync de Notion lo popula automáticamente con el guion concatenado.
//
// Auto-save: onBlur llama updateGuionTexto. No requiere botón.

'use client'

import { useState, useTransition } from 'react'
import { Film, Check, Loader2 } from 'lucide-react'
import { updateGuionTexto } from '../_actions'

type Props = {
  publicacionId: string
  initialGuion: string | null
}

export function GuionTextarea({ publicacionId, initialGuion }: Props) {
  const [value, setValue] = useState(initialGuion ?? '')
  const [savedValue, setSavedValue] = useState(initialGuion ?? '')
  const [isPending, startTransition] = useTransition()
  const [showSaved, setShowSaved] = useState(false)

  const dirty = value !== savedValue
  const charCount = value.length
  const lineCount = value ? value.split('\n').length : 0

  function handleBlur() {
    if (!dirty) return
    startTransition(async () => {
      const r = await updateGuionTexto(publicacionId, value)
      if (r.ok) {
        setSavedValue(value)
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 1500)
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-[#ba41f7]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Guion técnico
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            · {lineCount} {lineCount === 1 ? 'línea' : 'líneas'} · {charCount} chars
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {isPending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Guardando…</span>
            </>
          ) : showSaved ? (
            <>
              <Check className="w-3 h-3 text-green-600" />
              <span className="text-green-600">Guardado</span>
            </>
          ) : dirty ? (
            <span className="opacity-60">Cambios sin guardar</span>
          ) : (
            <span className="opacity-50">Auto-guarda al salir del campo</span>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={`Pegá el guion completo desde Notion…\n\nEjemplo:\nVoz en off | Toma / visual\n"Yo soy Joe…" | Joe saludando a cámara\n"Tengo estilo…" | Joe se acerca a la zona de ambientadores`}
        rows={14}
        className="w-full px-4 py-3 text-sm font-mono leading-relaxed bg-background border-0 focus:outline-none focus:ring-0 resize-y placeholder:text-muted-foreground/40 placeholder:font-sans"
        spellCheck={false}
      />
    </div>
  )
}
