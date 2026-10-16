import assert from 'node:assert/strict'
import { calendarMonthRange, googleBrandActivities, recordingFinished } from '../lib/estrategia/calendar-activities.ts'
import { periodWork } from '../lib/estrategia/activity-status.ts'
import { fetchCalendarPages } from '../lib/calendario/google-event-pages.ts'

const recording={id:'google-recording',origenGoogle:true,tipo:'grabacion',marcaSlug:'little-joe',titulo:'Grabación TypHouse',fecha:'2026-10-02',hora:'10:00',estado:null}
const events=[recording,recording,{...recording,id:'linked'},{...recording,id:'other',marcaSlug:'otra-marca'},{...recording,id:'unknown',marcaSlug:null},{...recording,id:'internal',origenGoogle:false},{...recording,id:'pub',tipo:'publicacion'},{...recording,id:'meeting',tipo:'reunion'}]
const activities=googleBrandActivities(events,'little-joe',new Set(['linked']))
assert.deepEqual(activities.map(a=>a.sourceId),['google-recording','meeting'])
assert.equal(periodWork(activities,'2026-10-16','mes').filter(a=>a.kind==='Grabación').length,1)
assert.equal(activities[0].date,'2026-10-02');assert.equal(activities[0].time,'10:00');assert.equal(activities[0].done,false)
assert.equal(new URL(activities[0].href,'https://example.com').searchParams.get('desde'),'2026-10-02')
assert.equal(new URL(activities[0].href,'https://example.com').searchParams.get('marca'),'little-joe')
assert.equal(recordingFinished({estado:'cumplida'}),true)
assert.equal(recordingFinished({estado:'planeada',fecha_real:'2026-10-02'}),true)
assert.equal(recordingFinished({estado:'planeada'}),false)
assert.deepEqual(calendarMonthRange('2026-10'),{desde:'2026-09-28',hasta:'2026-11-01'})
assert.deepEqual(calendarMonthRange('2026-12'),{desde:'2026-11-30',hasta:'2027-01-03'})
assert.throws(()=>calendarMonthRange('2026-99'))
let pages=[]
const full=await fetchCalendarPages(new URL('https://example.com?fields=items,nextPageToken'),async url=>{
 pages.push(url.searchParams.get('pageToken'))
 return Response.json(pages.length===1?{items:[],nextPageToken:'second'}:{items:[{id:'late-recording'}]})
})
assert.deepEqual(pages,[null,'second']);assert(full.complete);assert.equal(full.items[0].id,'late-recording')
let calls=0
const partial=await fetchCalendarPages(new URL('https://example.com'),async()=>++calls===1?Response.json({items:[{id:'first'}],nextPageToken:'next'}):new Response(null,{status:503}))
assert.equal(partial.complete,false);assert.equal(partial.items.length,1)
const failed=await fetchCalendarPages(new URL('https://example.com'),async()=>{throw new Error('offline')})
assert.equal(failed.complete,false);assert.deepEqual(failed.items,[])
console.log('PASS original calendar IDs, brand isolation, duplicate suppression, scheduled vs completed, month navigation and paginated/failed Google reads')
