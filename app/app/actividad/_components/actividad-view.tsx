'use client'

/* Reporte de actividad por persona. Resumido (conteo por tipo de acción) o
   detallado (línea de tiempo con hora). Botón para copiar el reporte como
   texto y mandarlo por WhatsApp. Pedro 15-jun-2026. */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ClipboardList, Copy as CopyIcon, Check, ListChecks, AlignLeft } from 'lucide-react'

export type ActividadRow = {
  actor_nombre: string
  rol: string | null
  accion: string
  entidad_tipo: string | null
  marca_slug: string | null
  detalle: string | null
  created_at: string
}

const TZ = 'America/Lima'

function hora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-PE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function fechaBonita(fecha: string): string {
  try {
    const [y, m, d] = fecha.split('-').map(Number)
    return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d))
  } catch { return fecha }
}

export function ActividadView({
  rows, fecha, esAdmin, miNombre, migracionPendiente,
}: {
  rows: ActividadRow[]
  fecha: string
  esAdmin: boolean
  miNombre: string
  migracionPendiente: boolean
}) {
  const router = useRouter()
  const [detallado, setDetallado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  // Agrupar por persona, más activos primero.
  const porPersona = useMemo(() => {
    const m = new Map<string, ActividadRow[]>()
    for (const r of rows) {
      const arr = m.get(r.actor_nombre) ?? []
      arr.push(r)
      m.set(r.actor_nombre, arr)
    }
    return Array.from(m.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [rows])

  function resumen(arr: ActividadRow[]): { accion: string; n: number }[] {
    const c = new Map<string, number>()
    for (const r of arr) c.set(r.accion, (c.get(r.accion) ?? 0) + 1)
    return Array.from(c.entries()).map(([accion, n]) => ({ accion, n })).sort((a, b) => b.n - a.n)
  }

  function textoReporte(): string {
    const L: string[] = [`📋 Reporte de actividad — ${fechaBonita(fecha)}`, '']
    if (porPersona.length === 0) { L.push('Sin actividad registrada.') }
    for (const [persona, arr] of porPersona) {
      L.push(`👤 ${persona} · ${arr.length} ${arr.length === 1 ? 'acción' : 'acciones'}`)
      if (detallado) {
        for (const r of arr.slice().reverse()) {
          L.push(`   ${hora(r.created_at)} · ${r.accion}${r.detalle ? ` — ${r.detalle}` : ''}${r.marca_slug ? ` (${r.marca_slug})` : ''}`)
        }
      } else {
        for (const { accion, n } of resumen(arr)) L.push(`   • ${accion}: ${n}`)
      }
      L.push('')
    }
    L.push('— Distinto Agencia')
    return L.join('\n')
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoReporte())
      setCopiado(true)
      toast.success('Reporte copiado ✓')
      setTimeout(() => setCopiado(false), 2500)
    } catch { toast.error('No se pudo copiar') }
  }

  function cambiarFecha(nueva: string) {
    const params = new URLSearchParams()
    if (nueva) params.set('fecha', nueva)
    router.push(`/actividad${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <main className="container mx-auto p-3 sm:p-6 max-w-3xl space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-[#7170ff]" /> Reporte de actividad
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {fechaBonita(fecha)} {!esAdmin && `· ${miNombre}`}
        </p>
      </header>

      {/* Controles */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={fecha}
          onChange={(e) => cambiarFecha(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        />
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-[12px]">
          <button
            onClick={() => setDetallado(false)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${!detallado ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            <ListChecks className="w-3.5 h-3.5" /> Resumido
          </button>
          <button
            onClick={() => setDetallado(true)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${detallado ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            <AlignLeft className="w-3.5 h-3.5" /> Detallado
          </button>
        </div>
        <button
          onClick={copiar}
          className="ml-auto inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-semibold text-white"
          style={{ background: copiado ? '#16a34a' : '#0f172a' }}
        >
          {copiado ? <Check className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
          {copiado ? 'Copiado' : 'Copiar reporte'}
        </button>
      </div>

      {migracionPendiente && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-4 text-sm">
          ⚙️ El historial todavía no está activado. Falta crear la tabla <code>actividad</code> en
          Supabase (te pasé el SQL). Una vez activado, acá empezará a salir todo lo que hace cada persona.
        </div>
      )}

      {!migracionPendiente && porPersona.length === 0 && (
        <div className="rounded-2xl border bg-white p-10 text-center">
          <div className="text-4xl mb-2">🗒️</div>
          <p className="font-semibold text-foreground">Sin actividad este día</p>
          <p className="text-sm text-muted-foreground mt-1">Cuando el equipo trabaje, sus acciones aparecerán acá.</p>
        </div>
      )}

      <div className="space-y-4">
        {porPersona.map(([persona, arr]) => (
          <section key={persona} className="rounded-2xl bg-white ring-1 ring-black/[0.06] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 p-4 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-9 h-9 rounded-full bg-[#7170ff]/12 text-[#7170ff] flex items-center justify-center text-sm font-bold shrink-0">
                  {persona.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[14px] leading-tight truncate">{persona}</p>
                  {arr[0]?.rol && <p className="text-[11px] text-muted-foreground capitalize">{arr[0].rol.replace(/_/g, ' ')}</p>}
                </div>
              </div>
              <span className="text-[12px] font-semibold text-muted-foreground shrink-0">
                {arr.length} {arr.length === 1 ? 'acción' : 'acciones'}
              </span>
            </div>

            <div className="p-4">
              {detallado ? (
                <ul className="space-y-1.5">
                  {arr.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px]">
                      <span className="font-mono text-muted-foreground tabular-nums shrink-0">{hora(r.created_at)}</span>
                      <span className="text-foreground">
                        {r.accion}
                        {r.detalle && <span className="text-muted-foreground"> — {r.detalle}</span>}
                        {r.marca_slug && <span className="text-muted-foreground"> ({r.marca_slug})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {resumen(arr).map(({ accion, n }) => (
                    <span key={accion} className="inline-flex items-center gap-1.5 text-[12.5px] px-2.5 py-1 rounded-full bg-muted/60">
                      <span className="text-foreground">{accion}</span>
                      <span className="font-bold text-[#7170ff]">{n}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
