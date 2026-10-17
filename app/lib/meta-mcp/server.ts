import 'server-only'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { strategyDB, transaction } from '@/lib/estrategia/db'
import { StrategyError } from '@/lib/estrategia/access'
import { encrypt, decrypt } from './crypto'

export const META_MCP_URL = 'https://mcp.facebook.com/ads'
export const META_AUTH_URL = 'https://www.facebook.com/v26.0/dialog/oauth'
export const META_TOKEN_URL = 'https://graph.facebook.com/v26.0/oauth/access_token'
export const META_CALLBACK_PATH = '/api/meta/ads-mcp/callback'
export const META_STATE_COOKIE = 'distinto_meta_mcp_state'
// Request reporting access. Never request campaign/catalog writes for this integration.
export const META_SCOPES = ['ads_read','ads_mcp_management','business_management','pages_show_list','instagram_basic','pages_read_engagement','instagram_manage_insights','read_insights']
export type Tokens = { access_token: string; refresh_token?: string; token_type: string; expires_in?: number; scope?: string }
export type ConnectionRow = { id: boolean; tokens_encrypted: string; token_context: string; expires_at: string | null; updated_at: string; scopes: string[] }
export type BrandBinding = { marca_id:string; ad_account_id:string|null; facebook_page_id:string|null; instagram_user_id:string|null; display_data:{adAccountName?:string;facebookPageName?:string;instagramUsername?:string;currency?:string}; updated_at:string }

export function config() {
  const appId=process.env.META_MCP_APP_ID || ''
  const origin=process.env.META_MCP_ORIGIN || 'https://app.distintostudio.com'
  if(!/^\d+$/.test(appId)||Buffer.from(process.env.META_MCP_ENCRYPTION_KEY||'','base64').length!==32)
    throw new StrategyError('La conexión de Meta aún se está preparando en el servidor.',503)
  // OAuth destination is configuration, never an untrusted Host/return URL.
  const url=new URL(origin)
  if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)
    throw new StrategyError('Configuración del retorno de Meta inválida.',503)
  return { appId, origin:url.origin, callback:url.origin+META_CALLBACK_PATH }
}

export async function exchange(params: Record<string,string>): Promise<Tokens> {
  const response=await fetch(META_TOKEN_URL, {
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams(params),
  })
  const data=await response.json().catch(()=>null)
  if(!response.ok||!data||typeof data.access_token!=='string'||!data.access_token)
    throw new StrategyError('Meta no completó la autorización. Vuelve a conectar la cuenta.',502)
  if(data.token_type && String(data.token_type).toLowerCase()!=='bearer')
    throw new StrategyError('Meta devolvió una autorización incompatible.',502)
  return {access_token:data.access_token,token_type:'Bearer',
    ...(typeof data.refresh_token==='string'?{refresh_token:data.refresh_token}:{}),
    ...(typeof data.expires_in==='number'&&data.expires_in>0?{expires_in:data.expires_in}:{}),
    ...(typeof data.scope==='string'?{scope:data.scope}:{})}
}

export async function connection() {
  const result=await strategyDB().query<ConnectionRow>('SELECT * FROM meta_agency_connection WHERE id=true')
  return result.rows[0] || null
}
export async function brandBinding(brandId:string){
  const {rows}=await strategyDB().query<BrandBinding>('SELECT * FROM meta_brand_accounts WHERE marca_id=$1',[brandId])
  return rows[0]||null
}
function expiration(tokens:Tokens) { return tokens.expires_in ? new Date(Date.now()+tokens.expires_in*1000).toISOString() : null }
export async function saveConnection(userId:string,tokens:Tokens) {
  let scopes=tokens.scope?.split(/[ ,]+/).filter(Boolean)||[]
  try{
    const r=await fetch('https://graph.facebook.com/v26.0/me/permissions',{headers:{Authorization:`Bearer ${tokens.access_token}`},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)})
    const data=await r.json()
    if(r.ok&&Array.isArray(data.data))scopes=data.data.filter((p:{status?:string;permission?:string})=>p.status==='granted'&&typeof p.permission==='string').map((p:{permission:string})=>p.permission)
  }catch{/* Unknown permissions remain unknown, never assume they were granted. */}
  await strategyDB().query(`INSERT INTO meta_agency_connection (id,authorized_by,tokens_encrypted,token_context,expires_at,scopes)
    VALUES (true,$1,$2,'meta-agency',$3,$4) ON CONFLICT (id) DO UPDATE SET
    authorized_by=EXCLUDED.authorized_by,tokens_encrypted=EXCLUDED.tokens_encrypted,token_context=EXCLUDED.token_context,
    expires_at=EXCLUDED.expires_at,scopes=EXCLUDED.scopes,updated_at=now()`,
    [userId,encrypt(JSON.stringify(tokens),'meta-agency'),expiration(tokens),scopes])
}

export async function metaAccessToken() {
  return transaction(async db=>{
    const {rows}=await db.query<ConnectionRow>('SELECT * FROM meta_agency_connection WHERE id=true FOR UPDATE')
    const row=rows[0]
    if(!row)throw new StrategyError('Conecta Meta en Configuración de la agencia.',409)
    let tokens=JSON.parse(decrypt(row.tokens_encrypted,row.token_context)) as Tokens
    if(row.expires_at&&Date.parse(row.expires_at)<=Date.now()+60000){
      if(!tokens.refresh_token)throw new StrategyError('La autorización venció. Reconecta Meta Ads.',409)
      const renewed=await exchange({grant_type:'refresh_token',refresh_token:tokens.refresh_token,client_id:config().appId,resource:META_MCP_URL})
      tokens={...tokens,...renewed}
      await db.query("UPDATE meta_agency_connection SET tokens_encrypted=$1,token_context='meta-agency',expires_at=$2,updated_at=now() WHERE id=true",
        [encrypt(JSON.stringify(tokens),'meta-agency'),expiration(renewed)])
    }
    return tokens.access_token
  })
}

export async function withAdsMcp<T>(run:(client:Client)=>Promise<T>):Promise<T> {
  const token=await metaAccessToken()
  const client=new Client({name:'Distinto Agencia VPS',version:'1.0.0'},{capabilities:{}})
  const transport=new StreamableHTTPClientTransport(new URL(META_MCP_URL),{
    requestInit:{headers:{Authorization:`Bearer ${token}`},redirect:'error'},
    // Bound every HTTP request and forbid token-bearing redirects outside Meta.
    fetch:(input,init)=>fetch(input,{...init,redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(20000),...(init?.signal?[init.signal]:[])])}),
    reconnectionOptions:{maxRetries:0,initialReconnectionDelay:1000,maxReconnectionDelay:1000,reconnectionDelayGrowFactor:1},
  })
  try { await client.connect(transport,{timeout:20000}); return await run(client) }
  catch(e) {
    if(e instanceof StrategyError)throw e
    // SDK errors can contain authorization details or account data: never log/return them.
    throw new StrategyError('Meta no permitió completar la consulta. Revisa los permisos de la conexión o reintenta.',502)
  } finally { await client.close().catch(()=>{}) }
}
export async function inventory() {
  return withAdsMcp(async client=>{
    const tools=[]; let cursor:string|undefined
    for(let page=0;page<10;page++) {
      const result=await client.listTools(cursor?{cursor}:{},{timeout:20000})
      tools.push(...result.tools); cursor=result.nextCursor
      if(!cursor)break
    }
    if(cursor)throw new StrategyError('Meta entregó un catálogo de herramientas incompleto. Reintenta.',502)
    return tools
  })
}
