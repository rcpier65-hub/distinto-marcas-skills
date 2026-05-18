---
name: marca-distribuidora-fitness
description: Activar SIEMPRE que se trabaje contenido, estrategia, copy, atención al cliente, paid media o reportes para Distribuidora Fitness Marketing. Cubre voz de marca, audiencia, oferta, pilares, KPIs, sensibilidades, competencia y objetivos del mes en curso. Si el usuario menciona Distribuidora Fitness Marketing, cualquier producto/servicio de la marca, o palabra clave del cliente, USAR ESTE SKILL ANTES de generar cualquier output. NO generar copy, briefs, reportes ni respuestas a DM sin consultar primero los archivos relevantes. NO improvisar voz, datos de productos, métricas ni mensajes — todo está documentado aquí.
---

# Skill: Gestión de marca — Distribuidora Fitness Marketing

Sistema operativo de marca para que Agencia Distinto produzca trabajo agencia-grade
para **Distribuidora Fitness Marketing** con consistencia, sin pedir contexto adicional.

---

## 🗺️ Cuándo consultar qué archivo

| Tarea | Archivos a leer (en orden) |
|-------|----------------------------|
| Crear copy / carrusel / reel | `01-marca` → `02-audiencia` → `04-contenido` → `ejemplos/` |
| Copy diferenciador vs competencia | `01-marca` → `08-competencia` → `04-contenido` → `ejemplos/` |
| Estrategia / calendario mensual | `04-contenido` → `06-objetivos-mes` → `calendario/` |
| Responder DM / comentario | `01-marca` → `02-audiencia` → `referencias/respuesta-comunidad` → `ejemplos/on-tone-dm` |
| Brief de paid media | `06-objetivos-mes` → `02-audiencia` → `referencias/paid-media` → `referencias/benchmarketing` |
| Reporte mensual de performance | `06-objetivos-mes` → `04-contenido` → `documentos/reportes-mensuales/` |
| Verificar precio o producto | `03-oferta-presencia` → `documentos/productos-servicios.xlsx` |
| Verificar dato del brief original | `documentos/briefing-original.pdf` |
| Tema sensible / crisis | `05-cliente` → `referencias/legal-crisis` |
| Generar imagen/video con IA | `01-marca` → `referencias/ai-assets` → `assets/brand-book-extract` |
| Calendario de fechas y hashtags | `calendario/` (los 4 archivos) |
| Onboarding nuevo miembro del equipo | `INTAKE` → todos los 0X-* + `documentos/` |

---

## ⛔ Reglas absolutas (no negociables)

1. **ANTES de entregar cualquier pieza**: validar contra `07-rubric.md`.
2. **NUNCA inventar datos** de productos, precios, URLs, métricas — leer `03-oferta-presencia.md` o `documentos/productos-servicios.xlsx`.
3. **NUNCA tocar temas listados como sensibles** en `05-cliente.md`.
4. **SIEMPRE incluir el tema del mes** (`06-objetivos-mes.md`) en piezas mensuales.
5. **NUNCA improvisar voz de marca** — la voz vive en `01-marca.md`. Si tenés duda, leerla otra vez antes de escribir.
6. **NUNCA copiar a la competencia** — `08-competencia.md` es para diferenciarse, no para imitar.
7. **Si la tarea no encaja en la tabla de arriba** → preguntar al usuario antes de proceder.

---

## 🎯 Output esperado

- **Tono, formato y estructura** siguen los ejemplos en `/ejemplos/on-tone-*.md`. No improvisar formato cuando hay un patrón documentado.
- **Antes de entregar**: pasar por el rubric (`07-rubric.md`) y descartar cualquier elemento marcado como off-brand.
- **Si una pieza es ambigua sobre on-brand vs off-brand** → preguntar al usuario en vez de adivinar.

---

## 🚨 Cuándo escalar a humano (no proceder)

- Cliente o producto **no documentado** en `03-oferta-presencia.md`
- Tema potencialmente sensible **no cubierto** en `05-cliente.md`
- Solicitud que requiere **decisión estratégica** (no ejecución táctica)
- **Cambio en la voz de marca** o en valores fundamentales — eso lo decide el cliente
- Cualquier duda sobre si una pieza está on-brand después de revisar el rubric
- Datos de competencia no cubiertos en `08-competencia.md`

---


<!-- INBOX_TIKTOK_SECTION -->
## 📨 Inbox TikTok (workflow Excel-en-Drive + Rubi WhatsApp)

Para revisar comentarios pendientes de TikTok y generar borradores on-brand para esta marca, activar la skill **`responder-tiktok`**.

### Trigger MODO 1 — Generar Excel con borradores

- *"Revisa los comentarios de TikTok de Distribuidora Fitness"*
- *"Generame la hoja para responder TikTok de Distribuidora Fitness"*
- *"Saca los comentarios de Distribuidora Fitness"*

Workflow:
1. Lee comentarios sin respuesta del inbox de TikTok Studio (Patchright + cookies)
2. Genera borradores aplicando voz de marca documentada acá (`01-marca.md`, `04-contenido.md`, `05-cliente.md`)
3. Escribe **hoja nueva** en el Excel:
   ```
   Drive/Mi unidad/1. GESTIÓN/CUENTAS/3. Distribuidora Fitness Marketing/Inbox TikTok/
   Inbox TikTok - Distribuidora Fitness.xlsx
   ```
4. Cada sesión = 1 hoja con timestamp `YYYY-MM-DD HH-MM`
5. Columnas: Usuario · Tiempo · Comentario · Borrador · Acción · Categoría · Video/Link

### Trigger MODO 2 — Confirmar respuestas + Rubi WhatsApp

Cuando Pedro confirme que respondió todos los comentarios:

- *"Ya respondí los comentarios de Distribuidora Fitness"*
- *"Ya terminé con TikTok de Distribuidora Fitness"*

Workflow:
1. Verifica el inbox actual (re-lectura para confirmar cuántos quedan sin responder)
2. Compara con el último log
3. Si todo OK → envía resumen al grupo WhatsApp **"_por confirmar_"** mencionando al contacto del cliente (datos en `marcas.json`)
4. Si quedan nuevos → avisa a Pedro antes de enviar

**Grupo WhatsApp configurado**: `_por confirmar_`

### Reglas críticas

- Respetar voz de `01-marca.md` y sensibilidades de `05-cliente.md`
- Derivar consultas comerciales al WhatsApp del cliente (ver `03-oferta-presencia.md`)
- NO postear automático en TikTok (TikTok bloquea silenciosamente)
- NUNCA mandar mensaje al WhatsApp del cliente sin que Pedro lo haya pedido explícitamente
- Marcar quejas/críticas duras como `escalar` (decisión de cliente)

Detalle técnico completo: ver skill `responder-tiktok` en `../responder-tiktok/SKILL.md`.

<!-- /INBOX_TIKTOK_SECTION -->
## 📁 Estructura del skill

```
marca-distribuidora-fitness/
├── SKILL.md                          ← este archivo (entry point)
├── INTAKE.md                         ← cuestionario para mantener actualizada la skill
│
├── 01-marca.md                       ← posicionamiento + voz + identidad visual
├── 02-audiencia.md                   ← personas + journey + lenguaje real
├── 03-oferta-presencia.md            ← productos + USPs + URLs + handles
├── 04-contenido.md                   ← pilares + series + calendario + reglas
├── 05-cliente.md                     ← decisor + sensibilidades + aprobación
├── 06-objetivos-mes.md               ← VIVO (regenerado día 1 desde Notion)
├── 07-rubric.md                      ← criterios on/off-brand auto-evaluación
├── 08-competencia.md                 ← top 10 competidores + diferenciación
│
├── ejemplos/                         ← few-shot prompting (impacto +30-40%)
│   ├── on-tone-carrusel.md
│   ├── on-tone-reel.md
│   ├── on-tone-dm.md
│   ├── off-tone-anti-ejemplos.md
│   └── top-performers/               ← 5-10 piezas reales con métricas
│
├── referencias/                      ← consulta on-demand
│   ├── paid-media.md                 (solo si gestionas paid)
│   ├── partners.md                   (solo si hay influencers/UGC)
│   ├── legal-crisis.md               (consulta esporádica)
│   ├── ai-assets.md                  (voiceprints + prompts MJ + RAG)
│   ├── respuesta-comunidad.md        (manual respuesta DMs/comentarios)
│   └── benchmarketing.md             (métricas industria + benchmarks)
│
├── documentos/                       ← canon pesado (PDFs/Excels)
│   ├── README.md                     (índice)
│   ├── briefing-original.pdf
│   ├── manual-de-marca.pdf
│   ├── plan-estrategico-anual.pdf
│   ├── productos-servicios.xlsx
│   ├── investigacion-mercado/
│   ├── reportes-mensuales/
│   └── reuniones-cliente/actas/
│
├── calendario/                       ← fechas y hashtags
│   ├── fechas-marca.md               (aniversarios, lanzamientos)
│   ├── fechas-sector.md              (días específicos del rubro)
│   ├── fechas-nacionales.md          (Día Madre, Padre, Fiestas Patrias)
│   └── hashtag-bank.md               (biblioteca por pillar)
│
└── assets/                           ← visuales/audio + extractos consultables
    ├── brand-book-extract.md         (TEXTO del brand book)
    ├── voz-extracto.md               (TEXTO de doc de voz oficial)
    ├── colores-fuentes.txt           (HEX + nombres exactos)
    ├── inventario-drive.md           (mapa de Drive del cliente)
    ├── logos/                        (SVG/PNG variantes)
    └── fotografia-guia/              (dirección de arte visual)
```
