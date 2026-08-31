'use client'

// app/app/oficina/_usar-oficina.ts
//
// Motor multijugador de la oficina virtual:
//   · POSICIONES por Supabase Realtime broadcast (12 Hz) + interpolación
//   · ROSTER (nombre, avatar, estado) por Realtime presence
//   · VIDEO/AUDIO POR PROXIMIDAD (WebRTC mesh, mismo patrón que /reunion):
//     te conectas con quien tienes a ≤5 tiles (distancia Chebyshev, como
//     Gather) o con todos los que estén en tu misma sala privada, y el
//     volumen baja con la distancia. A 6 tiles se corta la conexión.
//
// Reglas de Gather que respetamos:
//   ≤2 tiles → volumen full · 3–5 tiles → se atenúa · ≥6 tiles → desconectado
//   Modo fantasma (tecla G) → no conecta con nadie.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { AvatarConfig, Direccion, EstadoUsuario } from './_avatar'

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
}

/* Distancias de proximidad, en tiles (valores documentados de Gather). */
export const DIST_FULL = 2      // hasta acá, volumen 1.0
export const DIST_MAX = 5       // última distancia conectada
const ENVIO_MS = 80             // 12.5 Hz de posición
const KEEPALIVE_MS = 2000
const PROX_MS = 250             // recálculo de vecinos 4 Hz

export type Jugador = {
  id: string
  nombre: string
  avatar: AvatarConfig
  estado: EstadoUsuario
  emote: string | null
  emoteHasta: number
  x: number; y: number        // posición dibujada (interpolada)
  tx: number; ty: number      // último objetivo recibido
  dir: Direccion
  mov: boolean
  ghost: boolean
  zona: string | null
  paso: number
  visto: number               // timestamp del último paquete (para limpiar fantasmas)
}

export type Remoto = { id: string; nombre: string; stream: MediaStream }

type Senal =
  | { tipo: 'oferta'; de: string; para: string; sdp: RTCSessionDescriptionInit }
  | { tipo: 'respuesta'; de: string; para: string; sdp: RTCSessionDescriptionInit }
  | { tipo: 'ice'; de: string; para: string; candidato: RTCIceCandidateInit }
  | { tipo: 'llamada'; de: string; deNombre: string; para: string }

type Pos = {
  id: string; x: number; y: number; dir: Direccion
  mov: boolean; ghost: boolean; zona: string | null
}

export function usarOficina(yoId: string, nombre: string, avatar: AvatarConfig) {
  /* --- Estado expuesto a React (baja frecuencia: paneles y burbujas) --- */
  const [remotos, setRemotos] = useState<Remoto[]>([])
  const [listaUI, setListaUI] = useState<Jugador[]>([])
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(false)   // la cámara arranca apagada (oficina, no reunión)
  const [estado, setEstado] = useState<EstadoUsuario>('disponible')
  const [local, setLocal] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [llamada, setLlamada] = useState<{ de: string; nombre: string } | null>(null)
  const [conectado, setConectado] = useState(false)

  /* --- Refs (se leen dentro de callbacks del canal: no pueden ser estado) --- */
  const jugadores = useRef<Map<string, Jugador>>(new Map())
  const yo = useRef({ x: 0, y: 0, dir: 's' as Direccion, mov: false, ghost: false, zona: null as string | null })
  const canalRef = useRef<RealtimeChannel | null>(null)
  const pcs = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localRef = useRef<MediaStream | null>(null)
  const volumenes = useRef<Map<string, number>>(new Map())
  const avatarRef = useRef(avatar); avatarRef.current = avatar
  const nombreRef = useRef(nombre); nombreRef.current = nombre
  const estadoRef = useRef(estado); estadoRef.current = estado
  const ultimoEnvio = useRef(0)
  const emoteRef = useRef<{ emoji: string; hasta: number } | null>(null)

  const enviar = useCallback((s: Senal) => {
    canalRef.current?.send({ type: 'broadcast', event: 'senal', payload: s })
  }, [])

  /* ============ WebRTC: crear / cerrar peers ============ */
  const cerrarPeer = useCallback((otroId: string) => {
    const pc = pcs.current.get(otroId)
    if (!pc) return
    pc.close()
    pcs.current.delete(otroId)
    volumenes.current.delete(otroId)
    setRemotos((prev) => prev.filter((r) => r.id !== otroId))
  }, [])

  const crearPeer = useCallback((otroId: string, iniciador: boolean) => {
    const existente = pcs.current.get(otroId)
    if (existente) return existente
    const pc = new RTCPeerConnection(ICE)
    pcs.current.set(otroId, pc)

    localRef.current?.getTracks().forEach((t) => pc.addTrack(t, localRef.current!))

    pc.onicecandidate = (e) => {
      if (e.candidate) enviar({ tipo: 'ice', de: yoId, para: otroId, candidato: e.candidate.toJSON() })
    }
    pc.ontrack = (e) => {
      const stream = e.streams[0]
      setRemotos((prev) => {
        const otros = prev.filter((r) => r.id !== otroId)
        const nom = jugadores.current.get(otroId)?.nombre ?? 'Alguien'
        return [...otros, { id: otroId, nombre: nom, stream }]
      })
    }
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        setRemotos((prev) => prev.filter((r) => r.id !== otroId))
      }
    }
    if (iniciador) {
      pc.onnegotiationneeded = async () => {
        try {
          const oferta = await pc.createOffer()
          await pc.setLocalDescription(oferta)
          enviar({ tipo: 'oferta', de: yoId, para: otroId, sdp: oferta })
        } catch { /* reintenta en el próximo ciclo de proximidad */ }
      }
    }
    return pc
  }, [enviar, yoId])

  /* ============ Micrófono / cámara ============ */
  const pedirMedia = useCallback(async (video: boolean): Promise<MediaStream | null> => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video })
      localRef.current?.getTracks().forEach((t) => t.stop())
      localRef.current = s
      setLocal(s)
      s.getAudioTracks().forEach((t) => { t.enabled = micOn })
      // Re-publicar los tracks en los peers ya abiertos
      for (const pc of pcs.current.values()) {
        const senders = pc.getSenders()
        for (const track of s.getTracks()) {
          const sender = senders.find((x) => x.track?.kind === track.kind)
          if (sender) await sender.replaceTrack(track).catch(() => {})
          else pc.addTrack(track, s)
        }
      }
      setError(null)
      return s
    } catch {
      setError('No pudimos usar tu micrófono. Revisa los permisos del navegador.')
      return null
    }
  }, [micOn])

  const alternarMic = useCallback(async () => {
    if (!localRef.current) { const s = await pedirMedia(false); if (!s) return; setMicOn(true); return }
    const nuevo = !micOn
    localRef.current.getAudioTracks().forEach((t) => { t.enabled = nuevo })
    setMicOn(nuevo)
  }, [micOn, pedirMedia])

  const alternarCam = useCallback(async () => {
    const quiere = !camOn
    if (quiere) {
      const s = await pedirMedia(true)
      if (!s) return
      setCamOn(true)
    } else {
      localRef.current?.getVideoTracks().forEach((t) => { t.stop() })
      const s = await pedirMedia(false)
      void s
      setCamOn(false)
    }
  }, [camOn, pedirMedia])

  /* ============ Canal Realtime ============ */
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>
    try { supabase = createClient() } catch { return }

    const canal = supabase.channel('oficina', {
      config: { presence: { key: yoId }, broadcast: { self: false } },
    })
    canalRef.current = canal

    /* Roster: nombre / avatar / estado por presence. */
    canal.on('presence', { event: 'sync' }, () => {
      const st = canal.presenceState<{ nombre: string; avatar: AvatarConfig; estado: EstadoUsuario }>()
      const vivos = new Set<string>()
      for (const [id, metas] of Object.entries(st)) {
        const m = metas[metas.length - 1]
        if (!m || id === yoId) continue
        vivos.add(id)
        const j = jugadores.current.get(id)
        if (j) {
          j.nombre = m.nombre; j.avatar = m.avatar; j.estado = m.estado
        } else {
          jugadores.current.set(id, {
            id, nombre: m.nombre, avatar: m.avatar, estado: m.estado,
            emote: null, emoteHasta: 0,
            x: 0, y: 0, tx: 0, ty: 0, dir: 's', mov: false, ghost: false, zona: null,
            paso: 0, visto: Date.now(),
          })
        }
      }
      // Quien ya no está en presence, se va del mapa
      for (const id of Array.from(jugadores.current.keys())) {
        if (!vivos.has(id)) { jugadores.current.delete(id); cerrarPeer(id) }
      }
    })

    /* Posiciones (12 Hz). */
    canal.on('broadcast', { event: 'pos' }, ({ payload }) => {
      const p = payload as Pos
      if (!p?.id || p.id === yoId) return
      const j = jugadores.current.get(p.id)
      if (!j) return   // aún no llegó su presence; el próximo paquete lo pinta
      j.tx = p.x; j.ty = p.y; j.dir = p.dir; j.mov = p.mov
      j.ghost = p.ghost; j.zona = p.zona; j.visto = Date.now()
      // Primera posición: aparece ahí sin deslizarse desde (0,0)
      if (j.x === 0 && j.y === 0) { j.x = p.x; j.y = p.y }
    })

    /* Emotes. */
    canal.on('broadcast', { event: 'emote' }, ({ payload }) => {
      const { id, emoji } = payload as { id: string; emoji: string }
      const j = jugadores.current.get(id)
      if (!j) return
      j.emote = emoji
      j.emoteHasta = emoji === '✋' ? Number.MAX_SAFE_INTEGER : Date.now() + 3000
    })

    /* Señalización WebRTC + "te llaman". */
    canal.on('broadcast', { event: 'senal' }, async ({ payload }) => {
      const s = payload as Senal
      if (s.para !== yoId) return
      if (s.tipo === 'llamada') { setLlamada({ de: s.de, nombre: s.deNombre }); return }
      try {
        if (s.tipo === 'oferta') {
          const pc = crearPeer(s.de, false)
          await pc.setRemoteDescription(new RTCSessionDescription(s.sdp))
          const resp = await pc.createAnswer()
          await pc.setLocalDescription(resp)
          enviar({ tipo: 'respuesta', de: yoId, para: s.de, sdp: resp })
        } else if (s.tipo === 'respuesta') {
          const pc = pcs.current.get(s.de)
          if (pc && !pc.currentRemoteDescription) await pc.setRemoteDescription(new RTCSessionDescription(s.sdp))
        } else if (s.tipo === 'ice') {
          await pcs.current.get(s.de)?.addIceCandidate(new RTCIceCandidate(s.candidato))
        }
      } catch { /* una señal suelta no debe tumbar la oficina */ }
    })

    canal.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConectado(true)
        await canal.track({ nombre: nombreRef.current, avatar: avatarRef.current, estado: estadoRef.current })
      }
    })

    const pcsSnapshot = pcs.current
    return () => {
      pcsSnapshot.forEach((pc) => pc.close())
      pcsSnapshot.clear()
      localRef.current?.getTracks().forEach((t) => t.stop())
      supabase.removeChannel(canal)
      canalRef.current = null
      setConectado(false)
    }
    // Solo se monta una vez: nombre/avatar/estado se propagan por track() aparte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yoId])

  /* Re-publicar presence cuando cambia avatar o estado (sin recrear el canal). */
  useEffect(() => {
    canalRef.current?.track({ nombre, avatar, estado })
  }, [nombre, avatar, estado])

  /* ============ Bucle de proximidad (4 Hz) ============ */
  useEffect(() => {
    const t = setInterval(() => {
      const mio = yo.current
      const cerca = new Set<string>()

      if (!mio.ghost) {
        for (const j of jugadores.current.values()) {
          if (j.ghost) continue
          // Misma sala privada → conectados sin importar la distancia
          const mismaZona = !!mio.zona && mio.zona === j.zona
          const d = Math.max(Math.abs(j.x - mio.x), Math.abs(j.y - mio.y))  // Chebyshev
          // Fuera de una zona privada no se escucha a quien está dentro
          const zonaCompatible = mismaZona || (!mio.zona && !j.zona)
          if (mismaZona || (zonaCompatible && d <= DIST_MAX)) {
            cerca.add(j.id)
            volumenes.current.set(j.id, mismaZona ? 1 : volumenPorDistancia(d))
          }
        }
      }

      for (const id of cerca) {
        if (!pcs.current.has(id)) crearPeer(id, yoId < id)
      }
      for (const id of Array.from(pcs.current.keys())) {
        if (!cerca.has(id)) cerrarPeer(id)
      }

      // Snapshot para los paneles de React (no en cada frame: solo 4 veces/s)
      setListaUI(Array.from(jugadores.current.values()).map((j) => ({ ...j })))
    }, PROX_MS)
    return () => clearInterval(t)
  }, [crearPeer, cerrarPeer, yoId])

  /* ============ API para el bucle de render ============ */

  /** Publica mi posición (throttled). La llama el render loop cada frame. */
  const publicarPos = useCallback((x: number, y: number, dir: Direccion, mov: boolean, ghost: boolean, zona: string | null) => {
    const antes = yo.current
    /* "Cambió algo" se evalúa contra el estado ANTERIOR — si no, comparar
       contra el recién asignado da siempre false y solo quedaría el keepalive. */
    const cambio = mov || antes.mov !== mov || antes.ghost !== ghost || antes.zona !== zona || antes.dir !== dir
    yo.current = { x, y, dir, mov, ghost, zona }
    const ahora = performance.now()
    if (ahora - ultimoEnvio.current < (cambio ? ENVIO_MS : KEEPALIVE_MS)) return
    ultimoEnvio.current = ahora
    canalRef.current?.send({
      type: 'broadcast', event: 'pos',
      payload: { id: yoId, x, y, dir, mov, ghost, zona } satisfies Pos,
    })
  }, [yoId])

  /** Interpola las posiciones remotas y vence los emotes. Se llama cada frame. */
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
    emoteRef.current = { emoji, hasta: emoji === '✋' ? Number.MAX_SAFE_INTEGER : Date.now() + 3000 }
    canalRef.current?.send({ type: 'broadcast', event: 'emote', payload: { id: yoId, emoji } })
  }, [yoId])

  const llamarA = useCallback((id: string) => {
    enviar({ tipo: 'llamada', de: yoId, deNombre: nombreRef.current, para: id })
  }, [enviar, yoId])

  return {
    // datos
    jugadores, listaUI, remotos, volumenes, emoteRef, conectado, error,
    // media
    local, micOn, camOn, alternarMic, alternarCam, pedirMedia,
    // estado del usuario
    estado, setEstado,
    // acciones
    publicarPos, avanzar, mandarEmote, llamarA, llamada, setLlamada,
  }
}

/** Volumen según distancia: 1.0 hasta 2 tiles, luego baja hasta 0 en 6. */
export function volumenPorDistancia(d: number): number {
  if (d <= DIST_FULL) return 1
  if (d >= DIST_MAX + 1) return 0
  return Math.max(0, 1 - (d - DIST_FULL) / (DIST_MAX + 1 - DIST_FULL))
}
