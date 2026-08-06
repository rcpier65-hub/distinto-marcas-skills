'use client'

// "La Ruleta" — sorteo mensual de quién organiza la salida del equipo.
// Gira → sale un integrante → se registra la actividad. Abajo el historial.
// Pedro 21-jul-2026.

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  RotateCw, Sparkles, MapPin, CalendarDays, Clock, Users, Trash2, Check, PartyPopper, History,
} from 'lucide-react'
import { guardarActividadRuleta, eliminarActividadRuleta } from '../_actions'

export type Miembro = { id: string; nombre: string; avatarUrl: string | null }
export type Actividad = {
  id: string
  organizador: string
  lugar: string | null
  fecha: string | null
  hora: string | null
  asistentes: string[]
  notas: string | null
}

// Paleta de la ruleta — colores vivos pero cuidados (no el rojo/azul default).
const PALETA = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4', '#d946ef', '#22c55e']

const R = 100
function xy(deg: number): [number, number] {
  const r = (deg * Math.PI) / 180
  return [R * Math.cos(r), R * Math.sin(r)]
}
function primerNombre(n: string) { return n.trim().split(/\s+/)[0] }

function fechaBonita(f: string | null) {
  if (!f) return null
  const [y, m, d] = f.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
}
function horaBonita(h: string | null) {
  if (!h) return null
  const [hh, mm] = h.split(':')
  const H = Number(hh)
  const ap = H >= 12 ? 'p.m.' : 'a.m.'
  const h12 = H % 12 === 0 ? 12 : H % 12
  return `${h12}:${mm} ${ap}`
}

export function RuletaView({ equipo, historial }: { equipo: Miembro[]; historial: Actividad[] }) {
  const router = useRouter()

  // Quiénes ya organizaron (para el toggle de "excluir").
  const yaOrganizaron = useMemo(
    () => new Set(historial.map((h) => h.organizador.trim().toLowerCase())),
    [historial],
  )
  const [excluir, setExcluir] = useState(false)
  const enRuleta = useMemo(() => {
    if (!excluir) return equipo
    const filtrados = equipo.filter((m) => !yaOrganizaron.has(m.nombre.trim().toLowerCase()))
    return filtrados.length ? filtrados : equipo // si ya organizaron todos, mostrar todos
  }, [equipo, excluir, yaOrganizaron])

  const N = enRuleta.length
  const seg = N ? 360 / N : 360

  const [rot, setRot] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [ganador, setGanador] = useState<Miembro | null>(null)
  const pendiente = useRef<Miembro | null>(null)

  function girar() {
    if (spinning || N === 0) return
    setSpinning(true)
    setGanador(null)
    const w = Math.floor(Math.random() * N)
    pendiente.current = enRuleta[w]
    const targetMod = (360 - (w * seg + seg / 2)) % 360 // trae el ganador al puntero (derecha)
    const curMod = ((rot % 360) + 360) % 360
    let delta = targetMod - curMod
    if (delta < 0) delta += 360
    setRot(rot + 360 * 6 + delta) // 6 vueltas + ajuste exacto
  }

  function onFin() {
    if (!spinning) return
    setSpinning(false)
    const g = pendiente.current
    if (g) {
      setGanador(g)
      setForm((f) => ({ ...f, organizador: g.nombre }))
    }
  }

  // ── Formulario de la actividad ──────────────────────────────────────────
  const [form, setForm] = useState({
    organizador: '', lugar: '', fecha: '', hora: '', notas: '',
    asistentes: equipo.map((m) => m.nombre), // por defecto todos van
  })
  const [guardando, startGuardar] = useTransition()

  function toggleAsistente(nombre: string) {
    setForm((f) => ({
      ...f,
      asistentes: f.asistentes.includes(nombre)
        ? f.asistentes.filter((n) => n !== nombre)
        : [...f.asistentes, nombre],
    }))
  }

  function guardar() {
    if (!form.organizador.trim()) { toast.error('Primero gira la ruleta o elige quién organiza'); return }
    const org = equipo.find((m) => m.nombre === form.organizador)
    startGuardar(async () => {
      const r = await guardarActividadRuleta({
        organizadorId: org?.id ?? null,
        organizadorNombre: form.organizador,
        lugar: form.lugar,
        fecha: form.fecha || null,
        hora: form.hora || null,
        asistentes: form.asistentes,
        notas: form.notas,
      })
      if (r.ok) {
        toast.success('¡Actividad registrada!')
        setForm({ organizador: '', lugar: '', fecha: '', hora: '', notas: '', asistentes: equipo.map((m) => m.nombre) })
        setGanador(null)
        router.refresh()
      } else {
        toast.error(r.error)
      }
    })
  }

  const [borrando, startBorrar] = useTransition()
  function borrar(id: string) {
    if (!confirm('¿Eliminar esta actividad del historial?')) return
    startBorrar(async () => {
      const r = await eliminarActividadRuleta(id)
      if (r.ok) { toast.success('Eliminada'); router.refresh() } else { toast.error(r.error) }
    })
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Encabezado */}
      <header className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #7170ff, #ec4899)' }}>
          <Sparkles className="w-6 h-6" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold leading-tight">La Ruleta</h1>
          <p className="text-[13px] text-muted-foreground">Cada mes, la ruleta decide quién organiza la próxima salida del equipo. 🎉</p>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* ───── Ruleta ───── */}
        <section className="rounded-2xl border bg-card p-5 flex flex-col items-center gap-4">
          <div className="relative w-full max-w-[340px] aspect-square select-none">
            {/* Puntero (derecha) */}
            <div className="absolute top-1/2 right-[-6px] -translate-y-1/2 z-10"
              style={{ width: 0, height: 0, borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderRight: '20px solid #1f2937', filter: 'drop-shadow(-2px 0 2px rgba(0,0,0,0.25))' }} />
            {/* Rotamos el <svg> ENTERO (elemento HTML): así transform-origin:center
                es 100% fiable y gira sobre su eje. El puntero va aparte (fijo). */}
            <svg viewBox="-116 -116 232 232" className="w-full h-full"
              style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center', transition: 'transform 4.6s cubic-bezier(0.16,0.84,0.28,1)' }}
              onTransitionEnd={onFin}>
                {N === 0 ? (
                  <text textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>Sin equipo</text>
                ) : enRuleta.map((m, i) => {
                  const a0 = i * seg, a1 = (i + 1) * seg
                  const [x0, y0] = xy(a0), [x1, y1] = xy(a1)
                  const large = seg > 180 ? 1 : 0
                  const mid = a0 + seg / 2
                  const flip = mid > 90 && mid < 270
                  const color = PALETA[i % PALETA.length]
                  return (
                    <g key={m.id}>
                      <path d={`M0,0 L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`}
                        fill={color} stroke="#fff" strokeWidth={1.5} />
                      <g transform={`rotate(${mid})`}>
                        <text x={0.6 * R} y={0} textAnchor="middle" dominantBaseline="middle" fill="#fff"
                          transform={flip ? `rotate(180 ${0.6 * R} 0)` : undefined}
                          style={{ fontSize: N > 10 ? 8 : 11, fontWeight: 700 }}>
                          {primerNombre(m.nombre)}
                        </text>
                      </g>
                    </g>
                  )
                })}
              {/* Centro */}
              <circle cx={0} cy={0} r={16} fill="#fff" stroke="#e5e7eb" strokeWidth={2} />
            </svg>
          </div>

          <button onClick={girar} disabled={spinning || N === 0}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-xl text-white font-bold text-[15px] shadow-lg disabled:opacity-60 transition-transform active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7170ff, #ba41f7)' }}>
            <RotateCw className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} /> {spinning ? 'Girando…' : 'Girar la ruleta'}
          </button>

          {/* Toggle excluir */}
          <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={excluir} onChange={(e) => setExcluir(e.target.checked)} className="accent-[#7170ff] w-4 h-4" />
            Excluir a quienes ya organizaron
          </label>

          {/* Ganador */}
          {ganador && (
            <div className="w-full rounded-xl px-4 py-3 flex items-center gap-3 text-white animate-[pulse_1.2s_ease-in-out_1]"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <PartyPopper className="w-6 h-6 shrink-0" />
              <div className="text-[14px] leading-tight">
                <span className="font-extrabold">{ganador.nombre}</span> organiza la próxima salida 🎉
              </div>
            </div>
          )}
        </section>

        {/* ───── Formulario ───── */}
        <section className="rounded-2xl border bg-card p-5 space-y-3.5">
          <div className="font-bold text-[15px] flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Registrar la actividad</div>

          <Campo label="Quién organiza" icon={<Sparkles className="w-4 h-4" />}>
            <select value={form.organizador} onChange={(e) => setForm((f) => ({ ...f, organizador: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]">
              <option value="">— elige o gira la ruleta —</option>
              {equipo.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
            </select>
          </Campo>

          <Campo label="Lugar" icon={<MapPin className="w-4 h-4" />}>
            <input value={form.lugar} onChange={(e) => setForm((f) => ({ ...f, lugar: e.target.value }))}
              placeholder="Ej. Restaurante, cine, parque…"
              className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]" />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Fecha" icon={<CalendarDays className="w-4 h-4" />}>
              <input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]" />
            </Campo>
            <Campo label="Hora" icon={<Clock className="w-4 h-4" />}>
              <input type="time" value={form.hora} onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]" />
            </Campo>
          </div>

          <Campo label={`Asistentes (${form.asistentes.length})`} icon={<Users className="w-4 h-4" />}>
            <div className="flex flex-wrap gap-2">
              {equipo.map((m) => {
                const on = form.asistentes.includes(m.nombre)
                return (
                  <button key={m.id} type="button" onClick={() => toggleAsistente(m.nombre)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-semibold border transition-colors"
                    style={on ? { background: '#7170ff', color: '#fff', borderColor: '#7170ff' } : { color: 'var(--muted-foreground, #64748b)' }}>
                    {on && <Check className="w-3.5 h-3.5" />}{primerNombre(m.nombre)}
                  </button>
                )
              })}
            </div>
          </Campo>

          <Campo label="Notas (opcional)" icon={<Sparkles className="w-4 h-4" />}>
            <textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              rows={2} placeholder="Detalles, presupuesto, idea…"
              className="w-full px-3 py-2 rounded-lg border bg-background text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#7170ff]" />
          </Campo>

          <button onClick={guardar} disabled={guardando}
            className="w-full h-11 rounded-xl text-white font-bold text-[14px] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            {guardando ? 'Guardando…' : 'Guardar actividad'}
          </button>
        </section>
      </div>

      {/* ───── Historial ───── */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="font-bold text-[15px] flex items-center gap-2 mb-3"><History className="w-4 h-4" /> Historial de salidas <span className="text-muted-foreground font-normal">({historial.length})</span></div>
        {historial.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-6 text-center">Todavía no hay salidas registradas. Gira la ruleta y guarda la primera. 🎡</p>
        ) : (
          <div className="space-y-2.5">
            {historial.map((a) => (
              <div key={a.id} className="rounded-xl border p-3.5 flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 text-white font-bold"
                  style={{ background: 'linear-gradient(135deg, #7170ff, #ec4899)' }}>
                  {primerNombre(a.organizador).slice(0, 1).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold leading-tight">
                    Organiza <span style={{ color: '#7170ff' }}>{a.organizador}</span>
                  </div>
                  <div className="text-[12.5px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {a.lugar && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{a.lugar}</span>}
                    {a.fecha && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{fechaBonita(a.fecha)}</span>}
                    {a.hora && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{horaBonita(a.hora)}</span>}
                  </div>
                  {a.asistentes.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {a.asistentes.map((n) => (
                        <span key={n} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{primerNombre(n)}</span>
                      ))}
                    </div>
                  )}
                  {a.notas && <p className="text-[12px] text-muted-foreground mt-1.5 italic">“{a.notas}”</p>}
                </div>
                <button onClick={() => borrar(a.id)} disabled={borrando} aria-label="Eliminar"
                  className="shrink-0 w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function Campo({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">{icon}{label}</span>
      {children}
    </label>
  )
}
