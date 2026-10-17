import { NextResponse } from 'next/server'
import { actor, brandAccess, StrategyError, failure } from '@/lib/estrategia/access'
import { strategyDB } from '@/lib/estrategia/db'
import { nonce, sha256, encrypt } from '@/lib/meta-mcp/crypto'
import { config, META_AUTH_URL, META_MCP_URL, META_SCOPES, META_STATE_COOKIE } from '@/lib/meta-mcp/server'
export const runtime='nodejs'
export async function POST(req:Request) {
  try {
    const a=await actor(req)
    if(!a.manager||a.client)throw new StrategyError('Solo administración puede conectar cuentas de Meta.',403)
    const c=config()
    if(req.headers.get('origin')!==c.origin)throw new StrategyError('Origen no permitido.',403)
    const form=await req.formData()
    const brand=await brandAccess(a,String(form.get('marca')||''))
    const state=nonce(),verifier=nonce(),hash=sha256(state)
    await strategyDB().query('DELETE FROM meta_mcp_oauth_states WHERE expires_at < now() OR (user_id=$1 AND marca_id=$2)',[a.user.id,brand.id])
    await strategyDB().query('INSERT INTO meta_mcp_oauth_states(state_hash,user_id,marca_id,verifier_encrypted,expires_at) VALUES($1,$2,$3,$4,now()+interval \'10 minutes\')',
      [hash,a.user.id,brand.id,encrypt(verifier,`meta-state:${hash}`)])
    const url=new URL(META_AUTH_URL)
    url.search=new URLSearchParams({response_type:'code',client_id:c.appId,redirect_uri:c.callback,state,
      code_challenge:sha256(verifier),code_challenge_method:'S256',scope:META_SCOPES.join(' '),resource:META_MCP_URL}).toString()
    const response=NextResponse.redirect(url,303)
    response.cookies.set(META_STATE_COOKIE,state,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/meta/ads-mcp',maxAge:600})
    response.headers.set('Cache-Control','private, no-store')
    response.headers.set('Referrer-Policy','no-referrer')
    return response
  }catch(e){return failure(e)}
}
