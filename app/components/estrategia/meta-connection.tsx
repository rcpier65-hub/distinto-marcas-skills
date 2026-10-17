'use client'
import { useState } from 'react'
export function MetaConnection({configured,authorized,scopes}:{configured:boolean;authorized:boolean;scopes:string[]}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const socialReady=['pages_read_engagement','instagram_manage_insights'].every(s=>scopes.includes(s))
  async function verify(){
    setBusy(true);setMessage('')
    try{
      const r=await fetch('/api/meta/ads-mcp/status?verify=1')
      const data=await r.json()
      if(!r.ok)throw new Error(data.error||'No se pudo comprobar la conexión.')
      setMessage(data.verified?'El servidor de Distinto pudo conectarse al MCP de Meta. La misma autorización se utiliza para todas las marcas.':'Todavía falta autorizar Meta.')
    }catch(e){setMessage(e instanceof Error?e.message:'No se pudo comprobar Meta.')}finally{setBusy(false)}
  }
  return <div className="mt-5">
    <p role="status" className="mb-4 text-sm text-slate-600">{!configured?'Preparando la configuración del servidor.':authorized?'Conexión de la agencia guardada en el servidor.':'Pendiente de autorización de la agencia.'}</p>
    {authorized&&!socialReady&&<p className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Actualiza la autorización para incluir todas tus cuentas y los permisos de estadísticas de Facebook e Instagram. Las selecciones guardadas de las marcas se conservarán.</p>}
    <div className="flex flex-wrap gap-3">
      <form action="/api/meta/ads-mcp/start" method="post">
        <button disabled={!configured||busy} className="rounded-xl bg-violet-600 px-5 py-3 font-medium text-white disabled:opacity-50">{authorized?'Actualizar autorización de Meta':'Conectar Meta para la agencia'}</button>
      </form>
      {authorized&&<button disabled={busy} onClick={()=>void verify()} className="rounded-xl border px-5 py-3 disabled:opacity-50">{busy?'Comprobando…':'Comprobar conexión desde el VPS'}</button>}
    </div>
    {message&&<p className="mt-4 text-sm" role="status">{message}</p>}
  </div>
}
