import { getOpenAIApiKey } from '@/lib/integrations/openai'
import { ProposalError } from './errors'
import { validateRewrite, WRITING_FIELDS, WRITING_PROMPT, type WritingField } from './writing'

export async function improveProposalText(field: WritingField, text: string) {
  const key = await getOpenAIApiKey()
  if (!key) throw new ProposalError('Configura OpenAI en Ajustes para mejorar los textos con IA.', 503)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, max_tokens: 4500,
      response_format: { type: 'json_schema', json_schema: { name: 'proposal_rewrite', strict: true, schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false } } },
      messages: [{ role: 'system', content: WRITING_PROMPT }, { role: 'user', content: JSON.stringify({ field, maxCharacters: WRITING_FIELDS[field], text }) }],
    }), signal: AbortSignal.timeout(45000),
  })
  if (!response.ok) {
    const failure = await response.json().catch(() => null)
    console.error('[propuestas:ia]', response.status, failure?.error?.code || 'provider_error')
    const message = failure?.error?.type === 'insufficient_quota' || ['insufficient_quota', 'credit_balance_exhausted'].includes(failure?.error?.code)
      ? 'La cuenta de OpenAI configurada agotó su saldo. Recárgala o configura otra conexión en Ajustes; tu texto se conserva.'
      : response.status === 401 ? 'La conexión de OpenAI necesita actualizarse en Ajustes. Tu texto se conserva.'
      : 'La IA no pudo completar la mejora. Tu texto sigue intacto; vuelve a intentar.'
    throw new ProposalError(message, 502)
  }
  const result = await response.json()
  const choice = result.choices?.[0]
  if (choice?.finish_reason !== 'stop' || !choice.message?.content) throw new ProposalError('La IA no devolvió una sugerencia completa. Vuelve a intentar.', 502)
  try { return validateRewrite(text, JSON.parse(choice.message.content).text, field) }
  catch (e) { throw new ProposalError(e instanceof Error && e.message.startsWith('La sugerencia') ? e.message : 'La sugerencia no es válida para este campo. Tu texto se conserva.', 502) }
}
