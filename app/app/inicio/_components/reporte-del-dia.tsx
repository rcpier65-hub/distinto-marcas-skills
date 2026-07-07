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
import { ClipboardCheck } from 'lucide-react'
import type { ReporteDelDiaData } from '@/lib/inicio/load-reporte-del-dia'

type Props = {
  data: ReporteDelDiaData
}

/* Qué métricas EXTRA (más allá de Tareas + Hábitos) ve cada rol en su reporte.
   Grabaciones y comentarios son conteos del workspace, así que solo tienen
   sentido para quien hace ese trabajo:
     - Grab.:  solo el CEO/director (nadie del equipo "graba" individualmente).
     - Coments: community/social media manager + CEO.
   Una diseñadora o editor NO ve grabaciones ni comentarios (no es su trabajo). */
function metricasVisibles(rolBase: string): { grab: boolean; coments: boolean } {
  const esCEO = rolBase === 'director'
  return {
    grab: esCEO,
    coments: esCEO || rolBase === 'community_manager' || rolBase === 'social_media_manager',
  }
}

/** "2h 37m" / "45m" a partir de minutos. null si no hay dato. */
function fmtDur(min: number | null | undefined): string | null {
  if (min == null || min < 0) return null
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60), m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/* Color/etiqueta por tipo de tarea (a nivel módulo para reusar en TareaRow). */
const COLOR_TIPO: Record<ReporteTareaCompletada['tipo'], { bg: string; label: string; emoji: string }> = {
  editada:    { bg: '#dbeafe', label: 'Editada',  emoji: '✂️' },
  disenada:   { bg: '#fce7f3', label: 'Diseñada', emoji: '🎨' },
  aprobada:   { bg: '#dcfce7', label: 'Aprobada', emoji: '✅' },
  grabada:    { bg: '#fef3c7', label: 'Grabada',  emoji: '🎥' },
  comentario: { bg: '#cffafe', label: 'Respondido', emoji: '💬' },
  tarea:      { bg: '#ede9fe', label: 'Tarea',    emoji: '✅' },
  asignada:   { bg: '#fef9c3', label: 'Pendiente', emoji: '📥' },
}

/* Fila de una tarea en el reporte: emoji + título + subtítulo (marca · ⏱ duración
   · por delegador) + chip de tipo. Reusada en "Lo que terminé" y "Asignadas a mí". */
function TareaRow({ t }: { t: ReporteTareaCompletada }) {
  const dur = fmtDur(t.duracionMin)
  const sub = [t.marca, dur ? `⏱ ${dur}` : null, t.delegadaPor ? `por ${t.delegadaPor}` : null]
    .filter(Boolean).join(' · ')
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      background: 'rgba(255,255,255,0.7)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.04)',
    }}>
      <span style={{ fontSize: 17 }} aria-hidden>{t.marcaEmoji ?? COLOR_TIPO[t.tipo].emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
          {t.titulo}
        </div>
        <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sub}
        </div>
      </div>
      <div style={{
        fontSize: 9, fontWeight: 700, color: '#0f172a', background: COLOR_TIPO[t.tipo].bg,
        padding: '3px 7px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {COLOR_TIPO[t.tipo].label}
      </div>
    </div>
  )
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

  const vis = metricasVisibles(data.rolBase)
  const total =
    data.tareasCompletadas.length +
    data.habitosCumplidos.length +
    (vis.grab ? data.grabacionesHechasCount : 0) +
    (vis.coments ? data.comentariosRespondidosCount : 0)

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
        for (const t of data.tareasCompletadas.slice(0, 14)) {
          const emoji = t.marcaEmoji ?? '•'
          const dur = fmtDur(t.duracionMin)
          const extra = [
            dur ? `⏱ ${dur}` : null,                                  // editando→aprobar
            t.delegadaPor ? `por ${t.delegadaPor}` : null,            // quién la delegó
          ].filter(Boolean).join(' · ')
          lineas.push(`${emoji} ${t.titulo} _(${t.marca})_${extra ? ` — ${extra}` : ''}`)
        }
        if (data.tareasCompletadas.length > 14) {
          lineas.push(`_…y ${data.tareasCompletadas.length - 14} más_`)
        }
        lineas.push('')
      }

      // Trabajo asignado/delegado a mí, pendiente.
      if (data.tareasAsignadas.length > 0) {
        lineas.push(`📥 *Asignadas a mí / pendientes (${data.tareasAsignadas.length})*`)
        for (const t of data.tareasAsignadas.slice(0, 12)) {
          const emoji = t.marcaEmoji ?? (t.tipo === 'asignada' && t.delegadaPor ? '📌' : '🎨')
          lineas.push(`${emoji} ${t.titulo} _(${t.marca})_${t.delegadaPor ? ` — por ${t.delegadaPor}` : ''}`)
        }
        lineas.push('')
      }

      // Lo que YO delegué a otros hoy.
      if (data.tareasDelegadas.length > 0) {
        lineas.push(`📤 *Delegué (${data.tareasDelegadas.length})*`)
        for (const d of data.tareasDelegadas.slice(0, 12)) {
          lineas.push(`→ ${d.titulo} _(a ${d.asignadoA})_${d.completada ? ' ✓' : ''}`)
        }
        lineas.push('')
      }

      if (data.habitosTotal > 0) {
        lineas.push(`🌱 *Hábitos (${data.habitosCumplidos.length}/${data.habitosTotal})*`)
        if (data.habitosCumplidos.length > 0) {
          // Uno por línea con la hora a la que se marcó (pedido de Pedro).
          for (const h of data.habitosCumplidos) {
            lineas.push(`${h.hora ? `🕘 ${h.hora} · ` : ''}${h.icono} ${h.nombre}`)
          }
        } else {
          lineas.push('_Ninguno cumplido todavía_')
        }
        lineas.push('')
      }

      const extras: string[] = []
      if (data.pubsEditadasCount > 0) extras.push(`✂️ ${data.pubsEditadasCount} pub${data.pubsEditadasCount === 1 ? '' : 's'} editada${data.pubsEditadasCount === 1 ? '' : 's'}`)
      if (vis.grab && data.grabacionesHechasCount > 0) extras.push(`🎥 ${data.grabacionesHechasCount} grabación${data.grabacionesHechasCount === 1 ? '' : 'es'}`)
      if (vis.coments && data.comentariosRespondidosCount > 0) extras.push(`💬 ${data.comentariosRespondidosCount} comentario${data.comentariosRespondidosCount === 1 ? '' : 's'} respondido${data.comentariosRespondidosCount === 1 ? '' : 's'}`)
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
      {/* ============= LISTA VISIBLE "lo que completaste hoy" =============
          Pedro 07-jul-2026: "cuando Erick completa una tarea no le sale nada
          en su reporte". El reporte era SOLO el botón "Generar" (las tareas
          quedaban escondidas en el modal). Ahora se muestran directo en el
          inicio para que cada quien vea lo que terminó hoy. */}
      {data.tareasCompletadas.length > 0 && (
        <div
          style={{
            marginTop: 32,
            padding: '18px 22px',
            background: '#fff',
            border: '1px solid #dcfce7',
            borderRadius: 16,
            boxShadow: '0 4px 16px rgba(16,24,40,0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16a34a' }}>
            <span style={{ fontSize: 15 }}>✅</span> Completaste hoy · {data.tareasCompletadas.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {data.tareasCompletadas.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#0f172a', lineHeight: 1.3 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.marcaColor, flexShrink: 0, boxShadow: `0 0 0 3px ${t.marcaColor}22` }} />
                <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{t.titulo}</span>
                <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {t.marcaEmoji ? `${t.marcaEmoji} ` : ''}{t.marca}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
        {/* Icono profesional (lucide) en un círculo glass — reemplaza el
            emoji 📊 que se veía básico. */}
        <div
          aria-hidden
          style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(168,85,247,0.25)',
            boxShadow: '0 4px 14px rgba(109,40,217,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ClipboardCheck className="w-6 h-6" style={{ color: '#7c3aed' }} strokeWidth={2} />
        </div>
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

  /* Stats según el rol: Tareas + Hábitos siempre; Grab./Coments solo a quien
     le corresponde (una diseñadora NO ve grabaciones ni comentarios). */
  const vis = metricasVisibles(data.rolBase)
  const stats: { emoji: string; valor: number | string; label: string; color: string }[] = [
    { emoji: '✅', valor: data.tareasCompletadas.length, label: 'Tareas', color: '#16a34a' },
    { emoji: '🌱', valor: `${data.habitosCumplidos.length}/${data.habitosTotal || '—'}`, label: 'Hábitos', color: '#6366f1' },
  ]
  if (vis.grab) stats.push({ emoji: '🎥', valor: data.grabacionesHechasCount, label: 'Grab.', color: '#f59e0b' })
  if (vis.coments) stats.push({ emoji: '💬', valor: data.comentariosRespondidosCount, label: 'Coments', color: '#06b6d4' })

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
            gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
            gap: 10,
            marginBottom: 22,
          }}
        >
          {stats.map((s) => (
            <StatBox key={s.label} emoji={s.emoji} valor={s.valor} label={s.label} color={s.color} />
          ))}
        </div>

        {/* ===== TAREAS LISTA ===== */}
        {data.tareasCompletadas.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
              ✓ Lo que terminé
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {data.tareasCompletadas.slice(0, 6).map((t) => (
                <TareaRow key={t.id} t={t} />
              ))}
              {data.tareasCompletadas.length > 6 && (
                <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginTop: 2 }}>
                  …y {data.tareasCompletadas.length - 6} más
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== ASIGNADAS A MÍ / PENDIENTES (trabajo delegado + cola de diseño) ===== */}
        {data.tareasAsignadas.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
              📥 Asignadas a mí
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {data.tareasAsignadas.slice(0, 5).map((t) => (
                <TareaRow key={t.id} t={t} />
              ))}
              {data.tareasAsignadas.length > 5 && (
                <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', textAlign: 'center', marginTop: 2 }}>
                  …y {data.tareasAsignadas.length - 5} más
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
                    {h.hora && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: h.color, opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>
                        · {h.hora}
                      </span>
                    )}
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
