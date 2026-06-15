// app/app/inicio/page.tsx
//
// Dashboard de bienvenida personalizado para CADA miembro del equipo.
// Pedro pidió que cada usuario que entre vea un saludo + acceso rápido
// a sus módulos + hábitos del día. Es el landing default para los
// miembros (no para admin, que sigue yendo a /cockpit con métricas).
//
// El contenido se adapta al rol:
//   - Editor (Pieer): videos por editar + tareas asignadas
//   - Diseñador (Ailyn): tareas de diseño pendientes
//   - Community Manager (Lorena): comentarios pendientes
//   - Social Media Manager / Director: vista resumen
//   - Admin / owner sin team_member: redirige a /cockpit
//
// Hábitos del día (los del user) siempre visibles en una columna lateral.

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { tieneAcceso, type ModuloPermiso } from '@/lib/team/types'
import { InicioView, type InicioData } from './_components/inicio-view'
import { getFraseDelDia } from '@/lib/inicio/get-frase-del-dia'
import { loadCockpitData } from '@/lib/cockpit/load-cockpit-data'
import { getMarcasNav } from '@/lib/marcas/get-marcas-nav'
import { loadReporteDelDia } from '@/lib/inicio/load-reporte-del-dia'
import { getTrabajoEquipo } from '@/lib/inicio/get-trabajo-equipo'
import { formatHora12 } from '@/lib/utils/format-hora'

export const dynamic = 'force-dynamic'

/* Fecha YMD en zona Lima (UTC-5). El server de Vercel corre en UTC, así
   que sin esto el día cambia 5 horas antes de tiempo (Pedro 7pm = UTC
   00:00 día siguiente). Forzamos zona Lima usando Intl. */
const TZ_LIMA = 'America/Lima'

function todayStr(): string {
  /* Intl format en-CA da YYYY-MM-DD directo */
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_LIMA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

/* Hora 0-23 en zona Lima para decidir Buenos días / Tardes / Noches */
function horaLima(): number {
  const s = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ_LIMA, hour: '2-digit', hour12: false,
  }).format(new Date())
  return parseInt(s, 10)
}

function saludoSegunHora(): string {
  const h = horaLima()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

type SP = { welcome?: string }

export default async function InicioPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const showWelcome = sp.welcome === '1'

  const user = await requireUser()
  const p = await getCurrentMemberPermisos()

  /* Pedro pidió: admin (sin team_member) también debe tener su /inicio
     bonito. Antes redirigíamos a /cockpit; ahora renderizamos /inicio
     con datos del owner. /cockpit sigue accesible desde el sidebar.
     Además: pedro@agenciadistinto.com es team_member con rol_base
     'director' pero debe verse EXACTAMENTE como la cuenta admin
     (porque es el CEO). Tratamos rol director como vista "admin-like"
     para que vea TODAS las publicaciones, no solo las asignadas. */
  const esAdmin = !p
  const esCEO = esAdmin || (p?.member.rol_base === 'director')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const hoy = todayStr()

  /* Datos del miembro: si es admin sintetizamos un perfil mínimo
     usando el email/nombre del usuario de auth. */
  const memberData = esAdmin ? {
    id: null as string | null,
    nombre: (user.user_metadata?.nombre as string | undefined) ?? user.email?.split('@')[0] ?? 'Pedro',
    avatar_url: null as string | null,
    cargo_personalizado: 'CEO · Distinto Agencia' as string | null,
    rol_base: 'director' as string,  /* frases de director, ícono estrella */
    fecha_cumpleanos: null as string | null,
    rolNombre: 'Owner / Admin',
  } : {
    id: p!.member.id,
    nombre: p!.member.nombre,
    avatar_url: p!.member.avatar_url,
    cargo_personalizado: p!.member.cargo_personalizado,
    rol_base: p!.member.rol_base,
    fecha_cumpleanos: p!.member.fecha_cumpleanos,
    /* Si es director, mostramos 'Owner / Admin' como rolNombre para
       que la UI lo trate igual que al admin sin team_member. */
    rolNombre: p!.member.rol_base === 'director' ? 'Owner / Admin' : p!.rol.nombre,
  }

  const primerNombre = memberData.nombre.split(/[\s\-]/)[0]
  const nombreCapitalizado = primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase()

  /* modulosAccesibles ya no se usa para renderizar (las cards las decide
     el componente cliente por rol). Lo dejamos para no romper InicioData. */
  const modulosAccesibles: Array<{ key: string; label: string; href: string; color: string; icon: string }> = []

  /* Hábitos del día (los del user actual) + historial de los últimos 7
     días para los círculos clickeables del tracker en la home.
     Cargar historial es CRUCIAL: sin él los días anteriores
     aparecerían vacíos aunque el user los hubiera marcado. */
  const desde7 = new Date()
  desde7.setDate(desde7.getDate() - 6)
  const desde7Str = desde7.toISOString().slice(0, 10)

  /* Habitos del miembro o del admin (team_member_id NULL).
     Para admin filtramos con .is() porque .eq(null) no funciona en pg. */
  let habitosQuery = service
    .from('habitos')
    .select('id, nombre, icono, color, orden')
    .eq('activo', true)
    .order('orden')
  if (memberData.id) {
    habitosQuery = habitosQuery.eq('team_member_id', memberData.id)
  } else {
    habitosQuery = habitosQuery.is('team_member_id', null)
  }
  const { data: habitos } = await habitosQuery

  const habitoIds = ((habitos ?? []) as Array<{ id: string }>).map((h) => h.id)

  const { data: completados } = habitoIds.length > 0 ? await service
    .from('habitos_completados')
    .select('habito_id, fecha')
    .in('habito_id', habitoIds)
    .gte('fecha', desde7Str)
    : { data: [] }

  /* Map habito_id → Set de fechas YYYY-MM-DD cumplidas en últimos 7 días */
  const historialPorHabito = new Map<string, string[]>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const c of (completados ?? []) as any[]) {
    const arr = historialPorHabito.get(c.habito_id as string) ?? []
    arr.push(c.fecha as string)
    historialPorHabito.set(c.habito_id as string, arr)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitosHoy = ((habitos ?? []) as any[]).map((h) => {
    const hist = historialPorHabito.get(h.id as string) ?? []
    return {
      id: h.id as string,
      nombre: h.nombre as string,
      icono: (h.icono ?? '✅') as string,
      color: (h.color ?? '#6366F1') as string,
      completado: hist.includes(hoy),
      historial: hist,
    }
  })

  /* Datos contextuales según el rol */
  let tareasMias: InicioData['tareasMias'] = []

  if (esCEO) {
    /* Admin/CEO: mostrar las publicaciones más recientes pendientes de
       cualquier estado activo (no archivado), para tener pulso del día.
       Aplica para Pedro como owner sin team_member Y también para
       pedro@agenciadistinto.com con rol director. */
    const { data } = await service
      .from('publicaciones')
      .select(`id, nombre, fecha_publicacion, estado, marca:marcas(slug, nombre, color_primario_hex)`)
      .in('estado', ['tareas', 'idear', 'disenar', 'editar', 'aprobar', 'programar'])
      .order('fecha_publicacion', { ascending: true, nullsFirst: false })
      .limit(3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tareasMias = ((data ?? []) as any[]).map((r) => {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      return {
        id: r.id as string,
        nombre: (r.nombre ?? '—') as string,
        marca: (m?.nombre ?? m?.slug ?? 'Marca') as string,
        marcaColor: (m?.color_primario_hex ?? '#737373') as string,
        meta: r.fecha_publicacion
          ? `${r.estado} · ${new Date(r.fecha_publicacion + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
          : (r.estado as string),
        marcadaHoy: false,
        modulo: 'editor' as const, /* solo para tipear, el título no se usa */
      }
    })
  } else if (tieneAcceso(p!.permisos, 'editor')) {
    /* Editor: videos asignados a su nombre con estado='editar' */
    const { data } = await service
      .from('publicaciones')
      .select(`id, nombre, fecha_publicacion, fecha_edicion, fecha_marcada_para_editar, editor_nombre, marca:marcas(slug, nombre, color_primario_hex)`)
      .ilike('editor_nombre', memberData.nombre)
      .eq('estado', 'editar')
      .order('fecha_publicacion', { ascending: true, nullsFirst: false })
      .limit(3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tareasMias = ((data ?? []) as any[]).map((r) => {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      return {
        id: r.id as string,
        nombre: (r.nombre ?? '—') as string,
        marca: (m?.nombre ?? m?.slug ?? 'Marca') as string,
        marcaColor: (m?.color_primario_hex ?? '#737373') as string,
        meta: r.fecha_publicacion
          ? `Publica ${new Date(r.fecha_publicacion + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
          : 'Sin fecha',
        marcadaHoy: r.fecha_marcada_para_editar === hoy,
        modulo: 'editor' as const,
      }
    })
  } else if (tieneAcceso(p!.permisos, 'diseno')) {
    /* Diseñadora: SOLO tareas del módulo Diseño (es_tarea_diseno=true).
       Las pubs del pipeline en etapa 'disenar' no son suyas (modelo
       Notion de Pedro: Diseño = base de datos aparte). Excluimos las
       terminadas/archivadas. */
    const { data } = await service
      .from('publicaciones')
      .select(`id, nombre, fecha_diseno, estado_tarea, marca:marcas(slug, nombre, color_primario_hex)`)
      .eq('es_tarea_diseno', true)
      .not('estado_tarea', 'in', '(listo,archivado)')
      .order('fecha_diseno', { ascending: true, nullsFirst: false })
      .limit(3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tareasMias = ((data ?? []) as any[]).map((r) => {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      return {
        id: r.id as string,
        nombre: (r.nombre ?? '—') as string,
        marca: (m?.nombre ?? m?.slug ?? 'Marca') as string,
        marcaColor: (m?.color_primario_hex ?? '#737373') as string,
        meta: r.fecha_diseno
          ? `Entrega ${new Date(r.fecha_diseno + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
          : 'Sin fecha',
        marcadaHoy: false,
        modulo: 'diseno' as const,
      }
    })
  } else if (tieneAcceso(p!.permisos, 'comentarios') || tieneAcceso(p!.permisos, 'inbox')) {
    /* Community Manager: comentarios pendientes */
    const { data } = await service
      .from('comentarios_inbox')
      .select(`id, author_username, author_display_name, comment_text, marca:marcas(slug, nombre, color_primario_hex)`)
      .eq('status', 'pending')
      .order('comment_created_at', { ascending: false })
      .limit(3)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tareasMias = ((data ?? []) as any[]).map((r) => {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      return {
        id: r.id as string,
        nombre: ((r.comment_text ?? '').substring(0, 60) || '—') as string,
        marca: (m?.nombre ?? m?.slug ?? 'Marca') as string,
        marcaColor: (m?.color_primario_hex ?? '#737373') as string,
        meta: `@${r.author_display_name || r.author_username || 'anon'}`,
        marcadaHoy: false,
        modulo: 'comentarios' as const,
      }
    })
  }

  /* Reuniones pendientes (publicaciones con reunion_hora seteada
     y fecha_publicacion futura o de hoy). */
  let reuniones: InicioData['reuniones'] = []
  if (esCEO || tieneAcceso(p!.permisos, 'publicaciones') || tieneAcceso(p!.permisos, 'editor') || tieneAcceso(p!.permisos, 'diseno')) {
    const { data: reuRaw } = await service
      .from('publicaciones')
      .select(`id, nombre, fecha_publicacion, reunion_hora, marca:marcas(slug, nombre, color_primario_hex)`)
      .not('reunion_hora', 'is', null)
      .gte('fecha_publicacion', hoy)
      .order('fecha_publicacion', { ascending: true })
      .order('reunion_hora', { ascending: true })
      .limit(6)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reuniones = ((reuRaw ?? []) as any[]).map((r) => {
      const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
      const fechaDate = new Date(r.fecha_publicacion + 'T00:00:00')
      const esHoy = r.fecha_publicacion === hoy
      const cuando = esHoy
        ? 'Hoy'
        : fechaDate.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' })
      /* Hora en 12h con AM/PM (Pedro lo prefiere así). */
      const hora = formatHora12((r.reunion_hora as string) ?? '')
      return {
        id: r.id as string,
        titulo: (r.nombre ?? 'Reunión') as string,
        marca: (m?.nombre ?? m?.slug ?? '—') as string,
        marcaColor: (m?.color_primario_hex ?? '#737373') as string,
        cuando,
        hora,
        esHoy,
      }
    })
  }

  /* Grabaciones próximas — para roles que SÍ graban (editor, CM, SMM,
     director, admin). Pedro: 'editor y Lorena deben ver aviso tienes
     grabación el día X. Ailyn no porque ella no graba'. */
  type GrabacionProxima = {
    id: string
    fechaCorta: string  // 'Mié 17 jun'
    horaTexto: string   // '10:00 AM' o '—'
    marca: string
    marcaColor: string
    marcaEmoji: string | null
    esHoy: boolean
    esManana: boolean
  }
  let grabacionesProximas: GrabacionProxima[] = []
  const rolesQueGraban = ['editor', 'community_manager', 'social_media_manager', 'director']
  const grabaAlgo = esCEO || rolesQueGraban.includes(memberData.rol_base)
  if (grabaAlgo) {
    const { data: grRaw } = await service
      .from('grabaciones')
      .select(`id, fecha_planeada, hora_planeada, estado, marca:marcas(slug, nombre, color_primario_hex, emoji_marca)`)
      .gte('fecha_planeada', hoy)
      .neq('estado', 'completada')
      .order('fecha_planeada', { ascending: true })
      .order('hora_planeada', { ascending: true, nullsFirst: false })
      .limit(4)
    const diasSemanaCorto = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const mesesCorto = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const hoyDate = new Date(hoy + 'T12:00:00')
    const manana = new Date(hoyDate)
    manana.setDate(manana.getDate() + 1)
    const mananaStr = manana.toISOString().slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    grabacionesProximas = ((grRaw ?? []) as any[]).map((g) => {
      const m = Array.isArray(g.marca) ? g.marca[0] : g.marca
      const rawFecha = g.fecha_planeada as string
      const ymd = typeof rawFecha === 'string' ? rawFecha.slice(0, 10) : ''
      const f = new Date(ymd + 'T12:00:00')
      return {
        id: g.id as string,
        fechaCorta: `${diasSemanaCorto[f.getDay()]} ${f.getDate()} ${mesesCorto[f.getMonth()]}`,
        horaTexto: g.hora_planeada ? formatHora12(String(g.hora_planeada)) : '—',
        marca: (m?.nombre ?? m?.slug ?? 'Marca') as string,
        marcaColor: (m?.color_primario_hex ?? '#737373') as string,
        marcaEmoji: (m?.emoji_marca ?? null) as string | null,
        esHoy: ymd === hoy,
        esManana: ymd === mananaStr,
      }
    })
  }

  /* Cumple hoy? */
  let cumpleHoy = false
  if (memberData.fecha_cumpleanos) {
    const cumple = new Date(memberData.fecha_cumpleanos + 'T00:00:00')
    const ahora = new Date()
    cumpleHoy = cumple.getMonth() === ahora.getMonth() && cumple.getDate() === ahora.getDate()
  }

  /* Frase del día según el rol. Primeros 60 días = secuencial,
     después aleatoria determinista por (miembro, día).
     Para admin usamos el user.id como seed para que tenga su rotación. */
  const seedId = memberData.id ?? user.id
  const fraseDia = getFraseDelDia(memberData.rol_base, seedId)

  /* Pendientes rápidos NO completados del miembro o del admin (team_member_id NULL) */
  let pendientesQuery = service
    .from('pendientes_rapidos')
    .select('id, titulo, descripcion, categoria, prioridad, completado, created_at')
    .eq('completado', false)
    .order('prioridad', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(30)
  if (memberData.id) {
    pendientesQuery = pendientesQuery.eq('team_member_id', memberData.id)
  } else {
    pendientesQuery = pendientesQuery.is('team_member_id', null)
  }
  const { data: pendientesRaw } = await pendientesQuery
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendientes = ((pendientesRaw ?? []) as any[]).map((row) => ({
    id: row.id as string,
    titulo: row.titulo as string,
    descripcion: (row.descripcion ?? null) as string | null,
    categoria: row.categoria as string,
    prioridad: row.prioridad as 1 | 2 | 3,
    completado: row.completado as boolean,
    created_at: row.created_at as string,
  }))

  /* Cockpit ejecutivo embebido — Pedro unificó Cockpit con Inicio.
     Solo lo cargamos si el user tiene permiso 'metricas' (admin/director/CM
     con permiso explícito). Si NO tiene, el bloque cockpit no aparece y
     la home queda en versión simple. */
  const verCockpit = esCEO || (p && tieneAcceso(p.permisos, 'metricas' as ModuloPermiso))
  const puedeVerFinanzas = esCEO || (p && tieneAcceso(p.permisos, 'finanzas' as ModuloPermiso)) || false

  /* Cargamos cockpitData, lista de marcas y el reporte del día en
     paralelo. marcasNav viene de la tabla `marcas` (Supabase) → cualquier
     marca creada en /dashboard aparece automáticamente en cards y
     dropdowns del cockpit, sin tocar el mock estático. */
  const [cockpitDataRaw, marcasNav, reporteDelDia] = await Promise.all([
    verCockpit
      ? loadCockpitData(service, {
          nombreUsuario: nombreCapitalizado,
          puedeVerFinanzas,
          teamMemberIdHabitos: memberData.id,
          permisos: p,
        })
      : Promise.resolve(null),
    getMarcasNav(),
    loadReporteDelDia(service, {
      teamMemberId: memberData.id,
      usuarioNombre: primerNombre,
      usuarioNombreCompleto: nombreCapitalizado,
      usuarioAvatarUrl: memberData.avatar_url,
      usuarioRol: memberData.rolNombre,
      esCEO,
      rolBase: memberData.rol_base,
    }).catch((e) => {
      console.error('[inicio] loadReporteDelDia falló — sigo con null:', e)
      return null
    }),
  ])

  /* Trabajo del equipo — solo para el CEO. Para él además ocultamos el
     panel celeste "Grabaciones próximas" del cockpit (Pedro: en su inicio
     prefiere ver el trabajo de Lorena/Ailyn/Pieer). */
  const trabajoEquipo = esCEO
    ? await getTrabajoEquipo(service).catch((e) => {
        console.error('[inicio] getTrabajoEquipo falló — sigo con null:', e)
        return null
      })
    : null
  const cockpitData = cockpitDataRaw
    ? { ...cockpitDataRaw, marcasNav, ocultarGrabacionesProximas: esCEO }
    : null

  const data: InicioData = {
    nombre: nombreCapitalizado,
    /* Saludo calculado en server con timezone Lima — antes el cliente
       calculaba con new Date().getHours() pero durante SSR el server
       de Vercel está en UTC y daba 'Buenos días' a las 9pm Lima. */
    saludo: saludoSegunHora(),
    rol: memberData.rolNombre,
    rolBase: memberData.rol_base,
    avatarUrl: memberData.avatar_url,
    cargo: memberData.cargo_personalizado,
    cumpleHoy,
    modulosAccesibles,
    habitosHoy,
    tareasMias,
    reuniones,
    grabacionesProximas,
    pendientes,
    fraseDia: {
      texto: fraseDia.frase.texto,
      autor: fraseDia.frase.autor,
      contexto: fraseDia.frase.contexto ?? null,
    },
    cockpitData,
    reporteDelDia,
    trabajoEquipo,
    showWelcome,
  }

  return <InicioView data={data} />
}
