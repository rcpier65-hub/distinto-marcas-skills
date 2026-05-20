// app/app/publicaciones/kanban/page.tsx
// Vista Kanban: 10 columnas (una por estado) con drag-and-drop entre columnas.
// Server Component carga publicaciones; Client Component KanbanBoard maneja DnD.

import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent } from '@/components/ui/card'
import { KanbanBoard } from './_components/kanban-board'
import type { EstadoPublicacion } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

type SearchParams = {
  marca?: string
  desde?: string
  hasta?: string
}

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireUser()
  const sp = await searchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Default: mes de mayo 2026 (todo)
  const desde = sp.desde ?? '2026-05-01'
  const hasta = sp.hasta ?? '2026-05-31'

  // Cargar marcas para filtro
  const { data: marcas } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex')
    .eq('activa', true)
    .order('nombre')

  // Cargar publicaciones (todas las columnas — el cliente las distribuye por estado)
  let q = service
    .from('publicaciones')
    .select(`
      id, nombre, estado, fecha_publicacion, plataformas, tipo_contenido,
      editor_id, editor_nombre,
      marca:marcas(id, slug, nombre, emoji_marca, color_primario_hex)
    `)
    .gte('fecha_publicacion', desde)
    .lte('fecha_publicacion', hasta)
    .order('fecha_publicacion', { ascending: true })

  // Filter por marca client-side (Supabase no permite filtrar por joined column con .eq)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pubsRaw } = (await q) as { data: any[] | null }
  let pubs = pubsRaw ?? []
  if (sp.marca) {
    pubs = pubs.filter((p) => {
      const m = Array.isArray(p.marca) ? p.marca[0] : p.marca
      return m?.slug === sp.marca
    })
  }

  // Cargar editores para resolver nombre por id (para cards)
  const { data: editores } = await service
    .from('editores')
    .select('id, nombre')
    .eq('activo', true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editoresMap = new Map<string, string>((editores ?? []).map((e: any) => [e.id, e.nombre]))

  // Adaptar shape para el client component
  const kanbanPubs = pubs.map((p) => {
    const m = Array.isArray(p.marca) ? p.marca[0] : p.marca
    return {
      id: p.id,
      nombre: p.nombre,
      estado: p.estado as EstadoPublicacion,
      fecha_publicacion: p.fecha_publicacion,
      plataformas: p.plataformas ?? [],
      tipo_contenido: p.tipo_contenido ?? [],
      editor_nombre: p.editor_id ? editoresMap.get(p.editor_id) ?? null : p.editor_nombre,
      marca: m ? {
        slug: m.slug,
        emoji_marca: m.emoji_marca,
        color_primario_hex: m.color_primario_hex,
      } : null,
    }
  })

  return (
    <main className="container mx-auto p-6 max-w-[1600px]">
      <header className="mb-4 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">📋 Kanban</h1>
          <p className="text-sm text-muted-foreground">
            {kanbanPubs.length} publicaciones · {desde} → {hasta}
            {sp.marca && ` · marca: ${sp.marca}`}
            {' · '}<span className="italic">arrastrá las cards entre columnas para cambiar el estado</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/publicaciones/tabla" className="h-9 px-3 rounded-md border text-sm hover:bg-muted flex items-center">📋 Tabla</Link>
          <Link href="/publicaciones" className="h-9 px-3 rounded-md border text-sm hover:bg-muted flex items-center">📅 Calendario</Link>
          <Link
            href={`/publicaciones/nueva${sp.marca ? `?marca=${sp.marca}` : ''}`}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center"
          >
            + Nueva
          </Link>
        </div>
      </header>

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <form action="/publicaciones/kanban" className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Marca</label>
              <select
                name="marca"
                defaultValue={sp.marca ?? ''}
                className="h-8 px-2 rounded-md border border-input bg-background text-sm min-w-[160px]"
              >
                <option value="">Todas</option>
                {marcas?.map((m: { slug: string; nombre: string; emoji_marca: string | null }) => (
                  <option key={m.slug} value={m.slug}>{m.emoji_marca} {m.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Desde</label>
              <input type="date" name="desde" defaultValue={desde} className="h-8 px-2 rounded-md border border-input bg-background text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Hasta</label>
              <input type="date" name="hasta" defaultValue={hasta} className="h-8 px-2 rounded-md border border-input bg-background text-sm" />
            </div>
            <button type="submit" className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Filtrar
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Kanban board */}
      <KanbanBoard initialPubs={kanbanPubs} />
    </main>
  )
}
