// Does not authorize Meta or exchange codes. Uses disposable local auth sessions.
import assert from 'node:assert/strict'
import env from '@next/env'
import pg from 'pg'
import {createClient} from '@supabase/supabase-js'
import {createServerClient} from '@supabase/ssr'
import {sha256} from '../lib/meta-mcp/crypto.ts'
env.loadEnvConfig(process.cwd(),false,{info(){},error(){}})
const base=process.env.TEST_BASE_URL||'http://localhost:3117',origin=process.env.TEST_PUBLIC_ORIGIN||'https://app.distintostudio.com'
const svc=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL||process.env.SUPABASE_DB_URL_DIRECT,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000})
await db.connect()
async function session(email){const jar=new Map();const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});const {data,error}=await svc.auth.admin.generateLink({type:'magiclink',email});assert.ifError(error);assert.ifError((await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'})).error);return{auth,cookie:()=>[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}}
const sessions=[],hashes=[]
try{
 const owner=await session('pedro@agenciadistinto.com');sessions.push(owner)
 const headers={cookie:owner.cookie(),origin}
 let r=await fetch(base+'/api/meta/ads-mcp/status?marca=little-joe',{headers});assert.equal(r.status,200);const status=await r.json();assert(status.configured);assert(!('brand' in status));assert(!JSON.stringify(status).includes('tokens_encrypted'))
 r=await fetch(base+'/marca/little-joe/metricas',{headers});assert.equal(r.status,200);const html=await r.text();assert(html.includes('Métricas de'));assert(html.includes('Meta Ads'));assert(!html.includes('tokens_encrypted'))
 r=await fetch(base+'/api/meta/ads-mcp/start',{method:'POST',headers:{...headers,origin:'https://wrong.example'},body:new URLSearchParams({marca:'little-joe'}),redirect:'manual'});assert.equal(r.status,403)
 r=await fetch(base+'/api/meta/ads-mcp/start',{method:'POST',headers,body:new URLSearchParams({marca:'little-joe'}),redirect:'manual'});assert.equal(r.status,303)
 const authUrl=new URL(r.headers.get('location')),state=authUrl.searchParams.get('state');hashes.push(sha256(state))
 assert.equal(authUrl.origin,'https://www.facebook.com');assert.equal(authUrl.searchParams.get('redirect_uri'),origin+'/api/meta/ads-mcp/callback');assert.equal(authUrl.searchParams.get('code_challenge_method'),'S256');assert.equal(authUrl.searchParams.get('resource'),'https://mcp.facebook.com/ads')
 const scopes=authUrl.searchParams.get('scope').split(' ');assert(scopes.includes('ads_read'));assert(scopes.includes('pages_read_engagement'));assert(scopes.includes('instagram_manage_insights'));assert(!scopes.includes('ads_management'));assert(!scopes.includes('catalog_management'))
 const setCookie=r.headers.get('set-cookie');assert(setCookie.includes('HttpOnly'));assert(setCookie.includes('Secure'));assert(setCookie.includes('SameSite=lax'))
 const {rows}=await db.query('SELECT verifier_encrypted FROM meta_agency_oauth_states WHERE state_hash=$1',[hashes[0]]);assert.equal(rows.length,1);assert(rows[0].verifier_encrypted.startsWith('v1.'));assert.notEqual(rows[0].verifier_encrypted,authUrl.searchParams.get('code_challenge'))
 const callback=base+'/api/meta/ads-mcp/callback?error=access_denied&state='+encodeURIComponent(state)
 // Missing browser cookie must not consume a valid attempt.
 await fetch(callback,{headers,redirect:'manual'});assert.equal((await db.query('SELECT 1 FROM meta_agency_oauth_states WHERE state_hash=$1',[hashes[0]])).rowCount,1)
 const bound={...headers,cookie:headers.cookie+'; distinto_meta_mcp_state='+state}
 const responses=await Promise.all([fetch(callback,{headers:bound,redirect:'manual'}),fetch(callback,{headers:bound,redirect:'manual'})]);assert(responses.every(r=>r.status===303));assert.equal((await db.query('SELECT 1 FROM meta_agency_oauth_states WHERE state_hash=$1',[hashes[0]])).rowCount,0)
 // Denial preserves any previous authorization and produces no credentials.
 const after=await fetch(base+'/api/meta/ads-mcp/status?marca=little-joe',{headers}).then(r=>r.json());assert.equal(after.updatedAt,status.updatedAt);assert.equal(after.authorized,status.authorized)
 const client=await session('total@distintostudio.com');sessions.push(client)
 for(const path of ['/api/meta/ads-mcp/status?marca=little-joe','/marca/little-joe/metricas']){r=await fetch(base+path,{headers:{cookie:client.cookie()},redirect:'manual'});assert([403,307].includes(r.status));if(r.status===307)assert.equal(new URL(r.headers.get('location'),base).pathname,'/cliente')}
 r=await fetch(base+'/api/meta/ads-mcp/status?marca=little-joe',{redirect:'manual'});assert([401,307].includes(r.status))
 const anonymous=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
 for(const table of ['meta_mcp_connections','meta_agency_connection','meta_brand_accounts','meta_agency_oauth_states']){const result=await anonymous.from(table).select('*');assert(result.error,'Anonymous table access must fail')}
 console.log('PASS owner access, customer/anonymous isolation, HTTPS callback, PKCE, cookie binding, replay prevention, consent denial and private tables')
}finally{
 for(const hash of hashes)await db.query('DELETE FROM meta_agency_oauth_states WHERE state_hash=$1',[hash])
 for(const s of sessions)await s.auth.auth.signOut({scope:'local'})
 await db.end()
}
