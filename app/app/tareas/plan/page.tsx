// app/app/tareas/plan/page.tsx
//
// Vista PLAN de tareas del EQUIPO: tablero por marca/responsable + Gantt +
// calendario, con estados y fechas de entrega. Misma regla de visibilidad
// que /tareas: solo el DUEÑO ve el tablero completo; cada miembro, lo suyo.
// Pedro 31-ago-2026.

import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { TareasPlanView, type TareaPlan } from '@/components/tareas/tareas-plan-view'
import { ESTADOS_TAREA, type EstadoTarea } from '@/lib/tareas/pro-types'
import { AutoRefresh } from '@/components/auto-refresh'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Plan de tareas' }

const SEL_FULL = `id, team_member_id, texto, categoria, color, completada, created_at, marca_slug, estado, fecha_inicio, fecha_entrega,
  miembro:team_members!tareas_team_member_id_fkey(nombre)`
const SEL_BASE = `id, team_member_id, texto, categoria, color, completada, created_at, marca_slug,
  miembro:team_members!tareas_team_member_id_fkey(nombre)`

export default async function TareasPlanPage() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: tm } = await service
    .from('team_members')
    .select('id, nombre, rol_base')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const meId: string | null = tm?.id ?? null
  const esOwner = !tm || (tm?.nombre ?? '').trim().toLowerCase() === 'pedro'

  /* Tareas activas (defensivo: estado/fechas pueden no existir aún). */
  const cargar = async (cols: string) => {
    let q = service.from('tareas').select(cols).eq('completada', false).order('created_at', { ascending: false }).limit(400)
    if (!esOwner && meId) q = q.eq('team_member_id', meId)
    return q
  }
  let res = await cargar(SEL_FULL)
  if (res.error && /estado|fecha_inicio|fecha_entrega|schema cache|42703/i.test(res.error.message ?? '')) {
    res = await cargar(SEL_BASE)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((res.data ?? []) as any[])

  const tareas: TareaPlan[] = rows.map((r) => {
    const m = Array.isArray(r.miembro) ? r.miembro[0] : r.miembro
    const estado: EstadoTarea = ESTADOS_TAREA.includes(r.estado) ? r.estado : 'sin_empezar'
    return {
      id: r.id,
      texto: r.texto,
      categoria: r.categoria ?? 'General',
      color: r.color ?? '#7c3aed',
      marcaSlug: r.marca_slug ?? null,
      responsableNombre: m?.nombre ?? null,
      estado,
      fechaInicio: r.fecha_inicio ?? null,
      fechaEntrega: r.fecha_entrega ?? null,
      createdAt: r.created_at,
    }
  })

  const { data: marcasRaw } = await service.from('marcas').select('slug, nombre').eq('activa', true).order('nombre')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = ((marcasRaw ?? []) as any[]).map((m) => ({ slug: m.slug as string, nombre: m.nombre as string }))

  const hoyLima = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())

  return (
    <main className="container mx-auto p-6 max-w-7xl space-y-4">
      <AutoRefresh intervalMs={20000} />
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">🗂️ Plan de tareas</h1>
          <p className="text-sm text-muted-foreground">
            Estados, responsables y fechas — elige una marca para desglosar por responsable.
          </p>
        </div>
        <Link href="/tareas" className="inline-flex items-center h-9 px-3.5 rounded-lg border text-sm font-medium hover:bg-muted">
          ← Tablero de tareas
        </Link>
      </header>

      <TareasPlanView tareas={tareas} marcas={marcas} modo="equipo" hoy={hoyLima} />
    </main>
  )
}
