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
      .filter((r) => !(r.estado === 'disenar' && !r.fecha_publicacion))
      .map((r) => {
      const marca = Array.isArray(r.marca) ? r.marca[0] : r.marca
      const editor = Array.isArray(r.editor) ? r.editor[0] : r.editor
      const redes = (r.plataformas ?? []).map(normalizeRed).filter(Boolean) as Red[]
      const tipo = normalizeTipo((r.tipo_contenido ?? [])[0])
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
        editado: !!r.editado_at || !!r.editado,
        editando: !!r.iniciado_edicion_at && !r.editado_at && !r.editado,
      }
    })
  } catch {
    return null
  }
}

export default async function PublicacionesPage() {
  const { ensureAccesoModulo, getCurrentMemberPermisos } = await import('@/lib/team/permisos-helper')
  await ensureAccesoModulo('publicaciones')

  const { createServiceClient } = await import('@/lib/supabase/service')
  const { colorDeMarca } = await import('@/lib/marcas/branding')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const p = await getCurrentMemberPermisos()
  const canManageFechas = !p || p.member.rol_base === 'director' || p.member.nombre === 'LORENA'

  const [pubs, marcas, marcasFullRes, fechasRes, histRes] = await Promise.all([
    fetchFromSupabase().then((d) => d ?? PUBLICACIONES_MOCK),
    getMarcasNav(),
    service.from('marcas').select('id, slug, nombre, color_primario_hex').eq('activa', true).order('nombre'),
    service.from('fechas_importantes').select('id, marca_id, titulo, fecha, nota, categoria'),
    service.from('historias').select('id, marca_id, titulo, fecha, hora, plataformas, estado').neq('estado', 'cancelada'),
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

  const histErr = (histRes as { error?: { message?: string } } | null)?.error?.message ?? ''
  const histOk = !/relation .*historias.* does not exist|Could not find the table/i.test(histErr)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historiasCal = histOk ? ((histRes?.data ?? []) as any[]).map((h) => {
    const mi = marcaInfo.get(h.marca_id)
    return {
      id: h.id as string,
      titulo: h.titulo as string,
      fecha: (typeof h.fecha === 'string' ? h.fecha.slice(0, 10) : h.fecha) as string,
      hora: h.hora ? String(h.hora).slice(0, 5) : null,
      plataformas: (h.plataformas ?? []) as string[],
      estado: (h.estado ?? 'planificada') as string,
      marcaNombre: mi?.nombre ?? 'Marca',
      marcaSlug: mi?.slug ?? 'unknown',
      color: mi?.color ?? '#ec4899',
    }
  }) : []

  return (
    <>
      <div className="flex items-center justify-end gap-3 px-6 pt-4">
        <a
          href="/historias"
          className="inline-flex items-center h-9 px-3 rounded-lg text-[13px] font-bold"
          style={{ color: '#ec4899', border: '1px solid rgba(236,72,153,0.35)', background: 'rgba(236,72,153,0.08)' }}
          data-historias-count={historiasCal.length}
          title={historiasCal.length ? `${historiasCal.length} historias planificadas` : 'Abrir planificador de historias'}
        >
          ◐ Planificador de historias{historiasCal.length ? ` · ${historiasCal.length}` : ''}
        </a>
        <SyncNotionButton />
      </div>
      <PublicacionesView
        publicaciones={pubs}
        marcas={marcas}
        fechasImportantes={fechasImportantes}
        marcasFechas={marcasFechas}
        canManageFechas={canManageFechas}
        historias={historiasCal}
      />
    </>
  )
}
