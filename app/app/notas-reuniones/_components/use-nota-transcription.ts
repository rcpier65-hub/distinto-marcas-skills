'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { actualizarNota } from '../_actions'
import type { NotaEstado } from '@/lib/notas-reuniones/types'

type SpeechRec = {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((ev: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((ev: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void; stop: () => void; abort: () => void
}

function getSR(): (new () => SpeechRec) | null {
  if (typeof window === 'undefined') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export type TxState = 'idle' | 'listening' | 'paused'

export function useNotaTranscription(notaId: string, startedAt: string | null, initialTranscript: string) {
  const [transcript, setTranscript] = useState(initialTranscript)
  const [tx, setTx] = useState<TxState>('idle')
  const [interim, setInterim] = useState('')
  const [txError, setTxError] = useState<string | null>(null)
  const [estado, setEstado] = useState<NotaEstado>('borrador')
  const recRef = useRef<SpeechRec | null>(null)
  const wantListenRef = useRef(false)
  const transcriptRef = useRef(transcript)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { transcriptRef.current = transcript }, [transcript])

  const persist = useCallback(async (patch: Parameters<typeof actualizarNota>[1]) => {
    const res = await actualizarNota(notaId, patch)
    if (res.ok && patch.estado) setEstado(res.nota.estado)
    return res
  }, [notaId])

  const scheduleSave = useCallback((patch: Parameters<typeof actualizarNota>[1]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { void persist(patch) }, 700)
  }, [persist])

  const stopRecognition = useCallback((pause: boolean) => {
    wantListenRef.current = false
    try { recRef.current?.stop() } catch { /* noop */ }
    recRef.current = null
    setInterim('')
    setTx(pause ? 'paused' : 'idle')
  }, [])

  const startRecognition = useCallback(() => {
    const Ctor = getSR()
    if (!Ctor) { setTxError('Tu navegador no soporta Web Speech API. Prueba Chrome o Edge.'); return }
    setTxError(null)
    wantListenRef.current = true
    const rec = new Ctor()
    rec.lang = 'es-PE'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (ev) => {
      let finalChunk = ''
      let interimChunk = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        const t = r[0]?.transcript ?? ''
        if (r.isFinal) finalChunk += t
        else interimChunk += t
      }
      if (finalChunk) {
        setTranscript((prev) => {
          const next = (prev ? `${prev.trim()} ` : '') + finalChunk.trim()
          transcriptRef.current = next
          scheduleSave({ transcript: next, estado: 'en_curso' })
          return next
        })
      }
      setInterim(interimChunk)
    }
    rec.onerror = (ev) => {
      const err = ev.error ?? 'error'
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setTxError('Permiso de micrófono denegado.'); wantListenRef.current = false; setTx('idle')
      } else if (err !== 'aborted' && err !== 'no-speech') setTxError(`Error de transcripción: ${err}`)
    }
    rec.onend = () => { if (wantListenRef.current) { try { rec.start() } catch { /* noop */ } } }
    recRef.current = rec
    try {
      rec.start(); setTx('listening')
      void persist({ estado: 'en_curso', started_at: startedAt ?? new Date().toISOString() })
    } catch {
      setTxError('No se pudo iniciar el micrófono.'); wantListenRef.current = false; setTx('idle')
    }
  }, [persist, scheduleSave, startedAt])

  useEffect(() => () => {
    wantListenRef.current = false
    try { recRef.current?.abort() } catch { /* noop */ }
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  return { transcript, setTranscript, transcriptRef, tx, interim, txError, estado, setEstado, persist, scheduleSave, startRecognition, stopRecognition }
}
