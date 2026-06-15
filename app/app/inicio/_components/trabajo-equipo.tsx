'use client'

/* TrabajoEquipo — "El trabajo de tu equipo" para el inicio del CEO.
   Pedro lo quiere como un CARRUSEL horizontal de cards (una por persona,
   estilo "Tareas en diseño"): cada card = "Trabajo de [Nombre]" y lista
   SUS tareas con nombre + marca + estado + fecha programada.
   Orden: Ailyn 1°, Pieer 2°, Lorena 3°, el resto a la derecha. */

import { Users, Palette, Video, MessageCircle, Calendar, type LucideIcon } from 'lucide-react'
import type { MiembroTrabajo, TareaMiembro } from '@/lib/inicio/get-trabajo-equipo'

const ROL_ICON: Record<string, LucideIcon> = {
  disenador: Palette,
  editor: Video,
  community_manager: MessageCircle,
  social_media_manager: MessageCircle,
}

const ROL_ACTION: Record<string, string> = {
  disenador: 'Ver diseño',
  editor: 'Ver editor',
  community_manager: 'Ver comentarios',
  social_media_manager: 'Ver comentarios',
}

function primerNombre(nombre: string): string {
  return nombre.split(/\s+/)[0] ?? nombre
}

export function TrabajoEquipo({ miembros }: { miembros: MiembroTrabajo[] }) {
  const totalPend = miembros.reduce((s, m) => s + m.pendientes, 0)

  return (
    <section style={{ minWidth: 0 }}>
      {/* Header de la sección */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'rgba(113,112,255,0.12)', color: '#7170ff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users className="w-4 h-4" strokeWidth={2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.3 }}>
            El trabajo de tu equipo
          </h3>
          <p style={{ fontSize: 11.5, color: '#6b7280', margin: '2px 0 0' }}>
            {miembros.length} {miembros.length === 1 ? 'persona' : 'personas'} · {totalPend} pendiente{totalPend === 1 ? '' : 's'} en total
          </p>
        </div>
      </div>

      {miembros.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #f1f1f3', borderRadius: 16,
          padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 12.5,
        }}>
          Aún no hay miembros en el equipo.
        </div>
      ) : (
        /* Carrusel horizontal con scroll-snap. Cada card es un trabajador. */
        <div
          style={{
            display: 'flex', gap: 14,
            overflowX: 'auto', paddingBottom: 8,
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
          }}
        >
          {miembros.map((m) => <PersonaCard key={m.id} miembro={m} />)}
        </div>
      )}
    </section>
  )
}

function PersonaCard({ miembro }: { miembro: MiembroTrabajo }) {
  const Icon = ROL_ICON[miembro.rolBase] ?? Users
  const color = miembro.color
  const accion = ROL_ACTION[miembro.rolBase] ?? 'Ver más'

  return (
    <section style={{
      flexShrink: 0, width: 300,
      scrollSnapAlign: 'start',
      background: 'var(--mk-bg-elevated, #fff)',
      border: '1px solid var(--mk-border-subtle, #f1f1f3)',
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header: "Trabajo de [Nombre]" + conteo */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex', alignItems: 'center', gap: 10,
        background: `linear-gradient(180deg, ${color}10, transparent)`,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: `${color}1a`, color,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} strokeWidth={1.9} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{
            margin: 0, fontSize: 13.5, fontWeight: 600, color: '#111827',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            Trabajo de {primerNombre(miembro.nombre)}
          </h4>
          <span style={{
            fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
            color,
          }}>
            {miembro.rolLabel}
          </span>
        </div>
        <span style={{
          fontSize: 11.5, fontWeight: 700,
          color: miembro.pendientes > 0 ? color : '#9ca3af',
          fontVariantNumeric: 'tabular-nums',
          background: miembro.pendientes > 0 ? `${color}1a` : '#f3f4f6',
          padding: '2px 8px', borderRadius: 999, flexShrink: 0,
        }}>
          {miembro.pendientes}
        </span>
      </div>

      {/* Tareas */}
      <div style={{ flex: 1, maxHeight: 264, overflowY: 'auto' }}>
        {miembro.tareas.length === 0 ? (
          <div style={{
            padding: '28px 16px', textAlign: 'center',
            color: '#9ca3af', fontSize: 12.5,
          }}>
            Sin pendientes 🎉
          </div>
        ) : (
          miembro.tareas.map((t) => <TareaRow key={t.id} tarea={t} />)
        )}
      </div>

      {/* Footer link al módulo de la persona */}
      <a
        href={miembro.moduloHref}
        style={{
          padding: '8px 14px',
          borderTop: '1px solid #f3f4f6',
          fontSize: 11.5, fontWeight: 500,
          color, textDecoration: 'none',
          background: 'rgba(0,0,0,0.015)',
          textAlign: 'center',
        }}
      >
        {accion} →
      </a>
    </section>
  )
}

function TareaRow({ tarea }: { tarea: TareaMiembro }) {
  return (
    <a
      href={tarea.href}
      style={{
        display: 'block',
        padding: '10px 14px',
        borderBottom: '1px solid #f6f6f7',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        color: '#111827', fontWeight: 500, fontSize: 12.5,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        marginBottom: 3,
      }}>
        {tarea.titulo}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9ca3af', flexWrap: 'wrap' }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: tarea.marcaColor, flexShrink: 0 }} />
        <span style={{ color: '#6b7280' }}>{tarea.marcaNombre}</span>
        <span>·</span>
        <span>{tarea.estadoLabel}</span>
        {tarea.fechaLabel && (
          <>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#6b7280' }}>
              <Calendar size={10} strokeWidth={2} /> {tarea.fechaLabel}
            </span>
          </>
        )}
      </div>
    </a>
  )
}
