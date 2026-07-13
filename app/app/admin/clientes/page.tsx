// app/app/admin/clientes/page.tsx
// Admin (solo director/Pedro): crear accesos de cliente por marca.

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { ClientesAdminView, type AccesoCliente, type MarcaMini } from './_components/clientes-admin-view'

export const dynamic = 'force-dynamic'

export default async function AdminClientesPage() {
  await requireUser()
  const permisos = await getCurrentMemberPermisos()
  if (!permisos || permisos.member.rol_base !== 'director') redirect('/inicio')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const [marcasRes, accesosRes] = await Promise.all([
    service.from('marcas').select('slug, nombre, emoji_marca').eq('activa', true).order('nombre'),
    service.from('marca_clientes').select('id, nombre, email, created_at, marca:marcas(slug, nombre, emoji_marca)').order('created_at', { ascending: false }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas: MarcaMini[] = ((marcasRes?.data ?? []) as any[]).map((m) => ({ slug: m.slug, nombre: m.nombre, emoji: m.emoji_marca ?? null }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accesos: AccesoCliente[] = ((accesosRes?.data ?? []) as any[]).map((r) => {
    const m = Array.isArray(r.marca) ? r.marca[0] : r.marca
    return { id: r.id, nombre: r.nombre ?? '', email: r.email ?? '', marcaNombre: m?.nombre ?? '—', marcaEmoji: m?.emoji_marca ?? null }
  })

  return <ClientesAdminView marcas={marcas} accesos={accesos} />
}
