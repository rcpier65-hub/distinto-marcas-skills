'use client'

// Botón "Activar notificaciones" — cada usuario lo activa una vez en su
// dispositivo. Registra el service worker, pide permiso y guarda la suscripción
// push. Al confirmar una publicación, el servidor manda un push a Pedro/Lorena.
// En iPhone: la app debe estar instalada en la pantalla de inicio (Apple).

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Bell, BellRing, BellOff } from 'lucide-react'
import { guardarSubscripcionPush, probarPush } from '@/lib/push/actions'

type Estado = 'checking' | 'unsupported' | 'ios-instalar' | 'inactivo' | 'activo' | 'denegado'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function ActivarNotificaciones({ className }: { className?: string }) {
  const [estado, setEstado] = useState<Estado>('checking')
  const [busy, setBusy] = useState(false)
  const [probando, setProbando] = useState(false)

  async function probar() {
    setProbando(true)
    try {
      const r = await probarPush()
      if (!r.ok) toast.error(r.error)
      else toast.success('Enviado — deberías ver la notificación del sistema')
    } finally { setProbando(false) }
  }

  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        // iOS Safari sin PWA instalada no expone PushManager en pestaña normal.
        const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const standalone = (window.navigator as any).standalone === true || window.matchMedia?.('(display-mode: standalone)')?.matches
        setEstado(esIOS && !standalone ? 'ios-instalar' : 'unsupported')
        return
      }
      if (Notification.permission === 'denied') { setEstado('denegado'); return }
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = reg ? await reg.pushManager.getSubscription() : null
        setEstado(sub ? 'activo' : 'inactivo')
      } catch { setEstado('inactivo') }
    })()
  }, [])

  async function activar() {
    setBusy(true)
    const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    try {
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapid) { toast.error('Falta configurar las notificaciones (VAPID). Avísale a Pedro.'); return }
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toast.error(esIOS
          ? 'En iPhone: agrega la app a la pantalla de inicio y ábrela desde ese ícono.'
          : 'Tu navegador no soporta notificaciones push. Usa Chrome, Edge o Safari actualizado.')
        return
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setEstado(perm === 'denied' ? 'denegado' : 'inactivo')
        toast.error(perm === 'denied'
          ? 'Bloqueaste las notificaciones. Actívalas en los ajustes del navegador para este sitio.'
          : 'No diste permiso de notificaciones.')
        return
      }
      // Reusar la suscripción existente si ya hay una (evita InvalidStateError
      // en PC cuando ya se había suscrito antes).
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource })
      }
      const j = sub.toJSON()
      const r = await guardarSubscripcionPush(
        { endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '' },
        navigator.userAgent,
      )
      if (!r.ok) { toast.error(r.error ?? 'No se pudo guardar'); return }
      setEstado('activo')
      toast.success('🔔 Notificaciones activadas en este dispositivo')
      // Notificación real del sistema al instante (prueba viva de que funciona).
      try { await reg.showNotification('🔔 Notificaciones activadas', { body: 'Así te avisaremos cuando se publique algo.', icon: '/icons/icon-192.png', badge: '/favicon-32.png' }) } catch { /* noop */ }
    } catch (e) {
      console.error('[push] activar falló:', e)
      const nombre = (e as Error)?.name || ''
      if (esIOS) {
        toast.error('En iPhone: agrega la app a la pantalla de inicio y ábrela desde ese ícono, luego activa.')
      } else if (nombre === 'NotAllowedError') {
        toast.error('Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador para este sitio.')
      } else {
        toast.error(`No se pudo activar${nombre ? ` (${nombre})` : ''}. Prueba con Chrome, Edge o Safari actualizado.`)
      }
    } finally {
      setBusy(false)
    }
  }

  if (estado === 'checking' || estado === 'unsupported') return null

  if (estado === 'activo') {
    return (
      <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
        <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-semibold" style={{ background: 'rgba(20,184,166,0.14)', color: '#0f766e' }}>
          <BellRing className="w-4 h-4" /> Notificaciones activadas
        </span>
        <button onClick={probar} disabled={probando} className="text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-60" title="Enviar una notificación de prueba a este dispositivo">
          {probando ? 'Probando…' : 'Probar'}
        </button>
      </span>
    )
  }

  if (estado === 'ios-instalar') {
    return (
      <span className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-medium border ${className ?? ''}`} title="En iPhone: Compartir → Agregar a inicio, luego abre la app desde el ícono y activa las notificaciones.">
        <Bell className="w-4 h-4 text-muted-foreground" /> iPhone: agrega la app a inicio
      </span>
    )
  }

  if (estado === 'denegado') {
    return (
      <span className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-medium border ${className ?? ''}`} title="Están bloqueadas. Actívalas desde los ajustes del navegador para este sitio.">
        <BellOff className="w-4 h-4 text-muted-foreground" /> Notificaciones bloqueadas
      </span>
    )
  }

  return (
    <button onClick={activar} disabled={busy}
      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-semibold text-white disabled:opacity-60 ${className ?? ''}`}
      style={{ background: 'linear-gradient(135deg, #7170ff, #ba41f7)' }}
      title="Recibe un aviso en este dispositivo cuando se confirme una publicación">
      <Bell className="w-4 h-4" /> {busy ? 'Activando…' : 'Activar notificaciones'}
    </button>
  )
}
