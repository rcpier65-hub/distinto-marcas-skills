'use client'

/* Configuración de Rendimiento: horario y costo por hora de cada persona
   (para la carga) y pago mensual de cada marca (para la rentabilidad). */

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Users, Building2, Loader2, Check } from 'lucide-react'
import { guardarConfigRendimiento } from '../_actions'

type M = { id: string; nombre: string; rol: string | null; horasDia: number; diasLaborales: number[]; costoHora: number | null }
type B = { slug: string; nombre: string; color: string; fee: number | null }
const DIAS = [[1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [7, 'D']] as const
const campo = 'h-10 px-3 text-sm bg-white text-slate-900 border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#7170ff] focus:ring-[3px] focus:ring-[#7170ff]/15 transition'

export function ConfigRendimiento({ miembros: m0, marcas: b0 }: { miembros: M[]; marcas: B[] }) {
  const router = useRouter()
  const [miembros, setMiembros] = useState(m0)
  const [marcas, setMarcas] = useState(b0)
  const [guardando, setGuardando] = useState(false)
  const editM = (id: string, p: Partial<M>) => setMiembros((cur) => cur.map((m) => (m.id === id ? { ...m, ...p } : m)))

  async function guardar() {
    setGuardando(true)
    const r = await guardarConfigRendimiento({
      miembros: miembros.map((m) => ({ id: m.id, horasDia: m.horasDia, diasLaborales: m.diasLaborales, costoHora: m.costoHora })),
      marcas: marcas.map((b) => ({ slug: b.slug, fee: b.fee })),
    })
    setGuardando(false)
    if (!r.ok) { toast.error(r.error); return }
    toast.success('Configuración guardada')
    router.push('/rendimiento')
  }

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6 space-y-5 pb-28">
      <header className="flex items-center gap-3">
        <Link href="/rendimiento" aria-label="Volver" className="w-9 h-9 inline-flex items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configuración de rendimiento</h1>
          <p className="text-[13px] text-slate-500">Horario del equipo, costo por hora y pago de cada marca</p>
        </div>
      </header>

      <section className="rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <h2 className="flex items-center gap-2.5 text-[15px] font-bold text-slate-900 mb-1">
          <span className="w-8 h-8 rounded-[9px] inline-flex items-center justify-center" style={{ background: '#7170ff14', color: '#7170ff' }}><Users className="w-4 h-4" /></span>
          Equipo
        </h2>
        <p className="text-[12.5px] text-slate-500 mb-4">Las horas disponibles salen de los días y horas de cada persona. El costo por hora es opcional y sirve para calcular la rentabilidad por marca.</p>
        <div className="grid gap-2">
          {miembros.map((m) => (
            <div key={m.id} className="flex items-center gap-3 flex-wrap py-2.5 border-b border-slate-100 last:border-0">
              <span className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[13px] font-bold shrink-0" style={{ background: '#ede9fe', color: '#7170ff' }}>{m.nombre.charAt(0).toUpperCase()}</span>
              <div className="w-36 min-w-0">
                <div className="text-[14px] font-semibold text-slate-900 truncate">{m.nombre}</div>
                <div className="text-[11.5px] text-slate-500 capitalize">{(m.rol ?? '').replace('_', ' ')}</div>
              </div>
              <div className="inline-flex gap-1">
                {DIAS.map(([d, l]) => {
                  const on = m.diasLaborales.includes(d)
                  return (
                    <button key={d} type="button" onClick={() => editM(m.id, { diasLaborales: on ? m.diasLaborales.filter((x) => x !== d) : [...m.diasLaborales, d] })}
                      className={`w-8 h-8 rounded-[8px] text-[12px] font-bold border transition-colors ${on ? 'bg-[#7170ff] text-white border-[#7170ff]' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700'}`}>{l}</button>
                  )
                })}
              </div>
              <label className="inline-flex items-center gap-2 text-[12.5px] text-slate-500">
                <input type="number" min={0} max={16} step={0.5} value={m.horasDia} onChange={(e) => editM(m.id, { horasDia: Number(e.target.value) })} className={`${campo} w-20`} /> h/día
              </label>
              <label className="inline-flex items-center gap-2 text-[12.5px] text-slate-500">
                S/ <input type="number" min={0} step={1} value={m.costoHora ?? ''} placeholder="—" onChange={(e) => editM(m.id, { costoHora: e.target.value === '' ? null : Number(e.target.value) })} className={`${campo} w-24`} /> /hora
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <h2 className="flex items-center gap-2.5 text-[15px] font-bold text-slate-900 mb-1">
          <span className="w-8 h-8 rounded-[9px] inline-flex items-center justify-center" style={{ background: '#10b98114', color: '#10b981' }}><Building2 className="w-4 h-4" /></span>
          Pago mensual por marca
        </h2>
        <p className="text-[12.5px] text-slate-500 mb-4">Opcional. Si lo llenas, en Rendimiento → Marcas → Mes verás cuánto te deja cada marca frente a las horas invertidas.</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {marcas.map((b) => (
            <label key={b.slug} className="flex items-center gap-2.5 p-2.5 rounded-[12px] border border-slate-100">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.color }} />
              <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-slate-800 truncate">{b.nombre}</span>
              <span className="text-[12.5px] text-slate-400">S/</span>
              <input type="number" min={0} step={10} value={b.fee ?? ''} placeholder="—"
                onChange={(e) => setMarcas((cur) => cur.map((x) => (x.slug === b.slug ? { ...x, fee: e.target.value === '' ? null : Number(e.target.value) } : x)))}
                className={`${campo} w-28`} />
            </label>
          ))}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 px-6 py-3 bg-white/95 backdrop-blur border-t border-slate-200 flex justify-end gap-2 z-30">
        <Link href="/rendimiento" className="h-10 px-4 inline-flex items-center rounded-[11px] border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</Link>
        <button type="button" onClick={() => void guardar()} disabled={guardando}
          className="h-10 px-5 inline-flex items-center gap-2 rounded-[11px] text-sm font-bold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />} Guardar
        </button>
      </div>
    </main>
  )
}
