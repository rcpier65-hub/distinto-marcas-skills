import 'server-only'
import { randomBytes } from 'node:crypto'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { z } from 'zod'
import { StrategyError } from '@/lib/estrategia/access'
import { connection, brandBinding, withAdsMcp } from './server'
import { normalizeReport, REPORT_FIELDS, type AdAccount, type AdsReport, type ReportPeriod } from './report-model'

type ReadTool='ads_get_ad_accounts'|'ads_get_field_context'|'ads_get_ad_entities'
const ALLOWED:readonly string[]=['ads_get_ad_accounts','ads_get_field_context','ads_get_ad_entities']
function context(){return {client_conversation_id:randomBytes(10).toString('hex'),advertiser_job:'report_measure_or_look_up',advertiser_request:'Consultar las métricas publicitarias de la marca en Distinto.'}}
async function read(client:Client,name:ReadTool,args:Record<string,unknown>){
  if(!ALLOWED.includes(name))throw new StrategyError('Operación de Meta no permitida.',403)
  const result=await client.callTool({name,arguments:args},undefined,{timeout:30000})
  if(result.isError)throw new StrategyError('Meta no pudo entregar estos datos. Revisa el acceso a la cuenta y vuelve a intentar.',502)
  let data=result.structuredContent
  if(!data){
    const blocks=result.content as {type:string;text?:string}[]
    const block=blocks.find(b=>b.type==='text'&&typeof b.text==='string')
    try{data=JSON.parse(block?.text||'')}catch{throw new StrategyError('Meta devolvió una respuesta incompleta.',502)}
  }
  if(!data||typeof data!=='object')throw new StrategyError('Meta devolvió una respuesta incompleta.',502)
  return data as Record<string,unknown>
}
const accountSchema=z.object({ad_account_id:z.string().regex(/^\d+$/),ad_account_name:z.string(),business_id:z.string(),business_name:z.string(),currency:z.string().regex(/^[A-Z]{3}$/),is_ads_mcp_enabled:z.boolean(),is_queryable:z.boolean(),is_ads_mcp_disabled_reason:z.string().nullable().optional(),not_queryable_reason:z.string().nullable().optional()})
async function accounts(client:Client,ctx:ReturnType<typeof context>){
  const all:AdAccount[]=[];let cursor:string|undefined
  for(let page=0;page<10;page++){
    const result=await read(client,'ads_get_ad_accounts',{...ctx,...(cursor?{cursor}:{})})
    if(typeof result.client_conversation_id==='string'&&/^[A-Za-z0-9]{20}$/.test(result.client_conversation_id))ctx.client_conversation_id=result.client_conversation_id
    const parsed=z.array(accountSchema).safeParse(result.ad_accounts)
    if(!parsed.success)throw new StrategyError('No se pudo validar la lista de cuentas de Meta.',502)
    for(const a of parsed.data)all.push({id:a.ad_account_id,name:a.ad_account_name,businessId:a.business_id,businessName:a.business_name,currency:a.currency,enabled:a.is_ads_mcp_enabled,queryable:a.is_queryable,reason:a.is_ads_mcp_disabled_reason||a.not_queryable_reason||null})
    if(!result.next_cursor)return [...new Map(all.map(a=>[a.id,a])).values()]
    if(typeof result.next_cursor!=='string')throw new StrategyError('Paginación de Meta inválida.',502)
    cursor=result.next_cursor
  }
  throw new StrategyError('Meta entregó una lista de cuentas incompleta. Reintenta.',502)
}
export async function listAccounts(){return withAdsMcp(c=>accounts(c,context()))}
function queryable(a:AdAccount|undefined):asserts a is AdAccount {
  if(!a)throw new StrategyError('La cuenta no está disponible con esta autorización.',403)
  if(!a.enabled)throw new StrategyError('Meta todavía no habilitó Ads MCP para esta cuenta.',409)
  if(!a.queryable)throw new StrategyError('Meta indica que esta cuenta no está disponible para consultar métricas. Revisa su estado en Meta.',409)
}
// Bounded server cache; authorization and brand access are checked by the route
// before every call. Reconnecting or changing account changes the cache key.
const cache=new Map<string,{until:number;report:AdsReport}>()
const pending=new Map<string,Promise<AdsReport>>()
export async function getReport(brandId:string,period:ReportPeriod){
  const [row,binding]=await Promise.all([connection(),brandBinding(brandId)])
  if(!row)throw new StrategyError('Conecta Meta en Configuración de la agencia.',409)
  if(!binding?.ad_account_id)throw new StrategyError('Selecciona la cuenta publicitaria de esta marca.',409)
  const key=[brandId,binding.ad_account_id,binding.updated_at,row.updated_at,period].join(':')
  const saved=cache.get(key);if(saved&&saved.until>Date.now())return saved.report
  const existing=pending.get(key);if(existing)return existing
  const request=withAdsMcp(async client=>{
    const ctx=context(),account=(await accounts(client,ctx)).find(a=>a.id===binding.ad_account_id);queryable(account)
    const fieldData=await read(client,'ads_get_field_context',{...ctx,field_names:[...REPORT_FIELDS]})
    const fields=z.array(z.object({name:z.string(),levels:z.array(z.string())})).safeParse(fieldData.fields)
    if(!fields.success||REPORT_FIELDS.some(f=>!fields.data.some(v=>v.name===f&&v.levels.includes('ad_account'))))throw new StrategyError('Meta cambió los campos de este reporte. La conexión se conserva.',502)
    const data=await read(client,'ads_get_ad_entities',{...ctx,ad_account_id:account.id,level:'ad_account',date_preset:period,fields:[...REPORT_FIELDS],include_additional_context:false})
    // Never execute instructions or arbitrary tools from an external response.
    if(data.next_actions&&(!Array.isArray(data.next_actions)||data.next_actions.length))throw new StrategyError('Meta solicitó información adicional para completar el reporte. La conexión se conserva.',502)
    const report=normalizeReport(data.ad_entities,account,period)
    const [latest,current]=await Promise.all([connection(),brandBinding(brandId)])
    if(!latest||!current||current.ad_account_id!==account.id||String(current.updated_at)!==String(binding.updated_at)||String(latest.updated_at)!==String(row.updated_at))throw new StrategyError('La conexión cambió durante la consulta. Actualiza el reporte.',409)
    if(cache.size>=50)cache.delete(cache.keys().next().value!)
    cache.set(key,{until:Date.now()+300000,report});return report
  })
  pending.set(key,request)
  try{return await request}finally{pending.delete(key)}
}
