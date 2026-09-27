# API macOS — resto del sidebar

Misma auth que [API-FASE4.md](./API-FASE4.md): `Authorization: Bearer <supabase access_token>` o `dst_live_…` con alcance `owner`. Una clave solo `tareas:read` recibe 403. `CRON_SECRET` no abre estas listas y no va en el Mac.

Base: `https://distinto-app.vercel.app`

Las filas abren el detalle en la web (`link`). Estos GET no crean ni editan.

`GET /api/v1/perfil` ahora incluye `modulos` (las mismas puertas que `Sidebar.tsx`) y `marcas_nav` (marcas activas dentro de `marcas_acceso`). El sidebar del Mac las usa para mostrar u ocultar módulos.

## `GET /api/v1/editor`

Módulo `editor`. Cola de las últimas publicaciones que no están publicadas (editar, aprobar, programar, publicar, borrador). No incluye tareas de diseño sueltas. `conteos` sale de esa ventana (hasta 500 filas), `piezas` es la cola (máx. 180). 403: `No tienes acceso a Editor`.

## `GET /api/v1/diseno`

Módulo `diseno`. Solo `es_tarea_diseno = true`, con la misma salida del tablero que la web (listo/enviado/archivado con sello y fecha de publicación no entran). `estado` es el sub-estado (`sin_empezar`, `en_progreso`, `pausada`, `listo`, `enviado`, `archivado`). Si falta la columna, `migracion_pendiente: true` y lista vacía. 403: `No tienes acceso a Diseño`.

## `GET /api/v1/historias`

Puerta de `/historias`: diseño, publicaciones, director, admin, o sin fila en `team_members`. Historias no canceladas. Respeta `marcas_acceso`. 403: `No tienes acceso a Historias`.

En la web el planificador se abre desde Diseño y Publicaciones; el Mac lo muestra en el sidebar con esa misma puerta.

## `GET /api/v1/influencers?marca=`

Módulo `publicaciones` y marcas con `influencers_activo` (si el flag es null, TypHouse / `little-joe` sigue activa). Incluye `telefono` y `productos`. 403: `No tienes acceso a Influencers`.

## `GET /api/v1/planes`

Solo `pedro@agenciadistinto.com`, igual que `/planes`. Catálogo comercial (`reglas` + `planes`). 403: `Planes es solo para Pedro`.

## `GET /api/v1/dashboard`

«Ver todas» y «Agregar marca»: director, admin, o sin fila de equipo. Marcas activas e inactivas y cuántas tareas abiertas tienen. El alta sigue en `link_nueva` (`/dashboard?nueva=1`).

`GET /api/v1/marcas` sigue siendo de rutina (`CRON_SECRET`). El Mac no lo llama.

## `GET /api/v1/grilla/:slug?vista=semana|mes`

Módulo `grilla` y la marca dentro de `marcas_acceso`. `semana` es lun–dom en Lima; `mes` es el mes en curso. Publicaciones del rango. Editar la grilla sigue en `link`. 403: `No tienes acceso a la grilla` o `No tienes acceso a esa marca`. 404 si el slug no existe.

## `GET /api/v1/habitos`

Hábitos activos del miembro (o `team_member_id` null si es owner). `completado_hoy` y `hechos_semana`. Marcar sigue en `/habitos`.

## `GET /api/v1/actividad?fecha=&persona=`

Reporte del día (tareas cerradas y videos editados, más hábitos completados). Director o sin fila ve al equipo; `persona` solo aplica en ese caso. El resto ve lo suyo. `fecha` default: hoy en Lima.

## `GET /api/v1/historial`

Director o sin fila, igual que el ítem Historial del sidebar. Últimas 100 grillas pedidas. 403: `Historial es solo para el director`.

## `GET /api/v1/equipo`

Módulo `equipo`. Nombre, email, rol, cargo, activo, cuántas marcas (null = todas) y piezas en edición. No incluye `password_inicial`. 403: `No tienes acceso a Mi equipo`.

## `GET /api/v1/settings`

Módulo `settings`. Cuenta, si Metricool / OpenAI / Claude están configurados (solo booleanos) y por marca: logo sí/no, nombre del grupo de WhatsApp, envío real, decisor y cantidad de correos. No devuelve tokens, API keys, chat ids ni las direcciones. 403: `No tienes acceso a Settings`.
