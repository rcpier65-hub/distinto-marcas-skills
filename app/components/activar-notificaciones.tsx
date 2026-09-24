'use client'

// Botón "Activar notificaciones" — cada usuario lo activa una vez en su
// dispositivo. Registra el service worker, pide permiso y guarda la suscripción
// push. Al confirmar una publicación, el servidor manda un push a Pedro/Lorena.
// En iPhone: la app debe estar instalada en la pantalla de inicio (Apple).

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Bell, BellRing } from 'lucide-react'
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
      // PEDIR EL PERMISO PRIMERO. Safari (macOS/iOS) exige que
      // Notification.requestPermission() se llame dentro del gesto del clic,
      // ANTES de cualquier await (register/ready). Antes lo llamábamos después
      // de registrar el SW → en el dock de Mac (Safari) NO activaba y quedaba
      // sin suscripción. Pedro 14-jul-2026.
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setEstado(perm === 'denied' ? 'denegado' : 'inactivo')
        toast.error(perm === 'denied'
          ? 'Bloqueaste las notificaciones. Actívalas en los ajustes del navegador (o del sistema) para este sitio.'
          : 'No diste permiso de notificaciones.')
        return
      }
      await navigator.serviceWorker.register('/sw.js')
      // Usamos la registración ACTIVA (más confiable para push que la que
      // devuelve register(), que puede estar todavía instalándose).
      let reg = await navigator.serviceWorker.ready
      // Reusar la suscripción existente si ya hay una (evita InvalidStateError
      // en PC cuando ya se había suscrito antes).
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        const opts: PushSubscriptionOptionsInit = { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid.trim()) as BufferSource }
        /* AbortError en Safari/macOS (app del Dock): el servicio de push de
           Apple rechaza el intento. Suele destrabarse reintentando con espera
           y, si no, reiniciando el service worker desde cero (queda un
           registro "trabado" de un intento anterior). Pedro 24-sep-2026. */
        for (let intento = 1; ; intento++) {
          try {
            sub = await reg.pushManager.subscribe(opts)
            break
          } catch (err) {
            if ((err as Error)?.name !== 'AbortError' || intento >= 3) throw err
            await new Promise((r) => setTimeout(r, 1500 * intento))
            if (intento === 2) {
              for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister()
              await navigator.serviceWorker.register('/sw.js')
              reg = await navigator.serviceWorker.ready
            }
          }
        }
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
      } else if (nombre === 'AbortError') {
        /* El permiso SÍ quedó concedido: mientras la app esté abierta (aunque
           minimizada) los avisos del chat igual salen y suenan. Solo falta el
           aviso con la app cerrada. */
        toast.error('Safari no pudo conectarse al servicio de avisos de Apple. Mientras la app esté abierta (aunque esté minimizada) igual te llegan los avisos del chat con sonido. Para recibirlos con la app cerrada: Ajustes del Sistema → Notificaciones → "Distinto" activado, y vuelve a intentar; si sigue, instala la app con Chrome.', { duration: 12000 })
      } else {
        toast.error(`No se pudo activar${nombre ? ` (${nombre})` : ''}. Prueba con Chrome, Edge o Safari actualizado.`)
      }
    } finally {
      setBusy(false)
    }
  }

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

  /* En CUALQUIER otro estado (checking / inactivo / no-soportado / iPhone /
     denegado) mostramos SIEMPRE el botón — nunca null. Al tocarlo, activar()
     resuelve el caso (activa, o da el mensaje: iPhone instalar, o bloqueadas). */
  const etiqueta = busy ? 'Activando…' : estado === 'denegado' ? 'Reintentar notificaciones' : 'Activar notificaciones'
  return (
    <button onClick={activar} disabled={busy}
      className={`inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-semibold text-white disabled:opacity-60 ${className ?? ''}`}
      style={{ background: 'linear-gradient(135deg, #7170ff, #ba41f7)', boxShadow: '0 6px 18px -6px rgba(113,112,255,0.7)' }}
      title="Recibe un aviso en este dispositivo cuando se publique">
      <Bell className="w-4 h-4" /> {etiqueta}
    </button>
  )
}
