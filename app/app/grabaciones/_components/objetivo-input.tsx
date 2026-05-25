// app/app/grabaciones/_components/objetivo-input.tsx
//
// Input inline para editar el grabaciones_objetivo_mensual de una marca.
// Auto-save al perder focus o cuando aprieta Enter.
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateMarcaObjetivoMensual } from '../_actions'

export function ObjetivoInput({ slug, initial }: { slug: string; initial: number }) {
  const [value, setValue] = useState(initial.toString())
  const [saved, setSaved] = useState(initial.toString())
  const [isPending, startTransition] = useTransition()

  function save() {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 0) {
      setValue(saved)
      return
    }
    if (num.toString() === saved) return
    startTransition(async () => {
      const result = await updateMarcaObjetivoMensual(slug, num)
      if (result.ok) {
        setSaved(num.toString())
        toast.success(`Objetivo actualizado`)
      } else {
        setValue(saved)
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      disabled={isPending}
      min="0"
      max="100"
      className="h-7 w-14 px-1 text-center rounded border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      title="Objetivo de grabaciones por mes para esta marca"
    />
  )
}
