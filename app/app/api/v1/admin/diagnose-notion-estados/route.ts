// app/app/api/v1/admin/diagnose-notion-estados/route.ts
//
// GET /api/v1/admin/diagnose-notion-estados
//
// Diagnostica el sync Notion → publicaciones: lista TODOS los estados
// únicos que vienen de Notion para cada marca, y marca cuáles NO
// están mapeados en ESTADO_MAP (por eso el sync los ignora y deja la
// pub con el estado viejo en Supabase).
//
// Resultado típico cuando hay bug:
//   { "publicado": { count: 12, mapped: false }, ... }
// → significa que 12 pubs en Notion tienen estado "publicado" pero
// el sync no lo reconoce → no actualiza ese estado en DB → la pub
// se queda atascada en su estado anterior (típicamente 'editar').
//
// Auth: Bearer <CRON_SECRET>.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { queryGrillaForBrandExtended } from '@/lib/integrations/notion'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // hasta 5 min — fetch a Notion por cada marca

// Espejo de ESTADO_MAP en lib/publicaciones/sync.ts. Si actualizan uno
// hay que actualizar el otro — preferiría importarlo pero es interno.
// El test es solo conocer las KEYS, no los valores.
const ESTADO_MAP_KEYS = new Set([
  'tareas', 'idear', 'editando', 'editar', 'disenar', 'enviado', 'aprobar',
  'programar', 'programar anuncios', 'programar_anuncios', 'archivado',
  'idea', 'ideando', 'edicion', 'en edicion', 'por editar', 'diseno',
  'diseñando', 'por disenar', 'por diseñar', 'enviado al cliente',
  'por aprobar', 'aprobado', 'programado', 'archivar',
  // Sinónimos que voy a agregar:
  'publicado', 'publicar', 'publicada', 'publicadas', 'publicados',
  'listo', 'lista', 'terminado', 'terminada', 'edited', 'hecho', 'hecha',
  'completado', 'completada', 'completo', 'completa', 'en revision',
  'revisar', 'en revisión', 'borrador', 'draft', 'pendiente',
])

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data: marcas } = await service
    .from('marcas')
    .select('slug, nombre, notion_proyecto_id')
    .not('notion_proyecto_id', 'is', null)
    .order('slug')

  if (!marcas || marcas.length === 0) {
    return NextResponse.json({
      ok: true,
      message: 'Ninguna marca tiene notion_proyecto_id configurado',
      perMarca: {},
      global: {},
    })
  }

  type EstadoInfo = { count: number; mapped: boolean; ejemplos: string[] }
  const perMarca: Record<string, Record<string, EstadoInfo>> = {}
  const global: Record<string, EstadoInfo> = {}
  const errores: string[] = []

  for (const m of marcas as Array<{ slug: string; nombre: string; notion_proyecto_id: string }>) {
    try {
      const pubs = await queryGrillaForBrandExtended({
        notionProyectoId: m.notion_proyecto_id,
        semanaInicio: null,
        semanaFin: null,
      })
      const estados: Record<string, EstadoInfo> = {}
      for (const pub of pubs) {
        const raw = pub.estado ?? '(sin estado)'
        const norm = normalizeKey(raw)
        const mapped = ESTADO_MAP_KEYS.has(norm)
        if (!estados[raw]) estados[raw] = { count: 0, mapped, ejemplos: [] }
        estados[raw].count++
        if (estados[raw].ejemplos.length < 3 && pub.titulo) {
          estados[raw].ejemplos.push(pub.titulo)
        }
        // Acumular global también
        if (!global[raw]) global[raw] = { count: 0, mapped, ejemplos: [] }
        global[raw].count++
      }
      perMarca[m.slug] = estados
    } catch (e) {
      errores.push(`${m.slug}: ${(e as Error).message}`)
    }
  }

  /* Resumen ejecutivo: cuántos estados únicos hay sin mapear + cuántas
     pubs totales están afectadas. Esto es lo más importante para Pedro. */
  const noMapeados = Object.entries(global)
    .filter(([, info]) => !info.mapped)
    .map(([estado, info]) => ({ estado, count: info.count, ejemplos: info.ejemplos }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    ok: true,
    resumen: {
      marcasConsultadas: marcas.length,
      estadosUnicosTotal: Object.keys(global).length,
      estadosNoMapeadosCount: noMapeados.length,
      pubsAfectadasSinMapeo: noMapeados.reduce((sum, e) => sum + e.count, 0),
    },
    noMapeados,
    perMarca,
    errores,
  })
}
