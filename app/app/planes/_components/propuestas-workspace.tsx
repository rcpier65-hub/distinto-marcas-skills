'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, FileDown, FileText, FolderOpen, Layers3, Plus, Save, Trash2 } from 'lucide-react'
import { PLANES } from '@/lib/planes/catalogo'
import { AGENCY, STANDALONE, commercialWarnings, emptyProposal, excessAdFee, money, priceSuggestion, proposalNumber, proposalSchema, readyIssues, serviceFromTemplate, totals, type ProposalData, type ProposalRecord, type ProposalService } from '@/lib/propuestas/model'
import { proposalHtml } from '@/lib/propuestas/document'
import { PlanesView } from './planes-view'
import styles from './propuestas.module.css'

type Draft = ProposalRecord
const steps = ['Cliente', 'Servicios', 'Condiciones', 'Vista previa']
const f = (n: number, d: ProposalData) => money(n, d.currency)
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Tu sesión venció o el servidor no respondió. Guarda tu borrador local e inicia sesión de nuevo.')
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación.')
  return body as T
}
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className={styles.field}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}
function TextField({ label, value, onChange, multiline = false, hint, maxLength = 2000 }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; hint?: string; maxLength?: number }) {
  return <Field label={label} hint={hint}>{multiline ? <textarea value={value} rows={4} maxLength={maxLength} onChange={e => onChange(e.target.value)} /> : <input value={value} maxLength={maxLength} onChange={e => onChange(e.target.value)} />}</Field>
}

export function PropuestasWorkspace({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'propuestas' | 'catalogo'>('propuestas')
  const [proposals, setProposals] = useState<ProposalRecord[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [recovered, setRecovered] = useState<Draft | null>(null)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState('')
  const [search, setSearch] = useState('')
  const [template, setTemplate] = useState('sm-integration')
  const [budget, setBudget] = useState(3000)
  const lock = useRef(false)
  const key = `distinto:propuesta:v1:${userId}`
  const dirty = !!draft && JSON.stringify(draft.data) !== saved
  const load = useCallback(async () => {
    try { const data = await api<{ proposals: ProposalRecord[] }>('/api/propuestas'); setProposals(data.proposals); setLoadError('') }
    catch (e) { setLoadError(e instanceof Error ? e.message : 'No se pudieron cargar las propuestas.') }
    finally { setLoading(false) }
  }, [])
  // Carga remota al montar; los estados se actualizan cuando responde la API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed.id === 'string' && typeof parsed.revision === 'number' && proposalSchema.safeParse(parsed.data).success) {
          // Recuperación de un borrador almacenado fuera de React.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRecovered(parsed)
        }
      }
    } catch { /* Almacenamiento local no disponible. El guardado en la app sigue funcionando. */ }
  }, [key])
  useEffect(() => {
    if (!draft || !dirty) return
    try { localStorage.setItem(key, JSON.stringify(draft)) } catch { /* No descartar lo que sigue en pantalla. */ }
  }, [draft, dirty, key])
  useEffect(() => {
    if (!dirty) return
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])
  const total = draft ? totals(draft.data) : null
  const issues = draft ? readyIssues(draft.data) : []
  const warnings = draft ? commercialWarnings(draft.data) : []
  const html = useMemo(() => draft ? proposalHtml(draft.data, draft.numero ? proposalNumber(draft) : 'BORRADOR') : '', [draft])

  function update(patch: Partial<ProposalData>) { setDraft(d => d ? { ...d, data: { ...d.data, ...patch } } : d) }
  function updateService(id: string, patch: Partial<ProposalService>) {
    setDraft(d => d ? { ...d, data: { ...d.data, services: d.data.services.map(s => s.id === id ? { ...s, ...patch } : s) } } : d)
  }
  function begin(sourceId?: string) {
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Abrir una propuesta nueva?')) return
    const data = emptyProposal()
    if (sourceId) data.services = [serviceFromTemplate(sourceId, crypto.randomUUID())]
    setDraft({ id: crypto.randomUUID(), numero: 0, revision: 0, updated_at: '', data })
    setSaved(''); setStep(0); setTab('propuestas'); setRecovered(null)
  }
  function open(record: ProposalRecord, duplicate = false) {
    const copy = structuredClone(record)
    if (duplicate) {
      copy.id = crypto.randomUUID(); copy.numero = 0; copy.revision = 0
      copy.data.date = emptyProposal().date; copy.data.status = 'borrador'
    }
    setDraft(copy); setSaved(duplicate ? '' : JSON.stringify(copy.data)); setStep(0); setRecovered(null)
  }
  function back() {
    if (dirty && !window.confirm('Hay cambios sin guardar en la app. Se conservará un borrador local. ¿Volver a la lista?')) return
    if (dirty) setRecovered(draft)
    setDraft(null); void load()
  }
  function addService(id: string) {
    if (!draft) return
    if (draft.data.services.length >= 30) { toast.error('Máximo 30 servicios por propuesta.'); return }
    if (draft.data.services.some(s => s.sourceId === id) && id !== 'personalizado') { toast.info('Este servicio ya está agregado. Edita su cantidad o alcance.'); return }
    const service = serviceFromTemplate(id, crypto.randomUUID())
    // El catálogo está en soles. Nunca convertir moneda cambiando solo el símbolo.
    if (draft.data.currency === 'USD') service.price = null
    update({ services: [...draft.data.services, service] })
  }
  async function persist(status?: ProposalData['status']) {
    if (!draft) throw new Error('No hay propuesta abierta.')
    const data = { ...draft.data, status: status ?? draft.data.status }
    const result = await api<{ proposal: ProposalRecord }>('/api/propuestas', { method: 'PUT', body: JSON.stringify({ id: draft.id, revision: draft.revision, data }) })
    setDraft(result.proposal); setSaved(JSON.stringify(result.proposal.data)); setRecovered(null)
    try { localStorage.removeItem(key) } catch { /* opcional */ }
    setProposals(current => [result.proposal, ...current.filter(p => p.id !== result.proposal.id)])
    return result.proposal
  }
  async function save() {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try { await persist('borrador'); toast.success('Propuesta guardada en la app.') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo guardar.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function download() {
    if (lock.current || !draft) return
    if (issues.length) { toast.error(issues[0]); setStep(2); return }
    lock.current = true; setBusy(true)
    try {
      const row = await persist('lista')
      const response = await fetch('/api/propuestas/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, revision: row.revision }) })
      if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'No se pudo generar el PDF. La propuesta quedó guardada.')
      }
      const blob = await response.blob()
      if (!new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer()).startsWith('%PDF-')) throw new Error('El archivo no es un PDF válido. Vuelve a intentar.')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = `${proposalNumber(row)} - ${row.data.client.name.replace(/[/\\]/g, '-')}.pdf`; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      toast.success('PDF generado con la propuesta guardada.')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo exportar.') }
    finally { lock.current = false; setBusy(false) }
  }

  return <div className={styles.workspace}>
    <header className={styles.header}><div><div className={styles.kicker}>DISTINTO · COMERCIAL</div><h1>Planes y propuestas<span>.</span></h1><p>Combina servicios. Define el alcance. Presenta una propuesta a medida.</p></div>{!draft && <button className={styles.primary} onClick={() => begin()}><Plus size={17} /> Nueva propuesta</button>}</header>
    {!draft && <nav className={styles.tabs}><button className={tab === 'propuestas' ? styles.activeTab : ''} onClick={() => setTab('propuestas')}><FileText size={17} /> Mis propuestas</button><button className={tab === 'catalogo' ? styles.activeTab : ''} onClick={() => setTab('catalogo')}><Layers3 size={17} /> Catálogo de planes</button></nav>}
    {!draft && tab === 'catalogo' && <PlanesView onUsePlan={id => begin(id)} />}
    {!draft && tab === 'propuestas' && <>
      {recovered && <div className={styles.recovery}><div><b>Tienes un borrador local por recuperar</b><p>{recovered.data.client.name || 'Cliente por completar'} · {recovered.data.title}</p></div><button onClick={() => { setDraft(recovered); setSaved(''); setRecovered(null) }}>Continuar borrador <ArrowRight size={16} /></button></div>}
      <div className={styles.intro}><div className={styles.introIcon}><FileText size={26} /></div><div><h2>De una idea a una propuesta lista</h2><p>Parte de un plan del catálogo o combina Social Media, Paid Media, Trafficker y servicios adicionales. Cada propuesta conserva sus propios precios y condiciones.</p></div><div className={styles.pill}>PDF con tu marca</div></div>
      <div className={styles.listTop}><h2>Propuestas guardadas <small>{proposals.length}</small></h2><input aria-label="Buscar propuesta" placeholder="Buscar cliente o propuesta…" value={search} onChange={e=>setSearch(e.target.value)} /></div>
      {loadError ? <div className={styles.error} role="alert">{loadError}<button onClick={()=>void load()}>Reintentar</button></div> : loading ? <div className={styles.empty}>Cargando propuestas…</div> : proposals.length === 0 ? <div className={styles.empty}><FolderOpen size={34} /><h3>Tu próxima propuesta empieza aquí</h3><p>Agrega los datos del cliente y selecciona lo que vas a ofrecer.</p><button className={styles.primary} onClick={()=>begin()}>Crear mi primera propuesta <ArrowRight size={16}/></button></div> : <div className={styles.proposalList}>{proposals.filter(p=>`${p.data.client.name} ${p.data.title} ${proposalNumber(p)}`.toLowerCase().includes(search.toLowerCase())).map(p=>{const sum=totals(p.data); return <article className={styles.proposalRow} key={p.id}><div className={styles.docIcon}><FileText size={22}/></div><button className={styles.rowTitle} onClick={()=>open(p)}><small>{proposalNumber(p)}</small><strong>{p.data.client.name || 'Cliente por completar'}</strong><span>{p.data.title}</span></button><div className={styles.rowPrice}>{sum.monthly.count > 0 && <b>{sum.monthly.pending ? 'Por definir' : f(sum.monthly.total,p.data)}<small> / mes</small></b>}{sum.once.count > 0 && <span>{sum.once.pending ? 'Por definir' : f(sum.once.total,p.data)} · único</span>}</div><span className={p.data.status==='lista'?styles.readyBadge:styles.draftBadge}>{p.data.status==='lista'?'Lista':'Borrador'}</span><button title="Duplicar como nueva propuesta" aria-label={`Duplicar propuesta de ${p.data.client.name}`} onClick={()=>open(p,true)}><Copy size={16}/></button><button onClick={()=>open(p)}>Abrir <ArrowRight size={15}/></button></article>})}</div>}
    </>}
    {draft && <>
      <div className={styles.editorBar}><button disabled={busy} onClick={back}><ArrowLeft size={16}/> Propuestas</button><div><strong>{draft.numero ? proposalNumber(draft) : 'Nueva propuesta'}</strong><span>{busy ? 'Procesando…' : dirty ? 'Cambios sin guardar en la app' : 'Guardada en la app'}</span></div><button disabled={busy} onClick={()=>void save()}><Save size={16}/>{busy ? 'Guardando…' : 'Guardar borrador'}</button><button className={styles.primary} disabled={busy} onClick={()=>void download()}><FileDown size={16}/> Descargar PDF</button></div>
      <nav className={styles.steps} aria-label="Pasos de la propuesta">{steps.map((label,i)=><button disabled={busy} aria-current={step===i?'step':undefined} className={step===i?styles.currentStep:''} key={label} onClick={()=>setStep(i)}><span>{i+1}</span>{label}{i<step && <Check size={14}/>}</button>)}</nav>
      <div className={step===3 ? styles.previewLayout : styles.editorLayout}>
        <fieldset disabled={busy} className={styles.form}>
          {step===0 && <section className={styles.panel}><div className={styles.sectionHeading}><div className={styles.kicker}>01 / CONOZCAMOS AL CLIENTE</div><h2>Una propuesta para quién y para qué</h2><p>Completa el contexto que aparecerá en el documento.</p></div><div className={styles.twoCols}>
            <TextField label="Empresa / nombre del cliente *" value={draft.data.client.name} maxLength={200} onChange={name=>update({client:{...draft.data.client,name}})} />
            <TextField label="Persona de contacto" value={draft.data.client.contact} maxLength={160} onChange={contact=>update({client:{...draft.data.client,contact}})} />
            <TextField label="RUC / documento" value={draft.data.client.document} maxLength={40} onChange={document=>update({client:{...draft.data.client,document}})} />
            <TextField label="Rubro" value={draft.data.client.industry} maxLength={200} onChange={industry=>update({client:{...draft.data.client,industry}})} />
            <TextField label="Correo" value={draft.data.client.email} maxLength={180} onChange={email=>update({client:{...draft.data.client,email}})} />
            <TextField label="Teléfono" value={draft.data.client.phone} maxLength={50} onChange={phone=>update({client:{...draft.data.client,phone}})} />
            <TextField label="Dirección / local" value={draft.data.client.address} maxLength={300} onChange={address=>update({client:{...draft.data.client,address}})} />
            <TextField label="Cobertura geográfica" value={draft.data.client.coverage} maxLength={200} onChange={coverage=>update({client:{...draft.data.client,coverage}})} />
          </div><TextField label="Título de la propuesta *" value={draft.data.title} maxLength={160} onChange={title=>update({title})}/><TextField label="Objetivo y resumen comercial" value={draft.data.objective} maxLength={4000} onChange={objective=>update({objective})} multiline hint="Por ejemplo: producir contenido mensual, activar campañas y mejorar la atención de los leads."/></section>}
          {step===1 && <>
            <section className={styles.panel}><div className={styles.sectionHeading}><div className={styles.kicker}>02 / ARMA LA COMBINACIÓN</div><h2>Servicios que se adaptan al cliente</h2><p>Agrega un plan completo o un servicio independiente. Después ajusta cantidades, alcance y precio.</p></div><div className={styles.serviceChoices}>{STANDALONE.map(s=><button key={s.id} onClick={()=>addService(s.id)}><Plus size={15}/>{s.name}</button>)}</div><div className={styles.addPlan}><Field label="Agregar desde el catálogo de Planes"><select value={template} onChange={e=>setTemplate(e.target.value)}>{PLANES.map(p=><option value={p.id} key={p.id}>{p.nombre} · {p.precioLabel}</option>)}</select></Field><button className={styles.secondary} onClick={()=>addService(template)}>Agregar plan <Plus size={16}/></button></div><p className={styles.note}>Los precios del catálogo están en soles. Los planes que incluyen IGV se convierten a su base sin IGV para evitar sumarlo dos veces.</p></section>
            {draft.data.services.length===0 && <div className={styles.empty}>Elige tu primer servicio para comenzar.</div>}
            {draft.data.services.map((s,index)=>{const suggestion=priceSuggestion(s.sourceId);return <section className={styles.panel} key={s.id}><div className={styles.serviceTop}><span className={styles.serviceNumber}>{String(index+1).padStart(2,'0')}</span><div><small>{s.category}</small><h3>{s.name}</h3></div><button className={styles.iconButton} title="Quitar servicio de esta propuesta" aria-label={`Quitar ${s.name}`} onClick={()=>update({services:draft.data.services.filter(v=>v.id!==s.id)})}><Trash2 size={17}/></button></div>
              <div className={styles.twoCols}><TextField label="Nombre del servicio" value={s.name} maxLength={160} onChange={name=>updateService(s.id,{name})}/><Field label="Tipo de cobro"><select value={s.frequency} onChange={e=>updateService(s.id,{frequency:e.target.value as ProposalService['frequency']})}><option value="mensual">Mensual</option><option value="unico">Pago único</option></select></Field></div>
              <div className={styles.priceFields}><Field label="Cantidad"><input type="number" min={1} max={10000} value={s.quantity} onChange={e=>updateService(s.id,{quantity:Math.max(1,Number(e.target.value))})}/></Field><Field label={`Precio unitario sin IGV (${draft.data.currency === 'PEN' ? 'S/' : 'USD'})`} hint="0 = incluido sin cobro adicional. Vacío = por definir."><input type="number" min={0} step="0.01" value={s.price??''} placeholder="Por definir" onChange={e=>updateService(s.id,{price:e.target.value===''?null:Number(e.target.value)})}/></Field><div className={styles.serviceTotal}><small>Total del servicio</small><strong>{s.price==null?'Por definir':f(s.price*s.quantity,draft.data)}</strong></div></div>
              {suggestion && <div className={styles.suggestion}><b>Ayuda para calcular el precio</b><p>{suggestion.explanation}</p><button disabled={draft.data.currency!=='PEN'} onClick={()=>updateService(s.id,{price:suggestion.price,scope:s.scope||suggestion.scope})}>Usar S/ {suggestion.price} como base editable</button></div>}
              <TextField label="Resumen del servicio" value={s.summary} onChange={summary=>updateService(s.id,{summary})} multiline/>
              <div className={styles.twoCols}><TextField label="Qué incluye / alcance" value={s.scope} maxLength={6000} onChange={scope=>updateService(s.id,{scope})} multiline hint="Una prestación por línea."/><TextField label="Entregables y variables" value={s.deliverables} maxLength={6000} onChange={deliverables=>updateService(s.id,{deliverables})} multiline hint="Ej.: 10 videos/mes, 1 jornada de 6 h, 2 rondas, Meta + TikTok."/></div>
              <TextField label="Qué no incluye" value={s.exclusions} maxLength={6000} onChange={exclusions=>updateService(s.id,{exclusions})} multiline/>
              <label className={styles.check}><input type="checkbox" checked={s.optional} onChange={e=>updateService(s.id,{optional:e.target.checked})}/><span><b>Adicional opcional</b><small>Se muestra por separado y no se suma al total.</small></span></label>
            </section>})}
          </>}
          {step===2 && <>
            <section className={styles.panel}><div className={styles.sectionHeading}><div className={styles.kicker}>03 / ACUERDOS CLAROS</div><h2>Inversión y condiciones</h2><p>Separa el fee de la agencia de la inversión del cliente en anuncios y herramientas.</p></div><div className={styles.twoCols}>
              <Field label="Fecha de emisión"><input type="date" value={draft.data.date} onChange={e=>{if(e.target.value) update({date:e.target.value})}}/></Field><Field label="Vigencia (días)"><input type="number" min={1} max={365} value={draft.data.validityDays} onChange={e=>update({validityDays:Number(e.target.value)})}/></Field>
              <TextField label="Duración mínima / plazo" value={draft.data.minimum} maxLength={160} onChange={minimum=>update({minimum})}/><Field label="Tratamiento del IGV"><select value={draft.data.tax} onChange={e=>update({tax:e.target.value as ProposalData['tax']})}><option value="sin_igv">Cotizar sin IGV</option><option value="mas_igv">Agregar IGV (18%) al total</option></select></Field>
              <Field label="Moneda" hint="Cambiar moneda borra los importes para que ingreses su conversión; no cambia solo el símbolo."><select value={draft.data.currency} onChange={e=>{const currency=e.target.value as ProposalData['currency'];if(currency!==draft.data.currency && window.confirm('Los importes se dejarán por definir. Ingresa los precios en la nueva moneda.')) update({currency,monthlyDiscount:0,onceDiscount:0,services:draft.data.services.map(s=>({...s,price:null}))})}}><option value="PEN">Soles (PEN)</option><option value="USD">Dólares (USD)</option></select></Field>
              <div className={styles.twoCols}><Field label="Descuento mensual"><input type="number" min={0} step="0.01" value={draft.data.monthlyDiscount} onChange={e=>update({monthlyDiscount:Number(e.target.value)})}/></Field><Field label="Descuento pago único"><input type="number" min={0} step="0.01" value={draft.data.onceDiscount} onChange={e=>update({onceDiscount:Number(e.target.value)})}/></Field></div>
            </div><TextField label="Forma de pago *" value={draft.data.payment} maxLength={4000} onChange={payment=>update({payment})} multiline hint="Define adelanto, saldo y cuándo se pagan los meses siguientes."/><div className={styles.quickTerms}><button onClick={()=>update({payment:'Primer mes: 50% al inicio y 50% al finalizar el mes.\nMeses siguientes: pago mensual al cierre de cada mes trabajado.'})}>Mensual: 50% / 50%</button><button onClick={()=>update({payment:'50% al inicio del proyecto y 50% contra entrega final.'})}>Proyecto: 50% / 50%</button></div>
            <TextField label="Condiciones y exclusiones generales" value={draft.data.terms} maxLength={8000} onChange={terms=>update({terms})} multiline hint="Una condición por línea. Puedes adaptar las rondas de ajustes, coordinaciones y accesos."/><TextField label="Gastos que paga el cliente por separado" value={draft.data.externalCosts} maxLength={4000} onChange={externalCosts=>update({externalCosts})} multiline hint="Inversión publicitaria, dominio, hosting, licencias, talentos, etc."/><TextField label="Equipo asignado y coordinación" value={draft.data.team} maxLength={3000} onChange={team=>update({team})} multiline hint="Incluye solo a las personas que participarán en este servicio."/></section>
            <section className={styles.panel}><h3>Calculadora de pauta adicional</h3><p className={styles.note}>Regla del catálogo: 10% sobre la inversión mensual que exceda S/ 3,000. El presupuesto de anuncios lo paga el cliente; aquí se calcula únicamente el fee adicional de gestión.</p><div className={styles.addPlan}><Field label="Inversión publicitaria mensual (S/)"><input type="number" min={0} max={10000000} value={budget} onChange={e=>setBudget(Math.max(0,Number(e.target.value)))}/></Field><strong>{money(excessAdFee(budget),'PEN')} / mes</strong><button disabled={draft.data.currency!=='PEN'||excessAdFee(budget)<=0} onClick={()=>{const existing=draft.data.services.find(s=>s.sourceId==='fee-pauta-excedente');const fee:ProposalService={id:existing?.id||crypto.randomUUID(),sourceId:'fee-pauta-excedente',name:'Gestión de pauta sobre excedente',category:'Paid Media',summary:`10% sobre el excedente de S/ 3,000, para una inversión de ${money(budget,'PEN')} al mes.`,scope:'Gestión del presupuesto publicitario adicional al límite del plan contratado.',deliverables:'',exclusions:'Inversión publicitaria: pagada por el cliente directamente a la plataforma.',quantity:1,price:excessAdFee(budget),frequency:'mensual',optional:false};update({services:existing?draft.data.services.map(s=>s.id===existing.id?fee:s):[...draft.data.services,fee]});toast.success('Fee de excedente aplicado una sola vez.')}}>Aplicar fee adicional</button></div></section>
          </>}
          {step===3 && <section className={styles.previewPanel}><div className={styles.previewTitle}><div><h2>Así la verá tu cliente</h2><p>El PDF usa estos mismos contenidos y el logo oficial de Distinto.</p></div><span className={styles.pill}>A4 · PDF</span></div><iframe title="Vista previa de la propuesta" srcDoc={html} sandbox="" className={styles.preview}/></section>}
          <div className={styles.stepActions}><button disabled={step===0} onClick={()=>setStep(s=>s-1)}><ArrowLeft size={16}/> Anterior</button>{step<3?<button className={styles.primary} onClick={()=>setStep(s=>s+1)}>Continuar a {steps[step+1].toLowerCase()} <ArrowRight size={16}/></button>:<button className={styles.primary} onClick={()=>void download()}><FileDown size={16}/> Descargar propuesta</button>}</div>
        </fieldset>
        <aside className={styles.summary}><div className={styles.kicker}>TU PROPUESTA</div><h3>{draft.data.client.name || 'Nuevo cliente'}</h3><p>{draft.data.services.filter(s=>!s.optional).length} servicios incluidos · {draft.data.services.filter(s=>s.optional).length} opcionales</p>{total && <>{([{label:'Mensual',b:total.monthly},{label:'Pago único',b:total.once}]).map(({label,b})=>b.count>0&&<div className={styles.totalBlock} key={label}><small>{label}</small><strong>{b.pending?'Por definir':f(b.total,draft.data)}</strong><dl><dt>Subtotal</dt><dd>{f(b.subtotal,draft.data)}</dd>{b.discount>0&&<><dt>Descuento</dt><dd>−{f(b.discount,draft.data)}</dd></>}{draft.data.tax==='mas_igv'&&<><dt>IGV 18%</dt><dd>{f(b.tax,draft.data)}</dd></>}</dl></div>)}</>}<p className={styles.note}>{draft.data.tax==='mas_igv'?'Totales con IGV.':'Importes sin IGV.'} Los adicionales opcionales no se suman.</p>{warnings.map(w=><div className={styles.warning} key={w}>{w}</div>)}{issues.length>0?<div className={styles.checklist}><b>Antes de exportar</b><ul>{issues.map((v,i)=><li key={i}>{v}</li>)}</ul></div>:<div className={styles.allSet}><CheckCircle2 size={18}/> Lista para generar el PDF</div>}<div className={styles.agency}><b>{AGENCY.name}</b><span>RUC {AGENCY.ruc}</span></div></aside>
      </div>
    </>}
  </div>
}
