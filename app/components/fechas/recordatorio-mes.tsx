'use client'

// Recordatorio COLAPSABLE de las fechas importantes del mes. Se usa en el
// inicio y arriba del calendario de publicaciones. Colapsado por defecto (una
// sola línea) para no amontonar; se despliega y muestra la lista de lo que hay
// que coordinar este mes. Pedro 24-jul-2026.

import { useState } from 'react'
import Link from 'next/link'
import { Bell, ChevronDown, Star } from 'lucide-react'

export type RecordatorioItem = {
  id: string; dia: number; titulo: string
  marcaNombre: string; categoriaLabel: string; categoriaColor: string
}

export function RecordatorioMes({
  mes, total, marcas, esInicioMes, items,
  defaultOpen = false, onItemClick, verTodoHref,
}: {
  mes: string; total: number; marcas: string[]; esInicioMes: boolean
  items: RecordatorioItem[]; defaultOpen?: boolean
  onItemClick?: (id: string) => void; verTodoHref?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (total === 0) return null

  return (
    <div className="rounded-xl mb-2" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}>
      {/* Cabecera clickeable — resumen en una línea */}
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 p-3.5 text-left">
        <Bell className="w-5 h-5 shrink-0" style={{ color: '#f59e0b' }} />
        <div className="flex-1 min-w-0 text-[13.5px]" style={{ color: '#78350f' }}>
          <strong>{esInicioMes ? `Empieza ${mes} 🗓️` : `Fechas importantes de ${mes}`}</strong>{' — '}
          {total} {total === 1 ? 'cosa por coordinar' : 'cosas por coordinar'} con{' '}
          {marcas.slice(0, 4).join(', ')}{marcas.length > 4 ? ` y ${marcas.length - 4} más` : ''}.
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: '#b45309' }} />
      </button>

      {/* Cuerpo desplegable — lista de lo que viene este mes */}
      {open && (
        <div className="px-3.5 pb-3 space-y-1.5">
          {items.map((it) => {
            const Row = onItemClick ? 'button' : 'div'
            return (
              <Row key={it.id}
                onClick={onItemClick ? () => onItemClick(it.id) : undefined}
                className={`w-full text-left flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 ${onItemClick ? 'hover:brightness-95 transition' : ''}`}
                style={{ background: 'rgba(255,255,255,0.55)', borderLeft: `4px solid ${it.categoriaColor}` }}>
                <div className="w-7 text-center shrink-0">
                  <div className="text-[15px] font-extrabold leading-none" style={{ color: '#78350f' }}>{it.dia}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-bold truncate flex items-center gap-1" style={{ color: '#78350f' }}>
                    <Star className="w-3 h-3 shrink-0" style={{ color: it.categoriaColor }} fill={it.categoriaColor} /> {it.titulo}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold" style={{ color: it.categoriaColor }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: it.categoriaColor }} /> {it.categoriaLabel}
                    </span>
                    <span className="text-[10.5px]" style={{ color: '#b45309' }}>· {it.marcaNombre}</span>
                  </div>
                </div>
              </Row>
            )
          })}
          {total > items.length && (
            <div className="text-[11.5px] font-semibold pl-1" style={{ color: '#b45309' }}>
              +{total - items.length} más este mes
            </div>
          )}
          {verTodoHref && (
            <Link href={verTodoHref} className="inline-block mt-1 text-[12.5px] font-bold no-underline" style={{ color: '#b45309' }}>
              Ver todo el calendario →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
