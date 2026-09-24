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
import { ChevronLeft, ChevronRight, FileText, Plus, Sparkles, ListChecks, Loader2, X, NotebookPen, Mic, Lock } from 'lucide-react'
import type { NotaReunion, ProximaItem } from '@/lib/notas-reuniones/types'
import { crearNotaYRedirigir } from '../_actions'
import { abrirNotaDeReunion, preguntarAReuniones } from '../_granola-actions'

type Props = {
  proximas: ProximaItem[]
  notas: NotaReunion[]
  meNombre: string
  marcas: { id: string; nombre: string; emoji: string | null }[]
  superAdmin: boolean
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

export function NotasHome({ proximas, notas, meNombre, marcas, superAdmin }: Props) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [abriendo, setAbriendo] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [marcaFiltro, setMarcaFiltro] = useState('')
  const [soloPrivadas, setSoloPrivadas] = useState(false)
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

  /* Próximas agrupadas por día; compacto: 3 días salvo "Ver más días". */
  const [verTodasProximas, setVerTodasProximas] = useState(false)
  const [ahoraMs] = useState(() => Date.now())
  const diasProximas = useMemo(() => {
    const map = new Map<string, ProximaItem[]>()
    for (const p of proximasFiltradas) {
      const y = limaParts(p.startsAt).ymd
      if (!map.has(y)) map.set(y, [])
      map.get(y)!.push(p)
    }
    return [...map.entries()]
  }, [proximasFiltradas])
  const porDiaProximas = verTodasProximas ? diasProximas : diasProximas.slice(0, 3)
  const hayMasProximas = diasProximas.length > 3

  const notasFiltradas = useMemo(() => notas
    .filter((n) => !marcaFiltro || n.marcaId === marcaFiltro)
    .filter((n) => !soloPrivadas || n.privada), [notas, marcaFiltro, soloPrivadas])
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Reunión al azar sin calendario: crea la nota y empieza a transcribir. */}
          <button type="button" onClick={() => { setCreating(true); router.push('/notas-reuniones/nueva?transcribir=1') }} disabled={creating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 999, border: 'none', background: 'linear-gradient(135deg, #7170ff, #ba41f7)', color: '#fff', fontSize: 13, fontWeight: 650, cursor: creating ? 'wait' : 'pointer', boxShadow: '0 6px 16px -6px rgba(113,112,255,0.7)' }}>
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />} Transcribir reunión
          </button>
          <button type="button" onClick={onNueva} disabled={creating} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 999, border: '1px solid var(--mk-border-default)', background: 'var(--mk-bg-elevated)', color: 'var(--mk-text-primary)', fontSize: 13, fontWeight: 560, cursor: creating ? 'wait' : 'pointer' }}>
            <Plus size={15} strokeWidth={2.25} /> Nueva nota
          </button>
        </div>
      </div>

      {/* Próximas — compacto, estilo Granola: el día a la izquierda y sus
          reuniones a la derecha; "Ahora" en verde si ya empezó. */}
      <section style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--mk-text-primary)', fontFamily: 'Georgia, "Times New Roman", serif' }}>Próximas</h2>
          <div style={{ display: 'flex', gap: 2 }}>
            <button type="button" aria-label="Anterior" onClick={() => setWeekOffset((w) => w - 1)} style={btnIcon}><ChevronLeft size={16} /></button>
            <button type="button" aria-label="Siguiente" onClick={() => setWeekOffset((w) => w + 1)} style={btnIcon}><ChevronRight size={16} /></button>
          </div>
        </div>
        <div style={{ background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-subtle)', borderRadius: 18, padding: '6px 18px' }}>
          {porDiaProximas.length === 0 ? (
            <p style={{ color: 'var(--mk-text-tertiary)', fontSize: 13, padding: '14px 0', margin: 0 }}>No hay reuniones en estos días.</p>
          ) : porDiaProximas.map(([ymd, items], di) => {
            const p0 = limaParts(items[0].startsAt)
            const esHoy = ymd === hoy
            return (
              <div key={ymd} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, padding: '12px 0', borderTop: di ? '1px solid var(--mk-border-subtle)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingTop: 2 }}>
                  <span style={{ fontSize: 36, lineHeight: 1, fontWeight: 400, color: 'var(--mk-text-primary)', fontFamily: 'Georgia, "Times New Roman", serif' }}>{p0.day}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', paddingTop: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--mk-text-primary)', textTransform: 'capitalize' }}>
                      {p0.month}{esHoy && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />}
                    </span>
                    <span style={{ fontSize: 12.5, color: 'var(--mk-text-tertiary)', textTransform: 'capitalize' }}>{p0.weekday.replace('.', '')}</span>
                  </span>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {items.map((p) => {
                    const k = `${p.fuente}-${p.id}`
                    const ini = new Date(p.startsAt).getTime()
                    const fin = p.endsAt ? new Date(p.endsAt).getTime() : ini + 60 * 60_000
                    const ahora = ahoraMs >= ini && ahoraMs < fin
                    const rango = `${limaParts(p.startsAt).time}${p.endsAt ? ` – ${limaParts(p.endsAt).time}` : ''}`
                    return (
                      <li key={k}>
                        <button type="button" onClick={() => void tomarNotas(p)} disabled={abriendo === k} title="Tomar notas de esta reunión"
                          className="mk-proxima"
                          style={{ width: '100%', display: 'grid', gridTemplateColumns: '3px 1fr auto', gap: 12, alignItems: 'center', padding: '7px 10px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                          <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: ahora ? '#84cc16' : '#7dd3fc' }} />
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 14.5, fontWeight: 520, color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</span>
                            <span style={{ display: 'block', fontSize: 12.5, marginTop: 1, color: ahora ? '#65a30d' : 'var(--mk-text-tertiary)', fontWeight: ahora ? 560 : 400 }}>
                              {ahora ? 'Ahora · ' : ''}{rango}{p.meetLink ? ' · Meet' : ''}
                            </span>
                          </span>
                          <span className="mk-proxima-accion" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--mk-text-tertiary)', whiteSpace: 'nowrap' }}>
                            {abriendo === k ? <Loader2 size={13} className="animate-spin" /> : <NotebookPen size={13} />} Tomar notas
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
          {hayMasProximas && (
            <button type="button" onClick={() => setVerTodasProximas((v) => !v)}
              style={{ width: '100%', padding: '10px 0 12px', border: 'none', borderTop: '1px solid var(--mk-border-subtle)', background: 'transparent', color: 'var(--mk-text-tertiary)', fontSize: 12.5, cursor: 'pointer' }}>
              {verTodasProximas ? 'Ver menos' : 'Ver más días'}
            </button>
          )}
        </div>
        <style>{'.mk-proxima:hover{background:var(--mk-bg-hover)!important}.mk-proxima .mk-proxima-accion{opacity:0;transition:opacity .15s}.mk-proxima:hover .mk-proxima-accion{opacity:1}@media (hover:none){.mk-proxima .mk-proxima-accion{opacity:1}}'}</style>
      </section>

      {/* Historial */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--mk-text-primary)' }}>Historial de reuniones</h2>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {superAdmin && (
          <button type="button" onClick={() => setSoloPrivadas((v) => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 560, cursor: 'pointer',
              border: soloPrivadas ? '1px solid #1f2937' : '1px solid var(--mk-border-default)',
              background: soloPrivadas ? '#1f2937' : 'var(--mk-bg-elevated)', color: soloPrivadas ? '#fff' : 'var(--mk-text-secondary)' }}>
            <Lock size={13} /> Mis privadas
          </button>
        )}
        <select value={marcaFiltro} onChange={(e) => setMarcaFiltro(e.target.value)}
          style={{ height: 32, borderRadius: 10, border: '1px solid var(--mk-border-default)', background: 'var(--mk-bg-elevated)', padding: '0 10px', fontSize: 12.5, color: 'var(--mk-text-secondary)' }}>
          <option value="">Todas las marcas</option>
          {marcas.map((m) => <option key={m.id} value={m.id}>{m.emoji ? `${m.emoji} ` : ''}{m.nombre}</option>)}
        </select>
        </div>
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
                          {n.privada && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--mk-text-secondary)' }}><Lock size={11} /> Privada</span>}
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
