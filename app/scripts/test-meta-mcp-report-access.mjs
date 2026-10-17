import assert from 'node:assert/strict'
import env from '@next/env'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}})
const base=process.env.TEST_BASE_URL||'http://localhost:3117',origin=process.env.TEST_PUBLIC_ORIGIN||'https://app.distintostudio.com'
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const sessions=[]
async function session(email){const jar=new Map();const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});const {data,error}=await service.auth.admin.generateLink({type:'magiclink',email});assert.ifError(error);assert.ifError((await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'})).error);sessions.push(auth);return()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}
try{
 const owner=await session('pedro@agenciadistinto.com'),client=await session('total@distintostudio.com')
 const member=await service.from('team_members').select('email').eq('activo',true).ilike('nombre','%lorena%').limit(1).single();assert.ifError(member.error)
 const teammate=await session(member.data.email)
 for(const path of ['accounts','status']){const r=await fetch(`${base}/api/meta/ads-mcp/${path}`,{headers:{cookie:teammate()},redirect:'manual'});assert.equal(r.status,403,'Team must not enumerate all agency assets')}
 let denied=await fetch(base+'/api/meta/ads-mcp/start',{method:'POST',headers:{cookie:teammate(),origin},redirect:'manual'});assert.equal(denied.status,403,'Only owner may replace the agency grant')
 for(const path of ['accounts','report']){
  let response=await fetch(`${base}/api/meta/ads-mcp/${path}?marca=little-joe`,{headers:{cookie:client()},redirect:'manual'});assert([403,307].includes(response.status))
  response=await fetch(`${base}/api/meta/ads-mcp/${path}?marca=little-joe`,{redirect:'manual'});assert([401,307].includes(response.status))
 }
 const headers={cookie:owner(),origin,'Content-Type':'application/json'}
 const before=await fetch(base+'/api/meta/ads-mcp/status?marca=little-joe',{headers}).then(r=>r.json())
 const bindingsBefore=await service.from('meta_brand_accounts').select('*').order('marca_id');assert.ifError(bindingsBefore.error)
 let r=await fetch(base+'/api/meta/ads-mcp/accounts',{method:'POST',headers:{...headers,origin:'https://wrong.example'},body:JSON.stringify({marca:'little-joe',selection:{adAccountId:'1206507377876940',facebookPageId:null,instagramUserId:null}})});assert.equal(r.status,403)
 r=await fetch(base+'/api/meta/ads-mcp/accounts',{method:'POST',headers,body:JSON.stringify({marca:'little-joe',selection:{adAccountId:'wrong',facebookPageId:null,instagramUserId:null}})});assert.equal(r.status,400)
 for(const query of ['period=arbitrary','accountId=123','tool=ads_create_campaign']){r=await fetch(base+'/api/meta/ads-mcp/report?marca=little-joe&'+query,{headers});assert.equal(r.status,400)}
 r=await fetch(base+'/api/meta/ads-mcp/report?marca=total-sups',{headers});assert.equal(r.status,409)
 const after=await fetch(base+'/api/meta/ads-mcp/status?marca=little-joe',{headers}).then(r=>r.json());assert.equal(after.authorized,before.authorized);assert.equal(after.updatedAt,before.updatedAt)
 const bindingsAfter=await service.from('meta_brand_accounts').select('*').order('marca_id');assert.ifError(bindingsAfter.error);assert.deepEqual(bindingsAfter.data,bindingsBefore.data,'Rejected edits must not change any brand selection')
 if(process.env.TEST_LIVE_META==='1'){
  r=await fetch(base+'/api/meta/ads-mcp/report?marca=little-joe&period=this_month',{headers});assert.equal(r.status,200);const report=await r.json();assert.equal(report.account.id,'1206507377876940');assert.equal(report.account.currency,'USD');assert.equal(report.timezone,'America/Lima');assert.equal(typeof report.metrics.amount_spent,'number');assert(!JSON.stringify(report).includes('access_token'));console.log(JSON.stringify({account:report.account.name,period:report.period,spend:report.metrics.amount_spent,impressions:report.metrics.impressions,checkedAt:report.fetchedAt}))
 }
 console.log('PASS owner/client/anonymous access, fixed account, allowed periods, no arbitrary tools and unchanged configuration')
}finally{for(const auth of sessions)await auth.auth.signOut({scope:'local'})}
