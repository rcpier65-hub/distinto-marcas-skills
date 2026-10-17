'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdAccount } from '@/lib/meta-mcp/report-model'
import type { MetaPage } from '@/lib/meta-mcp/assets'
import type { BrandBinding } from '@/lib/meta-mcp/server'
type Assets={accounts:AdAccount[]|null;pages:MetaPage[]|null;accountsError:string|null;pagesError:string|null}
async function json(response:Response){
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Inicia sesión nuevamente.')
  const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo consultar Meta.');return data
}
export function MetaAssetSelector({slug,binding}:{slug:string;binding:BrandBinding|null}){
  const router=useRouter(),[data,setData]=useState<Assets|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false)
  const [ads,setAds]=useState(binding?.ad_account_id||''),[facebook,setFacebook]=useState(binding?.facebook_page_id||''),[instagram,setInstagram]=useState(binding?.instagram_user_id||'')
  async function discover(){setBusy(true);setError('');setSaved(false);try{setData(await json(await fetch('/api/meta/ads-mcp/accounts')))}catch(e){setError(e instanceof Error?e.message:'No se pudieron consultar las cuentas.')}finally{setBusy(false)}}
  async function save(){
    setBusy(true);setError('');setSaved(false)
    try{await json(await fetch('/api/meta/ads-mcp/accounts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({marca:slug,selection:{adAccountId:ads||null,facebookPageId:facebook||null,instagramUserId:instagram||null}})}));setSaved(true);router.refresh()}
    catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la selección.')}finally{setBusy(false)}
  }
  const selectClass='mt-2 w-full min-w-0 rounded-xl border bg-white px-3 py-3 text-sm'
  return <section className="mt-6 rounded-2xl border border-violet-100 bg-white p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Cuentas de esta marca</h2><p className="mt-1 text-sm text-slate-500">Elige qué cuentas consultar usando la conexión de la agencia.</p></div><button disabled={busy} onClick={()=>void discover()} className="rounded-xl border px-4 py-2 text-sm text-violet-700 disabled:opacity-40">{busy?'Consultando…':data?'Actualizar lista':'Elegir cuentas'}</button></div>
    {!data&&<div className="mt-4 grid gap-3 text-sm md:grid-cols-3"><p>Ads<br/><strong>{binding?.display_data.adAccountName||binding?.ad_account_id||'Sin seleccionar'}</strong></p><p>Facebook<br/><strong>{binding?.display_data.facebookPageName||'Sin seleccionar'}</strong></p><p>Instagram<br/><strong>{binding?.display_data.instagramUsername||'Sin seleccionar'}</strong></p></div>}
    {data&&<>
      {data.accountsError&&<p role="alert" className="mt-3 text-sm text-amber-800">{data.accountsError}</p>}
      {data.pagesError&&<p role="alert" className="mt-3 text-sm text-amber-800">{data.pagesError} <a className="underline" href="/settings/meta">Abrir conexión</a></p>}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className="min-w-0 text-sm font-medium">Cuenta publicitaria<select aria-label="Cuenta publicitaria" disabled={!data.accounts||busy} value={ads} onChange={e=>setAds(e.target.value)} className={selectClass}><option value="">Sin cuenta de Ads</option>{data.accounts?.map(a=><option key={a.id} value={a.id} disabled={!a.enabled||!a.queryable}>{a.name} · {a.businessName||a.id} · {a.currency}{!a.enabled||!a.queryable?' · No disponible':''}</option>)}</select></label>
        <label className="min-w-0 text-sm font-medium">Página de Facebook<select aria-label="Página de Facebook" disabled={!data.pages||busy} value={facebook} onChange={e=>{setFacebook(e.target.value);setInstagram(data.pages?.find(p=>p.id===e.target.value)?.instagramId||'')}} className={selectClass}><option value="">Sin página de Facebook</option>{data.pages?.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="min-w-0 text-sm font-medium">Cuenta de Instagram<select aria-label="Cuenta de Instagram" disabled={!data.pages||busy} value={instagram} onChange={e=>setInstagram(e.target.value)} className={selectClass}><option value="">Sin cuenta de Instagram</option>{data.pages?.filter(p=>p.instagramId&&(!facebook||p.id===facebook)).map(p=><option key={p.instagramId} value={p.instagramId!}>{p.instagramUsername?`@${p.instagramUsername}`:p.name}</option>)}</select></label>
      </div>
      <p className="mt-3 text-xs text-slate-500">Instagram debe estar vinculado a la página de Facebook elegida. Cambiar esta selección no modifica tus cuentas en Meta.</p>
      <button disabled={busy||!data.accounts||!data.pages} onClick={()=>void save()} className="mt-4 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white disabled:opacity-40">Guardar cuentas de esta marca</button>
    </>}
    {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{saved&&<p role="status" className="mt-3 text-sm text-emerald-700">Cuentas guardadas. El panel ya consulta esta selección.</p>}
  </section>
}
