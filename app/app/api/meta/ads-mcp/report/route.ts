import { actor, brandAccess, StrategyError, failure } from '@/lib/estrategia/access'
import { getReport } from '@/lib/meta-mcp/reporting'
import { REPORT_PERIODS, type ReportPeriod } from '@/lib/meta-mcp/report-model'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(req:Request){
  try{
    const a=await actor(req)
    if(!a.manager||a.client)throw new StrategyError('Solo administración puede consultar este reporte.',403)
    const q=new URL(req.url).searchParams,brand=await brandAccess(a,q.get('marca')||'')
    const period=q.get('period')||'this_month'
    if(!REPORT_PERIODS.includes(period as ReportPeriod))throw new StrategyError('Periodo inválido.')
    if(q.has('accountId')||q.has('tool'))throw new StrategyError('La cuenta se define en la configuración de la marca.')
    return Response.json(await getReport(brand.id,period as ReportPeriod),{headers:{'Cache-Control':'private, no-store'}})
  }catch(e){return failure(e)}
}
