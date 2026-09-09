'use client'

/* Compacto: historias planificadas reflejadas en /publicaciones sin inflar celdas del calendario.
   Ticket e7e50df4-92ac-4855-8fc5-23171a14ed5f — vista corta distinta a pubs feed. */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type HistoriaCalStripItem = {
  id: string
  titulo: string
  fecha: string
  hora: string | null
  plataformas: string[]
  estado: string
  marcaNombre: string
  marcaSlug: string
  color: string
}

export function HistoriasEnPublicaciones({ historias }: { historias: HistoriaCalStripItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const sorted = useMemo(
    () => [...historias].sort((a, b) => (a.fecha + (a.hora ?? '')).localeCompare(b.fecha + (b.hora ?? ''))),
    [historias],
  )
  if (sorted.length === 0) return null

  const byFecha = useMemo(() => {
    const m = new Map<string, HistoriaCalStripItem[]>()
    for (const h of sorted) {
      const a = m.get(h.fecha) ?? []
      a.push(h)
      m.set(h.fecha, a)
    }
    return m
  }, [sorted])

  return (
    <div
      className="mx-6 mb-2 rounded-xl"
      style={{
        border: '1px solid rgba(236,72,153,0.28)',
        background: 'rgba(236,72,153,0.05)',
        padding: '8px 10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: open ? 6 : 0 }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: '#db2777', fontWeight: 800, fontSize: 12, fontFamily: 'inherit',
          }}
        >
          {open ? '▾' : '▸'} ◐ Historias · {sorted.length}
        </button>
        <button
          type="button"
          onClick={() => router.push('/historias')}
          style={{
            marginLeft: 'auto', height: 24, padding: '0 8px', borderRadius: 6,
            border: '1px solid rgba(236,72,153,0.35)', background: 'rgba(236,72,153,0.1)',
            color: '#db2777', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Abrir planificador
        </button>
      </div>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
          {[...byFecha.entries()].slice(0, 14).map(([fecha, items]) => (
            <div key={fecha} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mk-text-tertiary)', width: 72 }}>{fecha.slice(5)}</span>
              {items.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  title={`${h.marcaNombre}: ${h.titulo}`}
                  onClick={() => router.push('/historias')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, height: 18,
                    padding: '0 6px', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: 'rgba(236,72,153,0.14)', color: '#be185d',
                    fontSize: 10, fontWeight: 700, fontFamily: 'inherit', maxWidth: 220,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: h.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.titulo}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
