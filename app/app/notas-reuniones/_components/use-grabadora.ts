'use client'

/* Grabadora de reuniones estilo Granola — Pedro 24-sep-2026: "que sirva
   para reuniones en Meet y en persona".

   Dos modos:
   - PRESENCIAL: escucha el micrófono. Transcribe gratis con el
     reconocimiento de voz del navegador (Chrome/Safari de escritorio). Si el
     navegador no lo tiene (iPhone con la app instalada, Firefox), graba el
     micrófono en trozos de 20 s y los transcribe con Whisper.
   - LLAMADA (Meet/Zoom en la compu): además del micrófono ("Yo"), captura el
     AUDIO DE LA PESTAÑA de la llamada ("Ellos") — el navegador pide elegir la
     pestaña de Meet y marcar "Compartir audio de la pestaña" (solo Chrome/Edge
     de escritorio). Ese audio se transcribe con Whisper en trozos de 20 s.
     Los trozos en silencio no se envían (ahorra y evita frases inventadas).

   La transcripción se guarda sola (cada 0.7 s) como líneas "[hh:mm] Yo: …" /
   "[hh:mm] Ellos: …" (en presencial, sin etiqueta). No se guarda audio. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { actualizarNota, latidoTranscripcion } from '../_actions'

export type Modo = 'presencial' | 'virtual'
export type Estado = 'idle' | 'grabando' | 'pausado'
type Hablante = 'Yo' | 'Ellos' | null

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
function tipoAudio(): string {
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}
function horaAhora(): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
}
/* Frases que Whisper "inventa" sobre silencio o ruido. */
const ALUCINACION = /^(gracias( por ver( el video)?)?|subt[ií]tulos.*|suscr[ií]bete.*|m[uú]sica|\.+|¡?gracias!?)\.?$/i

const TROZO_MS = 20_000

export function useGrabadora(notaId: string, startedAt: string | null, inicial: string) {
  const [transcript, setTranscript] = useState(inicial)
  const [estado, setEstado] = useState<Estado>('idle')
  const [modo, setModo] = useState<Modo | null>(null)
  const [parcial, setParcial] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(0)   // trozos enviándose a Whisper

  const transcriptRef = useRef(inicial)
  const guardarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const quiereEscuchar = useRef(false)
  const recRef = useRef<SpeechRec | null>(null)
  const streamsRef = useRef<MediaStream[]>([])
  const grabadoresRef = useRef<{ parar: () => void }[]>([])

  const guardar = useCallback((patch: Parameters<typeof actualizarNota>[1]) => {
    if (guardarTimer.current) clearTimeout(guardarTimer.current)
    guardarTimer.current = setTimeout(() => { void actualizarNota(notaId, patch) }, 700)
  }, [notaId])

  /* Agrega texto: si el último renglón es del mismo hablante y de hace poco,
     lo continúa; si no, abre un renglón nuevo "[hh:mm] Hablante: …". */
  const agregar = useCallback((quien: Hablante, texto: string) => {
    const t = texto.trim()
    if (!t) return
    const lineas = transcriptRef.current ? transcriptRef.current.split('\n') : []
    const ultima = lineas[lineas.length - 1] ?? ''
    const m = ultima.match(/^\[(\d{2}):(\d{2})\] (?:(Yo|Ellos): )?/)
    const mismo = m && (m[3] ?? null) === quien
    const reciente = m && (() => {
      const [h, mi] = horaAhora().split(':').map(Number)
      return h * 60 + mi - (Number(m[1]) * 60 + Number(m[2])) <= 1
    })()
    if (mismo && reciente) lineas[lineas.length - 1] = `${ultima} ${t}`
    else lineas.push(`[${horaAhora()}] ${quien ? `${quien}: ` : ''}${t}`)
    const next = lineas.join('\n')
    transcriptRef.current = next
    setTranscript(next)
    guardar({ transcript: next, estado: 'en_curso' })
  }, [guardar])

  /* ---- Reconocimiento de voz del navegador (micrófono) ---- */
  const iniciarVozNavegador = useCallback((quien: Hablante): boolean => {
    const Ctor = getSR()
    if (!Ctor) return false
    const rec = new Ctor()
    rec.lang = 'es-PE'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (ev) => {
      let final = ''
      let inter = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) final += r[0]?.transcript ?? ''
        else inter += r[0]?.transcript ?? ''
      }
      if (final) agregar(quien, final)
      setParcial(inter)
    }
    rec.onerror = (ev) => {
      const e = ev.error ?? 'error'
      if (e === 'not-allowed' || e === 'service-not-allowed') { setError('Permiso de micrófono denegado.'); quiereEscuchar.current = false }
      else if (e === 'network') setError('El reconocimiento de voz del navegador no está disponible aquí.')
    }
    rec.onend = () => { if (quiereEscuchar.current) { try { rec.start() } catch { /* ya iniciado */ } } }
    try { rec.start() } catch { return false }
    recRef.current = rec
    return true
  }, [agregar])

  /* ---- Grabación en trozos + Whisper (audio de la pestaña o micrófono) ---- */
  const grabarConWhisper = useCallback((stream: MediaStream, quien: Hablante) => {
    const mime = tipoAudio()
    let activo = true
    let timer: ReturnType<typeof setTimeout> | null = null
    // Medidor de volumen para no mandar trozos en silencio.
    let pico = 0
    let medidor: ReturnType<typeof setInterval> | null = null
    let ctx: AudioContext | null = null
    try {
      ctx = new AudioContext()
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      ctx.createMediaStreamSource(stream).connect(an)
      const buf = new Float32Array(an.fftSize)
      medidor = setInterval(() => {
        an.getFloatTimeDomainData(buf)
        let s = 0
        for (const v of buf) s += v * v
        pico = Math.max(pico, Math.sqrt(s / buf.length))
      }, 250)
    } catch { pico = 1 }

    const ciclo = () => {
      if (!activo) return
      const partes: Blob[] = []
      let rec: MediaRecorder
      try { rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream) } catch { setError('Este navegador no puede grabar audio.'); return }
      pico = 0
      rec.ondataavailable = (e) => { if (e.data.size) partes.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(partes, { type: rec.mimeType || mime || 'audio/webm' })
        const conVoz = pico > 0.012
        if (blob.size > 3000 && conVoz) {
          setProcesando((n) => n + 1)
          const fd = new FormData()
          fd.append('audio', blob, (rec.mimeType || '').includes('mp4') ? 'trozo.m4a' : 'trozo.webm')
          fetch('/api/copys/transcribir', { method: 'POST', body: fd })
            .then((r) => r.json())
            .then((j: { ok?: boolean; text?: string; error?: string }) => {
              if (j.ok && j.text && !ALUCINACION.test(j.text.trim())) agregar(quien, j.text)
              else if (j.error && /API key/i.test(j.error)) setError(j.error)
            })
            .catch(() => { /* un trozo perdido no corta la grabación */ })
            .finally(() => setProcesando((n) => Math.max(0, n - 1)))
        }
        if (activo) ciclo()
      }
      rec.start()
      timer = setTimeout(() => { try { rec.stop() } catch { /* ya parado */ } }, TROZO_MS)
      grabadorActual = rec
    }
    let grabadorActual: MediaRecorder | null = null
    ciclo()

    grabadoresRef.current.push({
      parar: () => {
        activo = false
        if (timer) clearTimeout(timer)
        try { if (grabadorActual?.state === 'recording') grabadorActual.stop() } catch { /* noop */ }
        if (medidor) clearInterval(medidor)
        void ctx?.close().catch(() => {})
      },
    })
  }, [agregar])

  const liberar = useCallback(() => {
    quiereEscuchar.current = false
    try { recRef.current?.stop() } catch { /* noop */ }
    recRef.current = null
    grabadoresRef.current.forEach((g) => g.parar())
    grabadoresRef.current = []
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()))
    streamsRef.current = []
    setParcial('')
  }, [])

  const iniciar = useCallback(async (m: Modo) => {
    setError(null)
    liberar()
    quiereEscuchar.current = true
    const hablanteMic: Hablante = m === 'virtual' ? 'Yo' : null

    if (m === 'virtual') {
      // 1) Audio de la pestaña de la llamada ("Ellos").
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setError('Para grabar una llamada usa Chrome o Edge en la computadora. En el celular usa el modo "En persona".')
        quiereEscuchar.current = false
        return
      }
      let pantalla: MediaStream
      try {
        pantalla = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      } catch {
        setError('No se compartió la pestaña de la llamada.')
        quiereEscuchar.current = false
        return
      }
      const pistasAudio = pantalla.getAudioTracks()
      if (pistasAudio.length === 0) {
        pantalla.getTracks().forEach((t) => t.stop())
        setError('Falta el audio: al elegir la pestaña de Meet marca "Compartir audio de la pestaña".')
        quiereEscuchar.current = false
        return
      }
      streamsRef.current.push(pantalla)
      // Si el usuario deja de compartir desde el navegador, pausamos.
      pistasAudio[0].addEventListener('ended', () => { if (quiereEscuchar.current) { liberar(); setEstado('pausado') } })
      grabarConWhisper(new MediaStream(pistasAudio), 'Ellos')
    }

    // 2) Micrófono ("Yo" en llamada; todos en presencial).
    const conNavegador = iniciarVozNavegador(hablanteMic)
    if (!conNavegador) {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        streamsRef.current.push(mic)
        grabarConWhisper(mic, hablanteMic)
      } catch {
        setError('No se pudo usar el micrófono. Revisa el permiso.')
        if (m !== 'virtual') { quiereEscuchar.current = false; return }
      }
    }

    setModo(m)
    setEstado('grabando')
    void actualizarNota(notaId, { estado: 'en_curso', started_at: startedAt ?? new Date().toISOString() })
  }, [grabarConWhisper, iniciarVozNavegador, liberar, notaId, startedAt])

  const pausar = useCallback(() => { liberar(); setEstado('pausado') }, [liberar])
  const detener = useCallback(() => { liberar(); setEstado('idle') }, [liberar])

  /* Latido "transcribiendo en vivo" (el equipo ve el iconito animado). */
  useEffect(() => {
    if (estado !== 'grabando') return
    void latidoTranscripcion(notaId, true)
    const t = setInterval(() => { void latidoTranscripcion(notaId, true) }, 20_000)
    return () => { clearInterval(t); void latidoTranscripcion(notaId, false) }
  }, [estado, notaId])

  useEffect(() => () => {
    liberar()
    if (guardarTimer.current) clearTimeout(guardarTimer.current)
  }, [liberar])

  return { transcript, transcriptRef, estado, modo, parcial, error, procesando, iniciar, pausar, detener, guardar }
}
