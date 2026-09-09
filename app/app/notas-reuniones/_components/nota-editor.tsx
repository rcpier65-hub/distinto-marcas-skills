'use client'

import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, FilePlus2, Mic, Pause, Play, Square } from 'lucide-react'
import type { ChatMessage, NotaReunion } from '@/lib/notas-reuniones/types'
import { chatearConNota } from '../_actions'
import { useNotaTranscription } from './use-nota-transcription'

type Props = { nota: NotaReunion; meNombre: string }
const LIME = '#a3e635'

export function NotaEditor({ nota, meNombre }: Props) {
  const [titulo, setTitulo] = useState(nota.titulo)
  const [cuerpo, setCuerpo] = useState(nota.cuerpo)
  const [chat, setChat] = useState<ChatMessage[]>(nota.chat)
  const [saving, setSaving] = useState(false)
  const [pregunta, setPregunta] = useState('')
  const [asking, setAsking] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const {
    transcript, transcriptRef, tx, interim, txError, estado,
    persist, scheduleSave, startRecognition, stopRecognition,
  } = useNotaTranscription(nota.id, nota.startedAt, nota.transcript)

  const fechaLabel = useMemo(() => {
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(nota.createdAt))
    if (ymd === hoy) return 'Hoy'
    return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'short' }).format(new Date(nota.createdAt))
  }, [nota.createdAt])

  async function onAsk(e?: FormEvent) {
    e?.preventDefault()
    const q = pregunta.trim()
    if (!q || asking) return
    setAsking(true); setChatError(null)
    try {
      setSaving(true)
      await persist({ titulo, cuerpo, transcript: transcriptRef.current })
      setSaving(false)
      const res = await chatearConNota(nota.id, q)
      if (!res.ok) setChatError(res.error)
      else { setChat(res.messages); setPregunta('') }
    } finally { setAsking(false); setSaving(false) }
  }

  const paused = tx === 'paused'

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '20px 20px 140px', position: 'relative', minHeight: 'calc(100vh - 40px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <Link href="/notas-reuniones" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--mk-text-tertiary)', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={14} /> Volver
        </Link>
        <span style={{ fontSize: 12, color: 'var(--mk-text-quaternary)' }}>{saving ? 'Guardando…' : estado === 'en_curso' ? 'En curso' : estado === 'finalizada' ? 'Finalizada' : 'Borrador'}</span>
      </div>

      <input value={titulo} onChange={(e) => { setTitulo(e.target.value); scheduleSave({ titulo: e.target.value }) }} placeholder="Nueva nota"
        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--mk-text-primary)', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 14 }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        <Tag icon={<Calendar size={12} />}>{fechaLabel}</Tag>
        <Tag icon={<User size={12} />}>{meNombre || 'Yo'}</Tag>
        <Tag icon={<FilePlus2 size={12} />}>Nota</Tag>
      </div>

      <textarea value={cuerpo} onChange={(e) => { setCuerpo(e.target.value); scheduleSave({ cuerpo: e.target.value }) }}
        placeholder="Escribe notas, o usa el micrófono para transcribir…" rows={8}
        style={{ width: '100%', border: 'none', outline: 'none', resize: 'vertical', background: 'transparent', color: 'var(--mk-text-primary)', fontSize: 15, lineHeight: 1.65, minHeight: 160, fontFamily: 'inherit' }} />

      {(transcript || interim || tx !== 'idle') && (
        <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-subtle)' }}>
          <div style={{ fontSize: 11, fontWeight: 650, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mk-text-quaternary)', marginBottom: 8 }}>Transcripción</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--mk-text-secondary)', whiteSpace: 'pre-wrap' }}>
            {transcript}{interim ? <span style={{ color: 'var(--mk-text-quaternary)' }}> {interim}</span> : null}
            {!transcript && !interim ? <span style={{ color: 'var(--mk-text-quaternary)' }}>Escuchando…</span> : null}
          </div>
        </div>
      )}
      {txError && <p style={{ color: 'var(--mk-danger)', fontSize: 13, marginTop: 12 }}>{txError}</p>}

      {chat.length > 0 && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {chat.map((m) => (
            <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '10px 14px', borderRadius: 14, background: m.role === 'user' ? 'var(--mk-accent-bg)' : 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-subtle)', fontSize: 13.5, lineHeight: 1.5, color: 'var(--mk-text-primary)', whiteSpace: 'pre-wrap' }}>{m.content}</div>
          ))}
        </div>
      )}
      {chatError && <p style={{ color: 'var(--mk-danger)', fontSize: 13, marginTop: 10 }}>{chatError}</p>}

      {paused && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(10,10,14,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: 'min(520px, 100%)', background: '#1c1c1f', borderRadius: 28, padding: '28px 22px 18px', color: '#e8e8ea', boxShadow: '0 24px 80px rgba(0,0,0,.45)' }}>
            <div style={{ textAlign: 'center', fontSize: 18, color: 'rgba(255,255,255,0.55)', margin: '40px 0 56px' }}>Transcripción en pausa</div>
            <div style={{ margin: '0 auto 22px', maxWidth: 420, padding: '10px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
              Obtén siempre el consentimiento al transcribir a otros. Leer más ›
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
              <button type="button" onClick={startRecognition} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: LIME, fontWeight: 650, fontSize: 14 }}>
                <Play size={14} fill={LIME} color={LIME} /> Reanudar
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '16px 0 0' }}>Distinto usa IA y puede equivocarse.</p>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, padding: '0 16px 18px', pointerEvents: 'none' }}>
        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--mk-text-quaternary)', margin: '0 0 10px', pointerEvents: 'auto' }}>
          Obtén siempre el consentimiento al transcribir a otros ›
        </p>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center', pointerEvents: 'auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 14, background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-default)', boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
            {tx === 'listening' ? (
              <>
                <button type="button" onClick={() => stopRecognition(true)} title="Pausar" style={ctrlBtn}><Pause size={14} /></button>
                <button type="button" onClick={() => { stopRecognition(false); void persist({ estado: 'finalizada', ended_at: new Date().toISOString(), transcript: transcriptRef.current, titulo, cuerpo }) }} title="Detener" style={ctrlBtn}><Square size={13} fill="currentColor" /></button>
                <span style={{ width: 3, height: 18, borderRadius: 2, background: LIME }} />
              </>
            ) : tx === 'paused' ? (
              <button type="button" onClick={startRecognition} style={{ ...ctrlBtn, color: LIME, fontWeight: 650, width: 'auto', padding: '0 10px', gap: 6 }}><Play size={13} fill={LIME} color={LIME} /> Reanudar</button>
            ) : (
              <button type="button" onClick={startRecognition} style={{ ...ctrlBtn, color: LIME, width: 'auto', padding: '0 12px', gap: 6, fontWeight: 650 }}><Mic size={14} /> Transcribir</button>
            )}
          </div>
          <form onSubmit={onAsk} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 10px 16px', borderRadius: 999, background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-default)', boxShadow: '0 8px 28px rgba(0,0,0,.10)' }}>
              <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} placeholder="Pregunta lo que sea" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--mk-text-primary)', minWidth: 0 }} />
              <button type="submit" disabled={asking || !pregunta.trim()} style={{ border: 'none', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 600, background: 'var(--mk-accent-bg)', color: 'var(--mk-accent)', cursor: asking ? 'wait' : 'pointer', opacity: asking || !pregunta.trim() ? 0.5 : 1 }}>{asking ? '…' : 'Preguntar'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function Tag({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, border: '1px solid var(--mk-border-default)', color: 'var(--mk-text-secondary)', fontSize: 12, fontWeight: 520, background: 'var(--mk-bg-elevated)' }}>{icon}{children}</span>
}

const ctrlBtn: CSSProperties = { width: 32, height: 32, borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--mk-text-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
