import { NextRequest, NextResponse } from 'next/server'
import { actor, brandAccess, StrategyError } from '@/lib/estrategia/access'
import { strategyDB } from '@/lib/estrategia/db'
import { sha256, equalState, decrypt } from '@/lib/meta-mcp/crypto'
import { config, exchange, saveConnection, META_MCP_URL, META_STATE_COOKIE } from '@/lib/meta-mcp/server'
export const runtime='nodejs'
export async function GET(req:NextRequest) {
  let slug=''
  try {
    const a=await actor(req)
    if(!a.manager||a.client)throw new StrategyError('Solo administración puede conectar cuentas.',403)
    const state=req.nextUrl.searchParams.get('state')||'', cookie=req.cookies.get(META_STATE_COOKIE)?.value||''
    if(!equalState(state,cookie))throw new StrategyError('La autorización venció. Inicia la conexión nuevamente.',400)
    const hash=sha256(state)
    // Atomic consumption prevents a second exchange, even with concurrent callbacks.
    const {rows}=await strategyDB().query(`DELETE FROM meta_mcp_oauth_states WHERE state_hash=$1 AND user_id=$2 AND expires_at>now()
      RETURNING marca_id,verifier_encrypted`,[hash,a.user.id])
    const pending=rows[0]
    if(!pending)throw new StrategyError('La autorización ya se usó o venció.',400)
    const found=await a.service.from('marcas').select('slug').eq('id',pending.marca_id).single()
    if(found.error||!found.data)throw new StrategyError('Marca no encontrada.',404)
    const brand=await brandAccess(a,found.data.slug);slug=brand.slug
    const code=req.nextUrl.searchParams.get('code')
    if(req.nextUrl.searchParams.has('error')||!code)throw new StrategyError('Meta no fue autorizado. Puedes intentarlo de nuevo.',400)
    const c=config()
    const tokens=await exchange({grant_type:'authorization_code',client_id:c.appId,code,redirect_uri:c.callback,
      code_verifier:decrypt(pending.verifier_encrypted,`meta-state:${hash}`),resource:META_MCP_URL})
    await saveConnection(brand.id,a.user.id,tokens)
    return finish(c.origin,slug,'authorized')
  }catch {
    // Never forward OAuth codes, raw provider error descriptions or tokens.
    return finish('https://app.distintostudio.com',slug,'failed')
  }
}
function finish(origin:string,slug:string,result:string){
  const path=slug?`/marca/${encodeURIComponent(slug)}/metricas`:'/dashboard'
  const response=NextResponse.redirect(new URL(`${path}?meta=${result}`,origin),303)
  response.cookies.set(META_STATE_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/meta/ads-mcp',maxAge:0})
  response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer')
  return response
}
