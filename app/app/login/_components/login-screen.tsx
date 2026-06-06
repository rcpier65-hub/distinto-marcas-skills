'use client'

/**
 * LoginScreen v2 — card centrada inspirada en NavOS pero con brand Distinto.
 *
 * Composición:
 *   - AnimatedBackground full-screen: gradient morado-amarillo + blobs +
 *     waves SVG flotando (mismas curvas que se ven en la referencia)
 *   - Card centrada con 2 columnas:
 *     · IZQUIERDA: panel morado→amarillo con logo + tagline + decoración
 *     · DERECHA: form de email + password + botón
 *   - Card tiene border-radius grande, backdrop-blur, shadow profunda
 *
 * Pedro pidió:
 *   - "que esté en el centro y sale bonito" → card centrada
 *   - "degradado morado y ese amarillo de mi marca" → gradiente en
 *     panel izquierdo del card + en blobs del fondo
 *   - "logo a la izquierda" → panel left del card
 *   - "usuario y contraseña a la derecha" → panel right
 *   - "animación de fondo" → blobs flotantes + waves SVG
 */

import { motion } from 'motion/react'
import { useFormStatus } from 'react-dom'
import { signInWithPassword } from '@/lib/auth/actions'
import { AnimatedBackground } from './animated-background'

type Props = {
  initialError?: string
  initialMessage?: string
}

const PURPLE = '#BA41F7'
const YELLOW = '#F2CC2C'
const EASE = [0.22, 1, 0.36, 1] as const

export function LoginScreen({ initialError, initialMessage }: Props) {
  return (
    <main
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4 py-8"
      style={{
        background: '#fafafa',
        fontFamily: 'var(--font-sans, "Inter", ui-sans-serif, system-ui)',
        color: '#0a0a0a',
      }}
    >
      {/* Fondo animado full-screen */}
      <AnimatedBackground />

      {/* CARD CENTRADA */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative z-10 w-full max-w-5xl"
        style={{
          /* Sombra profunda + ring sutil — eleva la card sobre el fondo */
          filter: 'drop-shadow(0 24px 48px rgba(186, 65, 247, 0.18)) drop-shadow(0 4px 16px rgba(0, 0, 0, 0.08))',
        }}
      >
        <div
          className="grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            minHeight: 540,
          }}
        >
          {/* ═══════════════════════════════════════════════════════
              IZQUIERDA — Panel brand con degradado morado→amarillo
              ═══════════════════════════════════════════════════════ */}
          <LeftPanel />

          {/* ═══════════════════════════════════════════════════════
              DERECHA — Form de login
              ═══════════════════════════════════════════════════════ */}
          <RightPanel initialError={initialError} initialMessage={initialMessage} />
        </div>
      </motion.div>
    </main>
  )
}

/* ============================================================
   Left Panel — gradient morado→amarillo + logo + tagline
   ============================================================ */

function LeftPanel() {
  return (
    <div
      className="relative p-10 md:p-12 flex flex-col justify-between text-white overflow-hidden"
      style={{
        /* Gradient diagonal: morado predominante, amarillo en esquina */
        background: `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE} 35%, #d966f7 65%, ${YELLOW} 100%)`,
        minHeight: 320,
      }}
    >
      {/* Decoración: anillos concéntricos sutiles en esquina */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20%',
          right: '-15%',
          width: 380,
          height: 380,
          background: `radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 60%)`,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-25%',
          left: '-15%',
          width: 320,
          height: 320,
          background: `radial-gradient(circle, ${YELLOW}33 0%, transparent 60%)`,
        }}
      />

      {/* Grain interno para textura editorial */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        }}
      />

      {/* TOP: Isotipo + wordmark "DISTINTO" — lockup custom inline.
          Antes usaba logo-h-white-tight.png pero Pedro vió un
          rectángulo negro feo (el PNG tenía fondo opaco). Ahora
          renderizo el isotipo SVG con fills WHITE override + texto
          "DISTINTO" en typography fuerte al costado. Sin fondos
          parásitos y escalable infinito. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
        className="relative z-10 flex items-center gap-3 mb-8"
        aria-label="Distinto · Agencia de Marketing"
      >
        {/* Isotipo inline — viewBox del SVG original, fills override a blanco */}
        <svg
          width="44"
          height="44"
          viewBox="280 420 480 240"
          aria-hidden
          style={{ flexShrink: 0 }}
        >
          {/* Forma amarilla (pétalo derecho) → amarillo brand para mantener
              el accent, queda lindo sobre el morado */}
          <path
            fill={YELLOW}
            d="M639.28,439.86c15.32,0,30.24,3.33,43.14,9.62l3,1.45h.06c17.1,8.49,31.61,21.38,42.1,37.44,11.33,17.34,17.31,37.52,17.31,58.35,0,36.23-18.13,69.51-47.97,89.2-24.33-29.33-62.6-47.13-102.67-47.13-17.35,0-34.36,3.43-49.83,9.98-9.11-16.09-13.7-35.42-13.06-55.5.77-23.89,8.86-46.22,22.79-62.86l3.34-4.02v-.18c19.06-22.53,49.94-36.36,81.79-36.36M639.28,425.54c-37,0-74.18,16.76-96.11,45.66v.03c-32.99,39.42-35.14,103.19-4.56,144.92.29.39.74.6,1.19.6.25,0,.5-.06.73-.19,16.72-9.14,35.24-13.43,53.74-13.43,38.38,0,76.58,18.49,98.03,50.51.29.43.76.67,1.25.67.23,0,.46-.05.68-.17,38.64-20.27,65-60.75,65-107.41s-28.88-90.92-70.49-110.12h-.03c-15.44-7.53-32.41-11.08-49.42-11.08h0Z"
          />
          {/* Forma morada (pétalo izquierdo) → BLANCO para que contraste
              sobre el panel morado del fondo. El brand morado del SVG
              original desaparecería sobre morado, por eso lo invierto. */}
          <path
            fill="#ffffff"
            d="M531.55,458.27l-5.58,6.94v.2c-34.99,46.58-35,115.51-.25,162.28,0,.01,0,.03,0,.04-75.63,72.93-205.31,18.66-204.94-87.73.21-110.85,137.16-162.63,210.78-81.73Z"
          />
        </svg>
        {/* Wordmark — typography fuerte tipo "DISTINTO" del logo original.
            tracking apretado, weight 800, ligera condensación visual. */}
        <span
          style={{
            color: '#ffffff',
            fontFamily: 'var(--font-display, "Inter", "Helvetica Neue", sans-serif)',
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}
        >
          DISTINTO
        </span>
      </motion.div>

      {/* MIDDLE: Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
        className="relative z-10 my-auto"
      >
        <p
          className="text-[10.5px] uppercase mb-3"
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            letterSpacing: '0.2em',
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: 500,
          }}
        >
          Sistema interno · v1.0
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold tracking-tight"
          style={{
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            color: '#ffffff',
          }}
        >
          Bienvenido<br />de vuelta.
        </h1>
        <p
          className="mt-4 text-sm md:text-base max-w-xs"
          style={{
            color: 'rgba(255, 255, 255, 0.78)',
            lineHeight: 1.55,
          }}
        >
          Entrá con tu cuenta de equipo para acceder al panel de operaciones de Distinto.
        </p>
      </motion.div>

      {/* BOTTOM: Footer del panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="relative z-10 flex items-center gap-2 text-xs"
        style={{ color: 'rgba(255, 255, 255, 0.6)' }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: YELLOW, boxShadow: `0 0 8px ${YELLOW}` }}
        />
        <span style={{ letterSpacing: '0.05em' }}>agenciadistinto.com</span>
      </motion.div>
    </div>
  )
}

/* ============================================================
   Right Panel — Form de login
   ============================================================ */

function RightPanel({
  initialError, initialMessage,
}: {
  initialError?: string
  initialMessage?: string
}) {
  return (
    <div className="p-10 md:p-12 flex flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
        className="w-full max-w-sm mx-auto"
      >
        {/* Header del form */}
        <div className="mb-8">
          <p
            className="text-[10.5px] uppercase mb-2"
            style={{
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              letterSpacing: '0.2em',
              color: PURPLE,
              fontWeight: 600,
            }}
          >
            Iniciar sesión
          </p>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{
              letterSpacing: '-0.01em',
              color: '#0a0a0a',
            }}
          >
            Tu cuenta de equipo
          </h2>
          <p className="text-sm mt-2" style={{ color: '#737373' }}>
            Solo email + contraseña. Sin Google ni magic link.
          </p>
        </div>

        {/* Mensaje de éxito */}
        {initialMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border px-4 py-3 text-xs"
            style={{
              background: `${PURPLE}0d`,
              borderColor: `${PURPLE}33`,
              color: '#0a0a0a',
            }}
          >
            {initialMessage}
          </motion.div>
        )}

        {/* Error */}
        {initialError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border px-4 py-3 text-xs"
            style={{
              background: 'rgba(239, 68, 68, 0.06)',
              borderColor: 'rgba(239, 68, 68, 0.20)',
              color: '#991b1b',
            }}
          >
            {initialError}
          </motion.div>
        )}

        {/* FORM */}
        <form action={signInWithPassword} className="space-y-4">
          <FormField
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="vos@agenciadistinto.com"
            autoComplete="email"
            required
            autoFocus
          />
          <FormField
            id="password"
            name="password"
            type="password"
            label="Contraseña"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <SubmitButton />
        </form>

        {/* Footer */}
        <div
          className="mt-7 flex items-center justify-between text-xs"
          style={{ color: '#a3a3a3' }}
        >
          <span aria-disabled className="cursor-not-allowed">
            ¿Olvidaste tu contraseña?
          </span>
          <a
            href="mailto:pedro@agenciadistinto.com"
            className="transition-colors hover:underline"
            style={{ color: PURPLE, textDecoration: 'none' }}
          >
            Soporte
          </a>
        </div>
      </motion.div>
    </div>
  )
}

/* ============================================================
   FormField + SubmitButton — primitives
   ============================================================ */

function FormField({
  id, name, type, label, placeholder, autoComplete, required, autoFocus,
}: {
  id: string
  name: string
  type: string
  label: string
  placeholder: string
  autoComplete: string
  required?: boolean
  autoFocus?: boolean
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block mb-1.5 text-[10.5px] uppercase"
        style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          letterSpacing: '0.18em',
          color: '#737373',
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className="w-full rounded-xl px-4 py-3 text-sm transition-all focus:outline-none"
        style={{
          background: '#fafafa',
          border: '1px solid #e7e5e0',
          color: '#0a0a0a',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = PURPLE
          e.currentTarget.style.background = '#ffffff'
          e.currentTarget.style.boxShadow = `0 0 0 3px ${PURPLE}1f`
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#e7e5e0'
          e.currentTarget.style.background = '#fafafa'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm md:text-base font-semibold transition-all"
      style={{
        /* Gradient brand: morado → amarillo (igual que el panel izquierdo) */
        background: `linear-gradient(135deg, ${PURPLE} 0%, #d966f7 70%, ${YELLOW} 130%)`,
        color: '#ffffff',
        opacity: pending ? 0.7 : 1,
        cursor: pending ? 'not-allowed' : 'pointer',
        boxShadow: `0 8px 24px ${PURPLE}40, 0 2px 8px ${PURPLE}30`,
        fontFamily: 'inherit',
        letterSpacing: '0.01em',
      }}
      onMouseEnter={(e) => {
        if (pending) return
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = `0 12px 32px ${PURPLE}50, 0 4px 12px ${PURPLE}40`
      }}
      onMouseLeave={(e) => {
        if (pending) return
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = `0 8px 24px ${PURPLE}40, 0 2px 8px ${PURPLE}30`
      }}
    >
      {pending ? (
        <>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent"
          />
          Entrando…
        </>
      ) : (
        <>Entrar →</>
      )}
    </button>
  )
}
