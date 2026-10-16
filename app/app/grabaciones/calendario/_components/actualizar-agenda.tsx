'use client'

import { useCallback, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function ActualizarAgenda({ actualizadaEn, pausada }: { actualizadaEn: string; pausada: boolean }) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const enCurso = useRef(false)
  const punteroActivo = useRef(false)
  useEffect(() => { enCurso.current = pendiente }, [pendiente])

  const actualizar = useCallback((manual = false) => {
    if (enCurso.current || pausada || document.visibilityState !== 'visible' || !navigator.onLine) return
    const campo = document.activeElement
    if (!manual && (punteroActivo.current || campo?.matches('input, textarea, select, [contenteditable="true"]'))) return
    enCurso.current = true
    startTransition(() => router.refresh())
  }, [router, pausada])

  useEffect(() => {
    const refrescar = () => actualizar()
    const abajo = () => { punteroActivo.current = true }
    const arriba = () => { punteroActivo.current = false }
    const intervalo = setInterval(refrescar, 30_000)
    window.addEventListener('focus', refrescar)
    window.addEventListener('online', refrescar)
    document.addEventListener('visibilitychange', refrescar)
    window.addEventListener('pointerdown', abajo, { passive: true })
    window.addEventListener('pointerup', arriba, { passive: true })
    window.addEventListener('pointercancel', arriba, { passive: true })
    window.addEventListener('blur', arriba)
    return () => {
      clearInterval(intervalo)
      window.removeEventListener('focus', refrescar)
      window.removeEventListener('online', refrescar)
      document.removeEventListener('visibilitychange', refrescar)
      window.removeEventListener('pointerdown', abajo)
      window.removeEventListener('pointerup', arriba)
      window.removeEventListener('pointercancel', arriba)
      window.removeEventListener('blur', arriba)
    }
  }, [actualizar])

  const hora = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(actualizadaEn))
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
      <button type="button" onClick={() => actualizar(true)} disabled={pendiente || pausada}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 hover:bg-muted disabled:opacity-50"
        aria-label="Actualizar calendario" aria-busy={pendiente}>
        <RefreshCw size={13} className={pendiente ? 'animate-spin' : ''} />
        {pendiente ? 'Actualizando…' : 'Actualizar'}
      </button>
      <span aria-live="polite">Lectura: {hora} · se actualiza cada 30 s</span>
    </div>
  )
}
