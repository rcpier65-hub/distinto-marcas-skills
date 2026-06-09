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
import {
  Palette, Flame, User, Scissors, Calendar, MessageCircle,
  Target, Users, DollarSign, Zap, Sparkles, CalendarClock,
  ClipboardList, Image as LucideImage, FolderOpen, Megaphone,
  Search, Save, BarChart3, Lightbulb, Smile, type LucideIcon,
} from 'lucide-react'
import { toggleHabitoHoy, toggleHabitoFecha } from '@/app/habitos/_actions'
import {
  crearPendienteRapido,
  togglePendienteRapido,
  eliminarPendienteRapido,
  convertirEnTarea,
} from '../_actions'

export type InicioData = {
  nombre: string
  /* Saludo calculado en server (timezone Lima): 'Buenos días',
     'Buenas tardes' o 'Buenas noches'. Antes el cliente lo calculaba
     con new Date().getHours() pero durante SSR el server de Vercel
     está en UTC y daba 'Buenos días' a las 9pm Lima. */
  saludo: string
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
    /* Fechas YYYY-MM-DD cumplidas en los últimos 7 días — alimenta
       los círculos por día estilo /habitos. */
    historial: string[]
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
  /* Reuniones programadas (publicaciones con reunion_hora). Solo a
     futuro, ordenadas por fecha+hora. Caen acá solo si el user tiene
     acceso a algún módulo de tareas (editor/diseno/publicaciones). */
  reuniones: Array<{
    id: string
    titulo: string
    marca: string
    marcaColor: string
    cuando: string  /* 'Hoy', 'lun 12 jun', etc. */
    hora: string    /* 'HH:MM' */
    esHoy: boolean
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
  /* Saludo viene del server (timezone Lima) — ya no calculamos en cliente */
  const saludo = data.saludo
  const bienvenida =
    /[aá]$/.test(data.nombre) ? 'Bienvenida' : 'Bienvenido'
  const completadosCount = habitos.filter((h) => h.completado).length

  /* Hoy en YMD local (Lima TZ) — para el tracker de 7 días. Tomado del
     primer item de habitosHoy si existe (calculado en server con misma
     lógica), o fallback al cliente. */
  const hoy = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  function toggleHabito(id: string) {
    const prev = habitos
    const habito = habitos.find((h) => h.id === id)
    if (!habito) return
    const yaCompletado = habito.historial.includes(hoy)
    setHabitos((curr) =>
      curr.map((h) => {
        if (h.id !== id) return h
        const nuevoHistorial = yaCompletado
          ? h.historial.filter((f) => f !== hoy)
          : [...h.historial, hoy]
        return { ...h, completado: !yaCompletado, historial: nuevoHistorial }
      })
    )
    startTransition(async () => {
      const r = await toggleHabitoHoy(id)
      if (!r.ok) {
        setHabitos(prev)
        toast.error(r.error)
      }
    })
  }

  /* Toggle de cualquier fecha (no solo hoy) para clicks en el tracker.
     Si fecha == hoy delegamos a toggleHabito para mantener consistencia
     del estado 'completado'. */
  function toggleHabitoFechaHome(id: string, fecha: string) {
    if (fecha === hoy) { toggleHabito(id); return }
    if (fecha > hoy) return  /* no marcar futuros */
    const prev = habitos
    setHabitos((curr) =>
      curr.map((h) => {
        if (h.id !== id) return h
        const tiene = h.historial.includes(fecha)
        const nuevoHistorial = tiene
          ? h.historial.filter((f) => f !== fecha)
          : [...h.historial, fecha]
        return { ...h, historial: nuevoHistorial }
      })
    )
    startTransition(async () => {
      const r = await toggleHabitoFecha(id, fecha)
      if (!r.ok) {
        setHabitos(prev)
        toast.error(r.error)
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
          {/* Columna principal: accesos rápidos + trabajo + reuniones + chat */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AccesosRapidos rolBase={data.rolBase} acento={acento} />
            <TrabajoYReuniones
              tareas={data.tareasMias}
              reuniones={data.reuniones}
              acento={acento}
            />
            <PendientesPanel
              pendientesIniciales={data.pendientes}
              acento={acento}
              rolBase={data.rolBase}
            />
          </div>

          {/* Sidebar: tracker de hábitos estilo /habitos.
              Diseño consistente con el módulo de hábitos: violeta #ba41f7,
              círculos por día de la semana clickeables. */}
          <aside>
            <HabitosTrackerHome
              habitos={habitos}
              today={hoy}
              completadosCount={completadosCount}
              onToggleHoy={toggleHabito}
              onToggleFecha={toggleHabitoFechaHome}
            />
          </aside>
        </div>
      </div>
    </main>
  )
}

/* ====================================================================
   TrabajoYReuniones
   --------------------------------------------------------------------
   Bloque superior de la columna principal: muestra
     1) Tu trabajo de hoy  (tareas reales de publicaciones según rol)
     2) Reuniones pendientes (publicaciones con reunion_hora)
   Si ambas están vacías, muestra un empty-state amable.
   ==================================================================== */
function TrabajoYReuniones({
  tareas,
  reuniones,
  acento,
}: {
  tareas: InicioData['tareasMias']
  reuniones: InicioData['reuniones']
  acento: string
}) {
  const tituloTareas =
    tareas[0]?.modulo === 'editor' ? 'Tus videos por editar' :
    tareas[0]?.modulo === 'diseno' ? 'Tus tareas de diseño' :
    tareas[0]?.modulo === 'comentarios' ? 'Comentarios por responder' :
    'Tu trabajo de hoy'

  if (tareas.length === 0 && reuniones.length === 0) {
    return (
      <section style={cardStyle}>
        <div style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
          <div style={{ color: '#374151', fontWeight: 500, fontSize: 14 }}>
            No tienes pendientes asignados ni reuniones programadas.
          </div>
          <div style={{ color: '#9ca3af', fontSize: 12.5, marginTop: 4 }}>
            Cuando lleguen tareas nuevas las verás aquí. Mientras tanto puedes anotar tareas rápidas abajo ↓
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      {/* Tu trabajo de hoy */}
      {tareas.length > 0 && (
        <section>
          <SectionTitle
            label={tituloTareas}
            count={tareas.length}
            countColor={acento}
          />
          <div style={cardStyle}>
            {tareas.map((t, i) => (
              <a
                key={t.id}
                href={`/publicaciones/${t.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < tareas.length - 1 ? '1px solid #f3f4f6' : 'none',
                  textDecoration: 'none',
                  transition: 'background 100ms ease-out',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: t.marcaColor, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: '#111827',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.nombre}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span>{t.marca} · {t.meta}</span>
                    {t.marcadaHoy && (
                      <span style={{
                        fontSize: 9.5, fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: '#fef2f2',
                        color: '#dc2626',
                        letterSpacing: '0.04em',
                      }}>HOY</span>
                    )}
                  </div>
                </div>
                <span style={{ color: '#d1d5db' }}>→</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Reuniones pendientes */}
      {reuniones.length > 0 && (
        <section>
          <SectionTitle
            label="Reuniones pendientes"
            count={reuniones.length}
            countColor={acento}
            IconComp={CalendarClock}
          />
          <div style={cardStyle}>
            {reuniones.map((r, i) => (
              <a
                key={r.id}
                href={`/publicaciones/${r.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < reuniones.length - 1 ? '1px solid #f3f4f6' : 'none',
                  textDecoration: 'none',
                  transition: 'background 100ms ease-out',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: r.marcaColor, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: '#111827',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textTransform: 'capitalize',
                  }}>
                    {r.titulo}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 2, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span>{r.marca} · {r.cuando}{r.hora && ` · ${r.hora}`}</span>
                    {r.esHoy && (
                      <span style={{
                        fontSize: 9.5, fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: '#fef2f2',
                        color: '#dc2626',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}>Hoy</span>
                    )}
                  </div>
                </div>
                <span style={{ color: '#d1d5db' }}>→</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #f1f1f3',
  borderRadius: 14,
  overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
}

function SectionTitle({ label, count, countColor, IconComp }: {
  label: string
  count: number
  countColor: string
  IconComp?: LucideIcon
}) {
  return (
    <h2 style={{
      fontSize: 12, fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: '#9ca3af',
      margin: '0 0 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      {IconComp && (
        <span style={{
          color: countColor,
          display: 'inline-flex',
          alignItems: 'center',
        }}>
          <IconComp size={14} strokeWidth={2} />
        </span>
      )}
      <span>{label}</span>
      <span style={{ color: '#d1d5db', fontWeight: 500 }}>·</span>
      <span style={{ color: countColor, fontWeight: 700 }}>{count}</span>
    </h2>
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
  const router = useRouter()
  const [items, setItems] = useState<Pendiente[]>(pendientesIniciales)
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /* Placeholder de ejemplo según rol — tip al user de qué tipo de
     mensajes funcionan bien */
  const ejemplos: Record<string, string> = {
    disenador: 'Anota una tarea rápida: "Mandar portadas a Lorena hoy"',
    editor: 'Anota una tarea rápida: "Editar reel Kintu antes de las 6pm"',
    community_manager: 'Anota una tarea rápida: "Responder DMs de Lozano"',
    social_media_manager: 'Anota una tarea rápida: "Revisar grilla de Kintu"',
    director: 'Anota una tarea rápida: "Revisar caja chica del mes"',
  }
  const placeholder = ejemplos[rolBase] ?? 'Anota una tarea rápida…'

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
  const puedeConvertir = rolBase === 'disenador' || rolBase === 'editor' || rolBase === 'admin'

  async function convertir(id: string) {
    if (id.startsWith('temp-')) return
    setItems((curr) => curr.map((p) => p.id === id ? { ...p, completado: true } : p))
    const r = await convertirEnTarea(id)
    if (r.ok) {
      setItems((curr) => curr.filter((p) => p.id !== id))
      toast.success('Convertida en tarea real — abriendo el detalle...')
      router.push(`/publicaciones/${r.publicacionId}`)
    } else {
      setItems((curr) => curr.map((p) => p.id === id ? { ...p, completado: false } : p))
      toast.error(r.error)
    }
  }

  return (
    <>
      {/* Tareas rápidas — solo aparece si hay items.
          Al inicio queda oculto para no dejar espacio vacío. */}
      {totalActivos > 0 && (
        <section>
          <SectionTitle
            label="Tareas rápidas"
            count={totalActivos}
            countColor={acento}
            IconComp={Sparkles}
          />
          <div style={{ ...cardStyle, padding: '8px 6px' }}>
            {grupos.map(([categoria, pendientes]) => {
              const col = getColorCategoria(categoria)
              return (
                <div key={categoria} style={{ marginBottom: 6 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px 4px',
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
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {pendientes.map((p) => (
                      <PendienteItem
                        key={p.id}
                        p={p}
                        acento={acento}
                        puedeConvertir={puedeConvertir}
                        onToggle={() => toggleItem(p.id)}
                        onDelete={() => eliminarItem(p.id)}
                        onConvertir={() => convertir(p.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Barra de chat — siempre anclada abajo (sticky bottom dentro del flow).
          Diseño compacto, una sola línea por defecto.  */}
      <section
        style={{
          position: 'sticky',
          bottom: 12,
          marginTop: 4,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 14,
          boxShadow: '0 4px 16px -4px rgba(16, 24, 40, 0.08)',
          padding: '8px 8px 8px 14px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          zIndex: 5,
        }}
      >
        <span style={{ fontSize: 14, marginBottom: 6, opacity: 0.7 }} aria-hidden>
          ✨
        </span>
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
            fontWeight: 700,
          }}
        >
          {enviando ? '…' : '↑'}
        </button>
      </section>
    </>
  )
}

/* Card individual de un pendiente con checkbox + título + descripción
   opcional + dot de prioridad + botón eliminar al hover. */
function PendienteItem({
  p,
  acento,
  puedeConvertir,
  onToggle,
  onDelete,
  onConvertir,
}: {
  p: Pendiente
  acento: string
  puedeConvertir: boolean
  onToggle: () => void
  onDelete: () => void
  onConvertir: () => void
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
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {puedeConvertir && (
            <button
              onClick={onConvertir}
              title="Convertir en tarea real (aparece en tu módulo)"
              style={{
                height: 24,
                padding: '0 8px',
                borderRadius: 6,
                background: `${acento}10`,
                border: `1px solid ${acento}33`,
                color: acento,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${acento}20` }}
              onMouseLeave={(e) => { e.currentTarget.style.background = `${acento}10` }}
            >
              ↗ Tarea
            </button>
          )}
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
        </div>
      )}
    </div>
  )
}

/* ====================================================================
   AccesosRapidos
   --------------------------------------------------------------------
   Cards de acceso rápido por rol. Nombres descriptivos en lugar de
   genéricos: "Mis diseños para hoy" en vez de "Diseño". Hover lift +
   color del rol como acento. 2-3 cards máximo para no saturar.
   ==================================================================== */
function AccesosRapidos({ rolBase, acento }: { rolBase: string; acento: string }) {
  const accesos = useMemo<Array<{ titulo: string; subtitulo: string; href: string; Icon: LucideIcon; color?: string }>>(() => {
    const COMUNES = {
      perfil: { titulo: 'Mi perfil', subtitulo: 'Foto, datos, contraseña', href: '/perfil', Icon: User },
      habitos: { titulo: 'Mis hábitos', subtitulo: 'Heatmap completo y rutinas', href: '/habitos', Icon: Flame },
    }
    if (rolBase === 'disenador') {
      return [
        { titulo: 'Mis diseños para hoy', subtitulo: 'Tareas pendientes en diseño', href: '/diseno', Icon: Palette, color: '#ec4899' },
        COMUNES.habitos,
        COMUNES.perfil,
      ]
    }
    if (rolBase === 'editor') {
      return [
        { titulo: 'Editar hoy', subtitulo: 'Videos asignados a ti', href: '/editor', Icon: Scissors, color: '#8b5cf6' },
        { titulo: 'Publicaciones semanales', subtitulo: 'Toda la grilla de la semana', href: '/publicaciones', Icon: Calendar, color: '#06b6d4' },
        COMUNES.habitos,
      ]
    }
    if (rolBase === 'community_manager' || rolBase === 'social_media_manager') {
      return [
        { titulo: 'Atender comentarios', subtitulo: 'Inbox y respuestas pendientes', href: '/comentarios', Icon: MessageCircle, color: '#22c55e' },
        { titulo: 'Publicaciones de la semana', subtitulo: 'Qué sale, cuándo y dónde', href: '/publicaciones', Icon: Calendar, color: '#06b6d4' },
        COMUNES.habitos,
      ]
    }
    /* director / admin / default — Pedro como owner ve TODO,
       elegimos los más usados día a día */
    return [
      { titulo: 'Cockpit ejecutivo', subtitulo: 'Métricas globales del día', href: '/cockpit', Icon: Target, color: '#7170ff' },
      { titulo: 'Publicaciones', subtitulo: 'Grilla y estado de tareas', href: '/publicaciones', Icon: Calendar, color: '#06b6d4' },
      { titulo: 'Finanzas', subtitulo: 'Ingresos, egresos y caja', href: '/finanzas', Icon: DollarSign, color: '#22c55e' },
      { titulo: 'Mi equipo', subtitulo: 'Miembros, permisos, accesos', href: '/equipo', Icon: Users, color: '#f59e0b' },
      COMUNES.habitos,
    ]
  }, [rolBase])

  return (
    <section>
      <SectionTitle label="Accesos rápidos" count={accesos.length} countColor={acento} IconComp={Zap} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {accesos.map((a) => {
          const accColor = a.color ?? acento
          const Icon = a.Icon
          return (
            <a
              key={a.href}
              href={a.href}
              style={{
                padding: '14px 14px 12px',
                background: '#fff',
                border: '1px solid #f1f1f3',
                borderRadius: 14,
                textDecoration: 'none',
                display: 'flex', flexDirection: 'column', gap: 6,
                transition: 'all 180ms cubic-bezier(.22,1,.36,1)',
                boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${accColor}66`
                e.currentTarget.style.boxShadow = `0 8px 20px -6px ${accColor}33`
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#f1f1f3'
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(16, 24, 40, 0.04)'
                e.currentTarget.style.transform = 'none'
              }}
            >
              {/* Detalle decorativo: cinta del color en la esquina superior */}
              <span aria-hidden style={{
                position: 'absolute',
                top: 0, right: 0,
                width: 38, height: 38,
                background: `radial-gradient(circle at top right, ${accColor}22, transparent 70%)`,
                pointerEvents: 'none',
              }} />
              {/* Ícono lucide en cuadro tinted con el color del acceso */}
              <span style={{
                width: 36, height: 36,
                borderRadius: 10,
                background: `${accColor}12`,
                color: accColor,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 2,
              }}>
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <span style={{
                fontSize: 13.5, fontWeight: 600,
                color: '#111827',
                letterSpacing: '-0.005em',
                lineHeight: 1.3,
              }}>
                {a.titulo}
              </span>
              <span style={{ fontSize: 11.5, color: '#6b7280', lineHeight: 1.4 }}>
                {a.subtitulo}
              </span>
              <span style={{ fontSize: 10.5, color: accColor, fontWeight: 600, marginTop: 2 }}>
                Entrar →
              </span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

/* ====================================================================
   HabitosTrackerHome
   --------------------------------------------------------------------
   Versión compacta del HabitosTracker de /habitos para el sidebar de
   la home. Mismo estilo violeta #ba41f7, círculos por día clickeables,
   pero pensado para una columna angosta (≈360px).
   ==================================================================== */
const VIOLETA_HABITOS = '#ba41f7'

/* Mapeo de emoji (como están guardados en BD) → ícono lucide.
   Los hábitos default por rol usan estos emojis. Para hábitos custom
   con emojis no mapeados, caemos al emoji original (sigue funcionando). */
const ICONO_HABITO_POR_EMOJI: Record<string, LucideIcon> = {
  '🎨': Palette,
  '🖼️': LucideImage,
  '🖼': LucideImage,
  '📁': FolderOpen,
  '📢': Megaphone,
  '💬': MessageCircle,
  '📈': BarChart3,
  '📊': BarChart3,
  '📸': LucideImage,
  '📋': ClipboardList,
  '✂️': Scissors,
  '✂': Scissors,
  '💾': Save,
  '📅': Calendar,
  '🎯': Target,
  '💰': DollarSign,
  '🤝': Users,
  '🧠': Lightbulb,
  '✅': Smile,
  '🔥': Flame,
}

function IconoHabito({ emoji, color, size = 18 }: { emoji: string; color: string; size?: number }) {
  const LucideIco = ICONO_HABITO_POR_EMOJI[emoji]
  if (LucideIco) {
    return (
      <span style={{ color, display: 'inline-flex' }}>
        <LucideIco size={size} strokeWidth={1.8} />
      </span>
    )
  }
  /* Fallback emoji (hábito custom con emoji no mapeado) */
  return <span style={{ fontSize: size, lineHeight: 1 }}>{emoji}</span>
}

function HabitosTrackerHome({
  habitos,
  today,
  completadosCount,
  onToggleHoy,
  onToggleFecha,
}: {
  habitos: InicioData['habitosHoy']
  today: string
  completadosCount: number
  onToggleHoy: (id: string) => void
  onToggleFecha: (id: string, fecha: string) => void
}) {
  /* Pedro pidió: mostrar HOY a la izquierda + los siguientes 6 días.
     Solo HOY es clickeable. Días futuros son visibles para que el user
     anticipe la semana, pero bloqueados.
     Para marcar días anteriores → ir a /habitos (tracker completo). */
  const semana = useMemo(() => {
    const hoyDate = new Date(today + 'T12:00:00')
    const letras = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoyDate)
      d.setDate(d.getDate() + i)  /* HOY (i=0) y +6 días adelante */
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const ymd = `${y}-${m}-${day}`
      return {
        ymd,
        letra: letras[d.getDay()],
        num: d.getDate(),
        esHoy: ymd === today,
        esFuturo: ymd > today,
      }
    })
  }, [today])

  if (habitos.length === 0) {
    return (
      <section>
        <h2 style={tituloHabitosStyle}>
          <span style={{ color: VIOLETA_HABITOS, display: 'inline-flex' }}>
            <Flame size={14} strokeWidth={2} />
          </span>
          <span>Tus hábitos del día</span>
        </h2>
        <div style={{
          background: '#fff',
          border: '1px solid #f1f1f3',
          borderRadius: 14,
          padding: 24,
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: 12.5,
        }}>
          No tienes hábitos configurados.{' '}
          <a href="/habitos" style={{ color: VIOLETA_HABITOS, fontWeight: 600 }}>Crear →</a>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 style={tituloHabitosStyle}>
        <span style={{ color: VIOLETA_HABITOS, display: 'inline-flex' }}>
          <Flame size={14} strokeWidth={2} />
        </span>
        <span style={{ flex: 1 }}>Tus hábitos del día</span>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 999,
          background: `${VIOLETA_HABITOS}15`,
          color: VIOLETA_HABITOS,
          letterSpacing: 0,
        }}>
          {completadosCount}/{habitos.length}
        </span>
      </h2>
      <p style={{
        fontSize: 11.5,
        color: '#6b7280',
        margin: '0 0 12px',
        lineHeight: 1.4,
      }}>
        Marca el círculo <strong style={{ color: VIOLETA_HABITOS }}>de hoy</strong> apenas lo cumplas. Los días que vienen son tu vista a futuro.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habitos.map((h) => {
          const cumplidosSemana = semana.filter((d) => h.historial.includes(d.ymd)).length
          return (
            <div
              key={h.id}
              style={{
                background: '#fff',
                border: '1px solid #f1f1f3',
                borderRadius: 14,
                padding: '12px 14px',
                boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
              }}>
                {/* Cuadro con icono lucide tinted del color del hábito */}
                <span style={{
                  width: 30, height: 30,
                  borderRadius: 8,
                  background: `${h.color}14`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <IconoHabito emoji={h.icono} color={h.color} size={16} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.005em',
                  }}>
                    {h.nombre}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>
                    {cumplidosSemana}/7 esta semana
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'space-between' }}>
                {semana.map((d) => {
                  const ok = h.historial.includes(d.ymd)
                  /* Solo el día de HOY es clickeable. Días futuros
                     visibles pero deshabilitados para que el user vea
                     el plan de la semana sin poder marcar el futuro. */
                  const clickable = d.esHoy
                  return (
                    <button
                      key={d.ymd}
                      onClick={() => clickable && onToggleFecha(h.id, d.ymd)}
                      disabled={!clickable}
                      title={
                        clickable
                          ? (ok ? 'Hoy — clic para desmarcar' : 'Hoy — clic para marcar')
                          : `${d.ymd} (próximo, no se puede marcar todavía)`
                      }
                      style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 3,
                        padding: 0,
                        background: 'transparent',
                        border: 'none',
                        cursor: clickable ? 'pointer' : 'default',
                        fontFamily: 'inherit',
                        opacity: d.esFuturo ? 0.55 : 1,
                      }}
                    >
                      <span style={{
                        width: 30, height: 30, borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11, fontWeight: 600,
                        transition: 'all 150ms ease-out',
                        ...(ok
                          ? { background: VIOLETA_HABITOS, color: '#fff', boxShadow: `0 2px 6px ${VIOLETA_HABITOS}44` }
                          : d.esHoy
                          ? { border: `2px solid ${VIOLETA_HABITOS}`, background: `${VIOLETA_HABITOS}14`, color: VIOLETA_HABITOS }
                          : d.esFuturo
                          ? { border: '1.5px dashed #d1d5db', color: '#cbd5e1', background: '#fafafa' }
                          : { border: '1.5px solid #e4e4e7', color: '#a1a1aa' }
                        ),
                      }}>
                        {ok ? '✓' : d.num}
                      </span>
                      <span style={{
                        fontSize: 9.5,
                        color: d.esHoy ? '#111827' : '#9ca3af',
                        fontWeight: d.esHoy ? 700 : 500,
                      }}>
                        {d.letra}
                      </span>
                    </button>
                  )
                })}
              </div>
              {/* Botón ¡Hecho hoy! solo si NO está completado */}
              {!h.completado && (
                <button
                  onClick={() => onToggleHoy(h.id)}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    padding: '7px 12px',
                    background: `${VIOLETA_HABITOS}0c`,
                    border: `1px dashed ${VIOLETA_HABITOS}44`,
                    color: VIOLETA_HABITOS,
                    borderRadius: 10,
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${VIOLETA_HABITOS}15`
                    e.currentTarget.style.borderStyle = 'solid'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `${VIOLETA_HABITOS}0c`
                    e.currentTarget.style.borderStyle = 'dashed'
                  }}
                >
                  ✓ Marcar como hecho hoy
                </button>
              )}
            </div>
          )
        })}
      </div>

      <a
        href="/habitos"
        style={{
          display: 'block',
          marginTop: 10,
          padding: '8px 14px',
          fontSize: 11.5, fontWeight: 600,
          color: VIOLETA_HABITOS,
          textAlign: 'center',
          textDecoration: 'none',
        }}
      >
        Ver tracker completo →
      </a>
    </section>
  )
}

const tituloHabitosStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#9ca3af',
  margin: '0 0 6px',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}
