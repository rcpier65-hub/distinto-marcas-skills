'use client'

/* Editor de nota de reunión, estilo Granola — Pedro 24-sep-2026.
   1. Antes/durante: tú escribes tus apuntes (texto negro) mientras la app
      transcribe en persona o la llamada de Meet (Yo / Ellos).
   2. Al detener: "Mejorar notas" — la IA junta tus apuntes + transcripción en
      notas ordenadas según la plantilla. Lo que viene de tus apuntes se ve en
      negro, lo que agregó la IA en gris.
   3. Tareas propuestas con responsable y fecha → las apruebas y se crean en
      Tareas, agrupadas por la marca.
   4. "Pregunta lo que sea" sobre esta reunión. */

import { useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Calendar, User, Mic, Pause, Play, Square, Sparkles, Loader2, Users, MonitorSpeaker,
  Video, CheckCircle2, ListChecks, FileText, AudioLines, Tag as TagIcon,
} from 'lucide-react'
import { PLANTILLAS, type AccionNota, type ChatMessage, type NotaReunion, type Plantilla } from '@/lib/notas-reuniones/types'
import { actualizarNota, chatearConNota } from '../_actions'
import { actualizarContextoNota, crearTareasDesdeNota, guardarAcciones, mejorarNotas } from '../_granola-actions'
import { useGrabadora, type Modo } from './use-grabadora'

type Props = {
  nota: NotaReunion
  meNombre: string
  equipo: { id: string; nombre: string }[]
  marcas: { id: string; nombre: string; emoji: string | null }[]
}
const LIME = '#a3e635'
const ACENTO = '#7170ff'
type Vista = 'mejoradas' | 'mias' | 'transcripcion'

/* ¿Esta línea de las notas mejoradas vino de los apuntes del usuario? (para
   pintarla en negro como Granola; lo demás, en gris). */
function normal(x: string) {
  return x.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter((w) => w.length > 2)
}
function vieneDeMisNotas(linea: string, mias: string[][]): boolean {
  const w = normal(linea)
  if (w.length === 0) return false
  return mias.some((m) => {
    if (m.length === 0) return false
    const set = new Set(m)
    const comunes = w.filter((x) => set.has(x)).length
    return comunes / Math.min(w.length, m.length) >= 0.6
  })
}

function NotasMejoradas({ md, cuerpo }: { md: string; cuerpo: string }) {
  const mias = useMemo(() => cuerpo.split('\n').map((l) => normal(l)).filter((w) => w.length > 0), [cuerpo])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {md.split('\n').map((l, i) => {
        const t = l.trim()
        if (!t) return <div key={i} style={{ height: 6 }} />
        if (t.startsWith('## ') || t.startsWith('# ')) {
          return <h3 key={i} style={{ margin: '14px 0 4px', fontSize: 15, fontWeight: 650, color: 'var(--mk-text-primary)' }}>{t.replace(/^#+\s*/, '')}</h3>
        }
        const esVineta = /^[-*•]\s+/.test(t)
        const texto = t.replace(/^[-*•]\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1')
        const mio = vieneDeMisNotas(texto, mias)
        return (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 14.5, lineHeight: 1.6, color: mio ? 'var(--mk-text-primary)' : 'var(--mk-text-tertiary)', paddingLeft: esVineta ? 4 : 0 }}>
            {esVineta && <span style={{ color: 'var(--mk-text-quaternary)' }}>•</span>}
            <span>{texto}</span>
          </div>
        )
      })}
    </div>
  )
}

export function NotaEditor({ nota, meNombre, equipo, marcas }: Props) {
  const router = useRouter()
  const [titulo, setTitulo] = useState(nota.titulo)
  const [cuerpo, setCuerpo] = useState(nota.cuerpo)
  const [chat, setChat] = useState<ChatMessage[]>(nota.chat)
  const [pregunta, setPregunta] = useState('')
  const [asking, setAsking] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [marcaId, setMarcaId] = useState(nota.marcaId ?? '')
  const [plantilla, setPlantilla] = useState<Plantilla>(nota.plantilla)
  const [resumen, setResumen] = useState(nota.resumen)
  const [acciones, setAcciones] = useState<AccionNota[]>(nota.acciones)
  const [elegidas, setElegidas] = useState<Record<string, boolean>>(() => Object.fromEntries(nota.acciones.filter((a) => !a.tareaId).map((a) => [a.id, true])))
  const [mejorando, setMejorando] = useState(false)
  const [creandoTareas, setCreandoTareas] = useState(false)
  const [vista, setVista] = useState<Vista>(nota.resumen ? 'mejoradas' : 'mias')
  const [finalizada, setFinalizada] = useState(nota.estado === 'finalizada')
  const ultimoModo = useRef<Modo>(nota.modalidad === 'presencial' ? 'presencial' : 'virtual')
  const guardarAccTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const g = useGrabadora(nota.id, nota.startedAt, nota.transcript)

  const fechaLabel = useMemo(() => {
    const base = nota.reunionInicio ?? nota.createdAt
    const f = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(base))
    const h = nota.reunionInicio ? ` · ${new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(base))}` : ''
    return f + h
  }, [nota.reunionInicio, nota.createdAt])

  const pendientes = acciones.filter((a) => !a.tareaId)
  const nElegidas = pendientes.filter((a) => elegidas[a.id]).length

  function cambiarAcciones(next: AccionNota[]) {
    setAcciones(next)
    if (guardarAccTimer.current) clearTimeout(guardarAccTimer.current)
    guardarAccTimer.current = setTimeout(() => { void guardarAcciones(nota.id, next) }, 800)
  }

  async function empezar(modo: Modo) {
    ultimoModo.current = modo
    setFinalizada(false)
    await g.iniciar(modo)
    void actualizarContextoNota(nota.id, { modalidad: modo })
  }

  async function mejorar(tpl: Plantilla = plantilla) {
    setMejorando(true)
    try {
      await actualizarNota(nota.id, { titulo, cuerpo, transcript: g.transcriptRef.current })
      const r = await mejorarNotas(nota.id, tpl)
      if (!r.ok) { toast.error(r.error); return }
      setResumen(r.nota.resumen)
      setAcciones(r.nota.acciones)
      setElegidas(Object.fromEntries(r.nota.acciones.filter((a) => !a.tareaId).map((a) => [a.id, true])))
      if (r.nota.titulo !== titulo) setTitulo(r.nota.titulo)
      setVista('mejoradas')
      toast.success('✨ Notas mejoradas')
    } finally {
      setMejorando(false)
    }
  }

  async function detener() {
    g.detener()
    setFinalizada(true)
    await actualizarNota(nota.id, { estado: 'finalizada', ended_at: new Date().toISOString(), transcript: g.transcriptRef.current, titulo, cuerpo })
    // Como Granola: al terminar, se mejoran las notas solas.
    if (cuerpo.trim() || g.transcriptRef.current.trim().length > 40) void mejorar()
  }

  async function crearTareas() {
    const ids = pendientes.filter((a) => elegidas[a.id]).map((a) => a.id)
    if (!ids.length) return
    setCreandoTareas(true)
    try {
      await guardarAcciones(nota.id, acciones)
      const r = await crearTareasDesdeNota(nota.id, ids)
      if (!r.ok) { toast.error(r.error); return }
      setAcciones(r.acciones)
      toast.success(`✅ ${r.creadas} tarea${r.creadas === 1 ? '' : 's'} creada${r.creadas === 1 ? '' : 's'} en Tareas`)
      router.refresh()
    } finally {
      setCreandoTareas(false)
    }
  }

  async function onAsk(e?: FormEvent) {
    e?.preventDefault()
    const q = pregunta.trim()
    if (!q || asking) return
    setAsking(true); setChatError(null)
    try {
      await actualizarNota(nota.id, { titulo, cuerpo, transcript: g.transcriptRef.current })
      const res = await chatearConNota(nota.id, q)
      if (!res.ok) setChatError(res.error)
      else { setChat(res.messages); setPregunta('') }
    } finally { setAsking(false) }
  }

  const grabando = g.estado === 'grabando'
  const pausado = g.estado === 'pausado'
  const sinEmpezar = g.estado === 'idle' && !g.transcript && !finalizada && !resumen
  const estadoLabel = grabando ? (g.modo === 'virtual' ? 'Grabando llamada' : 'Grabando') : pausado ? 'En pausa' : finalizada ? 'Finalizada' : 'Borrador'

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '20px 20px 150px', position: 'relative', minHeight: 'calc(100vh - 40px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <Link href="/notas-reuniones" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--mk-text-tertiary)', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={14} /> Volver
        </Link>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: grabando ? '#16a34a' : 'var(--mk-text-quaternary)', fontWeight: grabando ? 600 : 400 }}>
          {grabando && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.4s infinite' }} />}
          {estadoLabel}{g.procesando > 0 ? ' · transcribiendo…' : ''}
        </span>
      </div>

      <input value={titulo} onChange={(e) => { setTitulo(e.target.value); g.guardar({ titulo: e.target.value }) }} placeholder="Nueva nota"
        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--mk-text-primary)', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 14 }} />

      {/* Chips: fecha · autor · marca · Meet */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18, alignItems: 'center' }}>
        <Tag icon={<Calendar size={12} />}>{fechaLabel}</Tag>
        <Tag icon={<User size={12} />}>{nota.autorNombre || meNombre || 'Yo'}</Tag>
        <label style={{ ...tagStyle, paddingRight: 4 }}>
          <TagIcon size={12} />
          <select value={marcaId} onChange={(e) => { setMarcaId(e.target.value); void actualizarContextoNota(nota.id, { marcaId: e.target.value || null }) }}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--mk-text-secondary)', cursor: 'pointer' }}>
            <option value="">Sin marca</option>
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.emoji ? `${m.emoji} ` : ''}{m.nombre}</option>)}
          </select>
        </label>
        {nota.meetLink && (
          <a href={nota.meetLink} target="_blank" rel="noreferrer" style={{ ...tagStyle, textDecoration: 'none', color: '#059669', borderColor: '#a7f3d0' }}>
            <Video size={12} /> Abrir Meet
          </a>
        )}
      </div>

      {/* Inicio: ¿en persona o llamada? */}
      {sinEmpezar && (
        <div style={{ marginBottom: 18, padding: 16, borderRadius: 16, border: '1px solid var(--mk-border-default)', background: 'var(--mk-bg-elevated)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mk-text-primary)', marginBottom: 4 }}>¿Transcribimos esta reunión?</div>
          <div style={{ fontSize: 12.5, color: 'var(--mk-text-tertiary)', marginBottom: 12 }}>Escribe tus apuntes abajo mientras tanto. Al terminar, las notas se ordenan solas y salen las tareas.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void empezar('presencial')} style={btnGrande}>
              <Users size={16} /> En persona
            </button>
            <button type="button" onClick={() => void empezar('virtual')} style={btnGrande}>
              <MonitorSpeaker size={16} /> Llamada (Meet)
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--mk-text-quaternary)', marginTop: 10, lineHeight: 1.5 }}>
            <b>Llamada:</b> en Chrome de la compu, elige la pestaña de Meet y marca «Compartir audio de la pestaña». Usa audífonos para que tu voz no se duplique.
          </div>
        </div>
      )}

      {/* Pestañas: notas mejoradas / mis notas / transcripción */}
      {(resumen || g.transcript || finalizada) && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, padding: 3, borderRadius: 12, background: 'var(--mk-bg-hover)', width: 'fit-content' }}>
          {([
            ...(resumen ? [['mejoradas', 'Notas mejoradas', Sparkles] as const] : []),
            ['mias', 'Mis notas', FileText] as const,
            ['transcripcion', 'Transcripción', AudioLines] as const,
          ]).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setVista(id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 560,
                background: vista === id ? 'var(--mk-bg-elevated)' : 'transparent', color: vista === id ? 'var(--mk-text-primary)' : 'var(--mk-text-tertiary)',
                boxShadow: vista === id ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      )}

      {vista === 'mejoradas' && resumen ? (
        <NotasMejoradas md={resumen} cuerpo={cuerpo} />
      ) : vista === 'transcripcion' ? (
        <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--mk-text-secondary)', whiteSpace: 'pre-wrap' }}>
          {g.transcript ? g.transcript.split('\n').map((l, i) => {
            const m = l.match(/^\[(\d{2}:\d{2})\] (?:(Yo|Ellos): )?(.*)$/)
            if (!m) return <div key={i}>{l}</div>
            return (
              <div key={i} style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--mk-text-quaternary)', marginRight: 8 }}>{m[1]}</span>
                {m[2] && <b style={{ color: m[2] === 'Yo' ? ACENTO : '#0f766e', marginRight: 6 }}>{m[2]}</b>}
                {m[3]}
              </div>
            )
          }) : <span style={{ color: 'var(--mk-text-quaternary)' }}>Aún no hay transcripción.</span>}
          {g.parcial && <span style={{ color: 'var(--mk-text-quaternary)' }}> {g.parcial}</span>}
        </div>
      ) : (
        <>
          <textarea value={cuerpo} onChange={(e) => { setCuerpo(e.target.value); g.guardar({ cuerpo: e.target.value }) }}
            placeholder="Escribe tus apuntes: lo importante, nombres, acuerdos… La IA los completa con la transcripción al terminar."
            rows={8}
            style={{ width: '100%', border: 'none', outline: 'none', resize: 'vertical', background: 'transparent', color: 'var(--mk-text-primary)', fontSize: 15, lineHeight: 1.65, minHeight: 180, fontFamily: 'inherit' }} />
          {(grabando || pausado) && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-subtle)' }}>
              <div style={{ fontSize: 11, fontWeight: 650, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mk-text-quaternary)', marginBottom: 6 }}>En vivo</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--mk-text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto' }}>
                {g.transcript.split('\n').slice(-4).join('\n')}{g.parcial ? <span style={{ color: 'var(--mk-text-quaternary)' }}> {g.parcial}</span> : null}
                {!g.transcript && !g.parcial ? <span style={{ color: 'var(--mk-text-quaternary)' }}>Escuchando…</span> : null}
              </div>
            </div>
          )}
        </>
      )}
      {g.error && <p style={{ color: 'var(--mk-danger, #dc2626)', fontSize: 13, marginTop: 12 }}>{g.error}</p>}

      {/* Mejorar notas (con plantilla) */}
      {(finalizada || resumen) && !grabando && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          <select value={plantilla} onChange={(e) => { const p = e.target.value as Plantilla; setPlantilla(p); void actualizarContextoNota(nota.id, { plantilla: p }) }}
            style={{ height: 34, borderRadius: 10, border: '1px solid var(--mk-border-default)', background: 'var(--mk-bg-elevated)', padding: '0 10px', fontSize: 12.5, color: 'var(--mk-text-secondary)' }}
            title="Plantilla de las notas">
            {PLANTILLAS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <button type="button" onClick={() => void mejorar()} disabled={mejorando}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 10, border: 'none', cursor: mejorando ? 'wait' : 'pointer', color: '#fff', fontSize: 13, fontWeight: 600, background: `linear-gradient(135deg, ${ACENTO}, #ba41f7)` }}>
            {mejorando ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {resumen ? 'Volver a mejorar' : 'Mejorar notas'}
          </button>
        </div>
      )}

      {/* Tareas propuestas */}
      {acciones.length > 0 && (
        <section style={{ marginTop: 26, padding: 16, borderRadius: 16, border: '1px solid var(--mk-border-default)', background: 'var(--mk-bg-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 650, color: 'var(--mk-text-primary)' }}>
              <ListChecks size={16} color={ACENTO} /> Tareas de la reunión
            </div>
            {pendientes.length > 0 && (
              <button type="button" onClick={() => void crearTareas()} disabled={creandoTareas || nElegidas === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 10, border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: nElegidas ? 'pointer' : 'default', background: nElegidas ? 'linear-gradient(135deg,#10b981,#059669)' : '#cbd5e1' }}>
                {creandoTareas ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Crear {nElegidas} en Tareas
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {acciones.map((a) => {
              const creada = !!a.tareaId
              return (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 8, alignItems: 'start', opacity: creada ? 0.7 : 1 }}>
                  {creada ? <CheckCircle2 size={18} color="#10b981" style={{ marginTop: 6 }} /> : (
                    <input type="checkbox" checked={!!elegidas[a.id]} onChange={(e) => setElegidas((c) => ({ ...c, [a.id]: e.target.checked }))} style={{ marginTop: 9 }} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input value={a.texto} disabled={creada}
                      onChange={(e) => cambiarAcciones(acciones.map((x) => (x.id === a.id ? { ...x, texto: e.target.value } : x)))}
                      style={{ width: '100%', height: 34, borderRadius: 9, border: '1px solid var(--mk-border-subtle)', background: 'var(--mk-bg-base, #fff)', padding: '0 10px', fontSize: 13.5, color: 'var(--mk-text-primary)' }} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <select value={a.responsableId ?? ''} disabled={creada}
                        onChange={(e) => { const m = equipo.find((x) => x.id === e.target.value); cambiarAcciones(acciones.map((x) => (x.id === a.id ? { ...x, responsableId: m?.id ?? null, responsableNombre: m?.nombre ?? null } : x))) }}
                        style={miniCampo}>
                        <option value="">Responsable…</option>
                        {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                      <select value={a.marcaId ?? ''} disabled={creada} title="Marca a la que va la tarea"
                        onChange={(e) => cambiarAcciones(acciones.map((x) => (x.id === a.id ? { ...x, marcaId: e.target.value || null } : x)))}
                        style={miniCampo}>
                        <option value="">Sin marca (General)</option>
                        {marcas.map((m) => <option key={m.id} value={m.id}>{m.emoji ? `${m.emoji} ` : ''}{m.nombre}</option>)}
                      </select>
                      <input type="date" value={a.fecha ?? ''} disabled={creada}
                        onChange={(e) => cambiarAcciones(acciones.map((x) => (x.id === a.id ? { ...x, fecha: e.target.value || null } : x)))}
                        style={miniCampo} />
                      {creada && <Link href="/tareas" style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Creada en Tareas →</Link>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {chat.length > 0 && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {chat.map((m) => (
            <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '10px 14px', borderRadius: 14, background: m.role === 'user' ? 'var(--mk-accent-bg)' : 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-subtle)', fontSize: 13.5, lineHeight: 1.5, color: 'var(--mk-text-primary)', whiteSpace: 'pre-wrap' }}>{m.content}</div>
          ))}
        </div>
      )}
      {chatError && <p style={{ color: 'var(--mk-danger, #dc2626)', fontSize: 13, marginTop: 10 }}>{chatError}</p>}

      {/* Barra inferior: grabación + pregunta */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, padding: '0 16px 18px', pointerEvents: 'none' }}>
        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--mk-text-quaternary)', margin: '0 0 10px', pointerEvents: 'auto' }}>
          Obtén siempre el consentimiento al transcribir a otros · Distinto usa IA y puede equivocarse
        </p>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center', pointerEvents: 'auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 14, background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-default)', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
            {grabando ? (
              <>
                <button type="button" onClick={g.pausar} title="Pausar" style={ctrlBtn}><Pause size={14} /></button>
                <button type="button" onClick={() => void detener()} title="Terminar reunión" style={ctrlBtn}><Square size={13} fill="currentColor" /></button>
                <span style={{ width: 3, height: 18, borderRadius: 2, background: LIME }} />
              </>
            ) : pausado ? (
              <>
                <button type="button" onClick={() => void empezar(ultimoModo.current)} style={{ ...ctrlBtn, color: '#65a30d', fontWeight: 650, width: 'auto', padding: '0 10px', gap: 6 }}><Play size={13} fill="#65a30d" /> Reanudar</button>
                <button type="button" onClick={() => void detener()} title="Terminar reunión" style={ctrlBtn}><Square size={13} fill="currentColor" /></button>
              </>
            ) : (
              <button type="button" onClick={() => void empezar(ultimoModo.current)} style={{ ...ctrlBtn, color: '#65a30d', width: 'auto', padding: '0 12px', gap: 6, fontWeight: 650 }}>
                <Mic size={14} /> {finalizada ? 'Seguir' : 'Transcribir'}
              </button>
            )}
          </div>
          <form onSubmit={onAsk} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 10px 16px', borderRadius: 999, background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-default)', boxShadow: '0 8px 28px rgba(0,0,0,.10)' }}>
              <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} placeholder="Pregunta sobre esta reunión" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--mk-text-primary)', minWidth: 0 }} />
              <button type="submit" disabled={asking || !pregunta.trim()} style={{ border: 'none', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 600, background: 'var(--mk-accent-bg)', color: 'var(--mk-accent)', cursor: asking ? 'wait' : 'pointer', opacity: asking || !pregunta.trim() ? 0.5 : 1 }}>{asking ? '…' : 'Preguntar'}</button>
            </div>
          </form>
        </div>
      </div>
      <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}'}</style>
    </div>
  )
}

function Tag({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <span style={tagStyle}>{icon}{children}</span>
}

const tagStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, border: '1px solid var(--mk-border-default)', color: 'var(--mk-text-secondary)', fontSize: 12, fontWeight: 520, background: 'var(--mk-bg-elevated)' }
const ctrlBtn: CSSProperties = { width: 32, height: 32, borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--mk-text-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const btnGrande: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px', borderRadius: 12, border: '1px solid var(--mk-border-default)', background: 'var(--mk-bg-base, #fff)', color: 'var(--mk-text-primary)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }
const miniCampo: CSSProperties = { height: 30, borderRadius: 8, border: '1px solid var(--mk-border-subtle)', background: 'var(--mk-bg-base, #fff)', padding: '0 8px', fontSize: 12, color: 'var(--mk-text-secondary)' }
