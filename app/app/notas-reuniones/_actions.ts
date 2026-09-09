'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getOpenAIApiKey } from '@/lib/integrations/openai'
import { getAnthropicApiKey } from '@/lib/integrations/anthropic'
import {
  NOTA_SELECT,
  parseChat,
  rowToNota,
  type ChatMessage,
  type NotaEstado,
  type NotaReunion,
} from '@/lib/notas-reuniones/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

async function currentMember(service: Service, authUserId: string) {
  const { data } = await service
    .from('team_members')
    .select('id, nombre, rol_base')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  return {
    id: (data?.id ?? null) as string | null,
    nombre: (data?.nombre ?? '') as string,
    esCEO: !data || data.rol_base === 'director',
  }
}

function revalidateNota(id?: string) {
  revalidatePath('/notas-reuniones')
  if (id) revalidatePath(`/notas-reuniones/${id}`)
}

export async function crearNota(titulo?: string): Promise<
  { ok: true; nota: NotaReunion } | { ok: false; error: string }
> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const me = await currentMember(service, user.id)
  const { data, error } = await service
    .from('notas_reuniones')
    .insert({
      team_member_id: me.id,
      titulo: (titulo ?? 'Nueva nota').trim() || 'Nueva nota',
      cuerpo: '',
      transcript: '',
      chat: [],
      estado: 'borrador',
    })
    .select(NOTA_SELECT)
    .single()
  if (error) return { ok: false, error: error.message }
  revalidateNota(data.id)
  return { ok: true, nota: rowToNota(data, me.nombre || 'Yo') }
}

export async function crearNotaYRedirigir() {
  const res = await crearNota()
  if (!res.ok) throw new Error(res.error)
  redirect(`/notas-reuniones/${res.nota.id}`)
}

export async function actualizarNota(
  id: string,
  patch: {
    titulo?: string
    cuerpo?: string
    transcript?: string
    estado?: NotaEstado
    started_at?: string | null
    ended_at?: string | null
  },
): Promise<{ ok: true; nota: NotaReunion } | { ok: false; error: string }> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const me = await currentMember(service, user.id)

  const { data: existing, error: selErr } = await service
    .from('notas_reuniones')
    .select(NOTA_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (selErr) return { ok: false, error: selErr.message }
  if (!existing) return { ok: false, error: 'Nota no encontrada' }
  if (!me.esCEO && me.id && existing.team_member_id && existing.team_member_id !== me.id) {
    return { ok: false, error: 'No puedes editar esta nota' }
  }

  const upd: Record<string, unknown> = {}
  if (typeof patch.titulo === 'string') upd.titulo = patch.titulo.slice(0, 200)
  if (typeof patch.cuerpo === 'string') upd.cuerpo = patch.cuerpo
  if (typeof patch.transcript === 'string') upd.transcript = patch.transcript
  if (patch.estado) upd.estado = patch.estado
  if (patch.started_at !== undefined) upd.started_at = patch.started_at
  if (patch.ended_at !== undefined) upd.ended_at = patch.ended_at

  const { data, error } = await service
    .from('notas_reuniones')
    .update(upd)
    .eq('id', id)
    .select(NOTA_SELECT)
    .single()
  if (error) return { ok: false, error: error.message }
  revalidateNota(id)
  return { ok: true, nota: rowToNota(data, me.nombre || 'Yo') }
}

export async function eliminarNota(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const me = await currentMember(service, user.id)
  const { data: existing } = await service
    .from('notas_reuniones')
    .select('id, team_member_id')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return { ok: false, error: 'Nota no encontrada' }
  if (!me.esCEO && me.id && existing.team_member_id && existing.team_member_id !== me.id) {
    return { ok: false, error: 'No puedes borrar esta nota' }
  }
  const { error } = await service.from('notas_reuniones').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidateNota()
  return { ok: true }
}

export async function chatearConNota(
  notaId: string,
  pregunta: string,
): Promise<{ ok: true; messages: ChatMessage[] } | { ok: false; error: string }> {
  const user = await requireUser()
  const q = (pregunta ?? '').trim()
  if (!q) return { ok: false, error: 'Escribe una pregunta' }
  if (q.length > 4000) return { ok: false, error: 'Pregunta demasiado larga' }

  const service = createServiceClient() as Service
  const me = await currentMember(service, user.id)
  const { data: nota, error: selErr } = await service
    .from('notas_reuniones')
    .select(NOTA_SELECT)
    .eq('id', notaId)
    .maybeSingle()
  if (selErr) return { ok: false, error: selErr.message }
  if (!nota) return { ok: false, error: 'Nota no encontrada' }
  if (!me.esCEO && me.id && nota.team_member_id && nota.team_member_id !== me.id) {
    return { ok: false, error: 'No puedes chatear con esta nota' }
  }

  const prev = parseChat(nota.chat)
  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: q,
    createdAt: new Date().toISOString(),
  }

  const contexto = [
    `Título: ${nota.titulo ?? 'Sin título'}`,
    nota.cuerpo ? `Notas escritas:\n${String(nota.cuerpo).slice(0, 12000)}` : '',
    nota.transcript ? `Transcripción:\n${String(nota.transcript).slice(0, 20000)}` : '',
  ].filter(Boolean).join('\n\n')

  if (!contexto.replace(`Título: ${nota.titulo ?? 'Sin título'}`, '').trim()) {
    return {
      ok: false,
      error: 'Aún no hay contenido ni transcripción en esta nota para chatear.',
    }
  }

  let answer: string | null = null
  let keyError: string | null = null

  const openaiKey = await getOpenAIApiKey()
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 900,
          messages: [
            {
              role: 'system',
              content: [
                'Eres el asistente de Notas y reuniones de Distinto.',
                'Responde en español peruano, claro y conciso.',
                'Usa SOLO el contexto de la nota (cuerpo + transcripción). Si no está en el contexto, dilo.',
                'No inventes acuerdos, nombres ni fechas que no aparezcan.',
              ].join(' '),
            },
            { role: 'user', content: `Contexto de la nota:\n\n${contexto}` },
            ...prev.slice(-8).map((m) => ({
              role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
              content: m.content,
            })),
            { role: 'user', content: q },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      })
      if (res.ok) {
        const json = await res.json()
        answer = String(json?.choices?.[0]?.message?.content ?? '').trim() || null
      } else {
        keyError = `OpenAI respondió ${res.status}`
      }
    } catch (e) {
      keyError = e instanceof Error ? e.message : 'Error llamando a OpenAI'
    }
  }

  if (!answer) {
    const anthropicKey = await getAnthropicApiKey()
    if (anthropicKey) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-latest',
            max_tokens: 900,
            system: 'Eres el asistente de Notas y reuniones de Distinto. Responde en español peruano usando solo el contexto de la nota.',
            messages: [
              { role: 'user', content: `Contexto:\n${contexto}\n\nPregunta: ${q}` },
            ],
          }),
          signal: AbortSignal.timeout(30000),
        })
        if (res.ok) {
          const json = await res.json()
          const parts = Array.isArray(json?.content) ? json.content : []
          answer = parts.map((p: { text?: string }) => p.text ?? '').join('').trim() || null
        } else {
          keyError = keyError ?? `Anthropic respondió ${res.status}`
        }
      } catch (e) {
        keyError = keyError ?? (e instanceof Error ? e.message : 'Error Anthropic')
      }
    }
  }

  if (!answer) {
    if (!openaiKey && !(await getAnthropicApiKey())) {
      return {
        ok: false,
        error: 'Falta API key de IA. Configura OPENAI_API_KEY o ANTHROPIC_API_KEY en Settings / Vercel.',
      }
    }
    return { ok: false, error: keyError ?? 'No se pudo generar respuesta' }
  }

  const assistantMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: answer,
    createdAt: new Date().toISOString(),
  }
  const next = [...prev, userMsg, assistantMsg].slice(-40)
  const { error: upErr } = await service
    .from('notas_reuniones')
    .update({ chat: next })
    .eq('id', notaId)
  if (upErr) return { ok: false, error: upErr.message }
  revalidateNota(notaId)
  return { ok: true, messages: next }
}
