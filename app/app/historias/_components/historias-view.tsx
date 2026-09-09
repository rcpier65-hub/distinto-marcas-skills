'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CircleDashed, Plus, Trash2, X, Camera } from 'lucide-react'
import { crearHistoria, actualizarHistoria, eliminarHistoria, type HistoriaEstado } from '../_actions'

export type MarcaLite = { id: string; nombre: string; emoji: string | null; color: string; slug: string }
export type HistoriaItem = { id: string; marcaId: string; titulo: string; fecha: string; hora: string | null; plataformas: string[]; copy: string | null; nota: string | null; estado: HistoriaEstado }

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const PLATS = ['Instagram','TikTok']
const ESTADOS: { id: HistoriaEstado; label: string; color: string }[] = [
  { id: 'planificada', label: 'Planificada', color: '#7170ff' },
  { id: 'lista', label: 'Lista', color: '#06b6d4' },
  { id: 'publicada', label: 'Publicada', color: '#16a34a' },
  { id: 'cancelada', label: 'Cancelada', color: '#94a3b8' },
]
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
function estadoInfo(e: string) { return ESTADOS.find((x) => x.id === e) ?? ESTADOS[0] }

export function HistoriasView({ marcas, historias, canWrite, migrationPending }: { marcas: MarcaLite[]; historias: HistoriaItem[]; canWrite: boolean; migrationPending?: boolean }) {
  const router = useRouter()
  const marcaById = useMemo(() => new Map(marcas.map((m) => [m.id, m])), [marcas])
  const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
  const [hy, hm] = hoyISO.split('-').map(Number)
  const [ver, setVer] = useState({ y: hy, m: hm - 1 })
  const [marcaFiltro, setMarcaFiltro] = useState('todas')
  const [detalle, setDetalle] = useState<HistoriaItem | null>(null)
  const [form, setForm] = useState<{ fecha: string; edit?: HistoriaItem } | null>(null)
  const filtradas = useMemo(() => marcaFiltro === 'todas' ? historias : historias.filter((h) => h.marcaId === marcaFiltro), [historias, marcaFiltro])
  const porDia = useMemo(() => { const map = new Map<string, HistoriaItem[]>(); for (const h of filtradas) { const a = map.get(h.fecha) ?? []; a.push(h); map.set(h.fecha, a) } return map }, [filtradas])
  const celdas = useMemo(() => { const primer = new Date(ver.y, ver.m, 1).getDay(); const dias = new Date(ver.y, ver.m + 1, 0).getDate(); const arr: (number | null)[] = Array(primer).fill(null); for (let d = 1; d <= dias; d++) arr.push(d); while (arr.length % 7 !== 0) arr.push(null); return arr }, [ver])
  const delMes = useMemo(() => { const pref = `${ver.y}-${String(ver.m + 1).padStart(2, '0')}`; return filtradas.filter((h) => h.fecha.startsWith(pref)).sort((a, b) => a.fecha.localeCompare(b.fecha)) }, [filtradas, ver])
  const cambiarMes = (delta: number) => setVer((v) => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <header className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl text-white" style={{ background: 'linear-gradient(135deg,#ec4899,#7170ff)' }}><CircleDashed className="w-5 h-5" /></span>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold">Historias</h1>
          <p className="text-[13px] text-muted-foreground">Planificador compartido Diseño + Publicaciones. También se ven cortitas en Publicaciones.</p>
        </div>
        {canWrite && <button onClick={() => setForm({ fecha: hoyISO })} className="h-10 px-3.5 rounded-xl text-white font-bold text-[13.5px]" style={{ background: '#ec4899' }}><Plus className="w-4 h-4 inline" /> Nueva</button>}
      </header>
      {migrationPending && <div className="rounded-xl border px-4 py-3 text-[13px]" style={{ borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.08)', color: '#b45309' }}>Aplica la migración <code>historias</code> del PR antes de crear stories.</div>}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={marcaFiltro} onChange={(e) => setMarcaFiltro(e.target.value)} className="h-9 rounded-lg border bg-background px-2.5 text-[13px] font-semibold">
          <option value="todas">Todas las marcas</option>
          {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <span className="text-[12px] text-muted-foreground font-semibold">{delMes.length} este mes</span>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => cambiarMes(-1)} className="w-9 h-9 rounded-lg hover:bg-muted"><ChevronLeft className="w-5 h-5 mx-auto" /></button>
        <div className="font-extrabold text-[16px]">{MESES[ver.m]} <span className="text-muted-foreground font-semibold">{ver.y}</span></div>
        <button onClick={() => cambiarMes(1)} className="w-9 h-9 rounded-lg hover:bg-muted"><ChevronRight className="w-5 h-5 mx-auto" /></button>
      </div>
      <div className="rounded-2xl border overflow-hidden bg-card">
        <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted-foreground border-b">{['D','L','M','M','J','V','S'].map((d, i) => <div key={i} className="py-2">{d}</div>)}</div>
        <div className="grid grid-cols-7">
          {celdas.map((d, i) => {
            if (d === null) return <div key={i} className="min-h-[72px] border-b border-r border-black/[0.04]" />
            const key = iso(ver.y, ver.m, d)
            const items = porDia.get(key) ?? []
            const esHoy = key === hoyISO
            return (
              <button key={i} type="button" onClick={() => { if (items[0]) setDetalle(items[0]); else if (canWrite) setForm({ fecha: key }) }} className="min-h-[72px] border-b border-r border-black/[0.04] p-1 text-left hover:bg-muted/40 flex flex-col gap-0.5">
                <span className={`text-[12px] font-bold w-6 h-6 inline-flex items-center justify-center rounded-full ${esHoy ? 'text-white' : ''}`} style={esHoy ? { background: '#ec4899' } : undefined}>{d}</span>
                {items.slice(0, 3).map((h) => { const st = estadoInfo(h.estado); return <span key={h.id} className="truncate text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${st.color}22`, color: st.color }}>{h.titulo}</span> })}
              </button>
            )
          })}
        </div>
      </div>
      <section className="space-y-2">
        <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-muted-foreground">Lista del mes</h2>
        {delMes.length === 0 ? <p className="text-[13px] text-muted-foreground py-6 text-center border rounded-xl">No hay historias en {MESES[ver.m]}.</p> : (
          <ul className="space-y-1.5">{delMes.map((h) => { const m = marcaById.get(h.marcaId); const st = estadoInfo(h.estado); return (
            <li key={h.id}><button type="button" onClick={() => setDetalle(h)} className="w-full text-left rounded-xl border px-3 py-2.5 hover:bg-muted/40 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: m?.color ?? '#ec4899' }} />
              <div className="min-w-0 flex-1"><div className="font-bold text-[14px] truncate">{h.titulo}</div><div className="text-[12px] text-muted-foreground truncate">{h.fecha}{h.hora ? ` · ${h.hora}` : ''} · {m?.nombre ?? 'Marca'}</div></div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span>
            </button></li>
          )})}</ul>
        )}
      </section>
      {detalle && <DetalleModal h={detalle} marca={marcaById.get(detalle.marcaId)} canWrite={canWrite} onClose={() => setDetalle(null)} onEdit={() => { setForm({ fecha: detalle.fecha, edit: detalle }); setDetalle(null) }} onDone={() => { setDetalle(null); router.refresh() }} />}
      {form && canWrite && <FormHistoria marcas={marcas} fechaInicial={form.fecha} edit={form.edit} onClose={() => setForm(null)} onDone={() => { setForm(null); router.refresh() }} />}
    </main>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(15,23,42,0.5)' }} onClick={onClose}><div onClick={(e) => e.stopPropagation()} className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">{children}</div></div>
}

function DetalleModal({ h, marca, canWrite, onClose, onEdit, onDone }: { h: HistoriaItem; marca?: MarcaLite; canWrite: boolean; onClose: () => void; onEdit: () => void; onDone: () => void }) {
  const [pending, start] = useTransition(); const st = estadoInfo(h.estado)
  return <Overlay onClose={onClose}>
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {marca && <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${marca.color}1f`, color: marca.color }}>{marca.nombre}</span>}
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${st.color}1f`, color: st.color }}>{st.label}</span>
        </div>
        <div className="text-[17px] font-extrabold">{h.titulo}</div>
        <div className="text-[13px] text-muted-foreground">{h.fecha}{h.hora ? ` · ${h.hora}` : ''} · {(h.plataformas ?? []).join(' · ') || 'Sin plataforma'}</div>
      </div>
      <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted"><X className="w-4 h-4 mx-auto" /></button>
    </div>
    {h.copy && <p className="text-[13.5px] mb-2 whitespace-pre-wrap">{h.copy}</p>}
    {h.nota && <p className="text-[13px] text-muted-foreground mb-3">{h.nota}</p>}
    {canWrite && <div className="flex gap-2 mt-2">
      <button type="button" onClick={onEdit} className="flex-1 h-10 rounded-xl font-bold text-[13px] border">Editar</button>
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await eliminarHistoria(h.id); if (!r.ok) { toast.error(r.error); return } toast.success('Historia eliminada'); onDone() })} className="h-10 px-3 rounded-xl font-bold text-[13px] inline-flex items-center gap-1.5" style={{ color: '#dc2626', border: '1px solid rgba(220,38,38,0.35)' }}><Trash2 className="w-4 h-4" /> Borrar</button>
    </div>}
  </Overlay>
}

function FormHistoria({ marcas, fechaInicial, edit, onClose, onDone }: { marcas: MarcaLite[]; fechaInicial: string; edit?: HistoriaItem; onClose: () => void; onDone: () => void }) {
  const [pending, start] = useTransition()
  const [marcaId, setMarcaId] = useState(edit?.marcaId ?? marcas[0]?.id ?? '')
  const [titulo, setTitulo] = useState(edit?.titulo ?? '')
  const [fecha, setFecha] = useState(edit?.fecha ?? fechaInicial)
  const [hora, setHora] = useState(edit?.hora ?? '')
  const [plats, setPlats] = useState<string[]>(edit?.plataformas?.length ? edit.plataformas : ['Instagram'])
  const [copy, setCopy] = useState(edit?.copy ?? '')
  const [nota, setNota] = useState(edit?.nota ?? '')
  const [estado, setEstado] = useState<HistoriaEstado>(edit?.estado ?? 'planificada')
  function togglePlat(p: string) { setPlats((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]) }
  function submit() {
    start(async () => {
      if (edit) { const r = await actualizarHistoria({ id: edit.id, marcaId, titulo, fecha, hora: hora || null, plataformas: plats, copy, nota, estado }); if (!r.ok) { toast.error(r.error); return } toast.success('Historia actualizada') }
      else { const r = await crearHistoria({ marcaId, titulo, fecha, hora: hora || null, plataformas: plats, copy, nota, estado }); if (!r.ok) { toast.error(r.error); return } toast.success('Historia creada') }
      onDone()
    })
  }
  return <Overlay onClose={onClose}>
    <div className="flex items-center justify-between mb-4">
      <div className="font-extrabold text-[16px] flex items-center gap-2"><Camera className="w-4 h-4" style={{ color: '#ec4899' }} />{edit ? 'Editar historia' : 'Nueva historia'}</div>
      <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted"><X className="w-4 h-4 mx-auto" /></button>
    </div>
    <div className="space-y-3">
      <label className="block text-[12px] font-bold text-muted-foreground">Marca<select value={marcaId} onChange={(e) => setMarcaId(e.target.value)} className="mt-1 w-full h-10 rounded-lg border bg-background px-2.5 text-[13px] font-semibold">{marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></label>
      <label className="block text-[12px] font-bold text-muted-foreground">Título<input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1 w-full h-10 rounded-lg border bg-background px-2.5 text-[14px] font-semibold" placeholder="Ej. Bastidores" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[12px] font-bold text-muted-foreground">Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1 w-full h-10 rounded-lg border bg-background px-2.5 text-[13px]" /></label>
        <label className="block text-[12px] font-bold text-muted-foreground">Hora<input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="mt-1 w-full h-10 rounded-lg border bg-background px-2.5 text-[13px]" /></label>
      </div>
      <div><div className="text-[12px] font-bold text-muted-foreground mb-1.5">Plataformas</div><div className="flex flex-wrap gap-1.5">{PLATS.map((p) => <button key={p} type="button" onClick={() => togglePlat(p)} className="px-2.5 py-1 rounded-full text-[12px] font-bold border" style={plats.includes(p) ? { background: '#ec489922', color: '#ec4899', borderColor: '#ec489955' } : undefined}>{p}</button>)}</div></div>
      <label className="block text-[12px] font-bold text-muted-foreground">Estado<select value={estado} onChange={(e) => setEstado(e.target.value as HistoriaEstado)} className="mt-1 w-full h-10 rounded-lg border bg-background px-2.5 text-[13px] font-semibold">{ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select></label>
      <label className="block text-[12px] font-bold text-muted-foreground">Copy<textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border bg-background px-2.5 py-2 text-[13px]" /></label>
      <label className="block text-[12px] font-bold text-muted-foreground">Nota<textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-background px-2.5 py-2 text-[13px]" /></label>
      <button type="button" disabled={pending} onClick={submit} className="w-full h-11 rounded-xl text-white font-bold text-[14px]" style={{ background: '#ec4899', opacity: pending ? 0.7 : 1 }}>{pending ? 'Guardando…' : (edit ? 'Guardar' : 'Crear historia')}</button>
    </div>
  </Overlay>
}
