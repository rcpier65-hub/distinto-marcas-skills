"use client";

import { useMemo, useOptimistic, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import { setHabitoCompletado } from '@/app/habitos/_actions'

export function useHabitCompletions(habits: Array<{ id: string; historial: string[] }>, today: string) {
  const base = useMemo(() => new Set(habits.flatMap(h => h.historial.map(date => `${h.id}|${date}`))), [habits])
  const [done, setOptimistic] = useOptimistic(base, (state, change: { key: string; completed: boolean }) => {
    const next = new Set(state)
    if (change.completed) next.add(change.key)
    else next.delete(change.key)
    return next
  })
  const [isPending, startTransition] = useTransition()
  const saving = useRef(false)
  function toggle(id: string, date: string) {
    if (date !== today || saving.current || isPending) return
    saving.current = true
    const key = `${id}|${date}`
    const completed = !done.has(key)
    startTransition(async () => {
      setOptimistic({ key, completed })
      try {
        const result = await setHabitoCompletado(id, date, completed)
        if (!result.ok) toast.error(result.error)
      } catch {
        toast.error('No se pudo confirmar el guardado. Intenta nuevamente; no se duplicará la marca.')
      } finally {
        saving.current = false
      }
    })
  }
  return { done, isPending, toggle }
}
