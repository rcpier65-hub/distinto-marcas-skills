'use client'

/* Candado de los reportes: pide el código de acceso y lo valida en el
   servidor (verificarPinReportes → cookie httpOnly, 12h). Se usa en el
   módulo interno /reportes y en la sección de reporte del portal cliente. */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2 } from 'lucide-react'
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
    <div className="max-w-[400px] mx-auto rounded-[24px] border border-slate-200/80 bg-white p-8 text-center shadow-[0_10px_40px_-12px_rgba(15,23,42,0.15)]">
      <div className="w-14 h-14 mx-auto rounded-[16px] inline-flex items-center justify-center text-white mb-4"
        style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
        <Lock className="w-6 h-6" />
      </div>
      <h2 className="text-[20px] font-bold tracking-tight text-slate-900">{titulo}</h2>
      <p className="text-[13px] text-slate-500 mt-1 mb-6">Información privada. Ingresa tu código de acceso.</p>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') enviar() }}
        placeholder="••••"
        autoFocus
        className={`w-full h-14 text-center text-[26px] tracking-[0.55em] rounded-[14px] border bg-slate-50/60 text-slate-900 focus:outline-none focus:bg-white focus:border-[#7170ff] focus:ring-[3px] focus:ring-[#7170ff]/15 transition ${error ? 'border-red-300' : 'border-slate-200'}`}
      />
      {error && <p className="text-[12.5px] text-red-600 font-semibold mt-2">{error}</p>}
      <button
        type="button"
        onClick={enviar}
        disabled={!pin.trim() || pending}
        className="mt-4 w-full h-12 rounded-[13px] inline-flex items-center justify-center gap-2 text-white font-bold text-[14.5px] disabled:opacity-45 transition-opacity"
        style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}
      >
        {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando…</> : 'Entrar'}
      </button>
      <p className="text-[11.5px] text-slate-400 mt-4">El acceso se mantiene por 12 horas en este dispositivo.</p>
    </div>
  )
}
