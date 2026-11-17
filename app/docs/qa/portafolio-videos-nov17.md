# Portafolio vertical en Presentaciones — 17 noviembre 2026

Publicado en `https://app.distintostudio.com`, versión `2ff1c4a`
(commit `2ff1c4a8d61475d88caefd5d4d173bdd5556e72a`). Base comprobada al comenzar
y antes de publicar: `17e14b0fea07e7c96d4cb5f1309dc31df4df284f`. Worktree
`presentaciones-videos-work`, rama `codex/presentaciones-videos-verticales`.

## Cambio

Social Media → Cómo trabajamos → Nuestro trabajo: 58 videos verticales 9:16,
con Universitario primero. Catálogo cotejado con Inicio y Social Media de
`distintostudio.com`: 51 IDs TikTok únicos, todos incluidos, y 7 producciones
MP4 ya alojadas en la web. Se quitó el recorte de dos videos por marca. Pedro
confirmó incluir Universitario tras no encontrar un video identificado como
Alianza; no se inventó ni reasignó ninguno.

Solo se montan reproductores con al menos 25% de la tarjeta visible. Las vistas
previas son silenciadas, respetan reducción de movimiento, se detienen al ocultar
la pestaña o abrir el visor y tienen pausa general. Reproductor oficial TikTok,
`force_muted` y mensajes con comprobación de origen y ventana; error externo
conserva la portada y acceso al original. MP4 con autoplay, muted y playsInline.
Diálogo nativo ampliado con controles, pantalla completa del reproductor, Escape
y devolución de foco. Filtros por marca conservados. El visor respeta la
proporción sin recortar el contenido.

## Verificación

- ESLint de ambos archivos TypeScript y TypeScript sin errores.
- Build de producción completo: Next 16.2.6, webpack, un worker.
- Cotejo por HTTP de ambas galerías: 51 IDs web = 51 catálogo, cero faltantes,
  extras ni duplicados. Los siete MP4 existentes se conservaron.
- Navegador local: reproducción real de Universitario, La Victoria, Novalamps y
  Mil Ideas; filtro Universitario; pausa deja cero reproductores montados;
  abrir visor detiene el fondo; Escape cierra el visor. Los siete MP4 propios
  observados con tiempo avanzado, readyState 4, muted true y paused false.
- Navegador autenticado de producción, presentación FAS existente: 58 tarjetas,
  cuatro reproductores visibles al entrar, Universitario reproduciéndose en
  grande, fondo con cero reproductores al abrir el diálogo. Sin modificar notas,
  precios, propuestas ni destinatarios. Solo navegación del visor.
- Prueba de viewport móvil no concluyente: la herramienta mantuvo 1280×720 pese
  al override. No declarar validación en iPhone físico.
- Candidata: `/api/version`, login 200, 15 JS accesibles y bloqueo de
  Presentaciones sin sesión. Ruta local temporal de QA eliminada antes de build.

## Publicación y continuidad

Compilación local, candidata acotada en puerto loopback 8137; publicación conserva
el compose, secretos, límites y las tres redes de producción. Base runtime
`sha256:8bf6fa5d9c485123bb92470852c912d9ccf55643b135771b7543dca9501bbef9`;
rollback `distinto-agencia:portafolio-base-17e14b0`. Imagen nueva
`sha256:f26ca8f846a4d08a70626e5bbfd0339cc143a9c31c20dd25cea633f31292f6fd`.
Fuente y runtime: `/docker/distinto-agencia/portafolio-2ff1c4a`.
Candidata detenida y eliminada; no cambios de BD, credenciales, sitio público,
Vercel ni otros contenedores. Archivos locales ajenos conservados.

Evidencia local en `output/portafolio-nov17/`: build.log, candidate.log,
promote.log, galeria-publicada.jpg y universitario-publicado.jpg.
