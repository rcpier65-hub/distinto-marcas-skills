# Propuestas personalizables desde Presentaciones

En «Tu propuesta», «Personalizar propuesta» abre el alcance de esa reunión:
contenido, reuniones, cantidades, frecuencia (semanal, mensual o por proyecto),
servicios y precios, exclusiones, datos del cliente y condiciones. Se puede añadir
un concepto libre, quitarlo o desmarcar su inclusión. Las cantidades de entregables
no multiplican el precio del paquete; las unidades del servicio sí.

La sesión conserva una copia independiente del documento y sus filas de alcance
(`personalizacion` en su JSON existente). No cambia el catálogo ni requiere migración.
Vista previa, Guardar propuesta y Descargar PDF usan esa misma copia. Las notas
privadas de reunión siguen fuera del documento comercial.

Si Planes contiene una revisión posterior, Presentaciones exige cargarla antes
de guardar. La actualización compara revisiones para conservar cambios simultáneos.
Las sesiones anteriores sin personalización mantienen el flujo original.

Verificación: TypeScript, ESLint afectado, tests de presentación existentes y
`scripts/test-presentacion-personalizada.ts`. Prueba real temporal: agregar/quitar
alcances, precio, recargar, guardar, PDF y conflicto de edición desde Planes sin
duplicar propuestas. PDF de tres páginas generado por el servicio existente;
inspección del texto y renderizado con cantidades y frecuencias conservadas.

## Publicación verificada

Producción `/api/version`: `287ac67`, rama `codex/propuesta-personalizable`, sobre
`4d23a3e` (incluye notas Social Media y FAQ por servicio). Se comprobó la versión
activa antes de publicar y se conservaron las tres redes del contenedor. Compilación
acotada a 1 CPU / 3 GB; candidato independiente validado antes de reemplazar la app.

Navegador en producción: nueva opción visible en la propuesta existente de Brenda,
sin modificar su contenido; agregar historias, editar frecuencia/cantidad, quitar
alcances y actualizar verificados en una presentación temporal. PDF real de tres
páginas comprobado otra vez después de publicar. Registros temporales eliminados,
sesión de prueba cerrada y contenedor de ensayo retirado. Sin envíos a clientes.
Evidencia en `output/propuesta-personalizada-nov03/` del checkout de trabajo:
`editor-publicado.png`, `entrada-publicada.png` y PDF de prueba.
