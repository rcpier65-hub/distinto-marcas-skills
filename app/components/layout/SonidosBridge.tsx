'use client'

/* SonidosBridge — montado una vez en AppShell.
   1. Despierta el audio con la primera interacción (regla de los navegadores).
   2. Escucha al service worker: cuando llega un push con la app ABIERTA, el
      sistema muestra la notificación pero no siempre suena → sonamos acá.
      Los push del chat los suena ChatFlotante (llegan también por Realtime),
      así que acá solo sonamos los demás avisos. */

import { useEffect } from 'react'
import { despertarAudio, sonarAviso } from '@/lib/sonido/sonidos'

export function SonidosBridge() {
  useEffect(() => {
    const despertar = () => despertarAudio()
    window.addEventListener('pointerdown', despertar)
    window.addEventListener('keydown', despertar)

    const onMensajeSW = (e: MessageEvent) => {
      const d = e.data as { type?: string; tag?: string } | null
      if (d?.type !== 'push-recibido') return
      if (typeof d.tag === 'string' && d.tag.startsWith('chat-')) return
      sonarAviso()
    }
    navigator.serviceWorker?.addEventListener('message', onMensajeSW)

    return () => {
      window.removeEventListener('pointerdown', despertar)
      window.removeEventListener('keydown', despertar)
      navigator.serviceWorker?.removeEventListener('message', onMensajeSW)
    }
  }, [])
  return null
}
