// app/app/publicaciones/[id]/_components/guion-tecnico-table.tsx
// Tabla editable estilo shooting script:
//   ESCENA # | DIÁLOGO | PLANO | DURACIÓN | NOTAS | acciones
// Cada celda auto-guarda onBlur. Optimistic UI con rollback en error.
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createEscena, updateEscena, deleteEscena } from '../_actions-escenas'
import type { EscenaRow } from '@/lib/types/database'

// Tipos de plano comunes — sugeridos en el datalist
const PLANOS_COMUNES = [
  'PG',       // Plano General
  'PM',       // Plano Medio
  'PP',       // Primer Plano
  'PPP',      // Primerísimo Primer Plano
  'PD',       // Plano Detalle
  'PE',       // Plano Entero
  'PA',       // Plano Americano
  'Aéreo',
  'Picado',
  'Contrapicado',
  'Zenital',
  'POV',
  'Travelling',
  'Insert',
]

type Props = {
  publicacionId: string
  initialEscenas: EscenaRow[]
}

export function GuionTecnicoTable({ publicacionId, initialEscenas }: Props) {
  const router = useRouter()
  const [escenas, setEscenas] = useState<EscenaRow[]>(initialEscenas)
  const [isPending, startTransition] = useTransition()
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  // Map de valores en edición (para optimistic UI mientras el user escribe)
  const editingRef = useRef<Record<string, Partial<EscenaRow>>>({})

  function markSaving(id: string, saving: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev)
      if (saving) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleAddEscena() {
    startTransition(async () => {
      const result = await createEscena(publicacionId)
      if (result.ok && result.data) {
        // Optimistic: agregamos al state local con campos vacíos
        setEscenas((curr) => [...curr, {
          id: result.data!.id,
          publicacion_id: publicacionId,
          escena_num: result.data!.escena_num,
          dialogo: null,
          plano: null,
          duracion_seg: null,
          notas: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
          updated_by: null,
        }])
        toast.success(`Escena ${result.data.escena_num} agregada`)
      } else {
        toast.error(`Error: ${(result as { ok: false; error: string }).error}`)
      }
    })
  }

  function handleDeleteEscena(id: string, num: number) {
    if (!confirm(`¿Eliminar escena ${num}? Las escenas siguientes se renumerarán.`)) return
    startTransition(async () => {
      const result = await deleteEscena(id, publicacionId)
      if (result.ok) {
        // Optimistic: removemos + renumeramos
        setEscenas((curr) => {
          const filtered = curr.filter((e) => e.id !== id)
          // Re-numerar local también para que coincida con server
          return filtered
            .sort((a, b) => a.escena_num - b.escena_num)
            .map((e, i) => ({ ...e, escena_num: i + 1 }))
        })
        toast.success(`Escena ${num} eliminada`)
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  // Auto-save cuando el user sale de la celda (onBlur)
  function handleFieldBlur(
    escenaId: string,
    field: 'dialogo' | 'plano' | 'duracion_seg' | 'notas',
    value: string,
  ) {
    const escena = escenas.find((e) => e.id === escenaId)
    if (!escena) return

    // Convertir valor según el campo
    let newValue: string | number | null = value.trim() === '' ? null : value
    if (field === 'duracion_seg') {
      const parsed = parseInt(value, 10)
      newValue = isNaN(parsed) ? null : parsed
    }

    // Si no cambió, no hacemos nada
    const currentValue = escena[field]
    if (currentValue === newValue) return

    // Optimistic update
    const prevEscenas = escenas
    setEscenas((curr) => curr.map((e) =>
      e.id === escenaId ? { ...e, [field]: newValue } : e,
    ))

    markSaving(escenaId, true)
    startTransition(async () => {
      const result = await updateEscena(escenaId, publicacionId, { [field]: newValue })
      markSaving(escenaId, false)
      if (!result.ok) {
        toast.error(`Error guardando: ${result.error}`)
        setEscenas(prevEscenas)  // rollback
      }
    })
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide">🎬 Guion técnico</h3>
            <p className="text-[10px] text-muted-foreground">
              {escenas.length} {escenas.length === 1 ? 'escena' : 'escenas'} · auto-guarda al salir de cada celda
            </p>
          </div>
          <Button
            type="button"
            onClick={handleAddEscena}
            disabled={isPending}
            size="sm"
            variant="outline"
          >
            + Agregar escena
          </Button>
        </div>

        {escenas.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <div>Sin escenas todavía.</div>
            <button
              type="button"
              onClick={handleAddEscena}
              disabled={isPending}
              className="mt-3 text-blue-600 hover:underline text-sm"
            >
              + Crear primera escena
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr className="text-left">
                  <th className="p-2 font-medium w-12">#</th>
                  <th className="p-2 font-medium min-w-[300px]">Diálogo / Voz en off</th>
                  <th className="p-2 font-medium w-[140px]">Plano</th>
                  <th className="p-2 font-medium w-[80px]">Dur. (s)</th>
                  <th className="p-2 font-medium min-w-[200px]">Notas</th>
                  <th className="p-2 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {escenas.map((esc) => {
                  const isSaving = savingIds.has(esc.id)
                  return (
                    <tr key={esc.id} className="border-b hover:bg-muted/20 transition-colors">
                      {/* # */}
                      <td className="p-2 text-center">
                        <span className="font-mono font-semibold text-muted-foreground">
                          {esc.escena_num}
                        </span>
                      </td>

                      {/* Diálogo */}
                      <td className="p-1.5">
                        <textarea
                          defaultValue={esc.dialogo ?? ''}
                          onBlur={(e) => handleFieldBlur(esc.id, 'dialogo', e.target.value)}
                          placeholder='"Hola, soy..." o voz en off…'
                          rows={2}
                          className="w-full p-1.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                      </td>

                      {/* Plano */}
                      <td className="p-1.5">
                        <input
                          type="text"
                          defaultValue={esc.plano ?? ''}
                          onBlur={(e) => handleFieldBlur(esc.id, 'plano', e.target.value)}
                          placeholder="PG, PM, PP…"
                          list={`planos-${esc.id}`}
                          className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono uppercase"
                        />
                        <datalist id={`planos-${esc.id}`}>
                          {PLANOS_COMUNES.map((p) => <option key={p} value={p} />)}
                        </datalist>
                      </td>

                      {/* Duración */}
                      <td className="p-1.5">
                        <input
                          type="number"
                          min={0}
                          defaultValue={esc.duracion_seg ?? ''}
                          onBlur={(e) => handleFieldBlur(esc.id, 'duracion_seg', e.target.value)}
                          placeholder="seg"
                          className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                        />
                      </td>

                      {/* Notas */}
                      <td className="p-1.5">
                        <textarea
                          defaultValue={esc.notas ?? ''}
                          onBlur={(e) => handleFieldBlur(esc.id, 'notas', e.target.value)}
                          placeholder="accesorios, vestuario, transición…"
                          rows={2}
                          className="w-full p-1.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                      </td>

                      {/* Acciones */}
                      <td className="p-1.5 text-center align-middle">
                        <div className="flex flex-col items-center gap-1">
                          {isSaving && <span className="text-[9px] text-muted-foreground">…</span>}
                          <button
                            type="button"
                            onClick={() => handleDeleteEscena(esc.id, esc.escena_num)}
                            disabled={isPending}
                            title="Eliminar escena"
                            className="text-destructive hover:bg-destructive/10 rounded p-1 text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Footer con totales */}
              {escenas.length > 0 && (
                <tfoot className="bg-muted/30 border-t">
                  <tr>
                    <td colSpan={3} className="p-2 text-right text-xs text-muted-foreground font-medium">
                      Duración total estimada:
                    </td>
                    <td className="p-2 font-mono text-xs">
                      {escenas.reduce((acc, e) => acc + (e.duracion_seg ?? 0), 0)}s
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
