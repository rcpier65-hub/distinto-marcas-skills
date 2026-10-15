import assert from 'node:assert/strict'
import {mergeScene,actionFingerprint,actionInput,recordDataSchema,safeURL,byCampaign} from '../lib/estrategia/model.ts'
const a={id:'a',version:1,versionNonce:4,index:'a0'}, b={id:'b',version:1,versionNonce:5,index:'a1'}
assert.deepEqual(mergeScene([a,b],[{...a,version:2,text:'cambio A'}]).map(e=>e.id),['a','b'])
assert.equal(mergeScene([a],[{...a,version:2,isDeleted:true}])[0].isDeleted,true)
assert.equal(mergeScene([{...a,version:2,isDeleted:true}],[a])[0].isDeleted,true)
const left=mergeScene([a],[{...a,versionNonce:3,text:'B'}]),right=mergeScene([{...a,versionNonce:3,text:'B'}],[a])
assert.deepEqual(left,right)
assert.equal(actionFingerprint('  Revisión   de Logo! '),actionFingerprint('revision de logo'))
assert.equal(safeURL('javascript:alert(1)'), ''); assert.equal(safeURL('https://example.com'), 'https://example.com/')
assert.equal(actionInput.parse({id:'d5bc4cbe-b052-4e4b-9994-2151b2adf676',text:'Revisar'}).memberId,null)
assert.equal(actionInput.parse({id:'d5bc4cbe-b052-4e4b-9994-2151b2adf676',text:'Revisar'}).clientVisible,false)
assert.throws(()=>recordDataSchema.parse({adBudget:-1}));assert.throws(()=>recordDataSchema.parse({start:'2026-99-42'}))
const activity={source:'task',sourceId:'1'};assert.equal(byCampaign([activity],[{campaign_id:'c',target_type:'task',target_id:'1'}],'c').length,1)
assert.equal(byCampaign([activity],[{campaign_id:'c',target_type:'publication',target_id:'1'}],'c').length,0)
console.log('PASS: fusión concurrente, eliminaciones, validación, visibilidad privada por defecto y enlaces de campañas.')
