'use client'

/* Sección Reporte del portal: formulario para cargar data cruda + dashboard. */
import { EditorMesCliente } from './editor-mes-cliente'
import { ReporteMarcaView } from '@/components/reportes/reporte-marca-view'
import type { MesReporte } from '@/lib/reportes/typhouse'

export function ReportePortalSection({
  nombre,
  marcaNombre,
  meses,
}: {
  nombre: string
  marcaNombre: string
  meses: MesReporte[]
}) {
  return (
    <div className="space-y-4">
      <EditorMesCliente marcaNombre={nombre || marcaNombre} meses={meses} />
      <ReporteMarcaView nombre={nombre} meses={meses} />
    </div>
  )
}
