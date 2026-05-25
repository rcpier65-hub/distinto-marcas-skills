// app/app/grabaciones/_components/nueva-grabacion-form.tsx
//
// Form inline para crear una grabación planeada nueva. Compacto, sin modal.
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createGrabacion } from '../_actions'

type MarcaOption = {
  slug: string
  nombre: string
  emoji_marca: string | null
}

export function NuevaGrabacionForm({ marcas }: { marcas: MarcaOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [slug, setSlug] = useState(marcas[0]?.slug ?? '')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [notas, setNotas] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!slug || !fecha) {
      toast.error('Marca y fecha son obligatorios')
      return
    }
    startTransition(async () => {
      const result = await createGrabacion({ marca_slug: slug, fecha_planeada: fecha, notas })
      if (result.ok) {
        toast.success('Grabación planeada creada')
        setNotas('')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
      >
        + Nueva grabación
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap bg-muted/30 p-3 rounded-md border">
      <div>
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Marca</label>
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="h-9 px-2 rounded-md border bg-background text-sm"
        >
          {marcas.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.emoji_marca ?? '📊'} {m.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Fecha planeada</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="h-9 px-2 rounded-md border bg-background text-sm font-mono"
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Notas (opcional)</label>
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej. 10 videos para mayo"
          className="h-9 w-full px-2 rounded-md border bg-background text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
      >
        {isPending ? 'Creando…' : 'Crear'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="h-9 px-3 rounded-md border text-sm"
      >
        Cancelar
      </button>
    </form>
  )
}
