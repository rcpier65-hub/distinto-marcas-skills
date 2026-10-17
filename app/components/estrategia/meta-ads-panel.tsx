'use client'
import { useEffect, useState } from 'react'
import { BarChart3, RefreshCw, CheckCircle2 } from 'lucide-react'
import type { AdsReport, ReportPeriod } from '@/lib/meta-mcp/report-model'

const periods:Record<ReportPeriod,string>={this_month:'Este mes',last_month:'Mes pasado',last_7d:'Últimos 7 días',last_30d:'Últimos 30 días'}
const indicators=[['amount_spent','Inversión','money'],['reach','Alcance','number'],['impressions','Impresiones','number'],['clicks','Clics (todos)','number'],['ctr','CTR (todos)','percent'],['cpc','CPC (todos)','money']] as const
async function responseJSON(response:Response){
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('La sesión venció. Vuelve a iniciar sesión.')
  const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo consultar Meta.');return data
}
function format(value:number|null|undefined,kind:string,currency:string){
  if(value===null||value===undefined)return '—'
  if(kind==='money')return new Intl.NumberFormat('es-PE',{style:'currency',currency,maximumFractionDigits:2}).format(value)
  return new Intl.NumberFormat('es-PE',{maximumFractionDigits:kind==='number'?0:2}).format(value)+(kind==='percent'?' %':kind==='ratio'?'×':'')
}
export function MetaAdsPanel({slug,accountId}:{slug:string;accountId:string|null}){
  const [period,setPeriod]=useState<ReportPeriod>('this_month'),[revision,setRevision]=useState(0)
  const key=[slug,accountId,period,revision].join(':')
  const [result,setResult]=useState<{key:string;report:AdsReport|null;error:string}|null>(null)
  useEffect(()=>{
    if(!accountId)return
    const controller=new AbortController()
    void fetch(`/api/meta/ads-mcp/report?marca=${encodeURIComponent(slug)}&period=${period}`,{signal:controller.signal})
      .then(responseJSON).then((report:AdsReport)=>{if(!controller.signal.aborted)setResult({key,report,error:''})})
      .catch((error:Error)=>{if(!controller.signal.aborted)setResult({key,report:null,error:error.message})})
    return ()=>controller.abort()
  },[slug,accountId,period,key])
  const loading=!!accountId&&result?.key!==key,report=result?.key===key?result.report:null,error=result?.key===key?result.error:''
  return <section className="mt-6 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm md:p-6" aria-label="Reporte de Meta Ads">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-xl font-semibold"><BarChart3 className="text-violet-600" size={22}/>Resultados de Meta Ads</h2><p className="mt-1 text-sm text-slate-500">Datos publicitarios consultados por el servidor de Distinto.</p></div>
      <div className="flex items-center gap-2">
        <select aria-label="Periodo del reporte de Ads" value={period} onChange={e=>setPeriod(e.target.value as ReportPeriod)} className="rounded-xl border bg-white px-3 py-2 text-sm">{Object.entries(periods).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        {accountId&&<button aria-label="Actualizar reporte de Ads" disabled={loading} onClick={()=>setRevision(v=>v+1)} className="rounded-xl border p-2 disabled:opacity-40"><RefreshCw size={18} className={loading?'animate-spin':''}/></button>}
      </div>
    </div>
    {!accountId&&<p className="mt-5 text-sm text-slate-600">La autorización está lista. Selecciona la cuenta publicitaria que corresponde a esta marca para ver sus resultados.</p>}
    {loading&&<div role="status" className="mt-5 rounded-xl bg-violet-50 p-6 text-sm text-violet-800">Consultando {periods[period].toLowerCase()} en Meta…</div>}
    {error&&<p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
    {report&&<>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm"><CheckCircle2 size={17} className="text-emerald-600"/><strong>{report.account.name}</strong><span className="text-slate-500">· {report.account.currency} · {report.timezone||'Zona horaria no informada'}</span></div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">{indicators.map(([field,label,kind])=><div key={field} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{format(report.metrics[field],kind,report.account.currency)}</p></div>)}</div>
      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-3">
        <div><p className="text-xs text-slate-500">Compras atribuidas por Meta</p><strong className="mt-1 block">{format(report.metrics.omni_purchase,'number',report.account.currency)}</strong></div>
        <div><p className="text-xs text-slate-500">Valor de compras atribuidas</p><strong className="mt-1 block">{format(report.metrics.omni_purchase_values,'money',report.account.currency)}</strong></div>
        <div><p className="text-xs text-slate-500">ROAS de compras web</p><strong className="mt-1 block">{format(report.metrics.website_purchase_roas,'ratio',report.account.currency)}</strong></div>
      </div>
      <p className="mt-3 text-xs text-slate-500">La atribución publicitaria de Meta puede diferir de las ventas registradas por el cliente. «—» significa dato no disponible.</p>
      <p className="mt-2 text-xs text-slate-500">Consulta: {new Date(report.fetchedAt).toLocaleString('es-PE',{timeZone:'America/Lima'})} (Lima). Los resultados se conservan hasta 5 minutos entre consultas.</p>
    </>}
  </section>
}
