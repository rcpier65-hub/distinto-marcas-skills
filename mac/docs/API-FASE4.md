# API macOS — Perfil, Soporte, Publicaciones, Calendario

Cliente: `Authorization: Bearer <supabase access_token>` (la sesión del login).

La clave `dst_live_…` sigue sirviendo solo para `GET /api/v1/tareas` (`tareas:read`). En estas rutas responde 403. No mandar `CRON_SECRET` desde el Mac.

Base: `https://distinto-app.vercel.app`

## `GET /api/v1/perfil`

Nombre, email y rol del usuario de la sesión. No edita nada.

```json
{
  "ok": true,
  "perfil": {
    "user_id": "…",
    "email": "pedro@agenciadistinto.com",
    "nombre": "Pedro",
    "rol": "Director",
    "rol_base": "director",
    "cargo": null,
    "es_equipo": true,
    "activo": true,
    "es_director": true
  }
}
```

Sin fila en `team_members` (admin/owner): `es_equipo: false`, `nombre` y `rol` en null. Miembro inactivo: 403.

Las claves de dispositivo se siguen creando en la web (Perfil → Kairos). Este GET no las lista.

## `GET /api/v1/soporte`

Misma visibilidad que `/soporte`: director, o usuario sin `team_member`, ve el equipo (máx. 300). El resto ve solo los suyos. No hay ficha por reporte: `link` abre `/soporte`.

```json
{
  "ok": true,
  "es_admin": false,
  "total": 1,
  "reportes": [{
    "id": "…",
    "autor_nombre": "Lorena",
    "es_mio": true,
    "tipo": "falla",
    "descripcion": "…",
    "estado": "pendiente",
    "nota_resolucion": null,
    "imagenes": 0,
    "created_at": "2026-09-27T15:00:00.000Z",
    "resuelto_at": null,
    "resuelto_por": null,
    "link": "https://distinto-app.vercel.app/soporte"
  }]
}
```

`tipo`: `falla` | `pedido` | `consulta`. `estado`: `pendiente` | `en_proceso` | `resuelto`. `imagenes` es la cantidad, no las URLs.

## `GET /api/v1/publicaciones`

Lista de solo lectura. Default: desde 21 días atrás hasta 45 adelante (Lima). Opcional `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` (máx. 120 días).

Exige el módulo `publicaciones` (si no: 403 `No tienes acceso a Publicaciones`). Respeta `marcas_acceso`. Los estados salen como en el listado web (`pendiente`, `publicando`, `publicado`, `error`, `borrador`). `link` abre `/publicaciones/{id}`.

No usa el mock de la página web. `GET /api/v1/publicaciones/semana` y `/mes` siguen siendo de rutina (`CRON_SECRET`) y no los llama el Mac.

## `GET /api/v1/grabaciones/calendario`

Agenda de solo lectura del mes actual en Lima, o `?desde&hasta` (máx. 120 días).

Incluye `grabaciones` y `marca_reuniones`. No incluye Google Calendar (sigue en la web). Mismo permiso y filtro de marcas que Publicaciones. 403: `No tienes acceso al calendario`.

```json
{
  "ok": true,
  "desde": "2026-09-01",
  "hasta": "2026-09-30",
  "hoy": "2026-09-27",
  "total": 1,
  "eventos": [{
    "id": "…",
    "tipo": "grabacion",
    "fecha": "2026-09-28",
    "hora": "10:00",
    "hora12": "10:00 AM",
    "titulo": "Grabación · KintuOils",
    "estado": "planeada",
    "notas": null,
    "videos_grabados": null,
    "marca": { "slug": "kintu", "nombre": "KintuOils", "emoji": "🌿", "color": "#234347" },
    "link": "https://distinto-app.vercel.app/grabaciones/calendario?vista=dia&desde=2026-09-28&hasta=2026-09-28"
  }]
}
```

`tipo`: `grabacion` | `reunion`. `GET /api/v1/grabaciones/proximas` sigue siendo de rutina y no lo usa el Mac.
