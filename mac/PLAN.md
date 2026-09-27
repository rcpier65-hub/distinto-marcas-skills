# Distinto macOS — Plan por fases

App nativa SwiftUI para Distinto. Backend en la nube: **Vercel** (`https://distinto-app.vercel.app`) + **Supabase** (`exhmimlehdisonjvedvx` / SISTEMA DE GRILLA). Misma estética light Linear/Notion del web (`--mk-*` tokens).

**Estado actual:** Fase 0–1 (inventario + scaffold). **No** es la app completa.

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
- `GET https://distinto-app.vercel.app/api/v1/tareas?due=hoy`
- Auth: `Authorization: Bearer <supabase session.access_token>` (no CRON_SECRET en el cliente)
- Opcional: `include_overdue=1`, `team_member_id=<uuid>`
- Response: `{ ok, fecha, total, tareas: [{ id, titulo, due, status, prioridad, proyecto, marca, link, fuente }] }`

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
- [ ] Sidebar con secciones Workspace / Marcas / Personal (subset)
- [ ] Inicio, Tareas (web-view o native board MVP), Perfil, Logout
- [ ] Permisos básicos (ocultar Planes si no es Pedro)

### Fase 4 — Módulos nativos prioritarios
- [ ] Tareas board (CRUD vía nuevas APIs o Supabase RLS)
- [ ] Notificaciones / menú bar (Distinto macOS)
- [ ] Publicaciones / Calendario (read-only primero)

### Fase 5 — Pulido y distribución
- [ ] Firma Apple Developer + notarización
- [ ] Sparkle / TestFlight mac / DMG
- [ ] Telemetría mínima, crash reporting

---

## Decisiones técnicas
1. **Cliente no lleva CRON_SECRET** — solo JWT de usuario.
2. **Backend sigue en Vercel+Supabase** — la app mac es thin client.
3. **UI light-first** — mismos tokens que `globals.css` (no dark Linear legacy).
4. **Build solo en macOS** — este box es Linux; el scaffold es source-complete.

## Blockers
- Mac con Xcode 15+ para compilar / XcodeGen.
- Apple Developer ID para distribución fuera de debug.
- Anon key + URL en `Config/Secrets.xcconfig` (ver `Config/Secrets.example.xcconfig`).
- Local monorepo checkout desactualizado vs `main` (API `tareas` ya está en GitHub `main` y en prod).
