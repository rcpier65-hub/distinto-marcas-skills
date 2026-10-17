import { actor, brandAccess, StrategyError, failure } from '@/lib/estrategia/access'
import { config } from '@/lib/meta-mcp/server'
import { assets, saveSelection } from '@/lib/meta-mcp/assets'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(req:Request){
  try{
    const a=await actor(req)
    if(!a.access.owner||a.client)throw new StrategyError('Solo el propietario puede vincular cuentas publicitarias.',403)
    return Response.json(await assets(),{headers:{'Cache-Control':'private, no-store'}})
  }catch(e){return failure(e)}
}
export async function POST(req:Request){
  try{
    const a=await actor(req)
    if(!a.access.owner||a.client)throw new StrategyError('Solo el propietario puede vincular cuentas publicitarias.',403)
    if(req.headers.get('origin')!==config().origin)throw new StrategyError('Origen no permitido.',403)
    const body=await req.json(),brand=await brandAccess(a,typeof body.marca==='string'?body.marca:'')
    const binding=await saveSelection(brand.id,a.user.id,body.selection)
    return Response.json({binding},{headers:{'Cache-Control':'private, no-store'}})
  }catch(e){return failure(e)}
}
