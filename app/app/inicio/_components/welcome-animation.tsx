'use client'

/* WelcomeAnimation — overlay full-screen que se muestra solo
   inmediatamente después del login. Pedro pidió "una animación atractiva
   tipo intro al workspace" — bienvenida personalizada por rol que
   muestra de qué se trata su espacio, qué módulos tiene, y termina
   revelando el dashboard.

   Estilo: editorial creativo, gradientes suaves, tipografía Inter Tight,
   motion staggered, sin animaciones repetitivas. */

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Palette, Scissors, MessageCircle, Calendar, Target,
  DollarSign, Users, Flame, Sparkles, ArrowRight,
  Image as LucideImage, Video, BarChart3, Megaphone,
  type LucideIcon,
} from 'lucide-react'

type Modulo = {
  Icon: LucideIcon
  titulo: string
  subtitulo: string
  color: string
}

const MODULOS_POR_ROL: Record<string, Modulo[]> = {
  disenador: [
    { Icon: Palette,      titulo: 'Diseño',         subtitulo: 'Tus piezas, portadas y mockups', color: '#ec4899' },
    { Icon: LucideImage,  titulo: 'Portadas',       subtitulo: 'Estado y avance de cada tarea',  color: '#f59e0b' },
    { Icon: Flame,        titulo: 'Rutinas',        subtitulo: 'Tus hábitos diarios',            color: '#ba41f7' },
  ],
  editor: [
    { Icon: Scissors,     titulo: 'Editor',         subtitulo: 'Tus videos asignados',           color: '#8b5cf6' },
    { Icon: Calendar,     titulo: 'Publicaciones',  subtitulo: 'Grilla semanal completa',        color: '#06b6d4' },
    { Icon: Video,        titulo: 'Grabaciones',    subtitulo: 'Próximas sesiones',              color: '#22c55e' },
    { Icon: Flame,        titulo: 'Rutinas',        subtitulo: 'Tus hábitos diarios',            color: '#ba41f7' },
  ],
  community_manager: [
    { Icon: MessageCircle, titulo: 'Inbox',         subtitulo: 'Comentarios por responder',      color: '#22c55e' },
    { Icon: Calendar,      titulo: 'Publicaciones', subtitulo: 'Grilla y estado',                color: '#06b6d4' },
    { Icon: Megaphone,     titulo: 'Marcas',        subtitulo: 'Voz y reglas de cada cliente',   color: '#f59e0b' },
    { Icon: Flame,         titulo: 'Rutinas',       subtitulo: 'Tus hábitos diarios',            color: '#ba41f7' },
  ],
  social_media_manager: [
    { Icon: BarChart3,     titulo: 'Métricas',      subtitulo: 'Engagement y crecimiento',       color: '#7170ff' },
    { Icon: Calendar,      titulo: 'Publicaciones', subtitulo: 'Grilla semanal',                 color: '#06b6d4' },
    { Icon: MessageCircle, titulo: 'Inbox',         subtitulo: 'Atención por marca',             color: '#22c55e' },
    { Icon: Flame,         titulo: 'Rutinas',       subtitulo: 'Tus hábitos diarios',            color: '#ba41f7' },
  ],
  director: [
    { Icon: Target,        titulo: 'Cockpit',       subtitulo: 'Métricas globales en vivo',      color: '#7170ff' },
    { Icon: DollarSign,    titulo: 'Finanzas',      subtitulo: 'Ingresos y caja',                color: '#22c55e' },
    { Icon: Users,         titulo: 'Equipo',        subtitulo: 'Miembros y permisos',            color: '#f59e0b' },
    { Icon: Calendar,      titulo: 'Publicaciones', subtitulo: 'Todo el contenido',              color: '#06b6d4' },
  ],
}

const PROMESAS_POR_ROL: Record<string, string> = {
  disenador:           'Tu espacio para crear sin ruido. Las tareas, los entregables y tus rutinas, en un solo lugar.',
  editor:              'Tu sala de montaje digital. Cada video, cada deadline, cada take — todo a la mano.',
  community_manager:   'Tu centro de mando para las conversaciones. Marcas, comentarios, voz y estrategia, sincronizados.',
  social_media_manager: 'Tu radar de contenido. Lo que sale, lo que funciona y lo que viene después.',
  director:            'Tu vista 360° del negocio. Métricas, equipo, finanzas y operación en una sola pantalla.',
}

const ROL_NOMBRES: Record<string, string> = {
  disenador:            'Diseñador',
  editor:               'Editor',
  community_manager:    'Community Manager',
  social_media_manager: 'Social Media Manager',
  director:             'Director · CEO',
}

export function WelcomeAnimation({
  nombre,
  rolBase,
  acento,
}: {
  nombre: string
  rolBase: string
  acento: string
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [closing, setClosing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const modulos = MODULOS_POR_ROL[rolBase] ?? MODULOS_POR_ROL.director
  const promesa = PROMESAS_POR_ROL[rolBase] ?? PROMESAS_POR_ROL.director
  const rolNombre = ROL_NOMBRES[rolBase] ?? 'Miembro del equipo'

  /* Steps:
     0: fade in fondo + logo creciendo
     1: "Hola, [nombre]"
     2: "Tu rol es: [Rol]" con ícono grande
     3: módulos del rol revelándose
     4: promesa + botón Empezar */
  useEffect(() => {
    const timings = [600, 1200, 1700, 2200, 1800]  /* ms en cada step */
    if (step >= timings.length - 1) return
    const t = setTimeout(() => setStep((s) => s + 1), timings[step])
    return () => clearTimeout(t)
  }, [step])

  function close() {
    if (closing) return
    setClosing(true)
    /* Esperar a que termine la animación de salida (400ms) */
    setTimeout(() => {
      /* Limpiar el ?welcome=1 sin recargar */
      router.replace('/inicio')
    }, 450)
  }

  /* ESC para skipear */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing])

  /* Bloquear scroll del body mientras está abierto */
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <>
      <style>{`
        @keyframes mk-welcome-fadein {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes mk-welcome-fadeout {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes mk-welcome-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mk-welcome-scale-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes mk-welcome-letter {
          from { opacity: 0; transform: translateY(14px) rotateX(-40deg); }
          to { opacity: 1; transform: translateY(0) rotateX(0); }
        }
        @keyframes mk-welcome-bg-pulse {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes mk-welcome-orbit {
          from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
        }
        @keyframes mk-welcome-glow {
          0%, 100% { box-shadow: 0 0 60px var(--mk-acento-30, rgba(186, 65, 247, 0.3)), 0 0 120px var(--mk-acento-15, rgba(186, 65, 247, 0.15)); }
          50% { box-shadow: 0 0 100px var(--mk-acento-40, rgba(186, 65, 247, 0.4)), 0 0 180px var(--mk-acento-20, rgba(186, 65, 247, 0.2)); }
        }
        @keyframes mk-welcome-line-grow {
          from { width: 0; opacity: 0; }
          to { width: 60px; opacity: 1; }
        }
        @keyframes mk-welcome-dot-float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.8; }
        }
        .mk-welcome-fade-in {
          animation: mk-welcome-slide-up 0.7s cubic-bezier(.22,1,.36,1) both;
        }
        .mk-welcome-modulo-card {
          animation: mk-welcome-slide-up 0.55s cubic-bezier(.22,1,.36,1) both;
        }
      `}</style>

      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          background: `
            radial-gradient(circle at 20% 30%, ${acento}1a 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, ${acento}14 0%, transparent 50%),
            linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #fafafa 100%)
          `,
          backgroundSize: '200% 200%',
          animation: closing
            ? 'mk-welcome-fadeout 0.4s ease-out forwards'
            : 'mk-welcome-fadein 0.5s cubic-bezier(.22,1,.36,1), mk-welcome-bg-pulse 12s ease-in-out infinite',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          overflow: 'hidden',
        }}
      >
        {/* Dots flotantes decorativos */}
        {[...Array(6)].map((_, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              position: 'absolute',
              width: 6, height: 6, borderRadius: '50%',
              background: acento,
              opacity: 0.3,
              top: `${15 + i * 13}%`,
              left: `${10 + i * 14}%`,
              animation: `mk-welcome-dot-float ${4 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}

        {/* Skip button */}
        <button
          onClick={close}
          style={{
            position: 'absolute',
            top: 24, right: 28,
            background: 'transparent',
            border: '1px solid #e5e7eb',
            borderRadius: 999,
            padding: '8px 16px',
            fontSize: 12, fontWeight: 600,
            color: '#6b7280',
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.02em',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9fafb'
            e.currentTarget.style.color = '#111827'
            e.currentTarget.style.borderColor = '#d1d5db'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#6b7280'
            e.currentTarget.style.borderColor = '#e5e7eb'
          }}
        >
          Saltar intro · esc
        </button>

        <div style={{ maxWidth: 720, width: '100%', textAlign: 'center', position: 'relative' }}>
          {/* STEP 0: Logo central pulsando */}
          {step === 0 && (
            <div
              className="mk-welcome-fade-in"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
              }}
            >
              <div
                style={{
                  ['--mk-acento-30' as string]: `${acento}4d`,
                  ['--mk-acento-15' as string]: `${acento}26`,
                  ['--mk-acento-40' as string]: `${acento}66`,
                  ['--mk-acento-20' as string]: `${acento}33`,
                  width: 86, height: 86,
                  borderRadius: 22,
                  background: `linear-gradient(135deg, ${acento}, ${acento}cc)`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'mk-welcome-scale-in 0.6s cubic-bezier(.22,1,.36,1), mk-welcome-glow 2.4s ease-in-out infinite',
                } as React.CSSProperties}
              >
                <Sparkles size={42} strokeWidth={2} color="#fff" />
              </div>
              <p style={{
                fontSize: 13, color: '#6b7280', margin: 0,
                letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
              }}>
                Distinto · Agencia
              </p>
            </div>
          )}

          {/* STEP 1: Saludo */}
          {step === 1 && (
            <div className="mk-welcome-fade-in">
              <h1 style={{
                fontSize: 56,
                fontWeight: 600,
                letterSpacing: '-0.03em',
                color: '#111827',
                margin: 0,
                lineHeight: 1.05,
              }}>
                Hola,{' '}
                <span style={{ display: 'inline-flex' }}>
                  {Array.from(nombre).map((ch, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        opacity: 0,
                        color: acento,
                        animation: 'mk-welcome-letter 0.6s cubic-bezier(.22,1,.36,1) forwards',
                        animationDelay: `${200 + i * 60}ms`,
                        transformOrigin: '50% 100%',
                      }}
                    >
                      {ch === ' ' ? ' ' : ch}
                    </span>
                  ))}
                </span>
              </h1>
              <p style={{
                fontSize: 17, color: '#6b7280', margin: '20px 0 0',
                lineHeight: 1.5,
                opacity: 0,
                animation: 'mk-welcome-slide-up 0.6s 0.8s cubic-bezier(.22,1,.36,1) forwards',
              }}>
                Te damos la bienvenida a tu espacio en Distinto.
              </p>
            </div>
          )}

          {/* STEP 2: Tu rol con ícono grande */}
          {step === 2 && (
            <div className="mk-welcome-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
              <span style={{
                fontSize: 12, color: '#9ca3af',
                letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
              }}>
                Tu rol
              </span>
              <RolIconoGrande rolBase={rolBase} color={acento} />
              <h2 style={{
                fontSize: 42, fontWeight: 600,
                letterSpacing: '-0.025em',
                color: '#111827',
                margin: 0, lineHeight: 1.1,
              }}>
                {rolNombre}
              </h2>
              <span aria-hidden style={{
                display: 'block',
                width: 60, height: 2, background: acento,
                animation: 'mk-welcome-line-grow 0.6s 0.4s cubic-bezier(.22,1,.36,1) both',
                borderRadius: 2,
              }} />
            </div>
          )}

          {/* STEP 3: Módulos del rol */}
          {step === 3 && (
            <div className="mk-welcome-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
              <div>
                <span style={{
                  fontSize: 12, color: '#9ca3af',
                  letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
                }}>
                  Tu espacio incluye
                </span>
                <h2 style={{
                  fontSize: 28, fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#111827',
                  margin: '12px 0 0', lineHeight: 1.2,
                }}>
                  {modulos.length} módulos para tu día a día
                </h2>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(modulos.length, 4)}, minmax(0, 1fr))`,
                gap: 14,
                width: '100%',
                maxWidth: 640,
              }}>
                {modulos.map((m, i) => {
                  const Icon = m.Icon
                  return (
                    <div
                      key={i}
                      className="mk-welcome-modulo-card"
                      style={{
                        animationDelay: `${i * 110 + 200}ms`,
                        padding: '20px 14px',
                        background: '#fff',
                        border: '1px solid #f1f1f3',
                        borderRadius: 14,
                        display: 'flex', flexDirection: 'column', gap: 8,
                        alignItems: 'flex-start',
                        boxShadow: '0 4px 14px -8px rgba(16, 24, 40, 0.12)',
                      }}
                    >
                      <span style={{
                        width: 38, height: 38,
                        borderRadius: 10,
                        background: `${m.color}14`,
                        color: m.color,
                        display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={20} strokeWidth={1.8} />
                      </span>
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        color: '#111827', textAlign: 'left',
                      }}>
                        {m.titulo}
                      </span>
                      <span style={{
                        fontSize: 11.5, color: '#6b7280',
                        textAlign: 'left', lineHeight: 1.4,
                      }}>
                        {m.subtitulo}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Promesa + CTA */}
          {step === 4 && (
            <div className="mk-welcome-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
              <span style={{
                fontSize: 64, lineHeight: 1, color: acento, opacity: 0.18,
                fontFamily: 'Georgia, serif',
                marginBottom: -28,
              }}>
                "
              </span>
              <p style={{
                fontSize: 22,
                fontWeight: 500,
                color: '#1f2937',
                lineHeight: 1.45,
                maxWidth: 560,
                margin: 0,
                letterSpacing: '-0.01em',
                fontStyle: 'italic',
              }}>
                {promesa}
              </p>
              <button
                onClick={close}
                style={{
                  marginTop: 16,
                  padding: '14px 28px',
                  background: `linear-gradient(135deg, ${acento}, ${acento}cc)`,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  fontSize: 15, fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  letterSpacing: '0.01em',
                  fontFamily: 'inherit',
                  boxShadow: `0 8px 24px -6px ${acento}66`,
                  transition: 'transform 150ms, box-shadow 150ms',
                  animation: 'mk-welcome-scale-in 0.5s 0.3s cubic-bezier(.22,1,.36,1) both',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = `0 12px 30px -6px ${acento}88`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = `0 8px 24px -6px ${acento}66`
                }}
              >
                Entrar a mi espacio
                <ArrowRight size={18} strokeWidth={2.2} />
              </button>
              <span style={{ fontSize: 11.5, color: '#9ca3af', marginTop: -8 }}>
                Enter o esc para saltar
              </span>
            </div>
          )}

          {/* Progress dots */}
          <div style={{
            position: 'absolute',
            bottom: -120,
            left: 0, right: 0,
            display: 'flex', justifyContent: 'center', gap: 6,
          }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{
                  width: i === step ? 24 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i <= step ? acento : '#e5e7eb',
                  transition: 'width 350ms cubic-bezier(.22,1,.36,1), background 350ms',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* Ícono grande del rol para el step 2 — versión más elaborada del
   IconoDelRol del header con animación entry. */
function RolIconoGrande({ rolBase, color }: { rolBase: string; color: string }) {
  const wrapperStyle: React.CSSProperties = {
    width: 110, height: 110,
    borderRadius: 28,
    background: `linear-gradient(135deg, ${color}1a, ${color}0a)`,
    border: `1px solid ${color}33`,
    display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    animation: 'mk-welcome-scale-in 0.6s cubic-bezier(.22,1,.36,1) both',
  }
  const iconColor = color
  const Icon =
    rolBase === 'disenador' ? Palette :
    rolBase === 'editor' ? Scissors :
    rolBase === 'community_manager' ? MessageCircle :
    rolBase === 'social_media_manager' ? BarChart3 :
    rolBase === 'director' ? Target :
    Sparkles
  return (
    <span style={wrapperStyle}>
      <Icon size={52} strokeWidth={1.6} color={iconColor} />
    </span>
  )
}
