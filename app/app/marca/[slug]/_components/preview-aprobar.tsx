// app/app/marca/[slug]/_components/preview-aprobar.tsx
//
// Refactor Linear-style del componente que muestra la grilla activa
// para aprobar/regenerar/cancelar. Layout split: PNG izquierda,
// controles + caption editable derecha. Iconos SVG diseñados, no emojis.
// Server actions y props NO cambiaron — solo el chrome visual.

'use client'

import { useState, useTransition } from 'react'
import { aprobarYEnviar, cancelarGrilla, regenerarPng } from '../_actions'
import { toast } from 'sonner'
import type { EstadoGrilla } from '@/lib/types/database'

type Props = {
  grilla: {
    id: string
    estado: EstadoGrilla
    semana_inicio: string
    semana_fin: string
    png_url: string | null
    caption: string
    enviada_at: string | null
  }
  marcaSlug: string
  grupoConfigurado: boolean
}

/* Mapeo estado → label + color para Linear-style status pill */
const ESTADO_GRILLA_CFG: Record<EstadoGrilla, { label: string; color: string; bg: string }> = {
  pendiente:            { label: 'Pendiente',            color: '#737373', bg: 'rgba(255, 255, 255, 0.04)' },
  procesando:           { label: 'Procesando…',          color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)' },
  esperando_aprobacion: { label: 'Esperando aprobación', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
  aprobada:             { label: 'Aprobada',             color: '#5eead4', bg: 'rgba(94, 234, 212, 0.12)' },
  enviada:              { label: 'Enviada',              color: '#4cb782', bg: 'rgba(76, 183, 130, 0.12)' },
  cancelada:            { label: 'Cancelada',            color: '#737373', bg: 'rgba(255, 255, 255, 0.06)' },
  regenerar:            { label: 'Regenerar',            color: '#fb7185', bg: 'rgba(251, 113, 133, 0.12)' },
}

export function PreviewYAprobar({ grilla, marcaSlug, grupoConfigurado }: Props) {
  const [caption, setCaption] = useState(grilla.caption)
  const [isPending, startTransition] = useTransition()

  const yaEnviada = grilla.estado === 'enviada'
  const canApprove = grilla.estado === 'esperando_aprobacion' && grupoConfigurado
  const cfg = ESTADO_GRILLA_CFG[grilla.estado] ?? ESTADO_GRILLA_CFG.esperando_aprobacion

  function handleAprobar() {
    if (!canApprove) return
    startTransition(async () => {
      toast.loading('Enviando al grupo del cliente…', { id: 'aprobar' })
      const result = await aprobarYEnviar(grilla.id, caption)
      if (!result.ok) toast.error(result.error, { id: 'aprobar' })
      else            toast.success(`✓ Enviado al grupo "${result.grupo}"`, { id: 'aprobar' })
    })
  }
  function handleCancelar() {
    if (!confirm('¿Cancelar esta grilla? Tendrás que generar una nueva.')) return
    startTransition(async () => {
      await cancelarGrilla(grilla.id, marcaSlug)
      toast.info('Grilla cancelada')
    })
  }
  function handleRegenerar() {
    startTransition(async () => {
      toast.loading('Regenerando PNG…', { id: 'regen' })
      await regenerarPng(grilla.id, marcaSlug)
      toast.success('PNG regenerado', { id: 'regen' })
    })
  }

  return (
    <section
      style={{
        background: 'var(--mk-bg-elevated)',
        border: '1px solid var(--mk-border-subtle)',
        borderRadius: 'var(--mk-radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header de la sección */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          borderBottom: '1px solid var(--mk-border-subtle)',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--mk-text-base)',
            fontWeight: 600,
            letterSpacing: 'var(--mk-tracking-snug)',
            color: 'var(--mk-text-primary)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {yaEnviada ? <IconSend /> : <IconEye />}
          {yaEnviada ? 'Grilla enviada' : 'Grilla lista para revisar'}
        </h2>
        <StatusPill cfg={cfg} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          Semana {grilla.semana_inicio} → {grilla.semana_fin}
        </span>
        {grilla.enviada_at && (
          <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
            · enviada {new Date(grilla.enviada_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Body split: PNG left | controles right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 360px) 1fr',
          gap: 0,
        }}
      >
        {/* Left: PNG preview */}
        <div
          style={{
            borderRight: '1px solid var(--mk-border-subtle)',
            padding: 18,
            background: 'var(--mk-bg-base)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            minHeight: 360,
          }}
        >
          {grilla.png_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={grilla.png_url}
              alt="Preview grilla"
              style={{
                width: '100%',
                maxWidth: 320,
                borderRadius: 'var(--mk-radius-md)',
                border: '1px solid var(--mk-border-subtle)',
                boxShadow: 'var(--mk-shadow-md)',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1080 / 1620',
                background: 'var(--mk-danger-bg)',
                border: '1px dashed var(--mk-danger)',
                borderRadius: 'var(--mk-radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                gap: 8, padding: 20, textAlign: 'center',
                color: 'var(--mk-danger)',
              }}
            >
              <IconAlert />
              <div style={{ fontSize: 'var(--mk-text-sm)', fontWeight: 500 }}>PNG no generado</div>
              <div style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)' }}>
                Apretá &ldquo;Regenerar&rdquo; abajo
              </div>
            </div>
          )}
        </div>

        {/* Right: caption editable + acciones */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Caption label + helper */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <label
                htmlFor="caption"
                style={{
                  fontSize: 'var(--mk-text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--mk-tracking-caps)',
                  color: 'var(--mk-text-tertiary)',
                  fontWeight: 500,
                }}
              >
                Mensaje WhatsApp (editable)
              </label>
              <span style={{ fontSize: 10, color: 'var(--mk-text-quaternary)', fontVariantNumeric: 'tabular-nums' }}>
                {caption.length} caracteres
              </span>
            </div>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={yaEnviada || isPending}
              rows={14}
              className="mk-focusable"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--mk-bg-base)',
                border: '1px solid var(--mk-border-default)',
                borderRadius: 'var(--mk-radius-md)',
                color: 'var(--mk-text-primary)',
                fontFamily: 'var(--font-geist-mono, monospace)',
                fontSize: 12.5,
                lineHeight: 1.55,
                resize: 'vertical',
                outline: 'none',
                opacity: yaEnviada || isPending ? 0.6 : 1,
              }}
            />
            <p style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', margin: '6px 0 0' }}>
              Este texto se envía exacto al grupo del cliente cuando apruebes.
            </p>
          </div>

          {/* Botones */}
          {!yaEnviada && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleAprobar}
                disabled={!canApprove || isPending}
                className="mk-focusable"
                style={{
                  ...btnPrimaryStyle,
                  flex: 1, minWidth: 200,
                  opacity: !canApprove || isPending ? 0.5 : 1,
                  cursor: !canApprove || isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {isPending ? <IconSpinner /> : <IconCheck />}
                {isPending ? 'Enviando…' : 'Aprobar y enviar'}
              </button>
              <button
                onClick={handleRegenerar}
                disabled={isPending}
                className="mk-focusable"
                style={btnGhostStyle}
              >
                <IconRefresh /> Regenerar PNG
              </button>
              <button
                onClick={handleCancelar}
                disabled={isPending}
                className="mk-focusable"
                style={{ ...btnGhostStyle, color: 'var(--mk-danger)' }}
              >
                <IconX /> Cancelar
              </button>
            </div>
          )}

          {/* Warning grupo no configurado */}
          {!grupoConfigurado && !yaEnviada && (
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px',
                background: 'var(--mk-warning-bg)',
                border: '1px solid rgba(242, 201, 76, 0.30)',
                borderRadius: 'var(--mk-radius-md)',
                fontSize: 'var(--mk-text-xs)',
                color: 'var(--mk-warning)',
              }}
            >
              <span style={{ flexShrink: 0, marginTop: 1 }}><IconAlert /></span>
              <div>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>
                  Aprobar está deshabilitado
                </div>
                <div style={{ color: 'rgba(247, 248, 248, 0.62)' }}>
                  Esta marca no tiene grupo WhatsApp configurado. Andá a Settings para
                  agregarlo antes de poder enviar.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   StatusPill + Icons SVG diseñados
   ============================================================ */

function StatusPill({ cfg }: { cfg: { label: string; color: string; bg: string } }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 8px',
        background: cfg.bg, color: cfg.color,
        fontSize: 10.5, fontWeight: 500,
        borderRadius: 'var(--mk-radius-sm)',
        textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)',
      }}
    >
      <span className="mk-dot" style={{ background: cfg.color, width: 5, height: 5 }} />
      {cfg.label}
    </span>
  )
}

function IconCheck()   { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 7L5.5 10L10.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function IconRefresh() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M11 3V6H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M10.2 6C9.5 4 7.7 2.5 5.5 2.5C2.74 2.5 0.5 4.74 0.5 7.5C0.5 10.26 2.74 12.5 5.5 12.5C7.7 12.5 9.5 11 10.2 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> }
function IconX()       { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3.5 3.5L9.5 9.5M9.5 3.5L3.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> }
function IconEye()     { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7C2 4.5 4.5 3 7 3C9.5 3 12 4.5 13 7C12 9.5 9.5 11 7 11C4.5 11 2 9.5 1 7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" /></svg> }
function IconSend()    { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 2L1.5 6L6 8L8 12L12 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" /><path d="M12 2L6 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> }
function IconAlert()   { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1L12 11H1L6.5 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M6.5 5V7.5M6.5 9V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> }
function IconSpinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="20" strokeDashoffset="10" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  )
}

const btnPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  height: 38, padding: '0 16px',
  background: 'var(--mk-accent)', border: '1px solid var(--mk-accent)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'white', fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
  cursor: 'pointer',
  boxShadow: '0 0 0 1px rgba(113, 112, 255, 0.20), 0 0 16px rgba(113, 112, 255, 0.20)',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}

const btnGhostStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 38, padding: '0 14px',
  background: 'transparent',
  border: '1px solid var(--mk-border-default)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-secondary)',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
  cursor: 'pointer',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}
