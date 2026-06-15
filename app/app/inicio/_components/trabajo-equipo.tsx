'use client'

/* TrabajoEquipo — "El trabajo de tu equipo" para el inicio del CEO.
   Lista cada miembro (Ailyn/Pieer/Lorena…) con su rol, conteo de
   pendientes y un par de ejemplos. Estilo card limpia consistente con
   el resto del inicio. */

import { Users } from 'lucide-react'
import type { MiembroTrabajo } from '@/lib/inicio/get-trabajo-equipo'

function iniciales(nombre: string): string {
  return nombre.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '?'
}

export function TrabajoEquipo({ miembros }: { miembros: MiembroTrabajo[] }) {
  const totalPend = miembros.reduce((s, m) => s + m.pendientes, 0)

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #f1f1f3',
        borderRadius: 16,
        boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'rgba(113,112,255,0.12)', color: '#7170ff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users className="w-4 h-4" strokeWidth={2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 13.5, fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.3 }}>
            El trabajo de tu equipo
          </h3>
          <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
            {miembros.length} {miembros.length === 1 ? 'persona' : 'personas'} · {totalPend} pendiente{totalPend === 1 ? '' : 's'} en total
          </p>
        </div>
      </div>

      {/* Lista de miembros */}
      {miembros.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 12.5 }}>
          Aún no hay miembros en el equipo.
        </div>
      ) : (
        <div>
          {miembros.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderBottom: i < miembros.length - 1 ? '1px solid #f6f6f7' : 'none',
              }}
            >
              {/* Avatar inicial tintado por rol */}
              <span style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: `${m.color}1a`, color: m.color,
                fontSize: 13, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${m.color}33`,
              }}>
                {iniciales(m.nombre)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>{m.nombre}</span>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                    color: m.color, background: `${m.color}14`, padding: '1px 6px', borderRadius: 999,
                  }}>
                    {m.rolLabel}
                  </span>
                </div>
                <p style={{
                  fontSize: 11, color: '#9ca3af', margin: '2px 0 0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {m.pendientes > 0
                    ? (m.ejemplos[0] ?? 'Pendientes asignados')
                    : 'Sin pendientes 🎉'}
                </p>
              </div>
              {/* Conteo */}
              <span style={{
                minWidth: 26, height: 26, padding: '0 7px', borderRadius: 999,
                background: m.pendientes > 0 ? `${m.color}18` : '#f3f4f6',
                color: m.pendientes > 0 ? m.color : '#9ca3af',
                fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {m.pendientes}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
