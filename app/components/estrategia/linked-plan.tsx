'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { BrandPayload } from '@/lib/estrategia/load'
import { api, PrettyDate } from './common'
export function LinkedPlan({slug,sheetId,objective,description}:{slug:string;sheetId:string;objective:string;description:string}) {
  const [data,setData]=useState<BrandPayload|null>(null),[error,setError]=useState('')
  useEffect(()=>{let stopped=false;const refresh=()=>api(`/api/estrategia?marca=${slug}`).then(b=>{if(!stopped){setData(b);setError('')}}).catch(()=>{if(!stopped)setError('No se pudo actualizar el trabajo vinculado.')});void refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},30000);return()=>{stopped=true;clearInterval(timer)}},[slug])
  const work=data?.activities.filter(a=>data.links.some(l=>l.sheet_id===sheetId && l.target_type===a.source && l.target_id===a.sourceId)) || []
  return <><section><span className="st-eyebrow">OBJETIVO PROPUESTO</span><h3>{objective || 'Por definir'}</h3><p className="st-plan-copy">{description}</p></section><section><h3>Trabajo vinculado · {work.length}</h3><p>Estado actualizado desde cada módulo. Abre una tarjeta para trabajar en el registro original.</p>{error && <p role="alert">{error}</p>}{!data&&!error&&<p>Cargando tareas y entregas…</p>}{work.map(a=><Link className="st-existing-item" key={a.id} href={a.href}><small>{a.kind} · {a.owner}</small><strong>{a.title}</strong><small><PrettyDate value={a.date}/> · {a.done?'Terminada':a.state.replaceAll('_',' ')}</small></Link>)}</section></>
}
