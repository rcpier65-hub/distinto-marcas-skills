// app/app/publicaciones/page.tsx
//
// Nueva vista con tabs Calendario | Listado. Reemplaza la vista
// vieja de cards. Default tab: Listado (Pedro pidió "listado ayuda
// a entender mejor"). Calendario muestra grid mensual con dots
// coloreados por marca.
//
// Server component: intenta fetch Supabase, fallback mock.

import { PublicacionesView } from '@/components/views/PublicacionesView'
import { SyncNotionButton } from './_components/SyncNotionButton'
import { getMarcasNav } from '@/lib/marcas/get-marcas-nav'
import {
  PUBLICACIONES_MOCK,
  type PublicacionMock,
  type EstadoPubMetricool,
  type Red,
  type TipoContenido,
} from '@/lib/mock-publicaciones'

export const dynamic = 'force-dynamic'

function normalizeEstadoPub(s: string | null | undefined): EstadoPubMetricool {
  const v = (s ?? '').toLowerCase().trim()
  if (v === 'publicado' || v === 'enviado') return 'publicado'
  if (v === 'publicando' || v === 'en_proceso') return 'publicando'
  if (v === 'error' || v === 'fallido') return 'error'
  if (v === 'borrador' || v === 'draft') return 'borrador'
  return 'pendiente'
}

function normalizeRed(r: string): Red | null {
  const v = r.toLowerCase()
  if (v.includes('insta')) return 'instagram'
  if (v.includes('face')) return 'facebook'
  if (v.includes('tik')) return 'tiktok'
  if (v.includes('linke')) return 'linkedin'
  return null
}

function normalizeTipo(t: string | null | undefined): TipoContenido {
  const v = (t ?? '').toLowerCase()
  if (v.includes('reel')) return 'reel'
  if (v.includes('carrus')) return 'carrusel'
  if (v.includes('story') || v.includes('storie')) return 'story'
  if (v.includes('video')) return 'video'
  return 'post'
}

async function fetchFromSupabase(): Promise<PublicacionMock[] | null> {
  try {
    const { createServiceClient } = await import('@/lib/supabase/service')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = createServiceClient() as any
    type RawRow = {
      id: string
      nombre: string
      fecha_publicacion: string | null
      estado: string | null
      plataformas: string[] | null
      tipo_contenido: string[] | null
      copy: string | null
      copy_listo: boolean | null
      portada_lista: boolean | null
      editado: boolean | null
      iniciado_edicion_at: string | null
      editado_at: string | null
      editor_id: string | null
      editor: { nombre: string } | { nombre: string }[] | null
      marca: { slug: string } | { slug: string }[] | null
    }
    /* Schema actual de Supabase: NO incluye hora_publicacion como columna
       separada — la hora viene como parte de fecha_publicacion si es timestamp,
       o se asume default. Pido solo columnas que existen para evitar que
       la query falle y caiga al mock (genera 404 al hacer click en pubs).
       JOIN con editores para traer el nombre real (las vistas mostraban
       "sin asignar" porque buscaban el UUID en EDITORES_MOCK — bug fixeado). */
    const FULL_COLS = `
        id, nombre, fecha_publicacion, estado,
        plataformas, tipo_contenido, copy, editor_id,
        copy_listo, portada_lista, editado,
        iniciado_edicion_at, editado_at,
        editor:editores(nombre),
        marca:marcas(slug)
      `
    const BASE_COLS = `
        id, nombre, fecha_publicacion, estado,
        plataformas, tipo_contenido, copy, editor_id,
        editor:editores(nombre),
        marca:marcas(slug)
      `
    let res = await service
      .from('publicaciones')
      .select(FULL_COLS)
      .order('fecha_publicacion', { ascending: false, nullsFirst: false })
      .limit(200)
    /* Si faltan columnas nuevas (workflow / timing de edición), reintenta con
       las columnas base — así la grilla NO cae al mock por una columna ausente.
       Los iconos de estado simplemente quedan en "pendiente". */
    if (res.error) {
      res = await service
        .from('publicaciones')
        .select(BASE_COLS)
        .order('fecha_publicacion', { ascending: false, nullsFirst: false })
        .limit(200)
    }
    const { data, error } = res
    if (error || !data) return null
    return (data as RawRow[])
      // Excluir tareas de diseño "standalone": las que están en estado 'disenar'
      // SIN fecha de publicación NO son "para publicar" → no deben aparecer en el
      // calendario/lista de publicaciones (solo viven en el módulo /diseno).
      // Las tareas de diseño "para publicar" SÍ tienen fecha_publicacion → se quedan.
      .filter((r) => !(r.estado === 'disenar' && !r.fecha_publicacion))
      .map((r) => {
      const marca = Array.isArray(r.marca) ? r.marca[0] : r.marca
      const editor = Array.isArray(r.editor) ? r.editor[0] : r.editor
      const redes = (r.plataformas ?? []).map(normalizeRed).filter(Boolean) as Red[]
      const tipo = normalizeTipo((r.tipo_contenido ?? [])[0])
      /* Extraer hora del timestamp si fecha_publicacion incluye tiempo.
         Sino default '12:00'. */
      let fecha = new Date().toISOString().slice(0, 10)
      let hora = '12:00'
      if (r.fecha_publicacion) {
        const parts = r.fecha_publicacion.split('T')
        fecha = parts[0]
        if (parts[1]) hora = parts[1].slice(0, 5)
      }
      return {
        id: r.id,
        marcaSlug: marca?.slug ?? 'unknown',
        fecha,
        hora,
        /* Título real del video (nombre) — Lorena lo quiere visible en el
           calendario para ubicar videos. El caption sigue siendo el copy. */
        titulo: r.nombre ?? '(sin título)',
        caption: r.copy ?? r.nombre ?? '(sin título)',
        thumbnail: null,
        redes,
        tipo,
        estado: normalizeEstadoPub(r.estado),
        editorId: r.editor_id,
        editorNombre: editor?.nombre ?? null,
        copyListo: r.copy_listo ?? false,
        portadaLista: r.portada_lista ?? false,
        /* Terminado: editado_at (timestamp del editor) o el check manual.
           En curso: cronómetro iniciado y aún sin terminar. */
        editado: !!r.editado_at || !!r.editado,
        editando: !!r.iniciado_edicion_at && !r.editado_at && !r.editado,
      }
    })
  } catch {
    return null
  }
}

export default async function PublicacionesPage() {
  /* Route guard: si el user no tiene permiso publicaciones, redirige
     a su landing. Antes era accesible por URL directa aunque el
     sidebar lo escondiera. */
  const { ensureAccesoModulo, getCurrentMemberPermisos } = await import('@/lib/team/permisos-helper')
  await ensureAccesoModulo('publicaciones')

  /* Fechas importantes (idea de Lorena): se muestran integradas en el
     calendario. Agregarlas: solo Lorena + directores. Ver [fechas-importantes]. */
  const { createServiceClient } = await import('@/lib/supabase/service')
  const { colorDeMarca } = await import('@/lib/marcas/branding')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const p = await getCurrentMemberPermisos()
  const canManageFechas = !p || p.member.rol_base === 'director' || p.member.nombre === 'LORENA'

  const [pubs, marcas, marcasFullRes, fechasRes] = await Promise.all([
    fetchFromSupabase().then((d) => d ?? PUBLICACIONES_MOCK),
    getMarcasNav(),
    service.from('marcas').select('id, slug, nombre, color_primario_hex').eq('activa', true).order('nombre'),
    service.from('fechas_importantes').select('id, marca_id, titulo, fecha, nota, categoria'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcaInfo = new Map<string, { nombre: string; slug: string; color: string }>(((marcasFullRes?.data ?? []) as any[]).map((m) => [m.id, { nombre: m.nombre as string, slug: m.slug as string, color: colorDeMarca(m.slug, m.color_primario_hex) }]))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fechasImportantes = ((fechasRes?.data ?? []) as any[]).map((f) => {
    const mi = marcaInfo.get(f.marca_id)
    return { id: f.id as string, titulo: f.titulo as string, fecha: (typeof f.fecha === 'string' ? f.fecha.slice(0, 10) : f.fecha) as string, nota: (f.nota ?? null) as string | null, categoria: (f.categoria ?? 'otro') as string, marcaNombre: mi?.nombre ?? 'Marca', marcaSlug: mi?.slug ?? 'unknown', color: mi?.color ?? '#7170ff' }
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcasFechas = ((marcasFullRes?.data ?? []) as any[]).map((m) => ({ id: m.id as string, nombre: m.nombre as string }))

  return (
    <>
      <div className="flex items-center justify-end gap-3 px-6 pt-4">
        <SyncNotionButton />
      </div>
      <PublicacionesView
        publicaciones={pubs}
        marcas={marcas}
        fechasImportantes={fechasImportantes}
        marcasFechas={marcasFechas}
        canManageFechas={canManageFechas}
      />
    </>
  )
}
