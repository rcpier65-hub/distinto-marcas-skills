// app/lib/cockpit/load-cockpit-data.ts
//
// Helper server-side que carga TODOS los datos para el dashboard
// ejecutivo (lo que antes era CockpitPage). Pedro unificó Cockpit con
// Inicio, así que esta misma data ahora alimenta el bloque embebido
// dentro de /inicio para users con permiso 'metricas'.
//
// Se ejecuta SOLO si user tiene permiso 'metricas' (o es admin/owner).
// Para miembros sin métricas (Ailyn, Pieer) no se llama nunca.

import type { CockpitData } from '@/components/views/CockpitView'
import type { PermisosEfectivos } from '@/lib/team/permisos-helper'
import { formatHora12 } from '@/lib/utils/format-hora'

type AnyService = ReturnType<typeof import('@/lib/supabase/service').createServiceClient>

const TZ_LIMA = 'America/Lima'

function ymdLima(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_LIMA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

function startOfWeek(): string {
  const d = new Date()
  const dayDiff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dayDiff)
  return ymdLima(d)
}
function endOfWeek(): string {
  const d = new Date()
  const dayDiff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dayDiff + 6)
  return ymdLima(d)
}
function startOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function endOfMonth(): string {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
}

function hace(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`
  return `${Math.floor(diff / 86400)} d`
}

type LoadOpts = {
  nombreUsuario: string
  puedeVerFinanzas: boolean
  /* team_member_id del user (null si admin/owner). Sirve para filtrar
     hábitos. Para el cockpit es el del miembro logueado. */
  teamMemberIdHabitos: string | null
  /* Permisos efectivos para filtrar comentarios por marcas accesibles */
  permisos: PermisosEfectivos | null
}

export async function loadCockpitData(
  service: AnyService,
  opts: LoadOpts,
): Promise<CockpitData> {
  const hoy = ymdLima(new Date())
  const inicioSemana = startOfWeek()
  const finSemana = endOfWeek()
  const inicioMes = startOfMonth()
  const finMes = endOfMonth()

  /* Queries en paralelo */
  const [
    comentariosResult,
    pubsSemanaResult,
    pubsMesResult,
    habitosResult,
    habitosCompletadosHoyResult,
    grabacionesResult,
    marcasResult,
    grillasEnviadasResult,
    comentariosRespondidosResult,
    disenoResult,
    videosEditandoHoyResult,
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from('comentarios_inbox')
      .select(`
        id, author_username, author_name, author_display_name, comment_text,
        comment_created_at, categoria_sugerida, network,
        marca:marcas(slug, nombre, color_primario_hex, emoji_marca)
      `)
      .eq('status', 'pending')
      .order('comment_created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from('publicaciones')
      .select(`id, estado, marca:marcas(slug, nombre, color_primario_hex)`)
      .gte('fecha_publicacion', inicioSemana)
      .lte('fecha_publicacion', finSemana),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from('publicaciones')
      .select('id, estado, fecha_publicacion')
      .gte('fecha_publicacion', inicioMes)
      .lte('fecha_publicacion', finMes),
    opts.teamMemberIdHabitos
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (service as any)
          .from('habitos')
          .select('id, nombre, icono, color, dias_activos, orden')
          .eq('activo', true)
          .eq('team_member_id', opts.teamMemberIdHabitos)
          .order('orden')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (service as any)
          .from('habitos')
          .select('id, nombre, icono, color, dias_activos, orden')
          .eq('activo', true)
          .is('team_member_id', null)
          .order('orden'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from('habitos_completados')
      .select('habito_id')
      .eq('fecha', hoy),
    /* Columnas REALES en tabla grabaciones: fecha_planeada, hora_planeada,
       estado, notas, marca_id (NO 'fecha'/'hora'/'descripcion' como
       creíamos). Filtramos por estado != 'completada' para no mostrar
       grabaciones ya hechas. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from('grabaciones')
      .select(`id, fecha_planeada, hora_planeada, estado, notas, marca:marcas(slug, nombre, color_primario_hex, emoji_marca)`)
      .gte('fecha_planeada', hoy)
      .neq('estado', 'completada')
      .order('fecha_planeada', { ascending: true })
      .order('hora_planeada', { ascending: true, nullsFirst: false })
      .limit(5),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).from('marcas').select('id, slug, nombre, color_primario_hex').eq('activa', true),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from('publicaciones')
      .select('id', { count: 'exact', head: true })
      .gte('fecha_publicacion', inicioMes)
      .lte('fecha_publicacion', finMes)
      .in('estado', ['programar', 'enviado', 'programar_anuncios']),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from('comentarios_inbox')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'responded')
      .gte('responded_at', `${inicioMes}T00:00:00Z`)
      .lte('responded_at', `${finMes}T23:59:59Z`),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from('publicaciones')
      .select(`id, nombre, fecha_diseno, estado_tarea, marca:marcas(slug, nombre, color_primario_hex)`)
      .eq('estado', 'disenar')
      .eq('portada_lista', false)
      .order('fecha_diseno', { ascending: true, nullsFirst: false })
      .limit(6),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)
      .from('publicaciones')
      .select(`id, nombre, editor_nombre, marca:marcas(slug, nombre, color_primario_hex)`)
      .eq('fecha_marcada_para_editar', hoy)
      .limit(10),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comentarios = (comentariosResult.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pubsSemana = (pubsSemanaResult.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pubsMes = (pubsMesResult.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitos = (habitosResult.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitosCompletados = (habitosCompletadosHoyResult.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grabaciones = (grabacionesResult.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = (marcasResult.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diseno = (disenoResult.data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videosEditando = (videosEditandoHoyResult.data ?? []) as any[]

  const completadosSet = new Set(habitosCompletados.map((c) => c.habito_id as string))

  const comentariosVisibles = comentarios
    .filter((c) => {
      if (!opts.permisos || opts.permisos.marcasAcceso === null) return true
      const marcaArr = Array.isArray(c.marca) ? c.marca[0] : c.marca
      if (!marcaArr) return false
      return opts.permisos.marcasAcceso.includes(marcaArr.id ?? marcaArr.slug)
    })
    .map((c) => {
      const marcaArr = Array.isArray(c.marca) ? c.marca[0] : c.marca
      return {
        id: c.id as string,
        marcaSlug: (marcaArr?.slug ?? 'unknown') as string,
        marcaNombre: (marcaArr?.nombre ?? marcaArr?.slug ?? 'Marca') as string,
        marcaColor: (marcaArr?.color_primario_hex ?? '#737373') as string,
        marcaEmoji: ((marcaArr?.emoji_marca ?? null) as string | null),
        autor: (c.author_display_name || c.author_username || c.author_name || 'Anónimo') as string,
        texto: (c.comment_text ?? '') as string,
        hace: hace(c.comment_created_at as string),
        categoria: (c.categoria_sugerida ?? 'consulta') as string,
        red: (c.network ?? 'instagram') as string,
      }
    })

  const grillasMap = new Map<string, { marcaSlug: string; marcaNombre: string; marcaColor: string; publicaciones: number; estado: string }>()
  for (const pub of pubsSemana) {
    const marcaArr = Array.isArray(pub.marca) ? pub.marca[0] : pub.marca
    if (!marcaArr) continue
    const slug = marcaArr.slug as string
    const existing = grillasMap.get(slug) ?? {
      marcaSlug: slug,
      marcaNombre: (marcaArr.nombre ?? slug) as string,
      marcaColor: (marcaArr.color_primario_hex ?? '#737373') as string,
      publicaciones: 0,
      estado: 'borrador',
    }
    existing.publicaciones++
    const est = pub.estado as string
    if (est === 'aprobar' || est === 'programar' || est === 'enviado') {
      existing.estado = existing.estado === 'borrador' ? 'pendiente' : existing.estado
      if (est === 'programar' || est === 'enviado') existing.estado = 'aprobada'
    }
    grillasMap.set(slug, existing)
  }
  const grillas = Array.from(grillasMap.values()).slice(0, 6)
  const grillasParaEnviarHoy = grillas.filter((g) => g.estado === 'aprobada').length

  const habitosHoy = habitos.map((h) => ({
    id: h.id as string,
    titulo: h.nombre as string,
    icono: (h.icono ?? '✅') as string,
    color: (h.color ?? '#6366F1') as string,
    completado: completadosSet.has(h.id as string),
  }))
  const habitosCompletadosHoyCount = habitosHoy.filter((h) => h.completado).length

  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const grabacionesProximas = grabaciones.map((g) => {
    /* fecha_planeada llega como Date/timestamp ISO. Forzamos parse a
       fecha LOCAL para evitar el bug típico de zona horaria que
       desplaza un día. */
    const rawFecha = g.fecha_planeada as string
    const ymd = typeof rawFecha === 'string' ? rawFecha.slice(0, 10) : ''
    const f = new Date(ymd + 'T12:00:00')
    const marcaArr = Array.isArray(g.marca) ? g.marca[0] : g.marca
    /* hora_planeada llega como 'HH:MM:SS'. Convertimos a 12h con AM/PM
       (Pedro lo prefiere así para el equipo de campo). Si no hay hora,
       mostramos '—' como antes. */
    const horaStr = g.hora_planeada ? formatHora12(String(g.hora_planeada)) : '—'
    /* Si no hay notas, fallback a 'Grabación · MarcaNombre' para que
       no se vea 'Sin descripción' que era el comportamiento anterior. */
    const nombreMarca = (marcaArr?.nombre ?? marcaArr?.slug ?? 'Marca') as string
    const tipo = (g.notas as string | null) && (g.notas as string).trim().length > 0
      ? (g.notas as string)
      : `Grabación · ${nombreMarca}`
    return {
      fechaCorta: `${diasSemana[f.getDay()]} ${f.getDate()}`.toUpperCase(),
      fechaCompleta: `${f.getDate()} ${meses[f.getMonth()]}`,
      hora: horaStr,
      tipo,
      marcaSlug: (marcaArr?.slug ?? 'unknown') as string,
      marcaNombre: nombreMarca,
      marcaColor: (marcaArr?.color_primario_hex ?? '#737373') as string,
    }
  })

  const pubsEditadosMes = pubsMes.filter((p) =>
    ['aprobar', 'programar', 'enviado', 'programar_anuncios'].includes(p.estado as string)
  ).length

  const marcasConGrabacion = new Set<string>()
  for (const g of grabaciones) {
    const m = Array.isArray(g.marca) ? g.marca[0] : g.marca
    if (m?.slug) marcasConGrabacion.add(m.slug as string)
  }
  const marcasSinGrabacion = marcas
    .filter((m) => !marcasConGrabacion.has(m.slug))
    .map((m) => ({
      slug: m.slug as string,
      nombre: (m.nombre ?? m.slug) as string,
      color: (m.color_primario_hex ?? '#737373') as string,
    }))

  const tareasDiseno = diseno.map((d) => {
    const m = Array.isArray(d.marca) ? d.marca[0] : d.marca
    return {
      id: d.id as string,
      nombre: (d.nombre ?? '—') as string,
      marcaSlug: (m?.slug ?? 'unknown') as string,
      marcaNombre: (m?.nombre ?? 'Marca') as string,
      marcaColor: (m?.color_primario_hex ?? '#737373') as string,
      estadoTarea: (d.estado_tarea ?? 'sin_empezar') as string,
      fechaDiseno: (d.fecha_diseno ?? null) as string | null,
    }
  })

  const videosEditandoHoy = videosEditando.map((v) => {
    const m = Array.isArray(v.marca) ? v.marca[0] : v.marca
    return {
      id: v.id as string,
      nombre: (v.nombre ?? '—') as string,
      editorNombre: (v.editor_nombre ?? null) as string | null,
      marcaSlug: (m?.slug ?? 'unknown') as string,
      marcaNombre: (m?.nombre ?? 'Marca') as string,
      marcaColor: (m?.color_primario_hex ?? '#737373') as string,
    }
  })

  return {
    nombreUsuario: opts.nombreUsuario,
    puedeVerFinanzas: opts.puedeVerFinanzas,
    marcasActivasCount: marcas.length,
    comentariosPendientesTotal: comentarios.length,
    grillasParaEnviarHoy,
    comentariosVisibles,
    grillas,
    habitos: habitosHoy,
    habitosCompletadosHoy: habitosCompletadosHoyCount,
    grabacionesProximas,
    marcasSinGrabacion,
    tareasDiseno,
    videosEditandoHoy,
    metricas: {
      publicacionesEstaSemana: pubsSemana.length,
      comentariosRespondidosMes: (comentariosRespondidosResult.count ?? 0) as number,
      comentariosPendientes: comentarios.length,
      grillasEnviadasMes: (grillasEnviadasResult.count ?? 0) as number,
      publicacionesEditadasMes: pubsEditadosMes,
    },
  }
}
