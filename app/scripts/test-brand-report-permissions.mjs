import assert from 'node:assert/strict';
import env from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.TEST_BASE_URL;
assert(base, 'TEST_BASE_URL requerido');
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const members = await service.from('team_members').select('nombre,email,rol_base,permisos_override').eq('activo', true);
assert.ifError(members.error);
const brand = await service.from('marcas').select('id,slug').eq('slug', 'little-joe').single();
assert.ifError(brand.error);
const snap = await service.from('social_report_snapshots').select('month,kind,payload').eq('brand_id', brand.data.id).eq('kind','report').order('month',{ascending:false}).limit(1).single();
assert.ifError(snap.error);
const month = snap.data.month;
for (const name of ['lorena', 'ailyn']) {
  const member = members.data.find(m => m.nombre.toLowerCase().includes(name)); assert(member);
  const jar = new Map();
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})), setAll: cs => cs.forEach(c => jar.set(c.name,c.value)) } });
  async function request(path, options = {}) {
    const res = await fetch(base + path, { ...options, headers: { cookie: [...jar].map(([k,v])=>`${k}=${v}`).join('; '), origin: base, 'content-type':'application/json' }, signal: AbortSignal.timeout(45000), redirect: 'manual' });
    const text = await res.text();
    return { status: res.status, text, json: () => JSON.parse(text) };
  }
  try {
    const link = await service.auth.admin.generateLink({type:'magiclink',email:member.email}); assert.ifError(link.error);
    assert.ifError((await auth.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'magiclink'})).error);
    const report = await request(`/api/meta/reporte-redes?marca=little-joe&mes=${month}`);
    if (name === 'lorena') {
      assert.equal(report.status,200,report.text.slice(0,300));
      assert.deepEqual(report.json().channels,snap.data.payload.channels,'Mismo reporte guardado, sin alterar métricas');
      const space = await request('/api/estrategia?marca=little-joe'); assert.equal(space.status,200,space.text.slice(0,200));
      assert.equal(space.json().me.canViewReports,true); assert.equal(space.json().me.manager,false);
      for (const path of ['/marca/little-joe/estrategia','/marca/little-joe/reportes','/marca/little-joe/metricas','/api/estrategia/pauta/historial?marca=little-joe','/api/estrategia/oral-beauty-360?marca=oral-bueaty&mes='+month]) {
        const r = await request(path); assert.equal(r.status,200,`${path}: ${r.text.slice(0,200)}`);
        if(path.endsWith('/estrategia')) { assert(r.text.includes('Reportes de redes')); assert(r.text.includes('Reporte de anuncios')); }
        console.log('PASS Lorena lectura',path);
      }
      for (const path of ['/api/finanzas','/api/meta/ads-mcp/accounts?marca=little-joe']) assert.equal((await request(path)).status,403,path);
      // Entradas inválidas: aun con una regresión nunca editan datos comerciales.
      for(const path of ['/api/estrategia/pauta/historial','/api/tiktok/cuenta','/api/meta/reporte-redes/actualizar']) {
        const r=await request(path,{method:'POST',body:JSON.stringify({marca:'qa-sin-marca',mes:month,accion:'actualizar'})}); assert.equal(r.status,403,`${path}: ${r.text.slice(0,200)}`);
      }
      console.log('PASS Lorena conserva rol, acceso privado denegado y gestión denegada');
    } else {
      assert.equal(report.status,403,report.text.slice(0,200));
      const tasks=await request('/tareas');assert.equal(tasks.status,200);
      console.log('PASS Ailyn: tablero accesible, reportes sin permiso bloqueados');
    }
  } finally { await auth.auth.signOut({scope:'local'}); }
}
const anon=await fetch(base+`/api/meta/reporte-redes?marca=little-joe&mes=${month}`,{redirect:'manual'});
assert([401,303,307].includes(anon.status));
console.log('PASS anónimo bloqueado; sin cambios a permisos, cuentas o contenido');
