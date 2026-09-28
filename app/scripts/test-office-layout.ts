import { strict as assert } from 'node:assert'
import { MUEBLES, ASIENTOS, SPAWN, construirColisiones, esSolido, zonaDe } from '../app/oficina/_mapa'
import { buscarCamino, sillaDeEscritorio } from '../app/oficina/_camino'
import { avatarPorNombre, avatarValido, normalizarAvatar, PEINADOS } from '../app/oficina/_avatar'
import { crearPersonaje, animarPersonaje, liberarPersonaje } from '../app/oficina/_personaje-3d'
const grid = construirColisiones(), spawn = { x: SPAWN.x + .5, y: SPAWN.y + .5 }
for (const s of ASIENTOS) {
  assert(!esSolido(grid, s.x, s.y), `Asiento bloqueado ${JSON.stringify(s)}`)
  const path = buscarCamino(grid, spawn, s)
  assert(path?.length, `Asiento inalcanzable ${JSON.stringify(s)}`)
  assert.deepEqual(path.at(-1), { x:s.x, y:s.y })
  let previous=spawn
  for(const point of path){
    const steps=Math.ceil(Math.hypot(point.x-previous.x,point.y-previous.y)*10)
    for(let i=0;i<=steps;i++){const t=steps?i/steps:1,x=previous.x+(point.x-previous.x)*t,y=previous.y+(point.y-previous.y)*t
      for(const [dx,dy] of [[-.32,-.32],[.32,-.32],[-.32,.32],[.32,.32]])assert(!esSolido(grid,x+dx,y+dy),`Ruta roza un obstáculo rumbo a ${JSON.stringify(s)}`)
    }
    previous=point
  }
}
const desks=MUEBLES.filter(m=>m.tipo==='escritorio')
assert.equal(desks.length,7,'Se conservan todos los puestos')
assert.equal(desks.filter(m=>!m.compartido).length,1,'Solo gerencia tiene una mesa independiente')
for(const desk of desks){const s=sillaDeEscritorio(desk.label!)!;assert(s,desk.label);assert.equal(s.x,desk.x+desk.w/2);assert.equal(s.dir,'n')}
assert.equal(zonaDe(sillaDeEscritorio('Pedro')!.x,sillaDeEscritorio('Pedro')!.y)?.id,'gerencia')
assert(ASIENTOS.filter(s=>zonaDe(s.x,s.y)?.id==='lounge').length>=3)
const old=avatarPorNombre('Prueba'); assert(avatarValido(old));assert.equal(normalizarAvatar(old).cuerpo,'neutro')
assert(!avatarValido({...old,piel:'invalid'}))
for(const cuerpo of ['hombre','mujer','neutro'] as const)for(const peinado of PEINADOS){
 const rig=crearPersonaje({...old,cuerpo,peinado,rostro:'angular',barba:'corta',vestimenta:'chaqueta'})
 for(let i=0;i<60;i++)animarPersonaje(rig,{x:i/30,y:1,dir:'e',mov:true,sentado:false},1/60,i/60)
 assert(rig.piernas.some(p=>Math.abs(p.knee.rotation.x)>.01),'Rodillas animadas')
 for(let i=0;i<120;i++)animarPersonaje(rig,{x:2,y:1,dir:'n',mov:false,sentado:true},1/60,i/60)
 assert(rig.sitting>.99);assert(rig.piernas.every(p=>p.knee.rotation.x>1.4),'Sentado dobla rodillas')
 liberarPersonaje(rig)
}
console.log(`PASS: ${ASIENTOS.length} asientos alcanzables; siete sillas alineadas; gerencia y sillones; avatares antiguos; 24 variantes articuladas.`)
