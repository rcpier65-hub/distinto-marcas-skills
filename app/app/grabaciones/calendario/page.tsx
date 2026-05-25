// app/app/grabaciones/calendario/page.tsx
// Vista calendario mensual de grabaciones — server component.

import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { CalendarGrid } from './_components/calendar-grid'
import { MesSelector } from '../_components/mes-selector'

export const dynamic = 'force-dynamic'

type SP = { desde?: string; hasta?: string }

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export default async function GrabacionesCalendarioPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser()
  const sp = await searchParams

  // Mes actual o el indicado en query
  const today = new Date()
  const desde = sp.desde ?? new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const hasta = sp.hasta ?? new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)
  const monthDate = new Date(desde + 'T12:00:00Z')
  const mesLabel = `${MESES[monthDate.getUTCMonth()]} ${monthDate.getUTCFullYear()}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Cargar grabaciones del rango con JOIN para color por marca
  // Defensive: si tabla no existe (pre-migration 016), array vacío
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[] = []
  let loadError: string | null = null
  {
    const r = await service
      .from('grabaciones')
      .select('id, marca_id, fecha_planeada, fecha_real, estado, videos_grabados, marcas:marca_id (slug, nombre, emoji_marca, color_calendario)')
      .gte('fecha_planeada', desde)
      .lte('fecha_planeada', hasta)
      .order('fecha_planeada', { ascending: true })
    if (r.error && !(r.error.message ?? '').includes('does not exist')) {
      loadError = r.error.message
    } else {
      rows = r.data ?? []
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grabaciones = rows.map((r: any) => ({
    id: r.id,
    marca_id: r.marca_id,
    marca_slug: r.marcas?.slug ?? '',
    marca_nombre: r.marcas?.nombre ?? '?',
    marca_emoji: r.marcas?.emoji_marca ?? null,
    color_calendario: r.marcas?.color_calendario ?? '#6366F1',
    fecha_planeada: r.fecha_planeada,
    fecha_real: r.fecha_real,
    estado: r.estado,
    videos_grabados: r.videos_grabados,
  }))

  // Leyenda de marcas — extraer únicas del set
  const marcasUnicas = Array.from(
    new Map(
      grabaciones.map((g) => [g.marca_id, { nombre: g.marca_nombre, emoji: g.marca_emoji, color: g.color_calendario }])
    ).values()
  )

  return (
    <main className="container mx-auto p-6 max-w-7xl space-y-4">
      {/* HEADER con tabs */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">🎬 Grabaciones — Calendario</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {mesLabel} · {grabaciones.length} grabaciones programadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MesSelector />
        </div>
      </header>

      {/* TABS */}
      <nav className="flex items-center gap-1 border-b border-border">
        <Link
          href="/grabaciones"
          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-muted-foreground"
        >
          📋 Lista
        </Link>
        <Link
          href="/grabaciones/calendario"
          className="px-3 py-2 text-sm font-medium border-b-2 border-primary text-foreground"
        >
          📅 Calendario
        </Link>
      </nav>

      {loadError && (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          ⚠️ {loadError}
        </div>
      )}

      {/* LEYENDA por marca */}
      {marcasUnicas.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          <span className="font-medium">Marcas en este mes:</span>
          {marcasUnicas.map((m, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ background: m.color }} />
              <span>{m.emoji} {m.nombre}</span>
            </div>
          ))}
        </div>
      )}

      {/* GRID */}
      <CalendarGrid mes={desde} grabaciones={grabaciones} />

      {/* HINT */}
      <p className="text-xs text-muted-foreground text-center">
        💡 Click en un día → ver / agregar grabaciones de esa fecha en la vista <Link href="/grabaciones" className="underline">Lista</Link>.
      </p>
    </main>
  )
}
