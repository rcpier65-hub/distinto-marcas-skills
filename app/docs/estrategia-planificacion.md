# Espacio de marca: Estrategia y Planificación

## Entrada y navegación

Abre una marca desde el menú lateral o desde «Abrir espacio de marca» en Marcas. La grilla anterior sigue disponible mediante «Ver grilla».

- **Resumen:** objetivo del mes, campaña prioritaria, pendientes, aprobaciones, calendario, producción, equipo con acceso y cambios recientes.
- **Planificación:** hojas independientes, en blanco o con plantilla de reunión. Título, responsable, participantes, periodo, fecha de reunión, estado, duplicación y archivo.
- **Campañas:** objetivo, oferta, audiencia, concepto, periodo, indicador, presupuesto, trabajo vinculado, aprobaciones, calendario y resultados.
- **Oportunidades:** evidencia, fuente, hipótesis y oportunidad para la marca; no convierte una hipótesis en un hecho.
- **Marca:** contexto que ya utiliza Creación de Ideas, alcance mensual confirmado y biblioteca con Drive, guiones y reuniones anteriores.

## Qué se sincroniza

El calendario consulta las publicaciones, tareas, diseños, edición, grabaciones, reuniones y fechas importantes existentes. No crea otra agenda ni copia estos registros. La entrega de edición/diseño es distinta de la publicación. Cada actividad abre su módulo de origen; los cambios reaparecen al refrescar (el resumen se actualiza cada 30 segundos). Los elementos sin fecha aparecen en pendientes de programar. Las reuniones ya sincronizadas con Google siguen usando su integración actual.

Los acuerdos confirmados insertan tareas reales en `tareas`, con marca, categoría, responsable y fecha. El detalle conserva entregable, prioridad, referencias y enlace a la hoja. El calendario y la hoja leen el estado de esa misma tarea. La confirmación usa una transacción y bloqueo por acuerdo para impedir duplicados. Eliminar la tarea no autoriza recrearla al reintentar.

Los resultados comerciales de una campaña se registran con fuente, evidencia y periodo de medición. Para servicios: consultas de WhatsApp, citas agendadas, citas atendidas y servicios contratados. Son datos manuales con evidencia en esta versión; no se deducen de reuniones internas ni de pedidos de Shopify. Los reportes de Ads existentes continúan en su módulo.

El alcance mensual se confirma por dirección, con referencia al acuerdo comercial. Sesiones, videos, diseños y adaptaciones conservan unidades distintas. No se deduce un contrato de una propuesta en borrador. El avance disponible se consulta en los módulos existentes; las adaptaciones sin unidad propia se muestran como «Sin registro».

## Trabajo en una hoja

El lienzo permite texto, formas, conectores, imágenes, movimiento, zoom, deshacer y exportación. El guardado es automático; conserva un respaldo local mientras el servidor no confirma. La colaboración actualiza elementos y presencia por sondeo, aproximadamente cada 3 segundos. «Seguir su vista» permite acompañar a un compañero. El historial permite recuperar el lienzo sin borrar audio ni tareas ya enviadas. Evita cerrar si indica cambios pendientes.

Las notas escritas tienen guardado explícito y respaldo local. Al preparar acuerdos con IA se guardan primero las notas de la sesión. El lienzo ofrece contexto; una idea dibujada no crea tareas por sí sola.

Para grabar, confirma primero el consentimiento. El micrófono se solicita solo al pulsar iniciar. Se puede incluir audio de una pestaña si el navegador ofrece «Compartir audio»; el micrófono por sí solo no garantiza capturar a los participantes remotos. Hay pausa, continuación y término. Los tramos se guardan en un bucket privado, con copia local si falla la subida. El audio guardado se puede reproducir y reintentar su transcripción. No se identifica automáticamente a cada hablante.

La IA propone resumen, decisiones, dudas y acuerdos con cita literal de notas/transcripción. Nunca asigna responsables ni fechas por su cuenta. Cada acuerdo se revisa, edita, descarta, divide, combina o vincula a una tarea existente. Solo «Confirmar y crear tareas» realiza el envío. No se mandan WhatsApps ni correos automáticamente.

## Permisos y cliente

El acceso respeta marca, cuenta activa y permiso de Marcas; las consultas de tareas conservan asignación y exclusiones existentes. Solo responsables/dirección confirman planes y comparten hojas. Los clientes ven únicamente hojas expresamente compartidas, en lectura, con comentarios compartidos. El audio, transcripción, acuerdos, historial y presencia internos no se envían al cliente. Una tarea nueva se mantiene privada salvo que se marque para el cliente antes de confirmarla; vincular una tarea anterior conserva su visibilidad.

## Datos y operación

Migración: `supabase/migrations/20261015090000_estrategia_planificacion.sql`. Tablas `strategy_*` con RLS activado y sin acceso directo para anon/authenticated. Las rutas de servidor validan sesión, marca, permisos y origen. Bucket `strategy-recordings` privado; enlaces de audio firmados por 60 segundos. Ninguna credencial se entrega al navegador.

Rutas de equipo: `/marca/[slug]/estrategia` y `/marca/[slug]/estrategia/hoja/[id]`. Ruta compartida: `/cliente/planificacion/[id]`. APIs: `/api/estrategia`, `/api/estrategia/hojas/[id]` y `/api/estrategia/audio`.

El lienzo carga Excalidraw 0.18.1 bajo demanda; las fuentes se sirven desde el mismo dominio, con avisos de licencia incluidos. No se envían hojas al backend público de Excalidraw. Producción se publica en Hostinger mediante el procedimiento existente; no en el Vercel pausado.
