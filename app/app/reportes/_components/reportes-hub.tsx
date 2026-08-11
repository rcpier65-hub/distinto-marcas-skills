'use client'

/* Hub interno de reportes: selector de marca (el dueño ve TODAS — a las que
   aún no tienen reporte se les puede cargar su primer mes acá mismo), el
   dashboard de la marca elegida y el formulario Agregar/editar mes. */

import { useState } from 'react'
import { MarcaLogo } from '@/components/marca-logo'
import { ReporteMarcaView } from '@/components/reportes/reporte-marca-view'
import { EditorMes } from './editor-mes'
import type { MesReporte } from '@/lib/reportes/typhouse'

export type ReporteHubItem = { slug: string; nombre: string; meses: MesReporte[] }
export type MarcaChip = { slug: string; nombre: string; emoji: string | null }

export function ReportesHub({ reportes, marcas }: { reportes: ReporteHubItem[]; marcas: MarcaChip[] }) {
  const conData = new Set(reportes.map((r) => r.slug))
  const [slug, setSlug] = useState(reportes[0]?.slug ?? marcas[0]?.slug ?? '')

  const marcaSel = marcas.find((m) => m.slug === slug)
  const sel = reportes.find((r) => r.slug === slug) ?? null
  const nombreSel = sel?.nombre ?? marcaSel?.nombre ?? slug

  /* Marcas con reporte primero, luego el resto. */
  const orden = [...marcas].sort((a, b) => Number(conData.has(b.slug)) - Number(conData.has(a.slug)) || a.nombre.localeCompare(b.nombre))

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {orden.map((m) => {
          const tiene = conData.has(m.slug)
          const activa = m.slug === slug
          return (
            <button
              key={m.slug}
              onClick={() => setSlug(m.slug)}
              title={tiene ? `Ver reporte de ${m.nombre}` : `Sin reporte aún — cárgale su primer mes`}
              className={`inline-flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full border text-xs font-semibold transition-colors ${
                activa ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
              } ${tiene ? '' : 'opacity-60'}`}
            >
              <MarcaLogo slug={m.slug} nombre={m.nombre} emoji={m.emoji} size={24} />
              {m.nombre}
              {!tiene && <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">sin datos</span>}
            </button>
          )
        })}
      </div>

      {sel
        ? <ReporteMarcaView nombre={sel.nombre} meses={sel.meses} />
        : (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <div className="text-3xl mb-2">📭</div>
            <div className="font-bold">{nombreSel} aún no tiene reporte</div>
            <div className="text-xs text-muted-foreground mt-1">Cárgale su primer mes con el formulario de abajo y su dashboard aparece al instante (también en su portal de cliente).</div>
          </div>
        )}

      {/* Cargar/editar data — el "Excel" ahora vive acá */}
      <EditorMes marcaSlug={slug} marcaNombre={nombreSel} meses={sel?.meses ?? []} />
    </div>
  )
}
