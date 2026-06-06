'use client'

/**
 * FingerprintAnimated — huella SVG matemática para la pantalla de login.
 *
 * Filosofía: NO una huella fotográfica. Una huella ABSTRAÍDA a su esencia
 * geométrica — whorls concéntricos con asimetría sutil. Mismo lenguaje
 * visual que el hero de agenciadistinto.com — anchor mental del brand.
 *
 * Composición:
 *   - 10 paths SVG generados matemáticamente con r(θ) = r0 + noise
 *   - Asimetría vertical (×1.18) → forma de huella, no círculo
 *   - drop-shadow púrpura → glow brand
 *
 * Animación loop continuo (~10s):
 *   - Phase 1 (0-30%): paths se DIBUJAN con stagger 80ms (pathLength 0→1)
 *   - Phase 2 (30-75%): hold visible
 *   - Phase 3 (75-100%): paths se BORRAN en reverso
 *   - repeatDelay 1.5s entre loops para respirar
 *
 * Interactividad: mouse parallax sutil ±10px con spring physics.
 * El usuario siente que la huella "responde" a su cursor sin ser invasivo.
 */

import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'

type Props = {
  className?: string
  stroke?: string
  strokeWidth?: number
  loopDuration?: number
  paths?: number
}

export function FingerprintAnimated({
  className,
  stroke = '#BA41F7',
  strokeWidth = 1.1,
  loopDuration = 10,
  paths = 10,
}: Props) {
  /* viewBox 300×380 para aspect huella natural (~0.79:1) */
  const W = 300
  const H = 380
  const cx = W / 2
  const cy = H / 2

  const whorlPaths = useMemo(() => {
    const out: string[] = []
    for (let i = 0; i < paths; i++) {
      /* Cada whorl 13px más afuera. angleRange varía por índice (asimetría). */
      const r0 = 14 + i * 13
      const angleRange = Math.PI * (1.55 + (i % 4) * 0.18)
      const startAngle = Math.PI * (1.1 + i * 0.13)
      const steps = 90
      const seg: string[] = []
      for (let j = 0; j <= steps; j++) {
        const t = j / steps
        const angle = startAngle + t * angleRange
        const noise = Math.sin(angle * 2.3 + i * 0.6) * (1.4 + i * 0.08)
        const r = r0 + noise
        const x = cx + r * Math.cos(angle)
        /* 1.18 estira vertical → forma huella, no círculo */
        const y = cy + r * Math.sin(angle) * 1.18
        seg.push(j === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : `L${x.toFixed(1)} ${y.toFixed(1)}`)
      }
      out.push(seg.join(' '))
    }
    return out
  }, [paths])

  /* Mouse parallax con spring physics — no jitter en microsacudidas */
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseXRaw = useMotionValue(0)
  const mouseYRaw = useMotionValue(0)
  const mouseX = useSpring(mouseXRaw, { stiffness: 60, damping: 18, mass: 0.6 })
  const mouseY = useSpring(mouseYRaw, { stiffness: 60, damping: 18, mass: 0.6 })
  const tx = useTransform(mouseX, [-1, 1], [-10, 10])
  const ty = useTransform(mouseY, [-1, 1], [-6, 6])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx2 = rect.left + rect.width / 2
      const cy2 = rect.top + rect.height / 2
      const dx = (e.clientX - cx2) / (window.innerWidth / 2)
      const dy = (e.clientY - cy2) / (window.innerHeight / 2)
      mouseXRaw.set(Math.max(-1, Math.min(1, dx)))
      mouseYRaw.set(Math.max(-1, Math.min(1, dy)))
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [mouseXRaw, mouseYRaw])

  const stagger = 0.08

  return (
    <motion.div
      ref={containerRef}
      className={className}
      style={{ x: tx, y: ty }}
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 14px ${stroke}33)` }}
      >
        {whorlPaths.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 1, 0],
              opacity: [0, 0.85, 0.85, 0],
            }}
            transition={{
              duration: loopDuration,
              times: [0, 0.3, 0.75, 1],
              delay: i * stagger,
              repeat: Infinity,
              repeatDelay: 1.5,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ))}
      </svg>
    </motion.div>
  )
}
