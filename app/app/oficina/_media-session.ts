/** Captura explícita e independiente. Una respuesta tardía nunca reabre un dispositivo. */
export class MediaSession {
  private generation = 0
  private pending = new Set<'audio' | 'video'>()
  private tracks = new Map<'audio' | 'video', MediaStreamTrack>()
  constructor(private acquire: (c: MediaStreamConstraints) => Promise<MediaStream>,
    private changed: (kind: 'audio' | 'video', track: MediaStreamTrack | null) => void) {}

  async toggle(kind: 'audio' | 'video') {
    if (this.pending.has(kind)) return
    const previous = this.tracks.get(kind)
    if (previous) { this.stop(kind); return }
    const generation = this.generation
    this.pending.add(kind)
    try {
      const stream = await this.acquire(kind === 'audio'
        ? { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }
        : { audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 } } })
      if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return }
      const track = stream.getTracks().find(t => t.kind === kind && t.readyState === 'live')
      if (!track) { stream.getTracks().forEach(t => t.stop()); throw new Error('No hay dispositivo disponible') }
      this.tracks.set(kind, track)
      track.addEventListener('ended', () => {
        if (this.tracks.get(kind) === track) this.stop(kind)
      })
      this.changed(kind, track)
    } finally { this.pending.delete(kind) }
  }
  private stop(kind: 'audio' | 'video') {
    this.tracks.get(kind)?.stop()
    this.tracks.delete(kind)
    this.changed(kind, null)
  }
  close() { this.generation++; this.stop('audio'); this.stop('video') }
}
