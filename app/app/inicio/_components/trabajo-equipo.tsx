'use client'

/* TrabajoEquipo — "El trabajo de tu equipo" para el inicio del CEO.
   Pedro lo quiere como un CARRUSEL horizontal de cards (una por persona,
   estilo "Tareas en diseño"): cada card = "Trabajo de [Nombre]" y lista
   SUS tareas con nombre + marca + estado + fecha programada.
   Orden: Ailyn 1°, Pieer 2°, Lorena 3°, el resto a la derecha.

   Tickets Pedro b2f993db + e5d97753: chips permanentes de totales del
   equipo (totales / editor / diseño / generales) alimentados por la
   misma agregación que el carrusel — no se desfasán. */

import { Users, Palette, Video, MessageCircle, Calendar, CheckSquare, type LucideIcon } from 'lucide-react'
import type { MiembroTrabajo, TareaMiembro, TotalesEquipo } from '@/lib/inicio/get-trabajo-equipo'

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

const TIPO_DOT: Record<string, string> = {
  diseno: '#ec4899',
  editor: '#8b5cf6',
  general: '#7170ff',
  comentario: '#22c55e',
}

function primerNombre(nombre: string): string {
  return nombre.split(/\s+/)[0] ?? nombre
}

export function TrabajoEquipo({
  miembros,
  totales,
}: {
  miembros: MiembroTrabajo[]
  /** Totales unificados del equipo (misma query que el carrusel). */
  totales?: TotalesEquipo | null
}) {
  const totalPend = totales?.totales ?? miembros.reduce((s, m) => s + m.pendientes, 0)
  const chips: { key: string; label: string; value: number; color: string }[] = totales
    ? [
        { key: 'totales', label: 'Tareas totales', value: totales.totales, color: '#7170ff' },
        { key: 'editor', label: 'Editor', value: totales.editor, color: '#8b5cf6' },
        { key: 'diseno', label: 'Diseño', value: totales.diseno, color: '#ec4899' },
        { key: 'generales', label: 'Generales', value: totales.generales, color: '#0ea5e9' },
      ]
    : []

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

      {/* Chips: totales / editor / diseño / generales — siempre alineados
          con el carrusel (misma agregación server-side). */}
      {chips.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 8,
          marginBottom: 14,
        }}>
          {chips.map((c) => (
            <div
              key={c.key}
              style={{
                background: '#fff',
                border: '1px solid #f1f1f3',
                borderRadius: 12,
                padding: '10px 12px',
                minWidth: 0,
              }}
            >
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
                textTransform: 'uppercase', color: c.color, marginBottom: 4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {c.label}
              </div>
              <div style={{
                fontSize: 22, fontWeight: 800, color: '#111827',
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>
      )}

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
  const c = miembro.conteos ?? { editor: 0, diseno: 0, generales: 0, comentario: 0 }

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

      {/* Mini breakdown por tipo (editor / diseño / generales) */}
      {(c.editor + c.diseno + c.generales) > 0 && (
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap',
          padding: '8px 14px', borderBottom: '1px solid #f6f6f7',
          background: 'rgba(0,0,0,0.015)',
        }}>
          {c.editor > 0 && <MiniChip color="#8b5cf6" label={`${c.editor} edit.`} />}
          {c.diseno > 0 && <MiniChip color="#ec4899" label={`${c.diseno} diseño`} />}
          {c.generales > 0 && <MiniChip color="#0ea5e9" label={`${c.generales} gen.`} />}
        </div>
      )}

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
          miembro.tareas.map((t) => <TareaRow key={`${t.tipo}-${t.id}`} tarea={t} />)
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

function MiniChip({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      background: `${color}14`, padding: '2px 7px', borderRadius: 999,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {label}
    </span>
  )
}

function TareaRow({ tarea }: { tarea: TareaMiembro }) {
  const tipColor = TIPO_DOT[tarea.tipo] ?? '#94a3b8'
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
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {tarea.tipo === 'general' ? (
          <CheckSquare size={12} strokeWidth={2} color={tipColor} style={{ flexShrink: 0 }} />
        ) : (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: tipColor, flexShrink: 0 }} />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tarea.titulo}</span>
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
