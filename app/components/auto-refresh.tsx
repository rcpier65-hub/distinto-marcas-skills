'use client'

import { useEffect } from 'react'
import { useSafeRefresh } from '@/lib/realtime/use-safe-refresh'

/** Refresca datos sin acumular solicitudes cuando una respuesta tarda. */
export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const refresh = useSafeRefresh()
  useEffect(() => {
    const onReturn = () => { refresh() }
    const interval = setInterval(onReturn, Math.max(intervalMs, 30000))
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('online', onReturn)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('online', onReturn)
    }
  }, [refresh, intervalMs])
  return null
}
