# API macOS — Perfil, Soporte, Publicaciones, Calendario, Reportes, Notas, Oficina, Ideas

Cliente: `Authorization: Bearer <supabase access_token>` (la sesión del login)
**o** `Authorization: Bearer dst_live_…` con alcance `owner`.

Una clave solo `tareas:read` sigue limitada a `GET /api/v1/tareas` (403 en el resto).
La clave de un director, admin u owner se crea ya con `owner`. Las viejas se
amplían en Perfil → Kairos («Acceso completo») o con
`PATCH /api/v1/device-keys/:id` `{"scopes":["owner"]}`: el token no cambia.

**Nunca poner `CRON_SECRET` en el Mac ni en Nay.** Ese secreto es solo de rutinas
del servidor. La matriz completa está en `app/app/api/v1/README.md`.

Con `owner`, Nay llama igual que la sesión del dueño (mismos módulos y
`marcas_acceso`):

```bash
# Publicaciones de una marca
curl -H "Authorization: Bearer dst_live_…" \
  "https://distinto-app.vercel.app/api/v1/publicaciones?marca=kintu"

# Marca + facts + drive (drive.folder_id parseado de drive_url)
curl -H "Authorization: Bearer dst_live_…" \
  https://distinto-app.vercel.app/api/v1/marcas/kintu

# Editar una publicación
curl -X PATCH -H "Authorization: Bearer dst_live_…" \
  -H "Content-Type: application/json" \
  -d '{"copy":"Nuevo copy","estado":"aprobar"}' \
  https://distinto-app.vercel.app/api/v1/publicaciones/<uuid>

# Crear una tarea
curl -X POST -H "Authorization: Bearer dst_live_…" \
  -H "Content-Type: application/json" \
  -d '{"texto":"Cerrar pauta","marca_slug":"kintu"}' \
  https://distinto-app.vercel.app/api/v1/tareas
```

`GET /api/v1/marcas/:slug/facts` también acepta la clave `owner` (y sigue
aceptando `CRON_SECRET` para la Routine). Escribir facts es `PATCH` o `PUT`
en esa ruta, solo director/owner, sin cron.

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

Lista de solo lectura. Default: desde 21 días atrás hasta 45 adelante (Lima). Opcional `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` (máx. 120 días) y `?marca=<slug>` (404 si el slug no existe, 403 si está fuera de `marcas_acceso`).

`GET /api/v1/publicaciones/:id` devuelve copy, guion, estado real, fechas, Drive y links. `PATCH` en esa ruta actualiza esos campos si el usuario puede editar publicaciones. Detalle y curls en `app/app/api/v1/README.md`.

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

## `GET /api/v1/reportes`

Marcas activas de la sesión y el último mes de reporte (seed + `reportes_mensuales`; la base gana). Exige el módulo `metricas`. Si no: 403 `No tienes acceso a Reportes`.

`marcas_acceso` null ve todas. Una lista vacía devuelve cero marcas. Si hay ids, solo esas.

El hub web sigue pidiendo el código de acceso en el navegador. Este GET no lo usa y el Mac no lo guarda. Editar un mes sigue en `/reportes` (`link` de cada fila).

```json
{
  "ok": true,
  "total": 1,
  "con_datos": 1,
  "marcas": [{
    "slug": "little-joe",
    "nombre": "TypHouse",
    "emoji": "💙",
    "color": "#61B3D1",
    "tiene_datos": true,
    "meses": 7,
    "ultimo_mes": "2026-07",
    "ultimo_mes_label": "Julio 2026",
    "leads": 1015,
    "ventas_totales": 339,
    "ingreso_directo": 28748,
    "roas_directo": 4.72,
    "link": "https://distinto-app.vercel.app/reportes"
  }]
}
```

Sin meses cargados: `tiene_datos: false` y los KPI en null. Las marcas con datos van primero.

## `GET /api/v1/notas-reuniones`

Misma ventana de «Próximas» que el home (`marca_reuniones`, Google Calendar si el servidor lo tiene, y notas en curso si no hay agenda) y hasta 80 notas recientes.

Director, o sesión sin fila en `team_members`, ve las notas del equipo (`ve_todo: true`). El resto ve solo las suyas. No incluye transcript ni chat. `link` abre `/notas-reuniones/{id}`. Crear una nota sigue en `/notas-reuniones/nueva`.

```json
{
  "ok": true,
  "hoy": "2026-09-27",
  "ve_todo": false,
  "total": 1,
  "proximas": [{
    "id": "marca_reuniones:…",
    "titulo": "Revisión de grilla",
    "starts_at": "2026-09-28T15:00:00.000Z",
    "ends_at": null,
    "fuente": "marca_reuniones",
    "link": "https://distinto-app.vercel.app/grabaciones/calendario"
  }],
  "notas": [{
    "id": "…",
    "titulo": "Standup",
    "preview": "Primera línea de la nota",
    "estado": "borrador",
    "autor_nombre": "Yo",
    "es_mio": true,
    "created_at": "2026-09-27T15:00:00.000Z",
    "updated_at": "2026-09-27T16:00:00.000Z",
    "link": "https://distinto-app.vercel.app/notas-reuniones/…"
  }]
}
```

`estado`: `borrador` | `en_curso` | `finalizada`. `fuente`: `marca_reuniones` | `google_calendar` | `nota`.

## `GET /api/v1/oficina`

Escritorios con nombre del mapa, quién los reclamó, salas y atajos (pizarra, TV). No es el mapa caminable: entrar, hablar y reclamar un puesto sigue en `/oficina`.

```json
{
  "ok": true,
  "total": 1,
  "escritorios": [{
    "id": "pedro",
    "etiqueta": "Pedro",
    "zona": "Open space",
    "libre": true,
    "es_mio": false,
    "ocupante": null,
    "link": "https://distinto-app.vercel.app/oficina"
  }],
  "sin_puesto": [],
  "zonas": [{
    "id": "juntas",
    "nombre": "Sala de Juntas",
    "emoji": "🤝",
    "color": "#7170ff",
    "link": "https://distinto-app.vercel.app/oficina"
  }],
  "accesos": [{
    "id": "ver-el-calendario-de-la-semana",
    "titulo": "Ver el calendario de la semana",
    "icono": "📅",
    "link": "https://distinto-app.vercel.app/grabaciones/calendario"
  }]
}
```

`es_mio` compara el `user_id` de la sesión con quien reclamó el escritorio.

## `GET /api/v1/creacion-de-ideas`

Banco compartido (el mismo que la pestaña Ideas del módulo). Opcional `?nicho=marketing` (400 si el nicho no existe).

Las ideas que cada persona guarda en el navegador (`localStorage`, clave `creacion-ideas.v1`) no están en Supabase y no salen acá. Crear un guion abre `/creacion-de-ideas`.

```json
{
  "ok": true,
  "total": 24,
  "nichos": ["marketing", "fitness", "comida", "belleza", "inmobiliaria", "educacion", "ecommerce", "finanzas", "viajes", "tecnologia", "emprendimiento", "mascotas"],
  "ideas": [{
    "id": "banco-1",
    "nicho": "marketing",
    "idea": "Auditar en vivo el perfil de un negocio local…",
    "gancho": "Le arreglé el perfil a esta cafetería en 60 segundos…",
    "link": "https://distinto-app.vercel.app/creacion-de-ideas"
  }]
}
```
