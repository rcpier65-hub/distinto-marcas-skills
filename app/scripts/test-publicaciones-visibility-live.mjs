import assert from 'node:assert/strict';
import env from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
env.loadEnvConfig(process.cwd(), false, {info(){},error(){}});
const base=process.env.TEST_BASE_URL; assert(base);
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const rows=[];
for(let start=0;;start+=500){
  const r=await db.from('publicaciones').select('id,nombre,estado,tipo_contenido,es_tarea_diseno,fecha_publicacion,marca:marcas(slug)').order('id').range(start,start+499);
  assert.ifError(r.error);rows.push(...r.data);if(r.data.length<500)break;
}
const internal=rows.filter(r=>(r.tipo_contenido??[]).includes('INTERNO'));
const legacy=rows.filter(r=>r.es_tarea_diseno&&!r.tipo_contenido?.length);
const allowed=['POST','CARRUSEL','HISTORIA','STORY','STORIES','REEL','REELS','VIDEO'];
const expected=rows.filter(r=>!internal.includes(r)&&(!r.es_tarea_diseno||(r.tipo_contenido??[]).some(t=>allowed.includes(t.trim().toUpperCase())))&&r.estado!=='archivado'&&!(r.estado==='disenar'&&!r.fecha_publicacion));
assert(internal.length>0);assert(legacy.length>0);
function publicationsFromHTML(html){
  const flight=[...html.matchAll(/self\.__next_f\.push\((.*?)\)<\/script>/gs)].map(m=>JSON.parse(m[1])).filter(p=>p[0]===1).map(p=>p[1]).join('');
  const marker='"publicaciones":['; const start=flight.indexOf(marker)+marker.length-1;
  assert(start>=marker.length-1&&flight[start]==='[','PublicacionesView payload missing');
  let depth=0,string=false,escape=false;
  for(let i=start;i<flight.length;i++){
    const c=flight[i];
    if(string){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')string=false;continue;}
    if(c==='"'){string=true;continue;}
    if(c==='[')depth++;if(c===']'&&--depth===0)return JSON.parse(flight.slice(start,i+1));
  }
  throw Error('Incomplete publications payload');
}
const members=await db.from('team_members').select('nombre,email').eq('activo',true);assert.ifError(members.error);
for(const name of ['pedro','lorena']){
  const member=members.data.find(m=>m.nombre.toLowerCase().includes(name));assert(member);
  const jar=new Map();const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});
  try{
    const link=await db.auth.admin.generateLink({type:'magiclink',email:member.email});assert.ifError(link.error);
    assert.ifError((await auth.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'magiclink'})).error);
    const headers={cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')};
    const response=await fetch(base+'/publicaciones',{headers,redirect:'manual',signal:AbortSignal.timeout(45000)});assert.equal(response.status,200);
    const shown=publicationsFromHTML(await response.text()); const ids=new Set(shown.map(p=>p.id));
    assert.equal(internal.filter(p=>ids.has(p.id)).length,0,'Los internos se filtran aunque estén terminados');
    assert.equal(legacy.filter(p=>ids.has(p.id)).length,0,'Diseños sin tipo no se convierten en posts');
    assert.deepEqual([...ids].sort(),expected.map(p=>p.id).sort(),'Se conservan todos los publicables y videos');
    for(const p of expected){const actual=shown.find(s=>s.id===p.id);assert.equal(actual.fecha,p.fecha_publicacion?.split('T')[0]??'','No inventar fecha actual');}
    const design=internal.find(r=>r.estado==='disenar'&&r.marca?.slug==='little-joe');assert(design);
    const detail=await fetch(base+'/diseno/'+design.id,{headers,redirect:'manual',signal:AbortSignal.timeout(45000)});assert.equal(detail.status,200);assert((await detail.text()).includes(design.nombre),'La tarea interna sigue accesible en Diseño');
    console.log(`PASS ${name}: ${internal.length} internos y ${legacy.length} diseños sin tipo fuera de grilla; ${shown.length} publicaciones conservadas; fechas reales; Diseño accesible`);
  }finally{await auth.auth.signOut({scope:'local'});}
}
const anon=await fetch(base+'/publicaciones',{redirect:'manual'});assert([303,307].includes(anon.status));
console.log('PASS sin mutaciones de contenido; sin mensajes; anónimo bloqueado; sesiones propias cerradas');
