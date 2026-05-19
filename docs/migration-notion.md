# Guía de migración Notion → Sistema Distinto App

Esta guía documenta cómo Pedro y el equipo van dejando de usar Notion progresivamente, en favor del sistema nuevo. La migración es **gradual** — no hay que cortar Notion de golpe.

## Estado actual (al cierre de Plan 6)

| Función | Sistema actual | Sistema nuevo |
|---|---|---|
| Catálogo de marcas | Notion DB | ✅ Supabase `marcas` (7 marcas seedadas) |
| Calendario contenido (Grilla FIT) | Notion DB | 🔄 Lectura desde Notion API en cron (Plan 6 T1-T2) |
| Solicitud de grilla semanal | Manual | ✅ Botón en dashboard → Supabase |
| Aprobación cliente | Manual WhatsApp | ✅ Portal cliente `/portal/[slug]` |
| Aprobación interna (Pedro) | Manual WhatsApp | ✅ WhatsApp DM con comandos `ok/no/redo [marca]` |
| Envío al grupo cliente | Manual copy/paste | ✅ Automático cuando Pedro aprueba |
| Auditoría | No existe | ✅ Tabla `aprobaciones` + `envios` |

## Fase 1: Setup inicial (ya hecho)

- ✅ App live en https://distinto-app.vercel.app
- ✅ Supabase con schema completo
- ✅ 2 cron workflows GitHub Actions (procesar + listener)
- ✅ Auth con magic link + Google OAuth

## Fase 2: Validación (lo que sigue)

**Semana 1-2 post-Plan 6:**

1. **Probar con 1 marca piloto (recomendado: Manrique)**
   - Pedro crea entrada en `marca_usuarios` para el Dr. Daniel Manrique con su email
   - Cliente recibe link al portal
   - Pedro pide grilla cada lunes → cliente aprueba en portal → Pedro confirma con "ok manrique" en WhatsApp → se envía al grupo
   - Validar que el cron real (GitHub Actions cada 5 min) funciona end-to-end

2. **Mantener Notion como fallback**
   - Si algo falla, el equipo sigue armando grillas manualmente en Notion
   - Comparar resultado del sistema vs Notion durante 2 semanas
   - Identificar gaps (campos que faltan, casos edge)

## Fase 3: Expansión (mes 1-2)

3. **Onboardear las otras 6 marcas activas**
   - Crear entradas en `marca_usuarios` para cada decisor
   - Validar que los datos de marca en Supabase coinciden con Notion (especialmente `grupo_whatsapp_nombre`)
   - Si alguna marca no tiene grupo configurado, completar en `/settings` (cuando se habilite edit) o vía SQL directo

4. **Migrar calendario de contenido (Grilla FIT)**
   - Plan 6 T1-T2 implementa lectura de Notion API
   - El cron procesar-pendientes consulta Notion para enriquecer el PNG con publicaciones reales
   - Pedro va creando contenido EN Notion como antes — el sistema lo lee automáticamente

## Fase 4: Discontinuar Notion (mes 3+)

5. **Cuando el sistema esté estable** (después de 4-6 semanas sin issues):
   - Decidir si migrar el calendario también a Supabase (Plan 7 futuro)
   - O dejar Notion como UI de edición y Supabase como source of truth para el flow
   - Discontinuar Notion solo si vale el esfuerzo de migrar el editor

## Decisiones pendientes

- **¿Migrar calendario completo de Notion?** Si la API de Notion sigue siendo suficiente para leer datos, NO conviene migrar el editor. Notion sigue siendo mejor UI que cualquier custom para que el equipo cree contenido.
- **¿Cómo invitar clientes al portal?** Hoy es vía SQL directo (insertar en marca_usuarios + Supabase Auth crea user automáticamente al primer login). Plan futuro: UI de invitación en /settings.
- **¿Push notifications?** Hoy las notificaciones llegan a Pedro vía WhatsApp DM. Si el equipo crece se puede agregar email + Slack.

## Riesgos identificados

1. **Vercel Hobby Free**: Cron está en GitHub Actions externo. Si GH Actions cambia su pricing, hay que migrar.
2. **Rubi MCP**: dependencia crítica. Si cambia el endpoint o el formato, todo el flow de WhatsApp se rompe.
3. **Supabase Free pause**: si el proyecto queda sin actividad 7 días se pausa. El cron del listener lo mantiene activo (toca la BD cada 5 min).
4. **Token de Rubi expuesto**: el token está en el código fuente del cliente HTTP. Si el repo se hace público sin auditar, se filtra. Mantener repo privado o mover el token a env var antes de publicar.

## Soporte

- Repo: https://github.com/rcpier65-hub/distinto-marcas-skills
- App: https://distinto-app.vercel.app
- BD: Supabase project `exhmimlehdisonjvedvx`
- Vercel project: `distinto-app` en `rcpier65-7045s-projects`

Para issues técnicos, mirar logs de Vercel:
- https://vercel.com/rcpier65-7045s-projects/distinto-app
