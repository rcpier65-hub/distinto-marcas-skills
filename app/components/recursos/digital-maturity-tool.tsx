'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { diagnoseMaturity, maturityDimensions, maturityQuestions, type MaturityGoal } from '@/lib/recursos/madurez-digital'
import { LeadCapture } from './lead-capture'
import s from './recursos.module.css'

const goals: Array<{ id: MaturityGoal; name: string; detail: string }> = [
  { id: 'demanda', name: 'Generar demanda', detail: 'Más visibilidad y oportunidades correctas' },
  { id: 'ventas', name: 'Convertir más', detail: 'Mejor seguimiento y menos fugas comerciales' },
  { id: 'eficiencia', name: 'Operar mejor', detail: 'Procesos conectados y menos trabajo manual' },
  { id: 'experiencia', name: 'Mejorar experiencia', detail: 'Servicio consistente, recompra y adopción' },
]

export function DigitalMaturityTool() {
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState({ company: '', sector: '', teamSize: '6–20', goal: 'ventas' as MaturityGoal })
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const dimensionIndex = step - 1
  const dimension = dimensionIndex >= 0 && dimensionIndex < maturityDimensions.length ? maturityDimensions[dimensionIndex] : null
  const questions = dimension ? maturityQuestions.filter((question) => question.dimension === dimension.id) : []
  const complete = questions.every((question) => answers[question.id] !== undefined)
  const isResult = step === maturityDimensions.length + 1
  const result = useMemo(() => isResult ? diagnoseMaturity(answers, profile.goal) : null, [answers, isResult, profile.goal])
  const answered = Object.keys(answers).length

  return <div className={s.page}>
    <section className={s.toolHead}><div className={s.wrap}><Link className={`${s.back} ${s.noPrint}`} href="/recursos"><ArrowLeft size={16} /> Todos los recursos</Link><div className={s.toolTitle}><div><span className={s.eyebrow}>Diagnóstico para empresas</span><h1>Madurez digital y ruta de 90 días</h1><p>Evalúa si estrategia, demanda, ventas, operaciones, datos y experiencia funcionan como un sistema. Obtén tres prioridades ejecutables.</p></div><div className={s.toolNo}>06</div></div></div></section>
    <div className={`${s.wrap} ${s.toolShell}`}>
      <div className={`${s.panel} ${result ? s.result : s.formPanel}`}>
        {step === 0 ? <>
          <span className={s.stepLabel}>Antes de empezar</span><h2>¿Qué negocio estamos evaluando?</h2><p className={s.intro}>El diagnóstico no mide cuántas herramientas compraste. Mide si están integradas en decisiones, procesos y resultados.</p>
          <div className={s.fields}>
            <div className={s.field}><label htmlFor="company">Empresa</label><input id="company" placeholder="Nombre del negocio" value={profile.company} onChange={(event) => setProfile({ ...profile, company: event.target.value })} /></div>
            <div className={s.field}><label htmlFor="sector">Rubro</label><input id="sector" placeholder="Ej.: distribución, salud, servicios" value={profile.sector} onChange={(event) => setProfile({ ...profile, sector: event.target.value })} /></div>
            <div className={s.field}><label htmlFor="teamSize">Tamaño del equipo</label><select id="teamSize" value={profile.teamSize} onChange={(event) => setProfile({ ...profile, teamSize: event.target.value })}><option>1–5</option><option>6–20</option><option>21–50</option><option>51–200</option><option>Más de 200</option></select></div>
            <div className={`${s.field} ${s.full}`}><label>Prioridad de los próximos 90 días</label><div className={s.choiceGrid}>{goals.map((goal) => <label className={`${s.choice} ${profile.goal === goal.id ? s.on : ''}`} key={goal.id}><input type="radio" name="goal" checked={profile.goal === goal.id} onChange={() => setProfile({ ...profile, goal: goal.id })} /><span><b>{goal.name}</b><br />{goal.detail}</span></label>)}</div></div>
          </div>
        </> : null}
        {dimension ? <>
          <span className={s.stepLabel}>Dimensión {step} de {maturityDimensions.length}</span><h2>{dimension.name}</h2><p className={s.intro}>Elige la opción que describe lo que ocurre hoy, aunque el proceso todavía no sea perfecto.</p>
          <div className={s.questionList}>{questions.map((question) => <div className={s.question} key={question.id}><h3>{question.prompt}</h3><div className={s.scale}>{question.answers.map((answer, value) => <button type="button" key={answer} aria-pressed={answers[question.id] === value} className={answers[question.id] === value ? s.selected : ''} onClick={() => setAnswers((current) => ({ ...current, [question.id]: value }))}><b>{value}</b>{answer}</button>)}</div></div>)}</div>
        </> : null}
        {result ? <>
          <div className={s.resultHero}><div className={s.resultHeroTop}><div><span className={s.stepLabel}>{profile.company} · Nivel de madurez</span><h2>{result.level}</h2><p>{result.summary}</p></div><div className={s.scoreRing} style={{ '--score': result.score } as React.CSSProperties}><span>{result.score}</span></div></div></div>
          <div className={s.resultBody}>
            <h3>Mapa de capacidades</h3><div className={s.dimensionBars}>{result.dimensions.map((item) => <div className={s.dimensionRow} key={item.id}><span>{item.name}</span><div className={s.bar}><i style={{ width: `${item.score}%` }} /></div><b>{item.score}</b></div>)}</div>
            <div className={s.nextTest}><h3>Tus tres prioridades</h3>{result.priorities.map((priority, index) => <p key={priority.title} style={{ marginTop: index ? 10 : 0 }}><b>{index + 1}. {priority.title}.</b> {priority.reason}</p>)}</div>
            <h3 style={{ marginTop: 26 }}>Ruta recomendada de 90 días</h3><div className={s.roadmap}>{result.roadmap.map((phase) => <div className={s.roadmapCard} key={phase.period}><strong>{phase.period}</strong><h3>{phase.objective}</h3><ul>{phase.actions.map((action) => <li key={action}>{action}</li>)}</ul><p className={s.proof}><b>Evidencia de avance:</b> {phase.proof}</p></div>)}</div>
            <div className={s.note}>Este resultado es un autodiagnóstico: sirve para ordenar la conversación y priorizar. Se apoya en las dimensiones usadas por marcos de evaluación para pymes de la <a href="https://www.oecd.org/content/dam/oecd/en/publications/reports/2020/07/digital-business-diagnostic-tools-for-smes-and-entrepreneurship_c8f2e916/516bdf9c-en.pdf" target="_blank" rel="noreferrer">OCDE</a> y el <a href="https://publications.iadb.org/publications/english/document/The-360-on-Digital-Transformation-in-Firms-in-Latin-America-and-the-Caribbean.pdf" target="_blank" rel="noreferrer">BID</a>, adaptadas a una ruta práctica. Antes de invertir, valida procesos, restricciones y datos con las personas responsables.</div>
            <LeadCapture resource="madurez-digital" payload={{ profile, answers, diagnosis: result }} />
            <button className={`${s.button} ${s.ghost} ${s.noPrint}`} style={{ marginTop: 14 }} onClick={() => { setAnswers({}); setStep(0) }}><RotateCcw size={16} /> Evaluar otra empresa</button>
          </div>
        </> : null}
        {!result ? <div className={s.actions}><button className={`${s.button} ${s.ghost}`} disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft size={16} /> Anterior</button><button className={`${s.button} ${s.primary}`} disabled={step === 0 ? profile.company.trim().length < 2 || profile.sector.trim().length < 2 : !complete} onClick={() => setStep((value) => value + 1)}>{step === maturityDimensions.length ? 'Ver mi ruta' : 'Continuar'} <ArrowRight size={16} /></button></div> : null}
      </div>
      <aside className={`${s.panel} ${s.side} ${s.noPrint}`}><b>Diagnóstico de madurez</b><div className={s.progress}><i style={{ width: `${isResult ? 100 : Math.round((answered / maturityQuestions.length) * 100)}%` }} /></div><small>{answered} de {maturityQuestions.length} respuestas</small><h3>Qué medimos</h3><p>Adopción, integración y capacidad de convertir la tecnología en resultados. Un perfil equilibrado vale más que una herramienta avanzada aislada.</p><div className={s.sideList}>{maturityDimensions.map((item, index) => <div className={`${s.sideItem} ${step > index ? s.done : ''}`} key={item.id}><i>{step > index ? '✓' : index + 1}</i>{item.short}</div>)}</div></aside>
    </div>
  </div>
}
