# Distinto macOS — Plan por fases

App nativa SwiftUI para Distinto. Backend en la nube: **Vercel** (`https://distinto-app.vercel.app`) + **Supabase** (`exhmimlehdisonjvedvx` / SISTEMA DE GRILLA). Misma estética light Linear/Notion del web (`--mk-*` tokens).

**Estado actual:** Login, sidebar, Hoy/Inicio, Tareas, Perfil, Soporte, Publicaciones y Calendario nativos. El resto de módulos abre la web. **No** es la app completa.

Pedro (CEO): `pedro@agenciadistinto.com`

---

## Inventario web (sidebar / módulos)

Fuente: `app/components/layout/Sidebar.tsx` + rutas bajo `app/app/` (checkout local + `main` en GitHub).

### Auth
- Supabase Auth **email + password** (`signInWithPassword`). Google/magic link existen en código pero Pedro pidió quitarlos de la UI de login.
- Middleware de sesión: `lib/supabase/middleware.ts`.
- Logout: `POST /api/auth/logout`.

### Workspace (sidebar)
| Ruta | Módulo | Notas |
|------|--------|-------|
| `/inicio` | Inicio | Dashboard (fusionó Cockpit) |
| `/planes` | Planes | Solo Pedro |
| `/tareas` | Tareas | Tablero personal / CEO |
| `/publicaciones` | Publicaciones | permiso `publicaciones` |
| `/editor` | Editor | indent si ve pubs |
| `/diseno` | Diseño | indent si ve pubs |
| `/historias` | Historias | diseno \|\| publicaciones |
| `/grabaciones/calendario` | Calendario | permiso publicaciones |
| `/creacion-de-ideas` | Creación de Ideas | todos |
| `/oficina` | Oficina | todos |
| `/soporte` | Soporte | todos |
| `/reportes` | Reportes | permiso `metricas` |
| `/influencers` | Influencers | pubs + marca con flag |

### Marcas
| Ruta | Módulo |
|------|--------|
| `/dashboard` | Ver todas (director/admin) |
| `/grilla/[slug]` | Grilla por marca |
| `/dashboard?nueva=1` | Agregar marca |

### Personal
| Ruta | Módulo |
|------|--------|
| `/habitos` | Hábitos |
| `/actividad` | Reporte del día |
| `/historial` | Historial (CEO) |
| `/equipo` | Mi equipo |
| `/settings` | Settings |
| `/perfil` | Perfil (footer) |

### API para macOS (Hoy)
- `GET https://distinto-app.vercel.app/api/v1/tareas?due=hoy&include_overdue=1`
- Auth preferida: `Authorization: Bearer dst_live_…` (clave de dispositivo creada en Perfil; solo lectura de las tareas del dueño)
- También válido: `Authorization: Bearer <supabase session.access_token>`
- No mandar el secreto de cron del servidor desde el cliente
- Opcional: `team_member_id=<uuid>` (mismas reglas que la web)
- Response: `{ ok, fecha, total, tareas: [{ id, titulo, due, status, prioridad, proyecto, marca, link, fuente }] }`

### API para macOS (Fase 4)

Sesión: `Authorization: Bearer <supabase access_token>`. La clave `dst_live_…` no abre estas listas. Detalle en [docs/API-FASE4.md](docs/API-FASE4.md).

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/api/v1/perfil` | Nombre, email, rol |
| GET | `/api/v1/soporte` | Reportes propios o del equipo (director) |
| GET | `/api/v1/publicaciones` | Próximas y recientes, solo lectura |
| GET | `/api/v1/grabaciones/calendario` | Grabaciones y reuniones del mes |

---

## Fases

### Fase 0 — Inventario y contrato (este entregable)
- [x] Listar módulos sidebar + auth
- [x] Extraer design tokens `--mk-*`
- [x] Documentar contrato `/api/v1/tareas`
- [x] Definir ubicación del proyecto (`mac/` en la raíz del monorepo)

### Fase 1 — Scaffold nativo (este entregable)
- [x] Árbol SwiftUI + `Package.swift` + `project.yml` (XcodeGen)
- [x] Tokens de diseño (`DistintoTokens`)
- [x] Auth client Supabase (email/password → JWT en Keychain)
- [x] API client Hoy
- [x] Pantallas: Login, Shell (sidebar), Hoy
- [ ] Abrir en Xcode en un Mac y generar `.xcodeproj` / firmar

### Fase 2 — Auth real + Hoy usable
- [ ] Login end-to-end contra Supabase prod
- [ ] Refresh token / sesión persistente
- [ ] Hoy: lista real, pull-to-refresh, empty/error states
- [ ] Abrir `link` en browser / deep link a web

### Fase 3 — Shell completo (navegación)
- [x] Sidebar con secciones Workspace / Marcas / Personal
- [x] Inicio y Tareas nativos (lectura de `/api/v1/tareas`)
- [x] Permisos básicos (ocultar Planes si no es Pedro)
- [x] Perfil nativo y cerrar sesión (Keychain → Login)

### Fase 4 — Módulos nativos prioritarios
- [x] Perfil: sesión (nombre, email, rol), Cerrar sesión, aviso de claves Kairos en la web
- [x] Soporte: lista nativa (propios, o equipo si director / sin team member)
- [x] Publicaciones: lista de solo lectura con chips de estado; la fila abre la web
- [x] Calendario: lista del mes (grabaciones + reuniones); la fila abre la web
- [ ] Tareas board (CRUD; hoy es solo lectura)
- [ ] Notificaciones / menú bar (Distinto macOS)

### Fase 5 — Pulido y distribución
- [ ] Firma Apple Developer + notarización
- [ ] Sparkle / TestFlight mac / DMG
- [ ] Telemetría mínima, crash reporting

---

## Decisiones técnicas
1. **Cliente no lleva el secreto de cron del servidor.** Kairos usa una clave `dst_live_…` (Perfil). El JWT de Supabase sigue siendo válido.
2. **Backend sigue en Vercel+Supabase** — la app mac es thin client.
3. **UI light-first** — mismos tokens que `globals.css` (no dark Linear legacy).
4. **Build solo en macOS** — este box es Linux; el scaffold es source-complete.

## Blockers
- Mac con Xcode 15+ para compilar / XcodeGen.
- Apple Developer ID para distribución fuera de debug.
- Anon key + URL en `Config/Secrets.xcconfig` (ver `Config/Secrets.example.xcconfig`).
- `GET /api/v1/publicaciones/semana`, `/mes` y `/grabaciones/proximas` siguen pidiendo el secreto de cron. El Mac usa las rutas nuevas de sesión documentadas arriba.
