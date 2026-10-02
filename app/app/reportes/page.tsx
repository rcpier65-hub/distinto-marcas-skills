// app/app/reportes/page.tsx
// Módulo Reportes — dashboards mensuales por marca (reemplazan los Excel).
// Protegido por: permiso 'metricas' + CÓDIGO de acceso (cookie httpOnly de
// 12h — Pedro 11-ago-2026: "no todos pueden ver"). El dueño ve TODAS las
// marcas con selector; las que aún no tienen data salen deshabilitadas.
import { BarChart3 } from 'lucide-react'
import { requireUser } from '@/lib/auth/get-user'
import { ensureAccesoModulo } from '@/lib/team/permisos-helper'
import { createServiceClient } from '@/lib/supabase/service'
import { getReportes } from '@/lib/reportes/registry'
import { pinReportesOk } from './_actions'
import { PinGate } from '@/components/reportes/pin-gate'
import { ReportesHub, type MarcaChip } from './_components/reportes-hub'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reportes' }

export default async function ReportesPage() {
  await requireUser()
  await ensureAccesoModulo('metricas')

  const desbloqueado = await pinReportesOk()

  return (
    <main className="mx-auto p-4 sm:p-6 md:p-8 max-w-5xl">
      <header className="mb-6 flex items-center gap-3">
        <span className="w-11 h-11 rounded-[13px] inline-flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
          <BarChart3 className="w-5 h-5" />
        </span>
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-tight">Reportes</h1>
          <p className="text-[13px] text-slate-500">Resultados mensuales de cada marca</p>
        </div>
      </header>

      {!desbloqueado ? (
        <div className="pt-10"><PinGate titulo="Reportes de marcas" /></div>
      ) : (
        <ReportesHubServer />
      )}
    </main>
  )
}

async function ReportesHubServer() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const { data } = await service
    .from('marcas')
    .select('slug, nombre, emoji_marca')
    .eq('activa', true)
    .order('nombre')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcas: MarcaChip[] = ((data ?? []) as any[]).map((m) => ({
    slug: m.slug as string,
    nombre: m.nombre as string,
    emoji: (m.emoji_marca ?? null) as string | null,
  }))
  const nombres = Object.fromEntries(marcas.map((m) => [m.slug, m.nombre]))
  const reportes = await getReportes(nombres)
  return <ReportesHub reportes={reportes} marcas={marcas} />
}
