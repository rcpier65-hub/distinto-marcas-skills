# Fase 3 — Comunidad e Influencers (E + F)

> Follow-ups, agenda showroom, búsqueda influencers, monitoreo competidores.

## E.2 — Follow-up automático a influencers a los 7 días

```
Notion DB "Influencers Pipeline" con campos:
- Marca
- Nombre / handle
- Estado (Contactado, En negociación, Cerrado, Sin respuesta)
- Última interacción (fecha)
- Notas

Cron diario 10am:
  filtrar registros con (Estado = "Contactado") AND (hoy - última_interacción >= 7d)
  para cada uno:
    componer mensaje follow-up cordial on-brand
    PEDIR OK a Pedro
    si OK → enviar via IG DM (Chrome MCP) o WhatsApp si tenemos el número
    actualizar última_interacción
```

## E.3 — Agenda visitas showroom

Cuando una influencer confirma fecha (detectar en DMs IG o WhatsApp):
1. Extraer fecha + hora de la conversación
2. Crear evento Calendar con:
   - Título: "Showroom [Marca] — visita @influencer_x"
   - 1h duración
   - Recordatorio 24h antes
3. Avisar a Pedro vía Rubi

## E.4 — Búsqueda mensual de nuevos influencers

```
Cron 1ro de cada mes 9am:
  para cada marca:
    criterios = leer marca-X/02-audiencia.md y referencias/partners.md
    búsqueda con criterios (categoría, seguidores 5K-50K, engagement, ubicación)
    fuentes:
      - Modash / Heepsy si tenemos API
      - O scraping IG por hashtags de marca (Chrome MCP)
    rankear top 20 por marca
    crear/actualizar Notion DB "Influencers por explorar"
    aviso a Pedro: "Nueva lista influencers [marca] lista"
```

## F.1 — Lista actualizada de competidores

```
Skill marca-X/08-competencia.md ya tiene lista canónica.
Tarea: mantener actualizada (al menos handles, links, descripciones).

Cron mensual:
  para cada marca:
    revalidar handles activos (Chrome MCP head request)
    si alguno cambió/desapareció → avisar a Pedro
```

## F.2 — Monitoreo de competidores

```
Cron quincenal (cada 14 días):
  para cada marca:
    competidores = leer 08-competencia.md
    para cada competidor:
      últimos 10 posts IG + TikTok (Chrome MCP)
      detectar:
        - Formatos nuevos (reels vs static vs carrusel)
        - Campañas activas (mismo CTA repetido)
        - Lanzamientos (palabra "nuevo", "estreno")
        - Promociones (precios, descuentos)
    generar resumen Notion: "Movimientos competidores [marca] [quincena]"
    aviso a Pedro vía Rubi
```

## Estado
⏳ Pendiente — empezar después de Fase 2

Versión: 0.1.0
