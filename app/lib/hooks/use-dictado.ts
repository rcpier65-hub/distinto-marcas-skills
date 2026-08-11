'use client'

/* Dictado por voz (voz → texto) usando la Web Speech API nativa del navegador.
   Gratis, sin API key: el mismo motor del dictado del navegador. Funciona en
   Chrome (Mac/Android) y Safari de escritorio. En el iPhone dentro de la app
   instalada (PWA) a veces no arranca → devolvemos el error para guiar al
   usuario al micrófono del teclado. Pedro 11-ago-2026. */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react'

type Opciones = {
  /* Se llama con cada fragmento YA reconocido (final) para que lo agregues al texto. */
  onFinal: (fragmento: string) => void
  /* Se llama si algo falla (permiso denegado, no soportado, etc.). */
  onError?: (msg: string) => void
  /* Idioma del reconocimiento. Español de Perú por defecto. */
  lang?: string
}

export function useDictado({ onFinal, onError, lang = 'es-PE' }: Opciones) {
  const [soportado, setSoportado] = useState(false)
  const [grabando, setGrabando] = useState(false)
  const [parcial, setParcial] = useState('') // lo que va escuchando en vivo (aún no final)

  const recRef = useRef<any>(null)
  // Guardamos los callbacks en refs para no re-crear el reconocedor en cada render.
  const onFinalRef = useRef(onFinal); onFinalRef.current = onFinal
  const onErrorRef = useRef(onError); onErrorRef.current = onError

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSoportado(!!SR)
    return () => { try { recRef.current?.stop() } catch { /* noop */ } }
  }, [])

  const parar = useCallback(() => {
    try { recRef.current?.stop() } catch { /* noop */ }
  }, [])

  const alternar = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { onErrorRef.current?.('Tu navegador no permite dictar aquí. Usa el micrófono del teclado.'); return }
    if (grabando) { parar(); return }

    const rec = new SR()
    rec.lang = lang
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
      setGrabando(false); setParcial('')
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        onErrorRef.current?.('No diste permiso al micrófono. Actívalo o usa el micrófono del teclado.')
      } else if (code === 'no-speech') {
        onErrorRef.current?.('No te escuché nada. Intenta de nuevo.')
      } else if (code === 'audio-capture') {
        onErrorRef.current?.('No encuentro el micrófono. Revisa que esté conectado.')
      } else if (code && code !== 'aborted') {
        onErrorRef.current?.('No pude dictar en este dispositivo. Usa el micrófono del teclado.')
      }
    }
    rec.onend = () => { setGrabando(false); setParcial('') }

    recRef.current = rec
    try { rec.start(); setGrabando(true) }
    catch { setGrabando(false); onErrorRef.current?.('No pude iniciar el dictado. Usa el micrófono del teclado.') }
  }, [grabando, parar, lang])

  return { soportado, grabando, parcial, alternar, parar }
}
