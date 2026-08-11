'use client'

/* Sección "Reporte mensual" del portal del cliente. Muestra SOLO el reporte
   de SU marca, protegido por el mismo código de los reportes (cookie 12h).
   Si `meses` viene null el server no desbloqueó → se muestra el candado. */

import { useState } from 'react'
import { PinGate } from '@/components/reportes/pin-gate'
import { ReporteMarcaView } from '@/components/reportes/reporte-marca-view'
import type { MesReporte } from '@/lib/reportes/typhouse'

export function ReporteClienteSection({ nombre, meses }: { nombre: string; meses: MesReporte[] | null }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <section className="max-w-5xl mx-auto px-4 pb-12">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center gap-3 rounded-2xl border bg-card p-4 hover:bg-muted/40 transition-colors text-left"
      >
        <span className="text-2xl">📊</span>
        <span className="flex-1 min-w-0">
          <span className="block font-extrabold tracking-tight">Reporte mensual</span>
          <span className="block text-xs text-muted-foreground">Embudo de ventas, inversión y resultados de {nombre} · privado (requiere código)</span>
        </span>
        <span className="text-muted-foreground">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="mt-4">
          {meses
            ? <ReporteMarcaView nombre={nombre} meses={meses} />
            : <PinGate titulo="Reporte mensual" />}
        </div>
      )}
    </section>
  )
}
