'use client'

/* TAREAS del portal del cliente — el MISMO módulo de tareas del sistema,
   con el mismo diseño de cards (color de columna, chip del asignado, ✓ y 🗑),
   pero SOLO la columna de su marca. El cliente también crea y asigna tareas
   al equipo (selector "Para:"), igual que nosotros. Pedro 31-ago-2026:
   "el mismo diseño todo pero que al cliente solo le salga su marca". */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Trash2, Plus, Loader2, ListTodo } from 'lucide-react'
import { crearTareaClientePortal, completarTareaClientePortal, eliminarTareaClientePortal } from '../_actions'

export type TareaClienteItem = {
  id: string
  texto: string
  color: string
  asignadoNombre: string | null
  createdAt: string
}

type MiembroLite = { id: string; nombre: string }

/* Mismo look del botón de ícono de las cards del tablero del equipo. */
const iconBtn: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 5, border: 'none', cursor: 'pointer',
  background: 'rgba(255,255,255,0.22)', color: '#fff',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

export function TareasClienteView({ tareas: iniciales, equipo, marcaNombre, color }: {
  tareas: TareaClienteItem[]
  equipo: MiembroLite[]
  marcaNombre: string
  color: string
}) {
  const router = useRouter()
  const [tareas, setTareas] = useState<TareaClienteItem[]>(iniciales)
  const [texto, setTexto] = useState('')
  const [paraId, setParaId] = useState<string>('')   // '' = sin asignar (equipo)
  const [creando, setCreando] = useState(false)

  async function crear() {
    const t = texto.trim()
    if (!t || creando) { if (!t) toast.error('Escribe la tarea'); return }
    setCreando(true)
    const r = await crearTareaClientePortal(t, paraId || undefined)
    setCreando(false)
    if (!r.ok) { toast.error(r.error); return }
    setTexto('')
    toast.success('📝 Tarea creada — el equipo ya la ve en su tablero')
    router.refresh()
  }

  function completar(t: TareaClienteItem) {
    setTareas((cur) => cur.filter((x) => x.id !== t.id))
    completarTareaClientePortal(t.id).then((r) => {
      if (!r.ok) { setTareas((cur) => [t, ...cur]); toast.error(r.error) }
      else { toast.success('✅ Tarea completada'); router.refresh() }
    })
  }

  function eliminar(t: TareaClienteItem) {
    if (!confirm(`¿Eliminar esta tarea?\n\n"${t.texto.slice(0, 60)}${t.texto.length > 60 ? '…' : ''}"`)) return
    setTareas((cur) => cur.filter((x) => x.id !== t.id))
    eliminarTareaClientePortal(t.id).then((r) => {
      if (!r.ok) { setTareas((cur) => [t, ...cur]); toast.error(r.error) }
      else router.refresh()
    })
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl text-white shrink-0" style={{ background: color }}>
          <ListTodo className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold leading-tight">Tareas · {marcaNombre}</h2>
          <p className="text-[13px] text-muted-foreground">{tareas.length} activa{tareas.length === 1 ? '' : 's'} — las mismas tareas del tablero del equipo. Crea una y asígnala.</p>
        </div>
      </header>

      {/* Composer: tarea + "Para:" (igual que el tablero del equipo) */}
      <section className="rounded-2xl border bg-card p-3.5 flex items-center gap-2 flex-wrap">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void crear() } }}
          placeholder="Escribe una tarea para el equipo…"
          maxLength={600}
          className="flex-1 min-w-[200px] h-10 px-3 rounded-xl border bg-background text-[14px] outline-none focus:ring-2"
        />
        <select
          value={paraId}
          onChange={(e) => setParaId(e.target.value)}
          className="h-10 px-2.5 rounded-xl border bg-background text-[13px] font-semibold outline-none"
          title="A quién se la asignas"
          style={paraId ? { color, borderColor: `${color}66` } : undefined}
        >
          <option value="">👥 Para el equipo</option>
          {equipo.map((m) => <option key={m.id} value={m.id}>👤 {m.nombre.split(' ')[0]}</option>)}
        </select>
        <button type="button" onClick={crear} disabled={creando || !texto.trim()}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white disabled:opacity-50"
          style={{ background: color }} title="Crear tarea">
          {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
        </button>
      </section>

      {/* Columna de la marca — mismo diseño del tablero /tareas del sistema */}
      <section className="rounded-2xl p-3" style={{ background: '#f4f4f6' }}>
        <div className="flex items-center gap-2 px-1 pb-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-[13px] font-bold">{marcaNombre}</span>
          <span className="ml-auto text-[12px] font-bold text-muted-foreground">{tareas.length}</span>
        </div>
        {tareas.length === 0 ? (
          <p className="text-center text-[12.5px] text-muted-foreground py-6">Sin tareas activas. Crea la primera arriba. ✍️</p>
        ) : (
          <div className="space-y-1.5">
            {tareas.map((t) => (
              <div key={t.id} style={{ background: t.color, borderRadius: 8, padding: '6px 8px', color: '#fff' }}>
                <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.3, wordBreak: 'break-word' }}>{t.texto}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                  {t.asignadoNombre && (
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, background: 'rgba(255,255,255,0.22)', padding: '1px 5px', borderRadius: 4 }}>
                      {t.asignadoNombre.split(' ')[0]}
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => completar(t)} title="Completar" style={iconBtn}>
                    <Check size={12} strokeWidth={2.6} />
                  </button>
                  <button onClick={() => eliminar(t)} title="Eliminar tarea" style={iconBtn}>
                    <Trash2 size={12} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
