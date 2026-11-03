import { ProposalError } from './errors'
import type { EmailStatus } from './email-model'

type Dependencies = {
  claim: () => Promise<{ claimed: boolean; status: EmailStatus }>
  render: () => Promise<Uint8Array>
  current: () => Promise<boolean>
  state: (status: EmailStatus) => Promise<void>
  send: (pdf: Uint8Array) => Promise<void>
}

// La reserva se hace en BD: un reintento/doble clic no repite un envío.
// Tras intentar SMTP, una respuesta perdida nunca se reintenta a ciegas.
export async function deliverProposalEmail(deps: Dependencies) {
  const claim = await deps.claim()
  if (!claim.claimed) {
    if (claim.status === 'sent') return { alreadySent: true }
    throw new ProposalError('Este envío está en curso o no pudo confirmarse. Revisa Enviados del correo antes de intentar otro envío.', 409)
  }
  let smtpStarted = false
  try {
    const pdf = await deps.render()
    if (!await deps.current()) throw new ProposalError('La propuesta cambió. Cierra este cuadro y prepara de nuevo el correo con la versión actual.', 409)
    await deps.state('sending')
    smtpStarted = true
    await deps.send(pdf)
    await deps.state('sent')
    return { alreadySent: false }
  } catch (error) {
    await deps.state(smtpStarted ? 'uncertain' : 'failed').catch(() => {})
    if (smtpStarted) throw new ProposalError('No pudimos confirmar el envío. Puede haberse enviado: revisa Enviados del correo antes de repetirlo.', 503)
    throw error
  }
}
