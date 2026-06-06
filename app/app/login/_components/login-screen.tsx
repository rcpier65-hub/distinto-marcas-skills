'use client'

/**
 * LoginScreen — pantalla de login estilo "Light Editorial Premium"
 * (Aesop / Linear / Apple). Brand Distinto 2026.
 *
 * Composición (de fondo a frente):
 *   1. BG cream #f7f3ee con grain SVG sutil
 *   2. HUELLA SVG animada lado DERECHO (mismo lugar que hero web)
 *   3. CARD del form lado IZQUIERDO (max-w-md, asymmetric balance)
 *   4. Footer pequeño con links
 *
 * Por qué asimétrico (form izq + huella der):
 *   - Stripe/Linear/Vercel hacen esto: el ojo entra por la izquierda
 *     (form = call to action) y descansa en la huella (brand anchor).
 *   - Es más editorial que centrado — sugiere "esto no es un form
 *     genérico, es una marca con personalidad".
 *
 * Auth: usa el server action `signInWithPassword` ya existente.
 *   - El form usa el patrón nativo de React 19 + Next: <form action={fn}>
 *   - useFormStatus() da el `pending: boolean` para loading state
 *   - Errores vienen vía searchParams (?error=...) desde el redirect
 *     que hace el server action. Los inicializo via initialError prop.
 */

import { motion } from 'motion/react'
import Image from 'next/image'
import { useFormStatus } from 'react-dom'
import { signInWithPassword } from '@/lib/auth/actions'
import { FingerprintAnimated } from './fingerprint-animated'

type Props = {
  initialError?: string
  initialMessage?: string
}

const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const

export function LoginScreen({ initialError, initialMessage }: Props) {
  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        /* Cream brand — NO blanco frío. El cream da calidez editorial. */
        background: '#f7f3ee',
        /* Tipografía body: usa Montserrat si está, sino el inherit del proyecto */
        fontFamily: 'var(--font-sans, "Montserrat", ui-sans-serif, system-ui)',
        color: '#0a0a0a',
      }}
    >
      {/* Grain texture sutil — SVG noise inline para no cargar imagen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        }}
      />

      {/* HUELLA — lado derecho. En mobile se oculta (hidden md:block).
          top:50vh + -translate-y-1/2 → centrada vertical exacta.
          width responsivo: min(360px, 30vw) — nunca más grande de
          360px en pantallas anchas, ni más de 30% del viewport en
          medianas. */}
      <div
        className="absolute hidden md:block pointer-events-none"
        style={{
          top: '50vh',
          right: '8%',
          width: 'min(360px, 30vw)',
          aspectRatio: '300 / 380',
          transform: 'translateY(-50%)',
        }}
      >
        <FingerprintAnimated
          className="w-full h-full"
          stroke="#BA41F7"
          strokeWidth={1.2}
          loopDuration={10}
          paths={10}
        />
      </div>

      {/* COLUMNA DEL FORM */}
      <div className="relative z-10 min-h-screen flex items-center px-6 md:px-12 lg:px-20">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
        >
          {/* Logo Distinto — full color para fondo cream */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
            className="mb-12"
          >
            <Image
              src="/brand/logo-h-color-tight.png"
              alt="Distinto · Agencia de Marketing"
              width={814}
              height={162}
              priority
              className="h-10 md:h-12 w-auto"
            />
          </motion.div>

          {/* Label editorial monospace en accent púrpura */}
          <p
            className="mb-3 text-[10.5px] uppercase"
            style={{
              color: '#BA41F7',
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              letterSpacing: '0.18em',
              fontWeight: 500,
            }}
          >
            Sistema interno · v1.0
          </p>

          {/* Heading — Geometry Soft Pro fallback bold */}
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
            style={{
              color: '#0a0a0a',
              fontFamily: 'var(--font-display, "Geometry Soft Pro", "Inter", sans-serif)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Hola de nuevo.
          </h1>
          <p
            className="text-sm md:text-base mb-10"
            style={{ color: '#525252', lineHeight: 1.55 }}
          >
            Entrá con tu cuenta de equipo para acceder al panel.
          </p>

          {/* Mensaje de éxito (ej. después de logout o cambio de password) */}
          {initialMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl border px-4 py-3 text-xs"
              style={{
                background: 'rgba(186, 65, 247, 0.06)',
                borderColor: 'rgba(186, 65, 247, 0.18)',
                color: '#0a0a0a',
              }}
            >
              {initialMessage}
            </motion.div>
          )}

          {/* Error inicial del último intento (vía ?error=) */}
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

          {/* FORM — pattern Next 15+ server action en form.action */}
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

          {/* Footer links — discretos, gris muted */}
          <div
            className="mt-8 flex items-center justify-between text-xs"
            style={{ color: '#a3a3a3' }}
          >
            <span aria-disabled className="cursor-not-allowed">
              ¿Olvidaste tu contraseña?
            </span>
            <a
              href="mailto:pedro@agenciadistinto.com"
              className="transition-colors hover:text-[#BA41F7]"
              style={{ textDecoration: 'none' }}
            >
              Soporte
            </a>
          </div>
        </motion.div>
      </div>
    </main>
  )
}

/* ============================================================
   FormField — input con label monospace tracking-widest
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
        className="block mb-2 text-[10.5px] uppercase"
        style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          letterSpacing: '0.18em',
          color: '#a3a3a3',
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
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid #e7e5e0',
          color: '#0a0a0a',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#BA41F7'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(186, 65, 247, 0.18)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#e7e5e0'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

/* ============================================================
   SubmitButton — usa useFormStatus para loading sin client state
   ============================================================ */

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm md:text-base font-medium transition-colors"
      style={{
        background: '#0a0a0a',
        color: '#f7f3ee',
        opacity: pending ? 0.7 : 1,
        cursor: pending ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => {
        if (!pending) e.currentTarget.style.background = '#BA41F7'
      }}
      onMouseLeave={(e) => {
        if (!pending) e.currentTarget.style.background = '#0a0a0a'
      }}
    >
      {pending ? (
        <>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
          />
          Entrando…
        </>
      ) : (
        <>Entrar →</>
      )}
    </button>
  )
}
