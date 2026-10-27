# Supabase de Distinto en el VPS

Instancia independiente en `/docker/distinto-agencia-supabase`. No reutilizar
las claves ni los volúmenes de los otros Supabase del servidor.

- API pública: `https://app.distintostudio.com/supabase` (Traefik, TLS).
- API privada: `127.0.0.1:8102`; PostgreSQL: `127.0.0.1:5435`, con TLS.
- Red: `distinto-agencia-supabase_default`, `10.78.40.0/24`.
- Servicios: PostgreSQL 17, Auth, PostgREST, Realtime, Storage, imgproxy y Kong.
  No se exponen Studio ni PostgreSQL en Internet.
- `.env`, `kong.yml` renderizado, llaves TLS y respaldos son privados y no van a Git.
- La app debe pertenecer a esta red además de su red anterior. Publicar con un
  compose antiguo que quite esta conexión rompe las consultas SQL de la app.
- Para herramientas locales, abrir un túnel SSH a `127.0.0.1:5435` del VPS;
  no volver a apuntar herramientas al proyecto Cloud anterior.

Los archivos SQL de inicialización proceden de Supabase, commit
`5bdb7399e80c8ed09c4633174f6e569fd58d8d7f`, carpeta `docker/volumes/db`.
El compose está adaptado a la agencia, con límites de memoria y logs.
`kong.template.yml` contiene marcadores para las dos claves API; renderizarlo
con las claves de `.env`, sin imprimirlas, y dejar `kong.yml` con propietario
1001:1001 y modo 600. La carpeta padre debe conservar modo 700.

## Respaldo y recuperación

`backup.sh` genera un dump completo, archivos de Storage, configuración,
certificado/clave TLS y configuración de la app. Retiene siete ejecuciones
terminadas; el respaldo original de Cloud permanece independiente. Los
respaldos contienen datos y secretos: directorios 700 y archivos 600.

Un respaldo en el mismo VPS protege ante errores de operación, pero no ante
la pérdida del servidor. Se conserva también una copia inicial local en
`output/migracion-supabase-oct26/` fuera del repositorio. Para recuperación,
levantar una instancia aislada con las mismas versiones y secretos, restaurar
el dump y el volumen de Storage, comparar conteos y probar acceso antes de
cambiar tráfico. No ejecutar restauraciones destructivas sobre producción.

El proyecto Cloud se conserva como respaldo y fuente de los archivos cuya
descarga permanece bloqueada por HTTP 402. No cancelar ni borrar ese proyecto
hasta recuperar y verificar todos los archivos pendientes.
