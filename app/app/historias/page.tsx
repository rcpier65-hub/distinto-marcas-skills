// app/app/historias/page.tsx
//
// Planificador de historias compartido entre Diseño (Ailyn) y Publicaciones
// (Lorena). Directores/admin también. Ticket e7e50df4-92ac-4855-8fc5-23171a14ed5f.

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { colorDeMarca } from '@/lib/marcas/branding'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { tieneAcceso } from '@/lib/team/types'
import { HistoriasView, type HistoriaItem, type MarcaLite } from './_components/historias-view'

export const dynamic = 'force-dynamic'

export default async function HistoriasPage() {
  await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const p = await getCurrentMemberPermisos()

  const puedeVer =
    !p ||
    p.member.rol_base === 'director' ||
    p.member.rol_base === 'admin' ||
    tieneAcceso(p.permisos, 'diseno') ||
    tieneAcceso(p.permisos, 'publicaciones')
  if (!puedeVer) redirect('/inicio')

  const puedeEscribir = puedeVer // mismas reglas: diseño + publicaciones + directors/admin

  const [marcasRes, histRes] = await Promise.all([
    service.from('marcas').select('id, slug, nombre, emoji_marca, color_primario_hex').eq('activa', true).order('nombre'),
    service
      .from('historias')
      .select('id, marca_id, titulo, fecha, hora, plataformas, copy, nota, estado')
      .order('fecha', { ascending: true })
      .neq('estado', 'cancelada'),
  ])

  /* Si la tabla aún no existe (migración pendiente), no tumbar la página. */
  const histError = histRes?.error?.message ?? ''
  const tablaFalta = /relation .*historias.* does not exist|Could not find the table/i.test(histError)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas: MarcaLite[] = ((marcasRes?.data ?? []) as any[]).map((m) => ({
    id: m.id,
    nombre: m.nombre,
    emoji: m.emoji_marca ?? null,
    color: colorDeMarca(m.slug, m.color_primario_hex),
    slug: m.slug as string,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historias: HistoriaItem[] = tablaFalta
    ? []
    : ((histRes?.data ?? []) as any[]).map((h) => ({
        id: h.id,
        marcaId: h.marca_id,
        titulo: h.titulo,
        fecha: typeof h.fecha === 'string' ? h.fecha.slice(0, 10) : h.fecha,
        hora: h.hora ? String(h.hora).slice(0, 5) : null,
        plataformas: (h.plataformas ?? []) as string[],
        copy: h.copy ?? null,
        nota: h.nota ?? null,
        estado: (h.estado ?? 'planificada') as HistoriaItem['estado'],
      }))

  return (
    <HistoriasView
      marcas={marcas}
      historias={historias}
      canWrite={puedeEscribir}
      migrationPending={tablaFalta}
    />
  )
}
