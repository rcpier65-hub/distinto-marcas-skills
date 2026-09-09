'use client'

// Shell that mounts the fechas importantes calendar above Ailyn's Diseño
// board without editing the large DisenoView (Pedro 132c5a66).
// Overrides the inner .mk-workview 100vh so the kanban still fills the rest.
// Also links to shared Stories planner (ticket e7e50df4-92ac-4855-8fc5-23171a14ed5f).

import Link from 'next/link'
import { FechasCalendarioTablero, type FechaTablero } from '@/components/fechas/fechas-calendario-tablero'

export type { FechaTablero }

export function DisenoFechasShell({
  fechas,
  marcaFilterSlug = 'todas',
  children,
}: {
  fechas: FechaTablero[]
  marcaFilterSlug?: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--mk-bg-base)',
      }}
    >
      <style>{`
        .diseno-fechas-shell-body .mk-workview {
          height: 100% !important;
        }
      `}</style>
      <FechasCalendarioTablero
        fechas={fechas}
        marcaFilterSlug={marcaFilterSlug}
        verTodoHref="/fechas-importantes"
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 16px 8px' }}>
        <Link
          href="/historias"
          style={{
            display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 10px',
            borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 700,
            color: '#ec4899', border: '1px solid rgba(236,72,153,0.35)', background: 'rgba(236,72,153,0.08)',
          }}
        >
          ◐ Planificador de historias
        </Link>
      </div>
      <div className="diseno-fechas-shell-body" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}
