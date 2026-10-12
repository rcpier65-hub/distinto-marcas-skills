'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { GripHorizontal, Pause, Play, Bell, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { toast } from 'sonner'
import { listarTareasFlotantes, type TareaFlotante } from '@/app/tareas/_floating-actions'
import { completarTarea } from '@/app/tareas/_actions'
import { iniciarTarea, pausarTarea } from '@/app/tareas/_plan-actions'
import { listarRecordatorios, marcarRecordatorio, type Recordatorio } from '@/app/recordatorios/_actions'

export function PendientesFlotantes({ usuario }: { usuario: string }) {
  const [tareas, setTareas] = useState<TareaFlotante[]>([])
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([])
  const [pos, setPos] = useState({ x: 16, y: 140 })
  const [cerrado, setCerrado] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const recargar = useCallback(async () => {
    if (document.hidden) return
    const results = await Promise.allSettled([listarTareasFlotantes(), listarRecordatorios()])
    if (results[0].status === 'fulfilled') { setTareas(results[0].value); setAhora(Date.now()) }
    if (results[1].status === 'fulfilled') setRecordatorios(results[1].value.filter(i => !i.listo))
  }, [])
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
    setPos({ x: Math.max(8, window.innerWidth - 300), y: 100 })
    try { setCerrado(localStorage.getItem(`distinto-flotante-cerrado:${usuario}`) === '1' || (window.innerWidth < 640 && localStorage.getItem(`distinto-flotante-cerrado:${usuario}`) === null)) } catch {}
    try { const p = JSON.parse(localStorage.getItem(`distinto-flotante:${usuario}`) ?? 'null'); if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) setPos({ x: Math.max(8, Math.min(p.x, window.innerWidth - 300)), y: Math.max(70, Math.min(p.y, window.innerHeight - 160)) }) } catch {}
    void recargar()
    })
    const t = setInterval(() => void recargar(), 15000)
    window.addEventListener('distinto-timer', recargar)
    window.addEventListener('distinto-recordatorios', recargar)
    window.addEventListener('focus', recargar)
    const ajustar = () => setPos(p => ({ x: Math.max(8, Math.min(p.x, window.innerWidth - 288)), y: Math.max(60, Math.min(p.y, window.innerHeight - 160)) }))
    window.addEventListener('resize', ajustar)
    const vis = () => { if (!document.hidden) void recargar() }
    document.addEventListener('visibilitychange', vis)
    return () => { cancelAnimationFrame(frame); clearInterval(t); window.removeEventListener('distinto-timer', recargar); window.removeEventListener('distinto-recordatorios', recargar); window.removeEventListener('focus', recargar); window.removeEventListener('resize', ajustar); document.removeEventListener('visibilitychange', vis) }
  }, [recargar, usuario])
  const corriendo = tareas.some(t => t.en_proceso_desde)
  useEffect(() => { if (!corriendo) return; const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t) }, [corriendo])
  async function controlar(t: TareaFlotante) {
    if (busy) return
    setBusy(t.id)
    try { const r = await (t.en_proceso_desde ? pausarTarea(t.id) : iniciarTarea(t.id)); if (!r.ok) toast.error(r.error); await recargar(); window.dispatchEvent(new Event('distinto-timer')) } catch { toast.error('No se pudo actualizar el cronómetro.') } finally { setBusy(null) }
  }
  async function terminar(t: TareaFlotante) {
    if (busy) return
    setBusy(t.id)
    try {
      const r = await completarTarea(t.id)
      if (!r.ok) { toast.error(r.error ?? 'No se pudo completar la tarea.'); return }
      setTareas(prev => prev.filter(item => item.id !== t.id))
      window.dispatchEvent(new CustomEvent('distinto-tarea-completada', { detail: { id: t.id } }))
      window.dispatchEvent(new Event('distinto-timer'))
      toast.success('Tarea lista. Se guardó en tu reporte.')
      await recargar()
    } catch { toast.error('No se pudo completar la tarea.') } finally { setBusy(null) }
  }
  if (!tareas.length && !recordatorios.length) return null
  return <aside aria-label="Tareas y recordatorios anclados" className="fixed z-40 flex flex-col overflow-hidden w-[280px] max-w-[calc(100vw-16px)] rounded-2xl border bg-card shadow-xl" style={{ left: pos.x, top: pos.y, maxHeight: `calc(100dvh - ${pos.y + 88}px)` }}>
    <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
      <button type="button" aria-label="Mover panel; también puedes usar las flechas del teclado" className="cursor-grab touch-none p-1" onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; e.currentTarget.setPointerCapture(e.pointerId) }} onPointerMove={e => { const d = drag.current; if (!d) return; setPos({ x: Math.max(8, Math.min(window.innerWidth - 288, d.px + e.clientX - d.x)), y: Math.max(60, Math.min(window.innerHeight - 120, d.py + e.clientY - d.y)) }) }} onPointerUp={() => { drag.current = null; localStorage.setItem(`distinto-flotante:${usuario}`, JSON.stringify(pos)) }} onPointerCancel={() => { drag.current = null }} onKeyDown={e => { const delta = { ArrowLeft: [-20,0], ArrowRight: [20,0], ArrowUp: [0,-20], ArrowDown: [0,20] }[e.key]; if (!delta) return; e.preventDefault(); setPos(p => { const v = { x: Math.max(8, Math.min(window.innerWidth - 288, p.x + delta[0])), y: Math.max(60, Math.min(window.innerHeight - 120, p.y + delta[1])) }; localStorage.setItem(`distinto-flotante:${usuario}`, JSON.stringify(v)); return v }) }}><GripHorizontal size={16} /></button>
      <span className="flex-1 text-xs font-semibold">Mis pendientes · {tareas.length + recordatorios.length}</span>
      <button aria-label={cerrado ? 'Expandir pendientes' : 'Contraer pendientes'} onClick={() => { setCerrado(!cerrado); try { localStorage.setItem(`distinto-flotante-cerrado:${usuario}`, cerrado ? '0' : '1') } catch {} }}>{cerrado ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
    </div>
    {!cerrado && <div className="min-h-0 max-h-[45vh] overflow-y-auto p-3 space-y-3">
      {tareas.map(t => {
        const seg = (t.tiempo_seg ?? 0) + (t.en_proceso_desde ? Math.max(0, Math.floor((ahora - new Date(t.en_proceso_desde).getTime()) / 1000)) : 0)
        const tiempo = `${Math.floor(seg/3600)}:${String(Math.floor(seg/60)%60).padStart(2,'0')}:${String(seg%60).padStart(2,'0')}`
        const empezar = t.estado === 'sin_empezar'
        return <div key={t.id} className="rounded-xl border p-2 space-y-2">
          <Link href="/tareas" className="block text-xs break-words font-medium">{t.texto}</Link>
          <span className="block text-[10px] text-muted-foreground">{t.categoria}</span>
          <span className="block text-xs font-mono text-purple-600">{tiempo} · {t.en_proceso_desde ? 'En curso' : empezar ? 'Pendiente' : 'En pausa'}</span>
          <div className="flex gap-2">
            <button disabled={!!busy} onClick={() => void controlar(t)} aria-label={`${t.en_proceso_desde ? 'Pausar' : empezar ? 'Iniciar' : 'Reanudar'} ${t.texto}`} className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs disabled:opacity-50">
              {t.en_proceso_desde ? <Pause size={13} /> : <Play size={13} />}{t.en_proceso_desde ? 'Pausar' : empezar ? 'Iniciar' : 'Reanudar'}
            </button>
            <button disabled={!!busy} onClick={() => void terminar(t)} aria-label={`Marcar lista: ${t.texto}`} className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-800 disabled:opacity-50"><Check size={13} />Listo</button>
          </div>
        </div>
      })}
      <Link href="/tareas" className="block text-xs text-purple-700 underline">Ver todas mis tareas</Link>
      {recordatorios.slice(0,3).map(r => <div key={r.id} className="rounded-xl bg-amber-50 p-2 text-amber-950"><div className="flex gap-2"><Bell size={14} className="shrink-0 mt-0.5" /><span className="text-xs whitespace-pre-wrap break-words">{r.texto}</span></div><button disabled={!!busy} onClick={async () => { setBusy(r.id); try { const v = await marcarRecordatorio(r.id, true); if (!v.ok) toast.error(v.error); await recargar() } catch { toast.error('No se pudo marcar listo.') } finally { setBusy(null) } }} className="mt-1 text-xs font-semibold underline">✓ Listo</button></div>)}
      <Link href="/recordatorios" className="block text-xs text-purple-700 underline">Ver / añadir recordatorios{recordatorios.length > 3 ? ` (${recordatorios.length})` : ''}</Link>
    </div>}
  </aside>
}
