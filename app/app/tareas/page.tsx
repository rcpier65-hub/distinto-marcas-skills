// app/app/tareas/page.tsx
//
// Tablero de tareas estilo "Notas". Columnas dinámicas (categoría = entidad).
// Vista personal por defecto; permisos individuales permiten supervisar el
// equipo con exclusiones aplicadas en el servidor, también al historial.

import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { TAREA_SELECT, rowToTarea } from '@/lib/tareas/serialize'
import type { Tarea } from '@/lib/tareas/types'
import { TareasView, type PlanInfo } from './_components/tareas-view'
import { AutoRefresh } from '@/components/auto-refresh'
import { ESTADOS_TAREA } from '@/lib/tareas/pro-types'
import { loadTaskAccess } from '@/lib/tareas/access-server'
import { scopeTasks, taskAssignable, taskEditable } from '@/lib/tareas/access'

export const dynamic = 'force-dynamic'

export default async function TareasPage() {
  const user = await requireUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { access, member: tm } = await loadTaskAccess(service, user.id)
  const meId = access.memberId
  /* Solo Erick: al completar una tarea le preguntamos QUÉ DÍA la hizo, para que
     su reporte semanal la ubique en el día correcto (a veces marca hoy algo que
     hizo el lunes). Comparamos por primer nombre. Pedro 26-ago-2026. */
  const esErick = ((tm?.nombre ?? '').trim().split(/\s+/)[0] || '').toLowerCase() === 'erick'

  let q = service
    .from('tareas')
    .select(TAREA_SELECT)
    .eq('completada', false)
    .order('created_at', { ascending: false })
  q = scopeTasks(q, access)
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
  qc = scopeTasks(qc, access)
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
  const equipo = ((members ?? []) as any[]).filter((m) => taskAssignable(access, m.id)).map((m) => ({ id: m.id as string, nombre: m.nombre as string }))

  /* ===== Datos de la vista PLAN (estados + fechas + marcas) — van como
     props del MISMO tablero (Gantt/calendario/filtro por marca inline).
     Query aparte y defensiva: si las columnas self-healing aún no existen,
     el tablero funciona igual con defaults. Pedro 31-ago-2026. */
  const planPorId: Record<string, PlanInfo> = {}
  try {
    const ids = tareas.map((t) => t.id)
    if (ids.length > 0) {
      const { data: planRows, error: planErr } = await service
        .from('tareas')
        .select('id, estado, fecha_inicio, fecha_entrega, en_proceso_desde, tiempo_seg')
        .in('id', ids)
      if (!planErr) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const r of ((planRows ?? []) as any[])) {
          planPorId[r.id] = {
            estado: ESTADOS_TAREA.includes(r.estado) ? r.estado : 'sin_empezar',
            fechaInicio: r.fecha_inicio ?? null,
            fechaEntrega: r.fecha_entrega ?? null,
            enProcesoDesde: r.en_proceso_desde ?? null,
            tiempoSeg: r.tiempo_seg ?? 0,
          }
        }
      }
    }
  } catch { /* defaults */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let marcasNav: any[] = []
  try {
    const { data } = await service.from('marcas').select('slug, nombre').eq('activa', true).order('nombre')
    marcasNav = data ?? []
  } catch { /* sin filtro de marca */ }
  const hoyLima = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())

  return (
    <>
      {/* El tablero se actualiza solo cuando alguien crea/completa/mueve/borra
          una tarea. Primario: Realtime (useRealtimeRefresh, tabla 'tareas').
          Este AutoRefresh es RED DE SEGURIDAD por si el WebSocket se cae (celular
          en segundo plano, red inestable). Pedro 06-ago-2026. */}
      <AutoRefresh intervalMs={15000} />
      <TareasView
        tareasIniciales={tareas}
        completadasIniciales={completadas}
        esCEO={access.viewTeam}
        equipoLimitado={access.excluded.length > 0}
        soloLecturaIds={[...tareas, ...completadas].filter(t => !taskEditable(access, { team_member_id: t.teamMemberId, created_by: t.createdBy })).map(t => t.id)}
        meId={meId}
        equipo={equipo}
        esErick={esErick}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        marcas={(marcasNav as any[]).map((m) => ({ slug: m.slug as string, nombre: m.nombre as string }))}
        planPorId={planPorId}
        hoy={hoyLima}
      />
    </>
  )
}
