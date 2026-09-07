'use client'

import { useMemo, useState } from 'react'
import {
  PLANES,
  REGLAS_COMERCIALES,
  type PlanCategoria,
  type PlanItem,
  planesPorCategoria,
} from '@/lib/planes/catalogo'

const TABS: { id: PlanCategoria | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'social', label: 'Social Media' },
  { id: 'web', label: 'Web' },
  { id: 'adicional', label: 'Adicionales' },
]

function PlanCard({ plan }: { plan: PlanItem }) {
  return (
    <article
      style={{
        border: plan.destacado ? '1.5px solid #111' : '1px solid #e5e5e5',
        borderRadius: 14,
        padding: 18,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: plan.destacado ? '0 8px 24px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 4,
            }}
          >
            {plan.categoria === 'social'
              ? 'Retainer social'
              : plan.categoria === 'web'
                ? 'Proyecto web'
                : 'Adicional'}
          </div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>{plan.nombre}</h3>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{plan.precioLabel}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{plan.periodo}</div>
          {plan.minimo && <div style={{ fontSize: 11, color: '#999' }}>{plan.minimo}</div>}
        </div>
      </div>

      {plan.aplica && (
        <p style={{ margin: 0, fontSize: 13, color: '#444', lineHeight: 1.45 }}>{plan.aplica}</p>
      )}

      {plan.incluye.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Incluye</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#333', lineHeight: 1.45 }}>
            {plan.incluye.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.noIncluye.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#888' }}>No incluye</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#777', lineHeight: 1.45 }}>
            {plan.noIncluye.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.notas && plan.notas.length > 0 && (
        <div
          style={{
            marginTop: 4,
            padding: '8px 10px',
            background: '#f7f7f7',
            borderRadius: 8,
            fontSize: 12,
            color: '#555',
            lineHeight: 1.4,
          }}
        >
          {plan.notas.map((n) => (
            <div key={n}>• {n}</div>
          ))}
        </div>
      )}
    </article>
  )
}

export function PlanesView() {
  const [tab, setTab] = useState<PlanCategoria | 'all'>('all')

  const items = useMemo(() => {
    if (tab === 'all') return PLANES
    return planesPorCategoria(tab)
  }, [tab])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 4px 40px' }}>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Planes Distinto</h1>
        <p style={{ margin: '8px 0 0', color: '#555', fontSize: 14, lineHeight: 1.5, maxWidth: 720 }}>
          Catálogo de cotización interno (fuente Setter / propuestas). Precios en soles sin IGV salvo
          donde se indique. Solo visible para ti.
        </p>
      </header>

      <section
        style={{
          marginBottom: 22,
          padding: 14,
          borderRadius: 12,
          background: '#111',
          color: '#f5f5f5',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Reglas comerciales</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {REGLAS_COMERCIALES.map((r) => (
            <li key={r} style={{ marginBottom: 4 }}>
              {r}
            </li>
          ))}
        </ul>
      </section>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                border: active ? '1.5px solid #111' : '1px solid #ddd',
                background: active ? '#111' : '#fff',
                color: active ? '#fff' : '#333',
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 14,
        }}
      >
        {items.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </div>
    </div>
  )
}
