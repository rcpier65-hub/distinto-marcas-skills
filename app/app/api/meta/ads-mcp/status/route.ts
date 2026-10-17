import { actor, brandAccess, StrategyError, failure } from '@/lib/estrategia/access'
import { config, connection, inventory } from '@/lib/meta-mcp/server'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(req:Request){
  try{
    const a=await actor(req)
    if(!a.manager||a.client)throw new StrategyError('Solo administración puede revisar esta conexión.',403)
    const q=new URL(req.url).searchParams,brand=await brandAccess(a,q.get('marca')||'')
    let configured=true;try{config()}catch{configured=false}
    const row=configured?await connection(brand.id):null
    const tools=q.get('verify')==='1'&&row?await inventory(brand.id):null
    return Response.json({configured,authorized:!!row,brand:brand.nombre,adAccountId:row?.ad_account_id||null,
      expiresAt:row?.expires_at||null,updatedAt:row?.updated_at||null,verified:!!tools,
      ...(tools?{tools:tools.map(t=>({name:t.name,description:t.description,inputSchema:t.inputSchema,annotations:t.annotations}))}:{}),
    },{headers:{'Cache-Control':'private, no-store'}})
  }catch(e){return failure(e)}
}
