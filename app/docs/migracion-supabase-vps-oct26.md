# Migración de Supabase al VPS — 26 de octubre de 2026

Pedro rechazó contratar Pro y autorizó trasladar la operación al VPS existente.
La cuota de transferencia del proyecto Cloud bloqueaba Auth/API/Storage con
HTTP 402. El mensaje anterior de contraseña incorrecta ocultaba esta causa.

## Producción activa

- App: `https://app.distintostudio.com`, versión `302f5d7`, basada en `70c7f33`.
- API/Auth/Storage/Realtime: `https://app.distintostudio.com/supabase`.
- Instancia independiente: `/docker/distinto-agencia-supabase`.
- Infraestructura reproducible: `deploy/vps/supabase/README.md`.
- Imagen: `distinto-agencia:vps-supabase-302f5d7`, promovida a `distinto-agencia:prod`.
- La compilación Next se hizo localmente con el nuevo URL y la clave pública;
  se reutilizó el runtime Linux vigente sin compilar Next en el VPS.
- Las claves privadas están exclusivamente en los archivos protegidos del
  servidor y respaldos locales privados. No incluirlas en documentos ni Git.

Se conservaron los usuarios y los hashes de contraseña. Como el emisor y la
firma de sesión cambiaron, las sesiones anteriores requieren entrar nuevamente
con las credenciales habituales. No se restablecieron contraseñas.

Se cambiaron únicamente las variables de Supabase en el entorno de la app.
Las claves de cifrado, Meta, Google, SMTP, notificaciones y cron se conservaron.
La app necesita la red externa `distinto-agencia-supabase_default`, además de
su red anterior; el compose versionado ya incluye ambas.

## Verificaciones realizadas

- Copia de las 90 tablas públicas: comparación completa por digest sin diferencias
  antes de dirigir la app al VPS. Conteos coincidentes en 124 tablas de datos.
- 27 usuarios de Auth, identidades, sesiones, permisos, secuencias y metadatos
  Storage conservados. Se respetaron las versiones internas de migraciones de
  los servicios nuevos y se restauraron las políticas aplicables.
- Inicio de sesión con contraseña original en los ocho miembros activos y
  el cliente TOTAL SUPS. Formularios reales del servidor devuelven redirección
  correcta; cliente aislado de administración y páginas anónimas protegidas.
- Lectura del portal, TypHouse, Diseño y calendario en producción. Comprobación
  visual de TypHouse con tareas, planificación, reuniones y métricas presentes.
- Realtime autenticado: conexión WebSocket y broadcast; 17 tablas conservadas
  en la publicación de cambios de PostgreSQL.
- Nuevos archivos públicos/privados subidos y descargados con bytes idénticos;
  privado bloqueado sin autorización; URL firmada correcta bajo `/supabase`.
- Respaldo completo y restauración real en una base temporal: 27 usuarios,
  22 marcas y 47 objetos de Storage en los metadatos. Base temporal eliminada.
- Copias iniciales de Cloud y del VPS fuera del servidor, verificadas por SHA-256.

Los archivos y sesiones temporales usados en las pruebas fueron limpiados. No
se crearon tareas ni eventos reales y no se enviaron correos a clientes.

## Pendiente: archivos históricos bloqueados en Cloud

Faltan **47 archivos binarios, 8,710,101 bytes**, no los registros de la app:
5 avatares, 9 imágenes del chat, 8 PNG de grillas y 25 imágenes de soporte.
Los buckets de propuestas y grabaciones de Estrategia estaban vacíos.

Cloud devuelve HTTP 402 también al descargar con autorización y usando el
endpoint oficial directo de Storage. El panel tampoco permitió exportarlos.
Los metadatos y enlaces originales permanecen intactos; algunos adjuntos
históricos seguirán sin abrir mientras dure esta restricción. Los archivos
nuevos se almacenan en el VPS.

No borrar ni cancelar el proyecto Cloud. Para completar la recuperación:

1. Conseguir acceso de exportación de Cloud sin contratar nada sin autorización.
2. Usar el manifiesto privado de `output/migracion-supabase-oct26/` para copiar
   los 47 objetos, conservando bucket, ruta y tipo de contenido. No sobrescribir
   objetos nuevos de producción; verificar tamaño y bytes al copiar.
3. Actualizar exclusivamente las referencias de los archivos recuperados:
   `team_members.avatar_url`, `soporte_reportes.imagenes` y
   `grillas_pendientes.png_url`. Las URL firmadas de grillas necesitan una firma
   nueva; cambiar solo el dominio no funciona con el nuevo secreto JWT.
4. Buscar referencias restantes al origen antiguo, probar permisos y registrar
   los objetos recuperados antes de considerar terminada esa parte.

El respaldo inicial de Cloud ya es histórico: **no restaurarlo sobre la base
activa del VPS**, que recibe cambios nuevos. Tampoco volver al entorno Cloud
como rollback automático: reintroduciría el bloqueo y omitiría datos nuevos.

## Operación

Respaldo diario a las 03:17 de Lima, siete copias completas retenidas. El cron
está en `/etc/cron.d/distinto-agencia-supabase-backup`; el script en
`/docker/distinto-agencia-supabase/backup.sh`. La copia fuera del servidor es
inicial, no una replicación remota periódica.

El entorno local de este checkout apunta al VPS; para SQL requiere túnel SSH
local 15435 hacia 127.0.0.1:5435 del servidor. Otros checkouts conservan su
entorno anterior: revisar las variables antes de ejecutar herramientas. Los
scripts históricos con conexiones Cloud fijas no deben usarse para modificar
la producción nueva. Consultar `/api/version` antes de cualquier publicación.
