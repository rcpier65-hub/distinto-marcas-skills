'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, CalendarDays, LayoutGrid, RefreshCw, TrendingUp } from 'lucide-react'
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
  const { brand, counts } = data
  const month = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'America/Lima' }).format(new Date(`${data.month}-15T12:00:00Z`))
  return <main className="mx-auto min-h-screen max-w-7xl space-y-5 bg-slate-50/50 p-4 text-slate-900 sm:p-7 lg:p-9">
    <Link href="/cliente" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-700"><ArrowLeft size={16} />Volver a mis publicaciones</Link>
    <header className="flex items-center gap-3 sm:gap-5">
      <div className="rounded-2xl border bg-white p-2"><MarcaLogo slug={brand.slug} nombre={brand.name} emoji={brand.emoji} logoUrl={brand.logo} size={48} /></div>
      <div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase tracking-widest text-violet-600">Portal de marca</p><h1 className="break-words text-2xl font-bold sm:text-3xl">{brand.name}</h1></div>
      <button type="button" onClick={() => transition(() => router.refresh())} disabled={pending} aria-label="Actualizar resumen" className="rounded-xl border bg-white p-3 hover:bg-violet-50"><RefreshCw size={18} className={pending ? 'animate-spin' : ''} /></button>
    </header>
    <nav aria-label="Espacio de tu marca" className="flex gap-2 border-b border-violet-100">{tabs.map(t => <button key={t} type="button" aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)} className={`min-h-12 flex-1 border-b-2 px-2 text-sm font-semibold sm:flex-none sm:px-6 ${tab === t ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>{t}</button>)}</nav>
    {tab === 'Resumen' && <>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Tu marca, de un vistazo</h2><span className="rounded-full border bg-white px-3 py-1 text-sm capitalize">{month}</span></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        ['Publicaciones del mes', counts.published, 'Ya publicadas'], ['Por publicar', counts.scheduled, 'Programadas este mes'], ['Diseños listos', counts.ready, `De ${counts.designs} diseños activos`], ['Planes compartidos', data.sheets.length, 'Disponibles para revisar'],
      ].map(([label, value, detail]) => <div key={String(label)} className="rounded-2xl border bg-white p-4 sm:p-5"><p className="text-sm text-slate-600">{label}</p><p className="my-2 text-3xl font-bold">{value}</p><p className="text-xs text-slate-500">{detail}</p></div>)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-bold"><LayoutGrid size={18} className="text-violet-600" />Planificación compartida</h2><button onClick={() => setTab('Planificación')} className="text-sm text-violet-700">Ver todo →</button></div>
          {data.sheets.length ? <div className="space-y-2">{data.sheets.slice(0, 3).map(s => <SheetLink key={s.id} sheet={s} />)}</div> : <Empty>Tu equipo aún no ha compartido una planificación contigo.</Empty>}
        </section>
        <section className="rounded-2xl border bg-white p-5"><h2 className="mb-4 flex items-center gap-2 font-bold"><CalendarDays size={18} className="text-violet-600" />Próximas reuniones</h2>
          {data.meetings.length ? <ul className="space-y-3">{data.meetings.map(m => <li key={m.id}><Link href={`/cliente?reunion=${m.id}`} className="flex items-center justify-between gap-3 rounded-xl border p-3 hover:bg-violet-50"><div><strong className="text-sm">{m.titulo}</strong><p className="mt-1 text-xs text-slate-500">{dateLabel(m.fecha_hora)} · {new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Lima' }).format(new Date(m.fecha_hora))} · Lima</p></div><ArrowUpRight size={16} className="shrink-0" /></Link></li>)}</ul> : <Empty>No tienes reuniones próximas programadas.</Empty>}
        </section>
      </div>
      <button type="button" onClick={() => setTab('Reportes')} className="flex w-full items-center gap-3 rounded-2xl border bg-white p-5 text-left hover:border-violet-300"><TrendingUp className="text-violet-600" /><span className="flex-1"><strong>Reportes de tu marca</strong><small className="mt-1 block text-slate-500">{data.report ? `${data.report.count} periodos publicados para consultar` : 'Los reportes aparecerán cuando el equipo los publique'}</small></span><ArrowUpRight size={18} /></button>
      {brand.slug === 'little-joe' && <ClientQuickAccess key={brand.id} marcaId={brand.id} marcaSlug={brand.slug} portalLink={false} />}
    </>}
    {tab === 'Planificación' && <section className="space-y-4"><div><h2 className="text-xl font-bold">Planificación compartida contigo</h2><p className="mt-1 text-sm text-slate-500">Abre una hoja para revisar el lienzo y dejar tus comentarios.</p></div><div className="grid gap-3 md:grid-cols-2">{data.sheets.map(s => <SheetLink key={s.id} sheet={s} />)}</div>{!data.sheets.length && <Empty>Tu equipo aún no ha compartido una planificación contigo.</Empty>}</section>}
    {tab === 'Reportes' && <section className="space-y-4"><h2 className="text-xl font-bold">Reportes publicados</h2>{!data.report ? <Empty>Aún no hay reportes publicados para esta marca.</Empty> : data.report.months ? <ReporteMarcaView key={brand.id} nombre={data.report.name} meses={data.report.months} modo="cliente" /> : <PinGate titulo="Reportes de tu marca" />}</section>}
  </main>
}
function SheetLink({ sheet }: { sheet: ClientBrandSpaceData['sheets'][number] }) {
  return <Link href={`/cliente/planificacion/${sheet.id}`} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-4 hover:border-violet-300"><div className="min-w-0"><strong className="block break-words text-sm">{sheet.title}</strong><p className="mt-1 text-xs text-slate-500">Actualizada el {dateLabel(sheet.updated_at)}</p></div><ArrowUpRight size={16} className="shrink-0 text-violet-600" /></Link>
}
function Empty({ children }: { children: React.ReactNode }) { return <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">{children}</p> }
