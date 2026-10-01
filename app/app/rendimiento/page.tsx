// app/app/rendimiento/page.tsx
// RENDIMIENTO DEL EQUIPO — solo Pedro (super admin). Pedro 30-sep-2026.
// Vistas: equipo · persona · marcas · flujo. Período: día / semana / mes.

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { esSuperAdmin } from '@/lib/notas-reuniones/acceso'
import { calcularRango, cargarRendimiento, hoyLima, type Periodo } from '@/lib/rendimiento/datos'
import { RendimientoView, type Vista } from './_components/rendimiento-view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Rendimiento' }

type SP = { vista?: string; periodo?: string; fecha?: string; persona?: string }

export default async function RendimientoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser()
  if (!esSuperAdmin(user.email)) redirect('/inicio')
  const sp = await searchParams
  const vista: Vista = (['equipo', 'persona', 'marcas', 'flujo'] as const).includes(sp.vista as Vista) ? (sp.vista as Vista) : 'equipo'
  const periodo: Periodo = (['dia', 'semana', 'mes'] as const).includes(sp.periodo as Periodo) ? (sp.periodo as Periodo) : 'semana'
  const ref = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoyLima()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const datos = await cargarRendimiento(service, calcularRango(periodo, ref))

  return <RendimientoView datos={datos} vista={vista} personaId={sp.persona ?? null} hoy={hoyLima()} />
}
