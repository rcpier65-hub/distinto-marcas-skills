// app/app/api/cron/listener-aprobacion/route.ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getRecentEvents, parseCommand } from '@/lib/integrations/rubi-events'
import { sendWhatsAppToPhone, sendWhatsAppToGroup } from '@/lib/integrations/rubi'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PEDRO_NUMBER = '51983852191'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const startTime = Date.now()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const results = { procesados: [] as string[], errores: [] as string[] }

  // 1. Leer últimos eventos de Rubi
  let events
  try {
    events = await getRecentEvents(20)
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown' },
      { status: 500 }
    )
  }

  // 2. Filtrar mensajes de Pedro con comando válido (últimos 30 min)
  const recentCutoff = Date.now() / 1000 - 30 * 60
  const commands = events
    .filter((e) => {
      const fromNum = (e.from ?? '').replace(/\D/g, '')
      return fromNum.endsWith(PEDRO_NUMBER) && (e.timestamp ?? 0) > recentCutoff
    })
    .map((e) => ({ event: e, command: parseCommand(e.body ?? '') }))
    .filter(
      (c): c is { event: typeof events[0]; command: NonNullable<ReturnType<typeof parseCommand>> } =>
        c.command !== null
    )

  if (commands.length === 0) {
    return NextResponse.json({
      ok: true,
      procesados: 0,
      duration_ms: Date.now() - startTime,
    })
  }

  // 3. Procesar cada comando
  for (const { event, command } of commands) {
    const eventId = event.id ?? `${event.timestamp}-${event.from}`

    // Idempotencia
    const { data: yaProcesado } = await supabase
      .from('aprobaciones')
      .select('id')
      .filter('metadata->>event_id', 'eq', eventId)
      .limit(1)
      .maybeSingle()

    if (yaProcesado) continue

    // Buscar grilla esperando aprobación para esa marca
    const { data: marcaData } = await supabase
      .from('marcas')
      .select('id, slug, nombre, emoji_marca, grupo_whatsapp_nombre, grupo_whatsapp_alias')
      .eq('slug', command.marca_slug)
      .maybeSingle()

    if (!marcaData) {
      await sendWhatsAppToPhone(PEDRO_NUMBER, `⚠️ Marca "${command.marca_slug}" no existe.`)
      results.errores.push(`${command.marca_slug}: marca inexistente`)
      continue
    }

    const { data: grilla } = await supabase
      .from('grillas_pendientes')
      .select('id, png_url, caption')
      .eq('estado', 'esperando_aprobacion')
      .eq('marca_id', marcaData.id)
      .order('pedida_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!grilla) {
      await sendWhatsAppToPhone(
        PEDRO_NUMBER,
        `⚠️ No hay grilla esperando aprobación para "${command.marca_slug}".`
      )
      results.errores.push(`${command.marca_slug}: no esperando_aprobacion`)
      continue
    }

    if (command.action === 'aprobar') {
      const grupo = marcaData.grupo_whatsapp_alias ?? marcaData.grupo_whatsapp_nombre
      if (!grupo) {
        await sendWhatsAppToPhone(
          PEDRO_NUMBER,
          `⚠️ ${marcaData.nombre} no tiene grupo WhatsApp configurado.`
        )
        results.errores.push(`${command.marca_slug}: sin grupo`)
        continue
      }

      const captionCliente = [
        `${marcaData.emoji_marca ?? '📊'} Grilla de contenido — ${marcaData.nombre}`,
        ``,
        `Compartimos la grilla de esta semana.`,
        ``,
        grilla.png_url ? `Preview: ${grilla.png_url}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      const sendRes = await sendWhatsAppToGroup(grupo, captionCliente, !!marcaData.grupo_whatsapp_alias)

      if (sendRes.ok) {
        await supabase
          .from('grillas_pendientes')
          .update({ estado: 'enviada', enviada_at: new Date().toISOString() })
          .eq('id', grilla.id)

        await supabase.from('envios').insert({
          grilla_id: grilla.id,
          marca_id: marcaData.id,
          tipo: 'whatsapp_grupo',
          destino: grupo,
          caption: captionCliente,
          success: true,
        })

        await supabase.from('aprobaciones').insert({
          grilla_id: grilla.id,
          accion: 'aprobar',
          via: 'whatsapp',
          comentario: event.body,
          metadata: { event_id: eventId, raw: event.body },
        })

        await sendWhatsAppToPhone(
          PEDRO_NUMBER,
          `✅ Enviado ${marcaData.nombre} al grupo "${grupo}" a las ${new Date().toLocaleTimeString('es-PE')}.`
        )

        results.procesados.push(`aprobar:${command.marca_slug}`)
      } else {
        results.errores.push(`${command.marca_slug}: send fail - ${sendRes.error}`)
      }
    } else if (command.action === 'cancelar') {
      await supabase
        .from('grillas_pendientes')
        .update({ estado: 'cancelada', cancelada_at: new Date().toISOString() })
        .eq('id', grilla.id)

      await supabase.from('aprobaciones').insert({
        grilla_id: grilla.id,
        accion: 'rechazar',
        via: 'whatsapp',
        comentario: event.body,
        metadata: { event_id: eventId },
      })

      await sendWhatsAppToPhone(PEDRO_NUMBER, `❌ Cancelada grilla de ${marcaData.nombre}.`)
      results.procesados.push(`cancelar:${command.marca_slug}`)
    } else {
      // regenerar
      await supabase
        .from('grillas_pendientes')
        .update({ estado: 'pendiente' })
        .eq('id', grilla.id)

      await supabase.from('aprobaciones').insert({
        grilla_id: grilla.id,
        accion: 'regenerar',
        via: 'whatsapp',
        comentario: event.body,
        metadata: { event_id: eventId },
      })

      await sendWhatsAppToPhone(PEDRO_NUMBER, `🔄 Regenerando grilla de ${marcaData.nombre}.`)
      results.procesados.push(`regenerar:${command.marca_slug}`)
    }
  }

  return NextResponse.json({
    ok: true,
    procesados: results.procesados.length,
    acciones: results.procesados,
    errores: results.errores,
    duration_ms: Date.now() - startTime,
  })
}
