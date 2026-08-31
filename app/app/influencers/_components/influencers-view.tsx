'use client'

/* Kanban de influencers (TypHouse): Pedido enviado → Pedido entregado →
   Video enviado. Cards con @usuario de IG (link al perfil), notas, enlace del
   video (editable inline) y flechas ◀ ▶ para mover de columna (también
   arrastrable con el mouse en desktop). Carpeta de Drive arriba. */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FolderOpen, Plus, Trash2, AtSign, Link2, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { crearInfluencer, moverInfluencer, editarInfluencer, eliminarInfluencer } from '../_actions'
import type { EstadoInfluencer } from '@/lib/influencers/db'

export type InfluencerItem = {
  id: string
  usuarioIg: string
  nombre: string | null
  estado: EstadoInfluencer
  videoUrl: string | null
  notas: string | null
  creadoEl: string
}

const COLUMNAS: Array<{ id: EstadoInfluencer; label: string; color: string; bg: string }> = [
  { id: 'pedido_enviado', label: '📦 Pedido enviado', color: '#b45309', bg: '#fef3c7' },
  { id: 'pedido_entregado', label: '📬 Pedido entregado', color: '#1d4ed8', bg: '#dbeafe' },
  { id: 'video_enviado', label: '🎬 Video enviado', color: '#15803d', bg: '#dcfce7' },
]

export function InfluencersView({ marcaSlug, marcaNombre, driveUrl, iniciales }: {
  marcaSlug: string; marcaNombre: string; driveUrl: string | null; iniciales: InfluencerItem[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<InfluencerItem[]>(iniciales)
  const [nuevoIg, setNuevoIg] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [creando, setCreando] = useState(false)
  const [videoEdit, setVideoEdit] = useState<string | null>(null)
  const [videoVal, setVideoVal] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<EstadoInfluencer | null>(null)

  async function agregar() {
    const u = nuevoIg.trim()
    if (!u) { toast.error('Escribe el usuario de Instagram'); return }
    setCreando(true)
    const r = await crearInfluencer({ marcaSlug, usuarioIg: u, nombre: nuevoNombre.trim() })
    setCreando(false)
    if (!r.ok) { toast.error(r.error); return }
    setItems((cur) => [{
      id: r.id, usuarioIg: u.replace(/^@+/, ''), nombre: nuevoNombre.trim() || null,
      estado: 'pedido_enviado', videoUrl: null, notas: null, creadoEl: new Date().toISOString(),
    }, ...cur])
    setNuevoIg(''); setNuevoNombre('')
    toast.success('✅ Influencer agregado — cae en "Pedido enviado"')
  }

  async function mover(id: string, estado: EstadoInfluencer) {
    const prev = items
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, estado } : i)))
    const r = await moverInfluencer(id, estado)
    if (!r.ok) { setItems(prev); toast.error(r.error) }
  }

  function moverDelta(it: InfluencerItem, delta: 1 | -1) {
    const idx = COLUMNAS.findIndex((c) => c.id === it.estado)
    const destino = COLUMNAS[idx + delta]
    if (destino) void mover(it.id, destino.id)
  }

  async function guardarVideo(id: string) {
    const v = videoVal.trim()
    const r = await editarInfluencer(id, { videoUrl: v })
    if (!r.ok) { toast.error(r.error); return }
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, videoUrl: v || null } : i)))
    setVideoEdit(null); setVideoVal('')
    toast.success(v ? '🎬 Enlace del video guardado' : 'Enlace quitado')
  }

  function eliminar(id: string) {
    if (!confirm('¿Eliminar este influencer del tablero?')) return
    const prev = items
    setItems((cur) => cur.filter((i) => i.id !== id))
    eliminarInfluencer(id).then((r) => { if (!r.ok) { setItems(prev); toast.error(r.error) } })
  }

  return (
    <main className="p-6 md:p-8" style={{ minHeight: '100vh', background: '#fafafa' }}>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* HEADER */}
        <header className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#111827' }}>Influencers · {marcaNombre}</h1>
            <p className="text-[13.5px]" style={{ color: '#6b7280' }}>{items.length} colaboraciones · pedidos y videos de influencers</p>
          </div>
          <div className="flex-1" />
          {driveUrl && (
            <a href={driveUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] text-[13.5px] font-medium"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#374151', textDecoration: 'none' }}>
              <FolderOpen className="w-4 h-4" style={{ color: '#f59e0b' }} /> Carpeta de videos (Drive)
            </a>
          )}
        </header>

        {/* NUEVO */}
        <div className="rounded-2xl p-4 flex items-end gap-2 flex-wrap" style={{ background: '#fff', border: '1px solid #f1f1f3', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <label className="flex flex-col gap-1 text-[11px] flex-1 min-w-[180px]" style={{ color: '#6b7280' }}>Usuario de Instagram
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold" style={{ color: '#9ca3af' }}>@</span>
              <input value={nuevoIg} onChange={(e) => setNuevoIg(e.target.value)} placeholder="usuario"
                onKeyDown={(e) => { if (e.key === 'Enter') agregar() }}
                className="flex-1 min-w-0 h-10 px-3 rounded-[10px] text-sm" style={{ border: '1px solid #e5e7eb', background: '#fff' }} />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-[11px] flex-1 min-w-[180px]" style={{ color: '#6b7280' }}>Nombre (opcional)
            <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej: Valeria — lifestyle"
              onKeyDown={(e) => { if (e.key === 'Enter') agregar() }}
              className="h-10 px-3 rounded-[10px] text-sm" style={{ border: '1px solid #e5e7eb', background: '#fff' }} />
          </label>
          <button onClick={agregar} disabled={creando}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-[13.5px] font-medium text-white disabled:opacity-60"
            style={{ background: '#7170ff', border: '1px solid #7170ff' }}>
            <Plus className="w-4 h-4" /> {creando ? 'Agregando…' : 'Agregar'}
          </button>
        </div>

        {/* KANBAN */}
        <div className="grid gap-4 md:grid-cols-3 items-start">
          {COLUMNAS.map((col, colIdx) => {
            const deCol = items.filter((i) => i.estado === col.id)
            return (
              <div key={col.id}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.id) }}
                onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                onDrop={(e) => { e.preventDefault(); setOverCol(null); if (dragId) { void mover(dragId, col.id); setDragId(null) } }}
                className="rounded-2xl p-3 space-y-2 transition-colors"
                style={{ background: overCol === col.id ? `${col.bg}` : '#f4f4f6', border: overCol === col.id ? `1.5px dashed ${col.color}` : '1.5px solid transparent', minHeight: 180 }}>
                {/* Encabezado de columna */}
                <div className="flex items-center gap-2 px-1 pb-1">
                  <span className="text-[12px] font-bold" style={{ color: col.color }}>{col.label}</span>
                  <span className="text-[11px] font-bold px-1.5 rounded-full" style={{ background: col.bg, color: col.color }}>{deCol.length}</span>
                </div>

                {deCol.length === 0 && (
                  <div className="text-[12px] text-center py-6 rounded-xl" style={{ color: '#9ca3af', border: '1px dashed #e5e7eb' }}>
                    {colIdx === 0 ? 'Agrega un influencer arriba ↑' : 'Arrastra aquí o usa las flechas'}
                  </div>
                )}

                {deCol.map((it) => (
                  <div key={it.id}
                    draggable
                    onDragStart={() => setDragId(it.id)}
                    onDragEnd={() => setDragId(null)}
                    className="rounded-xl p-3 space-y-2 cursor-grab active:cursor-grabbing"
                    style={{ background: '#fff', border: '1px solid #f1f1f3', boxShadow: '0 1px 2px rgba(16,24,40,0.05)', opacity: dragId === it.id ? 0.5 : 1 }}>
                    {/* usuario IG + eliminar */}
                    <div className="flex items-center gap-2">
                      <a href={`https://instagram.com/${it.usuarioIg}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold hover:underline min-w-0"
                        style={{ color: '#111827' }}>
                        <AtSign className="w-3.5 h-3.5 shrink-0" style={{ color: '#e1306c' }} />
                        <span className="truncate">@{it.usuarioIg}</span>
                      </a>
                      <div className="flex-1" />
                      <button onClick={() => eliminar(it.id)} title="Eliminar"
                        className="w-6 h-6 rounded-md inline-flex items-center justify-center" style={{ color: '#c4c4cc' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#c4c4cc' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {it.nombre && <div className="text-[12px] truncate" style={{ color: '#6b7280' }}>{it.nombre}</div>}

                    {/* Video: link o input */}
                    {videoEdit === it.id ? (
                      <div className="flex items-center gap-1.5">
                        <input value={videoVal} onChange={(e) => setVideoVal(e.target.value)} autoFocus
                          placeholder="https://… enlace del video"
                          onKeyDown={(e) => { if (e.key === 'Enter') guardarVideo(it.id); if (e.key === 'Escape') setVideoEdit(null) }}
                          className="flex-1 min-w-0 h-8 px-2 rounded-lg text-[12px]" style={{ border: '1px solid #e5e7eb' }} />
                        <button onClick={() => guardarVideo(it.id)} className="h-8 px-2.5 rounded-lg text-[11px] font-bold text-white" style={{ background: '#7170ff' }}>OK</button>
                      </div>
                    ) : it.videoUrl ? (
                      <div className="flex items-center gap-1.5">
                        <a href={it.videoUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-semibold flex-1 min-w-0"
                          style={{ background: '#dcfce7', color: '#15803d', textDecoration: 'none' }}>
                          <Play className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Ver video</span>
                        </a>
                        <button onClick={() => { setVideoEdit(it.id); setVideoVal(it.videoUrl ?? '') }} title="Cambiar enlace"
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center" style={{ border: '1px solid #e5e7eb', color: '#6b7280' }}>
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setVideoEdit(it.id); setVideoVal('') }}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-medium w-full"
                        style={{ border: '1px dashed #d1d5db', color: '#6b7280' }}>
                        <Link2 className="w-3.5 h-3.5" /> Pegar enlace del video
                      </button>
                    )}

                    {/* Mover ◀ ▶ */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button onClick={() => moverDelta(it, -1)} disabled={colIdx === 0} title="Mover a la columna anterior"
                        className="h-7 flex-1 rounded-lg inline-flex items-center justify-center disabled:opacity-25"
                        style={{ border: '1px solid #e5e7eb', color: '#6b7280', background: '#fff' }}>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => moverDelta(it, 1)} disabled={colIdx === COLUMNAS.length - 1} title="Mover a la siguiente columna"
                        className="h-7 flex-1 rounded-lg inline-flex items-center justify-center text-white disabled:opacity-25"
                        style={{ background: colIdx === COLUMNAS.length - 1 ? '#e5e7eb' : '#7170ff' }}>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <p className="text-[11.5px]" style={{ color: '#9ca3af' }}>
          Tip: arrastra las cards entre columnas (en compu) o usa las flechas. El enlace del video se puede pegar en cualquier etapa
          {driveUrl ? <>; los archivos viven en la <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="underline">carpeta de Drive</a></> : null}.
        </p>
      </div>
    </main>
  )
}
