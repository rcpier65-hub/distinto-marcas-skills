# Distinto macOS — Phase 0–1 scaffold

Native SwiftUI macOS client for Distinto. Cloud backend: Vercel + Supabase.

> **Not a finished app.** This folder is the Phase 0–1 scaffold + plan.
> See [PLAN.md](./PLAN.md) for phases and web module inventory.

## Open on a Mac

```bash
# Option A — XcodeGen (recommended)
brew install xcodegen
cd mac
cp Config/Secrets.example.xcconfig Config/Secrets.xcconfig
# edit Secrets.xcconfig with anon key if needed
xcodegen generate
open DistintoMac.xcodeproj

# Option B — Swift Package (library targets; app entry still needs an Xcode app target)
open Package.swift
```

Minimum: macOS 14+, Xcode 15+.

## Layout

```
Sources/DistintoMac/
  DistintoMacApp.swift      # @main
  App/                      # RootView, AppState
  Design/                   # tokens matching web --mk-*
  Auth/                     # Supabase email/password + Keychain
  API/                      # DistintoAPIClient + models
  Features/
    Login/  Shell/  Hoy/
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

Hoy llama `GET /api/v1/tareas?due=hoy&include_overdue=1` con una **clave de dispositivo** creada en Distinto → Perfil → Kairos (macOS). Header: `Authorization: Bearer dst_live_…`. La clave solo lee las tareas del dueño. No uses el secreto de cron del servidor en la app.

El scaffold de Fase 0–1 todavía puede iniciar sesión con email + password y mandar el access token de Supabase. Ese JWT sigue siendo válido en el mismo endpoint. La clave de dispositivo evita copiar el JWT desde Local Storage.

```bash
curl -H "Authorization: Bearer dst_live_…" \
  "https://distinto-app.vercel.app/api/v1/tareas?due=hoy&include_overdue=1"
```

## Next step

1. This folder is the native client at `mac/` in the monorepo.
2. On a Mac: `xcodegen generate && open DistintoMac.xcodeproj`, sign with a personal/team, run.
3. Log in as `pedro@agenciadistinto.com` (or any team member) and verify Hoy loads.
