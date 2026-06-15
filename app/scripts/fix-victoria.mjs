// Authoritative inbox fix for La Victoria. DRY-RUN unless --apply.
//  - archiva basura: pending cuyo author == la página (self)
//  - reactiva reales: skipped que Metricool muestra como cliente sin responder
//  - marca responded: pending que Metricool ya muestra respondidos
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(readFileSync(new URL('../.env.local.backup', import.meta.url), 'utf8').split('\n').filter((l)=>l.includes('=')).map((l)=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const { data: marca } = await db.from('marcas').select('id, metricool_blog_id').eq('slug','la-victoria').maybeSingle()
const { data: integ } = await db.from('integraciones').select('metricool_user_id, metricool_user_token').eq('id',1).maybeSingle()
const U=integ.metricool_user_id, T=integ.metricool_user_token
async function f(p){const r=await fetch(`https://app.metricool.com/api/v2/inbox/post-comments?blogId=${marca.metricool_blog_id}&provider=${p}&limit=100&userId=${U}`,{headers:{'Content-Type':'application/json','X-Mc-Auth':T},cache:'no-store'});if(!r.ok)return [];const j=JSON.parse(await r.text()||'{}');return Array.isArray(j)?j:(j?.data??[])}

let self = null
const win = new Map() // key -> {isOwn, hasReply}
for (const [net,prov] of [['facebook','FACEBOOK'],['instagram','INSTAGRAM'],['tiktok','TIKTOKBUSINESS']]) {
  for (const t of await f(prov)) {
    const s=String(t?.self); if (!self) self=s
    const ro=String(t?.root?.owner)
    const hasReply=(t?.root?.comments??[]).some((c)=>String(c?.owner)===s)
    win.set(`${net}|${t.id}`, { isOwn: ro===s, hasReply })
  }
}
console.log('self (ID página La Victoria):', self)

const { data: rows } = await db.from('comentarios_inbox')
  .select('id, network, metricool_comment_id, author_username, status')
  .eq('marca_id', marca.id).in('status',['pending','approved','skipped']).limit(3000)

const aArchivar=[], aReactivar=[], aResponded=[]
for (const r of rows ?? []) {
  const w = win.get(`${r.network}|${r.metricool_comment_id}`)
  const esBasura = String(r.author_username) === String(self) || (w && w.isOwn)
  if (esBasura) { if (r.status!=='skipped') aArchivar.push(r.id); continue }
  if (!w) continue // fuera de ventana: no tocar
  if (w.hasReply) { if (r.status==='pending'||r.status==='approved') aResponded.push(r.id) }
  else { if (r.status==='skipped') aReactivar.push(r.id) } // cliente sin responder, lo habíamos archivado mal
}

console.log(`\n${APPLY?'APLICANDO':'DRY-RUN'}:`)
console.log(`  archivar basura (autor = página): ${aArchivar.length}`)
console.log(`  reactivar reales (estaban skipped): ${aReactivar.length}`)
console.log(`  marcar responded (ya respondidos): ${aResponded.length}`)

if (APPLY) {
  const chunk=async(ids,status)=>{for(let i=0;i<ids.length;i+=200)await db.from('comentarios_inbox').update({status}).in('id',ids.slice(i,i+200))}
  await chunk(aArchivar,'skipped'); await chunk(aReactivar,'pending'); await chunk(aResponded,'responded')
  const { count } = await db.from('comentarios_inbox').select('id',{count:'exact',head:true}).eq('marca_id',marca.id).eq('status','pending')
  console.log(`\n✅ Pendientes ahora: ${count}`)
}
