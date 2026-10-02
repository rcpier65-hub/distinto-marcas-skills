'use client'

/* Panel del equipo para el reporte DIRECTO (TypHouse / Little Joe):
   traer Shopify + Facebook + tipo de cambio, publicar, meta del mes,
   Facebook a mano (mientras no haya token) y ventas en nombre del cliente. */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw, Eye, EyeOff, Target, Megaphone, Wallet, Loader2, Settings2 } from 'lucide-react'
import { labelMes, type MesReporte } from '@/lib/reportes/typhouse'
import { computeDirecto } from '@/lib/reportes/directo'
import { actualizarMesDirecto, ajustarMesDirecto, guardarMetaManual, guardarVentasEquipo } from '../_actions'

const campo = 'h-10 px-3 text-sm bg-white text-slate-900 border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#7170ff] focus:ring-[3px] focus:ring-[#7170ff]/15 transition w-full'
const btnSec = 'h-10 px-4 inline-flex items-center justify-center gap-2 rounded-[11px] border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'
const btnPri = 'h-10 px-4 inline-flex items-center justify-center gap-2 rounded-[11px] text-[13px] font-bold text-white disabled:opacity-50'
const grad = { background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }

/* Mes anterior al actual en Lima (el que normalmente se reporta). */
function mesAnterior(): string {
  const hoy = new Date(Date.now() - 5 * 3600_000)
  const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function EditorDirecto({ marcaSlug, meses }: { marcaSlug: string; meses: MesReporte[] }) {
  const router = useRouter()
  const opciones = useMemo(() => {
    const set = new Set(meses.map((m) => m.mes))
    set.add(mesAnterior())
    return [...set].sort().reverse()
  }, [meses])
  const [mes, setMes] = useState(opciones[0])
  const raw = meses.find((m) => m.mes === mes) ?? null
  const d = raw ? computeDirecto(raw) : null
  const esDirecto = raw?.extra?.formato === 'directo'
  const [ocupado, setOcupado] = useState<string | null>(null)

  async function correr(clave: string, fn: () => Promise<{ ok: true; avisos?: string[] } | { ok: false; error: string }>, ok: string) {
    setOcupado(clave)
    const r = await fn()
    setOcupado(null)
    if (!r.ok) { toast.error(r.error); return }
    toast.success(ok)
    for (const a of r.avisos ?? []) toast.warning(a)
    router.refresh()
  }

  return (
    <section className="rounded-[20px] border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <h3 className="flex items-center gap-2.5 text-[15px] font-bold text-slate-900 flex-1">
          <span className="w-8 h-8 rounded-[9px] inline-flex items-center justify-center" style={{ background: '#7170ff14', color: '#7170ff' }}><Settings2 className="w-4 h-4" /></span>
          Gestionar mes
        </h3>
        <select value={mes} onChange={(e) => setMes(e.target.value)} className="h-10 px-3 rounded-[11px] border border-slate-200 bg-white text-[13.5px] font-semibold text-slate-700">
          {opciones.map((m) => <option key={m} value={m}>{labelMes(m)}</option>)}
        </select>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button type="button" disabled={!!ocupado} className={btnPri} style={grad}
          onClick={() => void correr('act', () => actualizarMesDirecto(marcaSlug, mes), 'Datos actualizados')}>
          {ocupado === 'act' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {esDirecto ? 'Actualizar Shopify y Facebook' : 'Generar mes automático'}
        </button>
        {esDirecto && d && (
          <button type="button" disabled={!!ocupado} className={btnSec}
            onClick={() => void correr('pub', () => ajustarMesDirecto(marcaSlug, mes, { publicado: !d.publicado }), d.publicado ? 'Ocultado al cliente' : 'Publicado en el portal')}>
            {ocupado === 'pub' ? <Loader2 className="w-4 h-4 animate-spin" /> : d.publicado ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {d.publicado ? 'Ocultar al cliente' : 'Publicar al cliente'}
          </button>
        )}
      </div>
      {!esDirecto && raw && <p className="text-[12.5px] text-slate-500 mt-2">Este mes tiene el formato anterior. Si lo generas en automático se reemplazan sus datos de Shopify y Facebook.</p>}

      {esDirecto && d && (
        <div className="grid gap-4 mt-5 md:grid-cols-3" key={mes}>
          <Bloque icon={<Target className="w-4 h-4" />} titulo="Meta del mes" color="#16a34a">
            <MiniForm campos={[{ k: 'obj', label: 'Meta de ventas (S/)', v: d.objetivoSoles ?? '' }]} ocupado={ocupado === 'obj'} boton="Guardar meta"
              onSubmit={(v) => correr('obj', () => ajustarMesDirecto(marcaSlug, mes, { objetivoSoles: v.obj ? Number(v.obj) : null }), 'Meta guardada')} />
          </Bloque>
          <Bloque icon={<Megaphone className="w-4 h-4" />} titulo={`Facebook Ads · ${d.fuenteMeta === 'auto' ? 'automático' : d.fuenteMeta === 'manual' ? 'a mano' : 'pendiente'}`} color="#7170ff">
            <MiniForm ocupado={ocupado === 'meta'} boton="Guardar Facebook"
              campos={[
                { k: 'usd', label: 'Inversión total (US$)', v: d.fuenteMeta === 'pendiente' ? '' : d.gastoAdsUsd },
                { k: 'leads', label: 'Conversaciones WhatsApp', v: d.fuenteMeta === 'pendiente' ? '' : d.leads },
                { k: 'wpp', label: 'Inversión campañas WhatsApp (US$)', v: raw?.extra?.gastoWhatsAppUsd ?? '' },
              ]}
              onSubmit={(v) => correr('meta', () => guardarMetaManual(marcaSlug, mes, { gastoUsd: Number(v.usd), leads: Number(v.leads), gastoWhatsAppUsd: v.wpp ? Number(v.wpp) : null }), 'Facebook guardado')} />
          </Bloque>
          <Bloque icon={<Wallet className="w-4 h-4" />} titulo={`Ventas totales · ${d.pendienteCliente ? 'falta el cliente' : 'cargadas'}`} color="#2563eb">
            <MiniForm ocupado={ocupado === 'ven'} boton="Guardar ventas"
              campos={[
                { k: 'ped', label: `Pedidos totales (web: ${d.pedidosWeb})`, v: d.pedidosTotales ?? '' },
                { k: 'sol', label: 'Ventas totales (S/)', v: d.solesTotales ?? '' },
              ]}
              onSubmit={(v) => correr('ven', () => guardarVentasEquipo(marcaSlug, mes, Number(v.ped), Number(v.sol)), 'Ventas guardadas')} />
          </Bloque>
        </div>
      )}
    </section>
  )
}

function Bloque({ icon, titulo, color, children }: { icon: React.ReactNode; titulo: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center gap-2 text-[13px] font-bold text-slate-800 mb-3">
        <span className="w-7 h-7 rounded-[8px] inline-flex items-center justify-center" style={{ background: `${color}14`, color }}>{icon}</span>{titulo}
      </div>
      {children}
    </div>
  )
}

function MiniForm({ campos, boton, ocupado, onSubmit }: {
  campos: { k: string; label: string; v: number | string }[]
  boton: string
  ocupado: boolean
  onSubmit: (v: Record<string, string>) => void
}) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(campos.map((c) => [c.k, String(c.v)])))
  return (
    <div className="grid gap-2.5">
      {campos.map((c) => (
        <label key={c.k} className="grid gap-1">
          <span className="text-[11.5px] font-semibold text-slate-500">{c.label}</span>
          <input type="number" min={0} step="0.01" value={vals[c.k]} onChange={(e) => setVals((p) => ({ ...p, [c.k]: e.target.value }))} className={campo} />
        </label>
      ))}
      <button type="button" disabled={ocupado} onClick={() => onSubmit(vals)} className={btnSec}>
        {ocupado && <Loader2 className="w-4 h-4 animate-spin" />} {boton}
      </button>
    </div>
  )
}
