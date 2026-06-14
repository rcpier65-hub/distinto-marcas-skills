'use client'

/* ReporteDelDia — card al final de /inicio con CTA "Generar mi reporte
   del día". Al click abre un modal que renderiza una "imagen" cuadrada
   1080×1080 estilo app de hábitos. Dos botones abajo:

   - 📷 Copiar imagen → html-to-image genera PNG, lo mete al clipboard
     como ClipboardItem image/png. El user pega directo en WhatsApp.
   - 📋 Copiar resumen → texto formateado con emojis para WhatsApp.

   Objetivo (Pedro): cada chico del equipo manda su reporte diario al
   grupo cuando cierra el día. */

import { useState, useRef, useEffect } from 'react'
import type { ReporteDelDiaData } from '@/lib/inicio/load-reporte-del-dia'

type Props = {
  data: ReporteDelDiaData
}

export function ReporteDelDiaCard({ data }: Props) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [copiando, setCopiando] = useState<null | 'img' | 'txt'>(null)

  /* Toast auto-dismiss a los 2.2s */
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  /* Cerrar con ESC para mejorar accesibilidad / hábito de teclado. */
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  /* Lock body scroll al abrir el modal. iOS especialmente: si no
     lockeamos, el fondo hace bounce y se ve roto. */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const total =
    data.tareasCompletadas.length +
    data.habitosCumplidos.length +
    data.grabacionesHechasCount +
    data.comentariosRespondidosCount

  async function copiarImagen() {
    if (!cardRef.current) return
    setCopiando('img')
    try {
      const { toBlob } = await import('html-to-image')
      // Esperar a que fonts estén cargadas (Inter Tight) — si no, sale con
      // fallback feo.
      if (document.fonts?.ready) await document.fonts.ready
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,        // retina-quality
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: false,
      })
      if (!blob) throw new Error('No se pudo generar el blob')

      /* clipboard.write con ClipboardItem image/png. Falla en navegadores
         que no soportan (Safari iOS <13.4) o sin HTTPS — ahí caemos a
         descarga del PNG como fallback. */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ClipboardItemCtor = (window as any).ClipboardItem
      if (navigator.clipboard?.write && ClipboardItemCtor) {
        await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })])
        setToast('Imagen copiada — pégala en WhatsApp')
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte-${data.fechaIso}-${data.usuarioNombre}.png`
        a.click()
        URL.revokeObjectURL(url)
        setToast('Imagen descargada — adjúntala en WhatsApp')
      }
    } catch (e) {
      console.error('[reporte] copiarImagen:', e)
      setToast('No se pudo copiar la imagen')
    } finally {
      setCopiando(null)
    }
  }

  async function copiarTexto() {
    setCopiando('txt')
    try {
      const lineas: string[] = []
      lineas.push(`📊 *Reporte del día — ${data.usuarioNombre}*`)
      lineas.push(`📅 ${data.fechaLabel}`)
      lineas.push('')

      if (data.tareasCompletadas.length > 0) {
        lineas.push(`✅ *Tareas terminadas (${data.tareasCompletadas.length})*`)
        for (const t of data.tareasCompletadas.slice(0, 12)) {
          const emoji = t.marcaEmoji ?? '•'
          lineas.push(`${emoji} ${t.titulo} _(${t.marca})_`)
        }
        if (data.tareasCompletadas.length > 12) {
          lineas.push(`_…y ${data.tareasCompletadas.length - 12} más_`)
        }
        lineas.push('')
      }

      if (data.habitosTotal > 0) {
        lineas.push(`🌱 *Hábitos (${data.habitosCumplidos.length}/${data.habitosTotal})*`)
        if (data.habitosCumplidos.length > 0) {
          lineas.push(data.habitosCumplidos.map((h) => `${h.icono} ${h.nombre}`).join(' · '))
        } else {
          lineas.push('_Ninguno cumplido todavía_')
        }
        lineas.push('')
      }

      const extras: string[] = []
      if (data.pubsEditadasCount > 0) extras.push(`✂️ ${data.pubsEditadasCount} pub${data.pubsEditadasCount === 1 ? '' : 's'} editada${data.pubsEditadasCount === 1 ? '' : 's'}`)
      if (data.grabacionesHechasCount > 0) extras.push(`🎥 ${data.grabacionesHechasCount} grabación${data.grabacionesHechasCount === 1 ? '' : 'es'}`)
      if (data.comentariosRespondidosCount > 0) extras.push(`💬 ${data.comentariosRespondidosCount} comentario${data.comentariosRespondidosCount === 1 ? '' : 's'} respondido${data.comentariosRespondidosCount === 1 ? '' : 's'}`)
      if (extras.length > 0) {
        lineas.push(extras.join(' · '))
        lineas.push('')
      }

      lineas.push('— _vía Distinto_')

      await navigator.clipboard.writeText(lineas.join('\n'))
      setToast('Resumen copiado — pégalo en WhatsApp')
    } catch (e) {
      console.error('[reporte] copiarTexto:', e)
      setToast('No se pudo copiar el resumen')
    } finally {
      setCopiando(null)
    }
  }

  return (
    <>
      {/* ============= CARD CTA en /inicio ============= */}
      <div
        style={{
          marginTop: 32,
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #ede9fe 0%, #fce7f3 100%)',
          border: '1px solid #e9d5ff',
          borderRadius: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 42, lineHeight: 1 }} aria-hidden>📊</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#581c87', marginBottom: 4 }}>
            ¿Listo para cerrar el día?
          </div>
          <div style={{ fontSize: 14, color: '#6b21a8', lineHeight: 1.4 }}>
            Genera tu reporte con lo que hiciste hoy — tareas, hábitos y métricas — para
            mandarlo al grupo en un toque.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mk-focusable"
          style={{
            padding: '12px 22px',
            background: '#6d28d9',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(109,40,217,0.25)',
          }}
        >
          Generar mi reporte
          <span style={{ fontSize: 12, opacity: 0.85 }}>→</span>
        </button>
      </div>

      {/* ============= MODAL ============= */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            overflowY: 'auto',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 24,
              maxWidth: 480,
              width: '100%',
              maxHeight: '95vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
                Tu reporte del día
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 22,
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* ============= LA "IMAGEN" CUADRADA (1080×1080 scaled) ============= */}
            <div style={{ padding: 20, background: '#f8fafc' }}>
              <ReporteImage data={data} cardRef={cardRef} total={total} />
            </div>

            {/* ============= BOTONES ============= */}
            <div
              style={{
                padding: 16,
                display: 'flex',
                gap: 10,
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <button
                type="button"
                onClick={copiarImagen}
                disabled={copiando !== null}
                className="mk-focusable"
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  background: copiando === 'img' ? '#a78bfa' : '#6d28d9',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: copiando ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: copiando && copiando !== 'img' ? 0.5 : 1,
                }}
              >
                <span aria-hidden>📷</span>
                {copiando === 'img' ? 'Generando…' : 'Copiar imagen'}
              </button>
              <button
                type="button"
                onClick={copiarTexto}
                disabled={copiando !== null}
                className="mk-focusable"
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  background: '#fff',
                  color: '#1e293b',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: copiando ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: copiando && copiando !== 'txt' ? 0.5 : 1,
                }}
              >
                <span aria-hidden>📋</span>
                {copiando === 'txt' ? 'Copiando…' : 'Copiar resumen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============= TOAST ============= */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f172a',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            zIndex: 1100,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'fadeUp 200ms ease-out',
          }}
        >
          <span aria-hidden>✓</span> {toast}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  )
}

/* ============================================================
   ReporteImage — el render visual cuadrado. Lo capturamos con
   html-to-image. Diseño tipo "story de Instagram" con gradiente
   suave, header con avatar, stats grandes, lista de tareas y
   chips de hábitos. Footer con marca Distinto.

   IMPORTANTE: dimensiones fijas en px (no %, no vw) para que el
   capture salga del mismo tamaño en cualquier device. Usamos
   transform: scale para que el preview encaje en el modal sin
   romper el aspect ratio del PNG generado.
   ============================================================ */
function ReporteImage({
  data,
  cardRef,
  total,
}: {
  data: ReporteDelDiaData
  cardRef: React.RefObject<HTMLDivElement | null>
  total: number
}) {
  /* La imagen real es 540×540 (escalada a 1080×1080 en pixelRatio=2 al
     capturar). En el modal la mostramos al 80% del ancho disponible
     para que entre cómoda. */
  const SIZE = 540

  /* Iniciales para fallback de avatar */
  const iniciales = data.usuarioNombreCompleto
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || 'D'

  /* Color por tipo de tarea */
  const COLOR_TIPO: Record<ReporteTareaCompletada['tipo'], { bg: string; label: string; emoji: string }> = {
    editada:    { bg: '#dbeafe', label: 'Editada',  emoji: '✂️' },
    disenada:   { bg: '#fce7f3', label: 'Diseñada', emoji: '🎨' },
    aprobada:   { bg: '#dcfce7', label: 'Aprobada', emoji: '✅' },
    grabada:    { bg: '#fef3c7', label: 'Grabada',  emoji: '🎥' },
    comentario: { bg: '#cffafe', label: 'Respondido', emoji: '💬' },
  }

  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      }}
    >
      <div
        ref={cardRef}
        style={{
          width: SIZE,
          height: SIZE,
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `scale(${1})`,
          transformOrigin: 'top left',
          /* En CSS no podemos saber el ancho exacto del contenedor antes
             del montaje. Usamos un trick: el contenedor padre tiene
             aspect-ratio 1/1 y width: 100%, y este div interno tiene
             dimensiones FIJAS — lo escalamos vía CSS scaling responsive
             usando una variable. Solución pragmática: dimensionar todo
             en valores relativos al SIZE constante. Para el preview el
             usuario ve "fit" si tenemos el width: 100% del padre. Mejor
             usar contenedor real escalado. */
          background: 'linear-gradient(155deg, #f5f3ff 0%, #fdf2f8 50%, #fff7ed 100%)',
          padding: 36,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter Tight, system-ui, sans-serif',
          color: '#0f172a',
          boxSizing: 'border-box',
        }}
      >
        {/* ===== HEADER: avatar + nombre + fecha ===== */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          {data.usuarioAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.usuarioAvatarUrl}
              alt=""
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #fff',
                boxShadow: '0 4px 12px rgba(109,40,217,0.15)',
              }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                color: '#fff',
                fontSize: 22,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid #fff',
                boxShadow: '0 4px 12px rgba(109,40,217,0.15)',
                letterSpacing: -0.5,
              }}
            >
              {iniciales}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.1 }}>
              {data.usuarioNombreCompleto}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{data.usuarioRol}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              Reporte
            </div>
            <div style={{ fontSize: 13, color: '#475569', fontWeight: 500, textTransform: 'capitalize' }}>
              {data.fechaLabel.split(' ').slice(0, 2).join(' ')}
            </div>
          </div>
        </div>

        {/* ===== STATS GRANDES — fila de 4 ===== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            marginBottom: 22,
          }}
        >
          <StatBox emoji="✅" valor={data.tareasCompletadas.length} label="Tareas" color="#16a34a" />
          <StatBox emoji="🌱" valor={`${data.habitosCumplidos.length}/${data.habitosTotal || '—'}`} label="Hábitos" color="#6366f1" />
          <StatBox emoji="🎥" valor={data.grabacionesHechasCount} label="Grab." color="#f59e0b" />
          <StatBox emoji="💬" valor={data.comentariosRespondidosCount} label="Coments" color="#06b6d4" />
        </div>

        {/* ===== TAREAS LISTA ===== */}
        {data.tareasCompletadas.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
              ✓ Lo que terminé
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {data.tareasCompletadas.slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.04)',
                  }}
                >
                  <span style={{ fontSize: 17 }} aria-hidden>{t.marcaEmoji ?? COLOR_TIPO[t.tipo].emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.3,
                    }}>
                      {t.titulo}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>{t.marca}</div>
                  </div>
                  <div style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: COLOR_TIPO[t.tipo].bg ? '#0f172a' : '#64748b',
                    background: COLOR_TIPO[t.tipo].bg,
                    padding: '3px 7px',
                    borderRadius: 999,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    {COLOR_TIPO[t.tipo].label}
                  </div>
                </div>
              ))}
              {data.tareasCompletadas.length > 6 && (
                <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginTop: 2 }}>
                  …y {data.tareasCompletadas.length - 6} más
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== HÁBITOS CHIPS ===== */}
        {data.habitosTotal > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
              🌱 Hábitos del día
            </div>
            {data.habitosCumplidos.length > 0 ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {data.habitosCumplidos.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 11px',
                      background: `${h.color}22`,
                      border: `1px solid ${h.color}44`,
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#1e293b',
                    }}
                  >
                    <span aria-hidden>{h.icono}</span>
                    {h.nombre}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                Sin hábitos cumplidos hoy
              </div>
            )}
          </div>
        )}

        {/* ===== Si no hay NADA, mensaje motivacional ===== */}
        {total === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 20,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden>🌤️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>
              Día tranquilo
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, maxWidth: 280 }}>
              Mañana retomamos con todo
            </div>
          </div>
        )}

        {/* ===== FOOTER: marca Distinto ===== */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 16,
            borderTop: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>
            Distinto Agencia
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>
            {data.fechaIso}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ emoji, valor, label, color }: { emoji: string; valor: number | string; label: string; color: string }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '10px 8px',
        textAlign: 'center',
        border: '1px solid rgba(0,0,0,0.04)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ fontSize: 16, marginBottom: 2 }} aria-hidden>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: -0.5, lineHeight: 1.1 }}>{valor}</div>
      <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )
}

type ReporteTareaCompletada = ReporteDelDiaData['tareasCompletadas'][number]
