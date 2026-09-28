Original prompt: Corregir permisos/estado del micrófono y persistencia de Oficina; mejorar a oficina 3D con personajes humanos estilo videojuego.

- Base: origin/main 890fdec; trabajo en codex/oficina-3d.
- Hallazgo: entrar() solicita audio y lo activa; cámara readquiere audio; avisos usan window.location.href y reinician proveedor.
- Mantener proveedor global y salas/colisiones. Entrar sin captura; mic/cámara explícitos e independientes.
- Pruebas de navegador por CUA conforme a instrucciones de control del equipo; pruebas unitarias del ciclo de captura con dispositivos simulados.

- Implementado: MediaSession con audio/cámara independientes, captura solo por botón, mute detiene tracks, protección de doble clic y respuesta tardía al salir. Recepción WebRTC sin micro mediante transceiver y soporte streamless. Sender de cámara separado de pantalla.
- Persistencia: navegación SPA en avisos, sesión recordada en sessionStorage (retoma apagado), tolerancia de presencia de 120s para temporizadores de fondo.
- 3D: Three.js diferido, mapa y puertas compartidos con colisiones originales, mobiliario, iluminación/sombras, humanos estilizados con andar/sentarse, cámara orbital, clic para caminar, 2D opcional y fallback WebGL.
- Validación: test-office-media.ts PASS; build local y Vercel PASS; TypeScript PASS. ESLint de nueva escena sin errores; archivos previos conservan errores de lint (usarOficina no comienza por use y reglas de refs existentes).
- Producción: dpl_BA7rononDAzYnZsSpLqBzTSGGRZ7, https://distinto-app.vercel.app, 2026-09-28.
- CUA con sesión real: al entrar mic apagado; cambio 2D/3D; Inicio muestra mini-Oficina y 2 presentes; regreso conserva sesión; Ir a mi escritorio rodea obstáculos y termina Sentado. Sin errores JS.
- Alcance visual: humanos estilizados/procedurales, no fotorrealismo tipo GTA. Falta prueba de conversación real entre dos equipos/redes; producción muestra TURN no configurado.
- Prueba WebRTC local en navegador (audio sintético, sin hardware): PASS al replicar el ancla audio de MezcladorOficina; conexión inicial sin micro, recepción y reemplazo/liberación. Fixture reproducible app/scripts/fixtures/office-rtc.html. El primer intento sin ancla recibió paquetes pero WebKit no decodificaba; el mezclador real ya incluye esa ancla.
