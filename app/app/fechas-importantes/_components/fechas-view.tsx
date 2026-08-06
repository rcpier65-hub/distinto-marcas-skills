'use client'

// Calendario de fechas importantes por marca (idea de Lorena 23-jul-2026).
// Vista mensual con las fechas de cada marca (con su color), recordatorio del
// mes, y agregar/eliminar. Responsive.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Trash2, X, Bell, Star, Share2, Copy, Check } from 'lucide-react'
import { crearFechaImportante, eliminarFechaImportante, setContenidoFecha } from '../_actions'
import { CATEGORIAS_FECHA, categoriaInfo, CONTENIDOS_FECHA, contenidoInfo } from '@/lib/fechas/categorias'

export type MarcaLite = { id: string; nombre: string; emoji: string | null; color: string }
export type FechaImportante = { id: string; marcaId: string; titulo: string; fecha: string; nota: string | null; categoria: string; contenido: string | null }

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export function FechasView({ marcas, fechas }: { marcas: MarcaLite[]; fechas: FechaImportante[] }) {
  const router = useRouter()
  const marcaById = useMemo(() => new Map(marcas.map((m) => [m.id, m])), [marcas])

  // HOY en Lima (no UTC).
  const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const [hy, hm] = hoyISO.split('-').map(Number)

  const [ver, setVer] = useState<{ y: number; m: number }>({ y: hy, m: hm - 1 })
  const cambiarMes = (delta: number) => setVer((v) => {
    const d = new Date(v.y, v.m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  // Fechas agrupadas por día (YYYY-MM-DD).
  const porDia = useMemo(() => {
    const map = new Map<string, FechaImportante[]>()
    for (const f of fechas) { const a = map.get(f.fecha) ?? []; a.push(f); map.set(f.fecha, a) }
    return map
  }, [fechas])

  // Celdas del mes (con blancos iniciales).
  const celdas = useMemo(() => {
    const primerDiaSemana = new Date(ver.y, ver.m, 1).getDay()
    const dias = new Date(ver.y, ver.m + 1, 0).getDate()
    const arr: (number | null)[] = Array(primerDiaSemana).fill(null)
    for (let d = 1; d <= dias; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [ver])

  // Recordatorio: fechas del MES ACTUAL real (el "aviso" de Lorena).
  const recordatorio = useMemo(() => {
    const pref = `${hoyISO.slice(0, 7)}` // YYYY-MM del mes actual
    const delMes = fechas.filter((f) => f.fecha.slice(0, 7) === pref)
    const porMarca = new Map<string, number>()
    for (const f of delMes) porMarca.set(f.marcaId, (porMarca.get(f.marcaId) ?? 0) + 1)
    return { mes: MESES[hm - 1], total: delMes.length, marcas: [...porMarca.entries()] }
  }, [fechas, hoyISO, hm])

  // Modales
  const [detalle, setDetalle] = useState<FechaImportante | null>(null)
  const [agregar, setAgregar] = useState<{ fecha: string } | null>(null)
  const [compartir, setCompartir] = useState(false)
  const [dia, setDia] = useState<string | null>(null) // día abierto (lista de fechas de ese día)

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Encabezado */}
      <header className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl text-white shrink-0" style={{ background: 'linear-gradient(135deg,#7170ff,#ec4899)' }}>
          <CalendarDays className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold leading-tight">Fechas importantes</h1>
          <p className="text-[13px] text-muted-foreground">Fechas clave del año por marca. 📌</p>
        </div>
        <button onClick={() => setCompartir(true)}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl font-bold text-[13.5px] shrink-0 border" style={{ color: '#16a34a', borderColor: 'rgba(22,163,74,0.4)' }}
          title="Enviar las fechas del mes a un cliente">
          <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Compartir con cliente</span>
        </button>
        <button onClick={() => setAgregar({ fecha: hoyISO })}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-white font-bold text-[13.5px] shrink-0" style={{ background: '#7170ff' }}>
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Agregar fecha</span>
        </button>
      </header>

      {/* Recordatorio del mes actual */}
      <div className="rounded-2xl border p-4 flex items-start gap-3" style={{ background: recordatorio.total ? 'rgba(245,158,11,0.08)' : 'var(--mk-bg-elevated, #f8f8f9)', borderColor: recordatorio.total ? 'rgba(245,158,11,0.3)' : undefined }}>
        <Bell className="w-5 h-5 shrink-0 mt-0.5" style={{ color: recordatorio.total ? '#f59e0b' : 'var(--muted-foreground,#64748b)' }} />
        <div className="flex-1 min-w-0 text-[13.5px]">
          {recordatorio.total === 0 ? (
            <span className="text-muted-foreground">No hay fechas importantes registradas para <strong>{recordatorio.mes}</strong>.</span>
          ) : (
            <>
              <span className="font-bold">Recordatorio de {recordatorio.mes}:</span>{' '}
              {recordatorio.marcas.length} marca{recordatorio.marcas.length === 1 ? '' : 's'} con fechas importantes este mes — revisa el calendario.
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recordatorio.marcas.map(([mid, n]) => {
                  const m = marcaById.get(mid); if (!m) return null
                  return (
                    <span key={mid} className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${m.color}1f`, color: m.color }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: m.color }} /> {m.nombre} · {n}
                    </span>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center justify-between">
        <button onClick={() => cambiarMes(-1)} aria-label="Mes anterior" className="w-9 h-9 rounded-lg inline-flex items-center justify-center hover:bg-muted"><ChevronLeft className="w-5 h-5" /></button>
        <div className="font-extrabold text-[16px]">{MESES[ver.m]} <span className="text-muted-foreground font-semibold">{ver.y}</span></div>
        <button onClick={() => cambiarMes(1)} aria-label="Mes siguiente" className="w-9 h-9 rounded-lg inline-flex items-center justify-center hover:bg-muted"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {/* Calendario */}
      <div className="rounded-2xl border overflow-hidden bg-card">
        <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted-foreground border-b">
          {DIAS.map((d, i) => <div key={i} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {celdas.map((d, i) => {
            if (d === null) return <div key={i} className="min-h-[76px] sm:min-h-[92px] border-b border-r border-black/[0.04]" />
            const key = iso(ver.y, ver.m, d)
            const esHoy = key === hoyISO
            const items = porDia.get(key) ?? []
            return (
              <button key={i} onClick={() => (items.length ? setDia(key) : setAgregar({ fecha: key }))}
                className="min-w-0 min-h-[76px] sm:min-h-[92px] border-b border-r border-black/[0.04] p-1 text-left align-top hover:bg-muted/40 transition-colors flex flex-col gap-0.5">
                <span className={`text-[12px] font-bold w-6 h-6 inline-flex items-center justify-center rounded-full shrink-0 ${esHoy ? 'text-white' : ''}`} style={esHoy ? { background: '#ef4444' } : undefined}>{d}</span>
                <div className="flex flex-col gap-0.5 overflow-hidden min-w-0 w-full">
                  {items.slice(0, 3).map((f) => {
                    const m = marcaById.get(f.marcaId)
                    const cat = categoriaInfo(f.categoria)
                    return (
                      <span key={f.id}
                        className="flex items-center gap-1 w-full min-w-0 max-w-full overflow-hidden text-[10px] font-bold px-1.5 py-0.5 rounded pointer-events-none" style={{ background: `${cat.color}22`, color: cat.color }} title={`${cat.label} · ${m?.nombre ?? ''}: ${f.titulo}`}>
                        <Star className="w-2.5 h-2.5 shrink-0" style={{ color: cat.color }} fill={cat.color} /> <span className="truncate min-w-0">{f.titulo}</span>
                      </span>
                    )
                  })}
                  {items.length > 3 && <span className="text-[10px] font-semibold pl-1" style={{ color: '#7170ff' }}>+{items.length - 3} más</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista del mes (más legible, sobre todo en celular) */}
      <MesLista ver={ver} fechas={fechas} marcaById={marcaById} onDetalle={setDetalle} />

      {/* Modal DETALLE */}
      {detalle && (() => {
        const m = marcaById.get(detalle.marcaId)
        return (
          <Overlay onClose={() => setDetalle(null)}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  {m && <div className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${m.color}1f`, color: m.color }}><span className="w-2 h-2 rounded-full" style={{ background: m.color }} /> {m.nombre}</div>}
                  {(() => { const c = categoriaInfo(detalle.categoria); return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${c.color}1f`, color: c.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} /> {c.label}</span> })()}
                </div>
                <div className="text-[17px] font-extrabold leading-tight">{detalle.titulo}</div>
                <div className="text-[13px] text-muted-foreground mt-0.5">{fechaLarga(detalle.fecha)}</div>
              </div>
              <button onClick={() => setDetalle(null)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted shrink-0"><X className="w-4 h-4" /></button>
            </div>
            {detalle.nota && <p className="text-[13.5px] text-muted-foreground mb-3">{detalle.nota}</p>}
            <ContenidoRow fecha={detalle} onSaved={() => router.refresh()} />
            <BorrarBtn id={detalle.id} onDone={() => { setDetalle(null); router.refresh() }} />
          </Overlay>
        )
      })()}

      {/* Modal DÍA — todas las fechas de un día; se elige una para ver el detalle */}
      {dia && (
        <DiaModal
          diaISO={dia}
          items={porDia.get(dia) ?? []}
          marcaById={marcaById}
          onPick={(f) => { setDia(null); setDetalle(f) }}
          onAgregar={() => { const d = dia; setDia(null); setAgregar({ fecha: d }) }}
          onClose={() => setDia(null)}
        />
      )}

      {/* Modal AGREGAR */}
      {agregar && (
        <FormAgregar marcas={marcas} fechaInicial={agregar.fecha} onClose={() => setAgregar(null)} onDone={() => { setAgregar(null); router.refresh() }} />
      )}

      {/* Modal COMPARTIR con cliente */}
      {compartir && (
        <CompartirModal marcas={marcas} fechas={fechas} mesInicial={ver} onClose={() => setCompartir(false)} />
      )}
    </main>
  )
}

function MesLista({ ver, fechas, marcaById, onDetalle }: {
  ver: { y: number; m: number }; fechas: FechaImportante[]; marcaById: Map<string, MarcaLite>; onDetalle: (f: FechaImportante) => void
}) {
  const pref = `${ver.y}-${String(ver.m + 1).padStart(2, '0')}`
  const delMes = fechas.filter((f) => f.fecha.slice(0, 7) === pref).sort((a, b) => a.fecha.localeCompare(b.fecha))
  if (delMes.length === 0) return (
    <p className="text-center text-[13px] text-muted-foreground py-4">No hay fechas importantes en {MESES[ver.m]}. Toca un día para agregar una.</p>
  )
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">En {MESES[ver.m]} · {delMes.length}</div>
      {delMes.map((f) => {
        const m = marcaById.get(f.marcaId)
        const cat = categoriaInfo(f.categoria)
        return (
          <button key={f.id} onClick={() => onDetalle(f)} className="w-full text-left rounded-xl border bg-card p-3 flex items-center gap-3 hover:shadow-sm transition-shadow" style={{ borderLeft: `4px solid ${cat.color}` }}>
            <div className="w-10 text-center shrink-0">
              <div className="text-[16px] font-extrabold leading-none">{Number(f.fecha.slice(8, 10))}</div>
              <div className="text-[10px] text-muted-foreground uppercase">{MESES[ver.m].slice(0, 3)}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold truncate">{f.titulo}</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span className="inline-flex items-center gap-1 text-[11.5px] font-bold" style={{ color: cat.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} /> {cat.label}</span>
                {m && <span className="text-[12px] text-muted-foreground">· {m.nombre}</span>}
                {(() => { const co = contenidoInfo(f.contenido); return co ? <span className="text-[11.5px] font-semibold text-muted-foreground">· {co.emoji} {co.label}</span> : null })()}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function FormAgregar({ marcas, fechaInicial, onClose, onDone }: {
  marcas: MarcaLite[]; fechaInicial: string; onClose: () => void; onDone: () => void
}) {
  const [marcaId, setMarcaId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(fechaInicial)
  const [nota, setNota] = useState('')
  const [categoria, setCategoria] = useState('otro')
  const [contenido, setContenido] = useState('')
  const [guardando, start] = useTransition()

  function guardar() {
    start(async () => {
      const r = await crearFechaImportante({ marcaId, titulo, fecha, nota, categoria, contenido })
      if (r.ok) { toast.success('Fecha agregada'); onDone() } else { toast.error(r.error) }
    })
  }
  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[16px] font-extrabold">Nueva fecha importante</div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-3">
        <label className="block">
          <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Marca</span>
          <select value={marcaId} onChange={(e) => setMarcaId(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]">
            <option value="">— elige la marca —</option>
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Categoría</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]">
            {CATEGORIAS_FECHA.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Contenido que se hará <span className="font-normal">(para el cliente)</span></span>
          <select value={contenido} onChange={(e) => setContenido(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]">
            <option value="">— sin definir —</option>
            {CONTENIDOS_FECHA.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Fecha</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]" />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Título</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Día de la Madre, aniversario, lanzamiento…" className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]" />
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Nota (opcional)</span>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Detalle, idea de contenido…" className="w-full px-3 py-2 rounded-lg border bg-background text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#7170ff]" />
        </label>
        <button onClick={guardar} disabled={guardando} className="w-full h-11 rounded-xl text-white font-bold text-[14px] disabled:opacity-60" style={{ background: '#7170ff' }}>
          {guardando ? 'Guardando…' : 'Guardar fecha'}
        </button>
      </div>
    </Overlay>
  )
}

function BorrarBtn({ id, onDone }: { id: string; onDone: () => void }) {
  const [borrando, start] = useTransition()
  return (
    <button onClick={() => { if (!confirm('¿Eliminar esta fecha?')) return; start(async () => { const r = await eliminarFechaImportante(id); if (r.ok) { toast.success('Eliminada'); onDone() } else { toast.error(r.error) } }) }}
      disabled={borrando} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-bold text-red-600 hover:bg-red-50 transition-colors">
      <Trash2 className="w-4 h-4" /> Eliminar
    </button>
  )
}

/* Pop-up de un DÍA: lista TODAS las fechas importantes de ese día (sin el límite
   de 3 de la celda del calendario) y deja elegir una para ver su detalle.
   Pedro 25-jul-2026: "al hacer click en la cajita que salgan todas y recién
   poder elegir una". */
function DiaModal({ diaISO, items, marcaById, onPick, onAgregar, onClose }: {
  diaISO: string
  items: FechaImportante[]
  marcaById: Map<string, MarcaLite>
  onPick: (f: FechaImportante) => void
  onAgregar: () => void
  onClose: () => void
}) {
  const ordenadas = [...items].sort((a, b) => a.titulo.localeCompare(b.titulo))
  return (
    <Overlay onClose={onClose}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{ordenadas.length} fecha{ordenadas.length === 1 ? '' : 's'} importante{ordenadas.length === 1 ? '' : 's'}</div>
          <div className="text-[17px] font-extrabold leading-tight capitalize">{fechaLarga(diaISO)}</div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted shrink-0"><X className="w-4 h-4" /></button>
      </div>
      {ordenadas.length === 0 ? (
        <p className="text-[13.5px] text-muted-foreground py-2">No hay fechas importantes en este día.</p>
      ) : (
        <div className="space-y-2 max-h-[52vh] overflow-y-auto -mx-1 px-1">
          {ordenadas.map((f) => {
            const m = marcaById.get(f.marcaId)
            const cat = categoriaInfo(f.categoria)
            const co = contenidoInfo(f.contenido)
            return (
              <button key={f.id} onClick={() => onPick(f)} className="w-full text-left rounded-xl border bg-card p-3 flex items-center gap-3 hover:shadow-sm transition-shadow" style={{ borderLeft: `4px solid ${cat.color}` }}>
                <Star className="w-4 h-4 shrink-0" style={{ color: cat.color }} fill={cat.color} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold truncate">{f.titulo}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-bold" style={{ color: cat.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} /> {cat.label}</span>
                    {m && <span className="text-[12px] text-muted-foreground">· {m.nombre}</span>}
                    {co && <span className="text-[11.5px] font-semibold text-muted-foreground">· {co.emoji} {co.label}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            )
          })}
        </div>
      )}
      <button onClick={onAgregar} className="mt-3 w-full h-11 rounded-xl font-bold text-[14px] text-white inline-flex items-center justify-center gap-2" style={{ background: '#7170ff' }}>
        <Plus className="w-4 h-4" /> Agregar fecha en este día
      </button>
    </Overlay>
  )
}

/* Selector de "qué contenido se hará" dentro del detalle — permite asignarlo a
   fechas ya existentes (ej. las efemérides cargadas) sin recrearlas. */
function ContenidoRow({ fecha, onSaved }: { fecha: FechaImportante; onSaved: () => void }) {
  const [val, setVal] = useState(fecha.contenido ?? '')
  const [saving, start] = useTransition()
  function cambiar(v: string) {
    setVal(v)
    start(async () => {
      const r = await setContenidoFecha(fecha.id, v || null)
      if (r.ok) { toast.success('Contenido actualizado'); onSaved() } else { toast.error(r.error) }
    })
  }
  return (
    <label className="block mb-3">
      <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Contenido que se hará <span className="font-normal">(se envía al cliente)</span></span>
      <select value={val} onChange={(e) => cambiar(e.target.value)} disabled={saving} className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff] disabled:opacity-60">
        <option value="">— sin definir —</option>
        {CONTENIDOS_FECHA.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
      </select>
    </label>
  )
}

/* Modal para ARMAR el mensaje del mes y enviarlo al cliente (idea de Lorena
   25-jul-2026: "como las grillas, enviarles las fechas del mes y qué contenido
   se hará"). Elige marca + mes → genera un texto listo para copiar / WhatsApp. */
function CompartirModal({ marcas, fechas, mesInicial, onClose }: {
  marcas: MarcaLite[]; fechas: FechaImportante[]; mesInicial: { y: number; m: number }; onClose: () => void
}) {
  const [marcaId, setMarcaId] = useState(marcas[0]?.id ?? '')
  const [ver, setVer] = useState(mesInicial)
  const [copiado, setCopiado] = useState(false)
  const cambiarMes = (delta: number) => setVer((v) => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })

  const marca = marcas.find((m) => m.id === marcaId) ?? null
  const pref = `${ver.y}-${String(ver.m + 1).padStart(2, '0')}`
  const items = fechas
    .filter((f) => f.marcaId === marcaId && f.fecha.slice(0, 7) === pref)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const mesCorto = MESES[ver.m].slice(0, 3).toLowerCase()
  const mensaje = (() => {
    if (!marca) return ''
    if (items.length === 0) return `No hay fechas importantes de ${marca.nombre} para ${MESES[ver.m]}.`
    const cuerpo = items.map((f) => {
      const d = Number(f.fecha.slice(8, 10))
      const co = contenidoInfo(f.contenido)
      const tipo = co ? ` — ${co.emoji} ${co.label}` : ''
      return `• ${d} ${mesCorto} · ${f.titulo}${tipo}`
    }).join('\n')
    return `📅 *Fechas importantes de ${MESES[ver.m]}* · ${marca.nombre}\n\nEstas son las fechas clave del mes y el contenido que preparamos para ti:\n\n${cuerpo}\n\nCualquier ajuste o idea nos avisas 👍\n— Agencia Distinto`
  })()

  const hayPendientes = items.some((f) => !f.contenido)

  async function copiar() {
    try { await navigator.clipboard.writeText(mensaje); setCopiado(true); toast.success('Mensaje copiado'); setTimeout(() => setCopiado(false), 2500) }
    catch { toast.error('No se pudo copiar') }
  }
  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[16px] font-extrabold inline-flex items-center gap-2"><Share2 className="w-4 h-4" style={{ color: '#16a34a' }} /> Enviar fechas al cliente</div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-3">
        <label className="block">
          <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Marca</span>
          <select value={marcaId} onChange={(e) => setMarcaId(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]">
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </label>
        <div className="flex items-center justify-between">
          <button onClick={() => cambiarMes(-1)} aria-label="Mes anterior" className="w-9 h-9 rounded-lg inline-flex items-center justify-center hover:bg-muted"><ChevronLeft className="w-5 h-5" /></button>
          <div className="font-extrabold text-[15px]">{MESES[ver.m]} <span className="text-muted-foreground font-semibold">{ver.y}</span></div>
          <button onClick={() => cambiarMes(1)} aria-label="Mes siguiente" className="w-9 h-9 rounded-lg inline-flex items-center justify-center hover:bg-muted"><ChevronRight className="w-5 h-5" /></button>
        </div>
        {hayPendientes && (
          <div className="text-[11.5px] rounded-lg px-3 py-2" style={{ background: 'rgba(245,158,11,0.1)', color: '#92400e' }}>
            💡 Algunas fechas no tienen definido el contenido. Ábrelas y elige “Post/Reel…” para que salga en el mensaje.
          </div>
        )}
        <div className="rounded-xl border bg-muted/30 p-3 text-[13px] whitespace-pre-wrap max-h-[38vh] overflow-y-auto leading-relaxed">{mensaje}</div>
        <div className="flex gap-2">
          <button onClick={copiar} className="flex-1 h-11 rounded-xl font-bold text-[14px] inline-flex items-center justify-center gap-2 border" style={{ color: '#0f172a' }}>
            {copiado ? <><Check className="w-4 h-4" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar</>}
          </button>
          <button onClick={whatsapp} className="flex-1 h-11 rounded-xl font-bold text-[14px] text-white inline-flex items-center justify-center gap-2" style={{ background: '#16a34a' }}>
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
        </div>
      </div>
    </Overlay>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(15,23,42,0.55)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

function fechaLarga(f: string) {
  const [y, m, d] = f.split('-').map(Number)
  return `${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date(y, m - 1, d).getDay()]} ${d} de ${MESES[m - 1]} de ${y}`
}
