'use client'

import {
  COMENTARIOS_PENDIENTES,
  GRABACIONES_PROXIMAS,
  GRILLAS_SEMANA,
  HABITOS_HOY,
  MARCAS,
  METRICAS,
} from '../_data/mock'

/* Linear-style cockpit: header sticky + 2-col grid (main table | sidebar right).
   Densidad alta, micro-interacciones, hover reveal actions.
*/

export function Cockpit() {
  const marcaMap = Object.fromEntries(MARCAS.map((m) => [m.slug, m]))
  const ingresoDelta = METRICAS.ingresoMes - METRICAS.ingresoMesPasado
  const ingresoPct = ((ingresoDelta / METRICAS.ingresoMesPasado) * 100).toFixed(1)

  return (
    <div
      style={{
        flex: 1,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--mk-bg-base)',
      }}
    >
      {/* ============== HEADER ============== */}
      <header
        style={{
          height: 'var(--mk-header-height)',
          padding: '0 20px',
          borderBottom: '1px solid var(--mk-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--mk-bg-base)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 5,
        }}
      >
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--mk-text-sm)' }}>
          <span style={{ color: 'var(--mk-text-tertiary)' }}>Workspace</span>
          <span style={{ color: 'var(--mk-text-quaternary)' }}>/</span>
          <span style={{ color: 'var(--mk-text-primary)', fontWeight: 'var(--mk-weight-medium)' }}>Cockpit</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Period switcher */}
        <PillSegment options={['Hoy', 'Semana', 'Mes']} active="Hoy" />

        {/* Quick actions */}
        <button className="mk-focusable" style={btnGhostStyle}>
          <PlusIcon /> Nueva publicación
          <span className="mk-kbd" style={{ marginLeft: 4 }}>C</span>
        </button>
        <button className="mk-focusable" style={btnPrimaryStyle}>
          Generar grillas semana
        </button>
      </header>

      {/* ============== BODY ============== */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px 28px 80px',
        }}
      >
        {/* Page title */}
        <div className="mk-anim-slide-up" style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 'var(--mk-text-2xl)',
              fontWeight: 'var(--mk-weight-semibold)',
              letterSpacing: 'var(--mk-tracking-tight)',
              lineHeight: 'var(--mk-leading-tight)',
              color: 'var(--mk-text-primary)',
              margin: 0,
              marginBottom: 4,
            }}
          >
            Buen día, Pedro
          </h1>
          <p style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)', margin: 0 }}>
            Lun 25 may · 9 marcas activas · 73 comentarios pendientes · 6 grillas a enviar hoy
          </p>
        </div>

        {/* KPI grid */}
        <div
          className="mk-stagger"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
            marginBottom: 32,
            background: 'var(--mk-border-subtle)',
            border: '1px solid var(--mk-border-subtle)',
            borderRadius: 'var(--mk-radius-lg)',
            overflow: 'hidden',
          }}
        >
          <Kpi
            label="Publicaciones esta semana"
            value={METRICAS.publicacionesEstaSemana.toString()}
            delta="+12%"
            deltaPositive={true}
          />
          <Kpi
            label="Comentarios respondidos"
            value={METRICAS.comentariosRespondidos.toString()}
            delta={`${METRICAS.comentariosPendientes} pendientes`}
            deltaPositive={null}
          />
          <Kpi
            label="Grillas enviadas"
            value={`${METRICAS.grillasEnviadas} / 9`}
            delta="67%"
            deltaPositive={true}
          />
          <Kpi
            label="Ingresos del mes"
            value={`S/ ${(METRICAS.ingresoMes / 1000).toFixed(1)}k`}
            delta={`+${ingresoPct}% vs mes pasado`}
            deltaPositive={true}
          />
        </div>

        {/* 2-col layout: comentarios table | right rail */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          {/* ========== LEFT: Comentarios urgentes ========== */}
          <section>
            <SectionHeader
              title="Atender hoy"
              count={COMENTARIOS_PENDIENTES.length}
              action={{ label: 'Ver todos', onClick: () => {} }}
            />
            <div
              style={{
                border: '1px solid var(--mk-border-subtle)',
                borderRadius: 'var(--mk-radius-lg)',
                overflow: 'hidden',
                background: 'var(--mk-bg-elevated)',
              }}
            >
              {/* Table header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr 140px 100px 80px 60px',
                  gap: 12,
                  padding: '8px 14px',
                  borderBottom: '1px solid var(--mk-border-subtle)',
                  fontSize: 'var(--mk-text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--mk-tracking-caps)',
                  color: 'var(--mk-text-tertiary)',
                  fontWeight: 'var(--mk-weight-medium)',
                  background: 'rgba(255, 255, 255, 0.015)',
                }}
              >
                <span></span>
                <span>Comentario</span>
                <span>Marca</span>
                <span>Categoría</span>
                <span>Hace</span>
                <span style={{ textAlign: 'right' }}>·</span>
              </div>

              {/* Rows */}
              {COMENTARIOS_PENDIENTES.map((c) => {
                const m = marcaMap[c.marcaSlug]
                return (
                  <CommentRow key={c.id} comment={c} marca={m} />
                )
              })}
            </div>
          </section>

          {/* ========== RIGHT RAIL ========== */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Grillas próximas */}
            <section>
              <SectionHeader
                title="Grillas a enviar"
                count={GRILLAS_SEMANA.filter((g) => g.estado === 'aprobada').length}
                action={null}
              />
              <div
                style={{
                  border: '1px solid var(--mk-border-subtle)',
                  borderRadius: 'var(--mk-radius-lg)',
                  background: 'var(--mk-bg-elevated)',
                  overflow: 'hidden',
                }}
              >
                {GRILLAS_SEMANA.map((g, i) => {
                  const m = marcaMap[g.marcaSlug]
                  return (
                    <div
                      key={g.marcaSlug}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderBottom: i < GRILLAS_SEMANA.length - 1 ? '1px solid var(--mk-border-subtle)' : 'none',
                        cursor: 'pointer',
                        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span
                        className="mk-dot"
                        style={{ background: m.color, boxShadow: `0 0 6px ${m.color}`, width: 6, height: 6 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 'var(--mk-text-sm)',
                            color: 'var(--mk-text-primary)',
                            fontWeight: 'var(--mk-weight-medium)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {m.nombre.replace('Centro Psicológico ', '').replace('Distribuidora ', '').replace(' SAC', '').replace(' · Typhouse', '').replace('Perú', '').replace('.pe', '')}
                        </div>
                        <div style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)' }}>
                          {g.publicaciones} pubs · {g.proximoEnvio}
                        </div>
                      </div>
                      <StatusBadge estado={g.estado} />
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Hábitos hoy */}
            <section>
              <SectionHeader title="Hábitos hoy" count={HABITOS_HOY.filter((h) => h.completado).length + '/' + HABITOS_HOY.length} action={null} />
              <div
                style={{
                  border: '1px solid var(--mk-border-subtle)',
                  borderRadius: 'var(--mk-radius-lg)',
                  background: 'var(--mk-bg-elevated)',
                  padding: 4,
                }}
              >
                {HABITOS_HOY.map((h) => (
                  <button
                    key={h.id}
                    className="mk-focusable"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '8px 10px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 'var(--mk-radius-md)',
                      cursor: 'pointer',
                      color: 'inherit',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <Checkbox checked={h.completado} />
                    <span
                      style={{
                        flex: 1,
                        fontSize: 'var(--mk-text-sm)',
                        color: h.completado ? 'var(--mk-text-tertiary)' : 'var(--mk-text-primary)',
                        textDecoration: h.completado ? 'line-through' : 'none',
                      }}
                    >
                      {h.titulo}
                    </span>
                    <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                      {h.hora}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Grabaciones próximas */}
            <section>
              <SectionHeader title="Próximas grabaciones" count={GRABACIONES_PROXIMAS.length} action={null} />
              <div
                style={{
                  border: '1px solid var(--mk-border-subtle)',
                  borderRadius: 'var(--mk-radius-lg)',
                  background: 'var(--mk-bg-elevated)',
                  overflow: 'hidden',
                }}
              >
                {GRABACIONES_PROXIMAS.map((g, i) => {
                  const m = marcaMap[g.marca]
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderBottom: i < GRABACIONES_PROXIMAS.length - 1 ? '1px solid var(--mk-border-subtle)' : 'none',
                      }}
                    >
                      <div
                        style={{
                          flexShrink: 0,
                          width: 36,
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 10, color: 'var(--mk-text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)' }}>
                          {g.fecha.split(' ')[0]}
                        </div>
                        <div style={{ fontSize: 'var(--mk-text-base)', fontWeight: 'var(--mk-weight-semibold)', color: 'var(--mk-text-primary)', lineHeight: 1 }}>
                          {g.fecha.split(' ')[1]}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.tipo}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)' }}>
                          <span className="mk-dot" style={{ background: m.color, width: 5, height: 5 }} />
                          {m.nombre.split(' ')[0]} · {g.hora}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

function Kpi({
  label,
  value,
  delta,
  deltaPositive,
}: {
  label: string
  value: string
  delta: string
  deltaPositive: boolean | null
}) {
  const deltaColor =
    deltaPositive === true ? 'var(--mk-success)' :
    deltaPositive === false ? 'var(--mk-danger)' :
    'var(--mk-text-tertiary)'
  return (
    <div
      style={{
        background: 'var(--mk-bg-elevated)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#15161a' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--mk-bg-elevated)' }}
    >
      <div className="mk-label">{label}</div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 'var(--mk-weight-semibold)',
          letterSpacing: 'var(--mk-tracking-tight)',
          color: 'var(--mk-text-primary)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 'var(--mk-text-xs)', color: deltaColor, fontWeight: 'var(--mk-weight-medium)' }}>
        {deltaPositive === true && '↑ '}
        {deltaPositive === false && '↓ '}
        {delta}
      </div>
    </div>
  )
}

function SectionHeader({
  title,
  count,
  action,
}: {
  title: string
  count: number | string
  action: { label: string; onClick: () => void } | null
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
      }}
    >
      <h2
        style={{
          fontSize: 'var(--mk-text-base)',
          fontWeight: 'var(--mk-weight-semibold)',
          letterSpacing: 'var(--mk-tracking-snug)',
          color: 'var(--mk-text-primary)',
          margin: 0,
        }}
      >
        {title}
      </h2>
      <span
        style={{
          fontSize: 'var(--mk-text-xs)',
          color: 'var(--mk-text-tertiary)',
          fontVariantNumeric: 'tabular-nums',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '1px 6px',
          borderRadius: 'var(--mk-radius-sm)',
        }}
      >
        {count}
      </span>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: 'var(--mk-text-tertiary)',
            fontFamily: 'inherit',
            fontSize: 'var(--mk-text-xs)',
            cursor: 'pointer',
            padding: '2px 4px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mk-text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mk-text-tertiary)' }}
        >
          {action.label} →
        </button>
      )}
    </div>
  )
}

function CommentRow({ comment, marca }: { comment: typeof COMENTARIOS_PENDIENTES[0]; marca: typeof MARCAS[0] }) {
  const urgencyColor =
    comment.urgencia === 'high' ? 'var(--mk-danger)' :
    comment.urgencia === 'medium' ? 'var(--mk-warning)' :
    'var(--mk-text-tertiary)'
  const catColors: Record<typeof comment.categoria, string> = {
    consulta: 'var(--mk-info)',
    interes_compra: 'var(--mk-success)',
    agradecimiento: 'var(--mk-accent)',
    queja: 'var(--mk-danger)',
    tag_amigo: 'var(--mk-text-tertiary)',
    spam: 'var(--mk-text-quaternary)',
    otro: 'var(--mk-text-tertiary)',
  }
  const catLabels: Record<typeof comment.categoria, string> = {
    consulta: 'Consulta',
    interes_compra: 'Interés compra',
    agradecimiento: 'Gracias',
    queja: 'Queja',
    tag_amigo: 'Tag',
    spam: 'Spam',
    otro: 'Otro',
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr 140px 100px 80px 60px',
        gap: 12,
        alignItems: 'center',
        padding: '0 14px',
        height: 'var(--mk-row-height)',
        borderBottom: '1px solid var(--mk-border-subtle)',
        cursor: 'pointer',
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
        position: 'relative',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <span className="mk-dot" style={{ background: urgencyColor, boxShadow: comment.urgencia === 'high' ? `0 0 6px ${urgencyColor}` : 'none' }} />
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)', fontWeight: 'var(--mk-weight-medium)' }}>
          @{comment.autor}
        </span>
        <span style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {comment.texto}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span className="mk-dot" style={{ background: marca.color, width: 6, height: 6 }} />
        <span style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {marca.nombre.replace('Centro Psicológico ', '').replace('Distribuidora ', '').replace(' SAC', '').replace(' · Typhouse', '').replace('Perú', '').replace('.pe', '')}
        </span>
        <span style={{ fontSize: 10, color: 'var(--mk-text-quaternary)', textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)' }}>
          {comment.red === 'instagram' ? 'IG' : comment.red === 'facebook' ? 'FB' : 'TT'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="mk-dot" style={{ background: catColors[comment.categoria], width: 6, height: 6 }} />
        <span style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-secondary)' }}>
          {catLabels[comment.categoria]}
        </span>
      </div>
      <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
        {comment.hace}
      </span>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--mk-text-tertiary)',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 'var(--mk-radius-sm)',
            transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--mk-text-primary)'
            e.currentTarget.style.background = 'var(--mk-bg-active)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--mk-text-tertiary)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function PillSegment({ options, active }: { options: string[]; active: string }) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--mk-bg-elevated)',
        border: '1px solid var(--mk-border-subtle)',
        borderRadius: 'var(--mk-radius-md)',
        padding: 2,
        gap: 2,
      }}
    >
      {options.map((o) => (
        <button
          key={o}
          style={{
            padding: '3px 10px',
            fontSize: 'var(--mk-text-xs)',
            fontFamily: 'inherit',
            background: o === active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            color: o === active ? 'var(--mk-text-primary)' : 'var(--mk-text-tertiary)',
            border: 'none',
            borderRadius: 'var(--mk-radius-sm)',
            cursor: 'pointer',
            fontWeight: o === active ? 'var(--mk-weight-medium)' : 'var(--mk-weight-regular)',
            transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function StatusBadge({ estado }: { estado: 'aprobada' | 'pendiente' | 'borrador' }) {
  const config = {
    aprobada: { color: 'var(--mk-success)', bg: 'var(--mk-success-bg)', label: 'Lista' },
    pendiente: { color: 'var(--mk-warning)', bg: 'var(--mk-warning-bg)', label: 'Revisar' },
    borrador: { color: 'var(--mk-text-tertiary)', bg: 'rgba(255,255,255,0.04)', label: 'Borrador' },
  }
  const c = config[estado]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        fontSize: 10,
        fontWeight: 'var(--mk-weight-medium)',
        color: c.color,
        background: c.bg,
        borderRadius: 'var(--mk-radius-sm)',
        textTransform: 'uppercase',
        letterSpacing: 'var(--mk-tracking-caps)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {c.label}
    </span>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        border: `1px solid ${checked ? 'var(--mk-accent)' : 'var(--mk-border-strong)'}`,
        borderRadius: 3,
        background: checked ? 'var(--mk-accent)' : 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
      }}
    >
      {checked && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M2 4.5L4 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

function PlusIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2V9M2 5.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
}

const btnGhostStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 'var(--mk-button-height-lg)',
  padding: '0 10px',
  background: 'transparent',
  border: '1px solid var(--mk-border-subtle)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-secondary)',
  fontFamily: 'inherit',
  fontSize: 'var(--mk-text-sm)',
  fontWeight: 'var(--mk-weight-medium)',
  cursor: 'pointer',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}

const btnPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 'var(--mk-button-height-lg)',
  padding: '0 12px',
  background: 'var(--mk-accent)',
  border: '1px solid var(--mk-accent)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'white',
  fontFamily: 'inherit',
  fontSize: 'var(--mk-text-sm)',
  fontWeight: 'var(--mk-weight-medium)',
  cursor: 'pointer',
  boxShadow: '0 0 0 1px rgba(113, 112, 255, 0.20), 0 0 16px rgba(113, 112, 255, 0.20)',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}
