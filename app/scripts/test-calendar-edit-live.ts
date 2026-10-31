// Fixtures temporales; Google sin invitados. No modifica citas reales.
import assert from 'node:assert/strict'
import { Client } from 'pg'
import { guardarEdicionAgenda } from '../lib/calendario/editar-evento'
import { validarEdicionAgenda, horaFinalInput, minutosHasta, type EdicionAgenda } from '../lib/calendario/editar-validacion'
import { createReunionEvent, createTimedEvent, deleteCalendarEvent, listCalendarEvents, editarDetalleGoogle } from '../lib/integrations/google-calendar'
import { cargarAgendaCalendario } from '../lib/calendario/cargar-agenda'

async function main() {
  const db = new Client({ connectionString: process.env.SUPABASE_DB_URL }); await db.connect()
  const id = crypto.randomUUID(), brand = crypto.randomUUID(), failedId = crypto.randomUUID()
  const gIds: string[] = []
  const fecha = '2026-11-17', titulo = 'QA TEMPORAL CALENDARIO — SIN INVITADOS'
  const base: EdicionAgenda = { origen: 'reunion', tipo: 'reunion', titulo, fecha, hora: '10:00', duracionMin: 360 }
  assert.equal(validarEdicionAgenda({...base, fecha:'2026-02-30'}), 'Fecha inválida.')
  assert.equal(validarEdicionAgenda({...base, hora:'25:00'}), 'Hora inválida.')
  assert(validarEdicionAgenda({...base, duracionMin:NaN}))
  assert(validarEdicionAgenda({...base, tipo:'reunion', hora:null}))
  assert.equal(horaFinalInput('23:30',120),'01:30'); assert.equal(minutosHasta('23:30','01:30'),120)
  try {
    await db.query('insert into marcas(id,slug,nombre) values($1,$2,$3)',[brand,'qa-calendario-'+id,titulo])
    const g = await createReunionEvent({summary:titulo, fecha,hora:'10:00',durationMin:360,attendees:[],enviarInvitacion:false})
    assert(g.ok);gIds.push(g.eventId)
    await db.query(`insert into marca_reuniones(id,marca_id,titulo,fecha_hora,lugar_enlace,google_event_id,duracion_min,notas) values($1,$2,$3,$4,$5,$6,360,'Conservar esta nota')`,[id,brand,titulo,fecha+'T10:00:00-05:00',g.meetLink,g.eventId])
    const converted = await guardarEdicionAgenda(id,{...base,tipo:'grabacion',hora:'11:00',duracionMin:270},'qa')
    assert(converted.ok)
    let row=(await db.query('select * from grabaciones where id=$1',[id])).rows[0]
    assert(row);assert.equal(row.google_event_id,g.eventId);assert.equal(row.notas,'Conservar esta nota');assert.equal(row.duracion_min,270)
    assert.equal((await db.query('select id from marca_reuniones where id=$1',[id])).rowCount,0)
    const agenda=await cargarAgendaCalendario({desde:fecha,hasta:fecha,marcasAcceso:[brand]})
    const entries=agenda.eventos.filter(e=>e.id===id||e.id===g.eventId)
    assert.equal(entries.length,1);assert.equal(entries[0].tipo,'grabacion');assert.equal(entries[0].hora,'11:00');assert.equal(entries[0].duracionMin,270);assert(entries[0].meetLink)
    const originalCreated=row.created_at
    await db.query("update grabaciones set enlace_guiones='https://example.com/guiones',videos_grabados=3 where id=$1",[id])
    const reverse = await guardarEdicionAgenda(id,{...base,origen:'grabacion',hora:'12:15',duracionMin:95},'qa')
    assert(reverse.ok)
    row=(await db.query('select * from marca_reuniones where id=$1',[id])).rows[0]
    assert.equal(row.fecha_hora.toISOString(),fecha+'T17:15:00.000Z');assert.equal(row.duracion_min,95);assert.equal(row.created_at.toISOString(),originalCreated.toISOString())
    assert.equal(row.calendario_datos.grabacion.videos_grabados,3)
    assert((await guardarEdicionAgenda(id,{...base,tipo:'grabacion',hora:'12:15',duracionMin:95},'qa')).ok)
    row=(await db.query('select * from grabaciones where id=$1',[id])).rows[0]
    assert.equal(row.enlace_guiones,'https://example.com/guiones');assert.equal(row.videos_grabados,3)
    const parallel=await Promise.all([guardarEdicionAgenda(id,{...base,origen:'grabacion'},'qa'),guardarEdicionAgenda(id,{...base,origen:'grabacion'},'qa')])
    assert.equal(parallel.filter(x=>x.ok).length,1,'Concurrent conversion must not duplicate')
    await db.query(`insert into marca_reuniones(id,marca_id,titulo,fecha_hora,google_event_id) values($1,$2,$3,$4,'missingeventqa00001')`,[failedId,brand,titulo,fecha+'T10:00:00-05:00'])
    assert.equal((await guardarEdicionAgenda(failedId,{...base,tipo:'grabacion'},'qa')).ok,false)
    assert.equal((await db.query('select id from grabaciones where id=$1',[failedId])).rowCount,0)
    assert.equal((await db.query('select id from marca_reuniones where id=$1',[failedId])).rowCount,1)
    console.log('PASS conversion roundtrip, stable IDs/Meet, duration, notes, snapshots, concurrent edits and Google error rollback')
    const plain=await createTimedEvent({summary:titulo+' GOOGLE',fecha,hora:'08:00',durationMin:60})
    assert(plain.ok);gIds.push(plain.eventId)
    let edited=await editarDetalleGoogle(plain.eventId,{...base,origen:'gcal',crearMeet:true})
    assert(edited.ok)
    let listed=await listCalendarEvents(fecha,fecha)
    let external=listed.find(e=>e.id===plain.eventId);assert(external);assert.equal(external.tipoAgenda,'reunion');assert(external.meetLink)
    const meet=external.meetLink
    edited=await editarDetalleGoogle(plain.eventId,{...base,origen:'gcal',tipo:'grabacion',hora:null})
    assert(edited.ok)
    listed=await listCalendarEvents(fecha,fecha);external=listed.find(e=>e.id===plain.eventId)
    assert(external);assert.equal(external.tipoAgenda,'grabacion');assert.equal(external.hora,null);assert.equal(external.meetLink,meet)
    edited=await editarDetalleGoogle(plain.eventId,{...base,origen:'gcal',hora:'23:30',duracionMin:120})
    assert(edited.ok)
    listed=await listCalendarEvents(fecha,fecha);external=listed.find(e=>e.id===plain.eventId)
    assert(external);assert.equal(external.hora,'23:30');assert.equal(external.durationMin,120);assert.equal(external.meetLink,meet)
    console.log('PASS Google explicit type, generated Meet, all-day ↔ timed, midnight, existing conference preserved')
  } finally {
    for(const gid of gIds) { const r=await deleteCalendarEvent(gid);assert(r.ok) }
    await db.query('delete from actividad where entidad_id=any($1::text[])',[[id,failedId]])
    await db.query('delete from grabaciones where marca_id=$1',[brand]);await db.query('delete from marca_reuniones where marca_id=$1',[brand]);await db.query('delete from marcas where id=$1',[brand]);await db.end()
    console.log('CLEAN temporary events and records removed')
  }
}
main().catch(e=>{console.error(e);process.exitCode=1})
