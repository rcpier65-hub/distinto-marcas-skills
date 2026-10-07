'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { crearRecordatorio, marcarRecordatorio, type Recordatorio } from './_actions'

export function RecordatoriosView({ items }: { items: Recordatorio[] }) {
  const [texto, setTexto] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()
  function refrescar() { router.refresh(); window.dispatchEvent(new Event('distinto-recordatorios')) }
  return <main className="mx-auto max-w-2xl p-6 space-y-5">
    <header><h1 className="text-2xl font-bold">Recordatorios</h1><p className="text-sm text-muted-foreground">Tus pendientes personales quedan anclados en la app hasta que marques Listo.</p></header>
    <form onSubmit={e => { e.preventDefault(); start(async () => { const r = await crearRecordatorio(texto); if (!r.ok) { toast.error(r.error); return } setTexto(''); refrescar() }) }} className="flex gap-2">
      <input aria-label="Nuevo recordatorio" maxLength={500} value={texto} onChange={e => setTexto(e.target.value)} className="flex-1 min-w-0 rounded-xl border p-3" placeholder="¿Qué necesitas recordar?" />
      <button disabled={pending || !texto.trim()} className="rounded-xl bg-purple-600 px-4 text-white disabled:opacity-50">Añadir</button>
    </form>
    {[false, true].map(listo => <section key={String(listo)} className="space-y-2"><h2 className="font-semibold">{listo ? 'Listos' : 'Por recordar'}</h2>
      {items.filter(i => i.listo === listo).map(i => <label key={i.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
        <input type="checkbox" checked={i.listo} disabled={pending} onChange={e => { const v = e.target.checked; start(async () => { const r = await marcarRecordatorio(i.id, v); if (!r.ok) toast.error(r.error); else refrescar() }) }} className="mt-1" />
        <span className={listo ? 'line-through text-muted-foreground' : ''}>{i.texto}</span>
      </label>)}
      {!items.some(i => i.listo === listo) && <p className="text-sm text-muted-foreground">{listo ? 'Todavía no hay recordatorios listos.' : 'No tienes recordatorios pendientes.'}</p>}
    </section>)}
  </main>
}
