// app/app/habitos/_components/nuevo-habito-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createHabito } from '../_actions'

const ICONS_SUGERIDOS = ['💬', '📈', '📸', '📢', '✅', '📱', '📊', '🎬', '✏️', '📧', '💼', '🔥', '⏰', '📅', '🧠', '💡', '☀️']

export function NuevoHabitoForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [icono, setIcono] = useState('✅')
  const [color, setColor] = useState('#6366F1')
  const [finSemana, setFinSemana] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      toast.error('Nombre obligatorio')
      return
    }
    startTransition(async () => {
      const result = await createHabito({
        nombre: nombre.trim(),
        icono,
        color,
        dias_activos: finSemana ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5],
      })
      if (result.ok) {
        toast.success(`✅ Hábito "${nombre}" creado`)
        setNombre('')
        setIcono('✅')
        setColor('#6366F1')
        setFinSemana(false)
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
        className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
      >
        + Nuevo hábito
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold text-slate-100">Nuevo hábito diario</h3>

      <div className="space-y-2">
        <label className="text-xs text-slate-400 block">Nombre</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Revisar inbox Manrique"
          className="w-full h-10 px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-slate-400 block">Icono</label>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={icono}
            onChange={(e) => setIcono(e.target.value.slice(0, 2))}
            className="h-10 w-14 text-center text-2xl rounded-lg bg-slate-800 border border-slate-700"
          />
          <div className="flex gap-1 flex-wrap">
            {ICONS_SUGERIDOS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcono(emoji)}
                className={`h-9 w-9 rounded hover:bg-slate-700 text-xl ${icono === emoji ? 'bg-slate-700 ring-2 ring-primary' : ''}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs text-slate-400 block">Color (heatmap)</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-10 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-slate-400 block">Días activos</label>
          <label className="flex items-center gap-2 h-10 px-3 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={finSemana}
              onChange={(e) => setFinSemana(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-200">
              {finSemana ? 'Lun a Dom (7 días)' : 'Solo Lun-Vie'}
            </span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {isPending ? 'Creando…' : 'Crear hábito'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="h-10 px-4 rounded-lg border border-slate-700 text-sm text-slate-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
