// app/app/rendimiento/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { esSuperAdmin } from '@/lib/notas-reuniones/acceso'

type Ok = { ok: true } | { ok: false; error: string }

/* Configuración de Rendimiento — solo Pedro. */
export async function guardarConfigRendimiento(input: {
  miembros: { id: string; horasDia: number; diasLaborales: number[]; costoHora: number | null }[]
  marcas: { slug: string; fee: number | null }[]
}): Promise<Ok> {
  const user = await requireUser()
  if (!esSuperAdmin(user.email)) return { ok: false, error: 'Solo Pedro puede cambiar esto' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  for (const m of input.miembros ?? []) {
    const horas = Math.max(0, Math.min(16, Number(m.horasDia) || 0))
    const dias = [...new Set((m.diasLaborales ?? []).map(Number).filter((d) => d >= 1 && d <= 7))].sort()
    const costo = m.costoHora == null || Number.isNaN(Number(m.costoHora)) ? null : Math.max(0, Number(m.costoHora))
    const { error } = await service.from('team_members').update({ horas_dia: horas, dias_laborales: dias, costo_hora: costo }).eq('id', m.id)
    if (error) return { ok: false, error: error.message }
  }
  for (const b of input.marcas ?? []) {
    const fee = b.fee == null || Number.isNaN(Number(b.fee)) ? null : Math.max(0, Number(b.fee))
    const { error } = await service.from('marcas').update({ fee_mensual: fee }).eq('slug', b.slug)
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath('/rendimiento')
  return { ok: true }
}
