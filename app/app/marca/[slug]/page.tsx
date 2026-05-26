// app/app/marca/[slug]/page.tsx
//
// Vista de marca rediseñada con look Linear. Layout:
//   [Header sticky con marca + status pills + acción Pedir grilla nueva]
//   [Sección: grilla activa con preview + caption editable]
//   [Sección: datos de la marca (decisor, grupo WA, color)]
//   [Sección: historial reciente (últimas 10 grillas)]
//
// Iconos SVG diseñados (no emojis). Caption editable visible y
// prominente — eso era lo que Pedro pidió específicamente.

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { notFound } from 'next/navigation'
import { PreviewYAprobar } from './_components/preview-aprobar'
import type { EstadoGrilla } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

/* Status pill config para historial */
const HIST_CFG: Record<string, { color: string; bg: string; label: string }> = {
  pendiente:            { color: '#737373', bg: 'rgba(255, 255, 255, 0.04)', label: 'Pendiente'   },
  procesando:           { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.12)', label: 'Procesando'  },
  esperando_aprobacion: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)',  label: 'En revisión' },
  aprobada:             { color: '#5eead4', bg: 'rgba(94, 234, 212, 0.12)',  label: 'Aprobada'    },
  enviada:              { color: '#4cb782', bg: 'rgba(76, 183, 130, 0.12)',  label: 'Enviada'     },
  cancelada:            { color: '#737373', bg: 'rgba(255, 255, 255, 0.06)', label: 'Cancelada'   },
  regenerar:            { color: '#fb7185', bg: 'rgba(251, 113, 133, 0.12)', label: 'Regenerar'   },
}

export default async function MarcaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await requireUser()
  const { slug } = await params
  const supabase = await createClient()

  type Marca = {
    id: string
    slug: string
    nombre: string
    emoji_marca: string | null
    color_primario_hex: string | null
    decisor_tratamiento: string | null
    decisor_nombre: string | null
    decisor_whatsapp: string | null
    grupo_whatsapp_nombre: string | null
    grupo_whatsapp_alias: string | null
  }

  const { data: marca, error: marcaError } = await supabase
    .from('marcas')
    .select('*')
    .eq('slug', slug)
    .single()
  if (marcaError || !marca) notFound()
  const m = marca as Marca

  const { data: grillaActiva } = await supabase
    .from('grillas_pendientes')
    .select('id, semana_inicio, semana_fin, estado, png_url, caption, pedida_at, enviada_at')
    .eq('marca_id', m.id)
    .in('estado', ['esperando_aprobacion', 'aprobada', 'enviada'])
    .order('pedida_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: historial } = await supabase
    .from('grillas_pendientes')
    .select('id, semana_inicio, semana_fin, estado, pedida_at, enviada_at')
    .eq('marca_id', m.id)
    .order('pedida_at', { ascending: false })
    .limit(10)

  const grupoConfigurado = !!m.grupo_whatsapp_nombre || !!m.grupo_whatsapp_alias
  const colorMarca = m.color_primario_hex ?? '#737373'

  return (
    <div style={{ background: 'var(--mk-bg-base)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ============== HEADER ============== */}
      <header
        style={{
          padding: '16px 28px',
          borderBottom: '1px solid var(--mk-border-subtle)',
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'var(--mk-bg-base)',
          position: 'sticky', top: 0, zIndex: 10,
        }}
      >
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--mk-text-sm)' }}>
          <Link href="/cockpit" style={{ color: 'var(--mk-text-tertiary)', textDecoration: 'none' }}>Workspace</Link>
          <span style={{ color: 'var(--mk-text-quaternary)' }}>/</span>
          <span style={{ color: 'var(--mk-text-tertiary)' }}>Marcas</span>
          <span style={{ color: 'var(--mk-text-quaternary)' }}>/</span>
          <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500 }}>{m.nombre}</span>
        </div>
        <div style={{ flex: 1 }} />

        {/* Status pills */}
        {grupoConfigurado ? (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '2px 8px',
              background: 'var(--mk-success-bg)', color: 'var(--mk-success)',
              fontSize: 10.5, fontWeight: 500,
              borderRadius: 'var(--mk-radius-sm)',
              textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)',
            }}
          >
            <span className="mk-dot" style={{ background: 'var(--mk-success)', width: 5, height: 5 }} />
            WhatsApp OK
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '2px 8px',
              background: 'var(--mk-warning-bg)', color: 'var(--mk-warning)',
              fontSize: 10.5, fontWeight: 500,
              borderRadius: 'var(--mk-radius-sm)',
              textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)',
            }}
          >
            <span className="mk-dot" style={{ background: 'var(--mk-warning)', width: 5, height: 5 }} />
            Sin WhatsApp
          </span>
        )}

        <Link href={`/grilla/${m.slug}`} style={btnPrimaryLink}>
          <PlusIcon /> Pedir grilla nueva
        </Link>
      </header>

      {/* ============== BODY ============== */}
      <div style={{ flex: 1, padding: '24px 28px 80px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1400, width: '100%', margin: '0 auto' }}>
        {/* Hero — marca identity */}
        <div className="mk-anim-slide-up" style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          {/* Marca avatar — disco con color de la marca + emoji */}
          <div
            style={{
              width: 64, height: 64,
              borderRadius: 'var(--mk-radius-lg)',
              background: `linear-gradient(135deg, ${colorMarca}30 0%, ${colorMarca}10 100%)`,
              border: `1px solid ${colorMarca}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, flexShrink: 0,
              boxShadow: `0 0 24px ${colorMarca}20`,
            }}
          >
            {m.emoji_marca ?? '◻'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: 'var(--mk-text-2xl)',
                fontWeight: 600,
                letterSpacing: 'var(--mk-tracking-tight)',
                lineHeight: 'var(--mk-leading-tight)',
                color: 'var(--mk-text-primary)',
                margin: 0,
                marginBottom: 4,
              }}
            >
              {m.nombre}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)' }}>
              <code style={{ fontFamily: 'var(--font-geist-mono, monospace)', fontSize: 12, padding: '1px 6px', background: 'var(--mk-bg-elevated)', borderRadius: 4 }}>{m.slug}</code>
              {m.decisor_nombre && (
                <>
                  <span style={{ color: 'var(--mk-text-quaternary)' }}>·</span>
                  <span>Contacto: {m.decisor_tratamiento} {m.decisor_nombre}</span>
                </>
              )}
              {m.grupo_whatsapp_nombre && (
                <>
                  <span style={{ color: 'var(--mk-text-quaternary)' }}>·</span>
                  <span>Grupo: {m.grupo_whatsapp_nombre}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Warning grupo WhatsApp */}
        {!grupoConfigurado && (
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px 14px',
              background: 'var(--mk-warning-bg)',
              border: '1px solid rgba(242, 201, 76, 0.30)',
              borderRadius: 'var(--mk-radius-md)',
              fontSize: 'var(--mk-text-sm)',
              color: 'var(--mk-warning)',
            }}
          >
            <span style={{ flexShrink: 0, marginTop: 2 }}><AlertIcon /></span>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 2 }}>Grupo WhatsApp no configurado</div>
              <div style={{ color: 'rgba(247, 248, 248, 0.62)', fontSize: 'var(--mk-text-xs)' }}>
                Podés generar y aprobar grilla, pero al apretar &quot;Enviar al grupo&quot; va a fallar.{' '}
                <Link href="/settings" style={{ color: 'var(--mk-warning)', textDecoration: 'underline' }}>Configurar →</Link>
              </div>
            </div>
          </div>
        )}

        {/* Grilla activa — preview + caption editable */}
        {grillaActiva ? (
          <PreviewYAprobar
            grilla={{
              id: grillaActiva.id,
              estado: grillaActiva.estado as EstadoGrilla,
              semana_inicio: grillaActiva.semana_inicio,
              semana_fin: grillaActiva.semana_fin,
              png_url: grillaActiva.png_url,
              caption: grillaActiva.caption ?? '',
              enviada_at: grillaActiva.enviada_at,
            }}
            marcaSlug={m.slug}
            grupoConfigurado={grupoConfigurado}
          />
        ) : (
          <EmptyGrilla slug={m.slug} />
        )}

        {/* Datos de la marca */}
        <DatosMarca marca={m} colorMarca={colorMarca} />

        {/* Historial */}
        <HistorialGrillas historial={historial ?? []} />
      </div>
    </div>
  )
}

/* ============================================================
   Sub-components (server)
   ============================================================ */

function EmptyGrilla({ slug }: { slug: string }) {
  return (
    <div
      style={{
        padding: '40px 24px',
        background: 'var(--mk-bg-elevated)',
        border: '1px dashed var(--mk-border-default)',
        borderRadius: 'var(--mk-radius-lg)',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: 8, color: 'var(--mk-text-tertiary)' }}>
        <CalendarIcon />
      </div>
      <div style={{ fontSize: 'var(--mk-text-base)', fontWeight: 500, color: 'var(--mk-text-primary)', marginBottom: 4 }}>
        Sin grilla activa
      </div>
      <div style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)', marginBottom: 16 }}>
        Generá una grilla nueva para esta semana
      </div>
      <Link href={`/grilla/${slug}`} style={btnPrimaryLink}>
        <PlusIcon /> Pedir grilla
      </Link>
    </div>
  )
}

function DatosMarca({ marca, colorMarca }: { marca: { decisor_tratamiento: string | null; decisor_nombre: string | null; decisor_whatsapp: string | null; grupo_whatsapp_nombre: string | null; color_primario_hex: string | null }; colorMarca: string }) {
  const rows: { label: string; value: React.ReactNode }[] = []
  if (marca.decisor_nombre) {
    rows.push({ label: 'Contacto decisor', value: `${marca.decisor_tratamiento ?? ''} ${marca.decisor_nombre}`.trim() })
  }
  if (marca.decisor_whatsapp) {
    rows.push({ label: 'WhatsApp decisor', value: <code style={mono}>{marca.decisor_whatsapp}</code> })
  }
  if (marca.grupo_whatsapp_nombre) {
    rows.push({ label: 'Grupo WhatsApp', value: marca.grupo_whatsapp_nombre })
  }
  if (marca.color_primario_hex) {
    rows.push({
      label: 'Color primario',
      value: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: colorMarca, border: '1px solid var(--mk-border-strong)' }} />
          <code style={mono}>{marca.color_primario_hex}</code>
        </span>
      ),
    })
  }
  if (rows.length === 0) return null
  return (
    <section
      style={{
        background: 'var(--mk-bg-elevated)',
        border: '1px solid var(--mk-border-subtle)',
        borderRadius: 'var(--mk-radius-lg)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--mk-border-subtle)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--mk-text-base)', fontWeight: 600, color: 'var(--mk-text-primary)', letterSpacing: 'var(--mk-tracking-snug)' }}>
          Datos de la marca
        </h2>
      </div>
      <div style={{ padding: '8px 0' }}>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'grid', gridTemplateColumns: '180px 1fr',
              gap: 16, padding: '8px 18px',
              fontSize: 'var(--mk-text-sm)',
            }}
          >
            <span style={{ color: 'var(--mk-text-tertiary)' }}>{r.label}</span>
            <span style={{ color: 'var(--mk-text-primary)' }}>{r.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function HistorialGrillas({ historial }: { historial: Array<{ id: string; semana_inicio: string; semana_fin: string; estado: string; pedida_at: string; enviada_at: string | null }> }) {
  return (
    <section
      style={{
        background: 'var(--mk-bg-elevated)',
        border: '1px solid var(--mk-border-subtle)',
        borderRadius: 'var(--mk-radius-lg)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderBottom: '1px solid var(--mk-border-subtle)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--mk-text-base)', fontWeight: 600, color: 'var(--mk-text-primary)', letterSpacing: 'var(--mk-tracking-snug)' }}>
          Historial
        </h2>
        <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums', background: 'rgba(255, 255, 255, 0.04)', padding: '1px 6px', borderRadius: 'var(--mk-radius-sm)' }}>
          {historial.length}
        </span>
      </div>
      {historial.length === 0 ? (
        <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)' }}>
          Aún no se generó ninguna grilla para esta marca
        </div>
      ) : (
        <div>
          {historial.map((g, i) => {
            const cfg = HIST_CFG[g.estado] ?? HIST_CFG.cancelada
            return (
              <div
                key={g.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 18px',
                  borderBottom: i < historial.length - 1 ? '1px solid var(--mk-border-subtle)' : 'none',
                  fontSize: 'var(--mk-text-sm)',
                }}
              >
                <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {g.semana_inicio} → {g.semana_fin}
                </span>
                <span style={{ flex: 1, color: 'var(--mk-text-tertiary)', fontSize: 'var(--mk-text-xs)', fontVariantNumeric: 'tabular-nums' }}>
                  Pedida {new Date(g.pedida_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {g.enviada_at && ` · Enviada ${new Date(g.enviada_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                </span>
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
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ============================================================
   Icons + styles
   ============================================================ */

function PlusIcon()     { return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2V9M2 5.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> }
function AlertIcon()    { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 12H1L7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M7 5.5V8M7 9.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> }
function CalendarIcon() { return <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="6" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M4 11H24M9 3V7M19 3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> }

const btnPrimaryLink: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  height: 'var(--mk-button-height-lg)', padding: '0 14px',
  background: 'var(--mk-accent)', border: '1px solid var(--mk-accent)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'white', textDecoration: 'none',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
  boxShadow: '0 0 0 1px rgba(113, 112, 255, 0.20), 0 0 16px rgba(113, 112, 255, 0.20)',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono, monospace)',
  fontSize: 12,
  padding: '1px 6px',
  background: 'var(--mk-bg-base)',
  borderRadius: 4,
  border: '1px solid var(--mk-border-subtle)',
}
