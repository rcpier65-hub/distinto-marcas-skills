// app/app/publicaciones/tabla/page.tsx
// Vista tabla (era /publicaciones antes del swap a calendario como default).
// Filtros vía searchParams: ?marca=manrique&estado=aprobar&desde=...&hasta=...

import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ESTADO_PUBLICACION_LABEL, type EstadoPublicacion } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

const ESTADOS_ALL: EstadoPublicacion[] = [
  'tareas', 'idear', 'editando', 'editar', 'disenar',
  'enviado', 'aprobar', 'programar', 'programar_anuncios', 'archivado',
]

const ESTADO_VARIANT: Record<EstadoPublicacion, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  tareas: 'outline',
  idear: 'outline',
  editando: 'secondary',
  editar: 'secondary',
  disenar: 'secondary',
  enviado: 'default',
  aprobar: 'default',
  programar: 'default',
  programar_anuncios: 'default',
  archivado: 'outline',
}

type SearchParams = {
  marca?: string
  estado?: string
  desde?: string
  hasta?: string
}

export default async function TablaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireUser()
  const sp = await searchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const desde = sp.desde ?? '2026-05-01'
  const hasta = sp.hasta ?? '2026-05-31'

  const { data: marcas } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex')
    .eq('activa', true)
    .order('nombre')

  let query = service
    .from('publicaciones')
    .select(`
      id, marca_id, nombre, estado, fecha_publicacion,
      plataformas, tipo_contenido, editor_nombre, notion_url,
      copy_listo, portada_lista, editado, video_aprobado,
      marca:marcas(slug, nombre, emoji_marca, color_primario_hex)
    `)
    .gte('fecha_publicacion', desde)
    .lte('fecha_publicacion', hasta)
    .order('fecha_publicacion', { ascending: true })

  if (sp.marca) query = query.eq('marca.slug', sp.marca)
  if (sp.estado) query = query.eq('estado', sp.estado)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pubs } = (await query) as { data: any[] | null }

  const filteredPubs = sp.marca
    ? (pubs ?? []).filter((p) => {
        const m = Array.isArray(p.marca) ? p.marca[0] : p.marca
        return m?.slug === sp.marca
      })
    : pubs ?? []

  const conteoPorEstado = filteredPubs.reduce<Record<string, number>>((acc, p) => {
    acc[p.estado] = (acc[p.estado] ?? 0) + 1
    return acc
  }, {})

  return (
    <main className="container mx-auto p-6 max-w-7xl">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">Publicaciones — Tabla</h1>
          <p className="text-sm text-muted-foreground">
            {filteredPubs.length} publicaciones · {desde} → {hasta}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/publicaciones?mes=${desde.slice(0, 7)}${sp.marca ? `&marca=${sp.marca}` : ''}`}
            className="h-9 px-3 rounded-md border text-sm hover:bg-muted flex items-center gap-1"
          >
            📅 Calendario
          </Link>
          <Link
            href={`/publicaciones/kanban${sp.marca ? `?marca=${sp.marca}` : ''}`}
            className="h-9 px-3 rounded-md border text-sm hover:bg-muted flex items-center gap-1"
          >
            📋 Kanban
          </Link>
          <Link
            href={`/publicaciones/nueva${sp.marca ? `?marca=${sp.marca}` : ''}`}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-1"
          >
            + Nueva publicación
          </Link>
        </div>
      </header>

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <form className="flex flex-wrap gap-3 items-end" action="/publicaciones/tabla">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Marca</label>
              <select
                name="marca"
                defaultValue={sp.marca ?? ''}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm min-w-[160px]"
              >
                <option value="">Todas</option>
                {marcas?.map((m: { slug: string; nombre: string; emoji_marca: string | null }) => (
                  <option key={m.slug} value={m.slug}>{m.emoji_marca} {m.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Estado</label>
              <select
                name="estado"
                defaultValue={sp.estado ?? ''}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm min-w-[140px]"
              >
                <option value="">Todos</option>
                {ESTADOS_ALL.map((e) => (
                  <option key={e} value={e}>{ESTADO_PUBLICACION_LABEL[e]}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Desde</label>
              <input type="date" name="desde" defaultValue={desde} className="h-9 px-3 rounded-md border border-input bg-background text-sm" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Hasta</label>
              <input type="date" name="hasta" defaultValue={hasta} className="h-9 px-3 rounded-md border border-input bg-background text-sm" />
            </div>

            <button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Filtrar
            </button>

            {(sp.marca || sp.estado || sp.desde || sp.hasta) && (
              <Link href="/publicaciones/tabla" className="h-9 px-3 rounded-md border text-sm font-medium hover:bg-muted flex items-center">
                Limpiar
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Resumen estados */}
      {Object.keys(conteoPorEstado).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {ESTADOS_ALL.filter((e) => conteoPorEstado[e] > 0).map((e) => (
            <Badge key={e} variant={ESTADO_VARIANT[e]}>
              {ESTADO_PUBLICACION_LABEL[e]}: {conteoPorEstado[e]}
            </Badge>
          ))}
        </div>
      )}

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {filteredPubs.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No hay publicaciones en este rango. Ajustá los filtros o corré el importer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Marca</th>
                    <th className="p-3 font-medium">Fecha</th>
                    <th className="p-3 font-medium">Nombre</th>
                    <th className="p-3 font-medium">Estado</th>
                    <th className="p-3 font-medium">Plataformas</th>
                    <th className="p-3 font-medium">Tipo</th>
                    <th className="p-3 font-medium">Progreso</th>
                    <th className="p-3 font-medium">Notion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPubs.map((p) => {
                    const m = Array.isArray(p.marca) ? p.marca[0] : p.marca
                    return (
                      <tr key={p.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 whitespace-nowrap">
                          <span className="text-base mr-1">{m?.emoji_marca ?? '📊'}</span>
                          <span className="text-xs text-muted-foreground font-mono">{m?.slug}</span>
                        </td>
                        <td className="p-3 whitespace-nowrap font-mono text-xs">{p.fecha_publicacion ?? '—'}</td>
                        <td className="p-3 max-w-md">
                          <Link href={`/publicaciones/${p.id}`} className="font-medium leading-tight hover:underline">
                            {p.nombre}
                          </Link>
                          {p.editor_nombre && (
                            <div className="text-xs text-muted-foreground">por {p.editor_nombre}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant={ESTADO_VARIANT[p.estado as EstadoPublicacion]}>
                            {ESTADO_PUBLICACION_LABEL[p.estado as EstadoPublicacion]}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.plataformas ?? []).map((pl: string) => (
                              <span key={pl} className="text-xs px-1.5 py-0.5 rounded bg-muted">{pl}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.tipo_contenido ?? []).map((t: string) => (
                              <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 text-xs">
                            <span title="Copy listo" className={p.copy_listo ? '' : 'opacity-30'}>📝</span>
                            <span title="Portada lista" className={p.portada_lista ? '' : 'opacity-30'}>🖼️</span>
                            <span title="Editado" className={p.editado ? '' : 'opacity-30'}>✂️</span>
                            <span title="Video aprobado" className={p.video_aprobado ? '' : 'opacity-30'}>✅</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {p.notion_url ? (
                            <a href={p.notion_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">↗</a>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
