'use client'

/* ChatFlotante — chat interno del equipo, persona a persona (estilo Telegram).
   Pedro 24-sep-2026: "un chat flotante de mensajes en el sistema" + "emojis,
   capturas de pantalla arrastrando o desde el cel, cópiate de Telegram".

   - Burbuja fija abajo a la derecha con el total de no leídos.
   - Panel: lista del equipo → conversación con una persona.
   - Texto, emojis (panel con categorías) e imágenes: botón 📎 (en el celular
     abre cámara/galería), pegar con Cmd/Ctrl+V o arrastrar al chat. Las
     imágenes se comprimen en el navegador antes de subir (~200 KB).
   - Mensajes en vivo por Supabase Realtime, con reconexión automática y
     re-sincronización cada 20 s por si se pierde algún evento.
   - Sonido al recibir y notificación del sistema si la app está en segundo
     plano (funciona aunque el push de Apple falle en Safari/Mac).
   - Desktop: panel 380×560 anclado a la burbuja. Mobile: pantalla completa.
   - `?chat=<team_member_id>` en la URL abre esa conversación (lo usa el push). */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ImagePlus, Loader2, MessageCircle, Paperclip, Send, Smile, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  detalleMensajeGrupo, enviarMensaje, enviarMensajeGrupo, getChatInicial, getConversacion, getConversacionGrupo,
  marcarLeidos, marcarLeidosGrupo, prepararImagen, urlImagen,
} from '@/lib/mensajes/actions'
import { GRUPO_ID, GRUPO_NOMBRE, MENSAJE_MAX, rowToMensaje, rowToMensajeGrupo, vistaPrevia, type ChatInicial, type ContactoChat, type MensajeDirecto } from '@/lib/mensajes/types'
import { comprimirImagen } from '@/lib/mensajes/comprimir'
import { sonarMensaje } from '@/lib/sonido/sonidos'
import { EmojiPanel } from './chat/EmojiPanel'

const ACENTO = '#ba41f7'
const TZ = 'America/Lima'
const MAX_IMAGENES = 10
const MQ_MOBILE = '(max-width: 767px)'
/* Libera las vistas previas de imágenes sin enviar (al cambiar de chat). */
function sinPendientes(prev: Pendiente[]): Pendiente[] {
  prev.forEach((p) => URL.revokeObjectURL(p.preview))
  return []
}
function suscribirMobile(cb: () => void) {
  const mq = window.matchMedia(MQ_MOBILE)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

function horaLima(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
}
function diaLima(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso))
}
/* Para la lista: hora si es de hoy, "ayer", o fecha corta. */
function cuandoCorto(iso: string): string {
  const hoy = diaLima(new Date().toISOString())
  const ayer = diaLima(new Date(Date.now() - 86_400_000).toISOString())
  const d = diaLima(iso)
  if (d === hoy) return horaLima(iso)
  if (d === ayer) return 'ayer'
  return new Intl.DateTimeFormat('es-PE', { timeZone: TZ, day: 'numeric', month: 'short' }).format(new Date(iso))
}
/* Separador de día dentro de la conversación. */
function etiquetaDia(iso: string): string {
  const hoy = diaLima(new Date().toISOString())
  const ayer = diaLima(new Date(Date.now() - 86_400_000).toISOString())
  const d = diaLima(iso)
  if (d === hoy) return 'Hoy'
  if (d === ayer) return 'Ayer'
  return new Intl.DateTimeFormat('es-PE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso))
}

/* Como Telegram: un mensaje de 1 a 3 emojis solos se muestra grande, sin globo. */
const SOLO_EMOJI = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u
function emojisGrandes(texto: string): boolean {
  const t = texto.trim()
  if (!t || !SOLO_EMOJI.test(t) || /^[\d#*\s]+$/.test(t)) return false
  const n = [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(t.replace(/\s/g, ''))].length
  return n >= 1 && n <= 3
}

function Avatar({ c, size = 34 }: { c: Pick<ContactoChat, 'nombre' | 'avatarUrl'> & { id?: string }; size?: number }) {
  const inicial = (c.nombre.trim()[0] ?? '?').toUpperCase()
  if (c.id === GRUPO_ID) {
    return (
      <span aria-hidden style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0, color: '#fff',
        background: 'linear-gradient(135deg, #7170ff, #ba41f7)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Users size={size * 0.48} strokeWidth={2.2} />
      </span>
    )
  }
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: c.avatarUrl ? `url(${c.avatarUrl}) center/cover` : 'rgba(186,65,247,0.12)',
        color: ACENTO, fontSize: size * 0.4, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {c.avatarUrl ? null : inicial}
    </span>
  )
}

type Pendiente = { id: string; file: File; preview: string }

/* Color estable por persona para su nombre en el grupo (como Telegram). */
const COLORES_NOMBRE = ['#7c3aed', '#0891b2', '#db2777', '#059669', '#ea580c', '#2563eb', '#ca8a04', '#9333ea']
function colorNombre(id: string): string {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return COLORES_NOMBRE[h % COLORES_NOMBRE.length]
}

/* Notificación del sistema generada por la propia app (no push): funciona
   mientras la app esté abierta aunque esté minimizada. Mismo `tag` que el push
   del servidor → si llegan los dos, el sistema muestra uno solo. */
async function notificarLocal(titulo: string, cuerpo: string, deId: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const opciones = {
      body: cuerpo,
      icon: '/icons/icon-192.png',
      badge: '/favicon-32.png',
      tag: `chat-${deId}`,
      renotify: true,
      silent: false,
      data: { url: `/inicio?chat=${deId}` },
    } as NotificationOptions
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(titulo, opciones)
    else new Notification(titulo, opciones)
  } catch { /* sin notificación: queda el sonido y el contador */ }
}

export function ChatFlotante() {
  const [chat, setChat] = useState<ChatInicial | null>(null)
  const [open, setOpen] = useState(false)
  const [activoId, setActivoId] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<MensajeDirecto[]>([])
  const [cargandoConv, setCargandoConv] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pendientes, setPendientes] = useState<Pendiente[]>([])
  const [emojiAbierto, setEmojiAbierto] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [visor, setVisor] = useState<string | null>(null)
  const isMobile = useSyncExternalStore(suscribirMobile, () => window.matchMedia(MQ_MOBILE).matches, () => false)

  const listaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const archivoRef = useRef<HTMLInputElement>(null)
  /* Refs para que el callback de Realtime (se registra una vez) lea el estado actual. */
  const openRef = useRef(open)
  const activoRef = useRef(activoId)
  const chatRef = useRef(chat)
  useEffect(() => { openRef.current = open }, [open])
  useEffect(() => { activoRef.current = activoId }, [activoId])
  useEffect(() => { chatRef.current = chat }, [chat])

  const yoId = chat?.yo.id ?? null
  const esGrupo = activoId === GRUPO_ID
  const activo: ContactoChat | null = esGrupo && chat
    ? { id: GRUPO_ID, nombre: GRUPO_NOMBRE, avatarUrl: null, rolBase: null, ultimo: null, noLeidos: 0 }
    : chat?.contactos.find((c) => c.id === activoId) ?? null
  const totalNoLeidos = (chat?.contactos.reduce((s, c) => s + c.noLeidos, 0) ?? 0) + (chat?.grupo.noLeidos ?? 0)
  /* Último total conocido, para detectar mensajes nuevos al re-sincronizar. */
  const noLeidosRef = useRef<number | null>(null)
  useEffect(() => { noLeidosRef.current = chat ? totalNoLeidos : null }, [chat, totalNoLeidos])

  /* Si el usuario no es miembro del equipo, getChatInicial falla y el chat no aparece. */
  const resincronizar = useCallback(async () => {
    const [lista, conv] = await Promise.all([
      getChatInicial(),
      openRef.current && activoRef.current
        ? (activoRef.current === GRUPO_ID ? getConversacionGrupo() : getConversacion(activoRef.current))
        : null,
    ])
    if (conv?.ok) {
      const nuevos = conv.mensajes
      setMensajes((prev) => {
        const ids = new Set(prev.map((m) => m.id))
        const faltan = nuevos.filter((m) => !ids.has(m.id))
        return faltan.length ? [...prev, ...faltan].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : prev
      })
      if (activoRef.current === GRUPO_ID) void marcarLeidosGrupo()
      else if (activoRef.current && nuevos.some((m) => m.deId === activoRef.current && !m.leidoAt)) {
        void marcarLeidos(activoRef.current)
      }
    }
    if (lista.ok) {
      const activoActual = openRef.current ? activoRef.current : null
      const contactos = lista.data.contactos.map((c) => (c.id === activoActual ? { ...c, noLeidos: 0 } : c))
      const grupo = activoActual === GRUPO_ID ? { ...lista.data.grupo, noLeidos: 0 } : lista.data.grupo
      /* Sonido si apareció algo sin leer que el canal en vivo no trajo. */
      const total = contactos.reduce((s, c) => s + c.noLeidos, 0) + grupo.noLeidos
      if (noLeidosRef.current !== null && total > noLeidosRef.current) sonarMensaje()
      setChat({ ...lista.data, contactos, grupo })
    }
  }, [])

  /* Actualiza la fila del contacto en la lista con un mensaje nuevo. */
  const tocarContacto = useCallback((m: MensajeDirecto, yo: string, sumarNoLeido: boolean) => {
    const otroId = m.deId === yo ? m.paraId : m.deId
    setChat((prev) => {
      if (!prev) return prev
      const contactos = prev.contactos.map((c) =>
        c.id !== otroId ? c : {
          ...c,
          ultimo: { texto: vistaPrevia(m.texto, !!m.adjunto), createdAt: m.createdAt, esMio: m.deId === yo },
          noLeidos: sumarNoLeido ? c.noLeidos + 1 : c.noLeidos,
        })
      const i = contactos.findIndex((c) => c.id === otroId)
      if (i > 0) contactos.unshift(...contactos.splice(i, 1))
      return { ...prev, contactos }
    })
  }, [])

  /* Actualiza la fila del grupo "Equipo Distinto" con un mensaje nuevo. */
  const tocarGrupo = useCallback((m: MensajeDirecto, yo: string, sumarNoLeido: boolean) => {
    setChat((prev) => prev && {
      ...prev,
      grupo: {
        ultimo: { texto: vistaPrevia(m.texto, !!m.adjunto), createdAt: m.createdAt, esMio: m.deId === yo, deNombre: m.deNombre ?? null },
        noLeidos: sumarNoLeido ? prev.grupo.noLeidos + 1 : prev.grupo.noLeidos,
      },
    })
  }, [])

  /* Agrega un mensaje a la conversación abierta; si trae imagen, pide su URL. */
  const agregarMensaje = useCallback((m: MensajeDirecto) => {
    setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    if (m.paraId === GRUPO_ID) {
      // Del grupo: completar nombre del autor e imagen si faltan.
      if ((m.adjunto && !m.adjunto.url) || !m.deNombre) {
        void detalleMensajeGrupo(m.id).then((r) => {
          if (!r.ok) return
          setMensajes((prev) => prev.map((x) => (x.id !== m.id ? x : {
            ...x,
            deNombre: x.deNombre ?? r.deNombre,
            adjunto: x.adjunto ? { ...x.adjunto, url: x.adjunto.url ?? r.url } : null,
          })))
        })
      }
    } else if (m.adjunto && !m.adjunto.url) {
      void urlImagen(m.id).then((r) => {
        if (!r.ok) return
        setMensajes((prev) => prev.map((x) => (x.id === m.id && x.adjunto ? { ...x, adjunto: { ...x.adjunto, url: r.url } } : x)))
      })
    }
  }, [])

  /* Realtime: escuchamos lo que me mandan y lo que mando (otro dispositivo).
     RLS solo entrega filas donde soy participante. */
  useEffect(() => {
    if (!yoId) return
    let supabase: ReturnType<typeof createClient>
    try { supabase = createClient() } catch { return }

    const onInsert = (payload: { new: unknown }) => {
      const m = rowToMensaje(payload.new)
      const otroId = m.deId === yoId ? m.paraId : m.deId
      const viendoEsta = openRef.current && activoRef.current === otroId && document.visibilityState === 'visible'
      const esParaMi = m.paraId === yoId

      if (esParaMi) {
        sonarMensaje()
        /* App en segundo plano (minimizada / otra pestaña) → aviso del sistema. */
        if (document.visibilityState !== 'visible') {
          const nombre = chatRef.current?.contactos.find((c) => c.id === m.deId)?.nombre ?? 'Mensaje nuevo'
          void notificarLocal(`💬 ${nombre}`, vistaPrevia(m.texto, !!m.adjunto), m.deId)
        }
      }
      if (openRef.current && activoRef.current === otroId) {
        agregarMensaje(m)
        if (esParaMi && viendoEsta) void marcarLeidos(otroId)
      }
      tocarContacto(m, yoId, esParaMi && !viendoEsta)
    }

    /* Mensajes del grupo "Equipo Distinto" (RLS: solo miembros activos). */
    const onInsertGrupo = (payload: { new: unknown }) => {
      const raw = payload.new as { de_id?: string }
      const deNombre = raw.de_id === yoId ? chatRef.current?.yo.nombre ?? null : chatRef.current?.contactos.find((c) => c.id === raw.de_id)?.nombre ?? null
      const m = rowToMensajeGrupo(payload.new, deNombre)
      const abierto = openRef.current && activoRef.current === GRUPO_ID
      const viendo = abierto && document.visibilityState === 'visible'
      const mio = m.deId === yoId
      if (!mio) {
        sonarMensaje()
        if (document.visibilityState !== 'visible') {
          void notificarLocal(`💬 ${GRUPO_NOMBRE} · ${deNombre ?? 'Equipo'}`, vistaPrevia(m.texto, !!m.adjunto), GRUPO_ID)
        }
      }
      if (abierto) {
        agregarMensaje(m)
        if (!mio && viendo) void marcarLeidosGrupo()
      }
      tocarGrupo(m, yoId, !mio && !viendo)
    }

    /* La conexión en vivo se puede caer (Mac en reposo, cambio de wifi, app
       en segundo plano). Si el canal falla o se cierra, lo rearmamos y
       re-sincronizamos para no perder mensajes. */
    let canal: ReturnType<typeof supabase.channel> | null = null
    let reintento: ReturnType<typeof setTimeout> | null = null
    let cerrado = false

    const conectar = () => {
      if (cerrado) return
      if (canal) void supabase.removeChannel(canal)
      canal = supabase
        .channel(`chat:${yoId}:${Date.now()}`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'mensajes_directos', filter: `para_id=eq.${yoId}` }, onInsert)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'mensajes_directos', filter: `de_id=eq.${yoId}` }, onInsert)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'mensajes_grupo' }, onInsertGrupo)
        .subscribe((estado) => {
          if (cerrado) return
          if (estado === 'SUBSCRIBED') {
            void resincronizar()
          } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') {
            if (reintento) clearTimeout(reintento)
            reintento = setTimeout(conectar, 3000)
          }
        })
    }
    conectar()

    /* Al volver a la pestaña o recuperar internet: re-sincronizar y reconectar. */
    const reconectarSiHaceFalta = () => { if (canal?.state !== 'joined') conectar() }
    const onVisible = () => {
      if (document.visibilityState === 'visible') { void resincronizar(); reconectarSiHaceFalta() }
    }
    const onOnline = () => { void resincronizar(); reconectarSiHaceFalta() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    /* Red de seguridad: cada 20 s con la pestaña visible revisamos si hay
       algo nuevo, por si un evento se perdió sin que el canal avisara. */
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') void resincronizar()
    }, 20_000)

    return () => {
      cerrado = true
      if (reintento) clearTimeout(reintento)
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      if (canal) void supabase.removeChannel(canal)
    }
  }, [yoId, tocarContacto, tocarGrupo, resincronizar, agregarMensaje])

  const abrirConversacion = useCallback(async (id: string) => {
    setActivoId(id)
    setOpen(true)
    setMensajes([])
    setPendientes(sinPendientes)
    setEmojiAbierto(false)
    setCargandoConv(true)
    const grupo = id === GRUPO_ID
    const r = grupo ? await getConversacionGrupo() : await getConversacion(id)
    setCargandoConv(false)
    if (r.ok) setMensajes(r.mensajes)
    else toast.error(r.error)
    if (grupo) {
      setChat((prev) => prev && { ...prev, grupo: { ...prev.grupo, noLeidos: 0 } })
      void marcarLeidosGrupo()
    } else {
      setChat((prev) => prev && { ...prev, contactos: prev.contactos.map((c) => (c.id === id ? { ...c, noLeidos: 0 } : c)) })
      void marcarLeidos(id)
    }
  }, [])

  /* Carga inicial. `?chat=<id>` en la URL (viene del push) abre esa conversación. */
  useEffect(() => {
    getChatInicial().then((r) => {
      if (!r.ok) return
      setChat(r.data)
      const params = new URLSearchParams(window.location.search)
      const id = params.get('chat')
      if (!id || (id !== GRUPO_ID && !r.data.contactos.some((c) => c.id === id))) return
      void abrirConversacion(id)
      params.delete('chat')
      const qs = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
    })
  }, [abrirConversacion])

  /* Autoscroll al último mensaje y foco en la caja. */
  useEffect(() => {
    const el = listaRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mensajes, activoId, pendientes.length])
  useEffect(() => {
    if (open && activoId && !isMobile) inputRef.current?.focus()
  }, [open, activoId, isMobile])

  /* Escape: cierra el visor, luego los emojis, luego el panel. En mobile
     bloqueamos el scroll de atrás. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (visor) setVisor(null)
      else if (emojiAbierto) setEmojiAbierto(false)
      else setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    let prevOverflow: string | null = null
    if (isMobile) { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' }
    return () => {
      window.removeEventListener('keydown', onKey)
      if (prevOverflow !== null) document.body.style.overflow = prevOverflow
    }
  }, [open, isMobile, visor, emojiAbierto])

  const agregarArchivos = useCallback((files: FileList | File[]) => {
    const imagenes = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (imagenes.length === 0) {
      if (Array.from(files).length) toast.error('Por ahora solo se pueden enviar imágenes.')
      return
    }
    setPendientes((prev) => {
      const espacio = MAX_IMAGENES - prev.length
      if (imagenes.length > espacio) toast.error(`Máximo ${MAX_IMAGENES} imágenes por envío.`)
      return [...prev, ...imagenes.slice(0, Math.max(0, espacio)).map((file) => ({
        id: crypto.randomUUID(), file, preview: URL.createObjectURL(file),
      }))]
    })
    inputRef.current?.focus()
  }, [])

  function insertarEmoji(e: string) {
    const el = inputRef.current
    const ini = el?.selectionStart ?? texto.length
    const fin = el?.selectionEnd ?? texto.length
    const nuevo = (texto.slice(0, ini) + e + texto.slice(fin)).slice(0, MENSAJE_MAX)
    setTexto(nuevo)
    requestAnimationFrame(() => {
      if (!el) return
      const pos = ini + e.length
      el.setSelectionRange(pos, pos)
      if (!isMobile) el.focus()
    })
  }

  /* Sube una imagen (comprimida) y la manda como mensaje. */
  async function subirYEnviar(paraId: string, p: Pendiente, caption: string): Promise<MensajeDirecto | null> {
    const img = await comprimirImagen(p.file)
    const prep = await prepararImagen(img.tipo, img.blob.size)
    if (!prep.ok) throw new Error(prep.error)
    const { bucket, path, token } = prep.subida
    const up = await createClient().storage.from(bucket).uploadToSignedUrl(path, token, img.blob, { contentType: img.tipo })
    if (up.error) throw new Error('No se pudo subir la imagen.')
    const adj = { ref: prep.subida.ref, tipo: img.tipo, ancho: img.ancho, alto: img.alto, bytes: img.blob.size }
    const r = paraId === GRUPO_ID ? await enviarMensajeGrupo(caption, adj) : await enviarMensaje(paraId, caption, adj)
    if (!r.ok) throw new Error(r.error)
    return r.mensaje
  }

  async function enviar() {
    const limpio = texto.trim()
    if ((!limpio && pendientes.length === 0) || !activoId || !yoId || enviando) return
    setEnviando(true)
    setEmojiAbierto(false)
    const paraId = activoId
    try {
      if (pendientes.length > 0) {
        /* Como Telegram: el texto va como pie de la primera imagen. */
        const lote = pendientes
        for (let i = 0; i < lote.length; i++) {
          const m = await subirYEnviar(paraId, lote[i], i === 0 ? limpio : '')
          if (m) { agregarMensaje(m); if (paraId === GRUPO_ID) tocarGrupo(m, yoId, false); else tocarContacto(m, yoId, false) }
          URL.revokeObjectURL(lote[i].preview)
          setPendientes((prev) => prev.filter((x) => x.id !== lote[i].id))
        }
        setTexto('')
      } else {
        const r = paraId === GRUPO_ID ? await enviarMensajeGrupo(limpio) : await enviarMensaje(paraId, limpio)
        if (!r.ok) { toast.error(r.error); return }
        setTexto('')
        agregarMensaje(r.mensaje)
        if (paraId === GRUPO_ID) tocarGrupo(r.mensaje, yoId, false)
        else tocarContacto(r.mensaje, yoId, false)
      }
      if (!isMobile) inputRef.current?.focus()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo enviar.')
    } finally {
      setEnviando(false)
    }
  }

  if (!chat) return null

  const PANEL_W = 380
  const PANEL_H = 560
  /* En mobile la burbuja sube para no tapar el "+" flotante de /inicio. */
  const burbujaBottom = isMobile ? 76 : 20
  const puedeEnviar = (texto.trim().length > 0 || pendientes.length > 0) && !enviando

  /* Arrastrar archivos: solo reaccionamos a arrastres con archivos. */
  const conArchivos = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

  return (
    <>
      {!(open && isMobile) && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`Mensajes${totalNoLeidos ? ` (${totalNoLeidos} sin leer)` : ''}`}
          title="Mensajes del equipo"
          style={{
            position: 'fixed', right: 20, bottom: `calc(${burbujaBottom}px + env(safe-area-inset-bottom, 0px))`,
            width: 52, height: 52, borderRadius: '50%',
            background: ACENTO, color: '#fff', border: 'none',
            boxShadow: '0 8px 24px -6px rgba(186,65,247,0.55), 0 2px 6px rgba(16,24,40,0.12)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9000, cursor: 'pointer',
            transition: 'transform 120ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {open ? <X size={22} strokeWidth={2.2} /> : <MessageCircle size={23} strokeWidth={2} />}
          {totalNoLeidos > 0 && !open && (
            <span
              style={{
                position: 'absolute', top: -3, right: -3,
                minWidth: 20, height: 20, padding: '0 5px', borderRadius: 999,
                background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 2px var(--mk-bg-base, #fff)',
              }}
            >
              {totalNoLeidos > 9 ? '9+' : totalNoLeidos}
            </span>
          )}
        </button>
      )}

      {open && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-label="Mensajes del equipo"
          onDragEnter={(e) => { if (activo && conArchivos(e)) { e.preventDefault(); setArrastrando(true) } }}
          onDragOver={(e) => { if (activo && conArchivos(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastrando(false) }}
          onDrop={(e) => {
            if (!activo || !conArchivos(e)) return
            e.preventDefault()
            setArrastrando(false)
            agregarArchivos(e.dataTransfer.files)
          }}
          style={{
            position: 'fixed',
            ...(isMobile
              ? { inset: 0 }
              : { right: 20, bottom: 84, width: PANEL_W, height: `min(${PANEL_H}px, calc(100vh - 110px))` }),
            zIndex: 9001,
            background: '#fff',
            borderRadius: isMobile ? 0 : 16,
            border: isMobile ? 'none' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: isMobile ? 'none' : '0 16px 48px rgba(0,0,0,0.22)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : 0,
            paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 0,
          }}
        >
          {/* Capa "suelta aquí" al arrastrar imágenes */}
          {arrastrando && activo && (
            <div style={{
              position: 'absolute', inset: 8, zIndex: 5, borderRadius: 14,
              border: `2px dashed ${ACENTO}`, background: 'rgba(186,65,247,0.08)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: ACENTO, fontSize: 14, fontWeight: 600, pointerEvents: 'none',
            }}>
              <ImagePlus size={30} />
              Suelta la imagen para enviarla a {activo.nombre}
            </div>
          )}

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', borderBottom: '1px solid #f1f1f3', flexShrink: 0,
          }}>
            {activo ? (
              <>
                <button
                  type="button" onClick={() => { setActivoId(null); setPendientes(sinPendientes) }} aria-label="Volver a la lista"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2, lineHeight: 0 }}
                >
                  <ArrowLeft size={18} />
                </button>
                <Avatar c={activo} size={30} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activo.nombre}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                Mensajes {totalNoLeidos > 0 && <span style={{ color: '#94a3b8', fontWeight: 500 }}>· {totalNoLeidos} sin leer</span>}
              </div>
            )}
            <button
              type="button" onClick={() => setOpen(false)} aria-label="Cerrar"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, lineHeight: 0 }}
            >
              <X size={18} />
            </button>
          </div>

          {!activo ? (
            /* ===== Lista del equipo ===== */
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* El grupo de todo el equipo va fijo arriba; luego los chats 1 a 1. */}
              {[
                {
                  id: GRUPO_ID, nombre: GRUPO_NOMBRE, avatarUrl: null, rolBase: null,
                  noLeidos: chat.grupo.noLeidos,
                  ultimo: chat.grupo.ultimo
                    ? { ...chat.grupo.ultimo, esMio: chat.grupo.ultimo.esMio, texto: chat.grupo.ultimo.esMio || !chat.grupo.ultimo.deNombre ? chat.grupo.ultimo.texto : `${chat.grupo.ultimo.deNombre.split(' ')[0]}: ${chat.grupo.ultimo.texto}` }
                    : null,
                } as ContactoChat,
                ...chat.contactos,
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void abrirConversacion(c.id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    background: 'transparent', border: 'none', borderBottom: '1px solid #f6f6f7',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <Avatar c={c} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{
                        flex: 1, minWidth: 0, fontSize: 13, fontWeight: c.noLeidos ? 700 : 600, color: '#0f172a',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.nombre}
                      </span>
                      {c.ultimo && (
                        <span style={{ fontSize: 11, color: c.noLeidos ? ACENTO : '#94a3b8', flexShrink: 0 }}>
                          {cuandoCorto(c.ultimo.createdAt)}
                        </span>
                      )}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{
                        flex: 1, minWidth: 0, fontSize: 12, color: c.noLeidos ? '#334155' : '#64748b',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.ultimo ? `${c.ultimo.esMio ? 'Tú: ' : ''}${c.ultimo.texto}` : c.id === GRUPO_ID ? 'Mensaje para todo el equipo' : 'Escríbele un mensaje'}
                      </span>
                      {c.noLeidos > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999,
                          background: ACENTO, color: '#fff', fontSize: 10.5, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {c.noLeidos > 9 ? '9+' : c.noLeidos}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            /* ===== Conversación ===== */
            <>
              <div ref={listaRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px', background: '#fafafb' }}>
                {cargandoConv ? (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12.5, color: '#94a3b8' }}>Cargando…</div>
                ) : mensajes.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Empieza la conversación</div>
                    <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 3 }}>{esGrupo ? 'Todo el equipo ve y responde estos mensajes.' : `Solo tú y ${activo.nombre} ven estos mensajes.`}</div>
                    <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 10 }}>Puedes pegar o arrastrar capturas aquí.</div>
                  </div>
                ) : mensajes.map((m, i) => {
                  const mio = m.deId === yoId
                  const nuevoDia = i === 0 || diaLima(mensajes[i - 1].createdAt) !== diaLima(m.createdAt)
                  const pegado = !nuevoDia && i > 0 && mensajes[i - 1].deId === m.deId
                  const grande = !m.adjunto && emojisGrandes(m.texto)
                  const ratio = m.adjunto?.ancho && m.adjunto?.alto ? m.adjunto.ancho / m.adjunto.alto : 4 / 3
                  return (
                    <div key={m.id}>
                      {nuevoDia && (
                        <div style={{ textAlign: 'center', margin: '10px 0 8px' }}>
                          <span style={{ fontSize: 10.5, fontWeight: 500, color: '#64748b', background: '#eef0f3', padding: '3px 9px', borderRadius: 999, textTransform: 'capitalize' }}>
                            {etiquetaDia(m.createdAt)}
                          </span>
                        </div>
                      )}
                      {esGrupo && !mio && !pegado && (
                        <div style={{ fontSize: 11, fontWeight: 600, color: colorNombre(m.deId), margin: '8px 0 -4px 6px' }}>
                          {m.deNombre ?? 'Equipo'}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: mio ? 'flex-end' : 'flex-start', marginTop: pegado ? 2 : 8 }}>
                        {grande ? (
                          <div style={{ textAlign: mio ? 'right' : 'left' }}>
                            <div style={{ fontSize: 40, lineHeight: 1.15 }}>{m.texto.trim()}</div>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>{horaLima(m.createdAt)}</span>
                          </div>
                        ) : (
                          <div style={{
                            maxWidth: '78%',
                            padding: m.adjunto ? 3 : '7px 10px 5px',
                            borderRadius: 14,
                            borderBottomRightRadius: mio ? 4 : 14,
                            borderBottomLeftRadius: mio ? 14 : 4,
                            background: mio ? ACENTO : '#fff',
                            color: mio ? '#fff' : '#0f172a',
                            border: mio ? 'none' : '1px solid rgba(0,0,0,0.06)',
                            fontSize: 13, lineHeight: 1.4,
                            whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                          }}>
                            {m.adjunto && (
                              <button
                                type="button"
                                onClick={() => m.adjunto?.url && setVisor(m.adjunto.url)}
                                aria-label="Ver imagen"
                                style={{
                                  display: 'block', padding: 0, border: 'none', cursor: 'zoom-in',
                                  width: Math.min(240, 240 * Math.min(1, ratio * 1.1)), maxWidth: '100%',
                                  aspectRatio: String(ratio), maxHeight: 320,
                                  borderRadius: 11, overflow: 'hidden',
                                  background: mio ? 'rgba(255,255,255,0.18)' : '#eef0f3',
                                }}
                              >
                                {m.adjunto.url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={m.adjunto.url} alt="Imagen" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                ) : (
                                  <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                    <Loader2 size={18} className="animate-spin" />
                                  </span>
                                )}
                              </button>
                            )}
                            <div style={{ padding: m.adjunto ? (m.texto ? '5px 7px 2px' : '0 7px 2px') : 0 }}>
                              {m.texto}
                              <span style={{
                                display: 'block', textAlign: 'right', fontSize: 10, marginTop: m.adjunto && !m.texto ? 3 : 2,
                                color: mio ? 'rgba(255,255,255,0.75)' : '#94a3b8',
                              }}>
                                {horaLima(m.createdAt)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Imágenes listas para enviar (el texto va como pie de la primera) */}
              {pendientes.length > 0 && (
                <div style={{ display: 'flex', gap: 8, padding: '10px 10px 0', overflowX: 'auto', background: '#fff', borderTop: '1px solid #f1f1f3', flexShrink: 0 }}>
                  {pendientes.map((p) => (
                    <div key={p.id} style={{ position: 'relative', flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.preview} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, display: 'block', opacity: enviando ? 0.5 : 1 }} />
                      {!enviando && (
                        <button
                          type="button"
                          aria-label="Quitar imagen"
                          onClick={() => { URL.revokeObjectURL(p.preview); setPendientes((prev) => prev.filter((x) => x.id !== p.id)) }}
                          style={{
                            position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                            background: '#0f172a', color: '#fff', border: '2px solid #fff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                          }}
                        >
                          <X size={11} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Caja: 😊 emojis · 📎 imagen · texto · enviar. Enter envía, Shift+Enter salto. */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: 10, borderTop: pendientes.length ? 'none' : '1px solid #f1f1f3', background: '#fff', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setEmojiAbierto((v) => !v)}
                  aria-label="Emojis"
                  title="Emojis"
                  style={{
                    width: 34, height: 38, borderRadius: 10, flexShrink: 0, border: 'none', cursor: 'pointer',
                    background: emojiAbierto ? 'rgba(186,65,247,0.12)' : 'transparent',
                    color: emojiAbierto ? ACENTO : '#64748b',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Smile size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => archivoRef.current?.click()}
                  aria-label="Adjuntar imagen"
                  title="Adjuntar imagen (también puedes pegar o arrastrar)"
                  style={{
                    width: 34, height: 38, borderRadius: 10, flexShrink: 0, border: 'none', cursor: 'pointer',
                    background: 'transparent', color: '#64748b',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Paperclip size={19} />
                </button>
                <input
                  ref={archivoRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => { if (e.target.files) agregarArchivos(e.target.files); e.target.value = '' }}
                />
                <textarea
                  ref={inputRef}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value.slice(0, MENSAJE_MAX))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault()
                      void enviar()
                    }
                  }}
                  onPaste={(e) => {
                    const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
                    if (files.length) { e.preventDefault(); agregarArchivos(files) }
                  }}
                  placeholder={pendientes.length ? 'Agrega un comentario…' : `Mensaje para ${activo.nombre}`}
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', maxHeight: 120, minHeight: 38, minWidth: 0,
                    padding: '9px 12px', borderRadius: 12,
                    border: '1px solid var(--mk-border-subtle, rgba(0,0,0,0.10))',
                    background: '#f8f8fa', outline: 'none',
                    fontSize: isMobile ? 16 : 13, lineHeight: 1.4, fontFamily: 'inherit', color: '#0f172a',
                    fieldSizing: 'content',
                  } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => void enviar()}
                  disabled={!puedeEnviar}
                  aria-label="Enviar"
                  style={{
                    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                    background: puedeEnviar || enviando ? ACENTO : '#e5e7eb',
                    color: '#fff', border: 'none',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    cursor: puedeEnviar ? 'pointer' : 'default',
                  }}
                >
                  {enviando ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} strokeWidth={2.2} />}
                </button>
              </div>

              {emojiAbierto && <EmojiPanel onElegir={insertarEmoji} />}
            </>
          )}
        </div>,
        document.body,
      )}

      {/* Visor de imagen a pantalla completa */}
      {visor && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-label="Imagen"
          onClick={() => setVisor(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(10,10,15,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={visor} alt="Imagen" style={{ maxWidth: '94vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
          <button
            type="button" aria-label="Cerrar" onClick={() => setVisor(null)}
            style={{
              position: 'absolute', top: 'calc(14px + env(safe-area-inset-top, 0px))', right: 14,
              width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.14)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}
