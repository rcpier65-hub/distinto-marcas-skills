// app/app/grabaciones/_components/notas-input.tsx
//
// Textarea inline para anotar pendientes operativos de grabación
// por marca. Ej. Little Joe: "Pendiente confirmar fecha con Cristal".
//
// UX:
//   - Empieza compacto (1-2 líneas visibles). Auto-grow al escribir.
//   - Auto-save on blur (mismo patrón que ObjetivoInput).
//   - Optimistic: el cambio se ve inmediato; si el server rechaza,
//     revertimos al valor inicial y mostramos toast.
//   - Empty state visible: "Anotá un pendiente para esta marca…"
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { StickyNote } from 'lucide-react'
import { updateMarcaNotasGrabaciones } from '../_actions'

type Props = {
  slug: string
  initial: string | null
}

export function NotasInput({ slug, initial }: Props) {
  const [value, setValue] = useState(initial ?? '')
  const [savedValue, setSavedValue] = useState(initial ?? '')
  const [isPending, startTransition] = useTransition()

  function handleBlur() {
    /* No-op si no cambió */
    if (value === savedValue) return
    const before = savedValue
    setSavedValue(value)
    startTransition(async () => {
      const r = await updateMarcaNotasGrabaciones(slug, value)
      if (r.ok) {
        toast.success('Nota guardada', { duration: 1500 })
      } else {
        /* Revert visual + state si falla */
        setValue(before)
        setSavedValue(before)
        toast.error(r.error)
      }
    })
  }

  const hasContent = value.trim().length > 0

  return (
    <div className="pt-2 border-t border-border/60">
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        <StickyNote className="w-3 h-3" />
        Notas
        {isPending && <span className="text-[#ba41f7] normal-case font-normal ml-1">guardando…</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="Pendiente con cliente, instrucciones, recordatorios…"
        rows={hasContent ? 3 : 2}
        maxLength={2000}
        disabled={isPending}
        className="w-full px-2 py-1.5 rounded-md border border-input bg-background text-[11px] leading-snug resize-y focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40 disabled:opacity-50 placeholder:text-muted-foreground/60"
      />
    </div>
  )
}
