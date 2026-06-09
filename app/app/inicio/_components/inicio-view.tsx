'use client'

/* InicioView — dashboard de bienvenida para cada miembro del equipo.
   - Saludo grande "Hola Ailyn, bienvenida a tu espacio en Distinto"
   - Cards de acceso rápido a sus módulos accesibles
   - Lista de "Mi trabajo" (lo que tiene pendiente según su rol)
   - Sidebar con hábitos del día (clickeables para marcar)
*/

import { useState, useTransition, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { toggleHabitoHoy } from '@/app/habitos/_actions'
import {
  crearPendienteRapido,
  togglePendienteRapido,
  eliminarPendienteRapido,
} from '../_actions'

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
  /* Pendientes rápidos: lo que el user escribió en el chat de la home.
     La IA (o heurística) ya parseó título + categoría + prioridad. */
  pendientes: Array<{
    id: string
    titulo: string
    descripcion: string | null
    categoria: string
    prioridad: 1 | 2 | 3
    completado: boolean
    created_at: string
  }>
  /* Frase del día según rol. */
  fraseDia: {
    texto: string
    autor: string
    contexto: string | null
  }
}

/* Color por categoría — paleta consistente en toda la app */
const COLOR_CATEGORIA: Record<string, { bg: string; text: string; border: string }> = {
  'Diseño':         { bg: '#fdf2f8', text: '#9d174d', border: '#fbcfe8' },
  'Edición':        { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
  'Comunicación':   { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  'Investigación':  { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  'Personal':       { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  'Urgente':        { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  'Administrativo': { bg: '#f0f9ff', text: '#075985', border: '#bae6fd' },
  'Otro':           { bg: '#f9fafb', text: '#374151', border: '#e5e7eb' },
}

function getColorCategoria(cat: string) {
  return COLOR_CATEGORIA[cat] ?? COLOR_CATEGORIA['Otro']
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

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
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
          {/* Columna principal: Pendientes rápidos + chat */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <PendientesPanel
              pendientesIniciales={data.pendientes}
              acento={acento}
              rolBase={data.rolBase}
            />
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

/* ====================================================================
   PendientesPanel
   --------------------------------------------------------------------
   Panel principal de la home: arriba lista de tareas pendientes
   agrupadas por categoría (parseadas por IA), abajo barra de chat
   tipo ChatGPT donde el user escribe en lenguaje natural.
   ==================================================================== */

type Pendiente = {
  id: string
  titulo: string
  descripcion: string | null
  categoria: string
  prioridad: 1 | 2 | 3
  completado: boolean
  created_at: string
}

function PendientesPanel({
  pendientesIniciales,
  acento,
  rolBase,
}: {
  pendientesIniciales: Pendiente[]
  acento: string
  rolBase: string
}) {
  const [items, setItems] = useState<Pendiente[]>(pendientesIniciales)
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /* Placeholder de ejemplo según rol — tip al user de qué tipo de
     mensajes funcionan bien */
  const ejemplos: Record<string, string> = {
    disenador: 'Ej: "Tengo que mandar las portadas de Manrique a Lorena hoy mismo"',
    editor: 'Ej: "Editar el reel de Kintu antes de las 6pm"',
    community_manager: 'Ej: "Responder los DMs de Lozano y subir story de Fitness"',
    social_media_manager: 'Ej: "Revisar grilla de la semana de Kintu"',
    director: 'Ej: "Revisar caja chica del mes"',
  }
  const placeholder = ejemplos[rolBase] ?? 'Escribe lo que tienes que hacer y lo organizo por ti…'

  async function enviar() {
    const texto = input.trim()
    if (!texto || enviando) return
    setEnviando(true)
    setInput('')
    /* Placeholder optimista mientras la IA procesa */
    const tempId = `temp-${Date.now()}`
    const optimista: Pendiente = {
      id: tempId,
      titulo: texto.slice(0, 80),
      descripcion: null,
      categoria: 'Otro',
      prioridad: 2,
      completado: false,
      created_at: new Date().toISOString(),
    }
    setItems((curr) => [optimista, ...curr])

    try {
      const r = await crearPendienteRapido(texto)
      if (r.ok) {
        /* Reemplazar el optimista con el real */
        setItems((curr) => [r.pendiente, ...curr.filter((p) => p.id !== tempId)])
      } else {
        setItems((curr) => curr.filter((p) => p.id !== tempId))
        toast.error(r.error)
      }
    } finally {
      setEnviando(false)
      inputRef.current?.focus()
    }
  }

  function toggleItem(id: string) {
    /* No tocar optimistas (todavía no tienen id real) */
    if (id.startsWith('temp-')) return
    setItems((curr) => curr.map((p) => p.id === id ? { ...p, completado: !p.completado } : p))
    startTransition(async () => {
      const r = await togglePendienteRapido(id)
      if (!r.ok) {
        setItems((curr) => curr.map((p) => p.id === id ? { ...p, completado: !p.completado } : p))
        toast.error(r.error)
      } else if (r.completado) {
        /* Al completar lo retiramos de la lista visible después de 1s */
        setTimeout(() => {
          setItems((curr) => curr.filter((p) => p.id !== id))
        }, 1000)
      }
    })
  }

  function eliminarItem(id: string) {
    if (id.startsWith('temp-')) return
    if (!confirm('¿Eliminar este pendiente?')) return
    const prev = items
    setItems((curr) => curr.filter((p) => p.id !== id))
    startTransition(async () => {
      const r = await eliminarPendienteRapido(id)
      if (!r.ok) {
        setItems(prev)
        toast.error(r.error)
      }
    })
  }

  /* Agrupar por categoría, ordenando por prioridad dentro de cada grupo */
  const grupos = useMemo(() => {
    const m = new Map<string, Pendiente[]>()
    for (const p of items) {
      if (p.completado) continue  /* Los completados se ocultan */
      const arr = m.get(p.categoria) ?? []
      arr.push(p)
      m.set(p.categoria, arr)
    }
    /* Sort dentro de cada categoría: prioridad asc (1=alta primero), después fecha desc */
    for (const arr of m.values()) {
      arr.sort((a, b) => a.prioridad - b.prioridad || (b.created_at < a.created_at ? -1 : 1))
    }
    /* Sort de categorías: Urgente primero, después por nombre */
    const ordenCat = (cat: string) => cat === 'Urgente' ? -1 : 0
    return Array.from(m.entries()).sort(([a], [b]) => ordenCat(a) - ordenCat(b) || a.localeCompare(b))
  }, [items])

  const totalActivos = items.filter((p) => !p.completado).length

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #f1f1f3',
        borderRadius: 16,
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 480,
      }}
    >
      {/* Header del panel */}
      <header
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <h2
          style={{
            fontSize: 14, fontWeight: 600,
            color: '#111827',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>✨</span>
          <span>Pendientes rápidos de hoy</span>
          {totalActivos > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 999,
              background: `${acento}15`,
              color: acento,
              marginLeft: 4,
            }}>
              {totalActivos}
            </span>
          )}
        </h2>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          Te organizo todo con IA
        </span>
      </header>

      {/* Lista agrupada por categoría */}
      <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', maxHeight: 520 }}>
        {grupos.length === 0 ? (
          <div style={{
            padding: '48px 16px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 13.5,
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <div style={{ color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
              Sin pendientes
            </div>
            <div style={{ color: '#9ca3af' }}>
              Escribe abajo lo que tienes que hacer.<br />
              Yo lo organizo, categorizo y prioritizo por ti.
            </div>
          </div>
        ) : (
          grupos.map(([categoria, pendientes]) => {
            const col = getColorCategoria(categoria)
            return (
              <div key={categoria} style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                  paddingLeft: 4,
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: col.bg,
                    color: col.text,
                    border: `1px solid ${col.border}`,
                  }}>
                    {categoria}
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {pendientes.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {pendientes.map((p) => (
                    <PendienteItem
                      key={p.id}
                      p={p}
                      acento={acento}
                      onToggle={() => toggleItem(p.id)}
                      onDelete={() => eliminarItem(p.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Barra de chat estilo ChatGPT */}
      <div
        style={{
          borderTop: '1px solid #f3f4f6',
          padding: 12,
          background: '#fafafa',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            padding: '8px 8px 8px 14px',
            transition: 'border-color 150ms',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = acento }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={enviando}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                enviar()
              }
            }}
            onInput={(e) => {
              const ta = e.currentTarget
              ta.style.height = 'auto'
              ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
            }}
            style={{
              flex: 1,
              fontFamily: 'inherit',
              fontSize: 14,
              lineHeight: 1.5,
              color: '#111827',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: '6px 0',
              background: 'transparent',
              maxHeight: 120,
            }}
          />
          <button
            onClick={enviar}
            disabled={!input.trim() || enviando}
            title="Enviar (Enter)"
            style={{
              width: 34, height: 34,
              borderRadius: 10,
              background: input.trim() ? acento : '#e5e7eb',
              color: '#fff',
              border: 'none',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              fontSize: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 150ms',
              flexShrink: 0,
            }}
          >
            {enviando ? '…' : '↑'}
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 6, paddingLeft: 4 }}>
          Enter para enviar · Shift+Enter para nueva línea
        </div>
      </div>
    </section>
  )
}

/* Card individual de un pendiente con checkbox + título + descripción
   opcional + dot de prioridad + botón eliminar al hover. */
function PendienteItem({
  p,
  acento,
  onToggle,
  onDelete,
}: {
  p: Pendiente
  acento: string
  onToggle: () => void
  onDelete: () => void
}) {
  const [hover, setHover] = useState(false)
  const dotPri =
    p.prioridad === 1 ? '#ef4444' :
    p.prioridad === 2 ? '#f59e0b' :
    '#d1d5db'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 10,
        background: hover ? '#fafafa' : 'transparent',
        transition: 'background 100ms',
        opacity: p.completado ? 0.5 : 1,
      }}
    >
      <button
        onClick={onToggle}
        title={p.completado ? 'Desmarcar' : 'Marcar como hecho'}
        style={{
          width: 18, height: 18,
          borderRadius: 6,
          border: `2px solid ${p.completado ? acento : '#d1d5db'}`,
          background: p.completado ? acento : 'transparent',
          color: '#fff',
          fontSize: 11, fontWeight: 700,
          flexShrink: 0,
          marginTop: 2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 150ms',
        }}
      >
        {p.completado && '✓'}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5,
          color: '#111827',
          lineHeight: 1.45,
          textDecoration: p.completado ? 'line-through' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: dotPri,
            flexShrink: 0,
            display: 'inline-block',
          }} title={p.prioridad === 1 ? 'Alta prioridad' : p.prioridad === 2 ? 'Media' : 'Baja'} />
          {p.titulo}
        </div>
        {p.descripcion && (
          <div style={{
            fontSize: 11.5,
            color: '#9ca3af',
            marginTop: 2,
            lineHeight: 1.4,
          }}>
            {p.descripcion}
          </div>
        )}
      </div>
      {hover && !p.id.startsWith('temp-') && (
        <button
          onClick={onDelete}
          title="Eliminar"
          style={{
            width: 24, height: 24,
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            fontSize: 14,
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fef2f2'
            e.currentTarget.style.color = '#dc2626'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#9ca3af'
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
