// app/lib/hoy/tareas-hoy.ts
//
// Filas abiertas de public.tareas para "qué tengo para hoy".
// El alcance de persona es el de /tareas (esDuenoDelTablero): el dueño ve
// el equipo; el resto, team_member_id = el suyo. due=hoy deja las de hoy
// y las sin fecha (siguen en el tablero). include_overdue cambia solo el
// lado con fecha a fecha_entrega <= hoy.

import 'server-only'
import { scopeTasks, type TaskAccess } from '@/lib/tareas/access'

export type TareaHoyRow = {
  id: string
  texto: string
  estado: string | null
  fecha_entrega: string | null
  marca_slug: string | null
  categoria: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

/* Igual que /tareas: sin filtro si es el dueño (salvo que pida un miembro);
   si no, solo team_member_id del que consulta. */
function acotar(q: Service, esOwner: boolean, meId: string | null, memberId: string | null): Service {
  if (memberId) return q.eq('team_member_id', memberId)
  if (!esOwner && meId) return q.eq('team_member_id', meId)
  return q
}

export async function cargarTareasParaHoy(
  service: Service,
  args: {
    access?: TaskAccess
    esOwner: boolean
    meId: string | null
    /** Si el dueño pide otro miembro. */
    memberId: string | null
    fecha: string
    includeOverdue: boolean
  },
): Promise<{ ok: true; rows: TareaHoyRow[] } | { ok: false; error: string }> {
  const select = 'id, texto, estado, fecha_entrega, marca_slug, categoria'
  let dated = service.from('tareas').select(select).eq('completada', false)
  dated = args.access ? scopeTasks(dated, args.access, args.memberId) : acotar(dated, args.esOwner, args.meId, args.memberId)
  dated = args.includeOverdue ? dated.lte('fecha_entrega', args.fecha) : dated.eq('fecha_entrega', args.fecha)

  let sinFecha = service.from('tareas').select(select).eq('completada', false).is('fecha_entrega', null)
  sinFecha = args.access ? scopeTasks(sinFecha, args.access, args.memberId) : acotar(sinFecha, args.esOwner, args.meId, args.memberId)

  const [datedRes, sinFechaRes] = await Promise.all([
    dated.order('fecha_entrega', { ascending: true }).limit(200),
    sinFecha.order('created_at', { ascending: false }).limit(200),
  ])
  if (datedRes.error) return { ok: false, error: datedRes.error.message }
  if (sinFechaRes.error) return { ok: false, error: sinFechaRes.error.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: TareaHoyRow[] = [...(datedRes.data ?? []), ...(sinFechaRes.data ?? [])].map((t: any) => ({
    id: String(t.id),
    texto: typeof t.texto === 'string' ? t.texto : '',
    estado: typeof t.estado === 'string' ? t.estado : null,
    fecha_entrega: typeof t.fecha_entrega === 'string' ? t.fecha_entrega.slice(0, 10) : null,
    marca_slug: typeof t.marca_slug === 'string' ? t.marca_slug : null,
    categoria: typeof t.categoria === 'string' ? t.categoria : null,
  }))
  return { ok: true, rows }
}
