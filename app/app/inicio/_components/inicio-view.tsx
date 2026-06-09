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

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '40px 32px',
        background: '#fafafa',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header con saludo */}
        <header style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 18 }}>
          <span
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: data.avatarUrl ? `url(${data.avatarUrl}) center/cover` : '#7170ff',
              color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 600,
              flexShrink: 0,
              boxShadow: '0 0 0 4px #fff, 0 4px 16px rgba(16, 24, 40, 0.10)',
            }}
          >
            {!data.avatarUrl && data.nombre.charAt(0).toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: 28, fontWeight: 600,
                color: '#111827',
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {saludo}, {data.nombre} 👋
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
              <strong style={{ color: '#7170ff' }}>Distinto Agencia</strong>. Tu rol:{' '}
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
