// app/app/editor/_components/cambiar-sub-estado-button.tsx
//
// Botón cíclico de sub-estado de una publicación. Click → next estado
// (sin_empezar → en_progreso → listo → sin_empezar).
//
// Pedro: 'tarea pausada y en qué quedó que deje poner un motivo del
// por qué se pausa la tarea'. Agregamos:
//   - Estado 'pausada' como cuarto valor del enum
//   - Botón ⏸ separado al lado del cíclico, que abre modal pidiendo motivo
//   - Si el estado actual ya es pausada, el cíclico se reemplaza por
//     un botón 'Reanudar' que vuelve a sin_empezar (clear motivo)
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updatePublicacion } from '../../publicaciones/[id]/_actions'
import { ESTADO_TAREA_LABEL, type EstadoTarea } from '@/lib/types/database'

/* Solo cicla entre los 3 estados activos. 'pausada' tiene su propio
   botón porque requiere motivo. */
const NEXT_CYCLIC: Record<Exclude<EstadoTarea, 'pausada'>, Exclude<EstadoTarea, 'pausada'>> = {
  sin_empezar: 'en_progreso',
  en_progreso: 'listo',
  listo: 'sin_empezar',
}

const STYLE: Record<EstadoTarea, string> = {
  sin_empezar: 'bg-muted text-muted-foreground hover:bg-muted/80 border-border',
  en_progreso: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
  listo: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300 dark:bg-green-900/30 dark:text-green-300',
  pausada: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
}

const ICON: Record<EstadoTarea, string> = {
  sin_empezar: '⚪',
  en_progreso: '🟠',
  listo: '✅',
  pausada: '⏸',
}

export function CambiarSubEstadoButton({
  id, current, motivoPausa,
}: {
  id: string
  current: EstadoTarea
  motivoPausa?: string | null
}) {
  const router = useRouter()
  const [state, setState] = useState<EstadoTarea>(current)
  const [pausaOpen, setPausaOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function cambiarA(next: EstadoTarea, motivo?: string | null) {
    const prev = state
    setState(next)
    startTransition(async () => {
      const result = await updatePublicacion(id, {
        estado_tarea: next,
        /* Si se pausa, guardamos motivo. Si se sale de pausa, limpiamos. */
        motivo_pausa: next === 'pausada' ? (motivo ?? '') : null,
      })
      if (result.ok) {
        toast.success(`→ ${ESTADO_TAREA_LABEL[next]}`)
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`)
        setState(prev)
      }
    })
  }

  function clickCiclico() {
    if (state === 'pausada') {
      /* Si está pausada, el botón principal reanuda → sin_empezar */
      cambiarA('sin_empezar', null)
      return
    }
    const next = NEXT_CYCLIC[state]
    cambiarA(next)
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={clickCiclico}
          disabled={isPending}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors ${STYLE[state]} ${isPending ? 'opacity-60' : ''}`}
          title={
            state === 'pausada'
              ? 'Reanudar tarea (vuelve a Sin empezar)'
              : `Click para cambiar a "${ESTADO_TAREA_LABEL[NEXT_CYCLIC[state]]}"`
          }
        >
          <span>{ICON[state]}</span>
          <span>{ESTADO_TAREA_LABEL[state]}</span>
        </button>

        {/* Botón ⏸ separado para pausar. Solo visible si NO está ya pausada. */}
        {state !== 'pausada' && (
          <button
            type="button"
            onClick={() => setPausaOpen(true)}
            disabled={isPending}
            className="h-8 px-2.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-medium transition-colors"
            title="Pausar tarea (te pedirá indicar el motivo)"
          >
            ⏸ Pausar
          </button>
        )}

        {/* Tooltip pequeño con motivo si está pausada */}
        {state === 'pausada' && motivoPausa && (
          <span
            className="text-[11px] text-amber-700 dark:text-amber-300 italic max-w-[220px] truncate"
            title={motivoPausa}
          >
            {motivoPausa}
          </span>
        )}
      </div>

      {pausaOpen && (
        <PausaModal
          onCancel={() => setPausaOpen(false)}
          onConfirm={(motivo) => {
            setPausaOpen(false)
            cambiarA('pausada', motivo)
          }}
        />
      )}
    </>
  )
}

/* Modal simple con textarea pidiendo motivo. */
function PausaModal({
  onCancel, onConfirm,
}: {
  onCancel: () => void
  onConfirm: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState('')
  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-5"
      >
        <h3 className="text-base font-semibold mb-1">Pausar tarea</h3>
        <p className="text-xs text-muted-foreground mb-3">
          ¿En qué quedó? Anota brevemente por qué se pausa para retomarla después con contexto.
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: Esperando feedback de Manrique sobre la portada. Retomar el jueves."
          autoFocus
          rows={4}
          className="w-full p-2.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 h-8 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(motivo.trim() || 'Sin motivo indicado')}
            className="px-4 h-8 rounded-md text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600"
          >
            ⏸ Pausar
          </button>
        </div>
      </div>
    </div>
  )
}
