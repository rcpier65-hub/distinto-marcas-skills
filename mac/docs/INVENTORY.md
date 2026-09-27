# Inventario Distinto web → macOS

Ver también [PLAN.md](../PLAN.md).

## Auth
- Provider: Supabase (`exhmimlehdisonjvedvx`)
- UI login: email + password only (`lib/auth/actions.ts` → `signInWithPassword`)
- Session: cookies en web; en mac → Keychain + Bearer JWT

## Sidebar modules (completo)
Workspace: Inicio, Planes (Pedro), Tareas, Publicaciones, Editor, Diseño, Historias, Calendario, Creación de Ideas, Oficina, Soporte, Reportes, Influencers  
Marcas: Ver todas, grilla/[slug], Agregar marca  
Personal: Hábitos, Reporte del día, Historial, Mi equipo, Settings, Perfil

## Phase 1 mac subset
Login (web card), sidebar (Workspace / Marcas / Personal), Inicio (tareas de hoy), Tareas (tablero por categoría), resto abre la web, Logout
