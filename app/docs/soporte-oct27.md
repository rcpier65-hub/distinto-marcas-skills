# Soporte — 27 de octubre de 2026

Versión publicada `bed19f0`, sobre `807ebfd` (infraestructura Supabase VPS)
y runtime anterior `302f5d7`. Rama `codex/soporte-oct27`.

## Reportes atendidos

- Lorena, `d48d9929-89cb-43af-ad14-3168adb28986`: descargar portadas desde celular.
  Publicar hoy abría Drive y el endpoint de descarga solo admitía clientes (401
  reproducido con Lorena). Ahora equipo autorizado y cliente descargan el archivo
  original desde Distinto. Botón compartido en Publicar hoy, portal y detalle,
  con carga, timeout y error visible; aislamiento por marca conservado.
- Lorena, `f7586f52-5ffd-45d9-b69d-b8355fc6ca99`: cronómetro salta a dos minutos.
  El primer render podía usar la hora local antes de medir el desfase y el inicio
  provisional no era el almacenado. Ahora se espera la medición y las acciones
  devuelven inicio/acumulado reales. Pausar no suma tiempo provisional que luego
  pueda duplicarse ante un error. Se conserva todo el tiempo histórico.
- Ailyn, `884c3c3f-02fc-4c45-b3b5-3e8900426ff2`: imágenes de packs. Pedro confirmó
  que el destino es el boceto de Planificación. El pegado nativo ya funcionó en
  esta revisión con su cuenta; la barra de referencias solo existía en bocetos
  vinculados a Diseño. Se habilitó en todas las hojas editables: varias imágenes,
  pegado y arrastre, reducción a WebP de hasta 1800 px y posiciones separadas
  para un lote. Texto y objetos de Excalidraw conservan su pegado habitual; los
  clientes conservan solo lectura. Límites de 20 MB por archivo y 15 MB por hoja.

## Verificación

- Build Next/TypeScript aprobado, lint de módulos nuevos y lienzo aprobado.
  En cuatro componentes grandes se conservan exactamente los errores/avisos
  anteriores; cero incidencias nuevas de lint.
- `node --env-file=.env.local scripts/test-soporte-oct27.mjs`, local,
  candidato privado del VPS y producción: portada idéntica por SHA-256 al original,
  equipo/cliente, marca ajena, anónimo/inactivo, iniciar/pausar/reanudar sin sumar
  minutos, relojes ±2 minutos, Ailyn guarda dos imágenes y cliente no lee hoja privada.
- Navegador con cuenta Ailyn: pegar PNG, cargar dos PNG juntos, volver a pegar,
  recargar y verificar cuatro imágenes guardadas. Hoja temporal eliminada.
- Navegador en producción: descarga real `portada-4-CLIENTE.png` sin abandonar
  Publicar hoy. No se probó el dispositivo físico de Lorena ni un iPhone físico.
- Tres resoluciones mediante acción existente `resolverReporte`, con notas y
  aviso en campana/push. Verificados `avisado_at` y cero reportes pendientes.
  No se enviaron WhatsApp ni correos. Tareas/cuentas/tiempos de QA eliminados.

## Publicación y continuidad

Next compilado localmente; solo `.next` de producción (sin cache ni dev) copiado
sobre runtime Linux anterior. Imagen `distinto-agencia:soporte-bed19f0`, candidata
en 127.0.0.1:8122 antes de promover a `distinto-agencia:prod`. Se comprobó la
versión vigente inmediatamente antes de reemplazar exclusivamente el contenedor
`distinto-agencia`. Se conservan las dos redes, app.env, Supabase VPS y otros servicios.
Imagen de retorno a la versión anterior, también con Supabase VPS:
`distinto-agencia:soporte-base-302f5d7`.

Los adjuntos históricos de soporte siguen bloqueados por Cloud con HTTP 402;
no se vieron sus capturas ni se alteraron sus enlaces. Este pendiente de la
migración no se declara resuelto. Evidencia visual en
`output/soporte-oct27/soporte-resuelto.png` del directorio principal de trabajo.

Consultar otra vez `/api/version` antes del siguiente cambio.
