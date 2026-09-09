// app/app/fechas-importantes/page.tsx
//
// Calendario de FECHAS IMPORTANTES por marca (idea de Lorena 23-jul-2026).
// Ve todas las fechas clave del año por marca, con recordatorio del mes.
// Acceso lectura: Lorena + directores + diseño (Ailyn) + publicaciones.
// Acceso gestión: Lorena + directores (Erick / Pedro).

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { colorDeMarca } from '@/lib/marcas/branding'
import { FechasView, type MarcaLite, type FechaImportante } from './_components/fechas-view'

export const dynamic = 'force-dynamic'

export default async function FechasImportantesPage() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: me } = await service
    .from('team_members').select('nombre, rol_base').eq('auth_user_id', user.id).maybeSingle()

  /* Gestión (crear/borrar): Lorena + directores.
     Lectura: también quien tiene diseño (Ailyn — Pedro 132c5a66) o
     publicaciones (ya ven las fechas en su calendario). */
  const { getCurrentMemberPermisos } = await import('@/lib/team/permisos-helper')
  const { tieneAcceso } = await import('@/lib/team/types')
  const p = await getCurrentMemberPermisos()
  const esGestor = !!me && (me.nombre === 'LORENA' || me.rol_base === 'director')
  const puedeVer =
    !p || // admin/owner
    esGestor ||
    (p && (tieneAcceso(p.permisos, 'diseno') || tieneAcceso(p.permisos, 'publicaciones')))
  if (!puedeVer) redirect('/inicio')

  const [marcasRes, fechasRes] = await Promise.all([
    service.from('marcas').select('id, slug, nombre, emoji_marca, color_primario_hex').eq('activa', true).order('nombre'),
    service.from('fechas_importantes').select('id, marca_id, titulo, fecha, nota, categoria, contenido').order('fecha'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas: MarcaLite[] = ((marcasRes?.data ?? []) as any[]).map((m) => ({
    id: m.id, nombre: m.nombre, emoji: m.emoji_marca ?? null,
    color: colorDeMarca(m.slug, m.color_primario_hex),
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fechas: FechaImportante[] = ((fechasRes?.data ?? []) as any[]).map((f) => ({
    id: f.id, marcaId: f.marca_id, titulo: f.titulo,
    fecha: typeof f.fecha === 'string' ? f.fecha.slice(0, 10) : f.fecha,
    nota: f.nota ?? null, categoria: f.categoria ?? 'otro', contenido: f.contenido ?? null,
  }))

  /* readOnly UI deferred (FechasView); writes still gated in _actions for non-gestores. */
  return <FechasView marcas={marcas} fechas={fechas} />
}
