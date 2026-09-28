/** Perfect negotiation (MDN): tolera ofertas simultáneas y candidatos que
 * llegan antes del SDP por el canal de señalización.
 * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation */
export class NegociacionOficina {
  private ofreciendo = false
  private aplicandoRespuesta = false
  private ignorarOferta = false
  private pendientes: RTCIceCandidateInit[] = []
  constructor(private pc: RTCPeerConnection, private educado: boolean,
    private enviar: (sdp: RTCSessionDescriptionInit) => void, private fallar: () => void) {}
  async ofrecer(): Promise<void> {
    try {
      this.ofreciendo = true
      await this.pc.setLocalDescription()
      if (this.pc.localDescription) this.enviar(this.pc.localDescription.toJSON())
    } catch { if (this.pc.signalingState !== 'closed') this.fallar() }
    finally { this.ofreciendo = false }
  }
  async descripcion(sdp: RTCSessionDescriptionInit): Promise<void> {
    try {
      const listo = !this.ofreciendo && (this.pc.signalingState === 'stable' || this.aplicandoRespuesta)
      const choque = sdp.type === 'offer' && !listo
      this.ignorarOferta = !this.educado && choque
      if (this.ignorarOferta) return
      this.aplicandoRespuesta = sdp.type === 'answer'
      // setRemoteDescription revierte una oferta propia cuando corresponde.
      await this.pc.setRemoteDescription(sdp)
      this.aplicandoRespuesta = false
      for (const c of this.pendientes.splice(0)) {
        try { await this.pc.addIceCandidate(c) } catch { /* candidato de una oferta abandonada */ }
      }
      if (sdp.type === 'offer') {
        await this.pc.setLocalDescription()
        if (this.pc.localDescription) this.enviar(this.pc.localDescription.toJSON())
      }
    } catch { this.aplicandoRespuesta = false; if (this.pc.signalingState !== 'closed') this.fallar() }
  }
  async candidato(c: RTCIceCandidateInit): Promise<void> {
    if (this.pc.signalingState === 'closed' || this.ignorarOferta) return
    if (!this.pc.remoteDescription) { this.pendientes.push(c); return }
    try { await this.pc.addIceCandidate(c) }
    catch { /* Puede corresponder a una oferta que fue reemplazada. El timeout comprueba la conexión real. */ }
  }
}
