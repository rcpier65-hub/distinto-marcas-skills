// app/app/reportes/page.tsx
// Módulo Reportes — dashboards mensuales por marca (reemplazan los Excel).
// Primer reporte: TYPHOUSE / LITTLE JOE (embudo Meta Ads + Shopify).
// Pedro (11-ago-2026): "no quiero que usen ese excel; la próxima les mando
// todo en la interfaz". Gate por permiso 'metricas' (ejecutivo).
import { requireUser } from '@/lib/auth/get-user'
import { ensureAccesoModulo } from '@/lib/team/permisos-helper'
import { MarcaLogo } from '@/components/marca-logo'
import { ReporteTyphouseView } from './_components/reporte-typhouse-view'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reportes' }

export default async function ReportesPage() {
  await requireUser()
  await ensureAccesoModulo('metricas')

  return (
    <main className="container mx-auto p-6 md:p-8 max-w-5xl">
      <header className="mb-6 flex items-center gap-3">
        <MarcaLogo slug="little-joe" nombre="TypHouse" emoji="📊" size={44} />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            TypHouse / Little Joe · Embudo de ventas mensual — data oficial migrada del Excel.
          </p>
        </div>
      </header>
      <ReporteTyphouseView />
    </main>
  )
}
