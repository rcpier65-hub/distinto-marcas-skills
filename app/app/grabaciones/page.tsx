// app/app/grabaciones/page.tsx
// Control mensual de sesiones de grabación por marca.
// Server component que orquesta: marcas, KPIs y lista de grabaciones del mes.

import Link from 'next/link'
import { Clapperboard, List, CalendarRange } from 'lucide-react'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { listGrabaciones, getGrabacionesKPIs } from './_actions'
import { Card, CardContent } from '@/components/ui/card'
import { GrabacionRow } from './_components/grabacion-row'
import { NuevaGrabacionForm } from './_components/nueva-grabacion-form'
import { MesSelector } from './_components/mes-selector'
import { MarcaGrabacionCard } from './_components/marca-grabacion-card'
import { GoogleCalendarConnect } from './_components/gcal-connect'
import { getGoogleCalendarStatus } from '@/lib/integrations/google-calendar'

export const dynamic = 'force-dynamic'

type SP = { desde?: string; hasta?: string }

export default async function GrabacionesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser()
  const sp = await searchParams
  const desde = sp.desde
  const hasta = sp.hasta

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  // Cargar marcas activas para el form de nueva grabación
  const marcasResult = await service
    .from('marcas')
    .select('slug, nombre, emoji_marca')
    .eq('activa', true)
    .order('slug')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas = (marcasResult.data ?? []) as any[]

  // KPIs + grabaciones del rango
  const [kpisResult, rowsResult] = await Promise.all([
    getGrabacionesKPIs(desde, hasta),
    listGrabaciones(desde, hasta),
  ])
  const kpis = kpisResult.ok ? kpisResult.kpis : []
  const rows = rowsResult.ok ? rowsResult.rows : []
  const error = !kpisResult.ok ? kpisResult.error : !rowsResult.ok ? rowsResult.error : null

  // Totales globales
  const totalObjetivo = kpis.reduce((s, k) => s + k.objetivo, 0)
  const totalCumplidas = kpis.reduce((s, k) => s + k.cumplidas, 0)
  const totalPlaneadas = kpis.reduce((s, k) => s + k.planeadas, 0)
  const totalCanceladas = kpis.reduce((s, k) => s + k.canceladas, 0)
  const cumplimientoGlobal = totalObjetivo > 0 ? Math.round((totalCumplidas / totalObjetivo) * 100) : 0

  /* Marcas que hacen grabaciones = las que tienen objetivo mensual > 0
     (Pedro les definió una política de grabaciones). Las que tienen
     objetivo 0 son marcas activas pero que NO graban este mes.
     El denominador es el total de marcas activas en BD — así se ve
     "5 de 9 marcas activas hacen grabaciones" en un vistazo. */
  const marcasConGrabaciones = kpis.filter((k) => k.objetivo > 0).length
  const marcasActivasTotal = kpis.length

  // Mes activo en formato YYYY-MM (para defaultear nuevas fechas en las cards).
  // Deriva de `desde` o del mes actual.
  const mesDefault = (desde ?? new Date().toISOString().slice(0, 10)).slice(0, 7)

  // Estado de conexión con Google Calendar (best-effort — si la tabla no
  // existe o falla, asumimos no conectado)
  let gcal = { connected: false, email: null as string | null }
  try { gcal = await getGoogleCalendarStatus() } catch { /* no conectado */ }

  return (
    <main className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#ba41f7]/10 flex items-center justify-center shrink-0">
            <Clapperboard className="w-6 h-6 text-[#ba41f7]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1 tracking-tight">Control de grabaciones</h1>
            <p className="text-sm text-muted-foreground">
              Seguimiento mensual de sesiones de grabación por marca. Planificá fechas, marcá cumplidas y sincronizá con tu calendario.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <GoogleCalendarConnect connected={gcal.connected} email={gcal.email} />
          <MesSelector />
        </div>
      </header>

      {/* TABS */}
      <nav className="flex items-center gap-1 border-b border-border">
        <Link
          href="/grabaciones"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 border-[#ba41f7] text-foreground"
        >
          <List className="w-4 h-4" /> Lista
        </Link>
        <Link
          href="/grabaciones/calendario"
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-muted-foreground"
        >
          <CalendarRange className="w-4 h-4" /> Calendario
        </Link>
      </nav>

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            ⚠️ {error}
            <p className="mt-2 text-muted-foreground text-xs">
              Si dice "does not exist", probablemente falta aplicar la migration 016. Andá a{' '}
              <a href="/api/debug/apply-migration-016?debug_key=tp-debug-2026-05-22-grilla-fix" className="underline">
                /api/debug/apply-migration-016
              </a>{' '}
              para ver el SQL a correr en Supabase Studio.
            </p>
          </CardContent>
        </Card>
      )}

      {/* RESUMEN GLOBAL */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {/* Marcas con grabaciones — primer KPI porque es el panorama
                de la operación ("cuántas marcas mantengo activas con
                política de grabaciones este mes"). Pedro lo pidió
                explícito: "quiero saber cuántas marcas tengo activas
                que se hagan grabaciones". */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Marcas activas</p>
              <p className="text-3xl font-bold text-[#ba41f7]">
                {marcasConGrabaciones}
                <span className="text-base font-normal text-muted-foreground">
                  {' / '}{marcasActivasTotal}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">con grabaciones</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Objetivo del mes</p>
              <p className="text-3xl font-bold">{totalObjetivo}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cumplidas ✅</p>
              <p className="text-3xl font-bold text-emerald-600">{totalCumplidas}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Planeadas 🕒</p>
              <p className="text-3xl font-bold text-amber-600">{totalPlaneadas}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Canceladas ❌</p>
              <p className="text-3xl font-bold text-rose-600">{totalCanceladas}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cumplimiento</p>
              <p className={`text-3xl font-bold ${cumplimientoGlobal >= 100 ? 'text-emerald-600' : cumplimientoGlobal >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                {cumplimientoGlobal}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs POR MARCA — cada card muestra sus fechas + botón agregar */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Por marca</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {kpis.map((k) => (
            <MarcaGrabacionCard key={k.marca_id} kpi={k} mesDefault={mesDefault} />
          ))}
          {kpis.length === 0 && !error && (
            <p className="text-sm text-muted-foreground col-span-3 italic">Sin marcas activas.</p>
          )}
        </div>
      </section>

      {/* NUEVA GRABACIÓN */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Planificar nueva</h2>
        <NuevaGrabacionForm marcas={marcas} />
      </section>

      {/* TABLA DETALLADA */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Detalle del mes ({rows.length} {rows.length === 1 ? 'grabación' : 'grabaciones'})
        </h2>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left py-2 px-3 font-medium">Marca</th>
                  <th className="text-left py-2 px-3 font-medium">Planeada</th>
                  <th className="text-left py-2 px-3 font-medium">Estado</th>
                  <th className="text-left py-2 px-3 font-medium">Fecha real</th>
                  <th className="text-left py-2 px-3 font-medium">Videos</th>
                  <th className="text-left py-2 px-3 font-medium">Notas</th>
                  <th className="text-right py-2 px-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <GrabacionRow
                    key={r.id}
                    id={r.id}
                    marca_nombre={r.marca_nombre}
                    marca_emoji={r.marca_emoji}
                    fecha_planeada={r.fecha_planeada}
                    fecha_real={r.fecha_real}
                    estado={r.estado}
                    videos_grabados={r.videos_grabados}
                    notas={r.notas}
                  />
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground italic">
                      Sin grabaciones en este mes. Apretá <strong>+ Nueva grabación</strong> arriba para planificar una.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
