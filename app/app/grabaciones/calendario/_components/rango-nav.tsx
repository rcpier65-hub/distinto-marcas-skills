// app/app/grabaciones/calendario/_components/rango-nav.tsx
//
// Navegador de la agenda: selector de vista (Día / Semana / Mes) + flechas
// ◀ ▶ + botón Hoy. Navega con querystring ?vista&desde&hasta para que la
// página sea server-rendered y compartible. Default de la página: SEMANA
// (Pedro 31-ago-2026: "siempre semanalmente debe mostrar el calendario").
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type VistaAgenda = 'dia' | 'semana' | 'mes'

function addDias(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function lunesDe(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00Z')
  const dow = d.getUTCDay()
  return addDias(ymd, -(dow === 0 ? 6 : dow - 1))
}

function mesRango(ymd: string, delta: number): { desde: string; hasta: string } {
  const d = new Date(ymd + 'T12:00:00Z')
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + delta
  const desde = new Date(Date.UTC(y, m, 1, 12)).toISOString().slice(0, 10)
  const hasta = new Date(Date.UTC(y, m + 1, 0, 12)).toISOString().slice(0, 10)
  return { desde, hasta }
}

/* Rango para una vista, anclado a una fecha. */
function rangoDe(vista: VistaAgenda, ancla: string): { desde: string; hasta: string } {
  if (vista === 'dia') return { desde: ancla, hasta: ancla }
  if (vista === 'semana') { const lun = lunesDe(ancla); return { desde: lun, hasta: addDias(lun, 6) } }
  return mesRango(ancla, 0)
}

const VISTAS: Array<{ id: VistaAgenda; label: string }> = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
]

export function RangoNav({ vista, desde }: { vista: VistaAgenda; desde: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())

  function go(v: VistaAgenda, r: { desde: string; hasta: string }) {
    const params = new URLSearchParams(sp)
    params.set('vista', v)
    params.set('desde', r.desde)
    params.set('hasta', r.hasta)
    router.push(`${pathname}?${params.toString()}`)
  }

  function mover(delta: -1 | 1) {
    if (vista === 'dia') { const d = addDias(desde, delta); go('dia', { desde: d, hasta: d }); return }
    if (vista === 'semana') { const lun = addDias(desde, delta * 7); go('semana', { desde: lun, hasta: addDias(lun, 6) }); return }
    go('mes', mesRango(desde, delta))
  }

  const esHoy = rangoDe(vista, hoy).desde === rangoDe(vista, desde).desde

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Selector de vista: control segmentado (estilo Linear / Google). */}
      <div role="tablist" aria-label="Vista del calendario" className="inline-flex items-center p-0.5 rounded-lg bg-muted/70 border border-border">
        {VISTAS.map((v) => {
          const activa = v.id === vista
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => go(v.id, rangoDe(v.id, desde))}
              className={`h-8 px-3.5 rounded-md text-[13px] font-medium transition-all ${
                activa
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-black/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      {/* Navegación del rango: Hoy · ‹ › */}
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(vista, rangoDe(vista, hoy))}
          disabled={esHoy}
          className="h-9 px-3 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-default disabled:hover:bg-card"
          title="Volver a hoy"
        >
          Hoy
        </button>
        <div className="inline-flex items-center rounded-lg border border-border bg-card overflow-hidden">
          <button type="button" onClick={() => mover(-1)} className="h-9 w-9 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Anterior" aria-label="Anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="w-px h-5 bg-border" aria-hidden />
          <button type="button" onClick={() => mover(1)} className="h-9 w-9 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Siguiente" aria-label="Siguiente">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
