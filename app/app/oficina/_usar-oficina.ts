'use client'

// app/app/oficina/_usar-oficina.ts
//
// Motor multijugador de la oficina virtual:
//   · POSICIONES por Supabase Realtime broadcast (12 Hz) + interpolación
//   · ROSTER (nombre, avatar, estado) por Realtime presence
//   · AUDIO/VIDEO por cercanía con WebRTC, decidido por _audio-grafo.ts
//   · SPOTLIGHT (hablarle a toda la oficina), CONVERSACIÓN PRIVADA y
//     COMPARTIR PANTALLA. (El chat propio se quitó: se usa el chat oficial.)
//   · Vive en OficinaProvider (toda la app): cambiar de módulo NO corta la
//     oficina. El canal solo se abre cuando uno ENTRA (antes se veía a la
//     gente "en línea" apenas abría la página).
//
// Entrar no captura dispositivos. Un transceiver permite escuchar antes de activar el micro.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { MediaSession } from './_media-session'
import { AudioSenderGate } from './_audio-sender'
import { InvitacionesOficina, conversacionesVacias, type SenalConversacion } from './_invitaciones'
import { sonarAviso } from '@/lib/sonido/sonidos'
import type { AvatarConfig, Direccion, EstadoUsuario } from './_avatar'
import {
  decidir, debeConectar, paneo,
  type EstadoAudio, type Decision,
} from './_audio-grafo'
import { MezcladorOficina } from './_audio-mixer'

/* Servidores para atravesar routers. Los STUN gratuitos de Google resuelven
   la mayoría de los casos, pero en redes móviles y algunas oficinas hace
   falta un TURN (que retransmite). Se configura con variables de entorno:
   NEXT_PUBLIC_TURN_URL / NEXT_PUBLIC_TURN_USER / NEXT_PUBLIC_TURN_PASS.
   Sin TURN la oficina funciona igual, pero un porcentaje no conecta. */
function armarIce(): RTCConfiguration {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ]
  const url = process.env.NEXT_PUBLIC_TURN_URL
  if (url) {
    servers.push({
      urls: url.split(',').map((u) => u.trim()).filter(Boolean),
      username: process.env.NEXT_PUBLIC_TURN_USER,
      credential: process.env.NEXT_PUBLIC_TURN_PASS,
    })
  }
  return { iceServers: servers }
}
const ICE: RTCConfiguration = armarIce()

/** ¿Hay TURN configurado? La UI avisa si no, para no diagnosticar a ciegas. */
export const HAY_TURN = !!process.env.NEXT_PUBLIC_TURN_URL

const ENVIO_MS = 80        // 12.5 Hz de posición
const KEEPALIVE_MS = 2000
const PROX_MS = 250        // recálculo de vecinos 4 Hz
const TTL_MS = 120000       // tolera la limitación de temporizadores en pestañas de fondo
const SPOT_MAX_MS = 90000  // el spotlight se corta solo a los 90s

export type Jugador = {
  id: string
  nombre: string
  avatar: AvatarConfig
  estado: EstadoUsuario
  emote: string | null
  emoteHasta: number
  x: number; y: number
  tx: number; ty: number
  dir: Direccion
  mov: boolean
  sentado: boolean
  ghost: boolean
  quiet: boolean
  spot: boolean
  privada: string | null
  pantalla: boolean
  zona: string | null
  paso: number
  visto: number
  /* Resultado del grafo de audio, para que la UI no lo recalcule. */
  gain: number
  videoAlpha: number
  fijado: boolean
  conexion: 'desconectado' | 'conectando' | 'conectado' | 'error'
  gainSalida: number
  mic: boolean
  motivo: Decision['motivo']
  nivel: number       // 0..1 — qué tan fuerte está hablando ahora
}

export type Remoto = {
  id: string
  nombre: string
  stream: MediaStream
  tipo: 'camara' | 'pantalla'
}

type Senal =
  | { tipo: 'oferta'; de: string; para: string; sdp: RTCSessionDescriptionInit }
  | { tipo: 'respuesta'; de: string; para: string; sdp: RTCSessionDescriptionInit }
  | { tipo: 'ice'; de: string; para: string; candidato: RTCIceCandidateInit }
  | { tipo: 'conversacion'; de: string; para: string; mensaje: SenalConversacion }
  | { tipo: 'toque'; de: string; deNombre: string; para: string }


type Pos = {
  id: string; x: number; y: number; dir: Direccion
  mov: boolean; ghost: boolean; quiet: boolean; spot: boolean
  privada: string | null; pantalla: boolean; zona: string | null
  sentado?: boolean
  mic?: boolean
}

/* Estado por peer: la conexión más lo necesario para negociar sin pisarnos. */
type Peer = {
  pc: RTCPeerConnection
  mediaSenders: Map<'audio' | 'video', RTCRtpSender>
  audioGate: AudioSenderGate
  educado: boolean       // el "educado" cede si los dos ofrecen a la vez
  ofreciendo: boolean
  ignorarOferta: boolean
}

export function useOficinaRealtime(yoId: string, nombre: string, avatar: AvatarConfig) {
  const router = useRouter()
  const media = useRef<MediaSession | null>(null)
  const [remotos, setRemotos] = useState<Remoto[]>([])
  const [listaUI, setListaUI] = useState<Jugador[]>([])
  const [micOn, setMicOn] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [compartiendo, setCompartiendo] = useState(false)
  const [estado, setEstado] = useState<EstadoUsuario>('disponible')
  const [quiet, setQuiet] = useState(false)
  const [spot, setSpot] = useState(false)
  const [conversaciones, setConversaciones] = useState(conversacionesVacias)
  const privada = conversaciones.activa?.id ?? null
  const llamada = conversaciones.entrante
  const llamadaSaliente = conversaciones.saliente
  const [local, setLocal] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conectado, setConectado] = useState(false)
  const [entrado, setEntrado] = useState(false)
  /* Quién acaba de entrar (para el avisito "X llegó a la oficina"). */
  const [entro, setEntro] = useState<string | null>(null)

  const jugadores = useRef<Map<string, Jugador>>(new Map())
  const yo = useRef<EstadoAudio & { dir: Direccion; mov: boolean; pantalla: boolean; sentado: boolean }>({
    id: yoId, x: 0, y: 0, zona: null, privada: null, spot: false,
    ghost: false, quiet: false, estado: 'disponible', dir: 's', mov: false, pantalla: false, sentado: false,
  })
  const canalRef = useRef<RealtimeChannel | null>(null)
  const peers = useRef<Map<string, Peer>>(new Map())
  const fallosPeer = useRef(new Map<string, number>())
  const localRef = useRef<MediaStream | null>(null)
  const pantallaRef = useRef<MediaStream | null>(null)
  const camaraTrackRef = useRef<MediaStreamTrack | null>(null)
  const mezcla = useRef<MezcladorOficina | null>(null)
  const decisiones = useRef<Map<string, Decision>>(new Map())
  /* El id llega después (el proveedor carga los datos al montar). */
  useEffect(() => { yo.current.id = yoId }, [yoId])
  const avatarRef = useRef(avatar)
  useEffect(() => { avatarRef.current = avatar }, [avatar])
  const nombreRef = useRef(nombre)
  useEffect(() => { nombreRef.current = nombre }, [nombre])
  const estadoRef = useRef(estado)
  useEffect(() => { estadoRef.current = estado }, [estado])
  const ultimoEnvio = useRef(0)
  const emoteRef = useRef<{ emoji: string; hasta: number } | null>(null)
  const spotTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const entradoRef = useRef(false)

  const enviar = useCallback((s: Senal) => {
    canalRef.current?.send({ type: 'broadcast', event: 'senal', payload: s })
  }, [])

  const invitaciones = useMemo(() => new InvitacionesOficina(
    () => yoId,
    mensaje => enviar({ tipo: 'conversacion', de: yoId, para: mensaje.tipo === 'invitar' ? mensaje.invitacion.para : mensaje.para, mensaje }),
    setConversaciones,
  ), [yoId, enviar])
  const estadoDe = useCallback((id: string): EstadoAudio | null => {
    const j = jugadores.current.get(id)
    // Usar posición recibida, no la interpolación visual, al decidir privacidad.
    return j ? { ...j, x: j.tx, y: j.ty } : null
  }, [])
  const puedeEnviar = useCallback((id: string) => {
    const otro = estadoDe(id)
    return !!otro && decidir(otro, yo.current, true).gain > 0
  }, [estadoDe])

  /* ============ WebRTC ============ */
  const cerrarPeer = useCallback((otroId: string) => {
    const p = peers.current.get(otroId)
    if (!p) return
    p.audioGate.dispose()
    try { p.pc.close() } catch { /* noop */ }
    peers.current.delete(otroId)
    decisiones.current.delete(otroId)
    mezcla.current?.quitar(otroId)
    setRemotos((prev) => prev.filter((r) => r.id !== otroId))
  }, [])

  const crearPeer = useCallback((otroId: string) => {
    const existente = peers.current.get(otroId)
    if (existente) return existente
    const pc = new RTCPeerConnection(ICE)
    /* "Educado" = el de id mayor. Si los dos ofrecen a la vez, el educado se
       hace a un lado y acepta la oferta del otro en vez de chocar. */
    const audioSender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender
    const audioGate = new AudioSenderGate(audioSender, () => { fallosPeer.current.set(otroId, Date.now()); cerrarPeer(otroId) })
    const peer: Peer = { pc, audioGate, mediaSenders: new Map([['audio', audioSender]]), educado: yoId > otroId, ofreciendo: false, ignorarOferta: false }
    peers.current.set(otroId, peer)

    localRef.current?.getVideoTracks().forEach((t) => {
      try { peer.mediaSenders.set(t.kind as 'audio' | 'video', pc.addTrack(t, localRef.current!)) } catch { /* noop */ }
    })
    if (localRef.current) audioSender.setStreams(localRef.current)
    audioGate.set(localRef.current?.getAudioTracks()[0] ?? null, puedeEnviar(otroId))
    if (pantallaRef.current) {
      pantallaRef.current.getTracks().forEach((t) => {
        try { pc.addTrack(t, pantallaRef.current!) } catch { /* noop */ }
      })
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) enviar({ tipo: 'ice', de: yoId, para: otroId, candidato: e.candidate.toJSON() })
    }
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track])
      if (e.track.kind === 'audio') { mezcla.current?.agregar(otroId, stream); return }
      const nom = jugadores.current.get(otroId)?.nombre ?? 'Alguien'
      /* El segundo stream que llega de la misma persona es la pantalla. */
      setRemotos((prev) => {
        const yaTiene = prev.filter((r) => r.id === otroId)
        const esPantalla = yaTiene.length > 0 && !yaTiene.some((r) => r.stream.id === stream.id && r.tipo === 'pantalla')
          && stream.getVideoTracks().length > 0 && yaTiene.some((r) => r.tipo === 'camara')
        const tipo: Remoto['tipo'] = esPantalla ? 'pantalla' : 'camara'
        const otros = prev.filter((r) => !(r.id === otroId && r.tipo === tipo))
        return [...otros, { id: otroId, nombre: nom, stream, tipo }]
      })
      if (stream.getAudioTracks().length > 0) mezcla.current?.agregar(otroId, stream)
    }
    pc.onconnectionstatechange = () => {
      /* Antes solo se sacaba de la lista visual: el peer muerto quedaba en el
         mapa y la guarda de crearPeer devolvía siempre ese cadáver, así que
         esa persona no volvía a conectar en toda la sesión. */
      if (pc.connectionState === 'connected') fallosPeer.current.delete(otroId)
      if (['failed', 'closed'].includes(pc.connectionState)) {
        if (pc.connectionState === 'failed') fallosPeer.current.set(otroId, Date.now())
        cerrarPeer(otroId)
      }
    }
    pc.onnegotiationneeded = async () => {
      try {
        peer.ofreciendo = true
        await pc.setLocalDescription()
        if (pc.localDescription) {
          enviar({ tipo: 'oferta', de: yoId, para: otroId, sdp: pc.localDescription })
        }
      } catch { /* el próximo ciclo de cercanía reintenta */ } finally {
        peer.ofreciendo = false
      }
    }
    return peer
  }, [enviar, yoId, cerrarPeer, puedeEnviar])

  /* ============ Micrófono / cámara / pantalla ============ */
  const actualizarTrack = useCallback((kind: 'audio' | 'video', track: MediaStreamTrack | null) => {
    const stream = localRef.current ?? new MediaStream()
    stream.getTracks().filter(t => t.kind === kind).forEach(t => stream.removeTrack(t))
    if (track) stream.addTrack(track)
    localRef.current = stream
    setLocal(new MediaStream(stream.getTracks()))
    if (kind === 'audio') setMicOn(!!track && track.readyState === 'live')
    else { camaraTrackRef.current = track; setCamOn(!!track && track.readyState === 'live') }
    for (const [id, peer] of peers.current) {
      const { pc } = peer
      const sender = peer.mediaSenders.get(kind)
      if (kind === 'audio') {
        sender?.setStreams(stream); peer.audioGate.set(track, puedeEnviar(id)); continue
      }
      if (sender) {
        sender.setStreams(stream)
        void sender.replaceTrack(track).catch(() => setError('No se pudo actualizar el dispositivo. Apágalo y vuelve a activarlo.'))
      } else if (track) peer.mediaSenders.set(kind, pc.addTrack(track, stream))
    }
  }, [puedeEnviar])

  const entrar = useCallback(async () => {
    if (entradoRef.current || !yoId) return
    entradoRef.current = true
    mezcla.current ??= new MezcladorOficina()
    void mezcla.current.iniciar().catch(() => {})
    media.current ??= new MediaSession(c => navigator.mediaDevices.getUserMedia(c), actualizarTrack)
    setEntrado(true)
  }, [yoId, actualizarTrack])

  const salir = useCallback(() => {
    entradoRef.current = false
    invitaciones.reset()
    if (spotTimer.current) clearTimeout(spotTimer.current)
    setSpot(false); yo.current.spot = false
    media.current?.close()
    pantallaRef.current?.getTracks().forEach(t => t.stop())
    setCompartiendo(false)
    setEntrado(false)
    setLocal(null)
    setRemotos([])
    setListaUI([])
    jugadores.current.clear()
  }, [invitaciones])

  const reanudarAudio = useCallback(() => { void mezcla.current?.iniciar().catch(() => {}) }, [])
  const alternarDispositivo = useCallback(async (kind: 'audio' | 'video') => {
    if (!entradoRef.current) return
    try { await media.current?.toggle(kind); setError(null) }
    catch { setError(`No pudimos usar ${kind === 'audio' ? 'el micrófono' : 'la cámara'}. Revisa los permisos del navegador.`) }
  }, [])
  const alternarMic = useCallback(() => alternarDispositivo('audio'), [alternarDispositivo])
  const alternarCam = useCallback(() => alternarDispositivo('video'), [alternarDispositivo])

  const soportaPantalla = typeof navigator !== 'undefined'
    && typeof navigator.mediaDevices?.getDisplayMedia === 'function'

  const alternarPantalla = useCallback(async () => {
    if (compartiendo) {
      pantallaRef.current?.getTracks().forEach((t) => t.stop())
      pantallaRef.current = null
      setCompartiendo(false)
      yo.current.pantalla = false
      return
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      if (!entradoRef.current) { s.getTracks().forEach(t => t.stop()); return }
      pantallaRef.current = s
      setCompartiendo(true)
      yo.current.pantalla = true
      /* Se publica como pista ADICIONAL (no reemplaza la cámara) para que se
         vea la pantalla y la cara a la vez, como en Gather. */
      for (const peer of peers.current.values()) {
        s.getTracks().forEach((t) => { try { peer.pc.addTrack(t, s) } catch { /* noop */ } })
      }
      s.getVideoTracks()[0]?.addEventListener('ended', () => {
        pantallaRef.current = null
        setCompartiendo(false)
        yo.current.pantalla = false
      })
    } catch {
      setError('No se pudo compartir la pantalla.')
    }
  }, [compartiendo])

  /* ============ Spotlight ============ */
  const alternarSpot = useCallback(() => {
    setSpot((s) => {
      const nuevo = !s
      if (spotTimer.current) { clearTimeout(spotTimer.current); spotTimer.current = null }
      /* Corte automático: si alguien lo deja prendido, deja de ocupar la
         oficina entera a los 90 segundos. */
      if (nuevo) spotTimer.current = setTimeout(() => setSpot(false), SPOT_MAX_MS)
      return nuevo
    })
  }, [])

  /* ============ Canal Realtime (solo estando ADENTRO) ============ */
  useEffect(() => {
    if (!entrado) return
    let supabase: ReturnType<typeof createClient>
    try { supabase = createClient() } catch { return }

    const canal = supabase.channel('oficina', {
      config: { presence: { key: yoId }, broadcast: { self: false } },
    })
    canalRef.current = canal

    canal.on('presence', { event: 'sync' }, () => {
      const st = canal.presenceState<{ nombre: string; avatar: AvatarConfig; estado: EstadoUsuario }>()
      for (const [id, metas] of Object.entries(st)) {
        const m = metas[metas.length - 1]
        if (!m || id === yoId) continue
        const j = jugadores.current.get(id)
        if (j) { j.nombre = m.nombre; j.avatar = m.avatar; j.estado = m.estado; j.visto = Date.now() }
        else {
          /* Recién llegado: avisamos (solo si yo ya estaba adentro). */
          if (entradoRef.current) setEntro(m.nombre)
          jugadores.current.set(id, {
            id, nombre: m.nombre, avatar: m.avatar, estado: m.estado,
            emote: null, emoteHasta: 0,
            x: 0, y: 0, tx: 0, ty: 0, dir: 's', mov: false, sentado: false,
            ghost: false, quiet: false, spot: false, privada: null, pantalla: false,
            zona: null, paso: 0, visto: Date.now(),
            gain: 0, gainSalida: 0, videoAlpha: 0, fijado: false, nivel: 0, mic: false, motivo: 'lejos', conexion: 'desconectado',
          })
        }
      }
      /* Presence NO destruye peers: durante una reconexión llega un sync
         parcial y cerraría todas las conexiones del equipo. La limpieza va
         por TTL en el bucle de cercanía. */
    })

    canal.on('broadcast', { event: 'pos' }, ({ payload }) => {
      const p = payload as Pos
      if (!p?.id || p.id === yoId) return
      const j = jugadores.current.get(p.id)
      if (!j) return
      j.tx = p.x; j.ty = p.y; j.dir = p.dir; j.mov = p.mov; j.sentado = !!p.sentado
      j.ghost = p.ghost; j.quiet = p.quiet; j.spot = p.spot
      j.privada = p.privada; j.pantalla = p.pantalla; j.zona = p.zona
      j.mic = !!p.mic
      j.visto = Date.now()
      if (j.x === 0 && j.y === 0) { j.x = p.x; j.y = p.y }
    })

    canal.on('broadcast', { event: 'emote' }, ({ payload }) => {
      const { id, emoji } = payload as { id: string; emoji: string }
      const j = jugadores.current.get(id)
      if (!j) return
      j.emote = emoji || null
      j.emoteHasta = emoji === '✋' ? Number.MAX_SAFE_INTEGER : Date.now() + 3000
    })

    canal.on('broadcast', { event: 'senal' }, async ({ payload }) => {
      const s = payload as Senal
      if (s.para !== yoId) return
      if (s.tipo === 'conversacion') {
        if (!jugadores.current.has(s.de)) return
        const m = s.mensaje
        if (!m || (m.tipo === 'invitar' ? m.invitacion?.de : m.de) !== s.de) return
        if (yo.current.estado === 'nomolestar' && m.tipo === 'invitar') {
          enviar({ tipo: 'conversacion', de: yoId, para: s.de, mensaje: { tipo: 'rechazar', id: m.invitacion.id, de: yoId, para: s.de } }); return
        }
        if (invitaciones.recibir(m)) {
          sonarAviso()
          if (!window.location.pathname.startsWith('/oficina')) toast(`${jugadores.current.get(s.de)?.nombre ?? 'Alguien'} quiere hablar contigo`, {
            duration: 15000, action: { label: 'Ir a la oficina', onClick: () => router.push('/oficina') },
          })
        }
        return
      }
      /* Aviso (toquecito): suena y sale un aviso aunque esté en otro módulo. */
      if (s.tipo === 'toque') {
        sonarAviso()
        const quien = s.deNombre.split(' ')[0]
        toast(`🔔 ${quien} te está avisando`, {
          description: 'Te busca en la oficina.',
          duration: 12000,
          action: window.location.pathname.startsWith('/oficina') ? undefined : { label: 'Ir a la oficina', onClick: () => { router.push('/oficina') } },
        })
        try {
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            const reg = await navigator.serviceWorker?.getRegistration()
            const op = { body: 'Te busca en la oficina.', icon: '/icons/icon-192.png', tag: `toque-${s.de}`, data: { url: '/oficina' } } as NotificationOptions
            if (reg) await reg.showNotification(`🔔 ${quien} te está avisando`, op)
            else new Notification(`🔔 ${quien} te está avisando`, op)
          }
        } catch { /* sin notificación: queda el sonido y el aviso */ }
        return
      }
      try {
        if (s.tipo === 'oferta' || s.tipo === 'respuesta') {
          const otro = estadoDe(s.de)
          if (!otro || !debeConectar(yo.current, otro, peers.current.has(s.de))) return
          const peer = crearPeer(s.de)
          const desc = new RTCSessionDescription(s.sdp)
          /* Negociación educada: si llega una oferta mientras yo también
             estaba ofreciendo, el educado revierte la suya y acepta. */
          const choque = desc.type === 'offer'
            && (peer.ofreciendo || peer.pc.signalingState !== 'stable')
          peer.ignorarOferta = !peer.educado && choque
          if (peer.ignorarOferta) return
          if (choque) await peer.pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit)
          await peer.pc.setRemoteDescription(desc)
          if (desc.type === 'offer') {
            await peer.pc.setLocalDescription()
            if (peer.pc.localDescription) {
              enviar({ tipo: 'respuesta', de: yoId, para: s.de, sdp: peer.pc.localDescription })
            }
          }
        } else if (s.tipo === 'ice') {
          const peer = peers.current.get(s.de)
          if (peer) {
            try { await peer.pc.addIceCandidate(new RTCIceCandidate(s.candidato)) }
            catch { if (!peer.ignorarOferta) throw new Error('ice') }
          }
        }
      } catch { /* una señal suelta no debe tumbar la oficina */ }
    })

    canal.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConectado(true)
        await canal.track({ nombre: nombreRef.current, avatar: avatarRef.current, estado: estadoRef.current })
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConectado(false)
      }
    })

    const peersSnapshot = peers.current
    return () => {
      invitaciones.reset()
      peersSnapshot.forEach((p) => { p.audioGate.dispose(); try { p.pc.close() } catch { /* noop */ } })
      peersSnapshot.clear()
      media.current?.close()
      localRef.current?.getTracks().forEach((t) => t.stop())
      localRef.current = null
      pantallaRef.current?.getTracks().forEach((t) => t.stop())
      pantallaRef.current = null
      mezcla.current?.destruir()
      mezcla.current = null
      supabase.removeChannel(canal)
      canalRef.current = null
      setConectado(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yoId, entrado])

  useEffect(() => {
    canalRef.current?.track({ nombre, avatar, estado })
  }, [nombre, avatar, estado])

  /* Reflejar en el ref lo que la UI cambia (lo lee el grafo de audio). */
  useEffect(() => { yo.current.estado = estado }, [estado])
  useEffect(() => { yo.current.quiet = quiet }, [quiet])
  useEffect(() => { yo.current.spot = spot }, [spot])
  useEffect(() => { yo.current.privada = privada }, [privada])

  /* ============ Bucle de cercanía (4 Hz) ============ */
  useEffect(() => {
    const t = setInterval(() => {
      const ahora = Date.now()
      invitaciones.tick(ahora)
      const mio = yo.current

      for (const j of Array.from(jugadores.current.values())) {
        // TTL: si dejó de mandar posición, se fue (cerró la pestaña).
        if (ahora - j.visto > TTL_MS) {
          if (invitaciones.state.activa?.peer === j.id) invitaciones.terminar()
          jugadores.current.delete(j.id)
          cerrarPeer(j.id)
          continue
        }
        const suyo: EstadoAudio = {
          id: j.id, x: j.tx, y: j.ty, zona: j.zona, privada: j.privada,
          spot: j.spot, ghost: j.ghost, quiet: j.quiet, estado: j.estado,
        }
        const yaEstaba = peers.current.has(j.id)
        const dec = decidir(mio, suyo, yaEstaba)
        decisiones.current.set(j.id, dec)
        const salida = decidir(suyo, mio, yaEstaba)
        j.motivo = dec.motivo
        j.gainSalida = salida.gain
        j.gain = dec.gain
        j.videoAlpha = dec.videoAlpha
        j.fijado = dec.fijado
        /* Nivel de voz real: el aro verde sale solo si de verdad está
           hablando, no por estar conectado. */
        j.nivel = dec.gain > 0 ? (mezcla.current?.nivel(j.id) ?? 0) : 0

        if (debeConectar(mio, suyo, yaEstaba)) {
          if (!yaEstaba && ahora - (fallosPeer.current.get(j.id) ?? 0) > 10000) crearPeer(j.id)
          peers.current.get(j.id)?.audioGate.set(localRef.current?.getAudioTracks()[0] ?? null, salida.gain > 0)
          mezcla.current?.ajustar(j.id, dec.gain, paneo(mio, suyo))
        } else if (yaEstaba) {
          cerrarPeer(j.id)
        }
        const pc = peers.current.get(j.id)?.pc
        j.conexion = pc?.connectionState === 'connected' ? 'conectado' : pc ? 'conectando' : fallosPeer.current.has(j.id) && (dec.gain > 0 || salida.gain > 0) ? 'error' : 'desconectado'
      }

      setListaUI(Array.from(jugadores.current.values()).map((j) => ({ ...j })))
    }, PROX_MS)
    return () => clearInterval(t)
  }, [crearPeer, cerrarPeer, invitaciones])

  /* ============ API para el render loop ============ */
  const publicarPos = useCallback((x: number, y: number, dir: Direccion, mov: boolean, ghost: boolean, zona: string | null, sentado = false) => {
    const antes = yo.current
    const cambio = mov || antes.mov !== mov || antes.ghost !== ghost
      || antes.zona !== zona || antes.dir !== dir || antes.sentado !== sentado
    yo.current = { ...antes, x, y, dir, mov, ghost, zona, sentado }
    const ahora = performance.now()
    if (ahora - ultimoEnvio.current < (cambio ? ENVIO_MS : KEEPALIVE_MS)) return
    ultimoEnvio.current = ahora
    canalRef.current?.send({
      type: 'broadcast', event: 'pos',
      payload: {
        id: yoId, x, y, dir, mov, ghost, zona, sentado,
        mic: !!localRef.current?.getAudioTracks().some(t => t.readyState === 'live'),
        quiet: yo.current.quiet, spot: yo.current.spot,
        privada: yo.current.privada, pantalla: yo.current.pantalla,
      } satisfies Pos,
    })
  }, [yoId])

  const avanzar = useCallback((dt: number) => {
    const ahora = Date.now()
    for (const j of jugadores.current.values()) {
      const k = Math.min(1, dt * 12)
      j.x += (j.tx - j.x) * k
      j.y += (j.ty - j.y) * k
      if (j.mov) j.paso += dt * 60
      if (j.emote && ahora > j.emoteHasta) j.emote = null
    }
    const mio = emoteRef.current
    if (mio && ahora > mio.hasta) emoteRef.current = null
  }, [])

  const mandarEmote = useCallback((emoji: string) => {
    emoteRef.current = emoji ? { emoji, hasta: emoji === '✋' ? Number.MAX_SAFE_INTEGER : Date.now() + 3000 } : null
    canalRef.current?.send({ type: 'broadcast', event: 'emote', payload: { id: yoId, emoji } })
  }, [yoId])

  /** Aviso con sonido a una persona (sin abrir conversación). */
  const avisarA = useCallback((id: string) => {
    enviar({ tipo: 'toque', de: yoId, deNombre: nombreRef.current, para: id })
  }, [enviar, yoId])

  const invitar = useCallback((id: string, privada: boolean) => {
    const j = jugadores.current.get(id)
    if (!j || j.estado === 'nomolestar') { toast('Esta persona no está disponible.'); return }
    if (invitaciones.invitar(id, nombreRef.current, privada)) toast('Invitación enviada. Esperando respuesta.')
    else toast('Termina o cancela la conversación pendiente primero.')
  }, [invitaciones])
  const llamarA = useCallback((id: string) => invitar(id, false), [invitar])
  const invitarPrivada = useCallback((id: string) => invitar(id, true), [invitar])
  const salirPrivada = useCallback(() => invitaciones.terminar(), [invitaciones])
  const aceptarLlamada = useCallback(() => invitaciones.aceptar(), [invitaciones])
  const rechazarLlamada = useCallback(() => invitaciones.rechazar(), [invitaciones])
  const cancelarLlamada = useCallback(() => invitaciones.cancelar(), [invitaciones])
  const reintentarAudio = useCallback(() => { fallosPeer.current.clear(); void mezcla.current?.iniciar() }, [])

  return {
    jugadores, listaUI, remotos, decisiones, emoteRef, conectado, error, entrado,
    local, micOn, camOn, compartiendo, soportaPantalla,
    alternarMic, alternarCam, alternarPantalla, entrar, salir, reanudarAudio,
    estado, setEstado, quiet, setQuiet, spot, alternarSpot,
    privada, invitarPrivada, salirPrivada,
    entro, setEntro,
    publicarPos, avanzar, mandarEmote, llamarA, avisarA, llamada, llamadaSaliente, aceptarLlamada, rechazarLlamada, cancelarLlamada, reintentarAudio,
  }
}
