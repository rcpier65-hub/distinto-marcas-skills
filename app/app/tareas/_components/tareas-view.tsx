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
  PointerSensor, TouchSensor, useSensor, useSensors, pointerWithin,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { Mic, Plus, Check, X, ArrowRight, Bot, Hand, Send as SendIcon, Sparkles, Timer, Archive, RotateCcw, Filter, Trash2 } from 'lucide-react'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import type { Tarea, FocusLane } from '@/lib/tareas/types'
import { crearTarea, completarTarea, eliminarTarea, moverTareaCategoria, setFocusLane } from '../_actions'

const LANE_META: Record<FocusLane, { label: string; color: string; Icon: typeof Bot }> = {
  ia: { label: 'Focus IA', color: '#8E24AA', Icon: Bot },
  manual: { label: 'Manual', color: '#E8952F', Icon: Hand },
  delegar: { label: 'Delegar', color: '#039BE5', Icon: SendIcon },
}

type Flyer = { key: string; texto: string; color: string; from: { x: number; y: number; w: number }; to: { x: number; y: number } }

/* Últimos 7 días (hoy → 6 atrás) en horario Lima, para que Erick indique cuándo
   hizo la tarea. Devuelve {iso:'YYYY-MM-DD', label} con "Hoy"/"Ayer". Usamos el
   mediodía UTC de cada día para que el componente de fecha en Lima sea correcto
   (Lima = UTC-5, sin horario de verano). Pedro 26-ago-2026. */
function opcionesDiaHecho(): { iso: string; label: string }[] {
  const hoyIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const [y, m, d] = hoyIso.split('-').map(Number)
  const out: { iso: string; label: string }[] = []
  for (let i = 0; i < 7; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d - i, 12))
    const iso = dt.toISOString().slice(0, 10)
    let label: string
    if (i === 0) label = 'Hoy'
    else if (i === 1) label = 'Ayer'
    else {
      const s = dt.toLocaleDateString('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric' })
      label = s.charAt(0).toUpperCase() + s.slice(1)
    }
    out.push({ iso, label })
  }
  return out
}

export function TareasView({
  tareasIniciales, completadasIniciales = [], esCEO, meId, equipo, esErick = false,
}: {
  tareasIniciales: Tarea[]
  completadasIniciales?: Tarea[]
  esCEO: boolean
  meId: string | null
  equipo: { id: string; nombre: string }[]
  /* Solo Erick: al completar una tarea le preguntamos QUÉ DÍA la hizo, para que
     su reporte semanal la ubique en el día correcto. Pedro 26-ago-2026. */
  esErick?: boolean
}) {
  const isMobile = useIsMobile()
  const [tareas, setTareas] = useState<Tarea[]>(tareasIniciales)
  const [completadas, setCompletadas] = useState<Tarea[]>(completadasIniciales)
  const [dragId, setDragId] = useState<string | null>(null)
  const [focusModeActive, setFocusModeActive] = useState(false)
  /* Archivo (historial) + filtro por persona (Pedro 20-jun-2026). */
  const [archivoOpen, setArchivoOpen] = useState(false)
  const [filtroUser, setFiltroUser] = useState<string | 'todos'>('todos')
  /* Animación "vuela al archivo" al completar. */
  const [flyers, setFlyers] = useState<Flyer[]>([])
  const [archivoPulse, setArchivoPulse] = useState(false)
  const archivoBtnRef = useRef<HTMLButtonElement>(null)
  /* Solo Erick: tarea pendiente de elegir "¿qué día la hiciste?". */
  const [preguntaFecha, setPreguntaFecha] = useState<{ id: string; titulo: string; fromRect?: DOMRect } | null>(null)
  /* Orden ESTABLE de columnas: se fija en el 1er render (por cantidad) y NO se
     reordena al completar/mover tareas → el tablero no "salta". Antes el re-sort
     por cantidad hacía que completar UNA tarea reacomodara TODAS las columnas,
     y Pedro lo percibía como "se desaparece todo". */
  const ordenColsRef = useRef<string[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  )

  const activas = useMemo(() => tareas.filter((t) => !t.completada), [tareas])
  /* Filtro por persona (solo CEO lo usa; un miembro ya ve solo lo suyo). */
  const activasVis = useMemo(
    () => (filtroUser === 'todos' ? activas : activas.filter((t) => t.teamMemberId === filtroUser)),
    [activas, filtroUser],
  )
  const completadasVis = useMemo(
    () => (filtroUser === 'todos' ? completadas : completadas.filter((t) => t.teamMemberId === filtroUser)),
    [completadas, filtroUser],
  )
  const enFocus = useMemo(() => activasVis.filter((t) => t.focusLane), [activasVis])
  const enBoard = useMemo(() => activasVis.filter((t) => !t.focusLane), [activasVis])

  /* Columnas por categoría (orden: más tareas primero). */
  const columnas = useMemo(() => {
    const m = new Map<string, { categoria: string; color: string; items: Tarea[] }>()
    for (const t of enBoard) {
      const g = m.get(t.categoria) ?? { categoria: t.categoria, color: t.color, items: [] }
      g.items.push(t)
      m.set(t.categoria, g)
    }
    const cols = [...m.values()]
    /* Orden estable: respeta el orden previo (memorizado); las categorías que
       aún no estaban se ubican por cantidad (más grande primero) al final. */
    const orden = ordenColsRef.current
    cols.sort((a, b) => {
      const ia = orden.indexOf(a.categoria)
      const ib = orden.indexOf(b.categoria)
      if (ia === -1 && ib === -1) return b.items.length - a.items.length
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
    ordenColsRef.current = cols.map((c) => c.categoria)
    return cols
  }, [enBoard])

  const todasCategorias = useMemo(() => [...new Set(activasVis.map((t) => t.categoria))], [activasVis])

  /* Lanza la animación de la card volando hacia el ícono de Archivo. */
  const triggerFly = useCallback((from: DOMRect, tarea: Tarea) => {
    const btn = archivoBtnRef.current
    if (!btn) return
    const to = btn.getBoundingClientRect()
    const key = `${tarea.id}-${from.top}-${from.left}`
    setFlyers((f) => [...f, {
      key, texto: tarea.texto, color: tarea.color,
      from: { x: from.left, y: from.top, w: from.width },
      to: { x: to.left + to.width / 2, y: to.top + to.height / 2 },
    }])
    setArchivoPulse(true)
    setTimeout(() => setFlyers((f) => f.filter((x) => x.key !== key)), 700)
    setTimeout(() => setArchivoPulse(false), 700)
  }, [])

  /* ───────── acciones (optimistas) ───────── */

  const onCrear = useCallback((tarea: Tarea) => {
    setTareas((cur) => [tarea, ...cur])
  }, [])

  const hacerCompletar = useCallback(async (id: string, fromRect?: DOMRect, fechaHecha?: string) => {
    const tarea = tareas.find((t) => t.id === id)
    if (fromRect && tarea) triggerFly(fromRect, tarea)
    setTareas((cur) => cur.filter((t) => t.id !== id))
    const completadaAt = fechaHecha ? `${fechaHecha}T12:00:00-05:00` : new Date().toISOString()
    if (tarea) setCompletadas((cur) => [{ ...tarea, completada: true, completadaAt }, ...cur])
    const r = await completarTarea(id, true, fechaHecha)
    if (!r.ok) {
      toast.error(r.error ?? 'No se pudo completar')
      /* Revertir SOLO esta tarea. NUNCA window.location.reload(): una recarga
         abortaba las OTRAS completaciones en curso y esas tareas "reaparecían"
         aunque se marcaron. Pedro 12-ago-2026 (Lorena). */
      setCompletadas((cur) => cur.filter((t) => t.id !== id))
      if (tarea) setTareas((cur) => (cur.some((t) => t.id === id) ? cur : [tarea, ...cur]))
    }
  }, [tareas, triggerFly])

  /* Puerta: para Erick abrimos el "¿qué día la hiciste?"; los demás completan
     como hoy (comportamiento de siempre). Pedro 26-ago-2026. */
  const onCompletar = useCallback((id: string, fromRect?: DOMRect) => {
    if (esErick) {
      const tarea = tareas.find((t) => t.id === id)
      setPreguntaFecha({ id, titulo: tarea?.texto ?? 'esta tarea', fromRect })
      return
    }
    void hacerCompletar(id, fromRect)
  }, [esErick, tareas, hacerCompletar])

  /* Restaurar (des-completar) una tarea desde el archivo → vuelve al tablero. */
  const onRestaurar = useCallback(async (id: string) => {
    const tarea = completadas.find((t) => t.id === id)
    setCompletadas((cur) => cur.filter((t) => t.id !== id))
    if (tarea) setTareas((cur) => [{ ...tarea, completada: false, completadaAt: null, focusLane: null }, ...cur])
    const r = await completarTarea(id, false)
    if (!r.ok) {
      toast.error(r.error ?? 'No se pudo restaurar')
      // Revertir solo esta tarea (sin recargar la página).
      setTareas((cur) => cur.filter((t) => t.id !== id))
      if (tarea) setCompletadas((cur) => (cur.some((t) => t.id === id) ? cur : [tarea, ...cur]))
    }
  }, [completadas])

  const onEliminar = useCallback(async (id: string) => {
    const prev = tareas
    setTareas((cur) => cur.filter((t) => t.id !== id))
    const r = await eliminarTarea(id)
    if (!r.ok) { toast.error(r.error ?? 'No se pudo eliminar'); setTareas(prev) }
  }, [tareas])

  const onMover = useCallback(async (id: string, categoria: string) => {
    /* Optimista: además de la categoría, adopta el COLOR de la columna destino
       (Pedro: "no se pone el color a donde le arrastro"). Si la categoría es
       nueva (sin tareas previas), conserva el color hasta que el server asigne
       uno al recargar. */
    const prev = tareas
    setTareas((cur) => {
      const destColor = cur.find((t) => t.categoria === categoria && t.id !== id)?.color
      return cur.map((t) => t.id === id ? { ...t, categoria, ...(destColor ? { color: destColor } : {}) } : t)
    })
    const r = await moverTareaCategoria(id, categoria)
    // Revertir solo si falló (sin recargar la página).
    if (!r.ok) { toast.error(r.error ?? 'No se pudo mover'); setTareas(prev) }
  }, [tareas])

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
            {esCEO ? 'Ves todo el equipo · ' : ''}{activasVis.length} activa{activasVis.length === 1 ? '' : 's'}
            {' · escribe @Nombre para asignar'}
          </p>
        </div>

        {/* Filtro por persona — solo para el CEO (un miembro ya ve solo lo suyo). */}
        {esCEO && equipo.length > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 999, padding: '4px 10px', flexShrink: 0 }}>
            <Filter size={13} color="#6b7280" />
            <select
              value={filtroUser}
              onChange={(e) => setFiltroUser(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
            >
              <option value="todos">Todo el equipo</option>
              {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre.split(' ')[0]}</option>)}
            </select>
          </div>
        )}

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

        {/* Archivo / historial de tareas terminadas — las cards "vuelan" aquí. */}
        <button
          ref={archivoBtnRef}
          onClick={() => setArchivoOpen(true)}
          title="Historial de tareas terminadas"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
            padding: '6px 12px', borderRadius: 999, border: '1px solid #e5e7eb', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 700, background: '#fff', color: '#6d28d9',
            transform: archivoPulse ? 'scale(1.14)' : 'scale(1)',
            boxShadow: archivoPulse ? '0 0 0 6px rgba(109,40,217,0.18)' : 'none',
            transition: 'transform 220ms cubic-bezier(.34,1.56,.64,1), box-shadow 220ms ease',
          }}
        >
          <Archive size={15} strokeWidth={2.2} />
          {completadasVis.length > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{completadasVis.length}</span>}
        </button>
      </header>

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {/* Zona Focus (en el mismo tablero) */}
        {(focusModeActive || enFocus.length > 0) && (
          <FocusZona
            enFocus={enFocus}
            focusModeActive={focusModeActive}
            onComplete={onCompletar}
            onRemove={(id) => onSetFocus(id, null)}
          />
        )}

        {/* Tablero de columnas — WRAP: las columnas bajan a la siguiente fila
            cuando se llena el ancho (sin scroll horizontal). Scroll vertical. */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: isMobile ? '8px 12px 140px' : '8px 20px 140px' }}>
          {columnas.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              {enFocus.length > 0 ? 'Todo lo demás está en Focus 🎯' : 'No hay tareas todavía. Escribe una abajo 👇'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
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
      <Composer onCrear={onCrear} equipo={equipo} isMobile={isMobile} esCEO={esCEO} meId={meId} />

      {/* Cards volando hacia el ícono de Archivo al completarse. */}
      {flyers.map((f) => <FlyerEl key={f.key} flyer={f} />)}

      {/* Drawer de Archivo / historial de tareas terminadas. */}
      {archivoOpen && (
        <ArchivoDrawer
          completadas={completadasVis}
          esCEO={esCEO}
          onClose={() => setArchivoOpen(false)}
          onRestaurar={onRestaurar}
        />
      )}

      {/* SOLO ERICK: "¿Qué día hiciste esta tarea?" — así su reporte semanal la
          pone en el día correcto (a veces marca hoy algo que hizo el lunes). */}
      {preguntaFecha && (
        <DiaHechoModal
          titulo={preguntaFecha.titulo}
          onElegir={(iso) => {
            const p = preguntaFecha
            setPreguntaFecha(null)
            void hacerCompletar(p.id, p.fromRect, iso)
          }}
          onCancelar={() => setPreguntaFecha(null)}
        />
      )}
    </main>
  )
}

/* ============================ Modal "¿Qué día la hiciste?" (Erick) ============================ */
function DiaHechoModal({ titulo, onElegir, onCancelar }: {
  titulo: string
  onElegir: (iso: string) => void
  onCancelar: () => void
}) {
  const dias = useMemo(() => opcionesDiaHecho(), [])
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }} onClick={onCancelar}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-start gap-2.5 p-4 border-b">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0" style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
            <Check className="w-5 h-5 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold leading-tight">¿Qué día la hiciste?</div>
            <div className="text-[12px] text-muted-foreground truncate">{titulo}</div>
          </div>
          <button onClick={onCancelar} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted shrink-0"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          {dias.map((d) => (
            <button key={d.iso} type="button" onClick={() => onElegir(d.iso)}
              className="h-11 rounded-xl border font-semibold text-[13.5px] capitalize transition-colors hover:text-white"
              style={{ borderColor: 'rgba(113,112,255,0.35)', color: '#5b21b6' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg,#7170ff,#ba41f7)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '' }}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="px-4 pb-4 pt-1">
          <p className="text-[11.5px] text-muted-foreground text-center">Toca el día real en que la terminaste.</p>
        </div>
      </div>
    </div>
  )
}

/* ============================ Flyer (animación al archivo) ============================ */
function FlyerEl({ flyer }: { flyer: Flyer }) {
  const [moved, setMoved] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setMoved(true)))
    return () => cancelAnimationFrame(r)
  }, [])
  const dx = flyer.to.x - (flyer.from.x + flyer.from.w / 2)
  const dy = flyer.to.y - (flyer.from.y + 16)
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', left: flyer.from.x, top: flyer.from.y, width: flyer.from.w,
        background: flyer.color, color: '#fff', borderRadius: 8, padding: '6px 8px',
        fontSize: 11.5, lineHeight: 1.3, zIndex: 2000, pointerEvents: 'none',
        boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        transform: moved ? `translate(${dx}px, ${dy}px) scale(0.06)` : 'translate(0,0) scale(1)',
        opacity: moved ? 0 : 1,
        transition: 'transform 600ms cubic-bezier(.5,0,.75,0), opacity 560ms ease-in 60ms',
      }}
    >
      {flyer.texto}
    </div>
  )
}

/* ============================ Archivo (historial) ============================ */
function ArchivoDrawer({ completadas, esCEO, onClose, onRestaurar }: {
  completadas: Tarea[]
  esCEO: boolean
  onClose: () => void
  onRestaurar: (id: string) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'flex-end' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(420px, 92vw)', height: '100%', background: '#fff', boxShadow: '-8px 0 30px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', animation: 'mk-drawer-in 220ms cubic-bezier(.22,1,.36,1)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 18px', borderBottom: '1px solid #eef0f2' }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(109,40,217,0.1)', color: '#6d28d9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Archive size={15} strokeWidth={2.2} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Archivo</div>
            <div style={{ fontSize: 11.5, color: '#6b7280' }}>{completadas.length} tarea{completadas.length === 1 ? '' : 's'} terminada{completadas.length === 1 ? '' : 's'}</div>
          </div>
          <button onClick={onClose} title="Cerrar" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#f3f4f6', color: '#6b7280', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {completadas.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Aún no hay tareas terminadas. Cuando completes una, aparecerá aquí.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {completadas.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: '#f9fafb', border: '1px solid #eef0f2', borderRadius: 10, padding: '9px 11px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.35, textDecoration: 'line-through', textDecorationColor: '#c4b5fd' }}>{t.texto}</div>
                    <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#6b7280' }}>{t.categoria}</span>
                      {esCEO && t.teamMemberNombre && <span>· {t.teamMemberNombre.split(' ')[0]}</span>}
                      {t.completadaAt && <span>· {fechaRelativa(t.completadaAt)}</span>}
                    </div>
                  </div>
                  <button onClick={() => onRestaurar(t.id)} title="Devolver al tablero" style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: '#fff', color: '#6d28d9', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                    <RotateCcw size={13} strokeWidth={2.2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes mk-drawer-in{from{transform:translateX(24px);opacity:.4}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}

/* "hoy 14:30" / "ayer" / "12 jun" a partir de un ISO. */
function fechaRelativa(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const lima = new Date(d.getTime() - 5 * 60 * 60_000)
  const hoy = new Date(Date.now() - 5 * 60 * 60_000)
  const ymd = (x: Date) => x.toISOString().slice(0, 10)
  const hhmm = lima.toISOString().slice(11, 16)
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  if (ymd(lima) === ymd(hoy)) return `hoy ${hhmm}`
  const ayer = new Date(hoy.getTime() - 86_400_000)
  if (ymd(lima) === ymd(ayer)) return `ayer ${hhmm}`
  return `${lima.getUTCDate()} ${meses[lima.getUTCMonth()]}`
}

/* ============================ Columna ============================ */
function Columna({ columna, esCEO, todasCategorias, onComplete, onDelete, onMover }: {
  columna: { categoria: string; color: string; items: Tarea[] }
  esCEO: boolean
  todasCategorias: string[]
  onComplete: (id: string, fromRect?: DOMRect) => void
  onDelete: (id: string) => void
  onMover: (id: string, cat: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${columna.categoria}` })
  return (
    <section ref={setNodeRef} style={{
      flex: '0 0 184px', width: 184,
      borderRadius: 10, padding: 5,
      background: isOver ? `${columna.color}14` : 'transparent',
      transition: 'background 120ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px 6px', borderLeft: `3px solid ${columna.color}`, paddingLeft: 7, marginBottom: 3 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: columna.color, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{columna.categoria}</span>
        <span style={{ fontSize: 10.5, color: '#9ca3af', fontWeight: 600 }}>{columna.items.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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
  onComplete: (id: string, fromRect?: DOMRect) => void; onDelete: (id: string) => void; onMover: (id: string, cat: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: tarea.id })
  const [menu, setMenu] = useState(false)
  const [nueva, setNueva] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.4 : 1, position: 'relative' }}>
      <div ref={cardRef} style={{ background: tarea.color, borderRadius: 8, padding: '6px 8px', color: '#fff' }}>
        {/* zona arrastrable = el texto */}
        <p {...attributes} {...listeners} style={{ margin: 0, fontSize: 11.5, lineHeight: 1.3, cursor: 'grab', touchAction: 'none', wordBreak: 'break-word' }}>
          {tarea.texto}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
          {esCEO && tarea.teamMemberNombre && (
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, background: 'rgba(255,255,255,0.22)', padding: '1px 5px', borderRadius: 4 }}>
              {tarea.teamMemberNombre.split(' ')[0]}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => setMenu((v) => !v)} title="Mover de columna" style={iconBtn}>
            <ArrowRight size={12} strokeWidth={2.4} />
          </button>
          <button onClick={() => onComplete(tarea.id, cardRef.current?.getBoundingClientRect())} title="Completar" style={iconBtn}>
            <Check size={12} strokeWidth={2.6} />
          </button>
          {/* Eliminar directo (Pedro/Lorena 25-jul-2026: "a veces me confundo y ya
              no las puedo sacar"). Botón visible con confirmación, además del que
              vive en el menú de mover. */}
          <button
            onClick={() => { if (confirm(`¿Eliminar esta tarea?\n\n"${tarea.texto.slice(0, 60)}${tarea.texto.length > 60 ? '…' : ''}"`)) onDelete(tarea.id) }}
            title="Eliminar tarea"
            style={iconBtn}
          >
            <Trash2 size={12} strokeWidth={2.2} />
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
          <button onClick={() => { if (confirm(`¿Eliminar esta tarea?\n\n"${tarea.texto.slice(0, 60)}${tarea.texto.length > 60 ? '…' : ''}"`)) { onDelete(tarea.id); setMenu(false) } }} style={{ ...menuItem, color: '#dc2626', marginTop: 2 }}>🗑️ Eliminar</button>
        </div>
      )}
    </div>
  )
}

function CardVisual({ tarea, overlay }: { tarea: Tarea; overlay?: boolean }) {
  return (
    <div style={{ background: tarea.color, borderRadius: 8, padding: '6px 8px', color: '#fff', width: 172, boxShadow: overlay ? '0 10px 28px rgba(0,0,0,0.28)' : 'none', cursor: 'grabbing' }}>
      <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.3, wordBreak: 'break-word' }}>{tarea.texto}</p>
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
/* Primer nombre en minúsculas (para matchear @menciones en el cliente). */
function primerNombreCli(n: string | null | undefined): string {
  return (n ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? ''
}

function Composer({ onCrear, equipo, isMobile, esCEO, meId }: {
  onCrear: (t: Tarea) => void; equipo: { id: string; nombre: string }[]; isMobile: boolean; esCEO: boolean; meId: string | null
}) {
  const [text, setText] = useState('')
  /* Asignación por @mención (Pedro 31-ago-2026: "quita esa pregunta, solo con @").
     Antes había un selector OBLIGATORIO "¿Para quién?" que Lorena tenía que
     re-elegir en CADA tarea (se reseteaba a vacío) → mucha fricción. Ahora: sin
     @ la tarea es TUYA; con "@Nombre" se asigna, y al escribir "@" aparece un
     autocompletado del equipo para no tener que tipear el nombre exacto. */
  const [mencion, setMencion] = useState<{ start: number; query: string } | null>(null)
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

  /* A quién se asignaría según el PRIMER @token que matchee un miembro (para el
     texto de confirmación). Sin @ → es para el creador. */
  const asignado = useMemo(() => {
    const m = text.match(/@([\p{L}][\p{L}.]*)/u)
    if (!m) return null
    const q = m[1].toLowerCase().replace(/\.+$/, '')
    const t = equipo.find((p) => {
      const nom = p.nombre.toLowerCase().trim()
      return primerNombreCli(p.nombre) === q || nom.replace(/\s+/g, '') === q || nom.split(/\s+/).includes(q)
    })
    return t ? t.nombre.split(' ')[0] : null
  }, [text, equipo])

  /* Sugerencias del autocompletado mientras se escribe "@…". */
  const sugerencias = useMemo(() => {
    if (!mencion || equipo.length === 0) return []
    const q = mencion.query.toLowerCase()
    return equipo.filter((m) => primerNombreCli(m.nombre).startsWith(q)).slice(0, 6)
  }, [mencion, equipo])

  /* Detecta el @token activo (el que está justo antes del cursor) para abrir/
     cerrar el autocompletado. Requiere que el @ vaya al inicio o tras un espacio
     (así "correo@x" no lo dispara). */
  function onChangeText(value: string, caret: number) {
    setText(value)
    const before = value.slice(0, caret)
    const m = before.match(/(?:^|\s)@([\p{L}.]*)$/u)
    if (m && equipo.length > 0) setMencion({ start: caret - (m[1]?.length ?? 0) - 1, query: m[1] ?? '' })
    else setMencion(null)
  }

  /* Inserta "@Nombre " reemplazando el @token que se estaba escribiendo. */
  function elegirMencion(miembro: { id: string; nombre: string }) {
    if (!mencion) return
    const first = miembro.nombre.split(' ')[0]
    const tokenEnd = mencion.start + 1 + mencion.query.length
    const nuevo = text.slice(0, mencion.start) + '@' + first + ' ' + text.slice(tokenEnd)
    const pos = mencion.start + first.length + 2
    setText(nuevo); setMencion(null)
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(pos, pos) })
  }

  async function enviar() {
    const t = text.trim()
    if (!t || sending) return
    setSending(true); setText(''); setMencion(null)
    // El server asigna por @mención dentro del texto; sin @, la tarea es del creador.
    const r = await crearTarea(t)
    setSending(false)
    if (r.ok) {
      const paraOtro = !!meId && r.tarea.teamMemberId !== meId
      if (paraOtro) {
        const nombre = equipo.find((m) => m.id === r.tarea.teamMemberId)?.nombre.split(' ')[0] ?? 'la persona'
        toast.success(`Tarea asignada a ${nombre} ✓`)
        /* Es de OTRA persona: solo el dueño (que ve todo el tablero) la agrega a
           su vista; los demás no (si no, aparecería y desaparecería). */
        if (esCEO) onCrear(r.tarea)
      } else {
        onCrear(r.tarea)
      }
    } else { toast.error(r.error); setText(t) }
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
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 4px 16px -4px rgba(16,24,40,0.10)', padding: '8px 8px 8px 14px', maxWidth: 720, margin: '0 auto' }}>
        {/* Autocompletado de @menciones (aparece arriba del input). */}
        {mencion && sugerencias.length > 0 && (
          <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 32px -6px rgba(16,24,40,0.22)', overflow: 'hidden', zIndex: 40 }}>
            <div style={{ padding: '7px 12px', fontSize: 10.5, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid #f1f5f9' }}>Asignar a…</div>
            {sugerencias.map((m) => (
              <button key={m.id} type="button" onMouseDown={(e) => { e.preventDefault(); elegirMencion(m) }}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#111827' }}>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#ede9fe', color: '#6d28d9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{(m.nombre.trim().charAt(0) || '?').toUpperCase()}</span>
                <span>@{m.nombre.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}
        <span style={{ opacity: 0.6 }} aria-hidden>✨</span>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => onChangeText(e.target.value, e.target.selectionStart ?? e.target.value.length)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setMencion(null); return }
            if (e.key === 'Enter') {
              e.preventDefault()
              if (mencion && sugerencias.length > 0) { elegirMencion(sugerencias[0]); return }
              enviar()
            }
          }}
          placeholder={equipo.length > 0 ? 'Escribe la tarea…  (@ para asignar)' : 'Escribe la tarea…'}
          disabled={sending}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#111827', background: 'transparent', minWidth: 0 }}
        />
        {micSoportado && (
          <button onClick={toggleMic} title={escuchando ? 'Detener' : 'Dictar'} className={escuchando ? 'mk-mic-on' : undefined}
            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: escuchando ? '#ef4444' : '#f3f4f6', color: escuchando ? '#fff' : '#6b7280' }}>
            <Mic size={17} strokeWidth={2} />
          </button>
        )}
        {(() => {
          const listo = !!text.trim() && !sending
          return (
            <button onClick={enviar} disabled={!listo} title="Agregar"
              style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: listo ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: listo ? '#16a34a' : '#e5e7eb', color: '#fff' }}>
              {sending ? '…' : <Plus size={18} strokeWidth={2.6} />}
            </button>
          )
        })()}
      </div>
      {/* A quién va la tarea (según el @). Sin @ = para ti. */}
      {equipo.length > 0 && !!text.trim() && (
        <div style={{ maxWidth: 720, margin: '6px auto 0', fontSize: 11, textAlign: 'center', color: asignado ? '#6d28d9' : '#64748b', fontWeight: 700 }}>
          {asignado
            ? `📨 Se la asignas a ${asignado}: le aparece en SU tablero y le llega un aviso.`
            : '👤 Es para ti. Escribe "@" y elige a alguien del equipo para asignársela (ej. @Ailyn).'}
        </div>
      )}
      <style>{`@keyframes mk-mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}.mk-mic-on{animation:mk-mic-pulse 1.2s ease-in-out infinite}`}</style>
    </div>
  )
}

const iconBtn: React.CSSProperties = { width: 20, height: 20, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.22)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const iconBtnDark: React.CSSProperties = { width: 20, height: 20, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const menuItem: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: 12.5, color: '#111827', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }
