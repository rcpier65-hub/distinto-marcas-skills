// app/lib/grilla/build-caption.ts
/**
 * Genera el caption de WhatsApp que se enviará al grupo del cliente
 * cuando se apruebe una grilla.
 *
 * El caption es EDITABLE en la pantalla de preview — esto es solo
 * el texto sugerido por default, basado en el tono de marca + publicaciones reales.
 *
 * Formato según skill `grilla-semanal` (message-template.md):
 *   - Saludo personalizado con tratamiento del decisor (innegociable)
 *   - Sin header "Grilla de contenido para [marca]"
 *   - Bloque por cada publicación con día/fecha · título, plataformas, tipo de contenido
 *   - Sin frase "Cualquier ajuste antes de las X"
 *   - Sin Estado Notion
 *   - Sin días sin publicación
 */

import type { GrillaPublicacion } from '@/lib/integrations/notion'

export type MarcaCaptionInfo = {
  nombre: string
  decisor_tratamiento: string | null
  decisor_nombre: string | null
  emoji_marca: string | null
  tono_voz: unknown  // jsonb de Supabase
}

const DIAS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function buildCaptionDefault(args: {
  marca: MarcaCaptionInfo
  semana_inicio: string
  semana_fin: string
  publicaciones?: GrillaPublicacion[]
}): string {
  const { marca, semana_inicio, semana_fin, publicaciones = [] } = args
  const saludo = formatSaludo(marca)
  const rango = formatRangoLargo(semana_inicio, semana_fin)
  const bloques = publicaciones.map(formatBloquePublicacion).filter(Boolean)
  const cierre = formatCierre(marca)

  const lines: string[] = [
    `${saludo} 👋`,
    ``,
    `Envío para ti la grilla de contenido que se publicará la ${rango}.`,
  ]

  if (bloques.length > 0) {
    lines.push('')
    bloques.forEach((b, i) => {
      lines.push(b!)
      if (i < bloques.length - 1) lines.push('')
    })
  } else {
    lines.push('')
    lines.push('_(Sin publicaciones programadas esta semana — revisar grilla en Notion)_')
  }

  lines.push('')
  lines.push(cierre)

  return lines.join('\n')
}

function formatBloquePublicacion(p: GrillaPublicacion): string | null {
  if (!p.titulo) return null
  const d = new Date(p.fecha + 'T12:00:00Z')
  const dia = DIAS_ES[d.getUTCDay()]
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mes = MESES_ES[d.getUTCMonth()]
  const plataformas = p.plataformas.length > 0 ? p.plataformas.join(' · ') : ''
  const tipo = p.tipo_contenido.length > 0 ? p.tipo_contenido.join(' · ') : ''
  const meta = [plataformas, tipo].filter(Boolean).join(' · ')

  const linea1 = `📍 *${dia} ${dd} ${mes} · ${p.titulo}*`
  return meta ? `${linea1}\n${meta}` : linea1
}

function formatSaludo(m: MarcaCaptionInfo): string {
  if (m.decisor_tratamiento && m.decisor_nombre) {
    return `Hola ${m.decisor_tratamiento} ${m.decisor_nombre}`
  }
  if (m.decisor_nombre) return `Hola ${m.decisor_nombre}`
  return 'Hola 👋 buenas'
}

function formatRangoLargo(inicio: string, fin: string): string {
  try {
    const d1 = new Date(inicio + 'T12:00:00Z')
    const d2 = new Date(fin + 'T12:00:00Z')
    const month = d1.toLocaleDateString('es-PE', { month: 'long', timeZone: 'UTC' })
    return `semana del ${d1.getUTCDate()} al ${d2.getUTCDate()} de ${month}`
  } catch {
    return `semana ${inicio} → ${fin}`
  }
}

function formatCierre(m: MarcaCaptionInfo): string {
  const emoji = m.emoji_marca ?? ''
  const tono = isObject(m.tono_voz) ? String(m.tono_voz.tono ?? '').toLowerCase() : ''

  if (tono.includes('jugueton') || tono.includes('cute') || tono.includes('playful')) {
    return `Cualquier ajuste, atento 😊 ${emoji}`
  }
  if (tono.includes('motivacional') || tono.includes('energético') || tono.includes('energetico')) {
    return `¡A romperla esta semana! ${emoji}`
  }
  if (tono.includes('profesional') || tono.includes('rigurosa') || tono.includes('clínica')) {
    return `Cualquier consulta quedo atento ${emoji}`
  }
  return `Cualquier consulta, atento. ${emoji}`
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
