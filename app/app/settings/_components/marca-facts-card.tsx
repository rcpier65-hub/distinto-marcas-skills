// app/app/settings/_components/marca-facts-card.tsx
'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getMarcaFacts, updateMarcaFacts, type MarcaFactsForm } from '../_actions'

type Props = {
  slug: string
  marcaNombre: string
  emojiMarca: string | null
}

const EMPTY_FORM: MarcaFactsForm = {
  nombre_comercial: '',
  web_principal: '',
  whatsapp_principal: '',
  puntos_venta: [],
  proximamente: [],
  productos_datos_json: '{}',
  frases_prohibidas: [],
  frases_canon: [],
  notas: '',
}

/**
 * Card colapsable con TODO el form de marca_facts para una marca.
 * Cerrado por default — Pedro lo abre solo cuando va a cargar/editar.
 * Indicador visual: ✓ verde si hay facts cargados, ⚠️ ámbar si está vacío.
 */
export function MarcaFactsCard({ slug, marcaNombre, emojiMarca }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [hasFacts, setHasFacts] = useState<boolean | null>(null)
  const [form, setForm] = useState<MarcaFactsForm>(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const loadFacts = useCallback(async () => {
    setIsLoading(true)
    const r = await getMarcaFacts(slug)
    if (r.ok) {
      setForm(r.data)
      setHasFacts(r.hasFacts)
    } else {
      toast.error(`Error cargando facts: ${r.error}`)
    }
    setIsLoading(false)
  }, [slug])

  // Cargar al expandir por primera vez
  useEffect(() => {
    if (expanded && hasFacts === null) {
      void loadFacts()
    }
  }, [expanded, hasFacts, loadFacts])

  // Cargar status (hasFacts) al montar para mostrar badge ✓/⚠️ sin expandir
  useEffect(() => {
    void (async () => {
      const r = await getMarcaFacts(slug)
      if (r.ok) setHasFacts(r.hasFacts)
    })()
  }, [slug])

  function handleSave() {
    startTransition(async () => {
      const r = await updateMarcaFacts(slug, form)
      if (r.ok) {
        toast.success(`Datos canon de ${marcaNombre} guardados`)
        setHasFacts(true)
      } else {
        toast.error(`Error: ${r.error}`)
      }
    })
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      {/* HEADER colapsable */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{emojiMarca ?? '📊'}</span>
          <div className="text-left">
            <div className="text-sm font-medium">{marcaNombre}</div>
            <code className="text-[10px] text-muted-foreground font-mono">{slug}</code>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasFacts === true && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
              ✓ cargado
            </span>
          )}
          {hasFacts === false && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              ⚠ sin datos
            </span>
          )}
          {hasFacts === null && (
            <span className="text-[11px] text-muted-foreground">…</span>
          )}
          <span className="text-muted-foreground text-xs">
            {expanded ? '▴' : '▾'}
          </span>
        </div>
      </button>

      {/* BODY del form */}
      {expanded && (
        <div className="p-4 border-t border-border bg-muted/20 space-y-4">
          {isLoading && (
            <div className="text-xs text-muted-foreground">Cargando…</div>
          )}

          {!isLoading && (
            <>
              {/* Naming */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FieldText
                  label="Nombre comercial actual"
                  hint="Ej: 'Typhouse' (no 'Little Joe')"
                  value={form.nombre_comercial}
                  onChange={(v) => setForm({ ...form, nombre_comercial: v })}
                  placeholder={marcaNombre}
                />
                <FieldText
                  label="Web principal"
                  hint="Ej: typhouse.pe"
                  value={form.web_principal}
                  onChange={(v) => setForm({ ...form, web_principal: v })}
                  placeholder="ejemplo.pe"
                />
                <FieldText
                  label="WhatsApp principal"
                  hint="Ej: +51 912 568 107"
                  value={form.whatsapp_principal}
                  onChange={(v) => setForm({ ...form, whatsapp_principal: v })}
                  placeholder="+51 ..."
                />
              </div>

              {/* Puntos de venta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldChips
                  label="Puntos de venta físicos"
                  hint="Donde se vende hoy: Sodimac, Totus, Pharmax, etc."
                  values={form.puntos_venta}
                  onChange={(v) => setForm({ ...form, puntos_venta: v })}
                  placeholder="Sodimac"
                />
                <FieldChips
                  label="Próximamente"
                  hint="Aperturas confirmadas pero aún no activas (ej: Rosatel)"
                  values={form.proximamente}
                  onChange={(v) => setForm({ ...form, proximamente: v })}
                  placeholder="Rosatel"
                />
              </div>

              {/* Frases canon vs prohibidas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldChips
                  label="Frases canon (la Routine las prefiere)"
                  hint="CTAs específicos: 'Escríbenos al 📲 912 568 107'"
                  values={form.frases_canon}
                  onChange={(v) => setForm({ ...form, frases_canon: v })}
                  placeholder="Visita typhouse.pe"
                />
                <FieldChips
                  label="Frases prohibidas (NUNCA usar)"
                  hint="URLs viejas, frases genéricas: 'littlejoe.pe', 'te escribo al interno con info'"
                  values={form.frases_prohibidas}
                  onChange={(v) => setForm({ ...form, frases_prohibidas: v })}
                  placeholder="littlejoe.pe"
                />
              </div>

              {/* Productos datos JSON */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Datos de productos (JSON)
                </label>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Datos numéricos verificables. Ej Warrior:
                  <code className="ml-1 font-mono">{'{"barra_warrior_crunch":{"kcal":100,"precio_unit":13,"sabores":["Banoffee","Mocha"]}}'}</code>
                </p>
                <textarea
                  value={form.productos_datos_json}
                  onChange={(e) => setForm({ ...form, productos_datos_json: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder='{ "producto_a": { "kcal": 100 } }'
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium mb-1">Notas internas (opcional)</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Cualquier contexto que la Routine deba conocer…"
                />
              </div>

              {/* Save */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => void loadFacts()}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs rounded-md border border-input hover:bg-muted disabled:opacity-50"
                >
                  Descartar cambios
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Guardando…' : 'Guardar datos canon'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Subcomponentes inline (privados de este file)
// ============================================================

type FieldTextProps = {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

function FieldText({ label, hint, value, onChange, placeholder }: FieldTextProps) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      {hint && <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  )
}

type FieldChipsProps = {
  label: string
  hint?: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}

/**
 * Editor de chips. Enter agrega, × borra.
 * El input vive dentro del componente — no lo levantamos al form padre
 * porque solo se commitea al "agregar".
 */
function FieldChips({ label, hint, values, onChange, placeholder }: FieldChipsProps) {
  const [draft, setDraft] = useState('')

  function add() {
    const v = draft.trim()
    if (!v || values.includes(v)) {
      setDraft('')
      return
    }
    onChange([...values, v])
    setDraft('')
  }

  function remove(v: string) {
    onChange(values.filter(x => x !== v))
  }

  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      {hint && <p className="text-[10px] text-muted-foreground mb-1">{hint}</p>}
      <div className="rounded-md border border-input bg-background px-2 py-1.5 min-h-[3rem] flex flex-wrap gap-1.5 items-center">
        {values.map(v => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] border border-primary/20"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              className="text-primary/60 hover:text-primary"
              aria-label={`Quitar ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          onBlur={add}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent border-0 text-xs focus:outline-none"
        />
      </div>
    </div>
  )
}
