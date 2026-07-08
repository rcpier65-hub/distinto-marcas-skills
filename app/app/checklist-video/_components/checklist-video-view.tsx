'use client'

// Checklist de video — interfaz propia de Erick. Board (por editar → editado),
// checklist = Guía de Ganchos (7 secciones + los 12 requisitos), y aprobar →
// agenda automática en la grilla de Distinto Agencia.

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Scissors, Check, Circle, CheckCircle2, CalendarCheck, BookOpen, ChevronDown, Trash2, Film, Sparkles, RotateCcw } from 'lucide-react'
import { GUIA, CHECKLIST, CHECKLIST_KEYS, type Bloque } from '@/lib/checklist-video/guia'
import {
  crearVideoErick, marcarVideoEstado, toggleChecklistItem, aprobarVideo, eliminarVideoErick,
} from '../_actions'

const AGENCY = '#7170ff'
const AGENCY2 = '#ba41f7'

export type VideoErick = {
  id: string
  titulo: string
  cuentaSlug: string
  cuentaNombre: string
  estado: 'por_editar' | 'editado' | 'aprobado'
  checklist: Record<string, boolean>
  fechaPublicacion: string | null
  publicacionId: string | null
}

function fechaBonita(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}

export function ChecklistVideoView({ videos: initial, marcas }: { videos: VideoErick[]; marcas: { slug: string; nombre: string }[] }) {
  const router = useRouter()
  const [videos, setVideos] = useState<VideoErick[]>(initial)
  const [, startTransition] = useTransition()
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [cuenta, setCuenta] = useState('distinto-agencia')
  const [guiaOpen, setGuiaOpen] = useState(false)
  const [creando, setCreando] = useState(false)

  const porEditar = videos.filter((v) => v.estado === 'por_editar')
  const editados = videos.filter((v) => v.estado === 'editado')
  const aprobados = videos.filter((v) => v.estado === 'aprobado')

  async function crear() {
    const t = titulo.trim()
    if (!t) return
    setCreando(true)
    const r = await crearVideoErick({ titulo: t, cuentaSlug: cuenta })
    setCreando(false)
    if (!r.ok) { toast.error(r.error); return }
    const nombre = marcas.find((m) => m.slug === cuenta)?.nombre ?? 'Distinto Agencia'
    setVideos((cur) => [{ id: r.data!.id, titulo: t, cuentaSlug: cuenta, cuentaNombre: nombre, estado: 'por_editar', checklist: {}, fechaPublicacion: null, publicacionId: null }, ...cur])
    setTitulo(''); setNuevoOpen(false)
    toast.success('Video agendado para editar ✂️')
  }

  function setEstado(id: string, estado: VideoErick['estado']) {
    setVideos((cur) => cur.map((v) => v.id === id ? { ...v, estado } : v))
    startTransition(async () => {
      const r = await marcarVideoEstado(id, estado as 'por_editar' | 'editado')
      if (!r.ok) { toast.error(r.error); router.refresh() }
    })
  }

  function toggle(id: string, key: string) {
    let nuevoValor = false
    setVideos((cur) => cur.map((v) => {
      if (v.id !== id) return v
      const on = !v.checklist[key]
      nuevoValor = on
      const checklist = { ...v.checklist }
      if (on) checklist[key] = true; else delete checklist[key]
      return { ...v, checklist }
    }))
    startTransition(async () => {
      const r = await toggleChecklistItem(id, key, nuevoValor)
      if (!r.ok) { toast.error(r.error); router.refresh() }
    })
  }

  async function aprobar(id: string) {
    const v = videos.find((x) => x.id === id)
    if (!v) return
    const done = CHECKLIST_KEYS.filter((k) => v.checklist[k]).length
    if (done < 12) { toast.error(`Faltan ${12 - done} requisitos`); return }
    toast.loading('Aprobando y agendando…', { id: `apr-${id}` })
    const r = await aprobarVideo(id)
    if (!r.ok) { toast.error(r.error, { id: `apr-${id}` }); return }
    setVideos((cur) => cur.map((x) => x.id === id ? { ...x, estado: 'aprobado', fechaPublicacion: r.data!.fecha, publicacionId: r.data!.publicacionId } : x))
    toast.success(`✅ Aprobado · se publica el ${fechaBonita(r.data!.fecha)}`, { id: `apr-${id}`, duration: 6000 })
  }

  function eliminar(id: string) {
    if (!confirm('¿Eliminar este video de tu lista?')) return
    setVideos((cur) => cur.filter((v) => v.id !== id))
    startTransition(async () => { await eliminarVideoErick(id) })
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 pb-24">
      {/* HERO */}
      <div className="rounded-2xl p-5 sm:p-6 text-white mb-5" style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY2} 60%, #ec4899)` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Film className="w-6 h-6" /> Checklist de video</h1>
            <p className="text-white/85 text-sm mt-1">Organiza tus videos, verifícalos con la guía y apruébalos para que se agenden solos en la grilla.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          <span className="bg-white/15 rounded-lg px-2.5 py-1.5">✂️ Por editar · {porEditar.length}</span>
          <span className="bg-white/15 rounded-lg px-2.5 py-1.5">🎬 Editados · {editados.length}</span>
          <span className="bg-white/15 rounded-lg px-2.5 py-1.5">✅ Aprobados · {aprobados.length}</span>
        </div>
      </div>

      {/* GUÍA DE EDICIÓN (colapsable) */}
      <div className="rounded-xl border bg-card mb-5 overflow-hidden">
        <button onClick={() => setGuiaOpen((o) => !o)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors">
          <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY2})` }}><BookOpen className="w-5 h-5" /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold">Guía de edición — cómo debe quedar el video</span>
            <span className="block text-xs text-muted-foreground">Las 7 secciones: ganchos, ritmo, efectos, sonido, la receta y el checklist final.</span>
          </span>
          <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${guiaOpen ? 'rotate-180' : ''}`} />
        </button>
        {guiaOpen && (
          <div className="px-4 sm:px-5 pb-5 pt-1 border-t space-y-6">
            {GUIA.map((s) => (
              <section key={s.n}>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: AGENCY2 }}>{s.kicker}</div>
                <h2 className="text-base font-bold mb-1.5">{s.n} · {s.titulo}</h2>
                <div className="space-y-2.5">{s.bloques.map((b, i) => <BloqueView key={i} b={b} />)}</div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* NUEVO VIDEO */}
      {!nuevoOpen ? (
        <button onClick={() => setNuevoOpen(true)} className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-white font-semibold text-sm mb-6" style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY2})` }}>
          <Plus className="w-4 h-4" /> Nuevo video para editar
        </button>
      ) : (
        <div className="rounded-xl border bg-card p-4 mb-6 space-y-3">
          <div className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4" style={{ color: AGENCY }} /> ¿Qué grabaste hoy que tienes que editar?</div>
          <input autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') crear() }} placeholder='Ej: "Reel 3 errores de tu web"' className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2" style={{ ['--tw-ring-color' as string]: `${AGENCY}55` }} />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Cuenta:</label>
            <select value={cuenta} onChange={(e) => setCuenta(e.target.value)} className="flex-1 h-9 px-2 rounded-lg border bg-background text-sm">
              {marcas.map((m) => <option key={m.slug} value={m.slug}>{m.nombre}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={crear} disabled={creando || !titulo.trim()} className="flex-1 h-10 rounded-lg text-white font-semibold text-sm disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY2})` }}>{creando ? 'Agendando…' : 'Agendar para editar'}</button>
            <button onClick={() => { setNuevoOpen(false); setTitulo('') }} className="h-10 px-4 rounded-lg border text-sm font-medium">Cancelar</button>
          </div>
        </div>
      )}

      {/* POR EDITAR */}
      <SeccionChip icon={<Scissors className="w-3.5 h-3.5" />} label={`Por editar · ${porEditar.length}`} bg="#faece7" color="#993c1d" />
      {porEditar.length === 0 ? (
        <Vacio texto="Nada por editar. Agrega lo que grabaste hoy." />
      ) : (
        <div className="space-y-2 mb-6">
          {porEditar.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#eef0f7', color: '#534ab7' }}><Film className="w-5 h-5" /></span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{v.titulo}</div>
                <div className="text-xs text-muted-foreground">{v.cuentaNombre} · grabado hoy</div>
              </div>
              <button onClick={() => setEstado(v.id, 'editado')} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-white font-semibold text-xs shrink-0" style={{ background: `linear-gradient(135deg, ${AGENCY}, ${AGENCY2})` }}>Marcar editado</button>
              <button onClick={() => eliminar(v.id)} title="Eliminar" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {/* EDITADOS — revisar checklist */}
      <SeccionChip icon={<CheckCircle2 className="w-3.5 h-3.5" />} label={`Editado · revisar checklist · ${editados.length}`} bg="#e1f5ee" color="#0f6e56" />
      {editados.length === 0 ? (
        <Vacio texto="Cuando marques un video como editado, aparece aquí para revisarlo." />
      ) : (
        <div className="space-y-4 mb-6">
          {editados.map((v) => (
            <ChecklistCard key={v.id} v={v} onToggle={toggle} onAprobar={aprobar} onReabrir={() => setEstado(v.id, 'por_editar')} onEliminar={() => eliminar(v.id)} />
          ))}
        </div>
      )}

      {/* APROBADOS */}
      {aprobados.length > 0 && (
        <>
          <SeccionChip icon={<CalendarCheck className="w-3.5 h-3.5" />} label={`Aprobados y agendados · ${aprobados.length}`} bg="#ede9fe" color="#5b21b6" />
          <div className="space-y-2">
            {aprobados.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ background: 'rgba(94,234,212,0.08)', borderColor: 'rgba(20,184,166,0.3)' }}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: '#14b8a6' }}><Check className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{v.titulo}</div>
                  <div className="text-xs" style={{ color: '#0f766e' }}>{v.cuentaNombre} · se publica el {fechaBonita(v.fechaPublicacion)}</div>
                </div>
                {v.publicacionId && (
                  <Link href={`/publicaciones/${v.publicacionId}`} className="text-xs font-semibold shrink-0 hover:underline" style={{ color: AGENCY }}>Ver en grilla →</Link>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}

function ChecklistCard({ v, onToggle, onAprobar, onReabrir, onEliminar }: {
  v: VideoErick
  onToggle: (id: string, key: string) => void
  onAprobar: (id: string) => void
  onReabrir: () => void
  onEliminar: () => void
}) {
  const done = CHECKLIST.filter((c) => v.checklist[c.key]).length
  const pct = Math.round((done / 12) * 100)
  const listo = done === 12
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#eef0f7', color: '#534ab7' }}><Film className="w-5 h-5" /></span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{v.titulo}</div>
          <div className="text-xs text-muted-foreground">{v.cuentaNombre} · editado</div>
        </div>
        <span className="text-sm font-bold shrink-0" style={{ color: listo ? '#0f6e56' : AGENCY }}>{done}/12</span>
        <button onClick={onReabrir} title="Devolver a por editar" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"><RotateCcw className="w-4 h-4" /></button>
        <button onClick={onEliminar} title="Eliminar" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: listo ? '#14b8a6' : `linear-gradient(90deg, ${AGENCY}, ${AGENCY2})` }} />
      </div>

      <div className="space-y-1.5">
        {CHECKLIST.map((c) => {
          const on = !!v.checklist[c.key]
          return (
            <button key={c.key} onClick={() => onToggle(v.id, c.key)} className="w-full flex items-start gap-2.5 text-left rounded-lg border px-3 py-2 transition-colors" style={on ? { background: '#e1f5ee', borderColor: '#9fe1cb' } : {}}>
              {on ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#0f6e56' }} /> : <Circle className="w-5 h-5 shrink-0 mt-0.5 text-muted-foreground" />}
              <span className="text-[13px] leading-snug" style={{ color: on ? '#04342c' : 'var(--muted-foreground)' }}>{c.texto}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          {listo ? <><Sparkles className="w-3.5 h-3.5" style={{ color: '#14b8a6' }} /> ¡Listo! Cumple los 12 requisitos.</> : <>Completa los 12 requisitos para aprobar.</>}
        </div>
        <button onClick={() => onAprobar(v.id)} disabled={!listo} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: listo ? '#14b8a6' : `linear-gradient(135deg, ${AGENCY}, ${AGENCY2})` }}>
          <CalendarCheck className="w-4 h-4" /> Aprobar y agendar
        </button>
      </div>
    </div>
  )
}

/* ---------- helpers de UI ---------- */

function SeccionChip({ icon, label, bg, color }: { icon: ReactNode; label: string; bg: string; color: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-2.5" style={{ background: bg, color }}>
      {icon} {label}
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return <div className="rounded-xl border border-dashed bg-muted/20 text-center text-sm text-muted-foreground py-6 mb-6">{texto}</div>
}

function BloqueView({ b }: { b: Bloque }) {
  if (b.t === 'p') return <p className="text-[13px] text-muted-foreground leading-relaxed">{b.texto}</p>
  if (b.t === 'sub') return <h3 className="text-sm font-semibold mt-3">{b.texto}</h3>
  if (b.t === 'lista') return <ul className="list-disc pl-5 space-y-1 text-[13px] text-muted-foreground">{b.items.map((i, k) => <li key={k}>{i}</li>)}</ul>
  if (b.t === 'chips') return <div className="flex flex-wrap gap-2">{b.items.map((i, k) => <span key={k} className="text-xs px-2.5 py-1 rounded-full border bg-muted/40">{i}</span>)}</div>
  if (b.t === 'callout') {
    const c = b.tono === 'rojo' ? { bg: '#fdf2f6', bd: '#e5326b', tx: '#99213f' } : b.tono === 'azul' ? { bg: '#eef3fc', bd: '#2f52b0', tx: '#1e3a8a' } : { bg: '#eef7f2', bd: '#1e7a55', tx: '#0f5132' }
    return <div className="rounded-r-lg px-3.5 py-2.5 text-[13px]" style={{ background: c.bg, borderLeft: `3px solid ${c.bd}`, color: c.tx }}><span className="block text-[10px] font-bold uppercase tracking-wide mb-0.5">{b.lbl}</span>{b.texto}</div>
  }
  if (b.t === 'tabla') return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-[12.5px]">
        <thead><tr>{b.head.map((h, k) => <th key={k} className="text-left font-semibold px-2.5 py-1.5 bg-muted/50">{h}</th>)}</tr></thead>
        <tbody>{b.filas.map((f, k) => <tr key={k} className="border-t">{f.map((c, j) => <td key={j} className={`px-2.5 py-1.5 align-top ${j === 0 ? 'font-semibold whitespace-nowrap' : 'text-muted-foreground'}`}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
  if (b.t === 'timeline') return (
    <div className="rounded-lg border overflow-hidden">
      {b.filas.map((f, k) => (
        <div key={k} className="grid grid-cols-[92px_1fr] border-t first:border-t-0">
          <div className="text-[11px] font-bold px-2.5 py-2 bg-muted/50" style={{ color: AGENCY2 }}>{f[0]}</div>
          <div className="text-[12.5px] px-3 py-2 text-muted-foreground">{f[1]}</div>
        </div>
      ))}
    </div>
  )
  if (b.t === 'do') return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="rounded-lg border p-3" style={{ background: '#eef7f2' }}><div className="text-sm font-semibold mb-1" style={{ color: '#0f5132' }}>✅ Siempre</div><p className="text-[12.5px]" style={{ color: '#166534' }}>{b.siempre}</p></div>
      <div className="rounded-lg border p-3" style={{ background: '#fdf2f6' }}><div className="text-sm font-semibold mb-1" style={{ color: '#99213f' }}>🚫 Nunca</div><p className="text-[12.5px]" style={{ color: '#9f1239' }}>{b.nunca}</p></div>
    </div>
  )
  return null
}
