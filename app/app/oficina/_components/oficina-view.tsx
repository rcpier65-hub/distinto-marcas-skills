'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Mic, MicOff, Video, VideoOff, Users, X, Ghost, Palette, Phone, MapPin,
  MonitorUp, MonitorOff, Megaphone, Lock, Maximize2, Minimize2, VolumeX, Armchair, LogOut, Loader2,
  Monitor,
} from 'lucide-react'
import {
  MAPA_W, MAPA_H, ZONAS, ASIENTOS, SPAWN,
  construirColisiones, esSolido, zonaDe, objetoCerca,
} from '../_mapa'
import {
  ESTADO_COLOR, ESTADO_LABEL,
  type EstadoUsuario,
} from '../_avatar'
import { HAY_TURN } from '../_usar-oficina'
import { reclamarEscritorio } from '../_actions'
import { MUEBLES } from '../_mapa'
import { useOficina, motor, esDispositivoMovil } from '../_contexto'
import { buscarCamino, caminoParaAcercarse, sillaDeEscritorio, sillaEn } from '../_camino'
import { AvisoEscena3D } from './aviso-escena-3d'
import type { ErrorEscena3D } from './oficina-3d'

const Oficina3D = dynamic(() => import('./oficina-3d'), { ssr: false, loading: () => <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm text-slate-500">Cargando la oficina…</div> })
const EditorAvatar = dynamic(() => import('./editor-avatar'), { ssr: false })
const VEL = 2.5
const CORRER = 1.6
const EMOTES = ['👋', '👍', '🎉', '❤️', '😂', '✋', '❓']
const SENTARSE_MS = 350
const nadaSuscribir = () => () => {}

export function OficinaView() {
  const of = useOficina()
  const movil = useSyncExternalStore(nadaSuscribir, esDispositivoMovil, () => false)
  if (movil) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: '100dvh', background: '#eceef5' }}>
        <div className="max-w-sm w-full mx-4 rounded-2xl bg-white shadow-xl border p-7 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 inline-flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}><Monitor className="w-7 h-7" /></div>
          <h1 className="text-lg font-extrabold mb-1">La oficina es solo en computadora</h1>
          <p className="text-[13.5px] text-black/55">
            Para no dejar el micrófono abierto desde el celular, la Oficina Distinto solo funciona en la compu.
            Desde aquí puedes seguir usando el chat y el resto de la app.
          </p>
        </div>
      </div>
    )
  }
  if (!of) {
    return (
      <div className="w-full flex items-center justify-center text-[13px] text-black/50 gap-2" style={{ height: '100dvh', background: '#eceef5' }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando la oficina…
      </div>
    )
  }
  return <OficinaMapa />
}

function OficinaMapa() {
  const router = useRouter()
  const of = useOficina()!
  const {
    datos, avatar, guardarAvatar, duenos, setDuenos,
    jugadores, listaUI, remotos, emoteRef, error, entrado, entrarManual, salirManual,
    local, micOn, camOn, compartiendo, soportaPantalla,
    alternarMic, alternarCam, alternarPantalla,
    estado, setEstado, quiet, setQuiet, spot, alternarSpot,
    privada, invitarPrivada, salirPrivada,
    entro, setEntro,
    avanzar, mandarEmote, llamarA, llamada, llamadaSaliente, aceptarLlamada, rechazarLlamada, cancelarLlamada, reintentarAudio, conectado,
  } = of
  const yoId = datos.yoId
  const nombre = datos.nombre
  const miEscritorio = duenos.find((d) => d.userId === yoId)?.escritorio ?? null
  const [editorAbierto, setEditorAbierto] = useState(false)
  const [entrando, setEntrando] = useState(false)

  const [error3D, setError3D] = useState<ErrorEscena3D | null>(null)
  const [recuperando3D, setRecuperando3D] = useState(false)
  const [escenaKey, setEscenaKey] = useState(0)
  const yaw = useRef(0)
  const colisiones = useMemo(() => construirColisiones(), [])
  const teclas = useRef<Set<string>>(new Set())
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [ayuda, setAyuda] = useState(false)
  const [objetoActivo, setObjetoActivo] = useState<{ titulo: string; href: string; icono: string } | null>(null)
  const objetoRef = useRef<{ titulo: string; href: string; icono: string } | null>(null)
  const [zonaActual, setZonaActual] = useState<string | null>(null)
  const [fantasmaUI, setFantasmaUI] = useState(motor.ghost)
  const [sentadoUI, setSentadoUI] = useState(motor.sentado)
  const [pantallaGrande, setPantallaGrande] = useState<string | null>(null)
  /* Caminar hasta un punto (rodeando obstáculos). */
  const caminarA = useCallback((x: number, y: number) => {
    const m = motor
    const c = buscarCamino(colisiones, m.pos, { x, y })
    if (!c || c.length === 0) return false
    m.camino = c
    return true
  }, [colisiones])

  /* --- Teclado --- */
  useEffect(() => {
    if (!entrado || editorAbierto || error3D || recuperando3D) return
    const abajo = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault(); teclas.current.add(k); motor.camino = []; motor.guia = null
      }
      if (k === 'shift') teclas.current.add('shift')
      /* Fantasma como interruptor (antes había que mantener la tecla, y si
         se soltaba fuera de la ventana quedaba pegada). */
      if (k === 'g') { motor.ghost = !motor.ghost; setFantasmaUI(motor.ghost) }
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
  }, [mandarEmote, router, entrado, editorAbierto, error3D, recuperando3D])

  const libre = useCallback((x: number, y: number): boolean => {
    if (motor.ghost) return x > 0.3 && y > 0.3 && x < MAPA_W - 0.3 && y < MAPA_H - 0.3
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

  /* Movimiento independiente del renderizador 3D. */
  useEffect(() => {
    const pressed = teclas.current
    pressed.clear()
    if (!entrado || editorAbierto || error3D || recuperando3D) { motor.mov = false; return }
    if (esSolido(colisiones, motor.pos.x, motor.pos.y)) motor.pos = { x: SPAWN.x + .5, y: SPAWN.y + .5 }
    let raf = 0
    let anterior = performance.now()
    let atascado = 0
    let quieto = 0
    let recalcGuia = 0

    const frame = (ahora: number) => {
      const dt = Math.min(0.05, (ahora - anterior) / 1000)
      anterior = ahora
      const m = motor
      m.ultimoFrame = ahora
      if (document.hidden) { m.mov = false; raf = requestAnimationFrame(frame); return }

      let vx = 0, vy = 0
      const k = teclas.current
      if (k.has('a') || k.has('arrowleft')) vx -= 1
      if (k.has('d') || k.has('arrowright')) vx += 1
      if (k.has('w') || k.has('arrowup')) vy -= 1
      if (k.has('s') || k.has('arrowdown')) vy += 1

      {
        const cos = Math.cos(yaw.current), sin = Math.sin(yaw.current)
        const nx = vx * cos + vy * sin
        vy = -vx * sin + vy * cos; vx = nx
      }

      /* Seguir a una persona ("ir con"): recalcula el camino cada 0.6 s. */
      if (!vx && !vy && m.guia) {
        const j = jugadores.current.get(m.guia.id)
        if (!j || Date.now() > m.guia.hasta) m.guia = null
        else if ((recalcGuia -= dt) <= 0) {
          recalcGuia = 0.6
          if (Math.hypot(j.tx - m.pos.x, j.ty - m.pos.y) > 1.5 || zonaDe(j.tx,j.ty)?.id !== zonaDe(m.pos.x,m.pos.y)?.id) {
            m.camino = caminoParaAcercarse(colisiones, m.pos, { x: j.tx, y: j.ty }, Array.from(jugadores.current.values())) ?? []
          }
          else { m.camino = []; m.guia = null }
        }
      }

      /* Seguir el camino (lista de puntos). */
      if (!vx && !vy && m.camino.length) {
        const obj = m.camino[0]
        const dx = obj.x - m.pos.x, dy = obj.y - m.pos.y
        const d = Math.hypot(dx, dy)
        if (d < 0.12) { m.camino.shift() }
        else { vx = dx / d; vy = dy / d }
      }

      const inicioX = m.pos.x, inicioY = m.pos.y
      const moviendo = vx !== 0 || vy !== 0
      if (moviendo) {
        if (m.sentado) { m.sentado = false; setSentadoUI(false) }
        const norm = Math.hypot(vx, vy) || 1
        const vel = VEL * (k.has('shift') ? CORRER : 1)
        const nx = m.pos.x + (vx / norm) * vel * dt
        const ny = m.pos.y + (vy / norm) * vel * dt
        const antesX = m.pos.x, antesY = m.pos.y
        if (libre(nx, m.pos.y)) m.pos.x = nx
        if (libre(m.pos.x, ny)) m.pos.y = ny
        m.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'e' : 'o') : (vy > 0 ? 's' : 'n')
        m.paso += dt * 60
        quieto = 0
        /* Si lleva medio segundo sin avanzar (alguien parado en el camino),
           se cancela en vez de vibrar. */
        if (m.camino.length && Math.abs(m.pos.x - antesX) < 0.001 && Math.abs(m.pos.y - antesY) < 0.001) {
          atascado += dt
          if (atascado > 0.5) { m.camino = []; m.guia = null; atascado = 0 }
        } else atascado = 0
      } else if (!m.sentado) {
        /* Quieto sobre una silla → sentarse mirando al escritorio. */
        const silla = sillaEn(m.pos.x, m.pos.y)
        if (silla && !m.ghost) {
          quieto += dt * 1000
          if (quieto >= SENTARSE_MS) {
            m.sentado = true; m.pos = { x: silla.x, y: silla.y }; m.dir = silla.dir
            setSentadoUI(true)
          }
        } else quieto = 0
      }
      m.mov = Math.hypot(m.pos.x - inicioX, m.pos.y - inicioY) > .0001

      const z = zonaDe(m.pos.x, m.pos.y)
      if ((z?.id ?? null) !== zonaActual) setZonaActual(z?.id ?? null)
      const obj = objetoCerca(m.pos.x, m.pos.y)
      const accion = obj?.accion ?? null
      if (accion?.href !== objetoRef.current?.href) {
        objetoRef.current = accion
        setObjetoActivo(accion)
      }

      avanzar(dt)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); pressed.clear(); motor.mov = false }
  }, [colisiones, libre, avanzar, jugadores, zonaActual, caminarA, entrado, editorAbierto, error3D, recuperando3D])

  const levantarse = () => {
    const directions = { n: [0, -1], s: [0, 1], e: [1, 0], o: [-1, 0] }
    const [dx, dy] = directions[motor.dir]
    // Buscar primero hacia delante, luego a los lados si una mesa ocupa ese espacio.
    for (const [x, y] of [[dx, dy], [dy, -dx], [-dy, dx]]) {
      if (libre(motor.pos.x + x, motor.pos.y + y)) { caminarA(motor.pos.x + x, motor.pos.y + y); return }
    }
    toast('Camina a un espacio libre para levantarte.')
  }
  const irAZona = useCallback((id: string) => {
    const seat = ASIENTOS.find(a => zonaDe(a.x, a.y)?.id === id && !listaUI.some(p => Math.hypot(p.x - a.x, p.y - a.y) < .55))
    motor.guia = null
    if (!seat || !caminarA(seat.x, seat.y)) toast('No hay un asiento libre accesible en esta zona.')
  }, [caminarA, listaUI])

  const irCon = (id: string) => {
    const j = jugadores.current.get(id)
    if (!j) { toast.error('Esa persona ya no está en la oficina'); return }
    motor.guia = { id, hasta: Date.now() + 20000 }
    const camino = caminoParaAcercarse(colisiones, motor.pos, { x: j.tx, y: j.ty }, Array.from(jugadores.current.values()))
    if (camino) motor.camino = camino
    else { motor.guia = null; toast('No hay un lugar libre junto a esa persona.') }
  }

  /* Escritorio propio: caminar hasta su silla (y sentarse al llegar). */
  const irAMiEscritorio = useCallback(() => {
    if (!miEscritorio) { toast.error('Todavía no reclamaste un escritorio'); return }
    const silla = sillaDeEscritorio(miEscritorio)
    if (!silla) { toast.error('Ese escritorio ya no existe'); return }
    motor.guia = null
    if (!caminarA(silla.x, silla.y)) toast.error('No encontré camino a tu escritorio')
  }, [miEscritorio, caminarA])

  const tomarEscritorio = useCallback(async (label: string) => {
    const r = await reclamarEscritorio(label)
    if (!r.ok) { toast.error(r.error); return }
    setDuenos((cur) => [
      ...cur.filter((d) => d.userId !== yoId && d.escritorio !== label),
      { userId: yoId, nombre, escritorio: label },
    ])
    toast.success(`El escritorio de ${label} ahora es tuyo`)
  }, [yoId, nombre, setDuenos])

  const cercanos = listaUI.filter(j => j.gain > 0 || j.gainSalida > 0)
  const escuchando = cercanos.filter(j => j.conexion === 'conectado' && j.gain > 0 && j.nivel > .08)
  const destinatarios = cercanos.filter(j => j.conexion === 'conectado' && j.gainSalida > 0)
  const zonaInfo = ZONAS.find((z) => z.id === zonaActual) ?? null
  const pantallasRemotas = remotos.filter(r => r.tipo === 'pantalla' && listaUI.some(j => j.id === r.id && j.gain > 0 && j.conexion === 'conectado'))

  /* ===== Entrada sin captura automática ===== */
  if (!entrado) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height: '100dvh', background: '#eceef5' }}>
        <div className="max-w-md w-full mx-4 rounded-2xl bg-white shadow-xl border p-7 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 inline-flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>D</div>
          <h1 className="text-xl font-extrabold mb-1">Oficina Distinto</h1>
          <p className="text-[13.5px] text-black/55 mb-5">
            Vas a entrar como <b>{nombre}</b>, con el micrófono y la cámara apagados.
            Actívalos cuando quieras conversar con el equipo.
          </p>
          <button onClick={async () => { setEntrando(true); try { await entrarManual() } finally { setEntrando(false) } }} disabled={entrando}
            className="w-full h-12 rounded-xl text-white font-bold text-[15px]"
            style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
            {entrando ? 'Entrando…' : 'Entrar a la oficina'}
          </button>
          <p className="text-[11.5px] text-black/40 mt-3">
            Los permisos se solicitan solo al activar tu micrófono o cámara.
          </p>
          <p className="text-[11.5px] text-black/40 mt-2">
            Se abre sola de lunes a sábado desde las 8:00 am, y sigues adentro aunque cambies de módulo.
          </p>
        </div>
      </div>
    )
  }

  const remotosVisibles = remotos.filter(r => listaUI.some(j => j.id === r.id && j.gain > 0 && j.conexion === 'conectado'))
  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2">
      {/* ===== Cabecera ===== */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white/95 shadow-lg backdrop-blur border border-black/5">
          <span className="w-6 h-6 rounded-lg inline-flex items-center justify-center text-white text-[12px] font-bold"
            style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>D</span>
          <span className="text-[13.5px] font-bold">Oficina Distinto</span>
          <span className="text-[11px] text-black/45">· {listaUI.length + 1} en línea</span>
        </div>
        {zonaInfo && (
          <div className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl shadow-lg backdrop-blur text-[13px] font-bold text-white"
            style={{ background: zonaInfo.color }}>
            {zonaInfo.emoji} {zonaInfo.nombre} · audio por cercanía
          </div>
        )}
        {sentadoUI && (
          <div className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white/95 shadow-lg backdrop-blur border border-black/5 text-[12.5px] font-bold">
            <Armchair className="w-4 h-4 text-[#7170ff]" /> Sentado
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

        <button onClick={() => setAyuda(v => !v)} aria-expanded={ayuda} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">Cómo funciona</button>
      </header>
      {ayuda && <div className="shrink-0 border-b bg-violet-50 px-4 py-3 text-xs leading-relaxed text-violet-900">Acércate para conversar; al alejarte el audio se corta, incluso dentro de una sala. Las paredes separan conversaciones. Activa tu micrófono para hablar. Una llamada privada requiere aceptación y se mantiene hasta colgar. Clic en el suelo o un asiento: caminar · WASD: moverte · Arrastrar: girar · Rueda: zoom.</div>}
{(remotosVisibles.length > 0 || camOn) && <>
      {/* ===== Burbujas de video ===== */}
      <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 bg-white p-3">
        {remotosVisibles.filter((r) => r.tipo === 'camara').map((r) => {
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

</>}      <div className="flex min-h-0 flex-1">
        <div data-office-scene className="relative min-w-0 flex-1">
      {!error3D && <Oficina3D key={escenaKey} compatible={escenaKey > 0}
        personas={() => [{ id: yoId, nombre, x: motor.pos.x, y: motor.pos.y, dir: motor.dir, mov: motor.mov, sentado: motor.sentado, avatar, emote: emoteRef.current?.emoji }, ...Array.from(jugadores.current.values())]}
        caminar={(x, y) => { motor.guia = null; if (!caminarA(x, y)) toast('No hay camino hasta ese lugar.') }}
        orientar={angle => { yaw.current = angle }} destino={() => motor.camino.at(-1) ?? null}
        recuperar={setRecuperando3D} fallar={setError3D} />}
      {recuperando3D && !error3D && <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-100/90 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Recuperando la vista 3D…</div>}
      {error3D && <AvisoEscena3D error={error3D} reintentar={() => { setEscenaKey(k => k + 1); setRecuperando3D(false); setError3D(null) }} />}
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

        </div>
      {/* ===== Panel de personas ===== */}
      {panelAbierto && (
        <aside className="w-[280px] max-w-[40%] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-black/45">En la oficina</span>
            <button onClick={() => setPanelAbierto(false)} className="w-6 h-6 rounded-lg hover:bg-black/5 inline-flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl mb-1" style={{ background: '#7170ff12' }}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ESTADO_COLOR[estado] }} />
            <span className="text-[13px] font-bold truncate flex-1">{nombre}</span>
            <span className="text-[10.5px] text-black/40">tú</span>
          </div>
          <select aria-label="Mi disponibilidad" value={estado} onChange={(e) => setEstado(e.target.value as EstadoUsuario)}
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
                  {j.estado === 'nomolestar' ? 'No molestar' : j.conexion === 'error' ? 'No se pudo conectar' : j.gain > 0 ? (j.conexion === 'conectado' ? (j.mic ? 'Cerca · micro encendido' : 'Cerca · micro apagado') : 'Conectando…') : j.zona ? `En ${ZONAS.find((z) => z.id === j.zona)?.nombre}` : 'Fuera de alcance'}
                </div>
              </div>
              <button onClick={() => irCon(j.id)} title={`Ir con ${j.nombre}`}
                className="w-7 h-7 rounded-lg hover:bg-black/10 inline-flex items-center justify-center"><MapPin className="w-3.5 h-3.5" /></button>
              <button onClick={() => invitarPrivada(j.id)} title={`Hablar en privado con ${j.nombre}`}
                className="w-7 h-7 rounded-lg hover:bg-black/10 inline-flex items-center justify-center"><Lock className="w-3.5 h-3.5" /></button>
              <button onClick={() => llamarA(j.id)} title={`Llamar a ${j.nombre}`}
                className="w-7 h-7 rounded-lg hover:bg-black/10 inline-flex items-center justify-center"><Phone className="w-3.5 h-3.5" /></button>
            </div>
          ))}

          {/* Escritorios: cada uno reclama el suyo y puede volver a él. */}
          <div className="mt-3 pt-2.5 border-t">
            <div className="text-[11px] font-bold uppercase tracking-wider text-black/45 mb-1.5">Escritorios</div>
            <div className="flex flex-wrap gap-1">
              {MUEBLES.filter((m) => m.tipo === 'escritorio' && m.label).map((m) => {
                const dueno = duenos.find((d) => d.escritorio === m.label)
                const mio = dueno?.userId === yoId
                return (
                  <button key={m.label} onClick={() => tomarEscritorio(m.label!)}
                    disabled={!!dueno && !mio} title={dueno?.nombre ? `Puesto de ${dueno.nombre}` : 'Libre — tócalo para reclamarlo'}
                    className="h-7 px-2 rounded-lg text-[11px] font-semibold border disabled:cursor-default"
                    style={mio ? { background: '#7170ff', color: '#fff', borderColor: '#7170ff' }
                      : dueno ? { borderColor: 'rgba(0,0,0,0.12)', color: '#6b7280' }
                      : { borderColor: '#43d69f66', color: '#15803d' }}>
                    {m.label}{dueno && !mio ? ` · ${dueno.nombre?.split(' ')[0]}` : ''}
                  </button>
                )
              })}
            </div>
          </div>

          <details className="mt-3 border-t pt-3 text-xs text-slate-500"><summary className="cursor-pointer">Estado de conexión</summary><p className="mt-2">{conectado ? 'Presencia conectada.' : 'Reconectando presencia…'} {HAY_TURN ? 'Servidor de retransmisión configurado.' : 'Sin servidor TURN: algunas redes pueden impedir conectar el audio.'}</p><button onClick={reintentarAudio} className="mt-2 rounded-lg border px-3 py-2">Reintentar audio</button></details>
          <div className="mt-3 pt-2.5 border-t text-[11px] text-black/45 leading-relaxed">
            <b>Clic</b> caminar (rodea obstáculos) · <b>WASD</b> moverte · <b>Shift</b> correr<br />
            Quieto en una silla = <b>sentarte</b> · <b>G</b> fantasma · <b>1-7</b> emotes · <b>X</b> usar objeto
          </div>
        </aside>
      )}

      </div>
      <footer data-office-controls className="shrink-0 space-y-2 border-t border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-600"><strong>{privada ? 'Llamada privada' : spot ? 'Anuncio a la oficina' : 'Audio por cercanía'}</strong><span className="mx-2 text-slate-300">|</span>{micOn ? (destinatarios.length ? `Tu micrófono llega a: ${destinatarios.map(j => j.nombre.split(' ')[0]).join(', ')}` : 'Micrófono encendido · nadie conectado cerca') : 'Micrófono apagado'}{escuchando.length > 0 && <span className="ml-2 text-emerald-700">Habla: {escuchando.map(j => j.nombre.split(' ')[0]).join(', ')}</span>}</div>
          {entro && <AvisoLlegada nombre={entro} onFin={() => setEntro(null)} />}
        </div>
        {cercanos.length > 0 && <div aria-label="Personas cercanas" className="flex gap-2 overflow-x-auto">{cercanos.map(j => <div key={j.id} className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs"><span className="font-semibold text-slate-700">{j.nombre.split(' ')[0]}</span><span className={j.conexion === 'error' ? 'text-amber-700' : 'text-slate-500'}>{j.conexion === 'conectado' ? (j.nivel > .08 ? 'Hablando' : j.mic ? 'Micro encendido' : 'Micro apagado') : j.conexion === 'error' ? 'Sin conexión' : 'Conectando…'}</span><button aria-label={`Llamar a ${j.nombre}`} disabled={!!llamadaSaliente || !!privada} onClick={() => llamarA(j.id)} className="rounded-lg bg-slate-100 px-2 py-1 disabled:opacity-40">Llamar</button><button aria-label={`Hablar en privado con ${j.nombre}`} disabled={!!llamadaSaliente || !!privada} onClick={() => invitarPrivada(j.id)} className="rounded-lg bg-violet-50 px-2 py-1 text-violet-700 disabled:opacity-40">Privado</button>{j.conexion === 'error' && <button onClick={reintentarAudio} className="underline">Reintentar</button>}</div>)}</div>}
        {llamada && <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl bg-violet-50 px-3 py-2 text-sm"><Phone size={17} /><span>{llamada.nombre} {llamada.privada ? 'te invita a una llamada privada' : 'quiere hablar contigo'}</span><button onClick={() => { const i = aceptarLlamada(); if (i && !i.privada) irCon(i.de) }} className="rounded-lg bg-violet-600 px-3 py-2 font-semibold text-white">{llamada.privada ? 'Aceptar llamada' : 'Acercarme'}</button><button onClick={rechazarLlamada} className="rounded-lg border px-3 py-2">Ahora no</button></div>}
        {llamadaSaliente && <div role="status" className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs">Esperando respuesta de {listaUI.find(j => j.id === llamadaSaliente.para)?.nombre ?? 'tu compañero'}…<button onClick={cancelarLlamada} className="ml-auto rounded-lg border px-3 py-1.5">Cancelar invitación</button></div>}
        {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">{[['gerencia', 'Gerencia'], ['lounge', 'Lounge'], ['juntas', 'Juntas'], ['diseno', 'Ideas']].map(([id, label]) =>
          <button key={id} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-violet-100" onClick={() => irAZona(id)}>Ir a {label}</button>)}
          {sentadoUI && <button className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700" onClick={levantarse}>Levantarse</button>}
        </div>
      </div>
{objetoActivo && <button onClick={() => router.push(objetoActivo.href)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">{objetoActivo.icono} {objetoActivo.titulo} <kbd>X</kbd></button>}        </div>
      {/* ===== Barra inferior ===== */}
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-1.5 border-t border-slate-100 pt-2">
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
        <button onClick={irAMiEscritorio} title={miEscritorio ? `Ir a mi escritorio (${miEscritorio})` : 'Reclama un escritorio desde el panel'}
          className="w-10 h-10 rounded-xl hover:bg-black/5 inline-flex items-center justify-center shrink-0 disabled:opacity-40"
          disabled={!miEscritorio}><Armchair className="w-5 h-5" /></button>
        <button onClick={() => setEditorAbierto(true)} title="Personalizar mi avatar"
          className="w-10 h-10 rounded-xl hover:bg-black/5 inline-flex items-center justify-center shrink-0"><Palette className="w-5 h-5" /></button>
        <button onClick={() => setPanelAbierto((v) => !v)} title="Quién está en la oficina"
          className="h-10 px-3 rounded-xl hover:bg-black/5 inline-flex items-center gap-1.5 text-[13px] font-bold shrink-0">
          <Users className="w-5 h-5" /> Equipo · {listaUI.length + 1}
        </button>
        <button onClick={salirManual} title="Salir de la oficina"
          className="w-10 h-10 rounded-xl hover:bg-red-50 text-black/50 hover:text-red-600 inline-flex items-center justify-center shrink-0"><LogOut className="w-5 h-5" /></button>
      </div>

      </footer>
      {editorAbierto && (
        <EditorAvatar avatar={avatar} nombre={nombre}
          onGuardar={async (a) => { const ok = await guardarAvatar(a); if (ok) { setEditorAbierto(false); toast.success('Avatar guardado') } return ok }}
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

/* Avisito "X llegó a la oficina" — se va solo a los 4 segundos. */
function AvisoLlegada({ nombre, onFin }: { nombre: string; onFin: () => void }) {
  const done = useRef(onFin)
  useEffect(() => { done.current = onFin }, [onFin])
  useEffect(() => {
    const t = setTimeout(() => done.current(), 4000)
    return () => clearTimeout(t)
  }, [nombre])
  return (
    <div className="truncate text-xs text-slate-500">
      👋 <b>{nombre}</b> llegó a la oficina
    </div>
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
