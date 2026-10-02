'use client'

/* Hub interno de reportes: tarjetas de las marcas que TIENEN reporte (con
   animación al cambiar), "Agregar marca" para cargar el primer mes de una
   nueva, el dashboard de la marca elegida y su panel de gestión. */

import { useEffect, useRef, useState } from 'react'
import { Plus, ChevronDown, Check } from 'lucide-react'
import { MarcaLogo } from '@/components/marca-logo'
import { ReporteMarcaView } from '@/components/reportes/reporte-marca-view'
import { EditorMes } from './editor-mes'
import { EditorDirecto } from './editor-directo'
import { labelMes, type MesReporte } from '@/lib/reportes/typhouse'

/* Marcas con reporte DIRECTO automático (Shopify + Facebook). */
const DIRECTO = new Set(['little-joe'])

export type ReporteHubItem = { slug: string; nombre: string; meses: MesReporte[] }
export type MarcaChip = { slug: string; nombre: string; emoji: string | null }

export function ReportesHub({ reportes, marcas }: { reportes: ReporteHubItem[]; marcas: MarcaChip[] }) {
  const [slug, setSlug] = useState(reportes[0]?.slug ?? marcas[0]?.slug ?? '')
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const cerrar = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [menu])

  const conData = new Set(reportes.map((r) => r.slug))
  const sinData = marcas.filter((m) => !conData.has(m.slug))
  const emoji = (s: string) => marcas.find((m) => m.slug === s)?.emoji ?? null
  const sel = reportes.find((r) => r.slug === slug) ?? null
  const nueva = !sel ? marcas.find((m) => m.slug === slug) ?? null : null
  const nombreSel = sel?.nombre ?? nueva?.nombre ?? slug

  return (
    <div className="space-y-6">
      <div className="flex gap-3 flex-wrap items-stretch">
        {reportes.map((r) => {
          const activa = r.slug === slug
          const ultimo = r.meses[r.meses.length - 1]?.mes
          return (
            <button key={r.slug} type="button" onClick={() => setSlug(r.slug)}
              className={`group relative flex items-center gap-3 pl-3 pr-5 py-3 rounded-[16px] border bg-white text-left transition-all duration-200 ${
                activa ? 'border-transparent shadow-[0_8px_24px_-10px_rgba(113,112,255,0.55)] -translate-y-0.5' : 'border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-sm'}`}
              style={activa ? { background: 'linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#7170ff,#ba41f7) border-box', border: '2px solid transparent' } : undefined}>
              <MarcaLogo slug={r.slug} nombre={r.nombre} emoji={emoji(r.slug)} size={40} />
              <span>
                <span className="block text-[14px] font-bold text-slate-900">{r.nombre}</span>
                <span className="block text-[12px] text-slate-500">{r.meses.length} meses{ultimo ? ` · hasta ${labelMes(ultimo)}` : ''}</span>
              </span>
              {activa && <span className="absolute top-2 right-2 w-4 h-4 rounded-full inline-flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}><Check className="w-2.5 h-2.5" strokeWidth={3.5} /></span>}
            </button>
          )
        })}
        {nueva && (
          <div className="flex items-center gap-3 pl-3 pr-5 py-3 rounded-[16px] bg-white" style={{ background: 'linear-gradient(#fff,#fff) padding-box, linear-gradient(135deg,#7170ff,#ba41f7) border-box', border: '2px solid transparent' }}>
            <MarcaLogo slug={nueva.slug} nombre={nueva.nombre} emoji={nueva.emoji} size={40} />
            <span>
              <span className="block text-[14px] font-bold text-slate-900">{nueva.nombre}</span>
              <span className="block text-[12px] text-slate-500">Nuevo reporte</span>
            </span>
          </div>
        )}
        {sinData.length > 0 && (
          <div className="relative" ref={menuRef}>
            <button type="button" onClick={() => setMenu((v) => !v)}
              className="h-full min-h-[66px] px-4 inline-flex items-center gap-2 rounded-[16px] border border-dashed border-slate-300 text-[13px] font-semibold text-slate-500 hover:text-slate-900 hover:border-slate-400 hover:bg-white transition-colors">
              <Plus className="w-4 h-4" /> Agregar marca <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menu ? 'rotate-180' : ''}`} />
            </button>
            {menu && (
              <div className="rep-pop absolute z-30 mt-2 w-[280px] max-h-[340px] overflow-auto rounded-[16px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.25)]">
                <div className="px-3 pt-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Crear primer reporte</div>
                {sinData.map((m) => (
                  <button key={m.slug} type="button" onClick={() => { setSlug(m.slug); setMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-left text-[13.5px] font-medium text-slate-700 hover:bg-slate-50">
                    <MarcaLogo slug={m.slug} nombre={m.nombre} emoji={m.emoji} size={26} />
                    <span className="truncate">{m.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div key={slug} className="space-y-6 rep-marca">
        {sel
          ? <ReporteMarcaView nombre={sel.nombre} meses={sel.meses} />
          : (
            <div className="rounded-[20px] border border-slate-200/80 bg-white p-10 text-center shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
              <div className="font-bold text-slate-900">{nombreSel} aún no tiene reporte</div>
              <div className="text-[13px] text-slate-500 mt-1">Cárgale su primer mes abajo y su reporte aparece al instante (también en su portal).</div>
            </div>
          )}
        {DIRECTO.has(slug)
          ? <EditorDirecto marcaSlug={slug} meses={sel?.meses ?? []} />
          : <EditorMes marcaSlug={slug} marcaNombre={nombreSel} meses={sel?.meses ?? []} />}
      </div>
      <style>{`
@keyframes repMarca{from{opacity:0;transform:translateY(14px) scale(.99)}to{opacity:1;transform:none}}
@keyframes repPop{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}
.rep-marca{animation:repMarca .5s cubic-bezier(.2,.7,.2,1) both}
.rep-pop{animation:repPop .18s ease-out both;transform-origin:top left}
@media (prefers-reduced-motion:reduce){.rep-marca,.rep-pop{animation:none}}`}</style>
    </div>
  )
}
