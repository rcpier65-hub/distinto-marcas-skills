'use client'
import { useState } from 'react'
export function MetaConnection({slug,configured,authorized}:{slug:string;configured:boolean;authorized:boolean}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
  async function verify(){
    setBusy(true);setMessage('')
    try{
      const r=await fetch(`/api/meta/ads-mcp/status?marca=${encodeURIComponent(slug)}&verify=1`)
      const data=await r.json()
      if(!r.ok)throw new Error(data.error||'No se pudo comprobar la conexión.')
      setMessage(data.verified?'El VPS pudo conectarse al MCP de Meta. Falta seleccionar y comprobar la cuenta publicitaria de esta marca.':'Todavía falta autorizar Meta.')
    }catch(e){setMessage(e instanceof Error?e.message:'No se pudo comprobar Meta.')}finally{setBusy(false)}
  }
  return <div className="mt-5">
    <p role="status" className="mb-4 text-sm text-slate-600">{!configured?'Preparando la configuración del servidor.':authorized?'Autorización guardada en el servidor. Pendiente de verificar la cuenta publicitaria.':'Pendiente de autorización.'}</p>
    <div className="flex flex-wrap gap-3">
      <form action="/api/meta/ads-mcp/start" method="post">
        <input type="hidden" name="marca" value={slug}/>
        <button disabled={!configured||busy} className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white disabled:opacity-50">{authorized?'Reconectar Meta Ads':'Conectar Meta Ads'}</button>
      </form>
      {authorized&&<button disabled={busy} onClick={()=>void verify()} className="rounded-xl border px-5 py-3 disabled:opacity-50">{busy?'Comprobando…':'Comprobar conexión desde el VPS'}</button>}
    </div>
    {message&&<p className="mt-4 text-sm" role="status">{message}</p>}
  </div>
}
