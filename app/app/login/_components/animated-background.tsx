'use client'

/**
 * AnimatedBackground — fondo full-screen con gradient mesh animado
 * morado + amarillo (colores brand Distinto 2026).
 *
 * Composición de capas (de fondo a frente):
 *   1. BASE: gradient diagonal morado→amarillo de baja intensidad
 *   2. BLOBS: 4 SVG blobs con blur fuerte que flotan en loops
 *      (cada uno con su propio path duration + delay → composición
 *      orgánica que nunca se repite igual)
 *   3. WAVES: 2 paths SVG morphing con stroke gradient (similar a
 *      la referencia NavOS) que se desplazan horizontalmente
 *   4. NOISE: textura grain SVG inline para evitar bandeo
 *
 * Performance: todo es GPU-acelerado (transform + opacity).
 * Los SVG son matemáticos (no imágenes), ~3KB total.
 */

import { motion } from 'motion/react'

const PURPLE = '#BA41F7'
const YELLOW = '#F2CC2C'

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* ───── CAPA 1: BASE GRADIENT ───── */}
      {/* Diagonal soft: morado top-left → blanco center → amarillo bottom-right */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg,
              ${PURPLE}1a 0%,
              #ffffff 40%,
              #ffffff 60%,
              ${YELLOW}26 100%)
          `,
        }}
      />

      {/* ───── CAPA 2: BLOBS FLOTANTES ───── */}
      {/* 4 círculos con blur grande, animados con paths Lissajous-like.
          Cada blob tiene parámetros únicos (escala, rotación, duración)
          para que su movimiento sea distinto — composición orgánica. */}
      <Blob
        color={PURPLE}
        size={520}
        startX="-10%"
        startY="-15%"
        duration={28}
        opacity={0.4}
      />
      <Blob
        color={YELLOW}
        size={460}
        startX="85%"
        startY="80%"
        duration={32}
        delay={2}
        opacity={0.35}
      />
      <Blob
        color={PURPLE}
        size={380}
        startX="75%"
        startY="-10%"
        duration={26}
        delay={4}
        opacity={0.30}
      />
      <Blob
        color={YELLOW}
        size={340}
        startX="-5%"
        startY="75%"
        duration={30}
        delay={6}
        opacity={0.28}
      />

      {/* ───── CAPA 3: WAVES SVG ───── */}
      {/* 2 paths con stroke gradient que se desplazan horizontalmente.
          Recrean la "marea" de la referencia NavOS. */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={PURPLE} stopOpacity="0" />
            <stop offset="50%" stopColor={PURPLE} stopOpacity="0.35" />
            <stop offset="100%" stopColor={YELLOW} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={YELLOW} stopOpacity="0" />
            <stop offset="50%" stopColor={YELLOW} stopOpacity="0.40" />
            <stop offset="100%" stopColor={PURPLE} stopOpacity="0" />
          </linearGradient>
        </defs>

        <motion.path
          d="M -200 500 Q 360 380 720 500 T 1640 500"
          stroke="url(#waveGrad1)"
          strokeWidth="1.5"
          fill="none"
          initial={{ x: -100 }}
          animate={{ x: [0, 80, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d="M -200 600 Q 360 720 720 600 T 1640 600"
          stroke="url(#waveGrad2)"
          strokeWidth="1.5"
          fill="none"
          initial={{ x: 0 }}
          animate={{ x: [0, -80, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.path
          d="M -200 420 Q 360 340 720 420 T 1640 420"
          stroke="url(#waveGrad1)"
          strokeWidth="1"
          fill="none"
          opacity={0.6}
          initial={{ x: 0 }}
          animate={{ x: [0, 60, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
      </svg>

      {/* ───── CAPA 4: NOISE GRAIN ───── */}
      {/* Textura fractal sutil para evitar bandeo de gradientes */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        }}
      />
    </div>
  )
}

/* ============================================================
   Blob — círculo blureado que flota en path orgánico
   ============================================================ */

function Blob({
  color, size, startX, startY, duration, delay = 0, opacity,
}: {
  color: string
  size: number
  startX: string
  startY: string
  duration: number
  delay?: number
  opacity: number
}) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: startX,
        top: startY,
        background: `radial-gradient(circle, ${color}${alphaHex(opacity)} 0%, ${color}00 70%)`,
        filter: 'blur(60px)',
      }}
      animate={{
        x: [0, 60, -40, 30, 0],
        y: [0, -50, 30, -20, 0],
        scale: [1, 1.1, 0.95, 1.05, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

/* Helper: float opacity (0-1) → hex 2-digit suffix */
function alphaHex(a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
  return v.toString(16).padStart(2, '0')
}
