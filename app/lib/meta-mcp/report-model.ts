export const REPORT_PERIODS = ['this_month', 'last_month', 'last_7d', 'last_30d'] as const
export type ReportPeriod = typeof REPORT_PERIODS[number]
export const REPORT_FIELDS = ['id','name','timezone_name','amount_spent','impressions','reach','clicks','ctr','cpc','cpm','omni_purchase','omni_purchase_values','website_purchase_roas'] as const
export type AdAccount = {
  id:string; name:string; businessId:string; businessName:string; currency:string;
  enabled:boolean; queryable:boolean; reason:string|null
}
export type AdsReport = {
  account:AdAccount; period:ReportPeriod; timezone:string|null; fetchedAt:string;
  metrics:Record<string,number|null>
}
export function metricNumber(raw:unknown):number|null {
  const value = typeof raw==='object' && raw!==null && 'value' in raw ? raw.value : raw
  if(typeof value==='number')return Number.isFinite(value)?value:null
  if(typeof value!=='string')return null
  // Meta returns decimal commas for percentages, and money as {value, unit}.
  // Unknown, missing and localized thousands never silently become zero.
  const text=value.trim().replace(/%$/,'').replace(/,/g,'.')
  if(!/^-?\d+(?:\.\d+)?$/.test(text))return null
  const number=Number(text)
  return Number.isFinite(number)?number:null
}
export function reportEntities(raw:unknown):Record<string,unknown>[] {
  const value=typeof raw==='string'?JSON.parse(raw):raw
  if(!Array.isArray(value)||value.some(v=>!v||typeof v!=='object'||Array.isArray(v)))throw Error('Invalid Meta entities')
  return value
}
export function normalizeReport(raw:unknown,account:AdAccount,period:ReportPeriod):AdsReport {
  const entities=reportEntities(raw)
  if(entities.length!==1||String(entities[0].id).replace(/^act_/,'')!==account.id)throw Error('Unexpected Meta account')
  const row=entities[0],metrics:Record<string,number|null>={}
  for(const field of REPORT_FIELDS){
    if(['id','name','timezone_name'].includes(field))continue
    const value=row[field]
    if(value&&typeof value==='object'&&'unit' in value&&value.unit!==account.currency)throw Error('Unexpected Meta currency')
    metrics[field]=metricNumber(value)
  }
  return {account,period,timezone:typeof row.timezone_name==='string'?row.timezone_name:null,fetchedAt:new Date().toISOString(),metrics}
}
