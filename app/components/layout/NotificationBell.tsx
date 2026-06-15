'use client'

/* NotificationBell — campanita del topbar/sidebar. Pedro pidió un
   apartado de notificaciones arriba con lo urgente/pendiente:
   grabación a <2 días sin guion, video por editar próximo, comentarios
   muy atrasados. La data viene pre-agregada del server (getNotificaciones)
   vía el layout. Panel dropdown posicionado con position:fixed sobre el
   rect del botón (robusto contra overflow del sidebar). */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CalendarClock, Scissors, MessageCircle, X } from 'lucide-react'
import type { Notificacion } from '@/lib/notificaciones/get-notificaciones'

const ICONO: Record<Notificacion['tipo'], typeof Bell> = {
  grabacion: CalendarClock,
  editar: Scissors,
  comentario: MessageCircle,
}

export function NotificationBell({ notificaciones }: { notificaciones: Notificacion[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const total = notificaciones.length
  const altas = notificaciones.filter((n) => n.urgencia === 'alta').length

  const recalc = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    /* Panel 340px. Lo anclamos debajo del botón; si se sale por la
       derecha, lo alineamos al borde derecho de la ventana. */
    const width = 340
    let left = r.left
    if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12
    setCoords({ top: r.bottom + 8, left: Math.max(12, left) })
  }, [])

  useEffect(() => {
    if (!open) return
    recalc()
    const onResize = () => recalc()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, recalc])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Notificaciones"
        aria-label={`Notificaciones${total ? ` (${total})` : ''}`}
        style={{
          position: 'relative',
          width: 36, height: 36, borderRadius: 10,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'rgba(186,65,247,0.10)' : 'transparent',
          border: '1px solid var(--mk-border-subtle, rgba(0,0,0,0.08))',
          color: 'var(--mk-text-secondary, #475569)',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <Bell className="w-[18px] h-[18px]" strokeWidth={1.9} />
        {total > 0 && (
          <span
            style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 17, height: 17, padding: '0 4px',
              borderRadius: 999,
              background: altas > 0 ? '#ef4444' : '#f59e0b',
              color: '#fff', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--mk-bg-base, #fff)',
            }}
          >
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop para cerrar al clickear fuera */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 1200 }}
          />
          <div
            style={{
              position: 'fixed',
              top: coords?.top ?? 56,
              left: coords?.left ?? 12,
              width: 340, maxHeight: '70vh',
              zIndex: 1201,
              background: '#fff',
              borderRadius: 16,
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', borderBottom: '1px solid #f1f1f3',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                Notificaciones {total > 0 && <span style={{ color: '#94a3b8', fontWeight: 500 }}>· {total}</span>}
              </div>
              <button
                type="button" onClick={() => setOpen(false)} aria-label="Cerrar"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, lineHeight: 1 }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {total === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }} aria-hidden>✅</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Todo al día</div>
                  <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 3 }}>
                    Sin pendientes urgentes ahora
                  </div>
                </div>
              ) : (
                notificaciones.map((n) => {
                  const Icon = ICONO[n.tipo]
                  const color = n.urgencia === 'alta' ? '#ef4444' : '#f59e0b'
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => { setOpen(false); router.push(n.href) }}
                      style={{
                        width: '100%', textAlign: 'left',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '11px 14px',
                        background: 'transparent', border: 'none',
                        borderBottom: '1px solid #f6f6f7',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{
                        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                        background: `${color}18`, color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon className="w-4 h-4" strokeWidth={2} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          display: 'block', fontSize: 12.5, fontWeight: 600, color: '#0f172a',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {n.marcaEmoji ? `${n.marcaEmoji} ` : ''}{n.titulo}
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: '#64748b', lineHeight: 1.35, marginTop: 1 }}>
                          {n.detalle}
                        </span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
