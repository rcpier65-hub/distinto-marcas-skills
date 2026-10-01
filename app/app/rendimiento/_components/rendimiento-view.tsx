'use client'

/* Rendimiento del equipo — vista estilo "Tiempo en pantalla" de Apple:
   número grande, barras apiladas por marca y leyenda con totales. */

import Link from 'next/link'
import { useMemo } from 'react'
import {
  Activity, ChevronLeft, ChevronRight, Settings2, Users, User, Building2, Workflow,
  Clapperboard, Palette, ListChecks, Clock, AlertTriangle, TrendingUp, TrendingDown, Info, ExternalLink,
} from 'lucide-react'
import type { DatosRendimiento, Registro, Miembro, Hecho } from '@/lib/rendimiento/datos'

export type Vista = 'equipo' | 'persona' | 'marcas' | 'flujo'

const ACENTO = '#7170ff'
const INICIO_CRONOMETRO = '2026-09-24'

/* ===== utilidades ===== */
function fmtHM(seg: number): string {
  const min = Math.round(seg / 60)
  const h = Math.floor(min / 60), m = min % 60
  if (h === 0) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}
function fmtHorasCorto(h: number | null): string {
  if (h == null) return '—'
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)} h`
  return `${(h / 24).toFixed(1)} días`
}
function diaSemana(ymd: string): number { const d = new Date(ymd + 'T12:00:00Z').getUTCDay(); return d === 0 ? 7 : d }
function disponibles(m: Miembro, dias: string[]) { return dias.filter((d) => m.diasLaborales.includes(diaSemana(d))).length * m.horasDia }
function nombreCorto(n: string) { const p = n.split(' ')[0]; return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() }
function mediana(xs: number[]) { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
function etiquetaDia(ymd: string, periodo: string) {
  const d = new Date(ymd + 'T12:00:00Z')
  return periodo === 'mes' ? String(d.getUTCDate()) : d.toLocaleDateString('es-PE', { timeZone: 'UTC', weekday: 'narrow' })
}

export function RendimientoView({ datos, vista, personaId, hoy }: { datos: DatosRendimiento; vista: Vista; personaId: string | null; hoy: string }) {
  const { rango } = datos
  const url = (p: Partial<{ vista: string; periodo: string; fecha: string; persona: string | null }>) => {
    const q = new URLSearchParams()
    q.set('vista', p.vista ?? vista)
    q.set('periodo', p.periodo ?? rango.periodo)
    q.set('fecha', p.fecha ?? rango.ref)
    const per = p.persona === undefined ? personaId : p.persona
    if (per) q.set('persona', per)
    return `/rendimiento?${q.toString()}`
  }
  const persona = datos.miembros.find((m) => m.id === personaId) ?? null
  const mostrarAviso = rango.desde < INICIO_CRONOMETRO

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-5">
      {/* Encabezado */}
      <header className="flex items-center gap-3 flex-wrap">
        <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
          <Activity className="w-5 h-5" strokeWidth={2.2} />
        </span>
        <div className="flex-1 min-w-[160px]">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rendimiento</h1>
          <p className="text-[13px] text-slate-500">Solo tú ves esta sección</p>
        </div>
        <Link href="/rendimiento/configuracion" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
          <Settings2 className="w-4 h-4" /> Configuración
        </Link>
      </header>

      {/* Pestañas + período */}
      <div className="flex items-center gap-3 flex-wrap">
        <nav className="inline-flex p-1 rounded-full border border-slate-200 bg-slate-50 gap-1">
          {([['equipo', 'Equipo', Users], ['persona', 'Persona', User], ['marcas', 'Marcas', Building2], ['flujo', 'Flujo', Workflow]] as const).map(([v, label, Icon]) => (
            <Link key={v} href={url({ vista: v, persona: v === 'persona' ? personaId ?? datos.miembros[0]?.id ?? null : personaId })}
              className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold transition-all ${vista === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              style={vista === v ? { boxShadow: `0 0 0 1.5px ${ACENTO}55, 0 1px 3px rgba(15,23,42,0.08)`, color: ACENTO } : undefined}>
              <Icon className="w-4 h-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        <nav className="inline-flex p-1 rounded-full border border-slate-200 bg-slate-50 gap-1">
          {([['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']] as const).map(([p, label]) => (
            <Link key={p} href={url({ periodo: p })}
              className={`h-8 px-3.5 inline-flex items-center rounded-full text-[13px] font-semibold ${rango.periodo === p ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>{label}</Link>
          ))}
        </nav>
        <div className="inline-flex items-center gap-1">
          <Link href={url({ fecha: rango.anterior })} aria-label="Anterior" className="w-9 h-9 inline-flex items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></Link>
          <span className="min-w-[170px] text-center text-[13.5px] font-semibold text-slate-800 capitalize">{rango.label}</span>
          <Link href={url({ fecha: rango.siguiente })} aria-label="Siguiente" className="w-9 h-9 inline-flex items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></Link>
          <Link href={url({ fecha: hoy })} className="h-9 px-3.5 inline-flex items-center rounded-[10px] border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50">Hoy</Link>
        </div>
      </div>

      {mostrarAviso && (vista === 'equipo' || vista === 'persona') && (
        <p className="flex items-start gap-2 text-[12.5px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          El cronómetro de tareas empezó el 24 de septiembre. Antes de esa fecha, las horas solo incluyen el tiempo de edición de videos.
        </p>
      )}

      {vista === 'equipo' && <VistaEquipo datos={datos} url={url} />}
      {vista === 'persona' && <VistaPersona datos={datos} persona={persona ?? datos.miembros[0] ?? null} url={url} />}
      {vista === 'marcas' && <VistaMarcas datos={datos} />}
      {vista === 'flujo' && <VistaFlujo datos={datos} />}
    </main>
  )
}

/* ============ Gráfico estilo Apple ============ */
function GraficoUso({ datos, registros, titulo }: { datos: DatosRendimiento; registros: Registro[]; titulo: string }) {
  const { rango } = datos
  const porHora = rango.periodo === 'dia'
  const buckets = porHora ? Array.from({ length: 24 }, (_, h) => String(h)) : rango.dias
  const total = registros.reduce((a, r) => a + r.seg, 0)

  /* Marcas principales (top 6) y "Otras". */
  const totPorMarca = new Map<string, number>()
  for (const r of registros) totPorMarca.set(r.marca, (totPorMarca.get(r.marca) ?? 0) + r.seg)
  const orden = [...totPorMarca.entries()].sort((a, b) => b[1] - a[1])
  const principales = orden.slice(0, 6).map(([m]) => m)
  const colorDe = (m: string) => principales.includes(m) ? datos.marcas[m]?.color ?? '#94a3b8' : '#cbd5e1'
  const grupo = (m: string) => principales.includes(m) ? m : 'Otras'

  const matriz = buckets.map((b) => {
    const segs = new Map<string, number>()
    for (const r of registros) if ((porHora ? String(r.hora) : r.dia) === b) segs.set(grupo(r.marca), (segs.get(grupo(r.marca)) ?? 0) + r.seg)
    return { b, segs, tot: [...segs.values()].reduce((a, x) => a + x, 0) }
  })
  const max = Math.max(1, ...matriz.map((x) => x.tot))
  const conDatos = matriz.filter((x) => x.tot > 0)
  const promedio = conDatos.length ? conDatos.reduce((a, x) => a + x.tot, 0) / conDatos.length : 0
  const tope = Math.ceil(max / 3600) * 3600 || 3600
  const leyenda = [...principales, ...(orden.length > 6 ? ['Otras'] : [])]
  const totLeyenda = (m: string) => m === 'Otras' ? orden.slice(6).reduce((a, [, s]) => a + s, 0) : totPorMarca.get(m) ?? 0

  return (
    <section className="rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="text-[13px] font-semibold text-slate-500">{titulo}</div>
      <div className="text-[34px] font-bold tracking-tight text-slate-900 leading-tight">{fmtHM(total)}</div>
      <div className="text-[12.5px] text-slate-500 mb-4">
        {porHora ? 'Por hora del día' : `Promedio por día con trabajo: ${fmtHM(promedio)}`}
      </div>
      <div className="relative" style={{ height: 180 }}>
        {[1, 0.5].map((f) => (
          <div key={f} className="absolute left-0 right-10 border-t border-dashed border-slate-200" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -right-10 -top-2.5 text-[11px] text-slate-400">{fmtHorasCorto((tope * f) / 3600)}</span>
          </div>
        ))}
        {promedio > 0 && !porHora && (
          <div className="absolute left-0 right-10 border-t-2 border-dashed" style={{ bottom: `${(promedio / tope) * 100}%`, borderColor: '#10b98199' }}>
            <span className="absolute -right-10 -top-2.5 text-[11px] font-semibold" style={{ color: '#10b981' }}>prom</span>
          </div>
        )}
        <div className="absolute inset-0 right-10 flex items-end gap-[3px]">
          {matriz.map(({ b, segs, tot }) => (
            <div key={b} className="flex-1 h-full flex flex-col justify-end" title={`${porHora ? `${b}:00` : b} · ${fmtHM(tot)}`}>
              <div className="w-full rounded-t-[5px] overflow-hidden flex flex-col-reverse" style={{ height: `${(tot / tope) * 100}%`, minHeight: tot > 0 ? 3 : 0, background: '#f1f5f9' }}>
                {[...segs.entries()].map(([m, s]) => (
                  <div key={m} style={{ height: `${(s / tot) * 100}%`, background: m === 'Otras' ? '#cbd5e1' : colorDe(m) }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-[3px] mr-10 mt-1.5">
        {buckets.map((b, i) => (
          <span key={b} className="flex-1 text-center text-[10.5px] text-slate-400">
            {porHora ? (i % 6 === 0 ? `${b}h` : '') : (rango.periodo === 'mes' && i % 5 !== 0 ? '' : etiquetaDia(b, rango.periodo))}
          </span>
        ))}
      </div>
      {leyenda.length > 0 && (
        <div className="grid gap-x-6 gap-y-3 mt-5 pt-4 border-t border-slate-100" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {leyenda.map((m) => (
            <div key={m}>
              <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: m === 'Otras' ? '#cbd5e1' : colorDe(m) }} />
                <span className="truncate">{m}</span>
              </div>
              <div className="text-[15px] font-semibold text-slate-900 mt-0.5">{fmtHM(totLeyenda(m))}</div>
            </div>
          ))}
        </div>
      )}
      {total === 0 && <p className="text-[13px] text-slate-400 text-center py-2">Sin horas registradas en este período.</p>}
    </section>
  )
}

/* ============ Tarjetas pequeñas ============ */
function Kpi({ icon, label, valor, sub, color = ACENTO }: { icon: React.ReactNode; label: string; valor: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-[16px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-500">
        <span className="w-7 h-7 rounded-[8px] inline-flex items-center justify-center" style={{ background: `${color}14`, color }}>{icon}</span>{label}
      </div>
      <div className="text-[24px] font-bold text-slate-900 mt-2 leading-none">{valor}</div>
      {sub && <div className="text-[12px] text-slate-500 mt-1.5">{sub}</div>}
    </div>
  )
}

function aTiempoTxt(hs: Hecho[]) {
  const con = hs.filter((h) => h.aTiempo !== null)
  if (!con.length) return { pct: null as number | null, txt: 'sin fechas comprometidas' }
  const pct = Math.round((con.filter((h) => h.aTiempo).length / con.length) * 100)
  return { pct, txt: `${pct}% a tiempo (${con.length} con fecha)` }
}

function semaforo(util: number | null, vencidas: number) {
  if (vencidas >= 3 || (util != null && util > 1.1)) return { color: '#ef4444', bg: '#fef2f2', txt: 'Sobrecargado' }
  if (util != null && util < 0.4) return { color: '#f59e0b', bg: '#fffbeb', txt: 'Poca carga registrada' }
  return { color: '#10b981', bg: '#f0fdf4', txt: 'Carga normal' }
}

/* ============ Vista EQUIPO ============ */
function VistaEquipo({ datos, url }: { datos: DatosRendimiento; url: (p: Partial<{ vista: string; persona: string | null }>) => string }) {
  const { hechos, rango } = datos
  const videos = hechos.filter((h) => h.tipo === 'video')
  const disenos = hechos.filter((h) => h.tipo === 'diseno')
  const tareas = hechos.filter((h) => h.tipo === 'tarea')
  const tiempo = aTiempoTxt(hechos)
  return (
    <div className="space-y-5">
      <GraficoUso datos={datos} registros={datos.registros} titulo="Horas registradas del equipo" />
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <Kpi icon={<Clapperboard className="w-4 h-4" />} label="Videos editados" valor={String(videos.length)}
          sub={videos.length ? `Edición típica: ${fmtHorasCorto((mediana(videos.map((v) => v.minutos ?? 0).filter(Boolean)) ?? 0) / 60)}` : undefined} />
        <Kpi icon={<Palette className="w-4 h-4" />} label="Diseños terminados" valor={String(disenos.length)} color="#db2777" />
        <Kpi icon={<ListChecks className="w-4 h-4" />} label="Tareas hechas" valor={String(tareas.length)} color="#0284c7" />
        <Kpi icon={<Clock className="w-4 h-4" />} label="Entregas a tiempo" valor={tiempo.pct == null ? '—' : `${tiempo.pct}%`} sub={tiempo.txt} color="#10b981" />
      </div>
      <section>
        <h2 className="text-[15px] font-bold text-slate-900 mb-3">Por persona</h2>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
          {datos.miembros.map((m) => {
            const seg = datos.registros.filter((r) => r.miembroId === m.id).reduce((a, r) => a + r.seg, 0)
            const disp = disponibles(m, rango.dias)
            const util = disp > 0 ? seg / 3600 / disp : null
            const hs = hechos.filter((h) => h.miembroId === m.id)
            const p = datos.pendientes[m.id] ?? { tareas: 0, vencidas: 0, ediciones: 0 }
            const sem = semaforo(util, p.vencidas)
            return (
              <Link key={m.id} href={url({ vista: 'persona', persona: m.id })}
                className="rounded-[16px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] hover:shadow-md transition-shadow block">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full inline-flex items-center justify-center text-[15px] font-bold" style={{ background: '#ede9fe', color: ACENTO }}>
                    {m.nombre.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-bold text-slate-900 truncate">{nombreCorto(m.nombre)}</div>
                    <div className="text-[12px] text-slate-500 capitalize">{(m.rol ?? '').replace('_', ' ') || 'Equipo'}</div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ color: sem.color, background: sem.bg }}>● {sem.txt}</span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-[22px] font-bold text-slate-900 leading-none">{fmtHM(seg)}</div>
                    <div className="text-[12px] text-slate-500 mt-1">{util != null ? `${Math.round(util * 100)}% de ${disp} h disponibles` : 'Sin horario'}</div>
                  </div>
                  <div className="text-right text-[12px] text-slate-500 leading-5">
                    {hs.filter((h) => h.tipo === 'video').length > 0 && <div>{hs.filter((h) => h.tipo === 'video').length} videos</div>}
                    {hs.filter((h) => h.tipo === 'diseno').length > 0 && <div>{hs.filter((h) => h.tipo === 'diseno').length} diseños</div>}
                    <div>{hs.filter((h) => h.tipo === 'tarea').length} tareas</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((util ?? 0) * 100))}%`, background: sem.color }} />
                </div>
                <div className="mt-2.5 text-[12px] text-slate-500 flex gap-3 flex-wrap">
                  <span>{p.tareas} pendientes</span>
                  {p.vencidas > 0 && <span className="text-red-500 font-semibold">{p.vencidas} vencidas</span>}
                  {p.ediciones > 0 && <span>{p.ediciones} videos por editar</span>}
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

/* ============ Vista PERSONA ============ */
function VistaPersona({ datos, persona, url }: { datos: DatosRendimiento; persona: Miembro | null; url: (p: Partial<{ vista: string; persona: string | null }>) => string }) {
  const regs = useMemo(() => datos.registros.filter((r) => r.miembroId === persona?.id), [datos, persona])
  if (!persona) return <p className="text-slate-500">No hay personas en el equipo.</p>
  const seg = regs.reduce((a, r) => a + r.seg, 0)
  const disp = disponibles(persona, datos.rango.dias)
  const util = disp > 0 ? seg / 3600 / disp : null
  const hs = datos.hechos.filter((h) => h.miembroId === persona.id)
  const videos = hs.filter((h) => h.tipo === 'video')
  const disenos = hs.filter((h) => h.tipo === 'diseno')
  const edTipica = mediana(videos.map((v) => v.minutos ?? 0).filter((x) => x > 0 && x < 24 * 60))
  const disTipico = mediana(disenos.map((v) => v.minutos ?? 0).filter((x) => x > 0))
  const prev = datos.registrosPrevios.filter((r) => r.miembroId === persona.id).reduce((a, r) => a + r.seg, 0) / 4
  const tendencia = prev > 0 ? seg / prev - 1 : null
  const p = datos.pendientes[persona.id] ?? { tareas: 0, vencidas: 0, ediciones: 0 }
  const tiempo = aTiempoTxt(hs)
  const porTipo = { tarea: regs.filter((r) => r.tipo === 'tarea').reduce((a, r) => a + r.seg, 0), edicion: regs.filter((r) => r.tipo === 'edicion').reduce((a, r) => a + r.seg, 0) }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {datos.miembros.map((m) => (
          <Link key={m.id} href={url({ persona: m.id })}
            className={`inline-flex items-center gap-2 h-9 pl-1.5 pr-3.5 rounded-full border text-[13px] font-semibold transition-colors ${m.id === persona.id ? 'bg-white text-slate-900' : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-900'}`}
            style={m.id === persona.id ? { borderColor: ACENTO, boxShadow: `0 0 0 3px ${ACENTO}1f` } : undefined}>
            <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-bold" style={{ background: '#ede9fe', color: ACENTO }}>{m.nombre.charAt(0).toUpperCase()}</span>
            {nombreCorto(m.nombre)}
          </Link>
        ))}
      </div>
      <GraficoUso datos={datos} registros={regs} titulo={`Horas registradas · ${nombreCorto(persona.nombre)}`} />
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <Kpi icon={<Activity className="w-4 h-4" />} label="Uso de su horario" valor={util != null ? `${Math.round(util * 100)}%` : '—'} sub={`${fmtHM(seg)} de ${disp} h disponibles`} />
        <Kpi icon={tendencia != null && tendencia < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />} label="Frente a su promedio"
          valor={tendencia == null ? '—' : `${tendencia >= 0 ? '+' : ''}${Math.round(tendencia * 100)}%`}
          sub="comparado con sus últimos 4 períodos" color={tendencia != null && tendencia < 0 ? '#f59e0b' : '#10b981'} />
        <Kpi icon={<Clock className="w-4 h-4" />} label="Entregas a tiempo" valor={tiempo.pct == null ? '—' : `${tiempo.pct}%`} sub={tiempo.txt} color="#10b981" />
        <Kpi icon={<AlertTriangle className="w-4 h-4" />} label="Pendientes" valor={String(p.tareas + p.ediciones)}
          sub={`${p.vencidas} vencidas · ${p.ediciones} videos por editar`} color={p.vencidas ? '#ef4444' : '#64748b'} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
          <h3 className="text-[15px] font-bold text-slate-900 mb-3">En qué se fue el tiempo</h3>
          <BarraReparto items={[{ label: 'Tareas (cronómetro)', seg: porTipo.tarea, color: '#0284c7' }, { label: 'Edición de videos', seg: porTipo.edicion, color: ACENTO }]} />
          <div className="mt-4 grid gap-2 text-[13px]">
            {videos.length > 0 && <Fila label="Videos editados" valor={`${videos.length} · típico ${fmtHorasCorto((edTipica ?? 0) / 60)}`} />}
            {disenos.length > 0 && <Fila label="Diseños terminados" valor={`${disenos.length} · ciclo típico ${fmtHorasCorto((disTipico ?? 0) / 60)}`} />}
            <Fila label="Tareas hechas" valor={String(hs.filter((h) => h.tipo === 'tarea').length)} />
          </div>
        </section>
        <section className="rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
          <h3 className="text-[15px] font-bold text-slate-900 mb-3">Por marca</h3>
          <RepartoMarcas datos={datos} registros={regs} />
        </section>
      </div>
    </div>
  )
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return <div className="flex justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0"><span className="text-slate-500">{label}</span><span className="font-semibold text-slate-900">{valor}</span></div>
}
function BarraReparto({ items }: { items: { label: string; seg: number; color: string }[] }) {
  const tot = items.reduce((a, i) => a + i.seg, 0)
  return (
    <div>
      <div className="h-3 rounded-full overflow-hidden flex bg-slate-100">
        {items.filter((i) => i.seg > 0).map((i) => <div key={i.label} style={{ width: `${(i.seg / (tot || 1)) * 100}%`, background: i.color }} />)}
      </div>
      <div className="flex gap-4 mt-2 flex-wrap">
        {items.map((i) => (
          <span key={i.label} className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: i.color }} />{i.label} · <b className="text-slate-800">{fmtHM(i.seg)}</b>
          </span>
        ))}
      </div>
    </div>
  )
}
function RepartoMarcas({ datos, registros }: { datos: DatosRendimiento; registros: Registro[] }) {
  const tot = new Map<string, number>()
  for (const r of registros) tot.set(r.marca, (tot.get(r.marca) ?? 0) + r.seg)
  const filas = [...tot.entries()].sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...filas.map(([, s]) => s))
  if (!filas.length) return <p className="text-[13px] text-slate-400">Sin horas registradas.</p>
  return (
    <div className="grid gap-2.5">
      {filas.map(([m, s]) => (
        <div key={m}>
          <div className="flex justify-between text-[12.5px]"><span className="text-slate-600 truncate">{m}</span><span className="font-semibold text-slate-900">{fmtHM(s)}</span></div>
          <div className="h-2 rounded-full bg-slate-100 mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(s / max) * 100}%`, background: datos.marcas[m]?.color ?? '#94a3b8' }} /></div>
        </div>
      ))}
    </div>
  )
}

/* ============ Vista MARCAS ============ */
function VistaMarcas({ datos }: { datos: DatosRendimiento }) {
  const { registros, hechos, rango, correcciones, aprobacionCliente, miembros } = datos
  const costoHora = new Map(miembros.map((m) => [m.id, m.costoHora]))
  const nombres = new Set<string>([...registros.map((r) => r.marca), ...hechos.map((h) => h.marca)])
  const filas = [...nombres].map((n) => {
    const regs = registros.filter((r) => r.marca === n)
    const seg = regs.reduce((a, r) => a + r.seg, 0)
    const costo = regs.reduce((a, r) => a + (r.seg / 3600) * (costoHora.get(r.miembroId) ?? 0), 0)
    const hs = hechos.filter((h) => h.marca === n)
    const c = correcciones.porMarca[n]
    const ap = mediana(aprobacionCliente.porMarca[n] ?? [])
    const info = datos.marcas[n]
    const tieneCostos = regs.some((r) => (costoHora.get(r.miembroId) ?? 0) > 0)
    return { n, seg, costo, tieneCostos, videos: hs.filter((h) => h.tipo === 'video').length, disenos: hs.filter((h) => h.tipo === 'diseno').length,
      tareas: hs.filter((h) => h.tipo === 'tarea').length, rondas: c && c.pubs ? c.rondas / c.pubs : null, ap, fee: info?.fee ?? null, color: info?.color ?? '#94a3b8' }
  }).sort((a, b) => b.seg - a.seg)
  const totSeg = filas.reduce((a, f) => a + f.seg, 0)
  const esMes = rango.periodo === 'mes'

  return (
    <div className="space-y-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <Kpi icon={<Clock className="w-4 h-4" />} label="Horas en marcas" valor={fmtHM(totSeg)} />
        <Kpi icon={<AlertTriangle className="w-4 h-4" />} label="Correcciones por video" color="#f59e0b"
          valor={correcciones.total.pubs ? (correcciones.total.rondas / correcciones.total.pubs).toFixed(1) : '—'}
          sub={`${correcciones.total.pubs} videos enviados a aprobar`} />
        <Kpi icon={<Clock className="w-4 h-4" />} label="Aprobación del cliente" color="#10b981"
          valor={fmtHorasCorto(mediana(aprobacionCliente.horas))} sub={`tiempo típico · ${aprobacionCliente.horas.length} aprobados en el portal`} />
      </div>
      <section className="rounded-[18px] border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] overflow-x-auto">
        <table className="w-full text-[13px] min-w-[820px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
              <th className="px-4 py-3 font-semibold">Marca</th>
              <th className="px-3 py-3 font-semibold">Horas</th>
              <th className="px-3 py-3 font-semibold">% del equipo</th>
              <th className="px-3 py-3 font-semibold">Videos</th>
              <th className="px-3 py-3 font-semibold">Diseños</th>
              <th className="px-3 py-3 font-semibold">Tareas</th>
              <th className="px-3 py-3 font-semibold">Correcciones</th>
              <th className="px-3 py-3 font-semibold">Aprobación</th>
              <th className="px-4 py-3 font-semibold">Rentabilidad</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const margen = esMes && f.fee != null && f.tieneCostos ? f.fee - f.costo : null
              return (
                <tr key={f.n} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2 font-semibold text-slate-900"><span className="w-2.5 h-2.5 rounded-full" style={{ background: f.color }} />{f.n}</span></td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{fmtHM(f.seg)}</td>
                  <td className="px-3 py-3 text-slate-600">
                    <div className="flex items-center gap-2"><div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full" style={{ width: `${totSeg ? (f.seg / totSeg) * 100 : 0}%`, background: f.color }} /></div>{totSeg ? Math.round((f.seg / totSeg) * 100) : 0}%</div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{f.videos || '—'}</td>
                  <td className="px-3 py-3 text-slate-600">{f.disenos || '—'}</td>
                  <td className="px-3 py-3 text-slate-600">{f.tareas || '—'}</td>
                  <td className="px-3 py-3" style={{ color: f.rondas != null && f.rondas > 1.5 ? '#dc2626' : '#475569' }}>{f.rondas != null ? `${f.rondas.toFixed(1)} por video` : '—'}</td>
                  <td className="px-3 py-3 text-slate-600">{fmtHorasCorto(f.ap)}</td>
                  <td className="px-4 py-3">
                    {margen != null
                      ? <span className="font-semibold" style={{ color: margen >= 0 ? '#059669' : '#dc2626' }}>S/ {Math.round(margen).toLocaleString('es-PE')} <span className="text-slate-400 font-normal">({f.fee ? Math.round((margen / f.fee) * 100) : 0}%)</span></span>
                      : <span className="text-slate-400 text-[12px]">{!esMes ? 'Ver en "Mes"' : f.fee == null ? 'Falta pago mensual' : 'Falta costo por hora'}</span>}
                  </td>
                </tr>
              )
            })}
            {filas.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Sin actividad en este período.</td></tr>}
          </tbody>
        </table>
      </section>
      <p className="text-[12px] text-slate-500 flex items-start gap-2"><Info className="w-4 h-4 shrink-0" />
        La rentabilidad = pago mensual de la marca − (horas de cada persona × su costo por hora). Se cargan en Configuración.</p>
    </div>
  )
}

/* ============ Vista FLUJO ============ */
function VistaFlujo({ datos }: { datos: DatosRendimiento }) {
  const etapas = datos.flujo.etapas
  const cuello = [...etapas].sort((a, b) => b.enCola - a.enCola)[0]
  return (
    <div className="space-y-5">
      {cuello && cuello.enCola > 0 && (
        <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Cuello de botella: <b>{cuello.label}</b> — {cuello.enCola} publicaciones esperando{cuello.masViejas[0] ? `, la más antigua lleva ${cuello.masViejas[0].dias} días` : ''}.
        </div>
      )}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {etapas.map((e, i) => (
          <div key={e.estado} className="rounded-[16px] border bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] relative"
            style={{ borderColor: e === cuello && e.enCola > 0 ? '#fbbf24' : '#e2e8f0cc' }}>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Etapa {i + 1}</div>
            <div className="text-[14px] font-bold text-slate-900 mt-0.5">{e.label}</div>
            <div className="text-[26px] font-bold text-slate-900 mt-2 leading-none">{e.enCola}</div>
            <div className="text-[12px] text-slate-500">en cola ahora</div>
            <div className="mt-2 text-[12px] text-slate-500">Se queda típicamente <b className="text-slate-800">{fmtHorasCorto(e.medianaHoras)}</b></div>
          </div>
        ))}
      </div>
      <section className="rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <h3 className="text-[15px] font-bold text-slate-900 mb-3">Las más trabadas por etapa</h3>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {etapas.filter((e) => e.masViejas.length).map((e) => (
            <div key={e.estado}>
              <div className="text-[12.5px] font-semibold text-slate-500 mb-1.5">{e.label}</div>
              <div className="grid gap-1">
                {e.masViejas.map((p) => (
                  <Link key={p.id} href={`/publicaciones/${p.id}`} className="flex items-center gap-2 text-[13px] py-1.5 px-2 rounded-lg hover:bg-slate-50">
                    <span className="flex-1 min-w-0 truncate text-slate-800">{p.nombre} <span className="text-slate-400">· {p.marca}</span></span>
                    <span className="text-[12px] font-semibold shrink-0" style={{ color: p.dias > 7 ? '#dc2626' : '#64748b' }}>{p.dias} d</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <p className="text-[12px] text-slate-500 flex items-start gap-2"><Info className="w-4 h-4 shrink-0" />
        Tiempo por etapa: mediana entre cambios de estado registrados en los últimos 60 días. «En cola» es lo que está hoy en cada estado.</p>
    </div>
  )
}
