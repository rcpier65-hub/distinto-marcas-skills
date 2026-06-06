/* /cockpit — la home de Distinto.
   Server component que hace TODAS las queries reales a Supabase y las
   pasa al CockpitView (client). Antes era 100% mock data, ahora se
   sincroniza con BD:
   - Atender hoy: comentarios_inbox pendientes
   - Hábitos hoy: habitos del user logueado + check de completados de hoy
   - Próximas grabaciones: grabaciones con fecha >= hoy
   - Grillas a enviar: publicaciones de la semana actual agrupadas por marca
   - KPIs: publicaciones de la semana, comentarios respondidos, etc.

   Route guard: si el usuario no tiene permiso "metricas", lo
   redirigimos al primer módulo que SÍ pueda ver. */

import { redirect } from 'next/navigation'
import { CockpitView, type CockpitData } from '@/components/views/CockpitView'
import { getCurrentMemberPermisos, getLandingRoute } from '@/lib/team/permisos-helper'
import { getUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { tieneAcceso, type ModuloPermiso } from '@/lib/team/types'

export const dynamic = 'force-dynamic'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfWeek(): string {
  const d = new Date()
  /* getDay: 0=domingo. Queremos lunes como inicio. */
  const dayDiff = (d.getDay() + 6) % 7  // 0 si lunes, 6 si domingo
  d.setDate(d.getDate() - dayDiff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function endOfWeek(): string {
  const d = new Date()
  const dayDiff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dayDiff + 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function endOfMonth(): string {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
}

function hace(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 60) return `${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `${horas} h`
  const dias = Math.floor(horas / 24)
  return `${dias} d`
}

export default async function CockpitPage() {
  const p = await getCurrentMemberPermisos()

  /* Si HAY miembro y NO tiene permiso métricas → redirect. */
  if (p && !tieneAcceso(p.permisos, 'metricas')) {
    redirect(await getLandingRoute())
  }

  /* Personalizar el saludo */
  let nombreUsuario = 'amigo'
  if (p) {
    nombreUsuario = p.member.nombre.split(/[\s\-]/)[0]
  } else {
    const user = await getUser()
    if (user) {
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>
      const fullName = typeof meta.full_name === 'string' ? meta.full_name : null
      if (fullName) nombreUsuario = fullName.split(/[\s\-]/)[0]
      else if (user.email) nombreUsuario = user.email.split('@')[0]
    }
  }
  nombreUsuario = nombreUsuario.charAt(0).toUpperCase() + nombreUsuario.slice(1).toLowerCase()

  const puedeVerFinanzas = p
    ? tieneAcceso(p.permisos, 'finanzas' as ModuloPermiso)
    : true

  /* ============ Queries reales a Supabase ============ */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const user = await getUser()
  const hoy = todayStr()
  const inicioSemana = startOfWeek()
  const finSemana = endOfWeek()
  const inicioMes = startOfMonth()
  const finMes = endOfMonth()

  /* Helper: resolver team_member_id para filtrar hábitos por user */
  let teamMemberIdHabitos: string | null = null
  if (user) {
    const { data: tm } = await service
      .from('team_members')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    teamMemberIdHabitos = tm?.id ?? null
  }

  /* Lanzamos todas las queries en paralelo */
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
  ] = await Promise.all([
    /* Atender hoy: comentarios pendientes (top 8) */
    service
      .from('comentarios_inbox')
      .select(`
        id, autor_username, autor_nombre, comentario_texto,
        recibido_at, categoria, red_social,
        marca:marcas(slug, nombre, color_primario_hex)
      `)
      .eq('estado', 'pendiente')
      .order('recibido_at', { ascending: false })
      .limit(8),
    /* Publicaciones de esta semana */
    service
      .from('publicaciones')
      .select(`id, estado, marca:marcas(slug, nombre, color_primario_hex)`)
      .gte('fecha_publicacion', inicioSemana)
      .lte('fecha_publicacion', finSemana),
    /* Publicaciones del mes para "grillas enviadas" */
    service
      .from('publicaciones')
      .select('id, estado, fecha_publicacion')
      .gte('fecha_publicacion', inicioMes)
      .lte('fecha_publicacion', finMes),
    /* Hábitos del usuario actual */
    teamMemberIdHabitos
      ? service
          .from('habitos')
          .select('id, nombre, icono, color, dias_activos, orden')
          .eq('activo', true)
          .eq('team_member_id', teamMemberIdHabitos)
          .order('orden')
      : service
          .from('habitos')
          .select('id, nombre, icono, color, dias_activos, orden')
          .eq('activo', true)
          .is('team_member_id', null)
          .order('orden'),
    /* Hábitos completados hoy */
    service
      .from('habitos_completados')
      .select('habito_id')
      .eq('fecha', hoy),
    /* Próximas grabaciones (fecha >= hoy) */
    service
      .from('grabaciones')
      .select(`id, fecha, hora, descripcion, marca:marcas(slug, nombre, color_primario_hex)`)
      .gte('fecha', hoy)
      .order('fecha', { ascending: true })
      .limit(5),
    /* Marcas activas — para "9 marcas activas" del subtítulo */
    service.from('marcas').select('id, slug').eq('activo', true),
    /* Grillas enviadas este mes = publicaciones con estado 'programar' o 'publicado'.
       Aproximación razonable hasta que tengamos tabla grillas_enviadas. */
    service
      .from('publicaciones')
      .select('id', { count: 'exact', head: true })
      .gte('fecha_publicacion', inicioMes)
      .lte('fecha_publicacion', finMes)
      .in('estado', ['programar', 'enviado', 'programar_anuncios']),
    /* Comentarios respondidos este mes */
    service
      .from('comentarios_inbox')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'respondido')
      .gte('recibido_at', `${inicioMes}T00:00:00Z`)
      .lte('recibido_at', `${finMes}T23:59:59Z`),
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

  const completadosSet = new Set(habitosCompletados.map((c) => c.habito_id as string))

  /* Comentarios pendientes filtrados por marcas del usuario */
  const comentariosVisibles = comentarios
    .filter((c) => {
      if (!p || p.marcasAcceso === null) return true
      const marcaArr = Array.isArray(c.marca) ? c.marca[0] : c.marca
      if (!marcaArr) return false
      return p.marcasAcceso.includes(marcaArr.id ?? marcaArr.slug)
    })
    .slice(0, 5)
    .map((c) => {
      const marcaArr = Array.isArray(c.marca) ? c.marca[0] : c.marca
      return {
        id: c.id as string,
        marcaSlug: (marcaArr?.slug ?? 'unknown') as string,
        marcaNombre: (marcaArr?.nombre ?? marcaArr?.slug ?? 'Marca') as string,
        marcaColor: (marcaArr?.color_primario_hex ?? '#737373') as string,
        autor: (c.autor_username || c.autor_nombre || 'Anónimo') as string,
        texto: (c.comentario_texto ?? '') as string,
        hace: hace(c.recibido_at as string),
        categoria: (c.categoria ?? 'consulta') as string,
        red: (c.red_social ?? 'instagram') as string,
      }
    })

  /* Grillas semana agrupadas por marca */
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
    /* "aprobada" si todas están en programar/enviado, "pendiente" si
       alguna en aprobar, "borrador" si todas en editar/borrador */
    const est = pub.estado as string
    if (est === 'aprobar' || est === 'programar' || est === 'enviado') {
      existing.estado = existing.estado === 'borrador' ? 'pendiente' : existing.estado
      if (est === 'programar' || est === 'enviado') existing.estado = 'aprobada'
    }
    grillasMap.set(slug, existing)
  }
  const grillas = Array.from(grillasMap.values()).slice(0, 6)
  const grillasParaEnviarHoy = grillas.filter((g) => g.estado === 'aprobada').length

  /* Hábitos hoy */
  const habitosHoy = habitos.map((h) => ({
    id: h.id as string,
    titulo: h.nombre as string,
    icono: (h.icono ?? '✅') as string,
    color: (h.color ?? '#6366F1') as string,
    completado: completadosSet.has(h.id as string),
  }))
  const habitosCompletadosHoyCount = habitosHoy.filter((h) => h.completado).length

  /* Próximas grabaciones */
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const grabacionesProximas = grabaciones.map((g) => {
    const f = new Date((g.fecha as string) + 'T00:00:00')
    const marcaArr = Array.isArray(g.marca) ? g.marca[0] : g.marca
    return {
      fechaCorta: `${diasSemana[f.getDay()]} ${f.getDate()}`.toUpperCase(),
      fechaCompleta: `${f.getDate()} ${meses[f.getMonth()]}`,
      hora: (g.hora ?? '—') as string,
      tipo: (g.descripcion ?? 'Sin descripción') as string,
      marcaSlug: (marcaArr?.slug ?? 'unknown') as string,
      marcaNombre: (marcaArr?.nombre ?? marcaArr?.slug ?? 'Marca') as string,
      marcaColor: (marcaArr?.color_primario_hex ?? '#737373') as string,
    }
  })

  /* KPIs reales */
  const pubsEditadosMes = pubsMes.filter((p) =>
    ['aprobar', 'programar', 'enviado', 'programar_anuncios'].includes(p.estado as string)
  ).length

  const data: CockpitData = {
    nombreUsuario,
    puedeVerFinanzas,
    marcasActivasCount: marcas.length,
    comentariosPendientesTotal: comentarios.length,  // sin filtrar — el total
    grillasParaEnviarHoy,
    comentariosVisibles,
    grillas,
    habitos: habitosHoy,
    habitosCompletadosHoy: habitosCompletadosHoyCount,
    grabacionesProximas,
    metricas: {
      publicacionesEstaSemana: pubsSemana.length,
      comentariosRespondidosMes: (comentariosRespondidosResult.count ?? 0) as number,
      comentariosPendientes: comentarios.length,
      grillasEnviadasMes: (grillasEnviadasResult.count ?? 0) as number,
      publicacionesEditadasMes: pubsEditadosMes,
    },
  }

  return <CockpitView data={data} />
}
