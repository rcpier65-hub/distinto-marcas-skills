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
export const META_SCOPES = ['ads_read','ads_mcp_management','business_management','pages_show_list','instagram_basic']
export type Tokens = { access_token: string; refresh_token?: string; token_type: string; expires_in?: number; scope?: string }
export type ConnectionRow = { marca_id: string; tokens_encrypted: string; expires_at: string | null; updated_at: string; scopes: string[]; ad_account_id: string | null }

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

export async function connection(brandId:string) {
  const result=await strategyDB().query<ConnectionRow>('SELECT * FROM meta_mcp_connections WHERE marca_id=$1',[brandId])
  return result.rows[0] || null
}
function expiration(tokens:Tokens) { return tokens.expires_in ? new Date(Date.now()+tokens.expires_in*1000).toISOString() : null }
export async function saveConnection(brandId:string,userId:string,tokens:Tokens) {
  await strategyDB().query(`INSERT INTO meta_mcp_connections (marca_id,authorized_by,tokens_encrypted,expires_at,scopes)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT (marca_id) DO UPDATE SET
    authorized_by=EXCLUDED.authorized_by,tokens_encrypted=EXCLUDED.tokens_encrypted,expires_at=EXCLUDED.expires_at,
    scopes=EXCLUDED.scopes,ad_account_id=NULL,updated_at=now()`,
    [brandId,userId,encrypt(JSON.stringify(tokens),`meta-mcp:${brandId}`),expiration(tokens),tokens.scope?.split(/[ ,]+/).filter(Boolean)||[]])
}

async function accessToken(brandId:string) {
  return transaction(async db=>{
    const {rows}=await db.query<ConnectionRow>('SELECT * FROM meta_mcp_connections WHERE marca_id=$1 FOR UPDATE',[brandId])
    const row=rows[0]
    if(!row)throw new StrategyError('Conecta Meta Ads para esta marca.',409)
    let tokens=JSON.parse(decrypt(row.tokens_encrypted,`meta-mcp:${brandId}`)) as Tokens
    if(row.expires_at&&Date.parse(row.expires_at)<=Date.now()+60000){
      if(!tokens.refresh_token)throw new StrategyError('La autorización venció. Reconecta Meta Ads.',409)
      const renewed=await exchange({grant_type:'refresh_token',refresh_token:tokens.refresh_token,client_id:config().appId,resource:META_MCP_URL})
      tokens={...tokens,...renewed}
      await db.query('UPDATE meta_mcp_connections SET tokens_encrypted=$2,expires_at=$3,updated_at=now() WHERE marca_id=$1',
        [brandId,encrypt(JSON.stringify(tokens),`meta-mcp:${brandId}`),expiration(renewed)])
    }
    return tokens.access_token
  })
}

export async function withAdsMcp<T>(brandId:string,run:(client:Client)=>Promise<T>):Promise<T> {
  const token=await accessToken(brandId)
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
export async function inventory(brandId:string) {
  return withAdsMcp(brandId,async client=>{
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
