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

## Mac nativo (Fase 4)
Login, sidebar, Inicio, Tareas (lectura), Perfil (sesión + cerrar sesión), Soporte (lista), Publicaciones (lista), Calendario (lista del mes). Planes solo si el email es Pedro. El resto abre la web.

APIs de sesión: ver [API-FASE4.md](./API-FASE4.md).
