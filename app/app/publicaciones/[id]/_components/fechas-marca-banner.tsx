'use client'

// Banner compacto de FECHAS IMPORTANTES de la marca, visible dentro del
// editor de video. Idea de Lorena (23-jul-2026): el editor ve, mientras
// edita, las fechas clave de la marca para no perder el contexto de campaña.
// Colapsable para no estorbar. Solo lectura (gestionar = /fechas-importantes).

import { useState } from 'react'
import { CalendarDays, ChevronDown } from 'lucide-react'
import { categoriaInfo } from '@/lib/fechas/categorias'

export type FechaMarca = { id: string; titulo: string; fecha: string; nota: string | null; categoria: string }

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Días entre hoy (Lima) y la fecha — para "en X días" / "hoy" / "mañana".
function diasHasta(fecha: string, hoyISO: string): number {
  const [y1, m1, d1] = hoyISO.split('-').map(Number)
  const [y2, m2, d2] = fecha.split('-').map(Number)
  const a = Date.UTC(y1, m1 - 1, d1)
  const b = Date.UTC(y2, m2 - 1, d2)
  return Math.round((b - a) / 86400000)
}

function etiquetaDias(n: number): string {
  if (n === 0) return 'hoy'
  if (n === 1) return 'mañana'
  if (n < 30) return `en ${n} días`
  const meses = Math.round(n / 30)
  return meses <= 1 ? 'en ~1 mes' : `en ~${meses} meses`
}

export function FechasMarcaBanner({ fechas, marcaNombre, marcaColor }: {
  fechas: FechaMarca[]; marcaNombre: string; marcaColor: string
}) {
  const [abierto, setAbierto] = useState(false)
  if (fechas.length === 0) return null

  const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const proxima = fechas[0]
  const dProx = diasHasta(proxima.fecha, hoyISO)

  return (
    <div className="mb-4 rounded-xl border overflow-hidden" style={{ borderColor: `${marcaColor}44`, background: `${marcaColor}0c` }}>
      <button onClick={() => setAbierto((v) => !v)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white shrink-0" style={{ background: marcaColor }}>
          <CalendarDays className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold leading-tight" style={{ color: marcaColor }}>
            Fechas importantes de {marcaNombre}
          </div>
          <div className="text-[11.5px] text-muted-foreground truncate">
            Próxima: <strong>{proxima.titulo}</strong> · {etiquetaDias(dProx)}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="px-3.5 pb-3 pt-0.5 space-y-1.5">
          {fechas.map((f) => {
            const [, m, d] = f.fecha.split('-').map(Number)
            const cat = categoriaInfo(f.categoria)
            const n = diasHasta(f.fecha, hoyISO)
            return (
              <div key={f.id} className="flex items-center gap-2.5 rounded-lg bg-card border px-2.5 py-1.5" style={{ borderLeft: `4px solid ${cat.color}` }}>
                <div className="w-9 text-center shrink-0">
                  <div className="text-[14px] font-extrabold leading-none">{d}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">{MESES[m - 1]}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-bold truncate">{f.titulo}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} /> {cat.label}
                    </span>
                    {f.nota && <span className="text-[10.5px] text-muted-foreground truncate">· {f.nota}</span>}
                  </div>
                </div>
                <span className="text-[10.5px] font-bold shrink-0 px-2 py-0.5 rounded-full" style={{ background: `${marcaColor}1a`, color: marcaColor }}>
                  {etiquetaDias(n)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
