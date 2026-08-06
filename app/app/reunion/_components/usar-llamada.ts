'use client'

/* El MOTOR de la videollamada del equipo (Pedro 17-jul-2026).
 *
 * Cómo funciona, en simple:
 *  - El video y el audio viajan DIRECTO entre las computadoras (WebRTC). No
 *    pasan por ningún servidor nuestro: es más rápido y no cuesta ancho de banda.
 *  - Para que dos navegadores se encuentren hace falta un "presentador" que les
 *    pase los datos de conexión. Ese trabajo lo hace Supabase Realtime, que ya
 *    usa la app — sin servidor nuevo ni cuentas.
 *  - Cada uno se conecta con cada uno (malla). Va perfecto para un equipo chico.
 *
 * Quién llama a quién: para que dos no se ofrezcan conexión al mismo tiempo (y
 * quede rota), manda el de id menor. Es una regla simple y determinista.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/* Servidores STUN: solo sirven para que cada uno descubra su dirección pública.
   Son gratuitos y no ven ni el video ni el audio. */
const ICE: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
}

export type Participante = { id: string; nombre: string; enLlamada: boolean }
export type Remoto = { id: string; nombre: string; stream: MediaStream }

type Señal =
  | { tipo: 'oferta'; de: string; para: string; sdp: RTCSessionDescriptionInit }
  | { tipo: 'respuesta'; de: string; para: string; sdp: RTCSessionDescriptionInit }
  | { tipo: 'ice'; de: string; para: string; candidato: RTCIceCandidateInit }
  | { tipo: 'invitacion'; de: string; deNombre: string; para: string }

export function usarLlamada(yoId: string, nombre: string) {
  const [conectados, setConectados] = useState<Participante[]>([])
  const [remotos, setRemotos] = useState<Remoto[]>([])
  const [enLlamada, setEnLlamada] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [compartiendo, setCompartiendo] = useState(false)
  /* ¿Este dispositivo puede compartir pantalla? Los navegadores MÓVILES (iOS
     Safari, Android Chrome) NO exponen getDisplayMedia → en celular no se puede
     compartir pantalla (limitación de la plataforma). Detectamos en el cliente
     para ocultar el botón donde no aplica. Pedro 23-jul-2026. */
  const [soportaCompartir, setSoportaCompartir] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitacion, setInvitacion] = useState<{ de: string; nombre: string } | null>(null)

  const canalRef = useRef<RealtimeChannel | null>(null)
  const pcs = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localRef = useRef<MediaStream | null>(null)
  const camaraRef = useRef<MediaStreamTrack | null>(null)
  const pantallaRef = useRef<MediaStream | null>(null)  // stream de pantalla compartida
  const [local, setLocal] = useState<MediaStream | null>(null)
  const enLlamadaRef = useRef(false)
  const nombresRef = useRef<Map<string, string>>(new Map())

  /* Detección de soporte de compartir pantalla (solo en el cliente). */
  useEffect(() => {
    setSoportaCompartir(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia)
  }, [])

  const enviar = useCallback((s: Señal) => {
    canalRef.current?.send({ type: 'broadcast', event: 'senal', payload: s })
  }, [])

  /* Crea la conexión con otra persona. `iniciador` = a mí me toca ofrecer. */
  const crearPeer = useCallback((otroId: string, iniciador: boolean) => {
    if (pcs.current.has(otroId)) return pcs.current.get(otroId)!
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
        return [...otros, { id: otroId, nombre: nombresRef.current.get(otroId) ?? 'Alguien', stream }]
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
        } catch { /* reintenta en la próxima negociación */ }
      }
    }
    return pc
  }, [enviar, yoId])

  const cerrarPeer = useCallback((otroId: string) => {
    pcs.current.get(otroId)?.close()
    pcs.current.delete(otroId)
    setRemotos((prev) => prev.filter((r) => r.id !== otroId))
  }, [])

  /* ===== Canal: quién está conectado + señalización ===== */
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>
    try { supabase = createClient() } catch { return }

    const canal = supabase.channel('reunion', { config: { presence: { key: yoId } } })
    canalRef.current = canal

    canal.on('presence', { event: 'sync' }, () => {
      const estado = canal.presenceState<{ nombre: string; enLlamada: boolean }>()
      const lista: Participante[] = []
      for (const [id, metas] of Object.entries(estado)) {
        const m = metas[metas.length - 1]
        if (!m) continue
        nombresRef.current.set(id, m.nombre)
        lista.push({ id, nombre: m.nombre, enLlamada: !!m.enLlamada })
      }
      setConectados(lista)

      /* Si yo estoy en la llamada, me conecto con todos los que también estén.
         Y suelto a los que se fueron. */
      if (enLlamadaRef.current) {
        const enSala = lista.filter((p) => p.enLlamada && p.id !== yoId).map((p) => p.id)
        for (const id of enSala) if (!pcs.current.has(id)) crearPeer(id, yoId < id)
        for (const id of pcs.current.keys()) if (!enSala.includes(id)) cerrarPeer(id)
      }
    })

    canal.on('broadcast', { event: 'senal' }, async ({ payload }) => {
      const s = payload as Señal
      if (s.para !== yoId) return

      if (s.tipo === 'invitacion') {
        if (!enLlamadaRef.current) setInvitacion({ de: s.de, nombre: s.deNombre })
        return
      }
      if (!enLlamadaRef.current) return

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
      } catch { /* una señal suelta no debe tumbar la llamada */ }
    })

    canal.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await canal.track({ nombre, enLlamada: false })
    })

    return () => {
      pcs.current.forEach((pc) => pc.close())
      pcs.current.clear()
      localRef.current?.getTracks().forEach((t) => t.stop())
      supabase.removeChannel(canal)
    }
  }, [yoId, nombre, crearPeer, cerrarPeer, enviar])

  /* ===== Entrar / salir ===== */
  const entrar = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      localRef.current = stream
      camaraRef.current = stream.getVideoTracks()[0] ?? null
      setLocal(stream)
      enLlamadaRef.current = true
      setEnLlamada(true)
      setInvitacion(null)
      await canalRef.current?.track({ nombre, enLlamada: true })
    } catch (e) {
      const err = e as Error
      setError(
        err.name === 'NotAllowedError'
          ? 'Diste "bloquear" a la cámara o el micrófono. Habilítalos en el candado de la barra de direcciones y vuelve a intentar.'
          : err.name === 'NotFoundError'
            ? 'No encontré cámara o micrófono en este dispositivo.'
            : `No se pudo acceder a la cámara/micrófono: ${err.message}`,
      )
    }
  }, [nombre])

  const salir = useCallback(async () => {
    pcs.current.forEach((pc) => pc.close())
    pcs.current.clear()
    setRemotos([])
    localRef.current?.getTracks().forEach((t) => t.stop())
    localRef.current = null
    pantallaRef.current?.getTracks().forEach((t) => t.stop())
    pantallaRef.current = null
    setLocal(null)
    setCompartiendo(false)
    enLlamadaRef.current = false
    setEnLlamada(false)
    await canalRef.current?.track({ nombre, enLlamada: false })
  }, [nombre])

  /* ===== Controles ===== */
  const toggleMic = useCallback(() => {
    const t = localRef.current?.getAudioTracks()[0]
    if (!t) return
    t.enabled = !t.enabled
    setMicOn(t.enabled)
  }, [])

  const toggleCam = useCallback(() => {
    const t = localRef.current?.getVideoTracks()[0]
    if (!t) return
    t.enabled = !t.enabled
    setCamOn(t.enabled)
  }, [])

  /* Vuelve la pista de video a la CÁMARA en todas las conexiones y restaura mi
     propia vista. Se usa al dejar de compartir (botón o "Dejar de compartir"
     del navegador). */
  const volverACamara = useCallback(() => {
    const cam = camaraRef.current
    pcs.current.forEach((pc) => {
      const s = pc.getSenders().find((s) => s.track?.kind === 'video')
      if (s && cam) s.replaceTrack(cam)
    })
    pantallaRef.current?.getTracks().forEach((t) => t.stop())
    pantallaRef.current = null
    setLocal(localRef.current)   // mi vista vuelve a la cámara
    setCompartiendo(false)
  }, [])

  /* Compartir pantalla: cambiamos la pista de video en TODAS las conexiones sin
     cortar la llamada (replaceTrack) Y actualizamos MI PROPIA vista para ver lo
     que estoy compartiendo (antes seguía mostrando la cámara → parecía que "no
     se compartía nada"). Al terminar, volvemos a la cámara. Pedro 23-jul-2026. */
  const compartirPantalla = useCallback(async () => {
    if (compartiendo) { volverACamara(); return }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('Compartir pantalla solo funciona desde la computadora — los celulares no lo permiten.')
      return
    }
    try {
      const ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      const pista = ds.getVideoTracks()[0]
      pantallaRef.current = ds
      pcs.current.forEach((pc) => {
        const s = pc.getSenders().find((s) => s.track?.kind === 'video')
        s?.replaceTrack(pista)
      })
      setLocal(ds)                 // veo mi propia pantalla en mi cuadro
      setCompartiendo(true)
      pista.onended = () => volverACamara()   // "Dejar de compartir" del navegador
    } catch { /* el usuario canceló el selector de pantalla */ }
  }, [compartiendo, volverACamara])

  const llamarA = useCallback((otroId: string) => {
    enviar({ tipo: 'invitacion', de: yoId, deNombre: nombre, para: otroId })
  }, [enviar, yoId, nombre])

  return {
    conectados, remotos, local, enLlamada, micOn, camOn, compartiendo, soportaCompartir, error, invitacion,
    entrar, salir, toggleMic, toggleCam, compartirPantalla, llamarA, setInvitacion,
  }
}
