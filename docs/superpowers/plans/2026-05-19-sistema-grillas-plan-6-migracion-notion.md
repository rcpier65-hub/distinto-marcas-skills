# Plan 6 — Migración Notion + Polish final

**Goal:** Integrar lectura de Notion (grilla FIT) en el flow procesar-pendientes para que el PNG y el caption se generen con datos REALES del calendario de contenido.

**Scope reducido:** Plan 6 NO migra TODO Notion (eso fue el spec original ambicioso). En su lugar agrega:
1. Lectura del calendario de contenido desde Notion para enriquecer el PNG
2. Caption del WhatsApp con los detalles reales de las publicaciones de la semana
3. Documentación de cómo Pedro va dejando de usar Notion progresivamente

## Tasks

### T1: Helper Notion API

`app/lib/integrations/notion.ts` que use `@notionhq/client` con `NOTION_TOKEN` env var.

Query la grilla DB por marca + rango fecha, devuelve array de publicaciones.

### T2: Integrar en cron procesar-pendientes

Cuando se genera PNG, leer Notion para count + títulos. Si Notion falla, fallback al PNG genérico actual.

### T3: Documentación migración

Crear `docs/migration-notion.md` con guía paso a paso para Pedro: cómo dejar de usar Notion gradualmente.

### T4: Tag v1.0.0 — release production-ready

Cuando todo esté validado, marcar como v1.0.0 (sale de "alpha" del 0.x).
