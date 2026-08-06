'use client'

// Popup con TODA la info de una fecha importante. Se abre al hacer click en un
// chip del calendario (idea de Pedro 24-jul-2026). Muestra marca, categoría,
// título, fecha larga y nota; y un botón Eliminar si el usuario puede.

import { useTransition } from 'react'
import { X, Trash2 } from 'lucide-react'
import { categoriaInfo } from '@/lib/fechas/categorias'

export type FechaDetalle = {
  id: string; titulo: string; fecha: string; nota: string | null
  categoria: string; marcaNombre: string; marcaColor: string
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function fechaLarga(f: string) {
  const [y, m, d] = f.split('-').map(Number)
  return `${DIAS[new Date(y, m - 1, d).getDay()]} ${d} de ${MESES[m - 1]} de ${y}`
}

export function FechaDetalleModal({ fecha, onClose, onDelete }: {
  fecha: FechaDetalle; onClose: () => void; onDelete?: (id: string) => void
}) {
  const [borrando, start] = useTransition()
  const cat = categoriaInfo(fecha.categoria)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(15,23,42,0.55)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${fecha.marcaColor}1f`, color: fecha.marcaColor }}>
                <span className="w-2 h-2 rounded-full" style={{ background: fecha.marcaColor }} /> {fecha.marcaNombre}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${cat.color}1f`, color: cat.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} /> {cat.label}
              </span>
            </div>
            <div className="text-[17px] font-extrabold leading-tight">{fecha.titulo}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">{fechaLarga(fecha.fecha)}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted shrink-0"><X className="w-4 h-4" /></button>
        </div>
        {fecha.nota && <p className="text-[13.5px] text-muted-foreground mb-3 whitespace-pre-wrap">{fecha.nota}</p>}
        {onDelete && (
          <button
            onClick={() => { if (!confirm('¿Eliminar esta fecha?')) return; start(() => { onDelete(fecha.id); onClose() }) }}
            disabled={borrando}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-bold text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        )}
      </div>
    </div>
  )
}
