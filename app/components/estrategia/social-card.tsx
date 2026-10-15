'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, Camera, Users, Music2 } from 'lucide-react'
import type { SocialSummary } from '@/lib/estrategia/social-model'
import { PrettyDate } from './common'
const icons = { instagram: Camera, facebook: Users, tiktok: Music2 }
export function SocialCard({slug,manager}:{slug:string;manager:boolean}) {
  const [data,setData] = useState<SocialSummary|null>(null), [busy,setBusy] = useState(true), [error,setError] = useState('')
  useEffect(()=>{
    const c=new AbortController()
    void loadSocial(slug,c.signal).then(value=>{if(!c.signal.aborted){setData(value);setError('')}})
      .catch(e=>{if(!c.signal.aborted)setError(e.message)})
      .finally(()=>{if(!c.signal.aborted)setBusy(false)})
    return()=>c.abort()
  },[slug])
  async function refresh() {
    setBusy(true);setError('')
    try {setData(await loadSocial(slug))} catch(e) {setError((e as Error).message)} finally {setBusy(false)}
  }
  return <section className="st-card st-social" aria-label="Métricas de redes sociales">
    <div className="st-row"><span className="st-eyebrow">COMUNIDAD · REDES SOCIALES</span><button aria-label="Actualizar métricas" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={14}/></button></div>
    {busy && !data && <p role="status">Consultando las redes…</p>}
    {error && <p role="alert">{error}</p>}
    {data && <><div className="st-social-networks">{data.networks.map(n=>{const Icon=icons[n.network];return <div key={n.network}><Icon size={17}/><strong>{n.label}</strong><b>{n.followers===null ? '—' : n.followers.toLocaleString('es-PE')}</b><small>Seguidores{n.asOf && <> al <PrettyDate value={n.asOf}/></>}</small>{n.network==='instagram' && <span>Alcance: {n.reach===null?'—':n.reach.toLocaleString('es-PE')} · Interacciones: {n.interactions===null?'—':n.interactions.toLocaleString('es-PE')}</span>}<span>{n.note}</span></div>})}</div>
    <p className="st-social-note" role="status">{data.message}</p>
    <small><PrettyDate value={data.start}/> — <PrettyDate value={data.end}/> · Consulta: {new Date(data.checkedAt).toLocaleTimeString('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit'})} Lima</small>
    {manager && ['reconnect','unconfigured'].includes(data.status) && <details className="st-social-note"><summary>Qué falta para conectar</summary><p>Autorizar una cuenta de Meta con acceso a la página de Facebook y al Instagram profesional de la marca. Las cifras aparecerán después de validar esa conexión.</p></details>}
    </>}
  </section>
}

async function loadSocial(slug:string,signal?:AbortSignal):Promise<SocialSummary> {
  const response=await fetch(`/api/estrategia/metricas?marca=${encodeURIComponent(slug)}`,{signal})
  if(!response.ok) throw new Error('No se pudo consultar las redes de esta marca.')
  return response.json()
}
