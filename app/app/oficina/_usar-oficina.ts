'use client'

// app/app/oficina/_usar-oficina.ts
//
// Motor multijugador de la oficina virtual:
//   · POSICIONES por Supabase Realtime broadcast (12 Hz) + interpolación
//   · ROSTER (nombre, avatar, estado) por Realtime presence
//   · AUDIO/VIDEO por cercanía con WebRTC, decidido por _audio-grafo.ts
//   · SPOTLIGHT (hablarle a toda la oficina), CONVERSACIÓN PRIVADA,
//     COMPARTIR PANTALLA y CHAT de 3 canales
//
// Correcciones de fondo respecto de la primera versión:
//   1. El micrófono se pide AL ENTRAR (antes solo al tocar el botón, así que
//      no se agregaba ninguna pista y la negociación WebRTC nunca arrancaba:
//      nadie escuchaba a nadie aunque el botón se viera encendido).
//   2. Un peer que fallaba quedaba muerto en el mapa y esa persona no volvía
//      a conectar nunca. Ahora se cierra y se borra.
//   3. El volumen se calculaba en dos lugares con reglas distintas. Ahora
//      sale de una sola función (_audio-grafo.ts).
//   4. El volumen va por Web Audio, no por `<video>.volume` (que en iPhone
//      no hace nada).
//   5. Negociación "educada" (perfect negotiation) en ambos lados, para que
//      no se pierdan conexiones cuando los dos ofrecen a la vez.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { AvatarConfig, Direccion, EstadoUsuario } from './_avatar'
import {
  decidir, debeConectar, paneo, cheb,
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
const TTL_MS = 12000       // sin noticias de alguien por 12s → se va del mapa
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
  nivel: number       // 0..1 — qué tan fuerte está hablando ahora
}

export type Remoto = {
  id: string
  nombre: string
  stream: MediaStream
  tipo: 'camara' | 'pantalla'
}

export type MensajeChat = {
  id: string
  de: string
  nombre: string
  canal: 'general' | 'cerca' | 'privado'
  texto: string
  ts: number
}

type Senal =
  | { tipo: 'oferta'; de: string; para: string; sdp: RTCSessionDescriptionInit }
  | { tipo: 'respuesta'; de: string; para: string; sdp: RTCSessionDescriptionInit }
  | { tipo: 'ice'; de: string; para: string; candidato: RTCIceCandidateInit }
  | { tipo: 'llamada'; de: string; deNombre: string; para: string }
  | { tipo: 'privada-invita'; de: string; deNombre: string; para: string; sala: string }

type Pos = {
  id: string; x: number; y: number; dir: Direccion
  mov: boolean; ghost: boolean; quiet: boolean; spot: boolean
  privada: string | null; pantalla: boolean; zona: string | null
}

/* Estado por peer: la conexión más lo necesario para negociar sin pisarnos. */
type Peer = {
  pc: RTCPeerConnection
  educado: boolean       // el "educado" cede si los dos ofrecen a la vez
  ofreciendo: boolean
  ignorarOferta: boolean
}

export function usarOficina(yoId: string, nombre: string, avatar: AvatarConfig) {
  const [remotos, setRemotos] = useState<Remoto[]>([])
  const [listaUI, setListaUI] = useState<Jugador[]>([])
  const [micOn, setMicOn] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [compartiendo, setCompartiendo] = useState(false)
  const [estado, setEstado] = useState<EstadoUsuario>('disponible')
  const [quiet, setQuiet] = useState(false)
  const [spot, setSpot] = useState(false)
  const [privada, setPrivada] = useState<string | null>(null)
  const [local, setLocal] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [llamada, setLlamada] = useState<{ de: string; nombre: string; sala?: string } | null>(null)
  const [conectado, setConectado] = useState(false)
  const [entrado, setEntrado] = useState(false)
  const [chat, setChat] = useState<MensajeChat[]>([])
  const [noLeidos, setNoLeidos] = useState(0)
  /* Quién acaba de entrar (para el avisito "X llegó a la oficina"). */
  const [entro, setEntro] = useState<string | null>(null)

  const jugadores = useRef<Map<string, Jugador>>(new Map())
  const yo = useRef<EstadoAudio & { dir: Direccion; mov: boolean; pantalla: boolean }>({
    id: yoId, x: 0, y: 0, zona: null, privada: null, spot: false,
    ghost: false, quiet: false, estado: 'disponible', dir: 's', mov: false, pantalla: false,
  })
  const canalRef = useRef<RealtimeChannel | null>(null)
  const peers = useRef<Map<string, Peer>>(new Map())
  const localRef = useRef<MediaStream | null>(null)
  const pantallaRef = useRef<MediaStream | null>(null)
  const camaraTrackRef = useRef<MediaStreamTrack | null>(null)
  const mezcla = useRef<MezcladorOficina | null>(null)
  const decisiones = useRef<Map<string, Decision>>(new Map())
  const avatarRef = useRef(avatar); avatarRef.current = avatar
  const nombreRef = useRef(nombre); nombreRef.current = nombre
  const estadoRef = useRef(estado); estadoRef.current = estado
  const ultimoEnvio = useRef(0)
  const emoteRef = useRef<{ emoji: string; hasta: number } | null>(null)
  const spotTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const entradoRef = useRef(false)

  const enviar = useCallback((s: Senal) => {
    canalRef.current?.send({ type: 'broadcast', event: 'senal', payload: s })
  }, [])

  /* ============ WebRTC ============ */
  const cerrarPeer = useCallback((otroId: string) => {
    const p = peers.current.get(otroId)
    if (!p) return
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
    const peer: Peer = { pc, educado: yoId > otroId, ofreciendo: false, ignorarOferta: false }
    peers.current.set(otroId, peer)

    localRef.current?.getTracks().forEach((t) => {
      try { pc.addTrack(t, localRef.current!) } catch { /* noop */ }
    })
    if (pantallaRef.current) {
      pantallaRef.current.getTracks().forEach((t) => {
        try { pc.addTrack(t, pantallaRef.current!) } catch { /* noop */ }
      })
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) enviar({ tipo: 'ice', de: yoId, para: otroId, candidato: e.candidate.toJSON() })
    }
    pc.ontrack = (e) => {
      const stream = e.streams[0]
      if (!stream) return
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
      if (['failed', 'closed'].includes(pc.connectionState)) cerrarPeer(otroId)
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
  }, [enviar, yoId, cerrarPeer])

  /* ============ Micrófono / cámara / pantalla ============ */
  const publicarTracks = useCallback(async (stream: MediaStream) => {
    for (const peer of peers.current.values()) {
      const senders = peer.pc.getSenders()
      for (const track of stream.getTracks()) {
        const sender = senders.find((x) => x.track?.kind === track.kind)
        if (sender) { try { await sender.replaceTrack(track) } catch { /* noop */ } }
        else { try { peer.pc.addTrack(track, stream) } catch { /* noop */ } }
      }
    }
  }, [])

  const pedirMedia = useCallback(async (video: boolean): Promise<MediaStream | null> => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        /* Sin cancelación de eco, con 3 personas en el open space y un audio
           de fondo siempre sonando, el retorno es insoportable. */
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: video ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      })
      localRef.current?.getTracks().forEach((t) => t.stop())
      localRef.current = s
      camaraTrackRef.current = s.getVideoTracks()[0] ?? null
      setLocal(s)
      await publicarTracks(s)
      setError(null)
      return s
    } catch {
      setError('No pudimos usar tu micrófono. Revisa los permisos del navegador.')
      return null
    }
  }, [publicarTracks])

  /** Entrar a la oficina: el gesto que habilita micrófono y audio. */
  const entrar = useCallback(async () => {
    mezcla.current ??= new MezcladorOficina()
    await mezcla.current.iniciar()
    const s = await pedirMedia(false)
    setMicOn(!!s)
    setEntrado(true)
    entradoRef.current = true
  }, [pedirMedia])

  const alternarMic = useCallback(async () => {
    if (!localRef.current) { const s = await pedirMedia(false); setMicOn(!!s); return }
    const nuevo = !micOn
    localRef.current.getAudioTracks().forEach((t) => { t.enabled = nuevo })
    setMicOn(nuevo)
  }, [micOn, pedirMedia])

  const alternarCam = useCallback(async () => {
    if (!camOn) {
      const s = await pedirMedia(true)
      if (!s) return
      s.getAudioTracks().forEach((t) => { t.enabled = micOn })
      setCamOn(true)
    } else {
      /* Solo apagamos la pista de video: volver a pedir getUserMedia cortaría
         el audio y en iPhone deja a los demás con la imagen congelada. */
      camaraTrackRef.current?.stop()
      camaraTrackRef.current = null
      for (const peer of peers.current.values()) {
        const sender = peer.pc.getSenders().find((x) => x.track?.kind === 'video')
        if (sender) { try { await sender.replaceTrack(null) } catch { /* noop */ } }
      }
      setCamOn(false)
    }
  }, [camOn, micOn, pedirMedia])

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

  /* ============ Canal Realtime ============ */
  useEffect(() => {
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
            x: 0, y: 0, tx: 0, ty: 0, dir: 's', mov: false,
            ghost: false, quiet: false, spot: false, privada: null, pantalla: false,
            zona: null, paso: 0, visto: Date.now(),
            gain: 0, videoAlpha: 1, fijado: false, nivel: 0,
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
      j.tx = p.x; j.ty = p.y; j.dir = p.dir; j.mov = p.mov
      j.ghost = p.ghost; j.quiet = p.quiet; j.spot = p.spot
      j.privada = p.privada; j.pantalla = p.pantalla; j.zona = p.zona
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

    canal.on('broadcast', { event: 'chat' }, ({ payload }) => {
      const m = payload as MensajeChat
      if (!m?.texto) return
      /* El canal "cerca" solo se recibe si de verdad está cerca. */
      if (m.canal === 'cerca') {
        const j = jugadores.current.get(m.de)
        if (!j || cheb(yo.current, j) > 5 || j.zona !== yo.current.zona) return
      }
      if (m.canal === 'privado' && !yo.current.privada) return
      setChat((c) => [...c.slice(-99), m])
      setNoLeidos((n) => n + 1)
    })

    canal.on('broadcast', { event: 'senal' }, async ({ payload }) => {
      const s = payload as Senal
      if (s.para !== yoId) return
      if (s.tipo === 'llamada') { setLlamada({ de: s.de, nombre: s.deNombre }); return }
      if (s.tipo === 'privada-invita') { setLlamada({ de: s.de, nombre: s.deNombre, sala: s.sala }); return }
      try {
        if (s.tipo === 'oferta' || s.tipo === 'respuesta') {
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
      peersSnapshot.forEach((p) => { try { p.pc.close() } catch { /* noop */ } })
      peersSnapshot.clear()
      localRef.current?.getTracks().forEach((t) => t.stop())
      pantallaRef.current?.getTracks().forEach((t) => t.stop())
      mezcla.current?.destruir()
      mezcla.current = null
      supabase.removeChannel(canal)
      canalRef.current = null
      setConectado(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yoId])

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
      const mio = yo.current

      for (const j of Array.from(jugadores.current.values())) {
        // TTL: si dejó de mandar posición, se fue (cerró la pestaña).
        if (ahora - j.visto > TTL_MS) {
          jugadores.current.delete(j.id)
          cerrarPeer(j.id)
          continue
        }
        const suyo: EstadoAudio = {
          id: j.id, x: j.x, y: j.y, zona: j.zona, privada: j.privada,
          spot: j.spot, ghost: j.ghost, quiet: j.quiet, estado: j.estado,
        }
        const yaEstaba = peers.current.has(j.id)
        const dec = decidir(mio, suyo, yaEstaba)
        decisiones.current.set(j.id, dec)
        j.gain = dec.gain
        j.videoAlpha = dec.videoAlpha
        j.fijado = dec.fijado
        /* Nivel de voz real: el aro verde sale solo si de verdad está
           hablando, no por estar conectado. */
        j.nivel = dec.gain > 0 ? (mezcla.current?.nivel(j.id) ?? 0) : 0

        if (debeConectar(mio, suyo, yaEstaba)) {
          if (!yaEstaba) crearPeer(j.id)
          mezcla.current?.ajustar(j.id, dec.gain, paneo(mio, suyo))
        } else if (yaEstaba) {
          cerrarPeer(j.id)
        }
      }

      setListaUI(Array.from(jugadores.current.values()).map((j) => ({ ...j })))
    }, PROX_MS)
    return () => clearInterval(t)
  }, [crearPeer, cerrarPeer])

  /* ============ API para el render loop ============ */
  const publicarPos = useCallback((x: number, y: number, dir: Direccion, mov: boolean, ghost: boolean, zona: string | null) => {
    const antes = yo.current
    const cambio = mov || antes.mov !== mov || antes.ghost !== ghost
      || antes.zona !== zona || antes.dir !== dir
    yo.current = { ...antes, x, y, dir, mov, ghost, zona }
    const ahora = performance.now()
    if (ahora - ultimoEnvio.current < (cambio ? ENVIO_MS : KEEPALIVE_MS)) return
    ultimoEnvio.current = ahora
    canalRef.current?.send({
      type: 'broadcast', event: 'pos',
      payload: {
        id: yoId, x, y, dir, mov, ghost, zona,
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

  const llamarA = useCallback((id: string) => {
    enviar({ tipo: 'llamada', de: yoId, deNombre: nombreRef.current, para: id })
  }, [enviar, yoId])

  /** Invitar a alguien a una conversación privada (solo entre ustedes). */
  const invitarPrivada = useCallback((id: string) => {
    const sala = `${yoId}:${id}`.split(':').sort().join(':')
    setPrivada(sala)
    yo.current.privada = sala
    enviar({ tipo: 'privada-invita', de: yoId, deNombre: nombreRef.current, para: id, sala })
  }, [enviar, yoId])

  const salirPrivada = useCallback(() => {
    setPrivada(null)
    yo.current.privada = null
  }, [])

  const mandarChat = useCallback((texto: string, canal: MensajeChat['canal']) => {
    const t = texto.trim()
    if (!t) return
    const m: MensajeChat = {
      id: `${yoId}-${Date.now()}`, de: yoId, nombre: nombreRef.current,
      canal, texto: t.slice(0, 500), ts: Date.now(),
    }
    setChat((c) => [...c.slice(-99), m])
    canalRef.current?.send({ type: 'broadcast', event: 'chat', payload: m })
  }, [yoId])

  return {
    jugadores, listaUI, remotos, decisiones, emoteRef, conectado, error, entrado,
    local, micOn, camOn, compartiendo, soportaPantalla,
    alternarMic, alternarCam, alternarPantalla, entrar,
    estado, setEstado, quiet, setQuiet, spot, alternarSpot,
    privada, invitarPrivada, salirPrivada,
    chat, mandarChat, noLeidos, setNoLeidos, entro, setEntro,
    publicarPos, avanzar, mandarEmote, llamarA, llamada, setLlamada,
  }
}
