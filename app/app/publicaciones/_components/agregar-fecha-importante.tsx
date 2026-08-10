'use client'

// Botón + modal para agregar una FECHA IMPORTANTE desde el calendario de
// publicaciones. Solo Lorena + directores (el server ya gatea con canManage).
// Pedro 23-jul-2026.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarPlus, X } from 'lucide-react'
import { crearFechaImportante } from '@/app/fechas-importantes/_actions'
import { CATEGORIAS_FECHA, CONTENIDOS_FECHA } from '@/lib/fechas/categorias'

export function AgregarFechaImportante({ marcas, fechaInicial }: {
  marcas: { id: string; nombre: string }[]; fechaInicial?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [marcaId, setMarcaId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(fechaInicial ?? '')
  const [nota, setNota] = useState('')
  const [categoria, setCategoria] = useState('otro')
  const [contenido, setContenido] = useState('')
  const [guardando, start] = useTransition()

  function guardar() {
    start(async () => {
      const r = await crearFechaImportante({ marcaId, titulo, fecha, nota, categoria, contenido })
      if (r.ok) {
        toast.success('Fecha importante agregada')
        setOpen(false); setMarcaId(''); setTitulo(''); setFecha(''); setNota(''); setCategoria('otro'); setContenido('')
        router.refresh()
      } else { toast.error(r.error) }
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-bold transition-colors"
        style={{ background: '#16a34a', color: '#fff' }}>
        <CalendarPlus className="w-4 h-4" /> <span className="hidden sm:inline">Fecha importante</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(15,23,42,0.55)' }} onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[16px] font-extrabold">Nueva fecha importante</div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
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
                <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Fecha</span>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]" />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Título</span>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Día de la Madre, evento, salida…" className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]" />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Contenido que se hará <span className="font-normal">(se envía al cliente)</span></span>
                <select value={contenido} onChange={(e) => setContenido(e.target.value)} className="w-full h-10 px-3 rounded-lg border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-[#7170ff]">
                  <option value="">— sin definir —</option>
                  {CONTENIDOS_FECHA.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-muted-foreground mb-1 block">Nota (opcional)</span>
                <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Detalle, idea de contenido…" className="w-full px-3 py-2 rounded-lg border bg-background text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#7170ff]" />
              </label>
              <button onClick={guardar} disabled={guardando} className="w-full h-11 rounded-xl text-white font-bold text-[14px] disabled:opacity-60" style={{ background: '#16a34a' }}>
                {guardando ? 'Guardando…' : 'Guardar fecha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
