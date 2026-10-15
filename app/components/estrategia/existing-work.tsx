'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Activity } from '@/lib/estrategia/model'
import { weekWindow, operational } from '@/lib/estrategia/activity-status'
import { PrettyDate } from './common'
const kinds = ['Tarea','Diseño','Edición','Publicación','Grabación'] as const
export function ExistingWork({activities,today}:{activities:Activity[];today:string}) {
  const [period,setPeriod] = useState('mes'), [showDone,setShowDone] = useState(false)
  const week=weekWindow(today)
  const items=activities.filter(a=>operational(a) && (showDone || !a.done) &&
    (period==='semana' ? a.date && a.date>=week.start && a.date<=week.end : period==='sinfecha' ? !a.date : a.date?.startsWith(today.slice(0,7))))
    .sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'))
  return <section className="st-card">
    <div className="st-row"><div><span className="st-eyebrow">TRABAJO EXISTENTE</span><h2>Lo que el equipo ya está haciendo</h2></div><select aria-label="Periodo del trabajo" value={period} onChange={e=>setPeriod(e.target.value)}><option value="mes">Este mes</option><option value="semana">Esta semana</option><option value="sinfecha">Sin fecha</option></select></div>
    <div className="st-row"><p>Conectado a Tareas, Diseño, Editor y Publicaciones. Cada tarjeta abre el registro original.</p><label><input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)}/> Incluir terminados</label></div>
    <div className="st-work-columns">{kinds.map(kind=>{const rows=items.filter(a=>a.kind===kind);return <section key={kind}><h3>{kind} <span className="st-badge">{rows.length}</span></h3>{rows.slice(0,6).map(a=><Link className="st-existing-item" key={a.id} href={a.href}><strong>{a.title}</strong><small>{a.owner} · <PrettyDate value={a.date}/></small><span className={a.done?'st-done':'st-badge'}>{a.done?'Terminada':a.state.replaceAll('_',' ')}</span></Link>)}{!rows.length && <p className="st-muted">Sin registros en esta selección.</p>}{rows.length>6 && <small>+{rows.length-6} registros en el calendario de abajo.</small>}</section>})}</div>
  </section>
}
