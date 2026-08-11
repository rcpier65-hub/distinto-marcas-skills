'use client'

/* Dictado por voz (voz → texto) usando la Web Speech API nativa del navegador.
   Gratis, sin API key: el mismo motor del dictado del navegador. Funciona en
   Chrome (Mac/Android) y Safari de escritorio. En el iPhone dentro de la app
   instalada (PWA) a veces no arranca → devolvemos el error para guiar al
   usuario al micrófono del teclado. Pedro 11-ago-2026.

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

export function useDictado({ onFinal, onError }: Opciones) {
  const [soportado, setSoportado] = useState(false)
  const [grabando, setGrabando] = useState(false)
  const [parcial, setParcial] = useState('') // lo que va escuchando en vivo (aún no final)

  const recRef = useRef<any>(null)
  const langIdxRef = useRef(0)       // índice del idioma que estamos probando
  const reintentarRef = useRef(false) // ¿onend debe re-arrancar con el siguiente idioma?
  // Guardamos los callbacks en refs para no re-crear el reconocedor en cada render.
  const onFinalRef = useRef(onFinal); onFinalRef.current = onFinal
  const onErrorRef = useRef(onError); onErrorRef.current = onError

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSoportado(!!SR)
    return () => { try { recRef.current?.stop() } catch { /* noop */ } }
  }, [])

  const parar = useCallback(() => {
    reintentarRef.current = false
    try { recRef.current?.stop() } catch { /* noop */ }
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

  const arrancar = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { onErrorRef.current?.('Tu navegador no permite dictar aquí. Usa el micrófono del teclado.'); return }

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
      setGrabando(false); setParcial('')
      if (code && code !== 'aborted') onErrorRef.current?.(explicar(code))
    }
    rec.onend = () => {
      if (reintentarRef.current) { reintentarRef.current = false; arrancar(); return }
      setGrabando(false); setParcial('')
    }

    recRef.current = rec
    try { rec.start(); setGrabando(true) }
    catch (err: any) {
      try { console.warn('[dictado] start throw:', err?.message, '· ua:', navigator.userAgent) } catch { /* noop */ }
      setGrabando(false)
      onErrorRef.current?.('No pude iniciar el dictado. Usa el micrófono del teclado.')
    }
  }, [])

  const alternar = useCallback(() => {
    if (grabando) { parar(); return }
    langIdxRef.current = 0 // empezamos siempre por es-PE
    arrancar()
  }, [grabando, parar, arrancar])

  return { soportado, grabando, parcial, alternar, parar }
}
