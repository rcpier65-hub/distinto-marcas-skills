// app/app/editor/_components/cambiar-sub-estado-button.tsx
// Botón de 3 estados (cyclic) para cambiar sub-estado de una publicación.
// Click → next estado (sin_empezar → en_progreso → listo → sin_empezar).
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updatePublicacion } from '../../publicaciones/[id]/_actions'
import { ESTADO_TAREA_LABEL, type EstadoTarea } from '@/lib/types/database'

const NEXT: Record<EstadoTarea, EstadoTarea> = {
  sin_empezar: 'en_progreso',
  en_progreso: 'listo',
  listo: 'sin_empezar',
}

const STYLE: Record<EstadoTarea, string> = {
  sin_empezar: 'bg-muted text-muted-foreground hover:bg-muted/80 border-border',
  en_progreso: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
  listo: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300 dark:bg-green-900/30 dark:text-green-300',
}

const ICON: Record<EstadoTarea, string> = {
  sin_empezar: '⚪',
  en_progreso: '🟠',
  listo: '✅',
}

export function CambiarSubEstadoButton({
  id, current,
}: {
  id: string
  current: EstadoTarea
}) {
  const router = useRouter()
  const [state, setState] = useState<EstadoTarea>(current)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const next = NEXT[state]
    setState(next)  // optimistic
    startTransition(async () => {
      const result = await updatePublicacion(id, { estado_tarea: next })
      if (result.ok) {
        toast.success(`→ ${ESTADO_TAREA_LABEL[next]}`)
        router.refresh()
      } else {
        toast.error(`Error: ${result.error}`)
        setState(current)  // rollback
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors ${STYLE[state]} ${isPending ? 'opacity-60' : ''}`}
      title={`Click para cambiar a "${ESTADO_TAREA_LABEL[NEXT[state]]}"`}
    >
      <span>{ICON[state]}</span>
      <span>{ESTADO_TAREA_LABEL[state]}</span>
    </button>
  )
}
