'use client'

/* OFICINA VIRTUAL de Distinto — inspirada en Gather.town.

   · Te mueves con WASD o flechas. Doble clic camina hasta ese punto.
   · Al acercarte a alguien (≤5 casillas) se abre el audio solo, y el volumen
     sube mientras más cerca estés. Además suena por el lado que corresponde.
   · Dentro de una sala hablas con todos los de esa sala y nadie de afuera oye.
   · 📢 Spotlight: le hablas a TODA la oficina, atraviesa las salas.
   · 🔒 Conversación privada: solo entre ustedes dos.
   · 🖥 Compartir pantalla · 💬 Chat (general / cerca / privado)
   · G = fantasma · 1-7 = emotes · X = usar objeto · M = minimapa */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Mic, MicOff, Video, VideoOff, Users, X, Ghost, Palette, Phone, MapPin,
  MonitorUp, MonitorOff, Megaphone, Lock, MessageSquare, Send, Maximize2, Minimize2, VolumeX,
} from 'lucide-react'
import {
  TILE, MAPA_W, MAPA_H, SPAWN, ZONAS,
  construirColisiones, esSolido, zonaDe, objetoCerca, dibujarMapa,
} from '../_mapa'
import {
  dibujarAvatar, dibujarEtiqueta, dibujarMarcaPropia,
  avatarPorNombre, avatarValido, ESTADO_COLOR, ESTADO_LABEL,
  PIELES, PELOS, ROPAS, PEINADOS, ACCESORIOS,
  type AvatarConfig, type Direccion, type EstadoUsuario,
} from '../_avatar'
import { usarOficina, type MensajeChat } from '../_usar-oficina'

const VEL = 6.2
const LS_AVATAR = 'oficina-avatar'
const LS_POS = 'oficina-pos'
const EMOTES = ['👋', '👍', '🎉', '❤️', '😂', '✋', '❓']

export function OficinaView({ yoId, nombre }: { yoId: string; nombre: string }) {
  const router = useRouter()

  const [avatar, setAvatar] = useState<AvatarConfig>(() => avatarPorNombre(nombre))
  const [editorAbierto, setEditorAbierto] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_AVATAR)
      if (raw) { const p = JSON.parse(raw); if (avatarValido(p)) setAvatar(p) }
    } catch { /* primera vez */ }
  }, [])
  const guardarAvatar = useCallback((a: AvatarConfig) => {
    setAvatar(a)
    try { localStorage.setItem(LS_AVATAR, JSON.stringify(a)) } catch { /* modo privado */ }
  }, [])

  const of = usarOficina(yoId, nombre, avatar)
  const {
    jugadores, listaUI, remotos, emoteRef, error, entrado, entrar,
    local, micOn, camOn, compartiendo, soportaPantalla,
    alternarMic, alternarCam, alternarPantalla,
    estado, setEstado, quiet, setQuiet, spot, alternarSpot,
    privada, invitarPrivada, salirPrivada,
    chat, mandarChat, noLeidos, setNoLeidos,
    publicarPos, avanzar, mandarEmote, llamarA, llamada, setLlamada,
  } = of

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fondoRef = useRef<HTMLCanvasElement | null>(null)
  const colisiones = useMemo(() => construirColisiones(), [])
  /* Reaparecer donde estabas (Gather hace lo mismo). */
  const pos = useRef({ x: SPAWN.x + 0.5, y: SPAWN.y + 0.5 })
  const dir = useRef<Direccion>('s')
  const paso = useRef(0)
  const teclas = useRef<Set<string>>(new Set())
  const ghost = useRef(false)
  const destino = useRef<{ x: number; y: number } | null>(null)
  const guia = useRef<{ id: string; hasta: number } | null>(null)
  const [panelAbierto, setPanelAbierto] = useState(true)
  const [chatAbierto, setChatAbierto] = useState(false)
  const [minimapa, setMinimapa] = useState(true)
  const [objetoActivo, setObjetoActivo] = useState<{ titulo: string; href: string; icono: string } | null>(null)
  const objetoRef = useRef<{ titulo: string; href: string; icono: string } | null>(null)
  const [zonaActual, setZonaActual] = useState<string | null>(null)
  const [fantasmaUI, setFantasmaUI] = useState(false)
  const [pantallaGrande, setPantallaGrande] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_POS)
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p?.x === 'number' && typeof p?.y === 'number' && !esSolido(colisiones, p.x, p.y)) {
          pos.current = { x: p.x, y: p.y }
        }
      }
    } catch { /* arranca en recepción */ }
  }, [colisiones])

  useEffect(() => {
    const t = setInterval(() => {
      try { localStorage.setItem(LS_POS, JSON.stringify(pos.current)) } catch { /* noop */ }
    }, 3000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const off = document.createElement('canvas')
    off.width = MAPA_W * TILE
    off.height = MAPA_H * TILE
    const ctx = off.getContext('2d')
    if (ctx) dibujarMapa(ctx)
    fondoRef.current = off
  }, [])

  /* --- Teclado --- */
  useEffect(() => {
    const abajo = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault(); teclas.current.add(k); destino.current = null; guia.current = null
      }
      /* Fantasma como interruptor (antes había que mantener la tecla, y si
         se soltaba fuera de la ventana quedaba pegada). */
      if (k === 'g') { ghost.current = !ghost.current; setFantasmaUI(ghost.current) }
      if (k === 'm') setMinimapa((v) => !v)
      if (k === 'x' && objetoRef.current) router.push(objetoRef.current.href)
      const n = parseInt(k, 10)
      if (n >= 1 && n <= EMOTES.length) mandarEmote(EMOTES[n - 1])
      if (k === '0') mandarEmote('')
    }
    const arriba = (e: KeyboardEvent) => { teclas.current.delete(e.key.toLowerCase()) }
    const soltarTodo = () => teclas.current.clear()
    window.addEventListener('keydown', abajo)
    window.addEventListener('keyup', arriba)
    window.addEventListener('blur', soltarTodo)
    return () => {
      window.removeEventListener('keydown', abajo)
      window.removeEventListener('keyup', arriba)
      window.removeEventListener('blur', soltarTodo)
    }
  }, [mandarEmote, router])

  const libre = useCallback((x: number, y: number): boolean => {
    if (ghost.current) return x > 0.3 && y > 0.3 && x < MAPA_W - 0.3 && y < MAPA_H - 0.3
    const r = 0.32
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]] as const) {
      if (esSolido(colisiones, x + dx, y + dy)) return false
    }
    for (const j of jugadores.current.values()) {
      if (j.ghost) continue
      if (Math.abs(j.x - x) < 0.55 && Math.abs(j.y - y) < 0.55) return false
    }
    return true
  }, [colisiones, jugadores])

  /* --- Bucle de render --- */
  useEffect(() => {
    let raf = 0
    let anterior = performance.now()
    let atascado = 0

    const frame = (ahora: number) => {
      const dt = Math.min(0.05, (ahora - anterior) / 1000)
      anterior = ahora
      const cv = canvasRef.current
      const ctx = cv?.getContext('2d')
      if (!cv || !ctx) { raf = requestAnimationFrame(frame); return }

      let vx = 0, vy = 0
      const k = teclas.current
      if (k.has('a') || k.has('arrowleft')) vx -= 1
      if (k.has('d') || k.has('arrowright')) vx += 1
      if (k.has('w') || k.has('arrowup')) vy -= 1
      if (k.has('s') || k.has('arrowdown')) vy += 1

      /* Seguir a una persona ("ir con"): camina hacia ella. */
      if (!vx && !vy && guia.current) {
        const j = jugadores.current.get(guia.current.id)
        if (!j || Date.now() > guia.current.hasta) guia.current = null
        else destino.current = { x: j.x, y: j.y + 1 }
      }

      if (!vx && !vy && destino.current) {
        const dx = destino.current.x - pos.current.x
        const dy = destino.current.y - pos.current.y
        if (Math.hypot(dx, dy) < 0.2) { destino.current = null; guia.current = null }
        else { vx = Math.abs(dx) > 0.08 ? Math.sign(dx) : 0; vy = Math.abs(dy) > 0.08 ? Math.sign(dy) : 0 }
      }

      const moviendo = vx !== 0 || vy !== 0
      if (moviendo) {
        const norm = Math.hypot(vx, vy) || 1
        const nx = pos.current.x + (vx / norm) * VEL * dt
        const ny = pos.current.y + (vy / norm) * VEL * dt
        const antesX = pos.current.x, antesY = pos.current.y
        if (libre(nx, pos.current.y)) pos.current.x = nx
        if (libre(pos.current.x, ny)) pos.current.y = ny
        dir.current = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'e' : 'o') : (vy > 0 ? 's' : 'n')
        paso.current += dt * 60
        /* Si va hacia un destino y lleva medio segundo sin avanzar, hay una
           pared en el camino: se cancela en vez de vibrar contra el muro. */
        if (destino.current && Math.abs(pos.current.x - antesX) < 0.001 && Math.abs(pos.current.y - antesY) < 0.001) {
          atascado += dt
          if (atascado > 0.5) { destino.current = null; guia.current = null; atascado = 0 }
        } else atascado = 0
      }

      const z = zonaDe(pos.current.x, pos.current.y)
      if ((z?.id ?? null) !== zonaActual) setZonaActual(z?.id ?? null)
      const obj = objetoCerca(pos.current.x, pos.current.y)
      const accion = obj?.accion ?? null
      if (accion?.href !== objetoRef.current?.href) {
        objetoRef.current = accion
        setObjetoActivo(accion)
      }

      publicarPos(pos.current.x, pos.current.y, dir.current, moviendo, ghost.current, z?.id ?? null)
      avanzar(dt)

      const vw = cv.clientWidth, vh = cv.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (cv.width !== vw * dpr || cv.height !== vh * dpr) {
        cv.width = vw * dpr; cv.height = vh * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, vw, vh)

      const mundoW = MAPA_W * TILE, mundoH = MAPA_H * TILE
      let camX = pos.current.x * TILE - vw / 2
      let camY = pos.current.y * TILE - vh / 2
      camX = mundoW <= vw ? (mundoW - vw) / 2 : Math.max(0, Math.min(mundoW - vw, camX))
      camY = mundoH <= vh ? (mundoH - vh) / 2 : Math.max(0, Math.min(mundoH - vh, camY))

      ctx.save()
      ctx.translate(-Math.round(camX), -Math.round(camY))
      if (fondoRef.current) ctx.drawImage(fondoRef.current, 0, 0)

      /* Camino de baldosas hacia la persona que estoy buscando (Locate). */
      if (guia.current) {
        const j = jugadores.current.get(guia.current.id)
        if (j) {
          const pasos = 14
          for (let i = 1; i <= pasos; i++) {
            const t = i / pasos
            const px = pos.current.x + (j.x - pos.current.x) * t
            const py = pos.current.y + (j.y - pos.current.y) * t
            ctx.fillStyle = `rgba(113,112,255,${0.32 * (1 - t) + 0.1})`
            ctx.beginPath()
            ctx.ellipse(px * TILE, py * TILE, 7, 3.5, 0, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      if (obj) {
        ctx.save()
        ctx.strokeStyle = '#FDFF00'
        ctx.lineWidth = 3
        ctx.shadowColor = '#F0B829'
        ctx.shadowBlur = 12
        ctx.strokeRect(obj.x * TILE + 1, obj.y * TILE + 1, obj.w * TILE - 2, obj.h * TILE + 10)
        ctx.restore()
      }

      type Dibujable = { y: number; fn: () => void }
      const lista: Dibujable[] = []

      for (const j of jugadores.current.values()) {
        lista.push({
          y: j.y,
          fn: () => {
            const px = j.x * TILE, py = j.y * TILE
            /* Aro de conversación privada. */
            if (j.privada && j.privada === privada) {
              ctx.save()
              ctx.strokeStyle = '#f59e0b'
              ctx.lineWidth = 2.5
              ctx.setLineDash([5, 3])
              ctx.beginPath(); ctx.ellipse(px, py + 2, 17, 8, 0, 0, Math.PI * 2); ctx.stroke()
              ctx.restore()
            }
            dibujarAvatar(ctx, px, py, j.avatar, j.dir, j.mov, j.paso, {
              fantasma: j.ghost, hablando: j.gain > 0.05,
            })
            dibujarEtiqueta(ctx, px, py, j.nombre, j.estado, j.emote)
            if (j.spot) {
              ctx.font = '16px sans-serif'; ctx.textAlign = 'center'
              ctx.fillText('📢', px, py - 62)
            }
            if (j.pantalla) {
              ctx.font = '14px sans-serif'; ctx.textAlign = 'center'
              ctx.fillText('🖥', px + 18, py - 46)
            }
          },
        })
      }
      lista.push({
        y: pos.current.y,
        fn: () => {
          const px = pos.current.x * TILE, py = pos.current.y * TILE
          dibujarMarcaPropia(ctx, px, py, '#7170ff')
          dibujarAvatar(ctx, px, py, avatar, dir.current, moviendo, paso.current, { fantasma: ghost.current })
          dibujarEtiqueta(ctx, px, py, nombre, estado, emoteRef.current?.emoji ?? null)
        },
      })
      lista.sort((a, b) => a.y - b.y)
      for (const d of lista) d.fn()
      ctx.restore()

      /* --- Minimapa --- */
      if (minimapa) {
        const esc = 2.6
        const mw = MAPA_W * esc, mh = MAPA_H * esc
        const mx = vw - mw - 14, my = vh - mh - 90
        ctx.save()
        ctx.globalAlpha = 0.92
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = 'rgba(0,0,0,0.10)'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.roundRect(mx - 5, my - 5, mw + 10, mh + 10, 8); ctx.fill(); ctx.stroke()
        for (const zz of ZONAS) {
          ctx.fillStyle = `${zz.color}33`
          ctx.fillRect(mx + zz.x * esc, my + zz.y * esc, zz.w * esc, zz.h * esc)
        }
        for (const j of jugadores.current.values()) {
          ctx.fillStyle = ESTADO_COLOR[j.estado]
          ctx.beginPath(); ctx.arc(mx + j.x * esc, my + j.y * esc, 2.6, 0, Math.PI * 2); ctx.fill()
        }
        ctx.fillStyle = '#7170ff'
        ctx.beginPath(); ctx.arc(mx + pos.current.x * esc, my + pos.current.y * esc, 3.4, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [avatar, nombre, estado, privada, minimapa, libre, publicarPos, avanzar, jugadores, emoteRef, zonaActual])

  const alDobleClic = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current
    if (!cv) return
    const rect = cv.getBoundingClientRect()
    const vw = cv.clientWidth, vh = cv.clientHeight
    const mundoW = MAPA_W * TILE, mundoH = MAPA_H * TILE
    let camX = pos.current.x * TILE - vw / 2
    let camY = pos.current.y * TILE - vh / 2
    camX = mundoW <= vw ? (mundoW - vw) / 2 : Math.max(0, Math.min(mundoW - vw, camX))
    camY = mundoH <= vh ? (mundoH - vh) / 2 : Math.max(0, Math.min(mundoH - vh, camY))
    const x = (e.clientX - rect.left + camX) / TILE
    const y = (e.clientY - rect.top + camY) / TILE
    if (esSolido(colisiones, x, y)) return
    destino.current = { x, y }
    guia.current = null
  }, [colisiones])

  const irCon = useCallback((id: string) => {
    const j = jugadores.current.get(id)
    if (!j) { toast.error('Esa persona ya no está en la oficina'); return }
    /* Camina hacia ella (no teletransporta) y pinta el camino. */
    guia.current = { id, hasta: Date.now() + 20000 }
    destino.current = { x: j.x, y: j.y + 1 }
  }, [jugadores])

  const cercanos = listaUI.filter((j) => j.gain > 0.05)
  const zonaInfo = ZONAS.find((z) => z.id === zonaActual) ?? null
  const pantallasRemotas = remotos.filter((r) => r.tipo === 'pantalla')

  /* ===== Pantalla de entrada: el gesto que habilita micrófono y audio ===== */
  if (!entrado) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: '100dvh', background: '#eceef5' }}>
        <div className="max-w-md w-full mx-4 rounded-2xl bg-white shadow-xl border p-7 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 inline-flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>D</div>
          <h1 className="text-xl font-extrabold mb-1">Oficina Distinto</h1>
          <p className="text-[13.5px] text-black/55 mb-5">
            Vas a entrar como <b>{nombre}</b>. Al acercarte a alguien se abre el audio solo,
            como en una oficina de verdad.
          </p>
          <button onClick={entrar}
            className="w-full h-12 rounded-xl text-white font-bold text-[15px]"
            style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
            Entrar a la oficina
          </button>
          <p className="text-[11.5px] text-black/40 mt-3">
            El navegador te va a pedir permiso del micrófono. Es necesario para que te escuchen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full" style={{ height: '100dvh', background: '#eceef5' }}>
      <canvas ref={canvasRef} onDoubleClick={alDobleClic} className="w-full h-full block" style={{ cursor: 'crosshair' }} />

      {/* ===== Cabecera ===== */}
      <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap max-w-[62%]">
        <div className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white/95 shadow-lg backdrop-blur border border-black/5">
          <span className="w-6 h-6 rounded-lg inline-flex items-center justify-center text-white text-[12px] font-bold"
            style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>D</span>
          <span className="text-[13.5px] font-bold">Oficina Distinto</span>
          <span className="text-[11px] text-black/45">· {listaUI.length + 1} en línea</span>
        </div>
        {zonaInfo && (
          <div className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl shadow-lg backdrop-blur text-[13px] font-bold text-white"
            style={{ background: zonaInfo.color }}>
            {zonaInfo.emoji} {zonaInfo.nombre} · sala privada
          </div>
        )}
        {fantasmaUI && (
          <div className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-black/70 text-white text-[12.5px] font-bold backdrop-blur">
            <Ghost className="w-4 h-4" /> Fantasma
          </div>
        )}
        {spot && (
          <div className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-white text-[12.5px] font-bold shadow-lg animate-pulse"
            style={{ background: '#f97316' }}>
            <Megaphone className="w-4 h-4" /> Hablando a toda la oficina
          </div>
        )}
        {privada && (
          <div className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-white text-[12.5px] font-bold shadow-lg" style={{ background: '#f59e0b' }}>
            <Lock className="w-4 h-4" /> En privado
            <button onClick={salirPrivada} className="ml-1 underline">salir</button>
          </div>
        )}
      </div>

      {/* ===== Burbujas de video ===== */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2 max-h-[50vh] overflow-y-auto">
        {remotos.filter((r) => r.tipo === 'camara').map((r) => {
          const j = listaUI.find((x) => x.id === r.id)
          return <BurbujaVideo key={`c-${r.id}`} remoto={r} alpha={j?.videoAlpha ?? 1} gain={j?.gain ?? 0} fijado={!!j?.fijado} />
        })}
        {pantallasRemotas.map((r) => (
          <button key={`p-${r.id}`} onClick={() => setPantallaGrande(r.id)}
            className="w-[150px] rounded-xl overflow-hidden shadow-lg border-2 border-[#10b981] bg-black text-left">
            <VideoTag stream={r.stream} className="w-full h-[84px] object-cover bg-black" />
            <div className="px-2 py-1 text-[11px] font-bold text-white bg-black/70 flex items-center gap-1">
              <MonitorUp className="w-3 h-3" /> {r.nombre} <Maximize2 className="w-3 h-3 ml-auto" />
            </div>
          </button>
        ))}
        {local && camOn && (
          <div className="w-[150px] rounded-xl overflow-hidden shadow-lg border-2 border-[#7170ff] bg-black">
            <VideoTag stream={local} muted className="w-full h-[100px] object-cover bg-black" />
            <div className="px-2 py-1 text-[11px] font-bold text-white bg-black/70">Tú</div>
          </div>
        )}
      </div>

      {/* ===== Pantalla compartida en grande ===== */}
      {pantallaGrande && (() => {
        const r = pantallasRemotas.find((p) => p.id === pantallaGrande)
        if (!r) return null
        return (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-6" style={{ background: 'rgba(10,10,15,0.86)' }}>
            <div className="w-full max-w-5xl">
              <div className="flex items-center justify-between mb-2 text-white">
                <span className="text-[14px] font-bold">🖥 Pantalla de {r.nombre}</span>
                <button onClick={() => setPantallaGrande(null)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/15 text-[13px] font-semibold">
                  <Minimize2 className="w-4 h-4" /> Cerrar
                </button>
              </div>
              <VideoTag stream={r.stream} className="w-full rounded-xl bg-black" style={{ maxHeight: '78vh' }} />
            </div>
          </div>
        )
      })()}

      {objetoActivo && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 px-4 py-2.5 rounded-xl bg-black/80 text-white text-[13px] font-semibold shadow-xl backdrop-blur flex items-center gap-2">
          <span>{objetoActivo.icono}</span>{objetoActivo.titulo}
          <kbd className="ml-1 px-2 py-0.5 rounded bg-white/20 text-[11px] font-bold">X</kbd>
        </div>
      )}

      {/* ===== Barra inferior ===== */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-2 rounded-2xl bg-white/95 shadow-xl backdrop-blur border border-black/5 max-w-[95vw] overflow-x-auto">
        <BotonBarra activo={micOn} onClick={alternarMic} title={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}
          on={<Mic className="w-5 h-5" />} off={<MicOff className="w-5 h-5" />} />
        <BotonBarra activo={camOn} onClick={alternarCam} title={camOn ? 'Apagar cámara' : 'Encender cámara'}
          on={<Video className="w-5 h-5" />} off={<VideoOff className="w-5 h-5" />} />
        {soportaPantalla && (
          <BotonBarra activo={compartiendo} onClick={alternarPantalla} color="#10b981"
            title={compartiendo ? 'Dejar de compartir' : 'Compartir mi pantalla'}
            on={<MonitorUp className="w-5 h-5" />} off={<MonitorOff className="w-5 h-5" />} />
        )}
        <BotonBarra activo={spot} onClick={alternarSpot} color="#f97316"
          title={spot ? 'Dejar de hablarle a toda la oficina' : 'Hablarle a TODA la oficina'}
          on={<Megaphone className="w-5 h-5" />} off={<Megaphone className="w-5 h-5" />} />
        <BotonBarra activo={quiet} onClick={() => setQuiet(!quiet)} color="#64748b"
          title={quiet ? 'Salir del modo silencioso' : 'Modo silencioso (solo el de al lado)'}
          on={<VolumeX className="w-5 h-5" />} off={<VolumeX className="w-5 h-5" />} />
        <div className="w-px h-7 bg-black/10 mx-1" />
        {EMOTES.slice(0, 5).map((e, i) => (
          <button key={e} onClick={() => mandarEmote(e)} title={`Emote (tecla ${i + 1})`}
            className="w-10 h-10 rounded-xl hover:bg-black/5 text-[18px] transition-colors shrink-0">{e}</button>
        ))}
        <div className="w-px h-7 bg-black/10 mx-1" />
        <button onClick={() => { setChatAbierto((v) => !v); setNoLeidos(0) }} title="Chat"
          className="relative w-10 h-10 rounded-xl hover:bg-black/5 inline-flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5" />
          {noLeidos > 0 && !chatAbierto && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center">{noLeidos}</span>
          )}
        </button>
        <button onClick={() => setEditorAbierto(true)} title="Personalizar mi avatar"
          className="w-10 h-10 rounded-xl hover:bg-black/5 inline-flex items-center justify-center shrink-0"><Palette className="w-5 h-5" /></button>
        <button onClick={() => setPanelAbierto((v) => !v)} title="Quién está en la oficina"
          className="h-10 px-3 rounded-xl hover:bg-black/5 inline-flex items-center gap-1.5 text-[13px] font-bold shrink-0">
          <Users className="w-5 h-5" /> {listaUI.length + 1}
        </button>
      </div>

      {/* ===== Panel de personas ===== */}
      {panelAbierto && (
        <aside className="absolute top-16 right-3 w-[252px] max-h-[calc(100%-260px)] overflow-y-auto rounded-2xl bg-white/97 shadow-xl backdrop-blur border border-black/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-black/45">En la oficina</span>
            <button onClick={() => setPanelAbierto(false)} className="w-6 h-6 rounded-lg hover:bg-black/5 inline-flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl mb-1" style={{ background: '#7170ff12' }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ESTADO_COLOR[estado] }} />
            <span className="text-[13px] font-bold truncate flex-1">{nombre}</span>
            <span className="text-[10.5px] text-black/40">tú</span>
          </div>
          <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoUsuario)}
            className="w-full h-8 px-2 mb-2 rounded-lg border text-[12px] bg-white outline-none">
            {(Object.keys(ESTADO_LABEL) as EstadoUsuario[]).map((s) => (
              <option key={s} value={s}>{ESTADO_LABEL[s]}</option>
            ))}
          </select>

          {listaUI.length === 0 ? (
            <p className="text-[12px] text-black/45 py-2">
              Nadie más conectado. Cuando entre alguien del equipo, lo verás caminando por acá. 👋
            </p>
          ) : listaUI.map((j) => (
            <div key={j.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-black/[0.03] group">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ESTADO_COLOR[j.estado] }} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold truncate">{j.nombre}{j.spot ? ' 📢' : ''}{j.pantalla ? ' 🖥' : ''}</div>
                <div className="text-[10.5px] text-black/40 truncate">
                  {j.gain > 0.5 ? '🔊 Te escucha' : j.gain > 0.05 ? '🔉 Lejitos' : j.zona ? `En ${ZONAS.find((z) => z.id === j.zona)?.nombre}` : 'Lejos'}
                </div>
              </div>
              <button onClick={() => irCon(j.id)} title={`Ir con ${j.nombre}`}
                className="w-7 h-7 rounded-lg hover:bg-black/10 inline-flex items-center justify-center opacity-0 group-hover:opacity-100"><MapPin className="w-3.5 h-3.5" /></button>
              <button onClick={() => { invitarPrivada(j.id); toast.success(`Conversación privada con ${j.nombre}`) }} title={`Hablar en privado con ${j.nombre}`}
                className="w-7 h-7 rounded-lg hover:bg-black/10 inline-flex items-center justify-center opacity-0 group-hover:opacity-100"><Lock className="w-3.5 h-3.5" /></button>
              <button onClick={() => { llamarA(j.id); toast.success(`Le avisamos a ${j.nombre}`) }} title={`Llamar a ${j.nombre}`}
                className="w-7 h-7 rounded-lg hover:bg-black/10 inline-flex items-center justify-center opacity-0 group-hover:opacity-100"><Phone className="w-3.5 h-3.5" /></button>
            </div>
          ))}

          <div className="mt-3 pt-2.5 border-t text-[11px] text-black/45 leading-relaxed">
            <b>WASD</b> moverte · <b>doble clic</b> caminar · <b>G</b> fantasma<br />
            <b>1-7</b> emotes · <b>X</b> usar objeto · <b>M</b> minimapa
          </div>
        </aside>
      )}

      {/* ===== Chat ===== */}
      {chatAbierto && (
        <ChatPanel mensajes={chat} onEnviar={mandarChat} onCerrar={() => setChatAbierto(false)} hayPrivada={!!privada} />
      )}

      {llamada && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-2xl border">
          {llamada.sala ? <Lock className="w-5 h-5 text-[#f59e0b]" /> : <Phone className="w-5 h-5 text-[#7170ff]" />}
          <span className="text-[14px] font-bold">
            {llamada.nombre} {llamada.sala ? 'quiere hablar en privado' : 'quiere hablar contigo'}
          </span>
          <button onClick={() => {
            if (llamada.sala) { invitarPrivada(llamada.de) }
            irCon(llamada.de); setLlamada(null)
          }}
            className="h-9 px-3.5 rounded-xl text-white font-bold text-[13px]" style={{ background: '#7170ff' }}>
            {llamada.sala ? 'Aceptar' : `Ir con ${llamada.nombre.split(' ')[0]}`}
          </button>
          <button onClick={() => setLlamada(null)} className="w-9 h-9 rounded-xl hover:bg-black/5 inline-flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
      )}

      {cercanos.length > 0 && (
        <div className="absolute bottom-20 left-3 px-3 py-2 rounded-xl bg-white/95 shadow-lg backdrop-blur border border-black/5 text-[12px]">
          <span className="font-bold">🔊 Hablando con:</span> {cercanos.map((c) => c.nombre.split(' ')[0]).join(', ')}
        </div>
      )}

      {error && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12.5px] font-semibold">{error}</div>
      )}

      {editorAbierto && (
        <EditorAvatar avatar={avatar} nombre={nombre}
          onGuardar={(a) => { guardarAvatar(a); setEditorAbierto(false); toast.success('¡Avatar actualizado!') }}
          onCerrar={() => setEditorAbierto(false)} />
      )}
    </div>
  )
}

/* ============ Video genérico ============ */
function VideoTag({ stream, muted, className, style }: {
  stream: MediaStream; muted?: boolean; className?: string; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => { if (ref.current) ref.current.srcObject = stream }, [stream])
  /* Siempre `muted`: el sonido sale por el mezclador Web Audio, no por el
     elemento (así funciona el volumen por distancia también en iPhone). */
  return <video ref={ref} autoPlay playsInline muted={muted ?? true} className={className} style={style} />
}

function BurbujaVideo({ remoto, alpha, gain, fijado }: {
  remoto: { id: string; nombre: string; stream: MediaStream }; alpha: number; gain: number; fijado: boolean
}) {
  const [tieneVideo, setTieneVideo] = useState(false)
  useEffect(() => {
    const chequear = () => {
      const t = remoto.stream.getVideoTracks()[0]
      setTieneVideo(!!t && t.readyState === 'live' && !t.muted)
    }
    chequear()
    const t = remoto.stream.getVideoTracks()[0]
    t?.addEventListener('mute', chequear)
    t?.addEventListener('unmute', chequear)
    const i = setInterval(chequear, 1500)
    return () => { t?.removeEventListener('mute', chequear); t?.removeEventListener('unmute', chequear); clearInterval(i) }
  }, [remoto.stream])

  return (
    <div className="w-[150px] rounded-xl overflow-hidden shadow-lg border-2 bg-black transition-opacity"
      style={{
        borderColor: fijado ? '#f97316' : gain > 0.6 ? '#43d69f' : 'rgba(255,255,255,0.5)',
        opacity: Math.max(0.35, alpha),
      }}>
      {tieneVideo ? (
        <VideoTag stream={remoto.stream} className="w-full h-[100px] object-cover bg-black" />
      ) : (
        <div className="w-full h-[76px] flex items-center justify-center text-white text-[26px] font-bold"
          style={{ background: 'linear-gradient(135deg,#4b4f6b,#2b2e3f)' }}>
          {remoto.nombre.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="px-2 py-1 text-[11px] font-bold text-white bg-black/70 flex items-center justify-between">
        <span className="truncate">{fijado ? '📢 ' : ''}{remoto.nombre}</span>
        <span className="shrink-0">{'▮'.repeat(Math.max(1, Math.round(gain * 3)))}</span>
      </div>
    </div>
  )
}

/* ============ Chat ============ */
function ChatPanel({ mensajes, onEnviar, onCerrar, hayPrivada }: {
  mensajes: MensajeChat[]
  onEnviar: (t: string, c: MensajeChat['canal']) => void
  onCerrar: () => void
  hayPrivada: boolean
}) {
  const [canal, setCanal] = useState<MensajeChat['canal']>('cerca')
  const [txt, setTxt] = useState('')
  const finRef = useRef<HTMLDivElement>(null)
  const visibles = mensajes.filter((m) => m.canal === canal)
  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [visibles.length])

  const CANALES: Array<{ id: MensajeChat['canal']; label: string }> = [
    { id: 'cerca', label: 'Cerca' },
    { id: 'general', label: 'General' },
    ...(hayPrivada ? [{ id: 'privado' as const, label: 'Privado' }] : []),
  ]

  return (
    <aside className="absolute bottom-20 left-3 w-[300px] max-w-[90vw] h-[340px] rounded-2xl bg-white/97 shadow-xl backdrop-blur border border-black/5 flex flex-col">
      <div className="flex items-center gap-1 p-2 border-b">
        {CANALES.map((c) => (
          <button key={c.id} onClick={() => setCanal(c.id)}
            className="h-7 px-2.5 rounded-lg text-[12px] font-bold"
            style={canal === c.id ? { background: '#7170ff', color: '#fff' } : { color: '#6b7280' }}>
            {c.label}
          </button>
        ))}
        <button onClick={onCerrar} className="ml-auto w-7 h-7 rounded-lg hover:bg-black/5 inline-flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {visibles.length === 0 ? (
          <p className="text-[12px] text-black/40 pt-2">
            {canal === 'cerca' ? 'Lo que escribas acá lo leen solo los que tienes cerca.'
              : canal === 'general' ? 'Mensaje para toda la oficina.'
              : 'Solo entre ustedes dos.'}
          </p>
        ) : visibles.map((m) => (
          <div key={m.id} className="text-[13px]">
            <span className="font-bold" style={{ color: '#7170ff' }}>{m.nombre.split(' ')[0]}</span>
            <span className="text-black/35 text-[10.5px] ml-1.5">
              {new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(new Date(m.ts))}
            </span>
            <div className="whitespace-pre-wrap break-words">{m.texto}</div>
          </div>
        ))}
        <div ref={finRef} />
      </div>
      <div className="p-2 border-t flex items-center gap-1.5">
        <input value={txt} onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && txt.trim()) { onEnviar(txt, canal); setTxt('') } }}
          placeholder={canal === 'cerca' ? 'A los que tienes cerca…' : canal === 'general' ? 'A toda la oficina…' : 'En privado…'}
          className="flex-1 h-9 px-3 rounded-lg border bg-white text-[13px] outline-none" />
        <button onClick={() => { if (txt.trim()) { onEnviar(txt, canal); setTxt('') } }}
          className="w-9 h-9 rounded-lg text-white inline-flex items-center justify-center" style={{ background: '#7170ff' }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}

function BotonBarra({ activo, onClick, title, on, off, color }: {
  activo: boolean; onClick: () => void; title: string; on: React.ReactNode; off: React.ReactNode; color?: string
}) {
  return (
    <button onClick={onClick} title={title}
      className="w-10 h-10 rounded-xl inline-flex items-center justify-center transition-colors shrink-0"
      style={activo ? { background: color ?? '#7170ff', color: '#fff' } : { background: '#f1f2f6', color: '#6b7280' }}>
      {activo ? on : off}
    </button>
  )
}

/* ============ Editor de avatar ============ */
function EditorAvatar({ avatar, nombre, onGuardar, onCerrar }: {
  avatar: AvatarConfig; nombre: string; onGuardar: (a: AvatarConfig) => void; onCerrar: () => void
}) {
  const [cfg, setCfg] = useState<AvatarConfig>(avatar)
  const prevRef = useRef<HTMLCanvasElement>(null)
  const [girando, setGirando] = useState(0)

  useEffect(() => {
    const cv = prevRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = 150 * dpr; cv.height = 150 * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, 150, 150)
    ctx.save()
    ctx.scale(2.1, 2.1)
    const dirs: Direccion[] = ['s', 'e', 'n', 'o']
    dibujarAvatar(ctx, 36, 52, cfg, dirs[girando % 4], true, girando * 8)
    ctx.restore()
  }, [cfg, girando])

  useEffect(() => {
    const t = setInterval(() => setGirando((g) => g + 1), 900)
    return () => clearInterval(t)
  }, [])

  const Fila = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-black/40 mb-1.5">{label}</div>
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  )
  const Muestra = ({ color, activo, onClick }: { color: string; activo: boolean; onClick: () => void }) => (
    <button onClick={onClick} className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110"
      style={{ background: color, borderColor: activo ? '#0a0a0a' : 'rgba(0,0,0,0.10)' }} />
  )
  const Pill = ({ txt, activo, onClick }: { txt: string; activo: boolean; onClick: () => void }) => (
    <button onClick={onClick} className="h-8 px-3 rounded-lg text-[12px] font-semibold border capitalize transition-colors"
      style={activo ? { background: '#7170ff', color: '#fff', borderColor: '#7170ff' } : { borderColor: 'rgba(0,0,0,0.12)', color: '#6b7280' }}>
      {txt}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)' }} onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[17px] font-extrabold">Tu avatar</div>
          <button onClick={onCerrar} className="w-8 h-8 rounded-lg hover:bg-black/5 inline-flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-4">
          <div className="shrink-0 rounded-2xl border bg-[#f7f7fa] p-2">
            <canvas ref={prevRef} style={{ width: 150, height: 150 }} />
            <div className="text-center text-[12px] font-bold mt-1">{nombre}</div>
          </div>
          <div className="flex-1 min-w-0">
            <Fila label="Piel">{PIELES.map((c) => <Muestra key={c} color={c} activo={cfg.piel === c} onClick={() => setCfg({ ...cfg, piel: c })} />)}</Fila>
            <Fila label="Pelo">{PELOS.map((c) => <Muestra key={c} color={c} activo={cfg.pelo === c} onClick={() => setCfg({ ...cfg, pelo: c })} />)}</Fila>
            <Fila label="Peinado">{PEINADOS.map((p) => <Pill key={p} txt={p} activo={cfg.peinado === p} onClick={() => setCfg({ ...cfg, peinado: p })} />)}</Fila>
          </div>
        </div>
        <Fila label="Ropa">{ROPAS.map((c) => <Muestra key={c} color={c} activo={cfg.ropa === c} onClick={() => setCfg({ ...cfg, ropa: c })} />)}</Fila>
        <Fila label="Accesorio">{ACCESORIOS.map((a) => <Pill key={a} txt={a} activo={cfg.accesorio === a} onClick={() => setCfg({ ...cfg, accesorio: a })} />)}</Fila>
        <button onClick={() => onGuardar(cfg)} className="w-full h-11 mt-2 rounded-xl text-white font-bold text-[14px]"
          style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
          Guardar avatar
        </button>
      </div>
    </div>
  )
}
