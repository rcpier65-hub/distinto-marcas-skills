'use client'

// Shell that mounts the fechas importantes calendar above Ailyn's Diseño
// board without editing the large DisenoView (Pedro 132c5a66).
// Overrides the inner .mk-workview 100vh so the kanban still fills the rest.

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
      <div className="diseno-fechas-shell-body" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}
