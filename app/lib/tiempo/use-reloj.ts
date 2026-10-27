'use client'

import { useEffect, useState } from 'react'
import { sincronizarReloj } from './reloj'

/** No dibujar segundos de sesión con una hora local todavía sin comprobar. */
export function useReloj(corriendo: boolean) {
  const [reloj, setReloj] = useState<{ ahora: number; desfase: number } | null>(null)
  useEffect(() => {
    let activo = true
    void sincronizarReloj().then(desfase => {
      if (activo) setReloj({ ahora: Date.now(), desfase })
    })
    const timer = corriendo ? setInterval(() => {
      setReloj(prev => prev ? { ...prev, ahora: Date.now() } : prev)
    }, 1000) : undefined
    return () => { activo = false; clearInterval(timer) }
  }, [corriendo])
  return reloj
}
