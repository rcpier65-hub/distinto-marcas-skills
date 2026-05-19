// app/app/publicaciones/calendario/page.tsx
// Vista calendario mensual de publicaciones.
// Grid 7 cols (lun-dom) × N filas. Cada celda lista las publicaciones de ese día.
// Navegable mes anterior/siguiente vía searchParams (?mes=2026-05).
// Filtro opcional por marca (?marca=manrique).

import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ESTADO_PUBLICACION_LABEL, type EstadoPublicacion } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

const DIAS_HEADER = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// Color de borde left del item por estado (mini-leyenda visual del workflow)
const ESTADO_BORDER: Record<EstadoPublicacion, string> = {
  tareas: 'border-l-gray-300',
  idear: 'border-l-purple-400',
  editando: 'border-l-orange-400',
  editar: 'border-l-yellow-500',
  disenar: 'border-l-pink-400',
  enviado: 'border-l-blue-500',
  aprobar: 'border-l-green-500',
  programar: 'border-l-emerald-600',
  programar_anuncios: 'border-l-emerald-700',
  archivado: 'border-l-gray-200',
}

type SearchParams = { mes?: string; marca?: string }

type PublicacionLite = {
  id: string
  nombre: string
  estado: EstadoPublicacion
  fecha_publicacion: string | null
  plataformas: string[]
  tipo_contenido: string[]
  marca: { slug: string; emoji_marca: string | null; color_primario_hex: string | null } | null
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireUser()
  const sp = await searchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Determinar mes a mostrar (default: mayo 2026)
  const mesParam = sp.mes ?? '2026-05'
  const [yearStr, monthStr] = mesParam.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) // 1-indexed

  // Calcular rango del mes
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const lastDay = new Date(Date.UTC(year, month, 0))  // día 0 del siguiente mes = último día del actual
  const desde = firstDay.toISOString().slice(0, 10)
  const hasta = lastDay.toISOString().slice(0, 10)
  const numDays = lastDay.getUTCDate()

  // Navegación mes anterior/siguiente
  const prevDate = new Date(Date.UTC(year, month - 2, 1))
  const nextDate = new Date(Date.UTC(year, month, 1))
  const prevMes = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`
  const nextMes = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`

  // Marcas para filtro
  const { data: marcas } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca, color_primario_hex')
    .eq('activa', true)
    .order('nombre')

  // Query publicaciones del mes
  let q = service
    .from('publicaciones')
    .select(`
      id, nombre, estado, fecha_publicacion, plataformas, tipo_contenido,
      marca:marcas(slug, emoji_marca, color_primario_hex)
    `)
    .gte('fecha_publicacion', desde)
    .lte('fecha_publicacion', hasta)
    .order('fecha_publicacion', { ascending: true })

  if (sp.marca) {
    const marcaMatch = marcas?.find((m: { slug: string }) => m.slug === sp.marca)
    if (marcaMatch) q = q.eq('marca_id', marcaMatch.id)
  }

  const { data: pubsRaw } = (await q) as { data: PublicacionLite[] | null }
  const pubs = pubsRaw ?? []

  // Agrupar por día (clave: número de día del mes)
  const pubsByDay: Record<number, PublicacionLite[]> = {}
  for (const p of pubs) {
    if (!p.fecha_publicacion) continue
    const dayNum = parseInt(p.fecha_publicacion.slice(8, 10), 10)
    if (!pubsByDay[dayNum]) pubsByDay[dayNum] = []
    pubsByDay[dayNum].push(p)
  }

  // Padding inicial: número de "huecos" antes del día 1 (lunes = 0, domingo = 6)
  // getUTCDay() devuelve 0=dom, 1=lun, ..., 6=sáb. Convertimos a lunes=0.
  const firstDayOfWeek = (firstDay.getUTCDay() + 6) % 7
  const totalCells = firstDayOfWeek + numDays
  const rowsNeeded = Math.ceil(totalCells / 7)
  const trailingCells = rowsNeeded * 7 - totalCells

  // Build calendar cells
  const cells: Array<{ day: number | null }> = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null })
  for (let d = 1; d <= numDays; d++) cells.push({ day: d })
  for (let i = 0; i < trailingCells; i++) cells.push({ day: null })

  // Hoy (para resaltar)
  const today = new Date()
  const todayKey = today.getUTCFullYear() === year && today.getUTCMonth() + 1 === month
    ? today.getUTCDate()
    : null

  return (
    <main className="container mx-auto p-6 max-w-7xl">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1 capitalize">
            {MESES_ES[month - 1]} {year}
          </h1>
          <p className="text-sm text-muted-foreground">
            {pubs.length} {pubs.length === 1 ? 'publicación' : 'publicaciones'}
            {sp.marca && ` · marca: ${sp.marca}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/publicaciones/calendario?mes=${prevMes}${sp.marca ? `&marca=${sp.marca}` : ''}`}
            className="h-9 px-3 rounded-md border text-sm hover:bg-muted flex items-center"
          >
            ← Anterior
          </Link>
          <Link
            href={`/publicaciones/calendario?mes=${nextMes}${sp.marca ? `&marca=${sp.marca}` : ''}`}
            className="h-9 px-3 rounded-md border text-sm hover:bg-muted flex items-center"
          >
            Siguiente →
          </Link>
          <Link
            href="/publicaciones"
            className="h-9 px-3 rounded-md border text-sm hover:bg-muted flex items-center"
          >
            📋 Tabla
          </Link>
          <Link
            href={`/publicaciones/nueva${sp.marca ? `?marca=${sp.marca}` : ''}`}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center"
          >
            + Nueva
          </Link>
        </div>
      </header>

      {/* Filtro por marca */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <form action="/publicaciones/calendario" className="flex flex-wrap gap-2 items-center">
            <input type="hidden" name="mes" value={mesParam} />
            <span className="text-xs font-medium text-muted-foreground">Filtrar:</span>
            <select
              name="marca"
              defaultValue={sp.marca ?? ''}
              className="h-8 px-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Todas las marcas</option>
              {marcas?.map((m: { slug: string; nombre: string; emoji_marca: string | null }) => (
                <option key={m.slug} value={m.slug}>
                  {m.emoji_marca} {m.nombre}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
            >
              Aplicar
            </button>
            {sp.marca && (
              <Link
                href={`/publicaciones/calendario?mes=${mesParam}`}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Limpiar
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-0">
          {/* Header días */}
          <div className="grid grid-cols-7 border-b bg-muted/50">
            {DIAS_HEADER.map((d) => (
              <div key={d} className="p-2 text-xs font-medium text-center text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Celdas */}
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const isToday = cell.day === todayKey
              const pubsDia = cell.day !== null ? (pubsByDay[cell.day] ?? []) : []
              // Fecha ISO de la celda (para quick-add)
              const cellIsoDate = cell.day !== null
                ? `${year}-${String(month).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
                : null
              return (
                <div
                  key={idx}
                  className={`group relative min-h-[140px] border-b border-r p-1.5 ${
                    cell.day === null ? 'bg-muted/20' : 'bg-background'
                  } ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  {cell.day !== null && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <div className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {cell.day}
                        </div>
                        {/* Quick-add: aparece solo on hover (desktop) o siempre en celdas vacías */}
                        <Link
                          href={`/publicaciones/nueva?fecha=${cellIsoDate}${sp.marca ? `&marca=${sp.marca}` : ''}`}
                          className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                          title={`Crear publicación para ${cellIsoDate}`}
                        >
                          +
                        </Link>
                      </div>
                      <div className="flex flex-col gap-1">
                        {pubsDia.map((p) => {
                          const marca = Array.isArray(p.marca) ? p.marca[0] : p.marca
                          return (
                            <Link
                              key={p.id}
                              href={`/publicaciones/${p.id}`}
                              className={`block text-[11px] p-1.5 rounded border-l-2 bg-muted/40 hover:bg-muted/70 transition-colors ${ESTADO_BORDER[p.estado]}`}
                              title={`${p.nombre}\n${ESTADO_PUBLICACION_LABEL[p.estado]} · ${(p.plataformas ?? []).join(' · ')}`}
                            >
                              <div className="flex items-start gap-1">
                                <span className="text-sm leading-none">{marca?.emoji_marca ?? '📊'}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium leading-tight truncate">
                                    {p.nombre}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5 text-muted-foreground text-[10px]">
                                    <span className="truncate">{(p.tipo_contenido ?? [])[0] || ''}</span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leyenda de estados */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="text-muted-foreground font-medium">Estados:</span>
        {(Object.keys(ESTADO_BORDER) as EstadoPublicacion[]).map((e) => (
          <span key={e} className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded border-l-4 ${ESTADO_BORDER[e]} bg-muted/40`} />
            <span className="text-muted-foreground">{ESTADO_PUBLICACION_LABEL[e]}</span>
          </span>
        ))}
      </div>
    </main>
  )
}
