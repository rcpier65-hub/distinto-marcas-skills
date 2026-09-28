/** Serializa replaceTrack: la última política siempre gana, incluso al
 * alejarse mientras el navegador sigue aplicando una pista anterior. */
export class AudioSenderGate {
  private wanted: MediaStreamTrack | null = null
  private running = false
  private disposed = false
  constructor(private sender: Pick<RTCRtpSender, 'replaceTrack' | 'track'>, private failed: () => void = () => {}) {}
  set(track: MediaStreamTrack | null, allowed: boolean): void {
    if (this.disposed) return
    this.wanted = allowed && track?.readyState === 'live' ? track : null
    void this.flush()
  }
  private async flush(): Promise<void> {
    if (this.running || this.disposed || this.sender.track === this.wanted) return
    this.running = true
    try {
      while (!this.disposed && this.sender.track !== this.wanted) await this.sender.replaceTrack(this.wanted)
    } catch { this.failed() }
    finally { this.running = false }
  }
  dispose(): void { this.disposed = true; this.wanted = null }
}
