// app/app/editor/page.tsx
// Vista dedicada para los editores. Muestra solo publicaciones en estado='editar'.
// Agrupadas por editor asignado. Filtro opcional por marca y sub-estado.
// El editor puede cambiar su sub-estado (Sin empezar / En progreso / Listo) directo desde acá.

import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ESTADO_TAREA_LABEL, type EstadoTarea } from '@/lib/types/database'
import { CambiarSubEstadoButton } from './_components/cambiar-sub-estado-button'

export const dynamic = 'force-dynamic'

type SearchParams = {
  editor?: string  // filter por editor id
  marca?: string   // filter por marca slug
  subestado?: EstadoTarea
}

type EditorRow = { id: string; nombre: string }
type MarcaRow = { id: string; slug: string; nombre: string; emoji_marca: string | null; color_primario_hex: string | null }
type PubRow = {
  id: string
  nombre: string
  fecha_publicacion: string | null
  estado_tarea: EstadoTarea
  plataformas: string[]
  tipo_contenido: string[]
  copy: string | null
  enlace_tomas: string | null
  portada_cruda_url: string | null
  editor_id: string | null
  marca: MarcaRow | MarcaRow[] | null
}

const SUB_ESTADO_VARIANT: Record<EstadoTarea, 'default' | 'secondary' | 'outline'> = {
  sin_empezar: 'outline',
  en_progreso: 'secondary',
  listo: 'default',
}

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireUser()
  const sp = await searchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Cargar editores + marcas para filtros
  const [editoresRes, marcasRes] = await Promise.all([
    service.from('editores').select('id, nombre').eq('activo', true).order('nombre'),
    service.from('marcas').select('id, slug, nombre, emoji_marca, color_primario_hex').eq('activa', true).order('nombre'),
  ])
  const editores = (editoresRes.data ?? []) as EditorRow[]
  const marcas = (marcasRes.data ?? []) as MarcaRow[]

  // Query publicaciones en estado='editar'
  let q = service
    .from('publicaciones')
    .select(`
      id, nombre, fecha_publicacion, estado_tarea, plataformas, tipo_contenido,
      copy, enlace_tomas, portada_cruda_url, editor_id,
      marca:marcas(id, slug, nombre, emoji_marca, color_primario_hex)
    `)
    .eq('estado', 'editar')
    .order('fecha_publicacion', { ascending: true, nullsFirst: false })

  if (sp.editor) q = q.eq('editor_id', sp.editor)
  if (sp.subestado) q = q.eq('estado_tarea', sp.subestado)

  const { data: pubsRaw } = (await q) as { data: PubRow[] | null }
  let pubs = pubsRaw ?? []

  if (sp.marca) {
    pubs = pubs.filter((p) => {
      const m = Array.isArray(p.marca) ? p.marca[0] : p.marca
      return m?.slug === sp.marca
    })
  }

  // Agrupar por editor (incluyendo "Sin asignar")
  const grupos = new Map<string, { editorNombre: string; pubs: PubRow[] }>()
  for (const p of pubs) {
    const edId = p.editor_id ?? '_unassigned'
    const edNombre = p.editor_id
      ? editores.find((e) => e.id === p.editor_id)?.nombre ?? 'Desconocido'
      : 'Sin asignar'
    if (!grupos.has(edId)) grupos.set(edId, { editorNombre: edNombre, pubs: [] })
    grupos.get(edId)!.pubs.push(p)
  }
  // Ordenar grupos: con editor asignado primero (alfabético), "sin asignar" al final
  const gruposOrdenados = Array.from(grupos.entries()).sort(([a, ga], [b, gb]) => {
    if (a === '_unassigned') return 1
    if (b === '_unassigned') return -1
    return ga.editorNombre.localeCompare(gb.editorNombre)
  })

  // Conteo por sub-estado para resumen
  const conteoSubestado: Record<EstadoTarea, number> = {
    sin_empezar: pubs.filter((p) => p.estado_tarea === 'sin_empezar').length,
    en_progreso: pubs.filter((p) => p.estado_tarea === 'en_progreso').length,
    listo: pubs.filter((p) => p.estado_tarea === 'listo').length,
  }

  return (
    <main className="container mx-auto p-6 max-w-7xl">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">📝 Vista Editor</h1>
          <p className="text-sm text-muted-foreground">
            {pubs.length} {pubs.length === 1 ? 'pieza' : 'piezas'} en estado <Badge variant="secondary" className="mx-1">Editar</Badge>
            agrupadas por editor asignado
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['sin_empezar', 'en_progreso', 'listo'] as EstadoTarea[]).map((s) => (
            <Badge key={s} variant={SUB_ESTADO_VARIANT[s]}>
              {ESTADO_TAREA_LABEL[s]}: {conteoSubestado[s]}
            </Badge>
          ))}
        </div>
      </header>

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <form action="/editor" className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Editor</label>
              <select
                name="editor"
                defaultValue={sp.editor ?? ''}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm min-w-[140px]"
              >
                <option value="">Todos</option>
                {editores.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Marca</label>
              <select
                name="marca"
                defaultValue={sp.marca ?? ''}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm min-w-[160px]"
              >
                <option value="">Todas</option>
                {marcas.map((m) => <option key={m.slug} value={m.slug}>{m.emoji_marca} {m.nombre}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Sub-estado</label>
              <select
                name="subestado"
                defaultValue={sp.subestado ?? ''}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm min-w-[140px]"
              >
                <option value="">Todos</option>
                <option value="sin_empezar">Sin empezar</option>
                <option value="en_progreso">En progreso</option>
                <option value="listo">Listo</option>
              </select>
            </div>
            <button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Filtrar
            </button>
            {(sp.editor || sp.marca || sp.subestado) && (
              <Link href="/editor" className="h-9 px-3 rounded-md border text-sm hover:bg-muted flex items-center">
                Limpiar
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Grupos por editor */}
      {pubs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            🎉 No hay piezas en estado "Editar" {sp.editor && 'para este editor'}{sp.marca && ' en esta marca'}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {gruposOrdenados.map(([edId, grupo]) => (
            <div key={edId}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <h2 className="text-lg font-semibold">
                  {edId === '_unassigned' ? '⚠️ ' : '✏️ '}{grupo.editorNombre}
                </h2>
                <Badge variant="outline">{grupo.pubs.length}</Badge>
              </div>
              <div className="grid gap-2">
                {grupo.pubs.map((p) => {
                  const m = Array.isArray(p.marca) ? p.marca[0] : p.marca
                  return (
                    <Card key={p.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {/* Color marca + emoji */}
                          <div
                            className="w-1 self-stretch rounded-full shrink-0"
                            style={{ backgroundColor: m?.color_primario_hex ?? '#999' }}
                          />
                          <div className="text-2xl shrink-0">{m?.emoji_marca ?? '📊'}</div>

                          {/* Body */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className="font-mono text-[10px]">{m?.slug}</Badge>
                              <Badge variant={SUB_ESTADO_VARIANT[p.estado_tarea]} className="text-[10px]">
                                {ESTADO_TAREA_LABEL[p.estado_tarea]}
                              </Badge>
                              {p.fecha_publicacion && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  📅 {p.fecha_publicacion}
                                </span>
                              )}
                              {(p.tipo_contenido ?? []).map((t) => (
                                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{t}</span>
                              ))}
                            </div>
                            <Link href={`/publicaciones/${p.id}`} className="font-medium hover:underline block">
                              {p.nombre}
                            </Link>
                            {p.copy && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {p.copy}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-xs">
                              {p.enlace_tomas && (
                                <a href={p.enlace_tomas} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  🎬 Tomas
                                </a>
                              )}
                              {p.portada_cruda_url && (
                                <a href={p.portada_cruda_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  🖼️ Portada
                                </a>
                              )}
                              <span className="text-muted-foreground">
                                {(p.plataformas ?? []).join(' · ')}
                              </span>
                            </div>
                          </div>

                          {/* Acciones rápidas: cambiar sub-estado */}
                          <div className="shrink-0">
                            <CambiarSubEstadoButton id={p.id} current={p.estado_tarea} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
