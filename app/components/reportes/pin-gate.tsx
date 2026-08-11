'use client'

/* Candado de los reportes: pide el código de acceso y lo valida en el
   servidor (verificarPinReportes → cookie httpOnly, 12h). Se usa en el
   módulo interno /reportes y en la sección de reporte del portal cliente. */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { verificarPinReportes } from '@/app/reportes/_actions'

export function PinGate({ titulo = 'Reportes' }: { titulo?: string }) {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function enviar() {
    if (!pin.trim() || pending) return
    setError(null)
    start(async () => {
      const r = await verificarPinReportes(pin)
      if (r.ok) router.refresh()
      else { setError(r.error); setPin('') }
    })
  }

  return (
    <div className="rounded-2xl border bg-card p-8 max-w-sm mx-auto text-center">
      <div className="text-4xl mb-2">🔒</div>
      <h2 className="text-lg font-extrabold tracking-tight">{titulo}</h2>
      <p className="text-xs text-muted-foreground mt-1 mb-5">
        Esta sección es privada. Ingresa el código de acceso.
      </p>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') enviar() }}
        placeholder="••••"
        autoFocus
        className="w-full h-12 text-center text-2xl tracking-[0.5em] rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {error && <p className="text-xs text-red-500 font-semibold mt-2">{error}</p>}
      <button
        onClick={enviar}
        disabled={!pin.trim() || pending}
        className="mt-4 w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40"
      >
        {pending ? 'Verificando…' : 'Entrar'}
      </button>
    </div>
  )
}
