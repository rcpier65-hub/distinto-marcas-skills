// app/app/grabaciones/calendario/_components/rango-nav.tsx
//
// Navegador de la agenda: selector de vista (Día / Semana / Mes) + flechas
// ◀ ▶ + botón Hoy. Navega con querystring ?vista&desde&hasta para que la
// página sea server-rendered y compartible. Default de la página: SEMANA
// (Pedro 31-ago-2026: "siempre semanalmente debe mostrar el calendario").
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

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
      {/* Selector de vista */}
      <div className="inline-flex rounded-lg border border-border overflow-hidden">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => go(v.id, rangoDe(v.id, desde))}
            className={`h-8 px-3 text-xs font-medium ${
              v.id === vista ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Navegación del rango */}
      <div className="inline-flex items-center gap-1">
        <button type="button" onClick={() => mover(-1)} className="h-8 w-8 rounded border hover:bg-muted text-sm" title="Anterior">←</button>
        <button type="button" onClick={() => mover(1)} className="h-8 w-8 rounded border hover:bg-muted text-sm" title="Siguiente">→</button>
        {!esHoy && (
          <button
            type="button"
            onClick={() => go(vista, rangoDe(vista, hoy))}
            className="h-8 px-2.5 rounded border border-primary text-primary text-xs ml-1"
            title="Volver a hoy"
          >
            Hoy
          </button>
        )}
      </div>
    </div>
  )
}
