import 'server-only'

/* Cronómetro de tareas (Pedro 24-sep-2026): "que inicie el segundero en
   proceso y al poner terminado se guarde, para métricas".
   - abrirSesion: la tarea empieza a correr (en_proceso_desde = ahora).
   - cerrarSesion: guarda la sesión en tareas_tiempos, suma a tiempo_seg y
     detiene el cronómetro. Idempotente: si no estaba corriendo, no hace nada. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

export async function abrirSesion(service: Service, tareaId: string): Promise<void> {
  await service.from('tareas').update({ en_proceso_desde: new Date().toISOString() })
    .eq('id', tareaId).is('en_proceso_desde', null)
}

export async function cerrarSesion(service: Service, tareaId: string, cierre: 'pausa' | 'terminada' | 'estado'): Promise<number> {
  const { data: t } = await service.from('tareas')
    .select('en_proceso_desde, tiempo_seg, team_member_id, categoria, marca_slug')
    .eq('id', tareaId).maybeSingle()
  if (!t?.en_proceso_desde) return 0
  const inicio = new Date(t.en_proceso_desde)
  const fin = new Date()
  const segundos = Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / 1000))
  await service.from('tareas_tiempos').insert({
    tarea_id: tareaId, team_member_id: t.team_member_id, categoria: t.categoria, marca_slug: t.marca_slug,
    inicio: inicio.toISOString(), fin: fin.toISOString(), segundos, cierre,
  })
  await service.from('tareas').update({ en_proceso_desde: null, tiempo_seg: (t.tiempo_seg ?? 0) + segundos }).eq('id', tareaId)
  return segundos
}
