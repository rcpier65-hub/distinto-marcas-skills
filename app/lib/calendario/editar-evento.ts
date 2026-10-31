import 'server-only'
import { Client } from 'pg'
import { createReunionEvent, editarDetalleGoogle } from '@/lib/integrations/google-calendar'
import { validarEdicionAgenda, type EdicionAgenda } from './editar-validacion'

const tablas = { reunion: 'marca_reuniones', grabacion: 'grabaciones' } as const
type Result = { ok: true; meetLink: string | null; meetPendiente?: boolean } | { ok: false; error: string }

/** El caller comprueba sesión y permiso calendario.manage antes de entrar.
 * La conversión conserva UUID/Google ID; los datos específicos se conservan
 * en calendario_datos para poder deshacer el cambio de tipo sin perderlos. */
export async function guardarEdicionAgenda(id: string, input: EdicionAgenda, actorId: string): Promise<Result> {
  const error = validarEdicionAgenda(input)
  if (error) return { ok: false, error }
  if (input.origen === 'gcal') {
    if (!/^[a-zA-Z0-9_-]{5,1024}$/.test(id)) return { ok: false, error: 'Evento inválido.' }
    return editarDetalleGoogle(id, input)
  }
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) return { ok: false, error: 'Evento inválido.' }
  const db = new Client({ connectionString: process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_DIRECT, connectionTimeoutMillis: 7000 })
  await db.connect()
  try {
    await db.query('BEGIN')
    // Serializa cambios de tipo simultáneos, incluso cuando la fila cambia de tabla.
    await db.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [id])
    const tabla = tablas[input.origen]
    const row = (await db.query(`select * from ${tabla} where id=$1 for update`, [id])).rows[0]
    if (!row) throw new Error('El evento cambió o ya no existe. Actualiza el calendario.')
    const convertir = input.tipo !== input.origen
    if (convertir && input.origen === 'grabacion') {
      const linked = await db.query('select id from creative_batches where recording_id=$1 limit 1', [id])
      if (linked.rowCount) throw new Error('Esta grabación tiene un lote de guiones vinculado. Desvincula ese lote antes de convertirla en reunión; puedes editar sus horarios sin desvincularlo.')
    }
    const { calendario_datos: anteriores, ...snapshot } = row
    const datos = convertir ? { ...anteriores, [input.origen]: snapshot } : anteriores
    const anterior = datos?.[input.tipo] ?? {}
    const marca = (await db.query('select slug from marcas where id=$1', [row.marca_id])).rows[0]
    let gid: string | null = row.google_event_id
    let meet: string | null = input.origen === 'reunion' ? row.lugar_enlace : row.meet_link
    let meetPendiente = false
    const target = input.tipo === 'reunion' ? 'marca_reuniones' : 'grabaciones'
    // Preparar toda la mutación SQL antes de tocar Google; errores de esquema no lo modifican.
    if (convertir) {
      if (input.tipo === 'grabacion') {
        await db.query(`insert into grabaciones
          (id,marca_id,fecha_planeada,hora_planeada,titulo,duracion_min,meet_link,google_event_id,notas,estado,created_at,fecha_real,hora_real,videos_grabados,enlace_guiones,agendada_por_cliente,calendario_datos)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [id,row.marca_id,input.fecha,input.hora,input.titulo.trim(),input.duracionMin,meet,gid,row.notas,
          anterior.estado ?? (row.estado === 'cancelada' ? 'cancelada' : row.estado === 'realizada' ? 'cumplida' : 'planeada'),row.created_at,
          anterior.fecha_real ?? null,anterior.hora_real ?? null,anterior.videos_grabados ?? null,
          anterior.enlace_guiones ?? null,anterior.agendada_por_cliente ?? false,JSON.stringify(datos)])
      } else {
        await db.query(`insert into marca_reuniones
          (id,marca_id,titulo,fecha_hora,modalidad,lugar_enlace,notas,estado,created_at,google_event_id,duracion_min,calendario_datos)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [id,row.marca_id,input.titulo.trim(),`${input.fecha}T${input.hora}:00-05:00`,anterior.modalidad ?? 'virtual',meet,row.notas,
          anterior.estado ?? (row.estado === 'cancelada' ? 'cancelada' : row.estado === 'cumplida' ? 'realizada' : 'agendada'),row.created_at,gid,input.duracionMin,JSON.stringify(datos)])
      }
      await db.query('update strategy_links set target_type=$1 where target_type=$2 and target_id=$3',
        [input.tipo === 'reunion' ? 'meeting' : 'recording', input.origen === 'reunion' ? 'meeting' : 'recording', id])
      await db.query(`delete from ${tabla} where id=$1`, [id])
    } else if (input.tipo === 'reunion') {
      await db.query('update marca_reuniones set titulo=$2,fecha_hora=$3,duracion_min=$4 where id=$1',
        [id,input.titulo.trim(),`${input.fecha}T${input.hora}:00-05:00`,input.duracionMin])
    } else {
      await db.query('update grabaciones set titulo=$2,fecha_planeada=$3,hora_planeada=$4,duracion_min=$5 where id=$1',
        [id,input.titulo.trim(),input.fecha,input.hora,input.duracionMin])
    }
    if (gid) {
      const g = await editarDetalleGoogle(gid, input)
      if (!g.ok) throw new Error(g.error)
      meet = g.meetLink ?? meet
      meetPendiente = g.meetPendiente
    } else if (input.crearMeet) {
      const g = await createReunionEvent({ summary: input.titulo.trim(), fecha: input.fecha, hora: input.hora!, durationMin: input.duracionMin, attendees: [], enviarInvitacion: false })
      if (!g.ok) throw new Error(g.error)
      gid = g.eventId; meet = g.meetLink; meetPendiente = !meet
    }
    await db.query(`update ${target} set google_event_id=$2, ${input.tipo === 'reunion' ? 'lugar_enlace' : 'meet_link'}=$3 where id=$1`, [id,gid,meet])
    await db.query(`insert into actividad(actor_nombre,rol,accion,entidad_tipo,entidad_id,marca_slug,detalle)
      values('Equipo','equipo','calendario_editado',$1,$2,$3,$4)`,
    [input.tipo,id,marca?.slug,`Usuario ${actorId}: ${input.origen} → ${input.tipo}; ${input.fecha} ${input.hora ?? 'todo el día'}, ${input.duracionMin} min. ${input.titulo.trim()}`])
    await db.query('COMMIT')
    return { ok: true, meetLink: meet, meetPendiente }
  } catch (e) {
    await db.query('ROLLBACK')
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo guardar el evento.' }
  } finally { await db.end() }
}
