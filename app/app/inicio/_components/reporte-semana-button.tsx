'use client'

/* Botón "Reporte de la semana" — genera el reporte agrupado por día (lunes → hoy)
   y lo muestra en una ventana para revisarlo y copiarlo a WhatsApp. Erick lo
   pidió para mandar toda su semana de una. Pedro 26-ago-2026.

   29-ago-2026: flechas ◀ ▶ para moverse entre semanas. Erick marca sus tareas
   en el día real que las hizo, así que a veces su trabajo está en la semana
   PASADA — con las flechas puede rendir cuenta de cualquier semana, no solo la
   actual. Cada semana previa se muestra completa (lunes→domingo); la semana en
   curso llega hasta hoy. */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { CalendarRange, Copy, X, Loader2, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { generarReporteSemana, type ReporteSemana } from '../_reporte-semana-actions'

/* Fecha de HOY en Lima (YYYY-MM-DD), estable en cualquier runtime. */
function hoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
/* Lunes (a mediodía UTC) de la semana desplazada `offset` semanas respecto a hoy.
   offset 0 = esta semana, -1 = semana pasada, etc. Mediodía UTC evita el bug de
   "restar un día" al formatear en Lima. */
function lunesConOffset(offset: number): Date {
  const [y, m, d] = hoyLima().split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d, 12))
  const desdeLunes = (base.getUTCDay() + 6) % 7 // días desde el lunes (dom=6)
  base.setUTCDate(base.getUTCDate() - desdeLunes + offset * 7)
  return base
}
function isoDe(dt: Date): string { return dt.toISOString().slice(0, 10) }
/* Rango {desde, hasta} de la semana con `offset`. La actual llega hasta hoy;
   las pasadas van lunes→domingo completo. */
function rangoSemana(offset: number): { desde: string; hasta: string } {
  const lunes = lunesConOffset(offset)
  const desde = isoDe(lunes)
  if (offset === 0) return { desde, hasta: hoyLima() }
  const domingo = new Date(lunes); domingo.setUTCDate(domingo.getUTCDate() + 6)
  return { desde, hasta: isoDe(domingo) }
}
function tituloSemana(offset: number): string {
  if (offset === 0) return 'Esta semana'
  if (offset === -1) return 'Semana pasada'
  return `Hace ${-offset} semanas`
}

/* onReady: callback opcional para reusar el modal desde otro lugar (ej. el
   reporte diario vacío llama a abrir() y muestra este mismo botón). */
export function ReporteSemanaButton({ variant = 'default' }: { variant?: 'default' | 'link' }) {
  const [cargando, setCargando] = useState(false)
  const [data, setData] = useState<Extract<ReporteSemana, { ok: true }> | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [offset, setOffset] = useState(0) // 0 = esta semana

  const cargarSemana = useCallback(async (off: number) => {
    setCargando(true)
    const { desde, hasta } = rangoSemana(off)
    const r = await generarReporteSemana(desde, hasta)
    setCargando(false)
    if (r.ok) { setData(r); setOffset(off) }
    else toast.error(r.error)
  }, [])

  async function abrir() {
    if (cargando) return
    await cargarSemana(0)
  }

  async function copiar() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.texto)
      setCopiado(true); setTimeout(() => setCopiado(false), 2000)
      toast.success('Reporte semanal copiado — pégalo en el grupo')
    } catch { toast.error('No se pudo copiar') }
  }

  const btnClass = variant === 'link'
    ? 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors hover:bg-muted disabled:opacity-60'
    : 'w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl font-semibold border transition-colors hover:bg-muted disabled:opacity-60'

  return (
    <>
      <button type="button" onClick={abrir} disabled={cargando}
        className={btnClass}
        style={{ fontSize: 14, padding: '11px 16px', borderColor: '#7170ff', color: '#7170ff', background: variant === 'link' ? 'transparent' : '#fff', ...(variant === 'link' ? { border: '1.5px solid #7170ff' } : {}) }}>
        {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarRange className="w-4 h-4" />}
        {cargando ? 'Armando la semana…' : '📆 Reporte de la semana'}
      </button>

      {/* z alto (1200) para quedar por ENCIMA del modal del reporte diario
          (zIndex 1000) cuando el semanal se abre desde ahí. Pedro 29-ago-2026. */}
      {data && (
        <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-0 sm:p-4"
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

            {/* Navegación de semanas ◀ [Esta semana] ▶ */}
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b shrink-0" style={{ background: 'rgba(113,112,255,0.05)' }}>
              <button onClick={() => cargarSemana(offset - 1)} disabled={cargando}
                className="inline-flex items-center gap-1 text-[13px] font-semibold rounded-lg px-2.5 py-1.5 hover:bg-muted disabled:opacity-40" style={{ color: '#6d28d9' }}>
                <ChevronLeft className="w-4 h-4" /> Anterior
              </button>
              <span className="text-[13px] font-bold capitalize" style={{ color: '#5b21b6' }}>
                {cargando ? '…' : tituloSemana(offset)}
              </span>
              <button onClick={() => cargarSemana(offset + 1)} disabled={cargando || offset >= 0}
                className="inline-flex items-center gap-1 text-[13px] font-semibold rounded-lg px-2.5 py-1.5 hover:bg-muted disabled:opacity-40" style={{ color: '#6d28d9' }}>
                Siguiente <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo: días */}
            <div className="overflow-y-auto p-4 flex flex-col gap-3">
              {data.dias.every((d) => d.vacio) ? (
                <p className="text-center text-[13px] text-muted-foreground py-6">
                  Sin actividad registrada en {tituloSemana(offset).toLowerCase()}.<br />
                  <span className="text-[12px]">Usa ◀ Anterior para ver otra semana.</span>
                </p>
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
