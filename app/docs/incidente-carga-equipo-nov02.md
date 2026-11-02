# Carga del equipo y hábitos — 2 de noviembre de 2026

Base comprobada: producción 1dee274, checkout 24c8e19 (solo documentación adicional).
Se conservaron Finanzas, Deudas, permisos y datos comerciales.

## Evidencia

- VPS de 16 GB: 15.3 GB usados, swap de 6 GB agotada, carga 100–180 y presión
  de memoria sostenida. Auth registraba timeouts/504; no eran contraseñas erróneas.
- Shalom (otra aplicación) ocupaba 5.24 GiB, 521 procesos y no tenía límites.
  También había varias sesiones de desarrollo. Estas últimas no se cerraron.
- El host reinició a las 13:30 UTC antes de nuestra intervención sobre Shalom.
  Causa del reinicio no confirmada. No se ejecutó reboot ni se reinició el host.
- Pedro autorizó reiniciar Shalom y limitar recursos. Se paró/arrancó únicamente
  `shalom-bot`: 2 GiB RAM, 3 GiB RAM+swap, 1 CPU y 256 PIDs. Se guardó el mismo
  límite en su compose con respaldo previo. Contenedor running sin OOM/reinicios;
  no se probaron envíos ni operaciones comerciales del bot.
- Después: unos 6 GB disponibles y swap sin uso. Prueba HTTP autenticada de
  Lorena, Pieer y Ailyn: Inicio, Editor/Diseño y Soporte entregaron 200 en
  0.35–1.05 s, sin redirecciones a Inicio/login. No equivale al tiempo total
  de renderizado en sus dispositivos.

## Corrección de la aplicación

- Polling y realtime comparten exclusión hasta que React termina el refresco;
  intervalo de polling mínimo 30 s. Se cancelan listeners/timers al desmontar.
- Al navegar por enlaces se suspenden refrescos y lecturas automáticas de chat
  y pendientes hasta que cambie la ruta; estas lecturas tampoco se solapan.
  Se reprodujo Editor → Hábitos que regresaba a Editor y se verificó navegación
  correcta después del ajuste. Sidebar no precarga todas las rutas visibles.
- Cerrar bienvenida elimina solo `welcome` en la URL actual y su temporizador
  se cancela al desmontar; no dispara navegación tardía a Inicio.
- Hábitos usan estado explícito e idempotente (marcar/desmarcar), fecha Lima,
  bloqueo de clics durante el guardado y estado optimista basado en lectura
  del servidor. Un fallo no revierte otros hábitos; una lectura fallida se
  muestra como indisponible, no como todos desmarcados.
- Se mantienen validación de propietario y día actual. Los errores al consultar
  permisos no se interpretan como propietario; middleware distingue 504/429 de
  sesión ausente. API v1 acepta `completado: boolean`, conservando `{id}` legado.

## Verificación

- TypeScript, lint de los archivos afectados y diff check.
- `TEST_BASE_URL=... node scripts/test-habit-retries-live.mjs` desde app/:
  reintentos concurrentes/sucesivos, persistencia, otro miembro bloqueado,
  estado inválido rechazado, otra marca de hábito conservada. Solo fixtures QA.
- `TEST_BASE_URL=... node scripts/test-team-navigation-live.mjs`: lectura con
  sesiones propias de prueba de las tres cuentas; se cierra solo cada sesión.
- Navegador local con sesión de Lorena: cerrar bienvenida, marcar hábito QA,
  navegar a Editor y Hábitos, recargar y comprobar que sigue marcado.
- Fixtures y sesión local retirados. Sin cambios a tareas/hábitos reales ni
  notificaciones/mensajes enviados a clientes.

## Publicado

Producción `/api/version` = `6143c73`, validada después de promover la imagen
probada en un puerto privado. Compilación local aprobada; no se compiló Next
en el VPS saturado. Se preservaron las tres redes y el entorno secreto.

La prueba de hábitos pasó también en producción: reintentos concurrentes,
persistencia y aislamiento; fixtures retirados. Las nueve lecturas con Lorena,
Pieer y Ailyn entregaron 200 en 0.36–0.92 s. Es tiempo HTTP completo de la
prueba, no una medición del dispositivo de cada miembro. Shalom sigue running,
sin OOM ni reinicios y con límites persistentes.
