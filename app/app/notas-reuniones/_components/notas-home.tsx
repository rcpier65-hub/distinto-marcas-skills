'use client'

/* Home de Notas y reuniones, estilo Granola — Pedro 24-sep-2026.
   - Próximas: reuniones del calendario; "Tomar notas" abre (o crea) la nota
     ligada a esa reunión.
   - Historial: todas las reuniones, filtrable por marca, con resumen y tareas.
   - "Pregunta a tus reuniones": preguntas sobre TODAS (o las de una marca). */

import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, FileText, Plus, Pin, Sparkles, ListChecks, Loader2, X, NotebookPen } from 'lucide-react'
import type { NotaReunion, ProximaItem } from '@/lib/notas-reuniones/types'
import { crearNotaYRedirigir } from '../_actions'
import { abrirNotaDeReunion, preguntarAReuniones } from '../_granola-actions'

type Props = {
  proximas: ProximaItem[]
  notas: NotaReunion[]
  meNombre: string
  marcas: { id: string; nombre: string; emoji: string | null }[]
}

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
/* Primera línea útil del resumen (sin títulos de sección). */
function extracto(md: string | null): string {
  if (!md) return ''
  const l = md.split('\n').map((x) => x.trim()).find((x) => x && !x.startsWith('#'))
  return (l ?? '').replace(/^[-*•]\s+/, '').slice(0, 140)
}

export function NotasHome({ proximas, notas, meNombre, marcas }: Props) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [abriendo, setAbriendo] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [marcaFiltro, setMarcaFiltro] = useState('')
  const [pregunta, setPregunta] = useState('')
  const [preguntando, setPreguntando] = useState(false)
  const [respuesta, setRespuesta] = useState<{ texto: string; fuentes: { id: string; titulo: string }[] } | null>(null)

  const marcaPorId = useMemo(() => new Map(marcas.map((m) => [m.id, m])), [marcas])
  const hoy = useMemo(() => limaParts(new Date().toISOString()).ymd, [])
  const ayer = useMemo(() => addDaysYmd(hoy, -1), [hoy])
  const proximasFiltradas = useMemo(() => {
    if (weekOffset === 0) return proximas
    const base = addDaysYmd(hoy, weekOffset * 7)
    const end = addDaysYmd(base, 7)
    return proximas.filter((p) => { const y = limaParts(p.startsAt).ymd; return y >= base && y < end })
  }, [proximas, weekOffset, hoy])

  const notasFiltradas = useMemo(() => (marcaFiltro ? notas.filter((n) => n.marcaId === marcaFiltro) : notas), [notas, marcaFiltro])
  const grouped = useMemo(() => {
    const map = new Map<string, NotaReunion[]>()
    for (const n of notasFiltradas) {
      const base = n.reunionInicio || n.updatedAt || n.createdAt
      const ymd = limaParts(base).ymd
      const label = ymd === hoy ? 'Hoy' : ymd === ayer ? 'Ayer' : new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: 'numeric', month: 'long' }).format(new Date(base))
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(n)
    }
    return [...map.entries()]
  }, [notasFiltradas, hoy, ayer])

  async function onNueva() {
    setCreating(true)
    try { await crearNotaYRedirigir() } catch (e) { console.error(e); setCreating(false) }
  }

  async function tomarNotas(p: ProximaItem) {
    if (p.fuente === 'nota') { router.push(`/notas-reuniones/${p.id}`); return }
    setAbriendo(`${p.fuente}-${p.id}`)
    const r = await abrirNotaDeReunion({
      titulo: p.titulo,
      marcaReunionId: p.fuente === 'marca_reuniones' ? p.id : null,
      googleEventId: p.fuente === 'google_calendar' ? p.id : null,
      inicio: p.startsAt,
      meetLink: p.meetLink ?? null,
    })
    if (!r.ok) { setAbriendo(null); toast.error(r.error); return }
    router.push(`/notas-reuniones/${r.id}`)
  }

  async function onPreguntar(e?: FormEvent) {
    e?.preventDefault()
    const q = pregunta.trim()
    if (!q || preguntando) return
    setPreguntando(true)
    try {
      const r = await preguntarAReuniones(q, marcaFiltro || null)
      if (!r.ok) { toast.error(r.error); return }
      setRespuesta({ texto: r.respuesta, fuentes: r.fuentes })
    } finally { setPreguntando(false) }
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 24px 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--mk-text-primary)' }}>Notas y reuniones</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--mk-text-tertiary)', fontSize: 13 }}>Transcribe en persona o en Meet, ordena las notas con IA y reparte las tareas · {meNombre}</p>
        </div>
        <button type="button" onClick={onNueva} disabled={creating} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 999, border: '1px solid var(--mk-border-default)', background: 'var(--mk-bg-elevated)', color: 'var(--mk-text-primary)', fontSize: 13, fontWeight: 560, cursor: creating ? 'wait' : 'pointer' }}>
          <Plus size={15} strokeWidth={2.25} />{creating ? 'Creando…' : 'Nueva nota'}
        </button>
      </div>

      {/* Próximas reuniones */}
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
              const k = `${p.fuente}-${p.id}`
              return (
                <li key={k} style={{ display: 'grid', gridTemplateColumns: '72px 1px 1fr auto', gap: 14, alignItems: 'center', padding: '12px 4px', borderTop: '1px solid var(--mk-border-subtle)' }}>
                  <div><div style={{ fontSize: 22, fontWeight: 650, color: 'var(--mk-text-primary)' }}>{parts.day}</div><div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', textTransform: 'capitalize' }}>{parts.month} {parts.weekday}</div></div>
                  <div style={{ background: 'var(--mk-border-subtle)', alignSelf: 'stretch' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Pin size={13} style={{ color: 'var(--mk-text-quaternary)', flexShrink: 0 }} /><span style={{ fontSize: 14, fontWeight: 560, color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--mk-text-tertiary)', marginTop: 4, paddingLeft: 21 }}>{parts.time}{end ? ` – ${end}` : ''} · {p.fuente === 'marca_reuniones' ? 'Reunión' : p.fuente === 'google_calendar' ? 'Calendar' : 'Nota'}{p.meetLink ? ' · Meet' : ''}</div>
                  </div>
                  <button type="button" onClick={() => void tomarNotas(p)} disabled={abriendo === k}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 10, border: '1px solid var(--mk-border-default)', background: 'var(--mk-bg-base, #fff)', color: 'var(--mk-text-primary)', fontSize: 12.5, fontWeight: 560, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {abriendo === k ? <Loader2 size={13} className="animate-spin" /> : <NotebookPen size={13} />} Tomar notas
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Historial */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--mk-text-primary)' }}>Historial de reuniones</h2>
        <select value={marcaFiltro} onChange={(e) => setMarcaFiltro(e.target.value)}
          style={{ height: 32, borderRadius: 10, border: '1px solid var(--mk-border-default)', background: 'var(--mk-bg-elevated)', padding: '0 10px', fontSize: 12.5, color: 'var(--mk-text-secondary)' }}>
          <option value="">Todas las marcas</option>
          {marcas.map((m) => <option key={m.id} value={m.id}>{m.emoji ? `${m.emoji} ` : ''}{m.nombre}</option>)}
        </select>
      </div>
      <section>
        {grouped.length === 0 ? (
          <div style={{ border: '1px dashed var(--mk-border-default)', borderRadius: 16, padding: 32, textAlign: 'center', color: 'var(--mk-text-tertiary)', fontSize: 13 }}>
            {marcaFiltro ? 'No hay reuniones de esta marca todavía.' : 'Aún no hay notas. Toca «Tomar notas» en una reunión o crea una con «+ Nueva nota».'}
          </div>
        ) : grouped.map(([label, rows]) => (
          <div key={label} style={{ marginBottom: 22 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mk-text-quaternary)' }}>{label}</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rows.map((n) => {
                const marca = n.marcaId ? marcaPorId.get(n.marcaId) : null
                const nTareas = n.acciones.filter((a) => a.tareaId).length
                const resumen = extracto(n.resumen)
                return (
                  <li key={n.id}>
                    <Link href={`/notas-reuniones/${n.id}`} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 10px', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                      {n.resumen ? <Sparkles size={16} style={{ color: '#7170ff' }} /> : <FileText size={16} style={{ color: 'var(--mk-text-quaternary)' }} />}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titulo || 'Sin título'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--mk-text-tertiary)', marginTop: 2, flexWrap: 'wrap' }}>
                          {marca && <span style={{ padding: '1px 8px', borderRadius: 999, background: 'var(--mk-bg-hover)', color: 'var(--mk-text-secondary)' }}>{marca.emoji ? `${marca.emoji} ` : ''}{marca.nombre}</span>}
                          <span>{n.autorNombre || 'Yo'}{n.estado === 'en_curso' ? ' · En curso' : ''}</span>
                          {nTareas > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ListChecks size={12} /> {nTareas} tarea{nTareas === 1 ? '' : 's'}</span>}
                        </div>
                        {resumen && <div style={{ fontSize: 12.5, color: 'var(--mk-text-tertiary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resumen}</div>}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--mk-text-quaternary)' }}>{limaParts(n.reunionInicio || n.updatedAt || n.createdAt).time}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </section>

      {/* Respuesta de "Pregunta a tus reuniones" */}
      {respuesta && (
        <div style={{ position: 'fixed', left: '50%', bottom: 92, transform: 'translateX(-50%)', width: 'min(620px, calc(100% - 32px))', maxHeight: '55vh', overflowY: 'auto', zIndex: 21, padding: 16, borderRadius: 18, background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-default)', boxShadow: '0 16px 48px rgba(0,0,0,.18)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 650, color: '#7170ff' }}><Sparkles size={13} /> Respuesta</span>
            <button type="button" onClick={() => setRespuesta(null)} aria-label="Cerrar" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--mk-text-quaternary)', lineHeight: 0 }}><X size={16} /></button>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--mk-text-primary)', whiteSpace: 'pre-wrap' }}>{respuesta.texto}</div>
          {respuesta.fuentes.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {respuesta.fuentes.slice(0, 12).map((f, i) => (
                <Link key={f.id} href={`/notas-reuniones/${f.id}`} style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 999, border: '1px solid var(--mk-border-subtle)', color: 'var(--mk-text-secondary)', textDecoration: 'none' }}>
                  [{i + 1}] {f.titulo}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pregunta a todas tus reuniones */}
      <form onSubmit={onPreguntar} style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', width: 'min(620px, calc(100% - 32px))', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 10px 18px', borderRadius: 999, background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-default)', boxShadow: '0 8px 28px rgba(0,0,0,.12)' }}>
          <Sparkles size={15} style={{ color: '#7170ff', flexShrink: 0 }} />
          <input value={pregunta} onChange={(e) => setPregunta(e.target.value)}
            placeholder={marcaFiltro ? `Pregunta sobre las reuniones de ${marcaPorId.get(marcaFiltro)?.nombre ?? 'la marca'}` : 'Pregunta a todas tus reuniones'}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--mk-text-primary)', minWidth: 0 }} />
          <button type="submit" disabled={preguntando || !pregunta.trim()} style={{ border: 'none', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 600, background: 'var(--mk-accent-bg)', color: 'var(--mk-accent)', cursor: preguntando ? 'wait' : 'pointer', opacity: preguntando || !pregunta.trim() ? 0.5 : 1 }}>
            {preguntando ? '…' : 'Preguntar'}
          </button>
        </div>
      </form>
    </div>
  )
}

const btnIcon: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: '1px solid var(--mk-border-subtle)', background: 'transparent', color: 'var(--mk-text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
