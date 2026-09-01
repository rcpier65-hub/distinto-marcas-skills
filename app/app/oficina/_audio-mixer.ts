'use client'

// app/app/oficina/_audio-mixer.ts
//
// Mezclador de audio de la oficina. Cada persona pasa por su propio control
// de volumen y de paneo, así se oye más fuerte al que tienes cerca y por el
// lado que corresponde.
//
// ¿Por qué no usar simplemente `<video>.volume`?
//   En iPhone/iPad NO se puede: Safari trata `volume` como solo lectura y la
//   asignación se ignora en silencio. Con el elemento suelto, en un iPhone
//   TODOS sonarían al 100%: adiós al audio por cercanía, que es justamente
//   la gracia del módulo. Con Web Audio funciona en todos lados.
//
// Beneficios extra: el cambio de volumen se suaviza (setTargetAtTime) para
// que no "escalone" al caminar, y el paneo estéreo sale gratis.

type Nodo = {
  fuente: MediaStreamAudioSourceNode
  gain: GainNode
  pan: StereoPannerNode | null
  /* Mide el nivel de voz: así el aro verde de "está hablando" sale solo
     cuando de verdad habla, no por el simple hecho de estar conectado. */
  analizador: AnalyserNode
  datos: Uint8Array
  /* El <audio> silenciado mantiene viva la pista en algunos navegadores:
     sin un elemento que "consuma" el stream, Safari no alimenta el nodo. */
  ancla: HTMLAudioElement
}

export class MezcladorOficina {
  private ctx: AudioContext | null = null
  private nodos = new Map<string, Nodo>()
  private destino: GainNode | null = null

  /** Debe llamarse dentro de un gesto del usuario (click), o Safari no deja. */
  async iniciar(): Promise<boolean> {
    try {
      if (!this.ctx) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AC: typeof AudioContext = window.AudioContext ?? (window as any).webkitAudioContext
        if (!AC) return false
        this.ctx = new AC()
        this.destino = this.ctx.createGain()
        this.destino.gain.value = 1
        this.destino.connect(this.ctx.destination)
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      return this.ctx.state === 'running'
    } catch {
      return false
    }
  }

  get activo(): boolean {
    return !!this.ctx && this.ctx.state === 'running'
  }

  /** Engancha el audio de una persona al mezclador. Idempotente. */
  agregar(id: string, stream: MediaStream): void {
    if (!this.ctx || !this.destino) return
    if (this.nodos.has(id)) return
    if (stream.getAudioTracks().length === 0) return
    try {
      const ancla = document.createElement('audio')
      ancla.srcObject = stream
      ancla.muted = true            // el sonido sale por Web Audio, no por acá
      ancla.autoplay = true
      ancla.setAttribute('playsinline', '')   // iOS: no abrir el player nativo
      void ancla.play().catch(() => { /* el gesto de entrada ya lo habilitó */ })

      const fuente = this.ctx.createMediaStreamSource(stream)
      const gain = this.ctx.createGain()
      gain.gain.value = 0
      let pan: StereoPannerNode | null = null
      try {
        pan = this.ctx.createStereoPanner()
        fuente.connect(pan); pan.connect(gain)
      } catch {
        fuente.connect(gain)        // navegadores viejos sin paneo
      }
      const analizador = this.ctx.createAnalyser()
      analizador.fftSize = 256
      analizador.smoothingTimeConstant = 0.6
      gain.connect(analizador)
      gain.connect(this.destino)
      const datos = new Uint8Array(analizador.frequencyBinCount)
      this.nodos.set(id, { fuente, gain, pan, ancla, analizador, datos })
    } catch { /* si falla, esa persona simplemente no suena */ }
  }

  /** Ajusta volumen (0..1) y paneo (-1 izquierda .. 1 derecha), suavizado. */
  ajustar(id: string, gain: number, pan: number): void {
    const n = this.nodos.get(id)
    if (!n || !this.ctx) return
    const t = this.ctx.currentTime
    const g = Math.max(0, Math.min(1, gain))
    try {
      n.gain.gain.setTargetAtTime(g, t, 0.08)
      if (n.pan) n.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.12)
    } catch { /* noop */ }
  }

  /** Nivel de voz de alguien, 0..1. Sirve para el aro de "está hablando". */
  nivel(id: string): number {
    const n = this.nodos.get(id)
    if (!n) return 0
    try {
      n.analizador.getByteFrequencyData(n.datos as unknown as Uint8Array<ArrayBuffer>)
      let suma = 0
      for (let i = 0; i < n.datos.length; i++) suma += n.datos[i]
      return Math.min(1, (suma / n.datos.length) / 45)
    } catch { return 0 }
  }

  quitar(id: string): void {
    const n = this.nodos.get(id)
    if (!n) return
    try { n.analizador.disconnect() } catch { /* noop */ }
    try { n.fuente.disconnect() } catch { /* noop */ }
    try { n.pan?.disconnect() } catch { /* noop */ }
    try { n.gain.disconnect() } catch { /* noop */ }
    try { n.ancla.srcObject = null; n.ancla.remove() } catch { /* noop */ }
    this.nodos.delete(id)
  }

  /** Silencia todo de golpe (modo fantasma, o al salir de la oficina). */
  silenciarTodo(): void {
    for (const id of this.nodos.keys()) this.ajustar(id, 0, 0)
  }

  destruir(): void {
    for (const id of Array.from(this.nodos.keys())) this.quitar(id)
    try { void this.ctx?.close() } catch { /* noop */ }
    this.ctx = null
    this.destino = null
  }
}
