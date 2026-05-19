// app/lib/grilla/build-caption.ts
/**
 * Genera el caption de WhatsApp que se enviará al grupo del cliente
 * cuando se apruebe una grilla.
 *
 * El caption es EDITABLE en la pantalla de preview — esto es solo
 * el texto sugerido por default, basado en el tono de marca.
 */

export type MarcaCaptionInfo = {
  nombre: string
  decisor_tratamiento: string | null
  decisor_nombre: string | null
  emoji_marca: string | null
  tono_voz: unknown  // jsonb de Supabase
}

export function buildCaptionDefault(args: {
  marca: MarcaCaptionInfo
  semana_inicio: string
  semana_fin: string
}): string {
  const { marca, semana_inicio, semana_fin } = args
  const saludo = formatSaludo(marca)
  const semana = formatSemana(semana_inicio, semana_fin)
  const cierre = formatCierre(marca)

  return [
    `${saludo} 👋`,
    ``,
    `Te compartimos la grilla de contenido de **${marca.nombre}** para la ${semana}.`,
    ``,
    `${cierre}`,
  ].join('\n')
}

function formatSaludo(m: MarcaCaptionInfo): string {
  if (m.decisor_tratamiento && m.decisor_nombre) {
    return `Hola ${m.decisor_tratamiento} ${m.decisor_nombre}`
  }
  if (m.decisor_nombre) return `Hola ${m.decisor_nombre}`
  return 'Hola 👋 buenas'
}

function formatSemana(inicio: string, fin: string): string {
  // inicio/fin son ISO YYYY-MM-DD. Formateamos como "semana del 19 al 25 de mayo"
  try {
    const d1 = new Date(inicio + 'T12:00:00')
    const d2 = new Date(fin + 'T12:00:00')
    const month = d1.toLocaleDateString('es-PE', { month: 'long' })
    return `semana del ${d1.getDate()} al ${d2.getDate()} de ${month}`
  } catch {
    return `semana ${inicio} → ${fin}`
  }
}

function formatCierre(m: MarcaCaptionInfo): string {
  const emoji = m.emoji_marca ?? ''
  // Detectar tono del jsonb tono_voz (best-effort, sin romper si no es objeto)
  const tono = isObject(m.tono_voz) ? String(m.tono_voz.tono ?? '').toLowerCase() : ''

  if (tono.includes('jugueton') || tono.includes('cute') || tono.includes('playful')) {
    return `Cualquier ajuste, atento 😊 ${emoji}`
  }
  if (tono.includes('motivacional') || tono.includes('energético') || tono.includes('energetico')) {
    return `¡A romperla esta semana! ${emoji}`
  }
  if (tono.includes('profesional') || tono.includes('rigurosa') || tono.includes('clínica')) {
    return `Cualquier consulta, atento. ${emoji}`
  }
  return `Cualquier consulta, atento. ${emoji}`
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
