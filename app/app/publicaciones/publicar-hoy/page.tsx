// app/app/publicaciones/publicar-hoy/page.tsx
//
// Vista "Publicar hoy" — para quien publica manualmente. Lista las
// piezas con fecha_publicacion = HOY (zona Lima) y, por cada una, los
// 4 pasos (descargar video con/sin música, descargar portada, copiar
// copy, abrir música TikTok). Todo el data ya existe en publicaciones.

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { PublicarHoyView, type PublicarHoyItem } from './_components/publicar-hoy-view'

export const dynamic = 'force-dynamic'

function ymdLima(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
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

export default async function PublicarHoyPage() {
  await requireUser()
  const { ensureAccesoModulo } = await import('@/lib/team/permisos-helper')
  await ensureAccesoModulo('publicaciones')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const hoy = ymdLima(new Date())

  // NOTA: la columna `hora_publicacion` NO existe en el schema de Supabase
  // (ver comentario en app/publicaciones/page.tsx). Antes se incluía acá, lo
  // que hacía FALLAR toda la query → caía al BASE reducido (sin video ni
  // portada) → "Publicar hoy" mostraba "(no hay)" aunque el video estuviera.
  // Fix Pedro 15-jun-2026: removida de COLS y del order.
  /* `frase` es una columna NUEVA (migración pendiente). La pedimos en su
     propia tira para NO regresar el bug histórico: si `frase` no existe y la
     pusiéramos en COLS, TODA la query fallaría y caería a BASE (sin video ni
     portada → "(no hay)"). Por eso 3 niveles: con-frase → COLS → BASE. */
  const COLS_CONTENIDO = `
    id, nombre, copy, notas, fecha_publicacion, estado, plataformas,
    enlace_musica, portada_editada_url, portada_cruda_url,
    video_con_musica_url, video_sin_musica_url,
    editado, iniciado_edicion_at, editado_at,
    marca:marcas(slug, nombre, emoji_marca, color_primario_hex)
  `
  const COLS = `frase, ${COLS_CONTENIDO}`
  const BASE = `
    id, nombre, copy, notas, fecha_publicacion, estado, plataformas,
    marca:marcas(slug, nombre, emoji_marca, color_primario_hex)
  `

  let res = await service
    .from('publicaciones')
    .select(COLS)
    .eq('fecha_publicacion', hoy)
    .order('nombre', { ascending: true })
  /* Nivel 2: si falla (probablemente falta `frase`), reintenta SIN frase pero
     conservando video/portada — así no se rompe publicar-hoy antes de la migración. */
  if (res.error) {
    res = await service
      .from('publicaciones')
      .select(COLS_CONTENIDO)
      .eq('fecha_publicacion', hoy)
      .order('nombre', { ascending: true })
  }
  /* Nivel 3: si todavía falla (sync sin columnas de contenido), cae a base. */
  if (res.error) {
    res = await service
      .from('publicaciones')
      .select(BASE)
      .eq('fecha_publicacion', hoy)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: PublicarHoyItem[] = ((res.data ?? []) as any[])
    // Excluir lo ya publicado y las tareas de diseño internas.
    .filter((r) => r.estado !== 'publicado' && r.estado !== 'disenar')
    .map((r) => {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      // No hay columna hora_publicacion; si la fecha trae hora (timestamp), la usamos.
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
        /* "Editándose ahora": alguien arrancó la edición (cronómetro) y aún no
           terminó. Misma definición que la grilla → la tijerita animada
           significa lo mismo en toda la app. Si faltan las columnas (fallback
           BASE) queda en false (no rompe). */
        editando: (!!r.iniciado_edicion_at && !r.editado_at && !r.editado) as boolean,
        videoConMusica: (r.video_con_musica_url ?? null) as string | null,
        videoSinMusica: (r.video_sin_musica_url ?? null) as string | null,
        portada: (r.portada_editada_url ?? r.portada_cruda_url ?? null) as string | null,
        enlaceMusica: (r.enlace_musica ?? null) as string | null,
        redes: normalizeRedes(r.plataformas),
        hora,
      }
    })

  return <PublicarHoyView items={items} fechaLabel={fechaLargo(hoy)} />
}
