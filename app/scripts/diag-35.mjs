import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync(new URL('../.env.local.backup', import.meta.url), 'utf8').split('\n').filter((l)=>l.includes('=')).map((l)=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const { data: marca } = await db.from('marcas').select('id, metricool_blog_id').eq('slug','la-victoria').maybeSingle()
const { data: integ } = await db.from('integraciones').select('metricool_user_id, metricool_user_token').eq('id',1).maybeSingle()
const U=integ.metricool_user_id, T=integ.metricool_user_token
async function f(p){const r=await fetch(`https://app.metricool.com/api/v2/inbox/post-comments?blogId=${marca.metricool_blog_id}&provider=${p}&limit=100&userId=${U}`,{headers:{'Content-Type':'application/json','X-Mc-Auth':T},cache:'no-store'});if(!r.ok)return [];const j=JSON.parse(await r.text()||'{}');return Array.isArray(j)?j:(j?.data??[])}
// genuine pending: customer root + no reply
const genuine=[]
for (const [net,prov] of [['facebook','FACEBOOK'],['instagram','INSTAGRAM']]) {
  for (const t of await f(prov)) {
    const self=String(t?.self), ro=String(t?.root?.owner)
    const hasReply=(t?.root?.comments??[]).some((c)=>String(c?.owner)===self)
    if (ro!==self && !hasReply) genuine.push({ net, id:t.id, text:(t?.root?.text??'').slice(0,50), author:ro })
  }
}
console.log(`Pendientes reales (cliente sin responder) en Metricool: ${genuine.length}`)
// check each in DB
let enDB={pending:0,responded:0,skipped:0,approved:0,failed:0}, noEnDB=0
for (const g of genuine) {
  const { data } = await db.from('comentarios_inbox').select('status').eq('marca_id',marca.id).eq('network',g.net).eq('metricool_comment_id',g.id).maybeSingle()
  if (!data) noEnDB++; else enDB[data.status]=(enDB[data.status]||0)+1
}
console.log('  De esos, en la BD por estado:', enDB)
console.log('  NO están en la BD:', noEnDB)
console.log('\n  Muestra de 5 reales:')
for (const g of genuine.slice(0,5)) console.log(`   - [${g.net}] @${g.author}: "${g.text}"`)
