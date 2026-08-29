'use client'

/* Botón "Reporte de la semana" — genera el reporte agrupado por día (lunes → hoy)
   y lo muestra en una ventana para revisarlo y copiarlo a WhatsApp. Erick lo
   pidió para mandar toda su semana de una. Pedro 26-ago-2026. */

import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarRange, Copy, X, Loader2, Check } from 'lucide-react'
import { generarReporteSemana, type ReporteSemana } from '../_reporte-semana-actions'

export function ReporteSemanaButton() {
  const [cargando, setCargando] = useState(false)
  const [data, setData] = useState<Extract<ReporteSemana, { ok: true }> | null>(null)
  const [copiado, setCopiado] = useState(false)

  async function abrir() {
    if (cargando) return
    setCargando(true)
    const r = await generarReporteSemana()
    setCargando(false)
    if (r.ok) setData(r)
    else toast.error(r.error)
  }

  async function copiar() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.texto)
      setCopiado(true); setTimeout(() => setCopiado(false), 2000)
      toast.success('Reporte semanal copiado — pégalo en el grupo')
    } catch { toast.error('No se pudo copiar') }
  }

  return (
    <>
      <button type="button" onClick={abrir} disabled={cargando}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl font-semibold border transition-colors hover:bg-muted disabled:opacity-60"
        style={{ fontSize: 14, padding: '11px 16px', borderColor: '#7170ff', color: '#7170ff', background: '#fff' }}>
        {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />}
        {cargando ? 'Armando la semana…' : '📆 Reporte de la semana'}
      </button>

      {data && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }} onClick={() => setData(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2.5 p-4 border-b shrink-0">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0" style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
                <CalendarRange className="w-5 h-5 text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold leading-tight">Reporte de la semana</div>
                <div className="text-[12px] text-muted-foreground">{data.usuarioNombre} · {data.rangoLabel}</div>
              </div>
              <button onClick={() => setData(null)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            {/* Cuerpo: días */}
            <div className="overflow-y-auto p-4 flex flex-col gap-3">
              {data.dias.every((d) => d.vacio) ? (
                <p className="text-center text-[13px] text-muted-foreground py-6">Sin actividad registrada en la semana.</p>
              ) : data.dias.filter((d) => !d.vacio).map((d) => (
                <div key={d.fechaIso} className="rounded-xl border p-3" style={{ borderColor: 'rgba(113,112,255,0.2)' }}>
                  <div className="text-[13.5px] font-bold capitalize mb-1.5" style={{ color: '#6d28d9' }}>📅 {d.fechaLabel}</div>
                  <ul className="space-y-1">
                    {d.items.map((it, i) => (
                      <li key={i} className="text-[13.5px] leading-snug">{it.replace(/[*_]/g, '')}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Footer: copiar */}
            <div className="p-4 border-t shrink-0 flex items-center gap-2">
              <button onClick={copiar}
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-white text-[14px]"
                style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copiado ? 'Copiado ✓' : 'Copiar para WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
