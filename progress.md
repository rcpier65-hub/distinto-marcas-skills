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

## Revisión solicitada: oficina moderna, asientos y personalización
- Retirada toda la vista 2D (render, canvas auxiliar, minimapa y editor de sprites). WebGL fallido ofrece reintentar 3D conservando la conexión.
- Dos mesas compartidas para seis puestos + escritorio de gerencia Pedro; siete identidades de escritorio preservadas. Sillas explícitamente vinculadas y centradas.
- Un único modelo de 28 asientos para dibujo, picking, colisión y navegación. Sillones accesibles con respaldo bloqueado y plazas transitables; controles Ir a zona y Levantarse.
- Suelos continuos por zona, contorno de color, vidrio con menos marcos, mesas redondeadas, sillas ergonómicas, luz y marca oficial.
- Rig humano compartido con el editor: rodillas/codos articulados, ciclo proporcional a distancia, giro y sentada interpolados. Personalización: hombre/mujer/neutro, tres caras, ocho peinados, ojos/piel/pelo, prendas/pantalón/accesorios/barba. Campos nuevos opcionales para avatares antiguos.
- Guardado del avatar validado y confirmado en servidor antes del mensaje de éxito; sin migraciones.
- Pruebas: 28 destinos alcanzables y rutas sin rozar obstáculos (radio .32); todas las sillas centradas, gerencia, 24 combinaciones cuerpo/peinado y pose sentada; audio previo sin regresiones; build local y TypeScript correctos. CUA local confirma recorrido al sillón, postura y editor 3D sin errores JS.
- Producción revisión: dpl_8eGDHptShtUBR6ap1qwvjDm3e7sw (commit d6a9041), alias distinto-app.vercel.app, 2026-09-28. Primer build falló en caché next/font/Inter Tight; recompilar con --force sin caché funcionó, sin modificar tipografías.
- CUA en sesión real: Ir a Lounge → Sentado; Levantarse; clic directo sobre otro cojín → camina y se sienta; Ir a Gerencia → Sentado y silla centrada ante monitor. Sin opción 2D; mic/cámara apagados al recargar.
- Guardado real: cambiar rostro ovalado → angular, guardar, recargar y reabrir muestra angular seleccionado. Restaurado ovalado y comprobado. Capturas de sillón, gerencia y editor guardadas fuera del repo. Sin errores JavaScript. Ambos checks de Vercel en PR #28 correctos.
