// app/lib/reportes/registry.ts
// Registro de reportes mensuales POR MARCA. Para sumar una marca nueva:
// 1) crea su archivo de data (copia el patrón de typhouse.ts), 2) agrega
// una entrada aquí. El hub interno (/reportes) y el portal del cliente
// leen de este registro.
import { getReporteTyphouse, type MesReporte } from './typhouse'

export type ReporteMarca = {
  slug: string        // slug de la marca en la tabla `marcas`
  nombre: string      // nombre para mostrar en el reporte
  meses: MesReporte[] // data mensual ya calculada
}

export function getReportes(): ReporteMarca[] {
  return [
    { slug: 'little-joe', nombre: 'TypHouse / Little Joe', meses: getReporteTyphouse() },
  ]
}

export function getReporteBySlug(slug: string): ReporteMarca | null {
  return getReportes().find((r) => r.slug === slug) ?? null
}
