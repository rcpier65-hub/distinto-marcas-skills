// app/app/grabaciones/_components/mes-selector.tsx
//
// Selector de mes (anterior / actual / siguiente / picker).
// Usa querystring ?desde=YYYY-MM-01&hasta=YYYY-MM-FF para que la página sea
// shareable y server-rendered.
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function mesRange(date: Date): { desde: string; hasta: string; label: string } {
  const y = date.getFullYear()
  const m = date.getMonth()
  const desde = new Date(y, m, 1).toISOString().slice(0, 10)
  const hasta = new Date(y, m + 1, 0).toISOString().slice(0, 10)
  return { desde, hasta, label: `${MESES[m]} ${y}` }
}

export function MesSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const desde = sp.get('desde')

  const current = desde ? new Date(desde + 'T12:00:00Z') : new Date()
  current.setDate(1)  // normalizar al primer día del mes

  const actual = mesRange(current)
  const prev = mesRange(new Date(current.getFullYear(), current.getMonth() - 1, 1))
  const next = mesRange(new Date(current.getFullYear(), current.getMonth() + 1, 1))
  const hoy = mesRange(new Date())

  function go(desdeStr: string, hastaStr: string) {
    const params = new URLSearchParams(sp)
    params.set('desde', desdeStr)
    params.set('hasta', hastaStr)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => go(prev.desde, prev.hasta)}
        className="h-8 px-2 rounded border hover:bg-muted text-xs"
        title={`Ir a ${prev.label}`}
      >
        ← {prev.label}
      </button>
      <div className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-medium flex items-center capitalize">
        {actual.label}
      </div>
      <button
        onClick={() => go(next.desde, next.hasta)}
        className="h-8 px-2 rounded border hover:bg-muted text-xs"
        title={`Ir a ${next.label}`}
      >
        {next.label} →
      </button>
      {actual.desde !== hoy.desde && (
        <button
          onClick={() => go(hoy.desde, hoy.hasta)}
          className="h-8 px-2 rounded border border-primary text-primary text-xs ml-2"
          title="Volver al mes actual"
        >
          Hoy
        </button>
      )}
    </div>
  )
}
