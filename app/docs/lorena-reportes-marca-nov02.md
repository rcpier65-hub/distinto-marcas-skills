# Consulta de reportes de marca — Lorena, 2 noviembre 2026

Lorena ya tenía Marcas y Métricas habilitados, con acceso a todas las marcas.
Los reportes ignoraban esos permisos y exigían rol admin/director. Se conserva
su rol Community Manager, sus permisos individuales y las exclusiones de tareas.

`actor.canViewReports` reconoce Marcas + Métricas para usuarios activos del
equipo. Se aplica a las pestañas, el acceso desde Resumen, las páginas directas,
las métricas Meta, comentarios de publicaciones, TikTok, historial de pauta y
reporte 360. Cada API sigue validando la marca autorizada y excluyendo clientes.

Consulta y administración quedan separadas: el lector puede seleccionar meses,
consultar cifras y exportar PDF. Actualizar la instantánea compartida, enviar
correos, gestionar conexiones o cambiar presupuestos conservan su autorización
anterior; sus controles no se muestran al lector. Finanzas continúa privada.

Pruebas: compilación/TypeScript/lint aprobados. `test-brand-report-permissions.mjs`
comprueba con sesiones propias de Lorena los datos guardados y las rutas de
marca/reportes; rechaza gestión y Finanzas; Ailyn puede abrir Tareas pero no los
reportes sin permiso; anónimo bloqueado. No modifica roles, permisos ni datos.
Navegador con Lorena: aparecen ambas pestañas y cargan las cifras guardadas de
TypHouse, Facebook, Instagram y TikTok; botón Exportar PDF visible.

## Publicación y comprobación final

Publicado en Hostinger como `98278a6`, preservando `6143c73` y las mejoras
previas. Compilación local, runtime Linux sin cambios de dependencias, tres
redes conservadas. Producción se comprobó antes de promover y después.

La prueba de permisos pasó en candidato y producción. Navegador con la sesión
propia de Lorena conectado a producción: ambas pestañas cargaron, las métricas
de redes y el historial de anuncios fueron visibles; Exportar PDF disponible.
Evidencia: `output/lorena-marcas-nov02/redes-lorena-publicado.png`.

Se cerró exclusivamente la sesión temporal de comprobación, sus pestañas y
el túnel local. Los dos contenedores candidatos se retiraron ya detenidos.
No se enviaron mensajes ni se modificaron datos comerciales.
