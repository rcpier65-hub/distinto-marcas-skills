'use client'

/* ChatFlotante — chat interno del equipo, solo texto, persona a persona.
   Pedro 24-sep-2026: "un chat flotante de mensajes en el sistema".

   - Burbuja fija abajo a la derecha con el total de no leídos.
   - Panel: lista del equipo → conversación con una persona.
   - Mensajes en vivo por Supabase Realtime (postgres_changes). Acá NO usamos
     router.refresh() como el resto de la app: agregamos el mensaje al estado,
     así no se pierde lo que estás escribiendo y llega al instante.
   - Desktop: panel 380×560 anclado a la burbuja. Mobile: hoja a pantalla
     completa (como NotificationBell).
   - `?chat=<team_member_id>` en la URL abre directo esa conversación (lo usa
     el push de mensaje nuevo). */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, MessageCircle, Send, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { enviarMensaje, getChatInicial, getConversacion, marcarLeidos } from '@/lib/mensajes/actions'
import { MENSAJE_MAX, rowToMensaje, type ChatInicial, type ContactoChat, type MensajeDirecto } from '@/lib/mensajes/types'
import { toast } from 'sonner'

const ACENTO = '#ba41f7'
const MQ_MOBILE = '(max-width: 767px)'
function suscribirMobile(cb: () => void) {
  const mq = window.matchMedia(MQ_MOBILE)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const TZ = 'America/Lima'

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

function Avatar({ c, size = 34 }: { c: Pick<ContactoChat, 'nombre' | 'avatarUrl'>; size?: number }) {
  const inicial = (c.nombre.trim()[0] ?? '?').toUpperCase()
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

export function ChatFlotante() {
  const [chat, setChat] = useState<ChatInicial | null>(null)
  const [open, setOpen] = useState(false)
  const [activoId, setActivoId] = useState<string | null>(null)
  const [mensajes, setMensajes] = useState<MensajeDirecto[]>([])
  const [cargandoConv, setCargandoConv] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const isMobile = useSyncExternalStore(suscribirMobile, () => window.matchMedia(MQ_MOBILE).matches, () => false)

  const listaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  /* Refs para que el callback de Realtime (se registra una vez) lea el estado actual. */
  const openRef = useRef(open)
  const activoRef = useRef(activoId)
  useEffect(() => { openRef.current = open }, [open])
  useEffect(() => { activoRef.current = activoId }, [activoId])

  const yoId = chat?.yo.id ?? null
  const activo = chat?.contactos.find((c) => c.id === activoId) ?? null
  const totalNoLeidos = chat?.contactos.reduce((s, c) => s + c.noLeidos, 0) ?? 0

  /* Si el usuario no es miembro del equipo, getChatInicial falla y el chat no aparece. */
  const cargar = useCallback(async () => {
    const r = await getChatInicial()
    if (r.ok) setChat(r.data)
  }, [])

  /* Actualiza la fila del contacto en la lista con un mensaje nuevo. */
  const tocarContacto = useCallback((m: MensajeDirecto, yo: string, sumarNoLeido: boolean) => {
    const otroId = m.deId === yo ? m.paraId : m.deId
    setChat((prev) => {
      if (!prev) return prev
      const contactos = prev.contactos.map((c) =>
        c.id !== otroId ? c : {
          ...c,
          ultimo: { texto: m.texto, createdAt: m.createdAt, esMio: m.deId === yo },
          noLeidos: sumarNoLeido ? c.noLeidos + 1 : c.noLeidos,
        })
      const i = contactos.findIndex((c) => c.id === otroId)
      if (i > 0) contactos.unshift(...contactos.splice(i, 1))
      return { ...prev, contactos }
    })
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
      const viendoEsta = openRef.current && activoRef.current === otroId
      const esParaMi = m.paraId === yoId

      if (viendoEsta) {
        setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
        if (esParaMi) void marcarLeidos(otroId)
      }
      tocarContacto(m, yoId, esParaMi && !viendoEsta)
    }

    const canal = supabase
      .channel(`chat:${yoId}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'mensajes_directos', filter: `para_id=eq.${yoId}` }, onInsert)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'mensajes_directos', filter: `de_id=eq.${yoId}` }, onInsert)
      .subscribe()

    /* Al volver a la pestaña, re-sincronizamos por si se perdió algún evento. */
    const onVisible = () => { if (document.visibilityState === 'visible') void cargar() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(canal)
    }
  }, [yoId, tocarContacto, cargar])

  const abrirConversacion = useCallback(async (id: string) => {
    setActivoId(id)
    setOpen(true)
    setMensajes([])
    setCargandoConv(true)
    const r = await getConversacion(id)
    setCargandoConv(false)
    if (r.ok) setMensajes(r.mensajes)
    else toast.error(r.error)
    setChat((prev) => prev && { ...prev, contactos: prev.contactos.map((c) => (c.id === id ? { ...c, noLeidos: 0 } : c)) })
    void marcarLeidos(id)
  }, [])

  /* Carga inicial. `?chat=<id>` en la URL (viene del push) abre esa conversación. */
  useEffect(() => {
    getChatInicial().then((r) => {
      if (!r.ok) return
      setChat(r.data)
      const params = new URLSearchParams(window.location.search)
      const id = params.get('chat')
      if (!id || !r.data.contactos.some((c) => c.id === id)) return
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
  }, [mensajes, activoId])
  useEffect(() => {
    if (open && activoId && !isMobile) inputRef.current?.focus()
  }, [open, activoId, isMobile])

  /* Escape cierra; en mobile bloqueamos el scroll de atrás. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    let prevOverflow: string | null = null
    if (isMobile) { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' }
    return () => {
      window.removeEventListener('keydown', onKey)
      if (prevOverflow !== null) document.body.style.overflow = prevOverflow
    }
  }, [open, isMobile])

  async function enviar() {
    const limpio = texto.trim()
    if (!limpio || !activoId || !yoId || enviando) return
    setEnviando(true)
    const r = await enviarMensaje(activoId, limpio)
    setEnviando(false)
    if (!r.ok) { toast.error(r.error); return }
    setTexto('')
    setMensajes((prev) => (prev.some((x) => x.id === r.mensaje.id) ? prev : [...prev, r.mensaje]))
    tocarContacto(r.mensaje, yoId, false)
    inputRef.current?.focus()
  }

  if (!chat) return null

  const PANEL_W = 380
  const PANEL_H = 560
  /* En mobile la burbuja sube para no tapar el "+" flotante de /inicio. */
  const burbujaBottom = isMobile ? 76 : 20

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
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', borderBottom: '1px solid #f1f1f3', flexShrink: 0,
          }}>
            {activo ? (
              <>
                <button
                  type="button" onClick={() => setActivoId(null)} aria-label="Volver a la lista"
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
              {chat.contactos.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
                  Todavía no hay más personas en el equipo.
                </div>
              ) : chat.contactos.map((c) => (
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
                        {c.ultimo ? `${c.ultimo.esMio ? 'Tú: ' : ''}${c.ultimo.texto}` : 'Escríbele un mensaje'}
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
                    <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 3 }}>Solo tú y {activo.nombre} ven estos mensajes.</div>
                  </div>
                ) : mensajes.map((m, i) => {
                  const mio = m.deId === yoId
                  const nuevoDia = i === 0 || diaLima(mensajes[i - 1].createdAt) !== diaLima(m.createdAt)
                  const pegado = !nuevoDia && i > 0 && mensajes[i - 1].deId === m.deId
                  return (
                    <div key={m.id}>
                      {nuevoDia && (
                        <div style={{ textAlign: 'center', margin: '10px 0 8px' }}>
                          <span style={{ fontSize: 10.5, fontWeight: 500, color: '#64748b', background: '#eef0f3', padding: '3px 9px', borderRadius: 999, textTransform: 'capitalize' }}>
                            {etiquetaDia(m.createdAt)}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: mio ? 'flex-end' : 'flex-start', marginTop: pegado ? 2 : 8 }}>
                        <div style={{
                          maxWidth: '78%',
                          padding: '7px 10px 5px',
                          borderRadius: 14,
                          borderBottomRightRadius: mio ? 4 : 14,
                          borderBottomLeftRadius: mio ? 14 : 4,
                          background: mio ? ACENTO : '#fff',
                          color: mio ? '#fff' : '#0f172a',
                          border: mio ? 'none' : '1px solid rgba(0,0,0,0.06)',
                          fontSize: 13, lineHeight: 1.4,
                          whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                        }}>
                          {m.texto}
                          <span style={{ display: 'block', textAlign: 'right', fontSize: 10, marginTop: 2, color: mio ? 'rgba(255,255,255,0.75)' : '#94a3b8' }}>
                            {horaLima(m.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Caja de texto: Enter envía, Shift+Enter salto de línea. */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: 10, borderTop: '1px solid #f1f1f3', background: '#fff', flexShrink: 0 }}>
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
                  placeholder={`Mensaje para ${activo.nombre}`}
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', maxHeight: 120, minHeight: 38,
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
                  disabled={!texto.trim() || enviando}
                  aria-label="Enviar"
                  style={{
                    width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                    background: texto.trim() ? ACENTO : '#e5e7eb',
                    color: '#fff', border: 'none',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    cursor: texto.trim() && !enviando ? 'pointer' : 'default',
                    opacity: enviando ? 0.6 : 1,
                  }}
                >
                  <Send size={17} strokeWidth={2.2} />
                </button>
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
