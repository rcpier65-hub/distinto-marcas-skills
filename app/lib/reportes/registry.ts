// app/lib/reportes/registry.ts
// Registro de reportes mensuales POR MARCA. La data viene de DOS fuentes:
//   1. SEED en código (typhouse.ts — lo migrado del Excel original).
//   2. Tabla `reportes_mensuales` (lo que el equipo carga desde el formulario
//      "Agregar mes" del módulo Reportes).
// Se mezclan por (marca, mes) y LA BASE GANA — así un mes seed se puede
// corregir desde la interfaz sin tocar código. Marcas nuevas aparecen solas
// apenas alguien les carga su primer mes.
import 'server-only'
import { DATA_MENSUAL, computeMes, type MesRaw, type MesReporte } from './typhouse'
import { leerMesesDb } from './db'

export type ReporteMarca = {
  slug: string
  nombre: string
  meses: MesReporte[]
}

/* Nombre "bonito" para las marcas con seed; el resto usa el nombre real de la
   tabla marcas (lo resuelve la página y lo pasa por props). */
const NOMBRE_SEED: Record<string, string> = {
  'little-joe': 'TypHouse / Little Joe',
}

const SEED: Record<string, MesRaw[]> = {
  'little-joe': DATA_MENSUAL,
}

/** Todos los reportes (seed + base), meses ordenados. */
export async function getReportes(nombresPorSlug?: Record<string, string>): Promise<ReporteMarca[]> {
  const db = await leerMesesDb()
  const slugs = new Set([...Object.keys(SEED), ...Object.keys(db)])
  const out: ReporteMarca[] = []
  for (const slug of slugs) {
    const porMes = new Map<string, MesRaw>()
    for (const r of SEED[slug] ?? []) porMes.set(r.mes, r)
    for (const r of db[slug] ?? []) porMes.set(r.mes, r) // la base gana
    const meses = [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes)).map(computeMes)
    if (meses.length === 0) continue
    out.push({
      slug,
      nombre: NOMBRE_SEED[slug] ?? nombresPorSlug?.[slug] ?? slug,
      meses,
    })
  }
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export async function getReporteBySlug(slug: string, nombre?: string): Promise<ReporteMarca | null> {
  const todos = await getReportes(nombre ? { [slug]: nombre } : undefined)
  return todos.find((r) => r.slug === slug) ?? null
}
