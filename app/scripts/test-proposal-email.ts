import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { deliverProposalEmail } from '../lib/propuestas/email-flow'
import { proposalEmailSchema, type EmailStatus } from '../lib/propuestas/email-model'

async function main() {
  const valid = { id: randomUUID(), revision: 1, to: 'cliente@example.com', subject: 'Propuesta Distinto', message: 'Adjuntamos la propuesta revisada.', confirmed: true }
  assert.equal(proposalEmailSchema.safeParse(valid).success, true)
  for (const patch of [{ confirmed: false }, { confirmed: undefined }, { to: '' }, { to: 'uno@example.com,dos@example.com' }, { to: 'uno@example.com\r\nBcc:dos@example.com' }, { subject: 'Hola\r\nBcc:otro@example.com' }, { message: '' }, { revision: 0 }]) {
    assert.equal(proposalEmailSchema.safeParse({ ...valid, ...patch }).success, false)
  }
  const pdf = new Uint8Array(Buffer.from('%PDF-1.4 propuesta revisada'))
  const events: string[] = []
  let status: EmailStatus | null = null
  let sends = 0
  const deps = {
    claim: async () => { if (status && status !== 'failed') return { claimed: false, status }; status = 'preparing'; return { claimed: true, status } },
    render: async () => { events.push('render'); return pdf },
    current: async () => { events.push('current'); return true },
    state: async (next: EmailStatus) => { events.push(next); status = next },
    send: async (attachment: Uint8Array) => { assert.equal(attachment, pdf); events.push('smtp'); sends++ },
  }
  assert.deepEqual(await deliverProposalEmail(deps), { alreadySent: false })
  assert.deepEqual(events, ['render', 'current', 'sending', 'smtp', 'sent'])
  assert.deepEqual(await deliverProposalEmail(deps), { alreadySent: true })
  assert.equal(sends, 1, 'Repetir el mismo envío no vuelve a llamar a SMTP')

  status = null; events.length = 0
  const concurrent = await Promise.allSettled([deliverProposalEmail(deps), deliverProposalEmail(deps)])
  assert.equal(concurrent.filter(r => r.status === 'fulfilled').length, 1)
  assert.equal(sends, 2, 'Dos llamadas simultáneas solo envían una vez')

  status = null; events.length = 0
  await assert.rejects(deliverProposalEmail({ ...deps, current: async () => false }), /propuesta cambió/)
  assert.equal(status, 'failed'); assert.equal(sends, 2)
  await deliverProposalEmail(deps)
  assert.equal(sends, 3, 'Un fallo antes del SMTP permite preparar de nuevo')

  status = null; events.length = 0
  await assert.rejects(deliverProposalEmail({ ...deps, send: async () => { sends++; throw Error('respuesta SMTP perdida') } }), /Puede haberse enviado/)
  assert.equal(status, 'uncertain')
  await assert.rejects(deliverProposalEmail(deps), /no pudo confirmarse/)
  assert.equal(sends, 4, 'Un resultado SMTP incierto no se reintenta')

  status = null
  await assert.rejects(deliverProposalEmail({ ...deps, state: async next => { if (next === 'sent') throw Error('BD temporalmente inaccesible'); status = next } }), /Puede haberse enviado/)
  assert.equal(status, 'uncertain'); assert.equal(sends, 5)
  await assert.rejects(deliverProposalEmail(deps), /no pudo confirmarse/)
  assert.equal(sends, 5)
  console.log('PASS: correo válido, confirmación, PDF, doble clic, concurrencia, revisión actual, fallos previos y envío incierto. No se envió ningún correo real.')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
