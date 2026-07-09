// app/app/publicaciones/publicar-hoy/page.tsx
//
// Vista "Publicar hoy" — para quien publica manualmente. Por cada pieza de la
// fecha elegida (default HOY, Lima), los pasos (descargar video/portada, copy,
// música, indicaciones) + botón "Confirmar publicación".
// Pedro 08-jul-2026: navegar por fechas (ayer/hoy/mañana/calendario), ver qué
// faltó o se va a publicar, confirmar (marca publicado + notifica WhatsApp), y
// un historial de la semana.

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { PublicarHoyView, type PublicarHoyItem, type HistorialItem } from './_components/publicar-hoy-view'

export const dynamic = 'force-dynamic'

function ymdLima(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + n * 86400000).toISOString().slice(0, 10)
}
function lunesDeSemana(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = (dt.getUTCDay() + 6) % 7 // lunes = 0
  return new Date(dt.getTime() - dow * 86400000).toISOString().slice(0, 10)
}
function fechaLargo(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const dt = new Date(y, m - 1, d)
  return `${dias[dt.getDay()]} ${d} de ${meses[m - 1]}`
}
function normalizeRedes(plataformas: string[] | null): string[] {
  return (plataformas ?? []).map((p) => {
    const v = (p ?? '').toLowerCase()
    if (v.includes('insta')) return 'instagram'
    if (v.includes('face')) return 'facebook'
    if (v.includes('tik')) return 'tiktok'
    if (v.includes('linke')) return 'linkedin'
    return v
  }).filter(Boolean)
}

type SP = { fecha?: string }

export default async function PublicarHoyPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser()
  const { ensureAccesoModulo } = await import('@/lib/team/permisos-helper')
  await ensureAccesoModulo('publicaciones')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const hoy = ymdLima(new Date())
  const sp = await searchParams
  const fecha = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoy

  /* 3 niveles de SELECT por si faltan columnas nuevas (frase / contenido). */
  const COLS_CONTENIDO = `
    id, nombre, copy, notas, fecha_publicacion, estado, plataformas, publicado_at,
    enlace_musica, portada_editada_url, portada_cruda_url,
    video_con_musica_url, video_sin_musica_url,
    editado, iniciado_edicion_at, editado_at,
    marca:marcas(slug, nombre, emoji_marca, color_primario_hex)
  `
  const COLS = `frase, ${COLS_CONTENIDO}`
  const BASE = `id, nombre, copy, notas, fecha_publicacion, estado, plataformas, publicado_at, marca:marcas(slug, nombre, emoji_marca, color_primario_hex)`

  async function loadFecha(f: string) {
    let res = await service.from('publicaciones').select(COLS).eq('fecha_publicacion', f).order('nombre', { ascending: true })
    if (res.error) res = await service.from('publicaciones').select(COLS_CONTENIDO).eq('fecha_publicacion', f).order('nombre', { ascending: true })
    if (res.error) res = await service.from('publicaciones').select(BASE).eq('fecha_publicacion', f)
    return res.data ?? []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: PublicarHoyItem[] = ((await loadFecha(fecha)) as any[])
    .filter((r) => r.estado !== 'disenar')
    .map((r) => {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      let hora: string | null = null
      if (typeof r.fecha_publicacion === 'string' && r.fecha_publicacion.includes('T')) {
        hora = r.fecha_publicacion.split('T')[1]?.slice(0, 5) ?? null
      }
      return {
        id: r.id as string,
        marcaSlug: (m?.slug ?? '') as string,
        marcaNombre: (m?.nombre ?? 'Marca') as string,
        marcaColor: (m?.color_primario_hex ?? '#737373') as string,
        marcaEmoji: (m?.emoji_marca ?? null) as string | null,
        titulo: (r.nombre ?? '(sin título)') as string,
        copy: (r.copy ?? null) as string | null,
        indicaciones: (r.notas ?? null) as string | null,
        frase: (r.frase ?? null) as string | null,
        publicado: r.estado === 'publicado',
        publicadoAt: (r.publicado_at ?? null) as string | null,
        editando: (!!r.iniciado_edicion_at && !r.editado_at && !r.editado) as boolean,
        videoConMusica: (r.video_con_musica_url ?? null) as string | null,
        videoSinMusica: (r.video_sin_musica_url ?? null) as string | null,
        portada: (r.portada_editada_url ?? r.portada_cruda_url ?? null) as string | null,
        enlaceMusica: (r.enlace_musica ?? null) as string | null,
        redes: normalizeRedes(r.plataformas),
        hora,
      }
    })

  /* Resumen para la navegación: cuántas FALTARON ayer (de hoy) y cuántas hay
     programadas mañana (de hoy). */
  const ayerHoy = addDaysIso(hoy, -1)
  const mananaHoy = addDaysIso(hoy, +1)
  const [ayerRes, mananaRes] = await Promise.all([
    service.from('publicaciones').select('estado').eq('fecha_publicacion', ayerHoy),
    service.from('publicaciones').select('estado').eq('fecha_publicacion', mananaHoy),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendientesAyer = ((ayerRes.data ?? []) as any[]).filter((r) => r.estado !== 'publicado' && r.estado !== 'disenar').length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const programadasManana = ((mananaRes.data ?? []) as any[]).filter((r) => r.estado !== 'disenar').length

  /* Historial de la semana (lunes a domingo de la semana de HOY): lo publicado. */
  const lunes = lunesDeSemana(hoy)
  const domingo = addDaysIso(lunes, 6)
  const histRes = await service
    .from('publicaciones')
    .select('id, nombre, fecha_publicacion, publicado_at, marca:marcas(nombre, emoji_marca, color_primario_hex, slug)')
    .eq('estado', 'publicado')
    .gte('fecha_publicacion', lunes)
    .lte('fecha_publicacion', domingo)
    .order('fecha_publicacion', { ascending: false })
    .then((r: unknown) => r, () => ({ data: [] }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historial: HistorialItem[] = (((histRes as any)?.data ?? []) as any[]).map((r) => {
    const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
    return {
      id: r.id as string,
      titulo: (r.nombre ?? '(sin título)') as string,
      marcaNombre: (m?.nombre ?? 'Marca') as string,
      marcaEmoji: (m?.emoji_marca ?? null) as string | null,
      marcaColor: (m?.color_primario_hex ?? '#737373') as string,
      fecha: (r.fecha_publicacion ?? '') as string,
      publicadoAt: (r.publicado_at ?? null) as string | null,
    }
  })

  return (
    <PublicarHoyView
      items={items}
      fecha={fecha}
      fechaLabel={fechaLargo(fecha)}
      hoy={hoy}
      resumen={{ ayer: ayerHoy, manana: mananaHoy, pendientesAyer, programadasManana }}
      historial={historial}
    />
  )
}
