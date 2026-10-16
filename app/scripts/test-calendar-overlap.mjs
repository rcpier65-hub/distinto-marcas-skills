import assert from 'node:assert/strict'
import { layoutDia, crucesAgenda, horarioEvento } from '../lib/calendario/intervalos.ts'

const event = (id, hora, duracionMin, extra={}) => ({id,tipo:'reunion',titulo:id,fecha:'2026-10-16',hora,duracionMin,estado:'agendada',...extra})
const praktico=event('praktico','15:00',300,{tipo:'grabacion'})
const vozchler=event('vozchler','17:00',45)
const slots=[{id:'praktico',ini:900,fin:1200},{id:'vozchler',ini:1020,fin:1065}]
const layout=layoutDia(slots)
assert.equal(layout.length,2)
assert.notEqual(layout[0].col,layout[1].col,'Contained meeting must not be covered by a long recording')
assert(layout.every(e=>e.cols===2))
assert.deepEqual(crucesAgenda([praktico,vozchler]).map(g=>g.eventos.map(e=>e.id)),[['praktico','vozchler']])
assert.equal(horarioEvento(praktico),'3pm – 8pm')
assert.equal(horarioEvento(vozchler),'5pm – 5:45pm')
assert.equal(crucesAgenda([praktico,event('after','20:00',45)]).length,0,'Touching endpoints do not overlap')
assert.equal(crucesAgenda([praktico,{...vozchler,fecha:'2026-10-17'}]).length,0)
assert.equal(crucesAgenda([praktico,{...vozchler,estado:'cancelada'}]).length,0)
assert.equal(crucesAgenda([praktico,{...vozchler,hora:null}]).length,0)
assert.equal(crucesAgenda([praktico,{...vozchler,tipo:'publicacion'}]).length,0,'A publication window is not a meeting conflict')
assert.equal(crucesAgenda([praktico]).length,0,'Filtered out events must not be exposed in conflict details')
const chain=[{id:'a',ini:900,fin:960},{id:'b',ini:930,fin:1000},{id:'c',ini:960,fin:1020},{id:'d',ini:1200,fin:1260}]
const chainResult=layoutDia(chain)
assert(chainResult.slice(0,3).every(e=>e.cols===2))
assert.equal(chainResult[0].col,chainResult[2].col,'Reuse a column once the earlier event ends')
assert.equal(chainResult[3].cols,1,'Independent groups use full width')
assert.deepEqual(chain.map(e=>e.id),['a','b','c','d'],'Source array stays unchanged')
// Dense deterministic fixture: retain every event and ensure no overlapping pair shares a column.
const dense=Array.from({length:80},(_,i)=>({id:String(i),ini:360+(i*47)%900,fin:360+(i*47)%900+15+(i*31)%240}))
const denseLayout=layoutDia(dense)
assert.equal(new Set(denseLayout.map(e=>e.id)).size,dense.length)
for(const a of denseLayout)for(const b of denseLayout){if(a.id!==b.id&&a.ini<b.fin&&b.ini<a.fin)assert.notEqual(a.col,b.col)}
console.log('PASS nested, chained, equal-endpoint and dense overlaps; dates, cancellation, filters and readable time ranges')
