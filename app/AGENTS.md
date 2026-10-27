<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Producción desde el 26 de octubre de 2026

Supabase de esta app está alojado en el VPS, con API pública
`https://app.distintostudio.com/supabase`. No usar el proyecto Cloud anterior
para cambios ni restaurar su respaldo sobre la base activa. Consultar
`docs/migracion-supabase-vps-oct26.md` y `/api/version` antes de trabajar.
Preservar ambas redes del servicio app en `deploy/vps/docker-compose.yml`.
Quedan 47 adjuntos históricos bloqueados en Cloud; no borrar ese proyecto.
