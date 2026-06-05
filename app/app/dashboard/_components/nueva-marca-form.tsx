// app/app/dashboard/_components/nueva-marca-form.tsx
//
// Botón "+ Nueva marca" + formulario inline para el Dashboard. Al crear, la
// marca se inserta en la base (fuente única) y aparece sola en grabaciones,
// sidebar, command palette y demás espacios.
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, X, Loader2, Sparkles } from 'lucide-react'
import { createMarca } from '../_actions'

const VIOLETA = '#ba41f7'

/** Misma lógica de slug que el server, para mostrar una vista previa en vivo. */
function previewSlug(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

const INPUT_CLS =
  'mt-1 h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40'

export function NuevaMarcaForm({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [saving, setSaving] = useState(false)
  const [nombre, setNombre] = useState('')
  const [emoji, setEmoji] = useState('🏷️')
  const [color, setColor] = useState(VIOLETA)
  const [objetivo, setObjetivo] = useState(0)

  const slug = previewSlug(nombre)

  function reset() {
    setNombre(''); setEmoji('🏷️'); setColor(VIOLETA); setObjetivo(0)
  }

  async function submit() {
    if (!nombre.trim()) { toast.error('Pon un nombre para la marca'); return }
    setSaving(true)
    const res = await createMarca({ nombre, emoji, color, objetivo })
    setSaving(false)
    if (!res.ok) { toast.error(res.error); return }
    toast.success(`Marca "${nombre}" creada — ya aparece en grabaciones y en el menú`, { duration: 6000 })
    reset()
    setOpen(false)
    router.refresh()
  }

  // ---------- Estado cerrado: botón ----------
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-white text-sm font-medium shadow-sm transition-colors"
        style={{ background: VIOLETA }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#9f37db' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = VIOLETA }}
      >
        <Plus className="w-4 h-4" /> Nueva marca
      </button>
    )
  }

  // ---------- Estado abierto: formulario ----------
  return (
    <div
      className="rounded-xl border bg-card p-5 shadow-sm"
      style={{ borderColor: `${VIOLETA}40` }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="w-4 h-4" style={{ color: VIOLETA }} /> Nueva marca
        </h3>
        <button
          onClick={() => { setOpen(false); reset() }}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        {/* Nombre */}
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Nombre de la marca</span>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="Ej. Oral Beauty"
            autoFocus
            className={`${INPUT_CLS} w-full`}
          />
        </label>

        {/* Emoji */}
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Emoji</span>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
            className="mt-1 w-16 h-10 px-2 rounded-md border bg-background text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40"
          />
        </label>

        {/* Color */}
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Color</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 w-16 h-10 rounded-md border bg-background cursor-pointer p-1"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 items-start">
        {/* Objetivo */}
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Grabaciones por mes (objetivo)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={objetivo}
            onChange={(e) => setObjetivo(Number(e.target.value) || 0)}
            className={`${INPUT_CLS} w-full`}
          />
          <span className="block mt-1 text-[11px] text-muted-foreground">
            0 = sin meta fija (grabas cuando haya, como Oral Beauty). Igual tendrá todas las opciones.
          </span>
        </label>

        {/* Vista previa del slug */}
        <div className="text-xs text-muted-foreground sm:mt-6">
          <span className="font-medium">Identificador:</span>{' '}
          {slug
            ? <code className="px-1.5 py-0.5 rounded bg-muted font-mono">{slug}</code>
            : <span className="italic">se genera del nombre</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-5">
        <button
          onClick={submit}
          disabled={saving || !nombre.trim()}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: VIOLETA }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Creando…' : 'Crear marca'}
        </button>
        <button
          onClick={() => { setOpen(false); reset() }}
          className="h-10 px-4 rounded-lg border bg-background text-sm font-medium hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
