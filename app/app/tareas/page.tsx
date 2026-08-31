// app/app/tareas/page.tsx
//
// Tablero de tareas estilo "Notas". Columnas dinámicas (categoría = entidad).
// Las tareas son PERSONALES: cada miembro ve SOLO las suyas. Únicamente el
// DUEÑO (Pedro) ve el tablero completo del equipo. Pedro 14-jul-2026:
// "las tareas son personales; Erick no debe ver las de Aylin ni Lorena, etc."

import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { TAREA_SELECT, rowToTarea } from '@/lib/tareas/serialize'
import type { Tarea } from '@/lib/tareas/types'
import { TareasView } from './_components/tareas-view'
import { AutoRefresh } from '@/components/auto-refresh'
import { TareasPlanView, type TareaPlan } from '@/components/tareas/tareas-plan-view'
import { ESTADOS_TAREA, type EstadoTarea } from '@/lib/tareas/pro-types'

export const dynamic = 'force-dynamic'

export default async function TareasPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const sp = await searchParams
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: tm } = await service
    .from('team_members')
    .select('id, nombre, rol_base')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  const meId: string | null = tm?.id ?? null
  /* SOLO el DUEÑO (Pedro: sin team_member, o el team_member llamado "Pedro")
     ve el tablero completo del equipo. TODOS los demás —incluido Erick, que es
     director-administrador— ven SOLO sus propias tareas. Las tareas son
     personales; si se asigna a alguien, esa persona la ve en su tablero. */
  const esOwner = !tm || (tm?.nombre ?? '').trim().toLowerCase() === 'pedro'
  /* Solo Erick: al completar una tarea le preguntamos QUÉ DÍA la hizo, para que
     su reporte semanal la ubique en el día correcto (a veces marca hoy algo que
     hizo el lunes). Comparamos por primer nombre. Pedro 26-ago-2026. */
  const esErick = ((tm?.nombre ?? '').trim().split(/\s+/)[0] || '').toLowerCase() === 'erick'

  /* ===== Vista PLAN (?vista=plan) — MISMO módulo, misma ruta =====
     Estados + responsables + Gantt + calendario de estas mismas tareas.
     Pedro 31-ago-2026: "en el mismo módulo de tareas, no separado". */
  if (sp.vista === 'plan') {
    const SEL_FULL = `id, team_member_id, texto, categoria, color, completada, created_at, marca_slug, estado, fecha_inicio, fecha_entrega,
      miembro:team_members!tareas_team_member_id_fkey(nombre)`
    const SEL_BASE = `id, team_member_id, texto, categoria, color, completada, created_at, marca_slug,
      miembro:team_members!tareas_team_member_id_fkey(nombre)`
    const cargar = async (cols: string) => {
      let qq = service.from('tareas').select(cols).eq('completada', false).order('created_at', { ascending: false }).limit(400)
      if (!esOwner && meId) qq = qq.eq('team_member_id', meId)
      return qq
    }
    let res = await cargar(SEL_FULL)
    if (res.error && /estado|fecha_inicio|fecha_entrega|schema cache|42703/i.test(res.error.message ?? '')) {
      res = await cargar(SEL_BASE)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tareasPlan: TareaPlan[] = (((res.data ?? []) as any[])).map((r) => {
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
    const marcasPlan = ((marcasRaw ?? []) as any[]).map((m) => ({ slug: m.slug as string, nombre: m.nombre as string }))
    const hoyLima = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())

    return (
      <main className="container mx-auto p-6 max-w-7xl space-y-4">
        <AutoRefresh intervalMs={20000} />
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-1">🗂️ Tareas · Plan</h1>
            <p className="text-sm text-muted-foreground">
              Estados, responsables y fechas — elige una marca para desglosar por responsable.
            </p>
          </div>
          <Link href="/tareas" className="inline-flex items-center h-9 px-3.5 rounded-lg border text-sm font-medium hover:bg-muted">
            📋 Tablero
          </Link>
        </header>
        <TareasPlanView tareas={tareasPlan} marcas={marcasPlan} modo="equipo" hoy={hoyLima} />
      </main>
    )
  }

  let q = service
    .from('tareas')
    .select(TAREA_SELECT)
    .eq('completada', false)
    .order('created_at', { ascending: false })
  if (!esOwner && meId) q = q.eq('team_member_id', meId)
  const { data } = await q
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tareas: Tarea[] = ((data ?? []) as any[]).map(rowToTarea)

  /* Historial: tareas YA terminadas (las últimas 200). Alimentan el panel de
     "Archivo" del tablero. Mismo gate por persona que las activas. */
  let qc = service
    .from('tareas')
    .select(TAREA_SELECT)
    .eq('completada', true)
    .order('completada_at', { ascending: false, nullsFirst: false })
    .limit(200)
  if (!esOwner && meId) qc = qc.eq('team_member_id', meId)
  const { data: dataC } = await qc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completadas: Tarea[] = ((dataC ?? []) as any[]).map(rowToTarea)

  /* Equipo (para sugerir @menciones al asignar una tarea a otra persona).
     Incluye a todos los miembros activos. El filtro por persona del tablero solo
     lo ve el dueño (esOwner) — los demás ven solo lo suyo, no necesitan filtro. */
  const { data: members } = await service
    .from('team_members')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const equipo = ((members ?? []) as any[]).map((m) => ({ id: m.id as string, nombre: m.nombre as string }))

  return (
    <>
      {/* El tablero se actualiza solo cuando alguien crea/completa/mueve/borra
          una tarea. Primario: Realtime (useRealtimeRefresh, tabla 'tareas').
          Este AutoRefresh es RED DE SEGURIDAD por si el WebSocket se cae (celular
          en segundo plano, red inestable). Pedro 06-ago-2026. */}
      <AutoRefresh intervalMs={15000} />
      <TareasView tareasIniciales={tareas} completadasIniciales={completadas} esCEO={esOwner} meId={meId} equipo={equipo} esErick={esErick} />
    </>
  )
}
