# Distinto macOS

Native SwiftUI client for Distinto. Cloud backend stays on Vercel + Supabase (no local database). Login, the sidebar, Hoy / Inicio, Tareas, Perfil, Soporte, Publicaciones, and Calendario follow the live app at `https://distinto-app.vercel.app` (`--mk-*` light theme, email + password only).

> Planes stays Pedro-only. The other sidebar modules still open the same routes on the web. See [PLAN.md](./PLAN.md).

## Regenerate the Xcode project

`project.yml` is the source of truth. Regenerate `DistintoMac.xcodeproj` with XcodeGen whenever sources or the spec change. Do not hand-edit the `.xcodeproj`.

```bash
brew install xcodegen
cd mac
cp Config/Secrets.example.xcconfig Config/Secrets.xcconfig   # first time only
xcodegen generate
open DistintoMac.xcodeproj
```

Run `xcodegen generate` again after adding or removing files under `Sources/DistintoMac`. Requires macOS 14+ and Xcode 15+.

`Package.swift` is only the library target. The app entry point is the XcodeGen target above.

## Layout

```
Sources/DistintoMac/
  DistintoMacApp.swift      # @main
  App/                      # RootView, AppState
  Design/                   # tokens matching web --mk-*
  Auth/                     # Supabase email/password + Keychain
  API/                      # DistintoAPIClient + models
  Features/
    Login/  Shell/  Hoy/  Perfil/  Soporte/  Publicaciones/  Calendario/
Config/                     # xcconfig (Secrets gitignored)
project.yml                 # XcodeGen
Package.swift
PLAN.md
```

## Env / secrets

| Key | Value |
|-----|-------|
| API base | `https://distinto-app.vercel.app` |
| Supabase URL | `https://exhmimlehdisonjvedvx.supabase.co` |
| Supabase anon | copy from Supabase dashboard / `Secrets.example.xcconfig` |

Hoy / Inicio calls `GET /api/v1/tareas?due=hoy&include_overdue=1` with the signed-in Supabase session:

```http
Authorization: Bearer <supabase access_token>
```

The same endpoint also accepts a device key `dst_live_…` from Distinto → Perfil. Do not ship the server cron secret in the app.

Perfil, Soporte, Publicaciones, and Calendario use the signed-in session only (not the device key). See [docs/API-FASE4.md](docs/API-FASE4.md).

```bash
curl -H "Authorization: Bearer <supabase access_token>" \
  https://distinto-app.vercel.app/api/v1/perfil
```

```bash
curl -H "Authorization: Bearer <supabase access_token>" \
  "https://distinto-app.vercel.app/api/v1/tareas?due=hoy&include_overdue=1"
```

## First run

1. `xcodegen generate && open DistintoMac.xcodeproj`
2. Sign with a personal or team certificate and run.
3. Log in with the same email and password as the website. Inicio lists today's tasks. Perfil, Soporte, Publicaciones, and Calendario load inside the sidebar; a row opens the web detail.
