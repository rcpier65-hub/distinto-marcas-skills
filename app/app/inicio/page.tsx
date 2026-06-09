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

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { tieneAcceso } from '@/lib/team/types'
import { InicioView, type InicioData } from './_components/inicio-view'
import { getFraseDelDia } from '@/lib/inicio/get-frase-del-dia'

export const dynamic = 'force-dynamic'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function InicioPage() {
  const user = await requireUser()
  const p = await getCurrentMemberPermisos()

  /* Si es admin/owner (sin team_member) → directo a /cockpit que tiene
     todo el dashboard ejecutivo. /inicio es para miembros. */
  if (!p) {
    redirect('/cockpit')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const hoy = todayStr()
  const primerNombre = p.member.nombre.split(/[\s\-]/)[0]
  const nombreCapitalizado = primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase()

  /* Calcular qué módulos tiene accesibles (para las cards de acceso rápido) */
  const modulosAccesibles: Array<{ key: string; label: string; href: string; color: string; icon: string }> = []
  if (tieneAcceso(p.permisos, 'editor')) {
    modulosAccesibles.push({ key: 'editor', label: 'Editor de video', href: '/editor', color: '#8b5cf6', icon: '✂️' })
  }
  if (tieneAcceso(p.permisos, 'diseno')) {
    modulosAccesibles.push({ key: 'diseno', label: 'Diseño', href: '/diseno', color: '#ec4899', icon: '🎨' })
  }
  if (tieneAcceso(p.permisos, 'publicaciones')) {
    modulosAccesibles.push({ key: 'publicaciones', label: 'Publicaciones', href: '/publicaciones', color: '#06b6d4', icon: '📅' })
  }
  if (tieneAcceso(p.permisos, 'comentarios') || tieneAcceso(p.permisos, 'inbox')) {
    modulosAccesibles.push({ key: 'comentarios', label: 'Inbox / Comentarios', href: '/comentarios', color: '#22c55e', icon: '💬' })
  }
  if (tieneAcceso(p.permisos, 'grilla')) {
    modulosAccesibles.push({ key: 'grilla', label: 'Grilla semanal', href: '/dashboard', color: '#7170ff', icon: '📊' })
  }

  /* Hábitos del día (los del user actual) */
  const { data: habitos } = await service
    .from('habitos')
    .select('id, nombre, icono, color, orden')
    .eq('activo', true)
    .eq('team_member_id', p.member.id)
    .order('orden')

  const { data: completados } = await service
    .from('habitos_completados')
    .select('habito_id')
    .eq('fecha', hoy)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completadosSet = new Set(((completados ?? []) as any[]).map((c) => c.habito_id as string))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const habitosHoy = ((habitos ?? []) as any[]).map((h) => ({
    id: h.id as string,
    nombre: h.nombre as string,
    icono: (h.icono ?? '✅') as string,
    color: (h.color ?? '#6366F1') as string,
    completado: completadosSet.has(h.id as string),
  }))

  /* Datos contextuales según el rol */
  let tareasMias: InicioData['tareasMias'] = []

  if (tieneAcceso(p.permisos, 'editor')) {
    /* Editor: videos asignados a su nombre con estado='editar' */
    const { data } = await service
      .from('publicaciones')
      .select(`id, nombre, fecha_publicacion, fecha_edicion, fecha_marcada_para_editar, editor_nombre, marca:marcas(slug, nombre, color_primario_hex)`)
      .ilike('editor_nombre', p.member.nombre)
      .eq('estado', 'editar')
      .order('fecha_publicacion', { ascending: true, nullsFirst: false })
      .limit(10)
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
  } else if (tieneAcceso(p.permisos, 'diseno')) {
    /* Diseñadora: tareas en estado='disenar' */
    const { data } = await service
      .from('publicaciones')
      .select(`id, nombre, fecha_diseno, estado_tarea, portada_lista, marca:marcas(slug, nombre, color_primario_hex)`)
      .eq('estado', 'disenar')
      .eq('portada_lista', false)
      .order('fecha_diseno', { ascending: true, nullsFirst: false })
      .limit(10)
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
  } else if (tieneAcceso(p.permisos, 'comentarios') || tieneAcceso(p.permisos, 'inbox')) {
    /* Community Manager: comentarios pendientes */
    const { data } = await service
      .from('comentarios_inbox')
      .select(`id, author_username, author_display_name, comment_text, marca:marcas(slug, nombre, color_primario_hex)`)
      .eq('status', 'pending')
      .order('comment_created_at', { ascending: false })
      .limit(10)
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
  if (tieneAcceso(p.permisos, 'publicaciones') || tieneAcceso(p.permisos, 'editor') || tieneAcceso(p.permisos, 'diseno')) {
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
      /* Hora en HH:MM (la BD devuelve time as HH:MM:SS) */
      const hora = (r.reunion_hora as string)?.slice(0, 5) ?? ''
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

  /* Cumple hoy? */
  let cumpleHoy = false
  if (p.member.fecha_cumpleanos) {
    const cumple = new Date(p.member.fecha_cumpleanos + 'T00:00:00')
    const ahora = new Date()
    cumpleHoy = cumple.getMonth() === ahora.getMonth() && cumple.getDate() === ahora.getDate()
  }

  /* Frase del día según el rol. Primeros 60 días = secuencial,
     después aleatoria determinista por (miembro, día). */
  const fraseDia = getFraseDelDia(p.member.rol_base, p.member.id)

  /* Pendientes rápidos NO completados del miembro (chat-ChatGPT en home) */
  const { data: pendientesRaw } = await service
    .from('pendientes_rapidos')
    .select('id, titulo, descripcion, categoria, prioridad, completado, created_at')
    .eq('team_member_id', p.member.id)
    .eq('completado', false)
    .order('prioridad', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(30)
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

  const data: InicioData = {
    nombre: nombreCapitalizado,
    rol: p.rol.nombre,
    rolBase: p.member.rol_base,
    avatarUrl: p.member.avatar_url,
    cargo: p.member.cargo_personalizado,
    cumpleHoy,
    modulosAccesibles,
    habitosHoy,
    tareasMias,
    reuniones,
    pendientes,
    fraseDia: {
      texto: fraseDia.frase.texto,
      autor: fraseDia.frase.autor,
      contexto: fraseDia.frase.contexto ?? null,
    },
  }

  return <InicioView data={data} />
}
