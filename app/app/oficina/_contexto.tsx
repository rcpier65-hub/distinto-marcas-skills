'use client'

/* OficinaProvider — la oficina vive en TODA la app, no solo en /oficina.
   Pedro 24-sep-2026: "debe abrirse a las 8am y no debe cerrarse si cambio de
   módulo".

   - Montado en AppShell: el canal, el audio por cercanía, el micrófono y tu
     posición siguen activos aunque vayas a Tareas, Calendario, etc.
   - /oficina solo DIBUJA el mapa y mueve al avatar (escribe en `motor`).
   - Entrada automática: de lunes a sábado desde las 8:00 am (Lima) hasta las
     8:00 pm, al abrir la app ya estás adentro. Si sales a mano, ese día no
     vuelve a entrar sola.
   - Fuera de /oficina se ve un mini control (quién está cerca, micrófono,
     volver, salir). */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Mic, MicOff, LogOut } from 'lucide-react'
import { usarOficina } from './_usar-oficina'
import { avatarPorNombre, avatarValido, type AvatarConfig, type Direccion } from './_avatar'
import { SPAWN, zonaDe } from './_mapa'
import { actividadOficina, datosOficina, guardarAvatarOficina } from './_actions'
import type { Punto } from './_camino'

export type PerfilLite = { userId: string; nombre: string | null; escritorio: string | null }

/* Estado de MI avatar. Lo mueve /oficina; el proveedor lo publica siempre. */
export type Motor = {
  pos: Punto
  dir: Direccion
  paso: number
  ghost: boolean
  mov: boolean
  sentado: boolean
  camino: Punto[]
  guia: { id: string; hasta: number } | null
  ultimoFrame: number   // último frame dibujado por /oficina
}

/* Estado de MI avatar: un solo objeto por pestaña (fuera de React: lo mueve
   el bucle de /oficina 60 veces por segundo y lo publica el proveedor). */
export const motor: Motor = {
  pos: { x: SPAWN.x + 0.5, y: SPAWN.y + 0.5 }, dir: 's', paso: 0, ghost: false,
  mov: false, sentado: false, camino: [], guia: null, ultimoFrame: 0,
}

const LS_AVATAR = 'oficina-avatar'
const LS_POS = 'oficina-pos'
const LS_SALIO = 'oficina-salio'   // YYYY-MM-DD en que salió a mano
const HORA_ABRE = 8
const HORA_CIERRA = 20

function hoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
}
/* ¿Horario de oficina? Lunes a sábado, 8:00–20:00 en Lima. */
function enHorario(d = new Date()): boolean {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(d)
  const dia = p.find((x) => x.type === 'weekday')?.value
  const hora = Number(p.find((x) => x.type === 'hour')?.value ?? 0) % 24
  return dia !== 'Sun' && hora >= HORA_ABRE && hora < HORA_CIERRA
}
/* Milisegundos hasta las 8:00 de hoy en Lima (null si ya pasó). */
function msHastaApertura(): number | null {
  const ahora = new Date()
  const abre = new Date(`${hoyLima()}T${String(HORA_ABRE).padStart(2, '0')}:00:00-05:00`).getTime()
  const ms = abre - ahora.getTime()
  return ms > 0 ? ms : null
}
function salioHoy(): boolean {
  try { return localStorage.getItem(LS_SALIO) === hoyLima() } catch { return false }
}

type Datos = NonNullable<Awaited<ReturnType<typeof datosOficina>>>
type Valor = ReturnType<typeof usarOficina> & {
  datos: Datos
  avatar: AvatarConfig
  guardarAvatar: (a: AvatarConfig) => void
  duenos: PerfilLite[]
  setDuenos: React.Dispatch<React.SetStateAction<PerfilLite[]>>
  entrarManual: () => Promise<void>
  salirManual: () => void
  /* Tarea/edición en curso de cada uno (por userId), para dibujarla encima. */
  actividad: Record<string, ActividadOficina>
}
export type ActividadOficina = Awaited<ReturnType<typeof actividadOficina>>[string]

const Ctx = createContext<Valor | null>(null)

/** La oficina (null si el usuario no es del equipo o aún carga). */
export function useOficina(): Valor | null {
  return useContext(Ctx)
}

export function OficinaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [datos, setDatos] = useState<Datos | null>(null)
  const [avatar, setAvatar] = useState<AvatarConfig>(() => avatarPorNombre('equipo'))
  const [duenos, setDuenos] = useState<PerfilLite[]>([])

  /* Datos del usuario (solo equipo). */
  useEffect(() => {
    let vivo = true
    datosOficina().then((d) => {
      if (!vivo || !d) return
      setDatos(d)
      setDuenos(d.perfiles)
      let a: AvatarConfig | null = d.avatar && avatarValido(d.avatar) ? (d.avatar as unknown as AvatarConfig) : null
      if (!a) {
        try { const raw = localStorage.getItem(LS_AVATAR); const p = raw ? JSON.parse(raw) : null; if (avatarValido(p)) a = p } catch { /* nada */ }
      }
      setAvatar(a ?? avatarPorNombre(d.nombre))
      try {
        const raw = localStorage.getItem(LS_POS)
        const p = raw ? JSON.parse(raw) : null
        if (typeof p?.x === 'number' && typeof p?.y === 'number') motor.pos = { x: p.x, y: p.y }
      } catch { /* recepción */ }
    }).catch(() => {})
    return () => { vivo = false }
  }, [])

  const of = usarOficina(datos?.yoId ?? '', datos?.nombre ?? '', avatar)
  const { entrado, entrar, salir, publicarPos, avanzar, reanudarAudio } = of

  const guardarAvatar = useCallback((a: AvatarConfig) => {
    setAvatar(a)
    try { localStorage.setItem(LS_AVATAR, JSON.stringify(a)) } catch { /* modo privado */ }
    void guardarAvatarOficina(a as unknown as Record<string, string>)
  }, [])

  const entrarManual = useCallback(async () => {
    try { localStorage.removeItem(LS_SALIO) } catch { /* nada */ }
    await entrar()
  }, [entrar])

  const salirManual = useCallback(() => {
    try { localStorage.setItem(LS_SALIO, hoyLima()) } catch { /* nada */ }
    salir()
    toast('Saliste de la oficina', { description: 'Hoy ya no se abre sola. Vuelve cuando quieras desde Oficina.' })
  }, [salir])

  /* Entrada automática a las 8:00 (o al abrir la app en horario). */
  const entrandoRef = useRef(false)
  useEffect(() => {
    if (!datos || entrado) return
    const intentar = async () => {
      if (entrandoRef.current || salioHoy() || !enHorario()) return
      entrandoRef.current = true
      try {
        await entrar()
        toast.success('Entraste a la oficina', {
          description: 'Se abre sola en horario de trabajo. Quien se acerque a tu avatar te podrá hablar.',
          action: { label: 'Ir a la oficina', onClick: () => { window.location.href = '/oficina' } },
        })
      } finally { entrandoRef.current = false }
    }
    void intentar()
    const ms = msHastaApertura()
    const t = ms !== null ? setTimeout(() => void intentar(), ms + 1000) : null
    return () => { if (t) clearTimeout(t) }
  }, [datos, entrado, entrar])

  /* Si entró sola (sin toque), el primer clic en la app reactiva el audio. */
  useEffect(() => {
    if (!entrado) return
    const on = () => reanudarAudio()
    window.addEventListener('pointerdown', on)
    window.addEventListener('keydown', on)
    return () => { window.removeEventListener('pointerdown', on); window.removeEventListener('keydown', on) }
  }, [entrado, reanudarAudio])

  /* Publicar mi posición SIEMPRE (también fuera de /oficina) y mover a los
     demás aunque el mapa no esté a la vista. */
  useEffect(() => {
    if (!entrado) return
    let anterior = performance.now()
    const t = setInterval(() => {
      const ahora = performance.now()
      const m = motor
      const mapaVisible = ahora - m.ultimoFrame < 300
      if (!mapaVisible) {
        m.mov = false
        avanzar(Math.min(0.2, (ahora - anterior) / 1000))
      }
      anterior = ahora
      publicarPos(m.pos.x, m.pos.y, m.dir, m.mov, m.ghost, zonaDe(m.pos.x, m.pos.y)?.id ?? null, m.sentado)
    }, 80)
    const guardar = setInterval(() => {
      try { localStorage.setItem(LS_POS, JSON.stringify(motor.pos)) } catch { /* nada */ }
    }, 3000)
    return () => { clearInterval(t); clearInterval(guardar) }
  }, [entrado, publicarPos, avanzar])

  /* En qué está cada uno (cada minuto, mientras esté en la oficina). */
  const [actividad, setActividad] = useState<Record<string, ActividadOficina>>({})
  useEffect(() => {
    if (!entrado) return
    let vivo = true
    const leer = () => actividadOficina().then((a) => { if (vivo) setActividad(a) }).catch(() => {})
    void leer()
    const t = setInterval(leer, 60000)
    return () => { vivo = false; clearInterval(t) }
  }, [entrado])

  const valor = useMemo<Valor | null>(() => (datos ? {
    ...of, datos, avatar, guardarAvatar, duenos, setDuenos, entrarManual, salirManual, actividad,
  } : null), [of, datos, avatar, guardarAvatar, duenos, entrarManual, salirManual, actividad])

  const enOficina = pathname?.startsWith('/oficina')

  return (
    <Ctx.Provider value={valor}>
      {children}
      {valor && valor.entrado && !enOficina && <MiniOficina of={valor} />}
    </Ctx.Provider>
  )
}

/* Mini control fuera de /oficina: sigues en la oficina aunque estés en otro
   módulo. */
function MiniOficina({ of }: { of: Valor }) {
  const cerca = of.listaUI.filter((j) => j.gain > 0.05)
  const hablando = cerca.filter((j) => j.nivel > 0.12)
  return (
    <div
      style={{
        position: 'fixed', right: 84, bottom: 'calc(22px + env(safe-area-inset-bottom, 0px))', zIndex: 8990,
        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 6px 5px 10px', borderRadius: 14,
        background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
        fontSize: 12.5, color: '#0f172a', maxWidth: 'calc(100vw - 110px)',
      }}
    >
      <Link href="/oficina" title="Ir a la oficina" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit', minWidth: 0 }}>
        <span style={{ position: 'relative', lineHeight: 0 }}>
          <Building2 size={16} color="#7170ff" />
          <span style={{ position: 'absolute', right: -3, top: -3, width: 7, height: 7, borderRadius: '50%', background: '#22c55e', border: '1.5px solid #fff' }} />
        </span>
        <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Oficina</span>
        <span style={{ color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {cerca.length
            ? `· ${hablando.length ? '🔊 ' : ''}con ${cerca.map((j) => j.nombre.split(' ')[0]).join(', ')}`
            : `· ${of.listaUI.length + 1} en línea`}
        </span>
      </Link>
      <button type="button" onClick={() => void of.alternarMic()} title={of.micOn ? 'Silenciar micrófono' : 'Activar micrófono'}
        style={{ width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: of.micOn ? '#7170ff' : '#fee2e2', color: of.micOn ? '#fff' : '#dc2626', marginLeft: 4 }}>
        {of.micOn ? <Mic size={15} /> : <MicOff size={15} />}
      </button>
      <button type="button" onClick={of.salirManual} title="Salir de la oficina"
        style={{ width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f1f2f6', color: '#64748b' }}>
        <LogOut size={14} />
      </button>
    </div>
  )
}
