'use client'

/* OFICINA VIRTUAL de Distinto — inspirada en Gather.town.
   Pedro 31-ago-2026: "que cada usuario de mi app ingrese virtualmente a su
   oficina, las oficinas te inspiras en gather, se tiene que poder hacer
   llamada".

   Cómo funciona:
   · Te mueves con WASD o las flechas. Doble clic camina hasta ese punto.
   · Cuando te acercas a alguien (≤5 tiles) se abre el audio/video solo, y
     el volumen sube mientras más cerca estés — igual que en la vida real.
   · Dentro de una sala (Juntas, Estudio, Diseño, Lounge) hablas con todos
     los que estén ahí y nadie de afuera escucha.
   · Tecla G = modo fantasma (atraviesas y nadie te oye). 1-7 = emotes.
   · Los objetos brillantes se usan con X (pizarra, TV, pantallas). */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Mic, MicOff, Video, VideoOff, Users, X, Ghost, Palette, Phone, MapPin, Loader2,
} from 'lucide-react'
import {
  TILE, MAPA_W, MAPA_H, SPAWN, ZONAS, MUEBLES,
  construirColisiones, esSolido, zonaDe, objetoCerca, dibujarMapa,
} from '../_mapa'
import {
  dibujarAvatar, dibujarEtiqueta, dibujarMarcaPropia,
  avatarPorNombre, avatarValido, ESTADO_COLOR, ESTADO_LABEL,
  PIELES, PELOS, ROPAS, PEINADOS, ACCESORIOS,
  type AvatarConfig, type Direccion, type EstadoUsuario,
} from '../_avatar'
import { usarOficina, volumenPorDistancia, DIST_MAX } from '../_usar-oficina'

const VEL = 6.2            // tiles por segundo (Gather ≈ 6-7)
const LS_AVATAR = 'oficina-avatar'
const EMOTES = ['👋', '👍', '🎉', '❤️', '😂', '✋', '❓']

export function OficinaView({ yoId, nombre }: { yoId: string; nombre: string }) {
  const router = useRouter()

  /* --- Avatar personalizable (se guarda en este dispositivo) --- */
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

  const oficina = usarOficina(yoId, nombre, avatar)
  const {
    jugadores, listaUI, remotos, volumenes, emoteRef, error,
    local, micOn, camOn, alternarMic, alternarCam,
    estado, setEstado, publicarPos, avanzar, mandarEmote, llamarA, llamada, setLlamada,
  } = oficina

  /* --- Canvas y mundo --- */
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fondoRef = useRef<HTMLCanvasElement | null>(null)
  const colisiones = useMemo(() => construirColisiones(), [])
  const pos = useRef({ x: SPAWN.x + 0.5, y: SPAWN.y + 0.5 })
  const dir = useRef<Direccion>('s')
  const paso = useRef(0)
  const teclas = useRef<Set<string>>(new Set())
  const ghost = useRef(false)
  const destino = useRef<{ x: number; y: number } | null>(null)
  const [panelAbierto, setPanelAbierto] = useState(true)
  const [objetoActivo, setObjetoActivo] = useState<{ titulo: string; href: string; icono: string } | null>(null)
  const objetoRef = useRef<{ titulo: string; href: string; icono: string } | null>(null)
  const [zonaActual, setZonaActual] = useState<string | null>(null)
  const [fantasmaUI, setFantasmaUI] = useState(false)

  /* Fondo estático: se dibuja una sola vez a un canvas aparte. */
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
        e.preventDefault(); teclas.current.add(k); destino.current = null
      }
      if (k === 'g') { ghost.current = true; setFantasmaUI(true) }
      if (k === 'x' && objetoRef.current) { router.push(objetoRef.current.href) }
      const n = parseInt(k, 10)
      if (n >= 1 && n <= EMOTES.length) mandarEmote(EMOTES[n - 1])
      if (k === '0') mandarEmote('')
    }
    const arriba = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      teclas.current.delete(k)
      if (k === 'g') { ghost.current = false; setFantasmaUI(false) }
    }
    window.addEventListener('keydown', abajo)
    window.addEventListener('keyup', arriba)
    return () => { window.removeEventListener('keydown', abajo); window.removeEventListener('keyup', arriba) }
  }, [mandarEmote, router])

  /* --- ¿Puedo pisar acá? (paredes, muebles y otras personas) --- */
  const libre = useCallback((x: number, y: number): boolean => {
    if (ghost.current) return x > 0.3 && y > 0.3 && x < MAPA_W - 0.3 && y < MAPA_H - 0.3
    const r = 0.32
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]] as const) {
      if (esSolido(colisiones, x + dx, y + dy)) return false
    }
    // Los avatares también colisionan entre sí (como en Gather)
    for (const j of jugadores.current.values()) {
      if (j.ghost) continue
      if (Math.abs(j.x - x) < 0.62 && Math.abs(j.y - y) < 0.62) return false
    }
    return true
  }, [colisiones, jugadores])

  /* --- Bucle de render --- */
  useEffect(() => {
    let raf = 0
    let anterior = performance.now()

    const frame = (ahora: number) => {
      const dt = Math.min(0.05, (ahora - anterior) / 1000)
      anterior = ahora
      const cv = canvasRef.current
      const ctx = cv?.getContext('2d')
      if (!cv || !ctx) { raf = requestAnimationFrame(frame); return }

      /* ---------- Movimiento ---------- */
      let vx = 0, vy = 0
      const k = teclas.current
      if (k.has('a') || k.has('arrowleft')) vx -= 1
      if (k.has('d') || k.has('arrowright')) vx += 1
      if (k.has('w') || k.has('arrowup')) vy -= 1
      if (k.has('s') || k.has('arrowdown')) vy += 1

      // Caminar hacia el punto del doble clic
      if (!vx && !vy && destino.current) {
        const dx = destino.current.x - pos.current.x
        const dy = destino.current.y - pos.current.y
        if (Math.hypot(dx, dy) < 0.15) destino.current = null
        else { vx = Math.abs(dx) > 0.08 ? Math.sign(dx) : 0; vy = Math.abs(dy) > 0.08 ? Math.sign(dy) : 0 }
      }

      const moviendo = vx !== 0 || vy !== 0
      if (moviendo) {
        const norm = Math.hypot(vx, vy) || 1
        const nx = pos.current.x + (vx / norm) * VEL * dt
        const ny = pos.current.y + (vy / norm) * VEL * dt
        // Deslizamiento por eje: si choca en diagonal, sigue por el eje libre
        if (libre(nx, pos.current.y)) pos.current.x = nx
        if (libre(pos.current.x, ny)) pos.current.y = ny
        else if (destino.current && !libre(nx, pos.current.y)) destino.current = null
        dir.current = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'e' : 'o') : (vy > 0 ? 's' : 'n')
        paso.current += dt * 60
      }

      /* ---------- Zona privada y objeto interactivo ---------- */
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

      /* ---------- Volumen por distancia ---------- */
      for (const j of jugadores.current.values()) {
        const mismaZona = !!z && z.id === j.zona
        const d = Math.max(Math.abs(j.x - pos.current.x), Math.abs(j.y - pos.current.y))
        volumenes.current.set(j.id, ghost.current || j.ghost ? 0 : mismaZona ? 1 : volumenPorDistancia(d))
      }

      /* ---------- Cámara ---------- */
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

      // Fondo
      if (fondoRef.current) ctx.drawImage(fondoRef.current, 0, 0)

      // Brillo del objeto interactivo cercano
      if (obj) {
        ctx.save()
        ctx.strokeStyle = '#FDFF00'
        ctx.lineWidth = 3
        ctx.shadowColor = '#F0B829'
        ctx.shadowBlur = 12
        ctx.strokeRect(obj.x * TILE + 1, obj.y * TILE + 1, obj.w * TILE - 2, obj.h * TILE + 10)
        ctx.restore()
      }

      /* ---------- Personas (ordenadas por Y: quien está más abajo, delante) ---------- */
      type Dibujable = { y: number; fn: () => void }
      const lista: Dibujable[] = []

      for (const j of jugadores.current.values()) {
        lista.push({
          y: j.y,
          fn: () => {
            const px = j.x * TILE, py = j.y * TILE
            const vol = volumenes.current.get(j.id) ?? 0
            dibujarAvatar(ctx, px, py, j.avatar, j.dir, j.mov, j.paso, {
              fantasma: j.ghost, hablando: vol > 0,
            })
            dibujarEtiqueta(ctx, px, py, j.nombre, j.estado, j.emote)
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
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [avatar, nombre, estado, libre, publicarPos, avanzar, jugadores, volumenes, emoteRef, zonaActual])

  /* --- Doble clic: caminar hasta ahí --- */
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
  }, [colisiones])

  /* --- "Te llaman": ir con esa persona --- */
  const irCon = useCallback((id: string) => {
    const j = jugadores.current.get(id)
    if (!j) { toast.error('Esa persona ya no está en la oficina'); return }
    // Buscar un tile libre junto a esa persona
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) {
      const nx = j.x + dx, ny = j.y + dy
      if (libre(nx, ny)) { pos.current = { x: nx, y: ny }; destino.current = null; return }
    }
    pos.current = { x: j.x, y: j.y + 1 }
  }, [jugadores, libre])

  const cercanos = listaUI.filter((j) => (volumenes.current.get(j.id) ?? 0) > 0)
  const zonaInfo = ZONAS.find((z) => z.id === zonaActual) ?? null

  return (
    <div className="relative w-full" style={{ height: 'calc(100dvh - 0px)', background: '#eceef5' }}>
      {/* ===== CANVAS ===== */}
      <canvas
        ref={canvasRef}
        onDoubleClick={alDobleClic}
        className="w-full h-full block"
        style={{ cursor: 'crosshair', imageRendering: 'auto' }}
      />

      {/* ===== Cabecera flotante ===== */}
      <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap max-w-[70%]">
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
            <Ghost className="w-4 h-4" /> Modo fantasma
          </div>
        )}
      </div>

      {/* ===== Burbujas de video de los cercanos ===== */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2 max-h-[55vh] overflow-y-auto">
        {remotos.map((r) => (
          <BurbujaVideo key={r.id} remoto={r} volumen={volumenes.current.get(r.id) ?? 0} />
        ))}
        {local && camOn && (
          <div className="w-[150px] rounded-xl overflow-hidden shadow-lg border-2 border-[#7170ff] bg-black">
            <VideoLocal stream={local} />
            <div className="px-2 py-1 text-[11px] font-bold text-white bg-black/70">Tú</div>
          </div>
        )}
      </div>

      {/* ===== Aviso de objeto interactivo ===== */}
      {objetoActivo && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 px-4 py-2.5 rounded-xl bg-black/80 text-white text-[13px] font-semibold shadow-xl backdrop-blur flex items-center gap-2">
          <span>{objetoActivo.icono}</span>
          {objetoActivo.titulo}
          <kbd className="ml-1 px-2 py-0.5 rounded bg-white/20 text-[11px] font-bold">X</kbd>
        </div>
      )}

      {/* ===== Barra inferior ===== */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-2 rounded-2xl bg-white/95 shadow-xl backdrop-blur border border-black/5">
        <BotonBarra activo={micOn} onClick={alternarMic} title={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}
          on={<Mic className="w-5 h-5" />} off={<MicOff className="w-5 h-5" />} />
        <BotonBarra activo={camOn} onClick={alternarCam} title={camOn ? 'Apagar cámara' : 'Encender cámara'}
          on={<Video className="w-5 h-5" />} off={<VideoOff className="w-5 h-5" />} />
        <div className="w-px h-7 bg-black/10 mx-1" />
        {EMOTES.slice(0, 5).map((e, i) => (
          <button key={e} onClick={() => mandarEmote(e)} title={`Emote (tecla ${i + 1})`}
            className="w-10 h-10 rounded-xl hover:bg-black/5 text-[18px] transition-colors">
            {e}
          </button>
        ))}
        <div className="w-px h-7 bg-black/10 mx-1" />
        <button onClick={() => setEditorAbierto(true)} title="Personalizar mi avatar"
          className="w-10 h-10 rounded-xl hover:bg-black/5 inline-flex items-center justify-center transition-colors">
          <Palette className="w-5 h-5" />
        </button>
        <button onClick={() => setPanelAbierto((v) => !v)} title="Ver quién está en la oficina"
          className="h-10 px-3 rounded-xl hover:bg-black/5 inline-flex items-center gap-1.5 text-[13px] font-bold transition-colors">
          <Users className="w-5 h-5" /> {listaUI.length + 1}
        </button>
      </div>

      {/* ===== Panel de personas ===== */}
      {panelAbierto && (
        <aside className="absolute top-16 right-3 w-[248px] max-h-[calc(100%-190px)] overflow-y-auto rounded-2xl bg-white/97 shadow-xl backdrop-blur border border-black/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-black/45">En la oficina</span>
            <button onClick={() => setPanelAbierto(false)} className="w-6 h-6 rounded-lg hover:bg-black/5 inline-flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Yo */}
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
          ) : listaUI.map((j) => {
            const vol = volumenes.current.get(j.id) ?? 0
            return (
              <div key={j.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-black/[0.03] group">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ESTADO_COLOR[j.estado] }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold truncate">{j.nombre}</div>
                  <div className="text-[10.5px] text-black/40 truncate">
                    {vol > 0 ? '🔊 Te escucha' : j.zona ? `En ${ZONAS.find((z) => z.id === j.zona)?.nombre}` : 'Lejos'}
                  </div>
                </div>
                <button onClick={() => irCon(j.id)} title={`Ir con ${j.nombre}`}
                  className="w-7 h-7 rounded-lg hover:bg-black/10 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <MapPin className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { llamarA(j.id); toast.success(`Le avisamos a ${j.nombre}`) }} title={`Llamar a ${j.nombre}`}
                  className="w-7 h-7 rounded-lg hover:bg-black/10 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}

          <div className="mt-3 pt-2.5 border-t text-[11px] text-black/45 leading-relaxed">
            <b>WASD</b> o flechas para moverte · <b>doble clic</b> para caminar<br />
            <b>G</b> = atravesar · <b>1-7</b> = emotes · <b>X</b> = usar objeto
          </div>
        </aside>
      )}

      {/* ===== Aviso: alguien te llama ===== */}
      {llamada && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-2xl border">
          <Phone className="w-5 h-5 text-[#7170ff]" />
          <span className="text-[14px] font-bold">{llamada.nombre} quiere hablar contigo</span>
          <button onClick={() => { irCon(llamada.de); setLlamada(null) }}
            className="h-9 px-3.5 rounded-xl text-white font-bold text-[13px]" style={{ background: '#7170ff' }}>
            Ir con {llamada.nombre.split(' ')[0]}
          </button>
          <button onClick={() => setLlamada(null)} className="w-9 h-9 rounded-xl hover:bg-black/5 inline-flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===== Cercanos (indicador de conversación) ===== */}
      {cercanos.length > 0 && (
        <div className="absolute bottom-20 left-3 px-3 py-2 rounded-xl bg-white/95 shadow-lg backdrop-blur border border-black/5 text-[12px]">
          <span className="font-bold">🔊 Hablando con:</span>{' '}
          {cercanos.map((c) => c.nombre.split(' ')[0]).join(', ')}
        </div>
      )}

      {error && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12.5px] font-semibold">
          {error}
        </div>
      )}

      {/* ===== Editor de avatar ===== */}
      {editorAbierto && (
        <EditorAvatar
          avatar={avatar}
          nombre={nombre}
          onGuardar={(a) => { guardarAvatar(a); setEditorAbierto(false); toast.success('¡Avatar actualizado!') }}
          onCerrar={() => setEditorAbierto(false)}
        />
      )}
    </div>
  )
}

/* ============ Burbuja de video de un vecino ============ */
function BurbujaVideo({ remoto, volumen }: { remoto: { id: string; nombre: string; stream: MediaStream }; volumen: number }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = remoto.stream
  }, [remoto.stream])
  /* El volumen sigue a la distancia: es lo que hace que "suene a oficina". */
  useEffect(() => {
    if (ref.current) ref.current.volume = Math.max(0, Math.min(1, volumen))
  }, [volumen])

  const tieneVideo = remoto.stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')
  return (
    <div className="w-[150px] rounded-xl overflow-hidden shadow-lg border-2 bg-black"
      style={{ borderColor: volumen > 0.6 ? '#43d69f' : 'rgba(255,255,255,0.5)' }}>
      {tieneVideo ? (
        <video ref={ref} autoPlay playsInline className="w-full h-[100px] object-cover bg-black" />
      ) : (
        <>
          <video ref={ref} autoPlay playsInline className="hidden" />
          <div className="w-full h-[76px] flex items-center justify-center text-white text-[26px] font-bold"
            style={{ background: 'linear-gradient(135deg,#4b4f6b,#2b2e3f)' }}>
            {remoto.nombre.charAt(0).toUpperCase()}
          </div>
        </>
      )}
      <div className="px-2 py-1 text-[11px] font-bold text-white bg-black/70 flex items-center justify-between">
        <span className="truncate">{remoto.nombre}</span>
        <span className="shrink-0">{'▮'.repeat(Math.max(1, Math.round(volumen * 3)))}</span>
      </div>
    </div>
  )
}

function VideoLocal({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => { if (ref.current) ref.current.srcObject = stream }, [stream])
  return <video ref={ref} autoPlay playsInline muted className="w-full h-[100px] object-cover bg-black" />
}

function BotonBarra({ activo, onClick, title, on, off }: {
  activo: boolean; onClick: () => void; title: string; on: React.ReactNode; off: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title}
      className="w-10 h-10 rounded-xl inline-flex items-center justify-center transition-colors"
      style={activo ? { background: '#7170ff', color: '#fff' } : { background: '#f1f2f6', color: '#6b7280' }}>
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

  /* Vista previa animada: el avatar gira para verlo por los 4 lados. */
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
            <Fila label="Piel">
              {PIELES.map((c) => <Muestra key={c} color={c} activo={cfg.piel === c} onClick={() => setCfg({ ...cfg, piel: c })} />)}
            </Fila>
            <Fila label="Pelo">
              {PELOS.map((c) => <Muestra key={c} color={c} activo={cfg.pelo === c} onClick={() => setCfg({ ...cfg, pelo: c })} />)}
            </Fila>
            <Fila label="Peinado">
              {PEINADOS.map((p) => <Pill key={p} txt={p} activo={cfg.peinado === p} onClick={() => setCfg({ ...cfg, peinado: p })} />)}
            </Fila>
          </div>
        </div>

        <Fila label="Ropa">
          {ROPAS.map((c) => <Muestra key={c} color={c} activo={cfg.ropa === c} onClick={() => setCfg({ ...cfg, ropa: c })} />)}
        </Fila>
        <Fila label="Accesorio">
          {ACCESORIOS.map((a) => <Pill key={a} txt={a} activo={cfg.accesorio === a} onClick={() => setCfg({ ...cfg, accesorio: a })} />)}
        </Fila>

        <button onClick={() => onGuardar(cfg)}
          className="w-full h-11 mt-2 rounded-xl text-white font-bold text-[14px]"
          style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
          Guardar avatar
        </button>
      </div>
    </div>
  )
}

/* Muebles interactivos disponibles — se listan en la ayuda del panel. */
export const OBJETOS_INTERACTIVOS = MUEBLES.filter((m) => m.accion).length
export const RANGO_VOZ = DIST_MAX
