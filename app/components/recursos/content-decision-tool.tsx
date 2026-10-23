'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { diagnoseContent, type ContentMetrics, type ContentObjective } from '@/lib/recursos/decision-contenido'
import { LeadCapture } from './lead-capture'
import s from './recursos.module.css'

const initial: ContentMetrics = {
  title: '', platform: 'Instagram Reels', objective: 'leads', duration: 30, views: 0, averageWatch: 0,
  completion: 0, saves: 0, shares: 0, profileVisits: 0, clicks: 0, leads: 0, sales: 0, attempts: 1,
}

const objectives: Array<{ id: ContentObjective; name: string; detail: string }> = [
  { id: 'alcance', name: 'Alcance', detail: 'Llegar a más personas correctas' },
  { id: 'autoridad', name: 'Autoridad', detail: 'Ser recordado y compartido' },
  { id: 'leads', name: 'Consultas', detail: 'Generar intención y contactos' },
  { id: 'ventas', name: 'Ventas', detail: 'Producir oportunidades comerciales' },
]

const number = (value: string) => Math.max(0, Number(value) || 0)

export function ContentDecisionTool() {
  const [step, setStep] = useState(0)
  const [metrics, setMetrics] = useState<ContentMetrics>(initial)
  const [baseline, setBaseline] = useState(false)
  const result = useMemo(() => step === 3 ? diagnoseContent(metrics) : null, [metrics, step])
  const valid = step === 0 ? metrics.title.trim().length > 2 : step === 1 ? metrics.views > 0 && metrics.duration > 0 : true

  const update = (key: keyof ContentMetrics, value: string | number) => setMetrics((current) => ({ ...current, [key]: value }))
  const input = (label: string, key: keyof ContentMetrics, unit?: string, help?: string) => <div className={s.field}>
    <label htmlFor={String(key)}>{label}</label>
    <div className={unit ? s.inputUnit : undefined}>
      <input id={String(key)} inputMode="decimal" type="number" min="0" value={String(metrics[key] ?? '')} onChange={(event) => update(key, number(event.target.value))} />
      {unit ? <span>{unit}</span> : null}
    </div>
    {help ? <small>{help}</small> : null}
  </div>

  return <div className={s.page}>
    <section className={s.toolHead}>
      <div className={s.wrap}>
        <Link className={`${s.back} ${s.noPrint}`} href="/recursos"><ArrowLeft size={16} /> Todos los recursos</Link>
        <div className={s.toolTitle}><div><span className={s.eyebrow}>Herramienta de decisión</span><h1>¿Repetir, corregir o soltar este contenido?</h1><p>Convierte métricas en una decisión concreta y en el siguiente experimento. El análisis cambia según el objetivo de la pieza.</p></div><div className={s.toolNo}>05</div></div>
      </div>
    </section>
    <div className={`${s.wrap} ${s.toolShell}`}>
      <div className={`${s.panel} ${result ? s.result : s.formPanel}`}>
        {step === 0 ? <>
          <span className={s.stepLabel}>Paso 1 de 3 · Contexto</span><h2>¿Qué debía lograr esta pieza?</h2><p className={s.intro}>Una misma cifra puede ser buena para alcance y mala para ventas. Primero fijemos el trabajo del contenido.</p>
          <div className={s.fields}>
            <div className={`${s.field} ${s.full}`}><label htmlFor="title">Nombre o idea del contenido</label><input id="title" placeholder="Ej.: 5 fugas que frenan las ventas" value={metrics.title} onChange={(event) => update('title', event.target.value)} /></div>
            <div className={s.field}><label htmlFor="platform">Plataforma</label><select id="platform" value={metrics.platform} onChange={(event) => update('platform', event.target.value)}><option>Instagram Reels</option><option>TikTok</option><option>YouTube Shorts</option><option>Facebook Reels</option><option>LinkedIn</option></select></div>
            <div className={s.field}><label htmlFor="attempts">Versiones ya probadas</label><select id="attempts" value={metrics.attempts} onChange={(event) => update('attempts', number(event.target.value))}><option value={1}>Primera prueba</option><option value={2}>Dos versiones</option><option value={3}>Tres o más versiones</option></select></div>
            <div className={`${s.field} ${s.full}`}><label>Objetivo principal</label><div className={s.choiceGrid}>{objectives.map((objective) => <label className={`${s.choice} ${metrics.objective === objective.id ? s.on : ''}`} key={objective.id}><input type="radio" name="objective" checked={metrics.objective === objective.id} onChange={() => update('objective', objective.id)} /><span><b>{objective.name}</b><br />{objective.detail}</span></label>)}</div></div>
          </div>
        </> : null}
        {step === 1 ? <>
          <span className={s.stepLabel}>Paso 2 de 3 · Resultado</span><h2>Ingresa las señales reales</h2><p className={s.intro}>No necesitas llenar métricas que la plataforma no entregue. Los ceros se interpretan como “sin señal registrada”.</p>
          <div className={s.fields}>{input('Duración', 'duration', 's')}{input('Visualizaciones', 'views')}{input('Tiempo promedio visto', 'averageWatch', 's')}{input('Finalización', 'completion', '%')}{input('Guardados', 'saves')}{input('Compartidos', 'shares')}{input('Visitas al perfil', 'profileVisits')}{input('Clics', 'clicks')}{input('Consultas o leads', 'leads')}{input('Ventas atribuidas', 'sales')}</div>
        </> : null}
        {step === 2 ? <>
          <span className={s.stepLabel}>Paso 3 de 3 · Comparación</span><h2>Compáralo contra tu propia cuenta</h2><p className={s.intro}>La referencia más útil es tu promedio de piezas similares. Evitamos declarar “bueno” o “malo” con un benchmark universal.</p>
          <label className={`${s.choice} ${baseline ? s.on : ''}`}><input type="checkbox" checked={baseline} onChange={(event) => setBaseline(event.target.checked)} /><span><b>Sí tengo un promedio de referencia</b><br />Aumenta la confianza del diagnóstico.</span></label>
          {baseline ? <div className={s.fields} style={{ marginTop: 18 }}>{input('Promedio de vistas', 'baselineViews')}{input('Promedio de tiempo visto', 'baselineWatch', 's')}{input('Promedio de finalización', 'baselineCompletion', '%')}{input('Promedio de guardados', 'baselineSaves')}{input('Promedio de compartidos', 'baselineShares')}{input('Promedio de clics', 'baselineClicks')}</div> : <div className={s.note}>Puedes continuar sin promedio. El diagnóstico usará señales internas y tendrá confianza media; no descartará una idea por una sola publicación.</div>}
        </> : null}
        {result ? <>
          <div className={s.resultHero}><div className={s.resultHeroTop}><div><span className={s.stepLabel}>Decisión recomendada · Confianza {result.confidence}</span><h2>{result.label}</h2><p>{result.summary}</p></div><div className={s.scoreRing} style={{ '--score': result.score } as React.CSSProperties}><span>{result.score}</span></div></div></div>
          <div className={s.resultBody}>
            <div className={s.metrics}>{Object.entries(result.scores).map(([key, value]) => <div className={s.metric} key={key}><small>{{ attention: 'Atención', connection: 'Conexión', intent: 'Intención', business: 'Negocio' }[key as keyof typeof result.scores]}</small><b>{value}</b><div className={s.bar}><i style={{ width: `${value}%` }} /></div></div>)}</div>
            <div className={s.resultGrid}><div className={s.resultCard}><h3>Señal más fuerte</h3><p>{result.strength}</p><ul>{result.keep.map((item) => <li key={item}>{item}</li>)}</ul></div><div className={s.resultCard}><h3>Cuello de botella</h3><p>{result.bottleneck}</p><ul>{result.change.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
            <div className={s.nextTest}><h3>Próxima prueba</h3><p>{result.nextTest}</p></div>
            <LeadCapture resource="decision-contenido" payload={{ metrics, diagnosis: result }} />
            <button className={`${s.button} ${s.ghost} ${s.noPrint}`} style={{ marginTop: 14 }} onClick={() => { setMetrics(initial); setBaseline(false); setStep(0) }}><RotateCcw size={16} /> Analizar otro contenido</button>
          </div>
        </> : null}
        {!result ? <div className={s.actions}><button className={`${s.button} ${s.ghost}`} disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft size={16} /> Anterior</button><button className={`${s.button} ${s.primary}`} disabled={!valid} onClick={() => setStep((value) => value + 1)}>{step === 2 ? 'Ver diagnóstico' : 'Continuar'} <ArrowRight size={16} /></button></div> : null}
      </div>
      <aside className={`${s.panel} ${s.side} ${s.noPrint}`}><b>Tu análisis</b><div className={s.progress}><i style={{ width: `${Math.min(100, ((step + 1) / 4) * 100)}%` }} /></div><small>{result ? 'Diagnóstico completo' : `Paso ${step + 1} de 3`}</small><h3>La regla del tablero</h3><p>Una pieza no se descarta por pocas vistas. Primero buscamos qué señal funcionó, qué etapa falló y cuál será la única variable del próximo test. La retención y duración media siguen la lógica de los <a href="https://support.google.com/youtube/answer/9313698?hl=es" target="_blank" rel="noreferrer">informes oficiales de audiencia</a>; la referencia principal sigue siendo tu propia cuenta.</p><div className={s.sideList}>{['Objetivo', 'Métricas', 'Comparación', 'Decisión'].map((item, index) => <div className={`${s.sideItem} ${step >= index ? s.done : ''}`} key={item}><i>{step >= index ? '✓' : index + 1}</i>{item}</div>)}</div></aside>
    </div>
  </div>
}
