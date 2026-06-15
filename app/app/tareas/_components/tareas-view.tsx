'use client'

/* TareasView — tablero de tareas estilo "Notas" de Pedro, para la web app.
   - Columnas dinámicas = categoría (entidad: cliente/marca/persona).
   - Crear con input + dictado por voz. La IA pone la categoría sola.
   - @Nombre del equipo → la tarea se asigna a esa persona.
   - Arrastrar una card → barra abajo: Focus IA / Manual(3) / Delegar(3) /
     Completar. O arrastrar a otra columna para recategorizar.
   - Zona Focus en el mismo tablero + cronómetro ("Entrar en Focus"). */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  DndContext, useDraggable, useDroppable, DragOverlay,
  PointerSensor, TouchSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { Mic, Plus, Check, X, ArrowRight, Bot, Hand, Send as SendIcon, Sparkles, Timer } from 'lucide-react'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import type { Tarea, FocusLane } from '@/lib/tareas/types'
import { crearTarea, completarTarea, eliminarTarea, moverTareaCategoria, setFocusLane } from '../_actions'

const LANE_META: Record<FocusLane, { label: string; color: string; Icon: typeof Bot }> = {
  ia: { label: 'Focus IA', color: '#8E24AA', Icon: Bot },
  manual: { label: 'Manual', color: '#E8952F', Icon: Hand },
  delegar: { label: 'Delegar', color: '#039BE5', Icon: SendIcon },
}

export function TareasView({
  tareasIniciales, esCEO, meId, equipo,
}: {
  tareasIniciales: Tarea[]
  esCEO: boolean
  meId: string | null
  equipo: { id: string; nombre: string }[]
}) {
  const isMobile = useIsMobile()
  const [tareas, setTareas] = useState<Tarea[]>(tareasIniciales)
  const [dragId, setDragId] = useState<string | null>(null)
  const [focusModeActive, setFocusModeActive] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  )

  const activas = useMemo(() => tareas.filter((t) => !t.completada), [tareas])
  const enFocus = useMemo(() => activas.filter((t) => t.focusLane), [activas])
  const enBoard = useMemo(() => activas.filter((t) => !t.focusLane), [activas])

  /* Columnas por categoría (orden: más tareas primero). */
  const columnas = useMemo(() => {
    const m = new Map<string, { categoria: string; color: string; items: Tarea[] }>()
    for (const t of enBoard) {
      const g = m.get(t.categoria) ?? { categoria: t.categoria, color: t.color, items: [] }
      g.items.push(t)
      m.set(t.categoria, g)
    }
    return [...m.values()].sort((a, b) => b.items.length - a.items.length)
  }, [enBoard])

  const todasCategorias = useMemo(() => [...new Set(activas.map((t) => t.categoria))], [activas])

  /* ───────── acciones (optimistas) ───────── */

  const onCrear = useCallback((tarea: Tarea) => {
    setTareas((cur) => [tarea, ...cur])
  }, [])

  const onCompletar = useCallback(async (id: string) => {
    setTareas((cur) => cur.filter((t) => t.id !== id))
    const r = await completarTarea(id, true)
    if (!r.ok) { toast.error(r.error ?? 'No se pudo completar'); window.location.reload() }
  }, [])

  const onEliminar = useCallback(async (id: string) => {
    const prev = tareas
    setTareas((cur) => cur.filter((t) => t.id !== id))
    const r = await eliminarTarea(id)
    if (!r.ok) { toast.error(r.error ?? 'No se pudo eliminar'); setTareas(prev) }
  }, [tareas])

  const onMover = useCallback(async (id: string, categoria: string) => {
    setTareas((cur) => cur.map((t) => t.id === id ? { ...t, categoria } : t))
    const r = await moverTareaCategoria(id, categoria)
    if (!r.ok) { toast.error(r.error ?? 'No se pudo mover'); window.location.reload() }
  }, [])

  const onSetFocus = useCallback(async (id: string, lane: FocusLane | null) => {
    const prev = tareas
    setTareas((cur) => cur.map((t) => t.id === id ? { ...t, focusLane: lane } : t))
    const r = await setFocusLane(id, lane)
    if (!r.ok) { toast.error(r.error ?? 'No se pudo'); setTareas(prev) }
  }, [tareas])

  /* ───────── drag & drop ───────── */

  function onDragStart(e: DragStartEvent) { setDragId(String(e.active.id)) }
  function onDragEnd(e: DragEndEvent) {
    setDragId(null)
    const id = String(e.active.id)
    const over = e.over?.id ? String(e.over.id) : null
    if (!over) return
    if (over === 'drop:complete') { onCompletar(id); return }
    if (over.startsWith('drop:focus:')) { onSetFocus(id, over.replace('drop:focus:', '') as FocusLane); return }
    if (over.startsWith('col:')) { onMover(id, over.replace('col:', '')); return }
  }

  const dragTarea = dragId ? activas.find((t) => t.id === dragId) ?? null : null

  return (
    <main style={{ minHeight: '100vh', background: 'var(--mk-bg-base, #f7f7f8)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: isMobile ? '12px 14px' : '16px 24px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(113,112,255,0.12)', color: '#7170ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles className="w-4 h-4" strokeWidth={2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>Tareas</h1>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#6b7280' }}>
            {esCEO ? 'Ves todo el equipo · ' : ''}{activas.length} activa{activas.length === 1 ? '' : 's'}
            {' · escribe @Nombre para asignar'}
          </p>
        </div>
        {enFocus.length > 0 && (
          <button
            onClick={() => setFocusModeActive((v) => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600,
              background: focusModeActive ? '#ef4444' : '#fee2e2',
              color: focusModeActive ? '#fff' : '#b91c1c',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: focusModeActive ? '#fff' : '#ef4444' }} />
            {focusModeActive ? 'Salir de Focus' : `Entrar en Focus · ${enFocus.length}`}
          </button>
        )}
      </header>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {/* Zona Focus (en el mismo tablero) */}
        {(focusModeActive || enFocus.length > 0) && (
          <FocusZona
            enFocus={enFocus}
            focusModeActive={focusModeActive}
            onComplete={onCompletar}
            onRemove={(id) => onSetFocus(id, null)}
          />
        )}

        {/* Tablero de columnas */}
        <div style={{ flex: 1, overflowX: 'auto', padding: isMobile ? '8px 12px 140px' : '8px 24px 140px' }}>
          {columnas.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              {enFocus.length > 0 ? 'Todo lo demás está en Focus 🎯' : 'No hay tareas todavía. Escribe una abajo 👇'}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 'min-content' }}>
              {columnas.map((c) => (
                <Columna key={c.categoria} columna={c} esCEO={esCEO} todasCategorias={todasCategorias}
                  onComplete={onCompletar} onDelete={onEliminar} onMover={onMover} />
              ))}
            </div>
          )}
        </div>

        {/* Barra de drop (aparece al arrastrar) */}
        {dragId && <DropBar enFocus={enFocus} />}

        <DragOverlay>
          {dragTarea ? <CardVisual tarea={dragTarea} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Composer */}
      <Composer onCrear={onCrear} equipo={equipo} isMobile={isMobile} />
    </main>
  )
}

/* ============================ Columna ============================ */
function Columna({ columna, esCEO, todasCategorias, onComplete, onDelete, onMover }: {
  columna: { categoria: string; color: string; items: Tarea[] }
  esCEO: boolean
  todasCategorias: string[]
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onMover: (id: string, cat: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${columna.categoria}` })
  return (
    <section ref={setNodeRef} style={{
      flex: '0 0 220px', width: 220,
      borderRadius: 10, padding: 6,
      background: isOver ? `${columna.color}14` : 'transparent',
      transition: 'background 120ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 6px 8px', borderLeft: `3px solid ${columna.color}`, paddingLeft: 8, marginBottom: 4 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: columna.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{columna.categoria}</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{columna.items.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {columna.items.map((t) => (
          <CardArrastrable key={t.id} tarea={t} esCEO={esCEO} otras={todasCategorias.filter((c) => c !== t.categoria)}
            onComplete={onComplete} onDelete={onDelete} onMover={onMover} />
        ))}
      </div>
    </section>
  )
}

/* ============================ Card ============================ */
function CardArrastrable({ tarea, esCEO, otras, onComplete, onDelete, onMover }: {
  tarea: Tarea; esCEO: boolean; otras: string[]
  onComplete: (id: string) => void; onDelete: (id: string) => void; onMover: (id: string, cat: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: tarea.id })
  const [menu, setMenu] = useState(false)
  const [nueva, setNueva] = useState('')

  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.4 : 1, position: 'relative' }}>
      <div style={{ background: tarea.color, borderRadius: 9, padding: '9px 10px', color: '#fff' }}>
        {/* zona arrastrable = el texto */}
        <p {...attributes} {...listeners} style={{ margin: 0, fontSize: 12.5, lineHeight: 1.35, cursor: 'grab', touchAction: 'none', wordBreak: 'break-word' }}>
          {tarea.texto}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
          {esCEO && tarea.teamMemberNombre && (
            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, background: 'rgba(255,255,255,0.22)', padding: '1px 6px', borderRadius: 5 }}>
              {tarea.teamMemberNombre.split(' ')[0]}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => setMenu((v) => !v)} title="Mover de columna" style={iconBtn}>
            <ArrowRight size={13} strokeWidth={2.4} />
          </button>
          <button onClick={() => onComplete(tarea.id)} title="Completar" style={iconBtn}>
            <Check size={13} strokeWidth={2.6} />
          </button>
        </div>
      </div>
      {menu && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 30, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', padding: 6, minWidth: 170 }}>
          <div style={{ fontSize: 10.5, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, padding: '2px 6px 4px' }}>Mover a</div>
          {otras.map((c) => (
            <button key={c} onClick={() => { onMover(tarea.id, c); setMenu(false) }} style={menuItem}>{c}</button>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (nueva.trim()) { onMover(tarea.id, nueva.trim()); setNueva(''); setMenu(false) } }} style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <input value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva…" style={{ flex: 1, fontSize: 12, padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: 7, outline: 'none' }} />
            <button type="submit" style={{ ...iconBtn, color: '#16a34a', background: '#f0fdf4' }}><Plus size={14} /></button>
          </form>
          <button onClick={() => { onDelete(tarea.id); setMenu(false) }} style={{ ...menuItem, color: '#dc2626', marginTop: 2 }}>Eliminar</button>
        </div>
      )}
    </div>
  )
}

function CardVisual({ tarea, overlay }: { tarea: Tarea; overlay?: boolean }) {
  return (
    <div style={{ background: tarea.color, borderRadius: 9, padding: '9px 10px', color: '#fff', width: 208, boxShadow: overlay ? '0 10px 28px rgba(0,0,0,0.28)' : 'none', cursor: 'grabbing' }}>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.35, wordBreak: 'break-word' }}>{tarea.texto}</p>
    </div>
  )
}

/* ============================ Zona Focus ============================ */
function FocusZona({ enFocus, focusModeActive, onComplete, onRemove }: {
  enFocus: Tarea[]; focusModeActive: boolean; onComplete: (id: string) => void; onRemove: (id: string) => void
}) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!focusModeActive) { setElapsed(0); return }
    const i = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(i)
  }, [focusModeActive])
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const lanes: FocusLane[] = ['ia', 'manual', 'delegar']

  return (
    <div style={{ margin: '4px 12px 8px', background: focusModeActive ? '#111827' : '#fff', border: `1px solid ${focusModeActive ? '#111827' : '#e5e7eb'}`, borderRadius: 14, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Timer size={15} color={focusModeActive ? '#fff' : '#ef4444'} />
        <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 0.4, color: focusModeActive ? '#fff' : '#111827' }}>MODO FOCUS</span>
        {focusModeActive && <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', color: '#34d399', fontWeight: 600 }}>{fmt(elapsed)}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {lanes.map((lane) => {
          const meta = LANE_META[lane]
          const items = enFocus.filter((t) => t.focusLane === lane)
          return (
            <div key={lane} style={{ borderTop: `2px solid ${meta.color}`, paddingTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <meta.Icon size={12} color={meta.color} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: focusModeActive ? '#e5e7eb' : '#374151' }}>{meta.label}</span>
                {items.length > 0 && <span style={{ fontSize: 10, color: '#9ca3af' }}>{items.length}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {items.length === 0 ? (
                  <div style={{ fontSize: 10.5, color: '#9ca3af', fontStyle: 'italic' }}>—</div>
                ) : items.map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: focusModeActive ? '#1f2937' : '#f9fafb', borderLeft: `3px solid ${t.color}`, borderRadius: 6, padding: '6px 7px' }}>
                    <span style={{ flex: 1, fontSize: 11.5, color: focusModeActive ? '#fff' : '#111827', lineHeight: 1.3 }}>{t.texto}</span>
                    <button onClick={() => onComplete(t.id)} title="Completar" style={{ ...iconBtnDark, color: '#34d399' }}><Check size={12} strokeWidth={2.6} /></button>
                    <button onClick={() => onRemove(t.id)} title="Quitar de focus" style={{ ...iconBtnDark, color: '#9ca3af' }}><X size={12} strokeWidth={2.4} /></button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================ Drop bar (al arrastrar) ============================ */
function DropBar({ enFocus }: { enFocus: Tarea[] }) {
  const count = (lane: FocusLane) => enFocus.filter((t) => t.focusLane === lane).length
  return (
    <div style={{ position: 'fixed', bottom: 84, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8, padding: '0 12px', zIndex: 60, pointerEvents: 'none' }}>
      <DropTarget id="drop:focus:ia" label="Focus IA" Icon={Bot} color="#8E24AA" />
      <DropTarget id="drop:focus:manual" label="Manual" Icon={Hand} color="#E8952F" sub={`${count('manual')}/3`} />
      <DropTarget id="drop:focus:delegar" label="Delegar" Icon={SendIcon} color="#039BE5" sub={`${count('delegar')}/3`} />
      <DropTarget id="drop:complete" label="Completar" Icon={Check} color="#16a34a" />
    </div>
  )
}
function DropTarget({ id, label, Icon, color, sub }: { id: string; label: string; Icon: typeof Bot; color: string; sub?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} style={{
      pointerEvents: 'auto',
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      minWidth: 78, padding: '8px 10px', borderRadius: 12,
      background: isOver ? color : '#fff',
      color: isOver ? '#fff' : color,
      border: `2px dashed ${color}`,
      boxShadow: '0 6px 18px rgba(0,0,0,0.12)', transition: 'all 120ms',
    }}>
      <Icon size={18} strokeWidth={2.2} />
      <span style={{ fontSize: 10.5, fontWeight: 700 }}>{label}</span>
      {sub && <span style={{ fontSize: 9, opacity: 0.8 }}>{sub}</span>}
    </div>
  )
}

/* ============================ Composer ============================ */
function Composer({ onCrear, equipo, isMobile }: {
  onCrear: (t: Tarea) => void; equipo: { id: string; nombre: string }[]; isMobile: boolean
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [escuchando, setEscuchando] = useState(false)
  const [micSoportado, setMicSoportado] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMicSoportado(!!SR)
  }, [])

  async function enviar() {
    const t = text.trim()
    if (!t || sending) return
    setSending(true); setText('')
    const r = await crearTarea(t)
    setSending(false)
    if (r.ok) onCrear(r.tarea)
    else { toast.error(r.error); setText(t) }
    inputRef.current?.focus()
  }

  function toggleMic() {
    if (escuchando) { recRef.current?.stop(); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error('Tu navegador no soporta dictado'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR()
    rec.lang = 'es-PE'; rec.continuous = true; rec.interimResults = true
    const base = text.trim(); let final = base ? base + ' ' : ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (ev: any) => {
      let interim = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const tr = ev.results[i][0].transcript
        if (ev.results[i].isFinal) final += tr; else interim += tr
      }
      setText((final + interim).trimStart())
    }
    rec.onerror = () => setEscuchando(false)
    rec.onend = () => { setEscuchando(false); inputRef.current?.focus() }
    recRef.current = rec; setEscuchando(true)
    try { rec.start() } catch { setEscuchando(false) }
  }

  return (
    <div style={{ position: 'sticky', bottom: 0, padding: isMobile ? '8px 12px 14px' : '10px 24px 18px', background: 'linear-gradient(180deg, transparent, var(--mk-bg-base, #f7f7f8) 30%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 4px 16px -4px rgba(16,24,40,0.10)', padding: '8px 8px 8px 14px', maxWidth: 720, margin: '0 auto' }}>
        <span style={{ opacity: 0.6 }} aria-hidden>✨</span>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enviar() } }}
          placeholder='Escribe la tarea… ej: "@Lorena revisar guiones que faltan"'
          disabled={sending}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#111827', background: 'transparent', minWidth: 0 }}
        />
        {micSoportado && (
          <button onClick={toggleMic} title={escuchando ? 'Detener' : 'Dictar'} className={escuchando ? 'mk-mic-on' : undefined}
            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: escuchando ? '#ef4444' : '#f3f4f6', color: escuchando ? '#fff' : '#6b7280' }}>
            <Mic size={17} strokeWidth={2} />
          </button>
        )}
        <button onClick={enviar} disabled={!text.trim() || sending} title="Agregar"
          style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: text.trim() ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: text.trim() ? '#16a34a' : '#e5e7eb', color: '#fff' }}>
          {sending ? '…' : <Plus size={18} strokeWidth={2.6} />}
        </button>
      </div>
      {/* hint @equipo */}
      {equipo.length > 0 && (
        <div style={{ maxWidth: 720, margin: '6px auto 0', fontSize: 10.5, color: '#9ca3af', textAlign: 'center' }}>
          Asignar a: {equipo.map((m) => `@${m.nombre.split(' ')[0]}`).join('  ')}
        </div>
      )}
      <style>{`@keyframes mk-mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}.mk-mic-on{animation:mk-mic-pulse 1.2s ease-in-out infinite}`}</style>
    </div>
  )
}

const iconBtn: React.CSSProperties = { width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.22)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const iconBtnDark: React.CSSProperties = { width: 20, height: 20, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const menuItem: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: 12.5, color: '#111827', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }
