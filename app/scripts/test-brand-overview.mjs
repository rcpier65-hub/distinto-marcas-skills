import assert from 'node:assert/strict'
import { designFinished, weekWindow, operational, periodWork, DEFAULT_WORK_PERIOD } from '../lib/estrategia/activity-status.ts'
import { metricNumber, insightTotal } from '../lib/estrategia/social-model.ts'
assert.equal(designFinished({es_tarea_diseno:true,estado_tarea:'listo'}),true)
assert.equal(designFinished({es_tarea_diseno:false,fecha_publicacion:'2026-10-20',estado_tarea:'listo'}),false)
assert.equal(designFinished({es_tarea_diseno:false,fecha_publicacion:'2026-10-20',diseno_terminado_at:'2026-10-12T12:00:00Z'}),true)
assert.equal(designFinished({es_tarea_diseno:true,estado_tarea:'pausada'}),false)
assert.deepEqual(weekWindow('2026-10-15'),{start:'2026-10-12',end:'2026-10-18'})
assert.deepEqual(weekWindow('2026-11-01'),{start:'2026-10-26',end:'2026-11-01'})
assert.equal(operational({kind:'Fecha importante'}),false)
assert.equal(operational({kind:'Diseño'}),true)
assert.equal(metricNumber(0),0)
assert.equal(metricNumber(null),null)
assert.equal(metricNumber(''),null)
assert.equal(metricNumber(-1),null)
assert.equal(insightTotal({data:[{name:'reach',total_value:{value:345}}]},'reach'),345)
assert.equal(insightTotal({data:[{name:'reach',values:[{value:100},{value:100}]}]},'reach'),null,'Do not sum daily unique reach')
assert.equal(insightTotal({data:[]},'reach'),null)
assert.equal(insightTotal(null,'reach'),null)
console.log('PASS completed designs, week boundaries, Meta missing/zero data and unique reach semantics')

const activities = [
 {id:'undated', kind:'Tarea', date:null, done:false},
 {id:'overdue', kind:'Tarea', date:'2026-09-30', done:false},
 {id:'upcoming', kind:'Tarea', date:'2026-11-02', done:false},
 {id:'completed', kind:'Tarea', date:'2026-10-15', done:true},
 {id:'meeting', kind:'Reunión', date:'2026-10-16', done:false},
]
assert.deepEqual(periodWork(activities,'2026-10-16',DEFAULT_WORK_PERIOD).map(a=>a.id),['undated','overdue','upcoming','completed'], 'Default overview must keep pending tasks regardless of date')
assert.deepEqual(periodWork(activities,'2026-10-16','mes').map(a=>a.id),['completed'], 'Monthly filter is explicit, not the default')
assert.deepEqual(periodWork(activities,'2026-10-16','sinfecha').map(a=>a.id),['undated'])
assert.deepEqual(periodWork(activities,'2026-10-16','semana').map(a=>a.id),['completed'])
assert.equal(new Set(periodWork(activities,'2026-10-16','todos').map(a=>a.id)).size,4)
console.log('PASS undated, overdue and future tasks remain visible by default; explicit date filters preserved')
