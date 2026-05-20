// app/components/plantillas-grilla/grilla-generica.tsx
// Plantilla fallback que se adapta a cualquier marca usando su color + emoji.
// Para marcas que aún no tienen plantilla específica codificada.
'use client'

import type { GrillaPublicacionLite } from './types'

const DIAS_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_UP = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const MESES_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

type Props = {
  marcaNombre: string
  marcaEmoji: string
  marcaColor: string
  semanaInicio: string
  semanaFin: string
  publicaciones: GrillaPublicacionLite[]
}

export function GrillaGenerica({
  marcaNombre, marcaEmoji, marcaColor, semanaInicio, semanaFin, publicaciones,
}: Props) {
  const d1 = new Date(semanaInicio + 'T12:00:00Z')
  const d2 = new Date(semanaFin + 'T12:00:00Z')
  const numDias = Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000)) + 1

  const pubsByFecha = new Map<string, GrillaPublicacionLite[]>()
  for (const p of publicaciones) {
    const arr = pubsByFecha.get(p.fecha) ?? []
    arr.push(p)
    pubsByFecha.set(p.fecha, arr)
  }

  const datePill = `${d1.getUTCDate()} — ${d2.getUTCDate()} ${MESES_UP[d1.getUTCMonth()]} · ${d1.getUTCFullYear()}`
  const mesName = MESES_LONG[d1.getUTCMonth()]
  const subHeader = `${mesName.charAt(0).toUpperCase() + mesName.slice(1)} ${d1.getUTCFullYear()}`

  const cards: Array<{ dia: number; diaShort: string; pubs: GrillaPublicacionLite[] }> = []
  for (let i = 0; i < numDias; i++) {
    const d = new Date(d1)
    d.setUTCDate(d1.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    cards.push({
      dia: d.getUTCDate(),
      diaShort: DIAS_SHORT_ES[d.getUTCDay()],
      pubs: pubsByFecha.get(iso) ?? [],
    })
  }

  return (
    <div
      style={{
        width: 1080,
        height: 1620,
        background: marcaColor,
        padding: '80px 70px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Poppins, system-ui, sans-serif',
        color: 'white',
        boxSizing: 'border-box',
      }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800;900&display=swap" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.18)',
          borderRadius: 999,
          padding: '20px 36px',
          border: '2px solid rgba(255,255,255,0.3)',
        }}>
          <span style={{ fontSize: 56, marginRight: 16 }}>{marcaEmoji}</span>
          <span style={{ fontSize: 36, fontWeight: 700 }}>{marcaNombre}</span>
        </div>
        <div style={{
          display: 'flex',
          fontSize: 26,
          fontWeight: 600,
          padding: '14px 24px',
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 16,
        }}>
          {datePill}
        </div>
      </div>

      {/* Hero */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 170, fontWeight: 900, fontStyle: 'italic', lineHeight: 1, letterSpacing: -3 }}>
          ¿Qué se
        </div>
        <div style={{ fontSize: 170, fontWeight: 900, fontStyle: 'italic', lineHeight: 1, letterSpacing: -3, marginTop: 6 }}>
          viene?
        </div>
        <div style={{ fontSize: 32, fontWeight: 500, marginTop: 50, opacity: 0.92 }}>
          {subHeader} · {publicaciones.length} {publicaciones.length === 1 ? 'publicación' : 'publicaciones'}
        </div>
      </div>

      {/* Cards (grid si son pocas, columna si son muchas) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 30 }}>
        {cards.filter((c) => c.pubs.length > 0).slice(0, 7).map((c, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 18,
              padding: '20px 24px',
              border: '2px solid rgba(255,255,255,0.25)',
            }}
          >
            <div style={{ minWidth: 90 }}>
              <div style={{ fontSize: 22, opacity: 0.85, fontWeight: 600 }}>{c.diaShort}</div>
              <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1 }}>{c.dia}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>
                {c.pubs[0].titulo}
              </div>
              <div style={{ fontSize: 16, opacity: 0.85, marginTop: 6 }}>
                {c.pubs[0].plataformas.join(' · ')} · {c.pubs[0].tipo_contenido.join(' · ')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 22,
        opacity: 0.75,
        paddingTop: 24,
        borderTop: '1px solid rgba(255,255,255,0.3)',
      }}>
        <div>Distinto Agencia · Grilla semanal</div>
        <div>distinto-app.vercel.app</div>
      </div>
    </div>
  )
}
