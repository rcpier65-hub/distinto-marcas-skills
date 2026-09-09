'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Plus, Pin } from 'lucide-react'
import type { NotaReunion, ProximaItem } from '@/lib/notas-reuniones/types'
import { crearNotaYRedirigir } from '../_actions'

type Props = { proximas: ProximaItem[]; notas: NotaReunion[]; meNombre: string }

function limaParts(iso: string) {
  const d = new Date(iso)
  return {
    day: new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', day: 'numeric' }).format(d),
    month: new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', month: 'long' }).format(d),
    weekday: new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'short' }).format(d),
    time: new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', minute: '2-digit', hour12: true }).format(d),
    ymd: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d),
  }
}
function addDaysYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function NotasHome({ proximas, notas, meNombre }: Props) {
  const [creating, setCreating] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const hoy = useMemo(() => limaParts(new Date().toISOString()).ymd, [])
  const ayer = useMemo(() => addDaysYmd(hoy, -1), [hoy])
  const proximasFiltradas = useMemo(() => {
    if (weekOffset === 0) return proximas
    const base = addDaysYmd(hoy, weekOffset * 7)
    const end = addDaysYmd(base, 7)
    return proximas.filter((p) => { const y = limaParts(p.startsAt).ymd; return y >= base && y < end })
  }, [proximas, weekOffset, hoy])
  const grouped = useMemo(() => {
    const map = new Map<string, NotaReunion[]>()
    for (const n of notas) {
      const ymd = limaParts(n.updatedAt || n.createdAt).ymd
      const label = ymd === hoy ? 'Hoy' : ymd === ayer ? 'Ayer' : new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long' }).format(new Date(n.updatedAt || n.createdAt))
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(n)
    }
    return [...map.entries()]
  }, [notas, hoy, ayer])

  async function onNueva() {
    setCreating(true)
    try { await crearNotaYRedirigir() } catch (e) { console.error(e); setCreating(false) }
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 24px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--mk-text-primary)' }}>Notas y reuniones</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--mk-text-tertiary)', fontSize: 13 }}>Transcribe, anota y pregunta · {meNombre}</p>
        </div>
        <button type="button" onClick={onNueva} disabled={creating} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 999, border: '1px solid var(--mk-border-default)', background: 'var(--mk-bg-elevated)', color: 'var(--mk-text-primary)', fontSize: 13, fontWeight: 560, cursor: creating ? 'wait' : 'pointer' }}>
          <Plus size={15} strokeWidth={2.25} />{creating ? 'Creando…' : 'Nueva nota'}
        </button>
      </div>

      <section style={{ background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-subtle)', borderRadius: 18, padding: '18px 18px 10px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--mk-text-primary)' }}>Próximas</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" aria-label="Anterior" onClick={() => setWeekOffset((w) => w - 1)} style={btnIcon}><ChevronLeft size={16} /></button>
            <button type="button" aria-label="Siguiente" onClick={() => setWeekOffset((w) => w + 1)} style={btnIcon}><ChevronRight size={16} /></button>
          </div>
        </div>
        {proximasFiltradas.length === 0 ? (
          <p style={{ color: 'var(--mk-text-tertiary)', fontSize: 13, padding: '12px 4px 18px' }}>No hay eventos en esta ventana.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {proximasFiltradas.map((p) => {
              const parts = limaParts(p.startsAt)
              const end = p.endsAt ? limaParts(p.endsAt).time : null
              return (
                <li key={`${p.fuente}-${p.id}`} style={{ display: 'grid', gridTemplateColumns: '72px 1px 1fr', gap: 14, padding: '12px 4px', borderTop: '1px solid var(--mk-border-subtle)' }}>
                  <div><div style={{ fontSize: 22, fontWeight: 650, color: 'var(--mk-text-primary)' }}>{parts.day}</div><div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', textTransform: 'capitalize' }}>{parts.month} {parts.weekday}</div></div>
                  <div style={{ background: 'var(--mk-border-subtle)' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Pin size={13} style={{ color: 'var(--mk-text-quaternary)' }} /><span style={{ fontSize: 14, fontWeight: 560, color: 'var(--mk-text-primary)' }}>{p.titulo}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--mk-text-tertiary)', marginTop: 4, paddingLeft: 21 }}>{parts.time}{end ? ` – ${end}` : ''} · {p.fuente === 'marca_reuniones' ? 'Reunión' : p.fuente === 'google_calendar' ? 'Calendar' : 'Nota'}</div>
                  </div>
                </li>
              )
            })}
            <li style={{ padding: '12px 4px 16px', borderTop: '1px solid var(--mk-border-subtle)', color: 'var(--mk-text-quaternary)', fontSize: 13 }}>No hay más eventos en esta ventana</li>
          </ul>
        )}
      </section>

      <section>
        {grouped.length === 0 ? (
          <div style={{ border: '1px dashed var(--mk-border-default)', borderRadius: 16, padding: 32, textAlign: 'center', color: 'var(--mk-text-tertiary)', fontSize: 13 }}>Aún no hay notas. Crea una con «+ Nueva nota».</div>
        ) : grouped.map(([label, rows]) => (
          <div key={label} style={{ marginBottom: 22 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mk-text-quaternary)' }}>{label}</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rows.map((n) => (
                <li key={n.id}>
                  <Link href={`/notas-reuniones/${n.id}`} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 10px', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                    <FileText size={16} style={{ color: 'var(--mk-text-quaternary)' }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titulo || 'Sin título'}</div>
                      <div style={{ fontSize: 12, color: 'var(--mk-text-tertiary)', marginTop: 2 }}>{n.autorNombre || 'Yo'}{n.estado === 'en_curso' ? ' · En curso' : n.estado === 'finalizada' ? ' · Finalizada' : ''}</div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--mk-text-quaternary)' }}>{limaParts(n.updatedAt || n.createdAt).time}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', width: 'min(560px, calc(100% - 48px))', zIndex: 20 }}>
        <Link href={notas[0] ? `/notas-reuniones/${notas[0].id}` : '/notas-reuniones/nueva'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px 12px 18px', borderRadius: 999, background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-default)', boxShadow: '0 8px 28px rgba(0,0,0,.12)', textDecoration: 'none', color: 'var(--mk-text-tertiary)', fontSize: 14 }}>
          <span>Pregunta lo que sea</span>
          <span style={{ padding: '6px 10px', borderRadius: 999, background: 'var(--mk-bg-hover)', color: 'var(--mk-text-secondary)', fontSize: 12, fontWeight: 550 }}>Abrir nota</span>
        </Link>
      </div>
    </div>
  )
}

const btnIcon: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: '1px solid var(--mk-border-subtle)', background: 'transparent', color: 'var(--mk-text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
