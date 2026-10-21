/* Cola de autoguardado de la presentación (revisión 21-oct-2026): un envío a
   la vez, siempre con el dato más reciente, y `vaciar()` para enviar lo
   pendiente antes de generar la propuesta o al salir de la página. Así un
   guardado viejo nunca pisa uno nuevo y no se pierden las últimas teclas. */
export type EstadoCola = "ok" | "pendiente" | "error";

export function crearCola<T>(enviar: (v: T) => Promise<boolean>, esperaMs = 800) {
  let pendiente: { v: T } | null = null;
  let enCurso: Promise<boolean> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let ultimo = true;
  const oyentes = new Set<(e: EstadoCola) => void>();
  const avisar = (e: EstadoCola) => oyentes.forEach((f) => f(e));

  async function bombear(): Promise<boolean> {
    while (pendiente) {
      if (enCurso) { await enCurso; continue; }
      const { v } = pendiente;
      pendiente = null;
      enCurso = enviar(v).catch(() => false);
      ultimo = await enCurso;
      enCurso = null;
    }
    avisar(ultimo ? "ok" : "error");
    return ultimo;
  }

  return {
    programar(v: T) {
      pendiente = { v };
      avisar("pendiente");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; if (!enCurso) void bombear(); }, esperaMs);
    },
    /* Envía ya lo pendiente y espera a que todo termine. */
    async vaciar(): Promise<boolean> {
      if (timer) { clearTimeout(timer); timer = null; }
      if (enCurso) await enCurso;
      return pendiente ? bombear() : ultimo;
    },
    hayPendiente: () => !!pendiente || !!enCurso || !!timer,
    /* Último dato sin enviar (para un envío keepalive al cerrar la página). */
    tomarPendiente(): T | null { const v = pendiente?.v ?? null; pendiente = null; if (timer) { clearTimeout(timer); timer = null; } return v; },
    alCambiar(f: (e: EstadoCola) => void) { oyentes.add(f); return () => { oyentes.delete(f); }; },
  };
}
