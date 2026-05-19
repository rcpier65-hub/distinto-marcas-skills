// app/app/dashboard/_components/pedir-grilla-action.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

type PedirGrillaResult =
  | { ok: true; grilla_id: string }
  | { ok: false; error: string }

/**
 * Inserta una grilla pendiente para la semana en curso.
 * Si ya existe una grilla para esa marca + semana, devuelve error de duplicado.
 */
export async function pedirGrilla(marcaSlug: string): Promise<PedirGrillaResult> {
  const user = await requireUser()
  const supabase = await createClient()

  // 1. Buscar marca por slug
  const { data: marca, error: marcaError } = await supabase
    .from('marcas')
    .select('id, nombre')
    .eq('slug', marcaSlug)
    .eq('activa', true)
    .single()

  if (marcaError || !marca) {
    return { ok: false, error: `Marca '${marcaSlug}' no encontrada o inactiva` }
  }

  // 2. Calcular semana en curso (lunes-domingo)
  const { semana_inicio, semana_fin } = calcularSemanaActual()

  // 3. INSERT en grillas_pendientes
  const { data: grilla, error: insertError } = await supabase
    .from('grillas_pendientes')
    .insert({
      marca_id: marca.id,
      semana_inicio,
      semana_fin,
      estado: 'pendiente',
      pedida_por: user.id,
    })
    .select('id')
    .single()

  if (insertError) {
    // Constraint unique_grilla_marca_semana → duplicado
    if (insertError.code === '23505') {
      return {
        ok: false,
        error: `Ya hay una grilla pedida para ${marca.nombre} esta semana`,
      }
    }
    console.error('[pedirGrilla] insert error:', insertError)
    return { ok: false, error: 'No pudimos crear la grilla. Probá de nuevo.' }
  }

  // 4. Log en aprobaciones (auditoría)
  await supabase.from('aprobaciones').insert({
    grilla_id: grilla.id,
    usuario_id: user.id,
    accion: 'solicitar',
    via: 'dashboard',
  })

  revalidatePath('/dashboard')
  return { ok: true, grilla_id: grilla.id }
}

/**
 * Calcula el lunes y domingo de la semana en curso.
 * Si hoy es lunes, semana_inicio = hoy.
 */
function calcularSemanaActual(): { semana_inicio: string; semana_fin: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()  // 0=domingo, 1=lunes, ..., 6=sábado
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    semana_inicio: monday.toISOString().slice(0, 10),
    semana_fin: sunday.toISOString().slice(0, 10),
  }
}
