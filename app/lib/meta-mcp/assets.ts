import 'server-only'
import { z } from 'zod'
import { strategyDB } from '@/lib/estrategia/db'
import { StrategyError } from '@/lib/estrategia/access'
import { connection, metaAccessToken } from './server'
import { listAccounts } from './reporting'
export type MetaPage={id:string;name:string;instagramId:string|null;instagramUsername:string|null}
const id=z.string().regex(/^\d+$/).nullable()
export const selectionSchema=z.object({adAccountId:id,facebookPageId:id,instagramUserId:id}).strict()
export async function listPages():Promise<MetaPage[]>{
  const token=await metaAccessToken(),all:MetaPage[]=[];let after:string|undefined
  for(let page=0;page<10;page++){
    const params=new URLSearchParams({fields:'id,name,instagram_business_account{id,username}',limit:'100',...(after?{after}:{})})
    const response=await fetch(`https://graph.facebook.com/v26.0/me/accounts?${params}`,{headers:{Authorization:`Bearer ${token}`},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)})
    const data=await response.json()
    if(!response.ok||data.error)throw new StrategyError('Falta autorizar la lectura de las páginas y sus cuentas de Instagram. Actualiza la conexión de la agencia.',409)
    const parsed=z.array(z.object({id:z.string().regex(/^\d+$/),name:z.string(),instagram_business_account:z.object({id:z.string().regex(/^\d+$/),username:z.string().nullish()}).nullish()})).safeParse(data.data)
    if(!parsed.success)throw new StrategyError('Meta devolvió una lista de páginas incompleta.',502)
    for(const p of parsed.data)all.push({id:p.id,name:p.name,instagramId:p.instagram_business_account?.id||null,instagramUsername:p.instagram_business_account?.username||null})
    if(!data.paging?.next)return [...new Map(all.map(p=>[p.id,p])).values()]
    after=data.paging?.cursors?.after
    if(typeof after!=='string')throw new StrategyError('No se pudo completar la lista de páginas.',502)
  }
  throw new StrategyError('No se pudo completar la lista de páginas.',502)
}
export async function assets(){
  const [ads,pages]=await Promise.allSettled([listAccounts(),listPages()])
  return {accounts:ads.status==='fulfilled'?ads.value:null,pages:pages.status==='fulfilled'?pages.value:null,
    accountsError:ads.status==='rejected'?'No se pudieron consultar las cuentas publicitarias. Revisa la conexión de Meta.':null,
    pagesError:pages.status==='rejected'?'Actualiza la conexión de Meta para autorizar la lectura de páginas e Instagram.':null}
}
export async function saveSelection(brandId:string,userId:string,input:unknown){
  const choice=selectionSchema.parse(input),row=await connection()
  if(!row)throw new StrategyError('Conecta Meta en Configuración de la agencia.',409)
  const [ads,pages]=await Promise.all([choice.adAccountId?listAccounts():Promise.resolve([]),choice.facebookPageId||choice.instagramUserId?listPages():Promise.resolve([])])
  const ad=ads.find(a=>a.id===choice.adAccountId),page=pages.find(p=>p.id===choice.facebookPageId),instagram=pages.find(p=>p.instagramId===choice.instagramUserId)
  if(choice.adAccountId&&(!ad||!ad.enabled||!ad.queryable))throw new StrategyError('Esta cuenta publicitaria no está disponible para consultar.',403)
  if(choice.facebookPageId&&!page)throw new StrategyError('La página no pertenece a la conexión autorizada.',403)
  if(choice.instagramUserId&&!instagram)throw new StrategyError('Instagram no pertenece a la conexión autorizada.',403)
  if(page&&instagram&&page.instagramId!==instagram.instagramId)throw new StrategyError('El Instagram seleccionado no está vinculado a esa página de Facebook.')
  const display={adAccountName:ad?.name,facebookPageName:page?.name,instagramUsername:instagram?.instagramUsername,currency:ad?.currency}
  const result=await strategyDB().query(`INSERT INTO meta_brand_accounts(marca_id,ad_account_id,facebook_page_id,instagram_user_id,display_data,configured_by)
    SELECT $1,$2,$3,$4,$5,$6 FROM meta_agency_connection WHERE id=true AND tokens_encrypted=$7
    ON CONFLICT(marca_id) DO UPDATE SET ad_account_id=EXCLUDED.ad_account_id,facebook_page_id=EXCLUDED.facebook_page_id,
      instagram_user_id=EXCLUDED.instagram_user_id,display_data=EXCLUDED.display_data,configured_by=EXCLUDED.configured_by,updated_at=now()
    RETURNING marca_id,ad_account_id,facebook_page_id,instagram_user_id,display_data,updated_at`,
    [brandId,choice.adAccountId,choice.facebookPageId,choice.instagramUserId,JSON.stringify(display),userId,row.tokens_encrypted])
  if(!result.rowCount)throw new StrategyError('La autorización cambió. Actualiza y vuelve a seleccionar.',409)
  return result.rows[0]
}
