'use client'

/* Dictado por voz (voz → texto) con DOS motores:

   1. Web Speech API nativa del navegador — gratis, instantánea, con texto en
      vivo. Funciona en Chrome (Mac/Android) y Safari de escritorio.
   2. FALLBACK: grabar con MediaRecorder y transcribir con Whisper
      (/api/copys/transcribir, la misma API key de OpenAI de Settings).
      Necesario porque en el iPhone DENTRO de la app instalada (PWA) iOS
      bloquea el servicio de dictado del navegador y devuelve error "network"
      aunque haya internet. Pedro 31-ago-2026: "porque me sale esto cuando
      prendo el micro si tengo internet".

   El cambio de motor es automático: si la Web Speech falla con network/
   service-not-allowed, pasamos a Whisper EN EL MOMENTO (sin que el usuario
   re-toque nada) y lo recordamos en localStorage para las próximas veces.

   Si el navegador rechaza el idioma 'es-PE' (error language-not-supported),
   reintenta solo con otras variantes de español antes de rendirse. */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react'

type Opciones = {
  /* Se llama con cada fragmento YA reconocido (final) para que lo agregues al texto. */
  onFinal: (fragmento: string) => void
  /* Se llama si algo falla (permiso denegado, no soportado, etc.). */
  onError?: (msg: string) => void
}

/* Cadena de idiomas a probar, del más específico al más genérico. Si el motor
   no acepta uno (language-not-supported), pasamos al siguiente sin molestar. */
const LANGS = ['es-PE', 'es-ES', 'es-419', 'es-US', 'es']

const LS_WHISPER = 'dictado-whisper' // '1' = este dispositivo dicta con Whisper

/* ¿Estamos en la app instalada (PWA) de un iPhone/iPad? Ahí la Web Speech
   casi siempre falla con "network" — mejor arrancar directo con Whisper. */
function esIosPwa(): boolean {
  try {
    const standalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia?.('(display-mode: standalone)')?.matches
    return !!standalone && /iPhone|iPad|iPod/i.test(navigator.userAgent)
  } catch { return false }
}

function hayMedia(): boolean {
  try { return !!navigator.mediaDevices?.getUserMedia && typeof (window as any).MediaRecorder !== 'undefined' } catch { return false }
}

export function useDictado({ onFinal, onError }: Opciones) {
  const [soportado, setSoportado] = useState(false)
  const [grabando, setGrabando] = useState(false)
  const [parcial, setParcial] = useState('') // lo que va escuchando en vivo (aún no final)

  const recRef = useRef<any>(null)
  const langIdxRef = useRef(0)       // índice del idioma que estamos probando
  const reintentarRef = useRef(false) // ¿onend debe re-arrancar con el siguiente idioma?
  const usarWhisperRef = useRef(false) // este dispositivo dicta grabando + Whisper
  const mediaRecRef = useRef<any>(null)
  const chunksRef = useRef<Blob[]>([])
  // Guardamos los callbacks en refs para no re-crear el reconocedor en cada render.
  const onFinalRef = useRef(onFinal); onFinalRef.current = onFinal
  const onErrorRef = useRef(onError); onErrorRef.current = onError

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const media = hayMedia()
    try { if (localStorage.getItem(LS_WHISPER) === '1' && media) usarWhisperRef.current = true } catch { /* noop */ }
    if ((!SR || esIosPwa()) && media) usarWhisperRef.current = true
    setSoportado(!!SR || media)
    return () => {
      try { recRef.current?.stop() } catch { /* noop */ }
      try { if (mediaRecRef.current?.state === 'recording') mediaRecRef.current.stop() } catch { /* noop */ }
    }
  }, [])

  const parar = useCallback(() => {
    reintentarRef.current = false
    try { recRef.current?.stop() } catch { /* noop */ }
    try { if (mediaRecRef.current?.state === 'recording') mediaRecRef.current.stop() } catch { /* noop */ }
  }, [])

  /* Traduce un código de error del navegador a un mensaje claro para el equipo.
     Dejamos el código entre paréntesis a propósito: así, si algo falla, la
     captura que me manden ya trae el motivo exacto para diagnosticarlo. */
  function explicar(code: string | undefined): string {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'No diste permiso al micrófono. Actívalo o usa el micrófono del teclado.'
      case 'no-speech':
        return 'No te escuché nada. Intenta de nuevo hablando más cerca.'
      case 'audio-capture':
        return 'No encuentro el micrófono. Revisa que esté conectado.'
      case 'network':
        return 'El dictado necesita internet y no pudo conectarse. Prueba en Chrome o usa el micrófono del teclado.'
      case 'language-not-supported':
        return 'Tu navegador no tiene el idioma para dictar. Usa el micrófono del teclado.'
      default:
        return `No pude dictar aquí (motivo: ${code || 'desconocido'}). Usa el micrófono del teclado.`
    }
  }

  /* ===== Motor 2: grabar + Whisper (para PWA en iPhone y navegadores sin SR) ===== */
  const arrancarWhisper = useCallback(async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      onErrorRef.current?.('No diste permiso al micrófono. Actívalo en los ajustes o usa el micrófono del teclado.')
      return
    }
    try {
      const MR = (window as any).MediaRecorder
      // iOS graba audio/mp4; Chrome/Android webm. Probamos en ese orden.
      const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MR?.isTypeSupported?.(t)) ?? ''
      const mr = new MR(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      mr.ondataavailable = (e: any) => { if (e.data?.size) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        try { stream.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
        setGrabando(false)
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/mp4' })
        chunksRef.current = []
        if (blob.size < 1200) { setParcial(''); return }  // toque accidental, sin audio real
        setParcial('✨ Transcribiendo…')
        try {
          const ext = /mp4/i.test(blob.type) ? 'mp4' : /webm/i.test(blob.type) ? 'webm' : 'm4a'
          const fd = new FormData()
          fd.append('audio', new File([blob], `dictado.${ext}`, { type: blob.type || 'audio/mp4' }))
          const res = await fetch('/api/copys/transcribir', { method: 'POST', body: fd })
          const json = await res.json().catch(() => null)
          if (json?.ok && json.text) onFinalRef.current(String(json.text).trim())
          else onErrorRef.current?.(json?.error || 'No pude transcribir el audio. Intenta de nuevo.')
        } catch {
          onErrorRef.current?.('No pude transcribir el audio (falló la conexión). Intenta de nuevo.')
        }
        setParcial('')
      }
      mediaRecRef.current = mr
      mr.start()
      setGrabando(true)
      setParcial('🎙 Grabando… toca el micro de nuevo cuando termines')
    } catch {
      try { stream.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
      onErrorRef.current?.('No pude iniciar la grabación aquí. Usa el micrófono del teclado.')
    }
  }, [])

  /* ===== Motor 1: Web Speech API ===== */
  const arrancar = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      if (hayMedia()) { usarWhisperRef.current = true; void arrancarWhisper(); return }
      onErrorRef.current?.('Tu navegador no permite dictar aquí. Usa el micrófono del teclado.')
      return
    }

    const rec = new SR()
    rec.lang = LANGS[langIdxRef.current] || 'es-ES'
    rec.continuous = true      // sigue escuchando aunque hagas pausas
    rec.interimResults = true  // muestra lo que va escuchando en vivo
    rec.maxAlternatives = 1

    rec.onresult = (e: any) => {
      let fin = ''
      let inter = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) fin += res[0].transcript
        else inter += res[0].transcript
      }
      if (fin) onFinalRef.current(fin)
      setParcial(inter)
    }
    rec.onerror = (e: any) => {
      const code = e?.error
      // Deja rastro en la consola con el navegador — ayuda a diagnosticar.
      try { console.warn('[dictado] error:', code, '· lang:', rec.lang, '· ua:', navigator.userAgent) } catch { /* noop */ }
      // Idioma rechazado → probamos el siguiente de la lista sin avisar.
      if (code === 'language-not-supported' && langIdxRef.current < LANGS.length - 1) {
        langIdxRef.current++
        reintentarRef.current = true // onend re-arranca con el nuevo idioma
        return
      }
      /* "network" / "service-not-allowed": el servicio de dictado del navegador
         no está disponible (típico en la PWA del iPhone AUNQUE haya internet).
         Cambiamos a Whisper al vuelo — el usuario sigue dictando sin hacer
         nada — y lo recordamos para este dispositivo. */
      if ((code === 'network' || code === 'service-not-allowed') && hayMedia()) {
        usarWhisperRef.current = true
        try { localStorage.setItem(LS_WHISPER, '1') } catch { /* noop */ }
        reintentarRef.current = false
        setGrabando(false); setParcial('')
        try { rec.stop() } catch { /* noop */ }
        void arrancarWhisper()
        return
      }
      setGrabando(false); setParcial('')
      if (code && code !== 'aborted') onErrorRef.current?.(explicar(code))
    }
    rec.onend = () => {
      if (reintentarRef.current) { reintentarRef.current = false; arrancar(); return }
      // Si Whisper tomó la posta, no pisar su estado de grabación.
      if (usarWhisperRef.current) return
      setGrabando(false); setParcial('')
    }

    recRef.current = rec
    try { rec.start(); setGrabando(true) }
    catch (err: any) {
      try { console.warn('[dictado] start throw:', err?.message, '· ua:', navigator.userAgent) } catch { /* noop */ }
      setGrabando(false)
      if (hayMedia()) { usarWhisperRef.current = true; void arrancarWhisper(); return }
      onErrorRef.current?.('No pude iniciar el dictado. Usa el micrófono del teclado.')
    }
  }, [arrancarWhisper])

  const alternar = useCallback(() => {
    if (grabando) { parar(); return }
    if (usarWhisperRef.current) { void arrancarWhisper(); return }
    langIdxRef.current = 0 // empezamos siempre por es-PE
    arrancar()
  }, [grabando, parar, arrancar, arrancarWhisper])

  return { soportado, grabando, parcial, alternar, parar }
}
