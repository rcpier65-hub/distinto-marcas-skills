'use client'
/* Publicidad en Reportes (Pedro 21-oct-2026): historial mes a mes de la pauta
   de cada marca — presupuesto, inversión, resultados y eficiencia. Usa la
   misma tabla que el panel de Publicidad del espacio de marca, así el
   presupuesto se define una vez y se ve en los dos lados. */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Megaphone, Pencil, RefreshCw } from 'lucide-react'
import { RESULTADOS } from '@/lib/pauta/model'
import type { MesPauta } from '@/lib/pauta/historial'
import { labelMes } from '@/lib/reportes/typhouse'
import { actualizarPautaReportes, guardarPresupuestoPauta } from '@/app/reportes/_actions'

type Res = { ok: true } | { ok: false; error: string }
/* Por defecto usa las acciones del módulo Reportes (con código). Dentro del
   espacio de marca se le pasan acciones que van por la API de la marca. */
export function PautaHistorial({ slug, meses, mesActual, onActualizar, onPresupuesto }: {
  slug: string; meses: MesPauta[]; mesActual: string
  onActualizar?: () => Promise<Res>; onPresupuesto?: (mes: string, monto: number | null) => Promise<Res>
}) {
  const router = useRouter()
  const [pend, start] = useTransition()
  const [editando, setEditando] = useState<string | null>(null)
  const [valor, setValor] = useState('')

  const filas = [...meses]
  if (!filas.some((m) => m.mes === mesActual)) filas.push({ mes: mesActual, presupuesto: null, moneda: null, resultado: null, metricas: null, metricasAt: null })
  filas.sort((a, b) => b.mes.localeCompare(a.mes))
  const moneda = filas.find((m) => m.moneda)?.moneda ?? 'USD'
  const din = (v: number | null | undefined, dec = 2) => v == null ? '—' : new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda, maximumFractionDigits: dec }).format(v)
  const ent = (v: number | null | undefined) => v == null ? '—' : new Intl.NumberFormat('es-PE').format(Math.round(v))
  const resultado = RESULTADOS[(filas.find((m) => m.resultado)?.resultado ?? 'mensajes') as keyof typeof RESULTADOS]
  const ultima = filas.map((m) => m.metricasAt).filter(Boolean).sort().pop()
  const grafico = [...filas].reverse().slice(-12)
  const tope = Math.max(1, ...grafico.map((m) => Math.max(m.metricas?.gasto ?? 0, m.presupuesto ?? 0)))

  const actualizar = () => start(async () => {
    const r = await (onActualizar ? onActualizar() : actualizarPautaReportes(slug))
    if (!r.ok) { toast.error(r.error); return }
    toast.success('Historial de publicidad actualizado'); router.refresh()
  })
  const guardar = (mes: string) => start(async () => {
    const t = valor.trim().replace(',', '.')
    const monto = t === '' ? null : Number(t)
    const r = await (onPresupuesto ? onPresupuesto(mes, monto) : guardarPresupuestoPauta(slug, mes, monto))
    if (!r.ok) { toast.error(r.error); return }
    setEditando(null); toast.success('Presupuesto guardado'); router.refresh()
  })

  return (
    <section className="rounded-[20px] border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start gap-3 mb-5">
        <span className="w-10 h-10 rounded-[12px] inline-flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}><Megaphone className="w-5 h-5" /></span>
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-[18px] font-bold text-slate-900 leading-tight">Publicidad · historial mensual</h2>
          <p className="text-[12.5px] text-slate-500">Presupuesto, inversión y resultados en Meta Ads, mes a mes.{ultima ? ` Datos de Meta al ${new Date(ultima).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}.` : ''}</p>
        </div>
        <button type="button" onClick={actualizar} disabled={pend}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-[12px] text-[13px] font-semibold text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
          <RefreshCw className={`w-4 h-4 ${pend ? 'animate-spin' : ''}`} /> Actualizar desde Meta
        </button>
      </div>

      {grafico.some((m) => m.metricas?.gasto || m.presupuesto) && (
        <div className="mb-5">
          <div className="flex items-end gap-2 h-[150px] px-1" role="img" aria-label="Inversión y presupuesto por mes">
            {grafico.map((m) => {
              const g = m.metricas?.gasto ?? 0, p = m.presupuesto ?? 0
              return (
                <div key={m.mes} className="flex-1 min-w-0 flex flex-col items-center gap-1 h-full justify-end" title={`${labelMes(m.mes)}: ${din(g)}${p ? ` de ${din(p, 0)}` : ''}`}>
                  <div className="relative w-full max-w-[38px] flex-1 flex items-end">
                    <div className="w-full rounded-t-[7px]" style={{ height: `${(g / tope) * 100}%`, minHeight: g ? 3 : 0, background: p && g > p * 1.05 ? 'linear-gradient(180deg,#f59e0b,#dc2626)' : 'linear-gradient(180deg,#ba41f7,#7170ff)' }} />
                    {p > 0 && <div className="absolute left-[-3px] right-[-3px] border-t-2 border-dashed border-slate-700" style={{ bottom: `${(p / tope) * 100}%` }} />}
                  </div>
                  <span className="text-[10.5px] text-slate-500 truncate w-full text-center">{labelMes(m.mes).slice(0, 3)}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[3px]" style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }} /> Inversión</span><span className="inline-flex items-center gap-1.5"><i className="w-4 border-t-2 border-dashed border-slate-700" /> Presupuesto</span></div>
        </div>
      )}

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[13px] min-w-[760px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="py-2 px-2 font-semibold">Mes</th>
              <th className="py-2 px-2 font-semibold">Presupuesto</th>
              <th className="py-2 px-2 font-semibold">Inversión</th>
              <th className="py-2 px-2 font-semibold">Uso</th>
              <th className="py-2 px-2 font-semibold">{resultado.etiqueta}</th>
              <th className="py-2 px-2 font-semibold">Costo por {resultado.singular}</th>
              <th className="py-2 px-2 font-semibold">CTR</th>
              <th className="py-2 px-2 font-semibold">CPM</th>
              <th className="py-2 px-2 font-semibold">Alcance</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((m) => {
              const x = m.metricas
              const uso = x?.gasto != null && m.presupuesto ? x.gasto / m.presupuesto : null
              return (
                <tr key={m.mes} className="border-t border-slate-100">
                  <td className="py-2.5 px-2 font-semibold text-slate-900 whitespace-nowrap">{labelMes(m.mes)}{m.mes === mesActual && <span className="ml-1.5 text-[10.5px] font-semibold text-violet-600">en curso</span>}</td>
                  <td className="py-2.5 px-2 whitespace-nowrap">
                    {editando === m.mes ? (
                      <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); guardar(m.mes) }}>
                        <input autoFocus type="number" min="0" step="0.01" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className="w-24 h-8 px-2 rounded-[8px] border border-slate-300 text-[13px]" aria-label={`Presupuesto de ${labelMes(m.mes)}`} />
                        <button type="submit" disabled={pend} className="h-8 px-2.5 rounded-[8px] text-[12px] font-semibold text-white bg-violet-600">OK</button>
                        <button type="button" onClick={() => setEditando(null)} className="h-8 px-2 rounded-[8px] text-[12px] text-slate-500">×</button>
                      </form>
                    ) : (
                      <button type="button" onClick={() => { setEditando(m.mes); setValor(m.presupuesto?.toString() ?? '') }} className="inline-flex items-center gap-1.5 text-slate-700 hover:text-violet-700" title="Editar presupuesto">
                        {m.presupuesto != null ? din(m.presupuesto, 0) : <span className="text-slate-400">Definir</span>} <Pencil className="w-3 h-3 opacity-50" />
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-2 font-semibold text-slate-900">{din(x?.gasto)}</td>
                  <td className={`py-2.5 px-2 ${uso != null && uso > 1.05 ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>{uso == null ? '—' : `${Math.round(uso * 100)}%`}</td>
                  <td className="py-2.5 px-2">{ent(x?.resultados)}</td>
                  <td className="py-2.5 px-2">{din(x?.costoResultado)}</td>
                  <td className="py-2.5 px-2">{x?.ctr == null ? '—' : `${x.ctr.toFixed(2)}%`}</td>
                  <td className="py-2.5 px-2">{din(x?.cpm)}</td>
                  <td className="py-2.5 px-2">{ent(x?.alcance)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!meses.some((m) => m.metricas) && <p className="mt-3 text-[12.5px] text-slate-500">Toca «Actualizar desde Meta» para traer los últimos 12 meses. La marca necesita su cuenta publicitaria asignada en Métricas.</p>}
    </section>
  )
}
