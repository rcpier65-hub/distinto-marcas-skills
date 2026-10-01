// app/app/rendimiento/configuracion/page.tsx — solo Pedro.
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { esSuperAdmin } from '@/lib/notas-reuniones/acceso'
import { ConfigRendimiento } from '../_components/config-rendimiento'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Configuración · Rendimiento' }

export default async function ConfigRendimientoPage() {
  const user = await requireUser()
  if (!esSuperAdmin(user.email)) redirect('/inicio')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const [{ data: miembros }, { data: marcas }] = await Promise.all([
    service.from('team_members').select('id, nombre, rol_base, horas_dia, dias_laborales, costo_hora').eq('activo', true).order('nombre'),
    service.from('marcas').select('slug, nombre, color_primario_hex, fee_mensual').eq('activa', true).neq('slug', 'interno').order('nombre'),
  ])
  return (
    <ConfigRendimiento
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      miembros={((miembros ?? []) as any[]).map((m) => ({
        id: m.id, nombre: m.nombre, rol: m.rol_base ?? null,
        horasDia: Number(m.horas_dia ?? 8), diasLaborales: (m.dias_laborales ?? [1, 2, 3, 4, 5]).map(Number),
        costoHora: m.costo_hora != null ? Number(m.costo_hora) : null,
      }))}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      marcas={((marcas ?? []) as any[]).map((m) => ({ slug: m.slug, nombre: m.nombre, color: m.color_primario_hex || '#94a3b8', fee: m.fee_mensual != null ? Number(m.fee_mensual) : null }))}
    />
  )
}
