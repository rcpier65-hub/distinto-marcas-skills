import { strict as assert } from 'node:assert'
import { decidir, debeConectar, type EstadoAudio } from '../app/oficina/_audio-grafo'
import { AudioSenderGate } from '../app/oficina/_audio-sender'
import { InvitacionesOficina, type SenalConversacion } from '../app/oficina/_invitaciones'
import { construirColisiones, zonaDe } from '../app/oficina/_mapa'
import { caminoParaAcercarse, sillaDeEscritorio } from '../app/oficina/_camino'

const person = (id:string, x=0, y=0, more:Partial<EstadoAudio>={}):EstadoAudio => ({id,x,y,zona:null,privada:null,spot:false,ghost:false,quiet:false,estado:'disponible',...more})
const a=person('a'), near=person('b',1), desk=person('b',3)
assert.equal(decidir(a,near,false).gain,1)
assert.equal(decidir(a,desk,true).gain,0,'Adjacent desks three units apart must be silent, even with retained transport')
assert.equal(decidir(a,person('b',2.6),true).gain,0,'Exact audible boundary is silent')
assert.equal(decidir(a,person('b',1.9,1.9),true).gain,0,'Diagonal distance must not enlarge audible range')
assert.equal(decidir({...a,zona:'lounge'},{...desk,zona:'lounge'},true).gain,0,'Same room must respect distance')
assert.equal(decidir({...a,zona:'lounge'},near,true).gain,0,'Walls isolate')
assert.equal(decidir(a,{...near,estado:'nomolestar'},true).gain,0)
assert.equal(decidir(a,{...near,ghost:true},true).gain,0)
assert.equal(decidir({...a,quiet:true},person('b',1.5),true).gain,0)
assert(decidir(a,person('b',3.2),true).conectar,'Silent transport survives just outside range')
assert(!decidir(a,person('b',3.5),true).conectar)
const pa={...a,privada:'invitation'}, pb={...desk,x:30,zona:'gerencia',privada:'invitation'}
assert.equal(decidir(pa,pb,false).gain,1,'Accepted private call may persist across rooms')
for(const [me,other] of [[pa,near],[near,pa],[pa,{...near,spot:true}],[{...near,spot:true},pa]]) assert.equal(decidir(me,other,true).gain,0,'No private audio reaches bystanders in either direction')
const announcer=person('b',30,0,{spot:true})
assert.equal(decidir(a,announcer,false).gain,1)
assert.equal(decidir(announcer,a,true).gain,0,'A distant announcement must not open the listeners microphone back to presenter')
assert(debeConectar(a,announcer,false))

// Race: distance changes while replaceTrack is still applying a microphone.
const track={readyState:'live'} as MediaStreamTrack
const calls:Array<MediaStreamTrack|null>=[];const resolvers:Array<()=>void>=[]
const sender={track:null as MediaStreamTrack|null,replaceTrack(t:MediaStreamTrack|null){calls.push(t);return new Promise<void>(r=>resolvers.push(()=>{sender.track=t;r()}))}}
const gate=new AudioSenderGate(sender)
gate.set(track,true);gate.set(track,false);resolvers.shift()!();await Promise.resolve()
assert.deepEqual(calls,[track,null]);resolvers.shift()!();await Promise.resolve();assert.equal(sender.track,null)
gate.set(track,true);resolvers.shift()!();await Promise.resolve();gate.set(null,true);resolvers.shift()!();await Promise.resolve();assert.equal(sender.track,null,'Mute wins over proximity')
gate.dispose();gate.set(track,true);assert.equal(sender.track,null)

const queue:SenalConversacion[]=[]
const alice=new InvitacionesOficina(()=> 'alice',s=>queue.push(s),()=>{})
const bob=new InvitacionesOficina(()=> 'bob',s=>queue.push(s),()=>{})
const snapshot=(who:InvitacionesOficina)=>who.state
const deliver=(who:InvitacionesOficina,now=1000)=>who.recibir(queue.shift()!,now)
assert(alice.invitar('bob','Alice',true,1000));deliver(bob)
assert.equal(snapshot(alice).activa,null,'Sending does not join a private call')
assert.equal(snapshot(bob).activa,null,'Ringing never opens the mic or joins')
bob.aceptar(1001);deliver(alice,1001)
assert.equal(snapshot(alice).activa?.id,snapshot(bob).activa?.id)
assert.equal(queue.length,0,'Accepting must not send a second invitation')
bob.terminar();deliver(alice);assert.equal(snapshot(alice).activa,null)
alice.invitar('bob','Alice',true,2000);deliver(bob,2000);bob.rechazar();deliver(alice,2001);assert.equal(alice.state.saliente,null)
alice.invitar('bob','Alice',true,3000);deliver(bob,3000);alice.cancelar();deliver(bob,3001);assert.equal(bob.aceptar(3001),null)
alice.invitar('bob','Alice',true,4000);deliver(bob,4000);bob.aceptar(4001);alice.cancelar();deliver(alice,4001);deliver(bob,4001);assert.equal(snapshot(alice).activa,null);assert.equal(snapshot(bob).activa,null,'Cancel/accept race cannot leave one party stuck')
alice.invitar('bob','Alice',true,5000);deliver(bob,5000);bob.tick(35001);assert.equal(bob.aceptar(35001),null);alice.tick(35001);deliver(bob,35001)
alice.invitar('bob','Alice',false,40000);deliver(bob,40000);assert.equal(bob.aceptar(40001)?.privada,false);deliver(alice,40001);assert.equal(snapshot(alice).activa,null,'Approach invitation does not bypass proximity')

const grid=construirColisiones();const target=sillaDeEscritorio('Pedro')!
const path=caminoParaAcercarse(grid,{x:20.5,y:20.5},target,[target])!
assert(path?.length);assert(Math.hypot(path.at(-1)!.x-target.x,path.at(-1)!.y-target.y)<=1.5)
assert.equal(zonaDe(path.at(-1)!.x,path.at(-1)!.y)?.id,'gerencia','Approach stays on the same side of the wall')
console.log('PASS: proximity, desk isolation, room boundaries, private exclusivity, directional send gating, async mute race, accept/decline/cancel/expiry and approach route')
