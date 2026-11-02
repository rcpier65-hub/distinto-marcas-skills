import assert from 'node:assert/strict';
import env from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
env.loadEnvConfig(process.cwd(), false, {info(){},error(){}});
const base=process.env.TEST_BASE_URL; assert(base);
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const brand=await service.from('marcas').select('id').eq('slug','distinto-studio').single();assert.ifError(brand.error);
const fields='id,nombre,fecha_publicacion,estado,editado,editado_at,video_con_musica_url,video_sin_musica_url,updated_at';
const before=await service.from('publicaciones').select(fields).eq('marca_id',brand.data.id).order('id');assert.ifError(before.error);
const edited=before.data.filter(p=>p.editado&&p.estado==='aprobar'&&p.video_con_musica_url);assert(edited.length>=5);
const visible=before.data.filter(p=>p.estado!=='archivado');
const members=await service.from('team_members').select('email,nombre').eq('activo',true);assert.ifError(members.error);
for(const name of ['pedro','lorena']){
 const member=members.data.find(m=>m.nombre.toLowerCase().includes(name));assert(member);
 const jar=new Map(); const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});
 try{
  const link=await service.auth.admin.generateLink({type:'magiclink',email:member.email});assert.ifError(link.error);
  assert.ifError((await auth.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'magiclink'})).error);
  const start=Date.now();const res=await fetch(base+'/publicaciones?marca=distinto-studio',{headers:{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')},redirect:'manual',signal:AbortSignal.timeout(45000)});const text=await res.text();assert.equal(res.status,200);
  assert(!text.includes('No se pudieron cargar las publicaciones.'));
  for(const p of visible)assert(text.includes(p.id),`${name}: registro ${p.id} ausente`);
  for(const p of before.data.filter(p=>p.estado==='archivado'))assert(!text.includes(p.id),`${name}: archivado no debe mostrarse como pendiente`);
  console.log(`PASS ${name}: ${visible.length} registros visibles de Distinto, ${edited.length} videos editados; archivados excluidos; HTTP completo ${Date.now()-start} ms`);
 }finally{await auth.auth.signOut({scope:'local'});}
}
const after=await service.from('publicaciones').select(fields).eq('marca_id',brand.data.id).order('id');assert.ifError(after.error);assert.deepEqual(after.data,before.data,'Consulta no cambia contenido, fechas, orden ni estado');
const anon=await fetch(base+'/publicaciones?marca=distinto-studio',{redirect:'manual'});assert([303,307].includes(anon.status));
console.log('PASS datos originales conservados; anónimo bloqueado; sesiones propias cerradas');
