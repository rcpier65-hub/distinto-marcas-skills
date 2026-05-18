# Fase 4 — Avanzado (G + D.1)

## G.1-3 — Edición de fotos de portada

```
Trigger:
  Notion DB Grilla [marca] card con campo "Link foto portada original" lleno
  AND campo "Foto editada" vacío

Flujo:
  1. Descargar foto original del Drive (link Notion → Drive MCP)
  2. Detectar marca → cargar plantilla edición (carpeta marca/assets/portadas/)
     - Formato (ratio: 4:5 IG, 16:9 web, 1:1 grilla)
     - Logo overlay (posición + tamaño)
     - Color frame (paleta marca)
     - Font + texto (si aplica)
  3. Ejecutar edición:
     - Opción A: PIL/Pillow Python (rápido, limitado a recortes + overlays)
     - Opción B: Canva MCP (mejor para diseños complejos pero requiere plantilla pre-armada en Canva)
     - Opción C: Photoshop API (avanzado, requiere cuenta Creative Cloud)
  4. Guardar foto editada en Drive: /CUENTAS/[marca]/FOTOS/PORTADAS_EDITADAS/[mes]/
  5. Actualizar card Notion: campo "Foto editada" con el link
  6. Aviso a Pedro: "Fotos portada [marca] editadas (N de N)"
```

### Recomendación técnica

Para Distinto, lo más realista:
- **Templates pre-armadas en Canva** por marca (1 por formato)
- Llenarlas vía Canva MCP `create-design-from-brand-template` (ya disponible)
- Pasa el texto/imagen como parámetros
- Canva las edita + exporta + guarda en Drive

## D.1 — Reportes mensuales completos

```
Cron 1ro de cada mes 9am:
  para cada marca:
    período = mes anterior
    métricas = Metricool MCP:
      - get_metrics (alcance, impresiones, engagement, seguidores nuevos)
      - get_instagram_posts (top 5 por engagement)
      - get_tiktok_videos (top 5 por views)
      - get_facebook_posts (si aplica)
    
    estructura reporte:
      1. Resumen ejecutivo (KPIs vs objetivos del mes)
      2. Top contenido del mes
      3. Crecimiento por red
      4. Insights y aprendizajes
      5. Plan próximo mes (de marca-X/06-objetivos-mes.md)
    
    formato salida:
      - PDF (vía Word MCP create_document + export_pdf)
      - O presentación pptx
      - O documento Notion
    
    PEDIR OK A PEDRO para enviar al cliente
    si OK → email cliente + Notion + WhatsApp con link
```

### Reportes semanales (mini-versión)

```
Cron cada lunes 9am:
  para cada marca:
    métricas semana anterior (sintético)
    mensaje WhatsApp corto al grupo cliente (con tu OK):
    
    "📊 Resumen [marca] — semana del [fecha]:
     • Alcance: [X] (vs [Y] semana anterior)
     • Top post: [link] con [N] interacciones
     • Próxima publicación: [fecha]
     
     Para detalle completo → [link Notion]"
```

## Estado
⏳ Pendiente — empezar después de Fase 3

Versión: 0.1.0
