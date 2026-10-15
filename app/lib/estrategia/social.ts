import 'server-only'
import { socialNetworks, metricNumber, insightTotal, type SocialSummary } from './social-model'
import { todayLima } from './model'

type Account = { facebookPageId?: string; instagramUserId?: string; accessToken?: string }
const cache = new Map<string, { until: number; promise: Promise<SocialSummary> }>()
// Exact brand IDs are configured server-side. A browser cannot choose arbitrary
// Meta accounts or receive credentials; the API verifies brand access first.
function connection(brandId:string):Account {
  try { return JSON.parse(process.env.META_SOCIAL_ACCOUNTS_JSON || '{}')[brandId] || {} } catch { return {} }
}
async function graph(id:string,path:string,params:Record<string,string>,token:string) {
  const configured=process.env.META_GRAPH_VERSION || 'v26.0'
  const version=/^v\d+\.0$/.test(configured)?configured:'v26.0'
  const r=await fetch(`https://graph.facebook.com/${version}/${id}${path}?${new URLSearchParams(params)}`, {
    headers:{Authorization:`Bearer ${token}`}, cache:'no-store', signal:AbortSignal.timeout(8000),
  })
  const data=await r.json()
  // Error payloads may include account information; they never reach the UI/log.
  return {ok:r.ok&&!data.error,data:r.ok?data:null,authError:[10,102,190,200].includes(data.error?.code)}
}
export function socialSummary(brandId:string):Promise<SocialSummary> {
  const today=todayLima(),endDate=new Date(`${today}T12:00:00Z`)
  endDate.setUTCDate(endDate.getUTCDate()-1);const end=endDate.toISOString().slice(0,10)
  endDate.setUTCDate(endDate.getUTCDate()-13);const start=endDate.toISOString().slice(0,10)
  const base:SocialSummary={provider:'meta',status:'unconfigured',checkedAt:new Date().toISOString(),start,end,
    message:'Pendiente de autorizar Facebook e Instagram de esta marca con Meta. No hay cifras verificadas para mostrar.',
    networks:socialNetworks.map(n=>({...n,followers:null,reach:null,interactions:null,asOf:null,available:false,
      note:n.network==='tiktok'?'Requiere su propia conexión; Meta no incluye TikTok.':'Autorización pendiente'})),
  }
  const account=connection(brandId),token=account.accessToken || process.env.META_SOCIAL_TOKEN
  if(!token || (!account.facebookPageId && !account.instagramUserId))return Promise.resolve(base)
  const hit=cache.get(brandId)
  if(hit && hit.until>Date.now())return hit.promise
  const promise=(async():Promise<SocialSummary>=>{
    let authError=false
    const networks=await Promise.all(base.networks.map(async(n)=>{
      if(n.network==='tiktok')return n
      const id=String((n.network==='facebook'?account.facebookPageId:account.instagramUserId)||'')
      if(!/^\d+$/.test(id))return {...n,note:'Cuenta pendiente de vincular'}
      try {
        const r=await graph(id,'',{fields:n.network==='facebook'?'id,name,followers_count':'id,username,followers_count'},token)
        if(!r.ok){if(r.authError)authError=true;return {...n,note:r.authError?'Revisa la autorización de Meta':'No se pudo consultar esta cuenta'}}
        if(String(r.data.id)!==id)return {...n,note:'Meta no confirmó la cuenta vinculada'}
        const followers=metricNumber(r.data.followers_count)
        let reach:number|null=null,interactions:number|null=null
        if(n.network==='instagram'){
          const q={metric:'reach,total_interactions',period:'day',metric_type:'total_value',
            since:String(Date.parse(`${start}T00:00:00-05:00`)/1000),until:String(Date.parse(`${today}T00:00:00-05:00`)/1000)}
          const insights=await graph(id,'/insights',q,token).catch(()=>null)
          if(insights?.ok){reach=insightTotal(insights.data,'reach');interactions=insightTotal(insights.data,'total_interactions')}
        }
        return {...n,followers,reach,interactions,asOf:today,available:followers!==null,
          note:n.network==='instagram'?'Alcance e interacciones: 14 días completos. Si Meta no entrega una métrica, queda sin dato.':'Seguidores actuales consultados directamente a Meta.'}
      }catch{return {...n,note:'Meta no respondió a tiempo. Reintenta más tarde.'}}
    }))
    const ready=networks.filter(n=>n.network!=='tiktok').filter(n=>n.available).length
    return {...base,networks,status:ready===2?'ready':ready?'partial':authError?'reconnect':'unavailable',
      message:ready?'Fuente: API oficial de Meta. Seguidores al día de consulta; estadísticas de Instagram según el periodo indicado.':authError?'Meta requiere revisar la autorización o los permisos de estas cuentas.':'No se pudo consultar Meta. Puedes continuar con tu plan y reintentar después.'}
  })()
  if(cache.size>100)cache.clear()
  cache.set(brandId,{until:Date.now()+60000,promise})
  void promise.then(v=>{const c=cache.get(brandId);if(c?.promise===promise&&v.status==='ready')c.until=Date.now()+15*60000})
  return promise
}
