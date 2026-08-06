'use client'

// Apartado "Fechas importantes" DENTRO del portal del cliente (Pedro 24-jul-2026:
// "quiero que todas las interfaces de mis clientes tengan este apartado" + "que
// me permita agregar fechas"). El cliente ve el calendario de SU marca (estrellita
// + color por categoría), y puede AGREGAR y ELIMINAR fechas de su propia marca.
// La seguridad (marca forzada a la del cliente) vive en las server actions.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarDays, ChevronLeft, ChevronRight, Star, Bell, Plus, X } from 'lucide-react'
import { categoriaInfo, CATEGORIAS_FECHA } from '@/lib/fechas/categorias'
import { FechaDetalleModal } from '@/components/fechas/fecha-detalle-modal'
import { crearFechaImportanteCliente, eliminarFechaImportanteCliente } from '../_actions'

export type FechaClienteItem = { id: string; titulo: string; fecha: string; nota: string | null; categoria: string }

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export function FechasClienteView({ fechas, color, marcaNombre }: {
  fechas: FechaClienteItem[]; color: string; marcaNombre: string
}) {
  const router = useRouter()
  // HOY en Lima (no UTC).
  const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const [hy, hm] = hoyISO.split('-').map(Number)
  const [ver, setVer] = useState<{ y: number; m: number }>({ y: hy, m: hm - 1 })
  const [detalle, setDetalle] = useState<FechaClienteItem | null>(null)
  const [agregar, setAgregar] = useState<{ fecha: string } | null>(null)

  const cambiarMes = (delta: number) => setVer((v) => {
    const d = new Date(v.y, v.m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const porDia = useMemo(() => {
    const map = new Map<string, FechaClienteItem[]>()
    for (const f of fechas) { const a = map.get(f.fecha) ?? []; a.push(f); map.set(f.fecha, a) }
    return map
  }, [fechas])

  const celdas = useMemo(() => {
    const primerDiaSemana = new Date(ver.y, ver.m, 1).getDay()
    const dias = new Date(ver.y, ver.m + 1, 0).getDate()
    const arr: (number | null)[] = Array(primerDiaSemana).fill(null)
    for (let d = 1; d <= dias; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [ver])

  const delMes = useMemo(() => {
    const pref = `${ver.y}-${String(ver.m + 1).padStart(2, '0')}`
    return fechas.filter((f) => f.fecha.slice(0, 7) === pref).sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [fechas, ver])

  function borrar(id: string) {
    eliminarFechaImportanteCliente(id).then((r) => {
      if (r.ok) { toast.success('Fecha eliminada'); router.refresh() } else { toast.error(r.error) }
    })
  }

  return (
    <section className="space-y-5">
      {/* Encabezado + Agregar */}
      <header className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl text-white shrink-0" style={{ background: color }}>
          <CalendarDays className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-extrabold leading-tight">Fechas importantes</h2>
          <p className="text-[13px] text-muted-foreground">Las fechas clave de tu marca que estamos coordinando.</p>
        </div>
        <button onClick={() => setAgregar({ fecha: hoyISO })}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-white font-bold text-[13.5px] shrink-0" style={{ background: color }}>
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Agregar fecha</span>
        </button>
      </header>

      {/* Aviso del mes actual */}
      <div className="rounded-2xl border p-4 flex items-start gap-3" style={{ background: `${color}0c`, borderColor: `${color}33` }}>
        <Bell className="w-5 h-5 shrink-0 mt-0.5" style={{ color }} />
        <div className="flex-1 min-w-0 text-[13.5px] text-muted-foreground">
          {delMes.length === 0
            ? <>No hay fechas importantes registradas para <strong>{MESES[ver.m]}</strong>. Toca un día para agregar una.</>
            : <><span className="font-bold text-foreground">{delMes.length} fecha{delMes.length === 1 ? '' : 's'} en {MESES[ver.m]}</span> — revisa el calendario. 📌</>}
        </div>
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center justify-between">
        <button onClick={() => cambiarMes(-1)} aria-label="Mes anterior" className="w-9 h-9 rounded-lg inline-flex items-center justify-center hover:bg-muted"><ChevronLeft className="w-5 h-5" /></button>
        <div className="font-extrabold text-[16px]">{MESES[ver.m]} <span className="text-muted-foreground font-semibold">{ver.y}</span></div>
        <button onClick={() => cambiarMes(1)} aria-label="Mes siguiente" className="w-9 h-9 rounded-lg inline-flex items-center justify-center hover:bg-muted"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {/* Calendario — tocar un día agrega; tocar una fecha abre el detalle */}
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
              <button key={i} onClick={() => setAgregar({ fecha: key })}
                className="min-w-0 min-h-[76px] sm:min-h-[92px] border-b border-r border-black/[0.04] p-1 text-left align-top hover:bg-muted/40 transition-colors flex flex-col gap-0.5">
                <span className={`text-[12px] font-bold w-6 h-6 inline-flex items-center justify-center rounded-full shrink-0 ${esHoy ? 'text-white' : ''}`} style={esHoy ? { background: '#ef4444' } : undefined}>{d}</span>
                <div className="flex flex-col gap-0.5 overflow-hidden min-w-0 w-full">
                  {items.slice(0, 3).map((f) => {
                    const cat = categoriaInfo(f.categoria)
                    return (
                      <span key={f.id} onClick={(e) => { e.stopPropagation(); setDetalle(f) }}
                        className="flex items-center gap-1 w-full min-w-0 max-w-full overflow-hidden text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer" style={{ background: `${cat.color}22`, color: cat.color }} title={`${cat.label}: ${f.titulo}`}>
                        <Star className="w-2.5 h-2.5 shrink-0" style={{ color: cat.color }} fill={cat.color} /> <span className="truncate min-w-0">{f.titulo}</span>
                      </span>
                    )
                  })}
                  {items.length > 3 && <span className="text-[10px] text-muted-foreground font-semibold pl-1">+{items.length - 3}</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista del mes */}
      {delMes.length === 0 ? (
        <p className="text-center text-[13px] text-muted-foreground py-2">No hay fechas importantes en {MESES[ver.m]}. Toca un día para agregar una.</p>
      ) : (
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">En {MESES[ver.m]} · {delMes.length}</div>
          {delMes.map((f) => {
            const cat = categoriaInfo(f.categoria)
            return (
              <button key={f.id} onClick={() => setDetalle(f)} className="w-full text-left rounded-xl border bg-card p-3 flex items-center gap-3 hover:shadow-sm transition-shadow" style={{ borderLeft: `4px solid ${cat.color}` }}>
                <div className="w-10 text-center shrink-0">
                  <div className="text-[16px] font-extrabold leading-none">{Number(f.fecha.slice(8, 10))}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{MESES[ver.m].slice(0, 3)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold truncate">{f.titulo}</div>
                  <div className="inline-flex items-center gap-1 text-[11.5px] font-bold mt-0.5" style={{ color: cat.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} /> {cat.label}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Popup de detalle — el cliente puede eliminar sus fechas */}
      {detalle && (
        <FechaDetalleModal
          fecha={{ id: detalle.id, titulo: detalle.titulo, fecha: detalle.fecha, nota: detalle.nota, categoria: detalle.categoria, marcaNombre, marcaColor: color }}
          onClose={() => setDetalle(null)}
          onDelete={borrar}
        />
      )}

      {/* Modal agregar */}
      {agregar && (
        <FormAgregarCliente
          fechaInicial={agregar.fecha} color={color}
          onClose={() => setAgregar(null)}
          onDone={() => { setAgregar(null); router.refresh() }}
        />
      )}
    </section>
  )
}

function FormAgregarCliente({ fechaInicial, color, onClose, onDone }: {
  fechaInicial: string; color: string; onClose: () => void; onDone: () => void
}) {
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(fechaInicial)
  const [nota, setNota] = useState('')
  const [categoria, setCategoria] = useState('otro')
  const [guardando, start] = useTransition()

  function guardar() {
    start(async () => {
      const r = await crearFechaImportanteCliente({ titulo, fecha, nota, categoria })
      if (r.ok) { toast.success('Fecha agregada'); onDone() } else { toast.error(r.error) }
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(15,23,42,0.55)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[16px] font-extrabold">Nueva fecha importante</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Categoría</span>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2">
              {CATEGORIAS_FECHA.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2" />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Título</span>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Aniversario, evento, lanzamiento…" className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2" />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Nota (opcional)</span>
            <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Detalle, idea de contenido…" className="w-full px-3 py-2 rounded-lg border bg-background text-[14px] resize-none focus:outline-none focus:ring-2" />
          </label>
          <button onClick={guardar} disabled={guardando} className="w-full h-11 rounded-xl text-white font-bold text-[14px] disabled:opacity-60" style={{ background: color }}>
            {guardando ? 'Guardando…' : 'Guardar fecha'}
          </button>
        </div>
      </div>
    </div>
  )
}
