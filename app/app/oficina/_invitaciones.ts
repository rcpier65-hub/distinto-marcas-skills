export type Invitacion = { id: string; de: string; para: string; nombre: string; privada: boolean; vence: number }
export type SenalConversacion =
  | { tipo: 'invitar'; invitacion: Invitacion }
  | { tipo: 'aceptar' | 'rechazar' | 'cancelar' | 'terminar'; id: string; de: string; para: string }
export type Conversaciones = { entrante: Invitacion | null; saliente: Invitacion | null; activa: { id: string; peer: string } | null }
export const conversacionesVacias = (): Conversaciones => ({ entrante: null, saliente: null, activa: null })

/** Invitaciones con destinatario y vencimiento. Aceptar nunca envía otra invitación. */
export class InvitacionesOficina {
  state = conversacionesVacias()
  constructor(private yo: () => string, private enviar: (s: SenalConversacion) => void, private cambiar: (s: Conversaciones) => void) {}
  private update(patch: Partial<Conversaciones>) { this.state = { ...this.state, ...patch }; this.cambiar(this.state) }
  invitar(para: string, nombre: string, privada: boolean, now = Date.now()): boolean {
    if (!para || para === this.yo() || this.state.activa || this.state.saliente || this.state.entrante) return false
    const invitacion = { id: crypto.randomUUID(), de: this.yo(), para, nombre, privada, vence: now + 30000 }
    this.update({ saliente: invitacion }); this.enviar({ tipo: 'invitar', invitacion }); return true
  }
  recibir(s: SenalConversacion, now = Date.now()): boolean {
    if (s.tipo === 'invitar') {
      const i = s.invitacion
      if (!i || i.para !== this.yo() || i.de === this.yo() || !i.id || !Number.isFinite(i.vence) || i.vence <= now || i.vence > now + 31000) return false
      if (this.state.entrante?.id === i.id) return false
      if (this.state.activa || this.state.entrante || this.state.saliente) {
        this.enviar({ tipo: 'rechazar', id: i.id, de: this.yo(), para: i.de }); return false
      }
      this.update({ entrante: i }); return true
    }
    if (s.para !== this.yo()) return false
    const out = this.state.saliente, incoming = this.state.entrante, active = this.state.activa
    if (out?.id === s.id && out.para === s.de) {
      if (s.tipo === 'aceptar' && out.vence > now) this.update({ saliente: null, activa: out.privada ? { id: out.id, peer: out.para } : null })
      else if (s.tipo === 'rechazar' || s.tipo === 'cancelar' || out.vence <= now) this.update({ saliente: null })
    }
    if (incoming?.id === s.id && incoming.de === s.de && s.tipo === 'cancelar') this.update({ entrante: null })
    if (active?.id === s.id && active.peer === s.de && (s.tipo === 'terminar' || s.tipo === 'cancelar')) this.update({ activa: null })
    return false
  }
  aceptar(now = Date.now()): Invitacion | null {
    const i = this.state.entrante
    if (!i) return null
    if (i.vence <= now) { this.update({ entrante: null }); return null }
    this.update({ entrante: null, activa: i.privada ? { id: i.id, peer: i.de } : null })
    this.enviar({ tipo: 'aceptar', id: i.id, de: this.yo(), para: i.de }); return i
  }
  rechazar() { const i = this.state.entrante; if (i) { this.update({ entrante: null }); this.enviar({ tipo: 'rechazar', id: i.id, de: this.yo(), para: i.de }) } }
  cancelar() { const i = this.state.saliente; if (i) { this.update({ saliente: null }); this.enviar({ tipo: 'cancelar', id: i.id, de: this.yo(), para: i.para }) } }
  terminar() { const a = this.state.activa; if (a) { this.update({ activa: null }); this.enviar({ tipo: 'terminar', id: a.id, de: this.yo(), para: a.peer }) } }
  tick(now = Date.now()) {
    if (this.state.saliente && this.state.saliente.vence <= now) this.cancelar()
    if (this.state.entrante && this.state.entrante.vence <= now) this.update({ entrante: null })
  }
  reset() { this.rechazar(); this.cancelar(); this.terminar() }
}
