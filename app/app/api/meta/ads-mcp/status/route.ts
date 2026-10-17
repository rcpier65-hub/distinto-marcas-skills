import { actor, StrategyError, failure } from '@/lib/estrategia/access'
import { config, connection, inventory } from '@/lib/meta-mcp/server'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(req:Request){
  try{
    const a=await actor(req)
    if(!a.access.owner||a.client)throw new StrategyError('Solo el propietario puede revisar la conexión de la agencia.',403)
    const q=new URL(req.url).searchParams
    let configured=true;try{config()}catch{configured=false}
    const row=configured?await connection():null
    const tools=q.get('verify')==='1'&&row?await inventory():null
    return Response.json({configured,authorized:!!row,scopes:row?.scopes||[],
      expiresAt:row?.expires_at||null,updatedAt:row?.updated_at||null,verified:!!tools,
      ...(tools?{toolCount:tools.length}:{}),
    },{headers:{'Cache-Control':'private, no-store'}})
  }catch(e){return failure(e)}
}
