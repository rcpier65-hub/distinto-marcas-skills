'use client'

/* Hub interno de reportes: selector de marca arriba (el dueño ve TODAS las
   marcas — las que aún no tienen reporte salen deshabilitadas "sin datos"),
   y debajo el dashboard de la marca elegida. */

import { useState } from 'react'
import { MarcaLogo } from '@/components/marca-logo'
import { ReporteMarcaView } from '@/components/reportes/reporte-marca-view'
import type { MesReporte } from '@/lib/reportes/typhouse'

export type ReporteHubItem = { slug: string; nombre: string; meses: MesReporte[] }
export type MarcaChip = { slug: string; nombre: string; emoji: string | null }

export function ReportesHub({ reportes, marcas }: { reportes: ReporteHubItem[]; marcas: MarcaChip[] }) {
  const [slug, setSlug] = useState(reportes[0]?.slug ?? '')
  const sel = reportes.find((r) => r.slug === slug) ?? null
  const conData = new Set(reportes.map((r) => r.slug))

  /* Marcas con reporte primero, luego el resto (deshabilitadas). */
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
              onClick={() => tiene && setSlug(m.slug)}
              disabled={!tiene}
              title={tiene ? `Ver reporte de ${m.nombre}` : 'Aún sin reporte — se agrega cuando haya data'}
              className={`inline-flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full border text-xs font-semibold transition-colors ${
                activa ? 'bg-primary text-primary-foreground border-primary' : tiene ? 'bg-background hover:bg-muted' : 'opacity-40 cursor-not-allowed bg-background'
              }`}
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
        : <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">Aún no hay reportes cargados.</div>}
    </div>
  )
}
