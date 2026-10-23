'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, CalendarDays, LayoutGrid, RefreshCw, TrendingUp, ArrowRight, CheckCircle2, Clapperboard, FolderOpen, KeyRound, ListTodo, Palette, Star } from 'lucide-react'
import type { ClientBrandSpaceData } from '@/lib/cliente/brand-space'
import { MarcaLogo } from '@/components/marca-logo'
import { ReporteMarcaView } from '@/components/reportes/reporte-marca-view'
import { PinGate } from '@/components/reportes/pin-gate'
import { ClientQuickAccess } from './quick-access'

const tabs = ['Resumen', 'Planificación', 'Reportes'] as const
const dateLabel = (date: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' }).format(new Date(date))
export function ClientBrandSpace({ data }: { data: ClientBrandSpaceData }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Resumen')
  const [pending, transition] = useTransition(), router = useRouter()
  const { brand } = data
  return <main className="mx-auto min-h-screen max-w-7xl space-y-5 bg-slate-50/50 p-4 text-slate-900 sm:p-7 lg:p-9">
    <Link href="/cliente?vista=cal" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-700"><ArrowLeft size={16} />Volver a mis publicaciones</Link>
    <header className="flex items-center gap-3 sm:gap-5">
      <div className="rounded-2xl border bg-white p-2"><MarcaLogo slug={brand.slug} nombre={brand.name} emoji={brand.emoji} logoUrl={brand.logo} size={48} /></div>
      <div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase tracking-widest text-violet-600">Portal de marca</p><h1 className="break-words text-2xl font-bold sm:text-3xl">{brand.name}</h1></div>
      <button type="button" onClick={() => transition(() => router.refresh())} disabled={pending} aria-label="Actualizar resumen" className="rounded-xl border bg-white p-3 hover:bg-violet-50"><RefreshCw size={18} className={pending ? 'animate-spin' : ''} /></button>
    </header>
    <nav aria-label="Espacio de tu marca" className="flex gap-2 border-b border-violet-100">{tabs.map(t => <button key={t} type="button" aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)} className={`min-h-12 flex-1 border-b-2 px-2 text-sm font-semibold sm:flex-none sm:px-6 ${tab === t ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{t}</button>)}</nav>
    {tab === 'Resumen' && <ClientBrandOverview data={data} onNavigate={section => { if (section === 'planificacion') setTab('Planificación'); else if (section === 'reporte') setTab('Reportes'); else router.push(`/cliente?vista=${section}`) }} />}
    {tab === 'Planificación' && <section className="space-y-4"><div><h2 className="text-xl font-bold">Planificación compartida contigo</h2><p className="mt-1 text-sm text-slate-500">Abre una hoja para revisar el lienzo y dejar tus comentarios.</p></div><div className="grid gap-3 md:grid-cols-2">{data.sheets.map(s => <SheetLink key={s.id} sheet={s} />)}</div>{!data.sheets.length && <Empty>Tu equipo aún no ha compartido una planificación contigo.</Empty>}</section>}
    {tab === 'Reportes' && <section className="space-y-4"><h2 className="text-xl font-bold">Reportes publicados</h2>{!data.report ? <Empty>Aún no hay reportes publicados para esta marca.</Empty> : data.report.months ? <ReporteMarcaView key={brand.id} nombre={data.report.name} meses={data.report.months} modo="cliente" /> : <PinGate titulo="Reportes de tu marca" />}</section>}
  </main>
}

export type ClientOverviewDestination = 'cal' | 'diseno' | 'planificacion' | 'reporte' | 'tareas' | 'plan' | 'reuniones' | 'stats' | 'influencers'
export type ClientOverviewWork = { tasks: number; designs: number; publications: number }
export function ClientBrandOverview({ data, onNavigate, work, driveUrl, influencersActive = false }: {
  data: ClientBrandSpaceData
  onNavigate: (section: ClientOverviewDestination) => void
  work?: ClientOverviewWork
  driveUrl?: string | null
  influencersActive?: boolean
}) {
  const { brand, counts } = data
  const month = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'America/Lima' }).format(new Date(`${data.month}-15T12:00:00Z`))
  const rows = [
    { title: 'Diseño', detail: 'Piezas en preparación', count: work?.designs ?? Math.max(0, counts.designs - counts.ready), target: 'diseno', Icon: Palette, color: 'text-pink-600 bg-pink-50' },
    ...(work ? [
      { title: 'Videos y publicaciones', detail: 'Contenido por publicar', count: work.publications, target: 'cal', Icon: Clapperboard, color: 'text-blue-600 bg-blue-50' },
      { title: 'Tareas de la marca', detail: 'Pendientes del equipo', count: work.tasks, target: 'tareas', Icon: ListTodo, color: 'text-teal-600 bg-teal-50' },
    ] : []),
  ]
  return <section aria-label="Resumen de la marca" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold tracking-tight">Tu marca, de un vistazo</h2><span className="text-sm capitalize text-slate-500">{month}</span></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      ['Publicadas este mes', counts.published, 'Contenido publicado'], ['Por publicar este mes', counts.scheduled, 'Con fecha programada'], ['Diseños listos', counts.ready, `De ${counts.designs} diseños activos`], ['Planes compartidos', data.sheets.length, 'Disponibles para revisar'],
    ].map(([label, value, detail]) => <div key={String(label)} className="rounded-2xl border border-violet-100 bg-white px-4 py-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[11px] text-slate-400">{detail}</p></div>)}</div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
      <section className="min-w-0 rounded-2xl border border-violet-100 bg-white p-4 md:col-span-7 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-bold">Trabajo en curso</h3>{work && <button type="button" onClick={() => onNavigate('plan')} className="text-xs font-medium text-violet-700 hover:underline">Ver plan de trabajo →</button>}</div>
        <div className="divide-y divide-slate-100">{rows.map(({ title, detail, count, target, Icon, color }) => <button key={target} type="button" onClick={() => onNavigate(target as ClientOverviewDestination)} className="flex w-full items-center gap-3 rounded-lg py-3 text-left hover:bg-slate-50"><span className={`rounded-lg p-2 ${color}`}><Icon size={16} /></span><span className="min-w-0 flex-1"><strong className="block text-sm font-medium text-slate-800">{title}</strong><small className="block text-xs text-slate-400">{detail}</small></span><span className="rounded-lg bg-slate-50 px-2.5 py-1 text-sm font-semibold tabular-nums">{count}</span><ArrowUpRight size={15} className="text-slate-400" /></button>)}</div>
      </section>
      <section className="min-w-0 rounded-2xl border border-violet-100 bg-white p-4 md:col-span-5 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-bold"><CalendarDays size={17} className="text-violet-600" />Próximas reuniones</h3><button type="button" onClick={() => onNavigate('reuniones')} className="text-xs font-medium text-violet-700 hover:underline">Ver agenda →</button></div>
        {data.meetings.length ? <ul className="divide-y divide-slate-100">{data.meetings.slice(0, 3).map(m => <li key={m.id}><Link href={`/cliente?reunion=${m.id}`} className="flex items-center gap-3 rounded-lg py-3 hover:bg-violet-50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg font-semibold text-violet-700">{new Intl.DateTimeFormat('es-PE', { day: 'numeric', timeZone: 'America/Lima' }).format(new Date(m.fecha_hora))}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{m.titulo}</strong><small className="mt-1 block text-xs text-slate-500">{dateLabel(m.fecha_hora)} · {new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Lima' }).format(new Date(m.fecha_hora))} · Lima</small></span><ArrowUpRight size={15} className="shrink-0 text-slate-400" /></Link></li>)}</ul> : <Empty>No tienes reuniones próximas programadas.</Empty>}
      </section>
      <section className="min-w-0 rounded-2xl border border-violet-100 bg-white p-4 md:col-span-7 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-bold"><LayoutGrid size={17} className="text-violet-600" />Planificación compartida</h3>{data.sheets.length > 2 && <button type="button" onClick={() => onNavigate('planificacion')} className="text-xs font-medium text-violet-700 hover:underline">Ver todas →</button>}</div>
        {data.sheets.length ? <div className="grid gap-2 sm:grid-cols-2">{data.sheets.slice(0, 2).map(s => <SheetLink key={s.id} sheet={s} />)}</div> : <Empty>Tu equipo aún no ha compartido una planificación contigo. Aquí podrás abrir sus lienzos y comentar.</Empty>}
    <section aria-label="Resultados de la marca" className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
      <button type="button" onClick={() => onNavigate('reporte')} className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-violet-50"><TrendingUp size={19} className="shrink-0 text-violet-600" /><span className="min-w-0 flex-1"><strong className="text-sm">Reportes de tu marca</strong><small className="block text-xs text-slate-500">{data.report ? `${data.report.count} periodos publicados para consultar` : 'Pendiente de publicación por el equipo'}</small></span><ArrowUpRight size={16} className="shrink-0 text-slate-400" /></button>
      <button type="button" onClick={() => onNavigate('stats')} className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-violet-50"><CheckCircle2 size={19} className="shrink-0 text-teal-600" /><span className="min-w-0 flex-1"><strong className="text-sm">Avance del contenido</strong><small className="block text-xs text-slate-500">Publicaciones, entregas y aprobaciones</small></span><ArrowUpRight size={16} className="shrink-0 text-slate-400" /></button>
    </section>
      </section>
      <section className="min-w-0 rounded-2xl border border-violet-100 bg-white p-4 md:col-span-5 sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 font-bold"><KeyRound size={17} className="text-violet-600" />{brand.slug === 'little-joe' ? 'Catálogos y accesos' : 'Archivos y accesos'}</h3>
        {brand.slug === 'little-joe' && <ClientQuickAccess key={brand.id} marcaId={brand.id} marcaSlug={brand.slug} portalLink={false} compact />}
        {driveUrl && <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg py-2 text-sm text-slate-600 hover:text-violet-700"><FolderOpen size={16} /><span className="flex-1">Archivos de la marca · Drive</span><ArrowUpRight size={14} /></a>}
        {influencersActive && <button type="button" onClick={() => onNavigate('influencers')} className="flex w-full items-center gap-2 rounded-lg py-2 text-left text-sm text-slate-600 hover:text-violet-700"><Star size={16} /><span className="flex-1">Colaboraciones e influencers</span><ArrowRight size={14} /></button>}
        {brand.slug !== 'little-joe' && !driveUrl && !influencersActive && <Empty>Aquí aparecerán los archivos y accesos compartidos de tu marca.</Empty>}
      </section>
    </div>

  </section>
}

function SheetLink({ sheet }: { sheet: ClientBrandSpaceData['sheets'][number] }) {
  return <Link href={`/cliente/planificacion/${sheet.id}`} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-4 hover:border-violet-300"><div className="min-w-0"><strong className="block break-words text-sm">{sheet.title}</strong><p className="mt-1 text-xs text-slate-500">Actualizada el {dateLabel(sheet.updated_at)}</p></div><ArrowUpRight size={16} className="shrink-0 text-violet-600" /></Link>
}
function Empty({ children }: { children: React.ReactNode }) { return <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">{children}</p> }
