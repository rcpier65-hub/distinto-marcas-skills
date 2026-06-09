'use client'

/* InicioView — dashboard de bienvenida para cada miembro del equipo.
   - Saludo grande "Hola Ailyn, bienvenida a tu espacio en Distinto"
   - Cards de acceso rápido a sus módulos accesibles
   - Lista de "Mi trabajo" (lo que tiene pendiente según su rol)
   - Sidebar con hábitos del día (clickeables para marcar)
*/

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { toggleHabitoHoy } from '@/app/habitos/_actions'

export type InicioData = {
  nombre: string
  rol: string
  /* rol_base de BD para elegir el ícono animado del rol */
  rolBase: string
  avatarUrl: string | null
  cargo: string | null
  cumpleHoy: boolean
  modulosAccesibles: Array<{
    key: string
    label: string
    href: string
    color: string
    icon: string
  }>
  habitosHoy: Array<{
    id: string
    nombre: string
    icono: string
    color: string
    completado: boolean
  }>
  tareasMias: Array<{
    id: string
    nombre: string
    marca: string
    marcaColor: string
    meta: string
    marcadaHoy: boolean
    modulo: 'editor' | 'diseno' | 'comentarios'
  }>
  /* Frase del día según rol. Primeros 60 días secuenciales,
     después aleatoria determinista por miembro + día. */
  fraseDia: {
    texto: string
    autor: string
    contexto: string | null
    numero: number
    total: number
  }
}

/* Pincel SVG animado para diseñadores: ondea suavemente como si
   estuviera pintando. Para editor: claqueta animada. Para CM: globo
   de chat con pulse. Cada rol tiene su accesorio visual. */
function IconoDelRol({ rolBase }: { rolBase: string }) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-block',
    width: 42, height: 42,
    animation: 'mk-icono-rol 3s ease-in-out infinite',
    transformOrigin: 'bottom left',
  }
  if (rolBase === 'disenador') {
    /* Pincel con cerdas + mancha de pintura */
    return (
      <span style={baseStyle} aria-hidden>
        <svg viewBox="0 0 64 64" width="42" height="42">
          {/* Mancha de pintura */}
          <ellipse cx="46" cy="50" rx="10" ry="4" fill="#ec4899" opacity="0.25" />
          <ellipse cx="48" cy="49" rx="6" ry="2.5" fill="#ec4899" opacity="0.5" />
          {/* Mango */}
          <rect x="8" y="8" width="6" height="36" rx="2" transform="rotate(-30 11 26)" fill="#8b5cf6" />
          {/* Virola metálica */}
          <rect x="6" y="30" width="10" height="5" rx="1" transform="rotate(-30 11 32)" fill="#a78bfa" />
          {/* Cerdas */}
          <path d="M 4 36 Q 10 42 16 38 L 18 46 Q 12 50 6 44 Z" fill="#ec4899" />
          <path d="M 6 38 L 8 44 M 9 39 L 11 45 M 12 40 L 14 46" stroke="#fff" strokeWidth="0.5" opacity="0.5" />
        </svg>
      </span>
    )
  }
  if (rolBase === 'editor') {
    /* Claqueta de cine */
    return (
      <span style={baseStyle} aria-hidden>
        <svg viewBox="0 0 64 64" width="42" height="42">
          <rect x="6" y="22" width="52" height="34" rx="3" fill="#1f2937" />
          <rect x="6" y="14" width="52" height="12" rx="2" fill="#111827" transform="rotate(-8 32 20)" />
          {/* Tiras blancas */}
          <rect x="9" y="14" width="6" height="12" fill="#fff" transform="rotate(-8 12 20)" />
          <rect x="19" y="14" width="6" height="12" fill="#fff" transform="rotate(-8 22 20)" />
          <rect x="29" y="14" width="6" height="12" fill="#fff" transform="rotate(-8 32 20)" />
          <rect x="39" y="14" width="6" height="12" fill="#fff" transform="rotate(-8 42 20)" />
          <rect x="49" y="14" width="6" height="12" fill="#fff" transform="rotate(-8 52 20)" />
          {/* Texto REC simulado */}
          <circle cx="22" cy="42" r="4" fill="#ef4444" />
          <text x="30" y="46" fill="#fff" fontSize="9" fontFamily="monospace" fontWeight="600">REC</text>
        </svg>
      </span>
    )
  }
  if (rolBase === 'community_manager' || rolBase === 'social_media_manager') {
    /* Globo de chat con corazón */
    return (
      <span style={baseStyle} aria-hidden>
        <svg viewBox="0 0 64 64" width="42" height="42">
          <path d="M 8 16 Q 8 8 16 8 L 48 8 Q 56 8 56 16 L 56 36 Q 56 44 48 44 L 24 44 L 14 52 L 16 44 Q 8 44 8 36 Z" fill="#22c55e" />
          <path d="M 28 22 Q 24 18 20 22 Q 16 28 32 38 Q 48 28 44 22 Q 40 18 36 22 Z" fill="#fff" />
        </svg>
      </span>
    )
  }
  /* Default — estrella */
  return (
    <span style={baseStyle} aria-hidden>
      <svg viewBox="0 0 64 64" width="42" height="42">
        <path d="M 32 6 L 38 24 L 58 24 L 42 36 L 48 56 L 32 44 L 16 56 L 22 36 L 6 24 L 26 24 Z" fill="#f59e0b" />
      </svg>
    </span>
  )
}

/* Nombre con animación letra por letra (stagger fade-in + slide). */
function NombreAnimado({ nombre, color }: { nombre: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex' }}>
      {Array.from(nombre).map((ch, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            opacity: 0,
            transform: 'translateY(8px)',
            animation: `mk-letra-aparece 0.6s cubic-bezier(.22,1,.36,1) forwards`,
            animationDelay: `${i * 60 + 200}ms`,
            color,
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}

export function InicioView({ data }: { data: InicioData }) {
  const router = useRouter()
  const [habitos, setHabitos] = useState(data.habitosHoy)
  const [, startTransition] = useTransition()
  const ahora = new Date()
  const horaActual = ahora.getHours()
  const saludo =
    horaActual < 12 ? 'Buenos días' :
    horaActual < 19 ? 'Buenas tardes' :
    'Buenas noches'
  const bienvenida =
    /[aá]$/.test(data.nombre) ? 'Bienvenida' : 'Bienvenido'
  const completadosCount = habitos.filter((h) => h.completado).length

  function toggleHabito(id: string) {
    const prev = habitos
    setHabitos((curr) =>
      curr.map((h) => (h.id === id ? { ...h, completado: !h.completado } : h))
    )
    startTransition(async () => {
      const r = await toggleHabitoHoy(id)
      if (!r.ok) {
        setHabitos(prev)
        toast.error(r.error)
      } else {
        router.refresh()
      }
    })
  }

  const tituloMisTareas =
    data.tareasMias[0]?.modulo === 'editor' ? 'Tus videos por editar' :
    data.tareasMias[0]?.modulo === 'diseno' ? 'Tus tareas de diseño' :
    data.tareasMias[0]?.modulo === 'comentarios' ? 'Comentarios por responder' :
    'Tu trabajo de hoy'

  /* Color de acento según rol — coordina con el ícono animado */
  const acento =
    data.rolBase === 'disenador' ? '#ec4899' :
    data.rolBase === 'editor' ? '#8b5cf6' :
    data.rolBase === 'community_manager' ? '#22c55e' :
    '#7170ff'

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '40px 32px',
        background: '#fafafa',
        position: 'relative',
      }}
    >
      {/* Keyframes inline para no depender de framer-motion */}
      <style>{`
        @keyframes mk-letra-aparece {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mk-icono-rol {
          0%, 100% { transform: rotate(-6deg) translateY(0); }
          50%      { transform: rotate(6deg)  translateY(-4px); }
        }
        @keyframes mk-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mk-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .mk-frase-aparece {
          opacity: 0;
          animation: mk-fade-up 0.8s 0.6s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mk-quote-mark {
          font-family: Georgia, serif;
          font-size: 64px;
          line-height: 1;
          color: var(--mk-quote-color);
          opacity: 0.15;
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header con saludo */}
        <header style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 18 }}>
          <span
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: data.avatarUrl ? `url(${data.avatarUrl}) center/cover` : acento,
              color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 600,
              flexShrink: 0,
              boxShadow: `0 0 0 4px #fff, 0 4px 16px ${acento}33`,
            }}
          >
            {!data.avatarUrl && data.nombre.charAt(0).toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: 30, fontWeight: 600,
                color: '#111827',
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.2,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <span>{saludo},</span>
              <NombreAnimado nombre={data.nombre} color={acento} />
              <IconoDelRol rolBase={data.rolBase} />
            </h1>
            <p
              style={{
                fontSize: 14.5,
                color: '#6b7280',
                margin: '6px 0 0',
                lineHeight: 1.5,
              }}
            >
              {bienvenida} a tu espacio de trabajo en{' '}
              <strong style={{ color: acento }}>Distinto Agencia</strong>. Tu rol:{' '}
              <strong style={{ color: '#111827' }}>{data.cargo || data.rol}</strong>.
            </p>
            {data.cumpleHoy && (
              <div
                style={{
                  marginTop: 10, padding: '8px 14px',
                  background: '#fef3c7', border: '1px solid #fcd34d',
                  borderRadius: 10, color: '#92400e',
                  fontSize: 13, fontWeight: 500,
                  display: 'inline-block',
                }}
              >
                🎂 ¡Feliz cumpleaños! Todo el equipo te desea un día genial.
              </div>
            )}
          </div>
        </header>

        {/* Frase del día — banner con cita elegante.
            Color sutil acorde al rol, animada con fade-up retardado para
            que entre después del nombre. Esquina superior izq. con comilla
            grande tipo libro. */}
        <section
          className="mk-frase-aparece"
          style={{
            marginBottom: 28,
            padding: '22px 28px 22px 32px',
            background: `linear-gradient(135deg, ${acento}08 0%, ${acento}03 100%)`,
            border: `1px solid ${acento}22`,
            borderRadius: 16,
            position: 'relative',
            overflow: 'hidden',
            ['--mk-quote-color' as string]: acento,
          } as React.CSSProperties}
        >
          {/* Quote mark decorativa */}
          <span
            className="mk-quote-mark"
            style={{
              position: 'absolute',
              top: -10,
              left: 12,
              pointerEvents: 'none',
            }}
          >
            “
          </span>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.5,
                  fontWeight: 500,
                  color: '#1f2937',
                  margin: 0,
                  fontStyle: 'italic',
                  letterSpacing: '-0.005em',
                }}
              >
                {data.fraseDia.texto}
              </p>
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    width: 22, height: 1.5, background: acento, opacity: 0.6,
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontSize: 13.5, fontWeight: 600,
                    color: acento,
                    letterSpacing: '0.01em',
                  }}
                >
                  {data.fraseDia.autor}
                </span>
                {data.fraseDia.contexto && (
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>
                    · {data.fraseDia.contexto}
                  </span>
                )}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                color: '#9ca3af',
                whiteSpace: 'nowrap',
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
              title={`Día ${data.fraseDia.numero} de ${data.fraseDia.total} en tu biblioteca`}
            >
              Frase del día · {data.fraseDia.numero}/{data.fraseDia.total}
            </span>
          </div>
        </section>

        {/* Grid principal: 2/3 contenido + 1/3 sidebar de hábitos */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 24,
          }}
        >
          {/* Columna principal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Cards de acceso rápido */}
            <section>
              <h2
                style={{
                  fontSize: 12, fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#9ca3af',
                  margin: '0 0 12px',
                }}
              >
                Acceso rápido
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                {data.modulosAccesibles.map((m) => (
                  <a
                    key={m.key}
                    href={m.href}
                    style={{
                      padding: '18px 16px',
                      background: '#fff',
                      border: '1px solid #f1f1f3',
                      borderRadius: 14,
                      textDecoration: 'none',
                      display: 'flex', flexDirection: 'column', gap: 8,
                      transition: 'all 150ms ease-out',
                      boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = m.color
                      e.currentTarget.style.boxShadow = `0 8px 20px -8px ${m.color}33`
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#f1f1f3'
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(16, 24, 40, 0.04)'
                      e.currentTarget.style.transform = 'none'
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{m.icon}</span>
                    <span
                      style={{
                        fontSize: 13.5, fontWeight: 600,
                        color: '#111827',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {m.label}
                    </span>
                    <span style={{ fontSize: 11, color: m.color, fontWeight: 500 }}>
                      Entrar →
                    </span>
                  </a>
                ))}
              </div>
            </section>

            {/* Mi trabajo de hoy */}
            <section>
              <h2
                style={{
                  fontSize: 12, fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#9ca3af',
                  margin: '0 0 12px',
                }}
              >
                {tituloMisTareas}{' '}
                <span style={{ color: '#d1d5db', fontWeight: 500 }}>·</span>{' '}
                <span style={{ color: '#6b7280' }}>{data.tareasMias.length}</span>
              </h2>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #f1f1f3',
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
                }}
              >
                {data.tareasMias.length === 0 ? (
                  <div
                    style={{
                      padding: 32,
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: 13,
                    }}
                  >
                    🎉 No tienes pendientes. ¡Buen trabajo!
                  </div>
                ) : (
                  data.tareasMias.map((t, i) => (
                    <a
                      key={t.id}
                      href={`/publicaciones/${t.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        borderBottom: i < data.tareasMias.length - 1 ? '1px solid #f3f4f6' : 'none',
                        textDecoration: 'none',
                        transition: 'background 100ms ease-out',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span
                        style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: t.marcaColor,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14, fontWeight: 500,
                            color: '#111827',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.nombre}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: '#6b7280',
                            marginTop: 2,
                          }}
                        >
                          {t.marca} · {t.meta}
                          {t.marcadaHoy && ' · 🔥 Hoy'}
                        </div>
                      </div>
                      <span style={{ color: '#d1d5db' }}>→</span>
                    </a>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar: hábitos del día */}
          <aside>
            <h2
              style={{
                fontSize: 12, fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#9ca3af',
                margin: '0 0 12px',
                display: 'flex', alignItems: 'baseline', gap: 6,
              }}
            >
              Tus hábitos de hoy{' '}
              <span style={{ color: '#d1d5db', fontWeight: 500 }}>·</span>{' '}
              <span style={{ color: '#7170ff' }}>
                {completadosCount}/{habitos.length}
              </span>
            </h2>
            <div
              style={{
                background: '#fff',
                border: '1px solid #f1f1f3',
                borderRadius: 14,
                padding: 6,
                boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
              }}
            >
              {habitos.length === 0 ? (
                <div style={{ padding: 18, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                  No tienes hábitos configurados.{' '}
                  <a href="/habitos" style={{ color: '#7170ff' }}>Crear →</a>
                </div>
              ) : (
                habitos.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => toggleHabito(h.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: h.completado ? `${h.color}10` : 'transparent',
                      border: 'none',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      transition: 'background 100ms ease-out',
                    }}
                    onMouseEnter={(e) => {
                      if (!h.completado) e.currentTarget.style.background = '#f9fafb'
                    }}
                    onMouseLeave={(e) => {
                      if (!h.completado) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span
                      style={{
                        width: 20, height: 20, borderRadius: 6,
                        border: `2px solid ${h.completado ? h.color : '#e5e7eb'}`,
                        background: h.completado ? h.color : 'transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 12, fontWeight: 700,
                        flexShrink: 0,
                        transition: 'all 150ms ease-out',
                      }}
                    >
                      {h.completado && '✓'}
                    </span>
                    <span style={{ fontSize: 15 }}>{h.icono}</span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13.5,
                        color: h.completado ? '#9ca3af' : '#111827',
                        textDecoration: h.completado ? 'line-through' : 'none',
                      }}
                    >
                      {h.nombre}
                    </span>
                  </button>
                ))
              )}
            </div>
            <a
              href="/habitos"
              style={{
                display: 'block',
                marginTop: 10,
                padding: '8px 14px',
                fontSize: 12, fontWeight: 500,
                color: '#7170ff',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Ver heatmap completo →
            </a>
          </aside>
        </div>
      </div>
    </main>
  )
}
