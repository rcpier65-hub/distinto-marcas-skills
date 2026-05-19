# Sistema de Aprobación de Grillas — Spec de Diseño

> Sistema web para gestionar el ciclo de aprobación de grillas semanales de contenido para los 7 clientes activos de Agencia Distinto, con migración progresiva desde Notion.

- **Fecha**: 2026-05-18
- **Autor**: Pedro Reyes Calderón (Agencia Distinto) + Claude (sesión brainstorm)
- **Estado**: Borrador para revisión
- **Tiempo estimado de implementación**: 37-54 horas (~3-5 semanas con dedicación parcial)

---

## 🎯 Problema que resolvemos

Hoy, el flow de aprobación de grilla semanal es manual y propenso a fricción:

1. El equipo del cowork prepara la grilla en Notion (calendario de contenido)
2. Pedro debe abrir Notion, revisar, generar pieza visual (con plantilla HTML/PNG)
3. Pedro manda al cliente por WhatsApp **sin un loop de aprobación previo a verificarlo él**
4. Si hay un error, ya se envió — corregir es costoso

Hay 3 puntos de dolor concretos:
- **No hay aprobación humana intermedia**: Pedro a veces no revisa antes de mandar
- **Notion no es app-friendly**: tocar botones desde el celu en Notion es awkward
- **No hay auditoría**: no queda registro de cuándo se aprobó, quién aprobó, cuándo se envió

---

## 💡 Solución propuesta

Una **aplicación web liviana** que actúa como capa de aprobación + auditoría sobre el flow de grillas, con migración progresiva del resto de operación de Notion al sistema nuevo.

### Componentes

```
┌──────────────────────────────────────────────────┐
│ 1. Frontend (Next.js 15 + Tailwind + shadcn)     │
│    Vercel: https://distinto-app.vercel.app       │
│                                                  │
│    📱 Dashboard interno (Pedro + cowork):        │
│      - Lista de marcas + estado de grilla        │
│      - Botón "🟢 Lista para enviar"             │
│      - Historial de envíos                       │
│                                                  │
│    🌐 Portal cliente (login propio):             │
│      - Ver grilla de la semana                   │
│      - Aprobar / pedir cambios                   │
└──────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│ 2. Supabase (BD + Auth + Webhooks + RLS)         │
│    Proyecto: doipvvygamnmupdyajjk                │
│                                                  │
│    Tablas nuevas:                                │
│      - grillas_pendientes                        │
│      - aprobaciones                              │
│      - envios                                    │
│                                                  │
│    Tablas existentes mantenidas (compat MCP):    │
│      - clientes, tareas, transacciones, notas    │
│                                                  │
│    Webhook trigger: cambios en grillas_pendientes│
└──────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│ 3. Cowork Routines                               │
│                                                  │
│    Routine 1: "Procesar grilla"                  │
│      Trigger: webhook Supabase                   │
│      → Lee Notion (calendario contenido)         │
│      → Genera PNG (skill grilla-semanal)         │
│      → Manda a Pedro WhatsApp (+51983852191)     │
│      → Actualiza estado Supabase                 │
│                                                  │
│    Routine 2: "Listener aprobación WhatsApp"     │
│      Trigger: cron cada 3 min lun-vie 7am-8pm    │
│      → Lee Rubi MCP eventos recientes            │
│      → Si "ok [marca]" → enviar al grupo cliente │
│      → Si "no [marca]" → cancelar                │
└──────────────────────────────────────────────────┘
```

---

## 🗂️ Modelo de datos

### Tablas nuevas (Supabase)

#### `marcas`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text UNIQUE | ej: `manrique`, `little-joe` |
| `nombre` | text | ej: "Centro Psicológico Manrique ABA" |
| `decisor_nombre` | text | ej: "Dr. Daniel Manrique" |
| `decisor_whatsapp` | text | número con código país |
| `grupo_whatsapp_alias` | text | alias Rubi del grupo cliente |
| `tono_voz` | jsonb | resumen estructurado para AI |
| `color_primario_hex` | text | ej: `#283B6F` |
| `activa` | boolean | true para 7 activas, false para Mil Ideas/Oral Beauty |
| `created_at` | timestamptz | |

#### `grillas_pendientes`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `marca_id` | uuid FK → marcas | |
| `semana_inicio` | date | lunes de la semana |
| `semana_fin` | date | domingo |
| `estado` | enum | `pendiente`, `procesando`, `esperando_aprobacion`, `aprobada`, `enviada`, `cancelada`, `regenerar` |
| `pedida_por` | uuid FK → users | quién apretó el botón |
| `pedida_at` | timestamptz | timestamp del botón |
| `procesada_at` | timestamptz | cuando la routine generó el PNG |
| `aprobada_at` | timestamptz | cuando Pedro mandó "ok" |
| `enviada_at` | timestamptz | cuando llegó al cliente |
| `cancelada_at` | timestamptz | |
| `png_url` | text | URL pública de la grilla generada |
| `mensaje_id_pedro` | text | ID del mensaje WhatsApp a Pedro |
| `mensaje_id_cliente` | text | ID del mensaje al grupo cliente |
| `notas` | text | observaciones manuales |

#### `aprobaciones` (auditoría)
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `grilla_id` | uuid FK → grillas_pendientes | |
| `usuario_id` | uuid FK → users | |
| `accion` | enum | `aprobar`, `rechazar`, `regenerar`, `solicitar` |
| `comentario` | text | opcional |
| `via` | enum | `whatsapp`, `dashboard`, `api` |
| `created_at` | timestamptz | |

#### `envios` (log de envíos a clientes)
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `grilla_id` | uuid FK | |
| `marca_id` | uuid FK | |
| `enviado_a` | text | nombre del grupo o número |
| `enviado_via` | enum | `whatsapp_grupo`, `whatsapp_dm`, `email` |
| `mensaje_id` | text | ID retornado por Rubi |
| `caption` | text | mensaje enviado |
| `success` | boolean | |
| `error` | text | si falló |
| `created_at` | timestamptz | |

### Tablas existentes (compat con MCP distinto actual)

Se mantienen sin modificar para no romper:
- `clients`, `tasks`, `transactions`, `notes`, `pipeline`, `team`

Decisión técnica: **schema híbrido**. Después de validar 2-4 semanas que el sistema nuevo funciona, se decide si refactorizar el MCP distinto para usar las tablas nuevas.

### Row Level Security (RLS)

- **Marcas**: cualquiera autenticado puede ver. Solo `admin` puede modificar.
- **Grillas pendientes**: usuarios internos ven todas. Clientes (cuando se agreguen) solo ven las de SUS marcas.
- **Aprobaciones / Envios**: solo internos.

---

## 🎨 Frontend (Next.js)

### Stack
- **Framework**: Next.js 15 con App Router
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: Supabase Auth (`@supabase/ssr`)
- **State**: React Server Components + Server Actions
- **Deploy**: Vercel (auto-deploy desde GitHub main)

### Pantallas

#### 1. Login (`/login`)
- Email + Magic Link (Supabase Auth)
- Login con Google
- Sin signup público (solo invitados)

#### 2. Dashboard (`/`)
Lista de 7 marcas activas como cards. Cada card muestra:
- Logo
- Nombre marca
- Estado de la grilla de **esta semana actual**: emoji + texto
  - 🔘 Sin pedido (default)
  - 🟡 Pendiente — esperando que routine procese
  - 🔵 Esperando aprobación tuya en WhatsApp
  - 🟢 Aprobada y enviada hace HH:MM
  - 🔴 Cancelada
- Botón principal según estado:
  - Si "Sin pedido": **🟢 Pedir grilla**
  - Si "Esperando aprobación": **Ver preview en WhatsApp**
  - Si "Enviada": **Ver detalle**
- Click en card → vista detalle

#### 3. Detalle marca (`/marca/[slug]`)
- Toda la info de la marca (voz, tono, contacto)
- Última grilla generada (preview PNG)
- Historial de envíos (últimas 10)
- Botón "Regenerar grilla esta semana"

#### 4. Historial (`/historial`)
- Tabla con filtros: marca, semana, estado
- Click en fila → preview PNG + caption enviado

#### 5. Settings (`/settings`)
- Datos de cada marca (decisor, WhatsApp, grupo)
- Solo admin puede editar

### Portal cliente (`/portal/[marca-slug]`)
Login separado (cliente entra con su email):
- Ve **solo SU marca**
- Pantalla única: grilla de la semana actual
  - PNG preview
  - Caption que se va a enviar
  - Botón "👍 Aprobar" → marca estado y manda WhatsApp al grupo
  - Botón "💬 Solicitar cambios" → notifica a Pedro via WhatsApp

---

## 🔌 Cowork Routines

### Routine 1: "Procesar grilla"

```yaml
nombre: procesar-grilla
trigger:
  tipo: webhook
  origen: supabase
  evento: INSERT en grillas_pendientes con estado='pendiente'
acciones:
  1. Recibir payload: {grilla_id, marca_slug, semana_inicio, semana_fin}
  2. Cambiar estado en Supabase a 'procesando'
  3. Invocar skill grilla-semanal del plugin distinto-marcas:
     - Leer Notion (DB Grilla FIT) filtrado por marca + rango semana
     - Generar PNG según plantilla de la marca
     - Subir PNG a Supabase Storage (público con URL temporal)
  4. Construir caption corto:
     "📊 Grilla [Marca] · Semana DD-DD\n[N] publicaciones\n¿Apruebas? ok [marca] / no [marca] / redo [marca]"
  5. Enviar a Pedro (DM): whatsapp_send_to_phone +51983852191
  6. Guardar mensaje_id_pedro en grilla
  7. Cambiar estado a 'esperando_aprobacion'
error handling:
  - Si Notion falla → retry 2x, después marcar 'cancelada' con error en notas
  - Si Rubi falla → idem
  - Notificar a Pedro por WhatsApp en cualquier error
```

### Routine 2: "Listener aprobación WhatsApp"

```yaml
nombre: listener-aprobacion
trigger:
  tipo: cron
  schedule: "*/3 7-20 * * 1-5"  # cada 3 min, 7am-8pm, lun-vie
acciones:
  1. Query Supabase: grillas con estado='esperando_aprobacion'
  2. Si NO hay ninguna → exit (no-op, ~2 seg)
  3. Si hay:
     - Llamar Rubi: whatsapp_get_recent_events últimos 10 min
     - Filtrar mensajes from = 51983852191
     - Parsear con regex:
       /^(ok|✅|si|sí|aprobado)\s+(\w+)/i  → aprobar
       /^(no|❌|cancelar|rechazar)\s+(\w+)/i → cancelar
       /^(redo|rehacer|regenerar)\s+(\w+)/i → regenerar
  4. Para cada match:
     - Encontrar marca por slug (alias soportados)
     - Encontrar grilla 'esperando_aprobacion' de esa marca
     - APROBAR:
       * Cambiar estado 'aprobada'
       * whatsapp_send_image al grupo del cliente con caption original
       * Registrar en envios
       * Cambiar estado 'enviada'
       * Responder a Pedro: "✅ Enviado [marca] a las HH:MM. messageId: XXX"
     - CANCELAR:
       * Cambiar estado 'cancelada'
       * Responder a Pedro: "❌ Cancelada [marca]"
     - REGENERAR:
       * Cambiar estado 'pendiente' (re-dispara routine 1 por webhook)
       * Responder a Pedro: "🔄 Regenerando [marca]..."
costo estimado:
  - 13h × 20 ejecuciones/h × 5 días = 1,300 ejecuciones/semana
  - Ejecución vacía (~2 seg, mínimos tokens)
  - Solo procesa cuando hay actividad real
```

---

## 🚀 Plan de implementación por fases

### Fase 0 — Setup infra (1-2h) 🔴 BLOQUEANTE
- [ ] Despertar proyecto Supabase `doipvvygamnmupdyajjk`
- [ ] Crear repo GitHub `distinto-app` (privado)
- [ ] Conectar Vercel al repo → deploy automático
- [ ] Crear `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Setup Next.js 15 con `npx create-next-app@latest` + Tailwind + shadcn

### Fase 1 — Diseño BD (3-5h) 🔴 BLOQUEANTE
- [ ] Migración inicial: crear tablas `marcas`, `grillas_pendientes`, `aprobaciones`, `envios`
- [ ] Configurar RLS policies básicas
- [ ] Seed inicial: insertar 7 marcas activas con sus datos (decisor, contacto, color, etc.)
- [ ] Crear bucket Supabase Storage para PNGs de grillas (con TTL 30 días)
- [ ] Crear webhook trigger Supabase: cuando `grillas_pendientes.estado` cambia a `'pendiente'` → POST a `/api/routines/procesar-grilla` (Vercel endpoint que reenvía a Cowork)

### Fase 2 — Frontend MVP interno (8-12h) 🔴 BLOQUEANTE
- [ ] Setup Supabase Auth (Email + Google)
- [ ] Middleware de protección de rutas
- [ ] Pantalla `/login`
- [ ] Pantalla `/` (Dashboard) con grid de marcas
- [ ] Server Action: botón "Pedir grilla" → INSERT en `grillas_pendientes`
- [ ] Subscribe a cambios realtime (Supabase Realtime) para actualizar estado en vivo
- [ ] Pantalla `/marca/[slug]` (detalle + historial)
- [ ] Pantalla `/historial` (tabla con filtros)
- [ ] Pantalla `/settings` (solo admin)

### Fase 3 — Webhooks + Routines (3-5h) 🔴 BLOQUEANTE
- [ ] Crear routine "Procesar grilla" en Cowork con trigger webhook
- [ ] Crear endpoint API en Vercel `/api/routines/procesar-grilla` que recibe webhook Supabase y dispara routine Cowork
- [ ] Crear routine "Listener aprobación" en Cowork con trigger cron
- [ ] Integración con skill `grilla-semanal` del plugin distinto-marcas
- [ ] Test end-to-end con marca piloto (Manrique)

### Fase 4 — Portal cliente (8-10h)
- [ ] Pantalla `/portal/[marca-slug]` con login propio
- [ ] Vista única: grilla actual + botones aprobar/pedir cambios
- [ ] Invitar primer cliente piloto (Manrique)

### Fase 5 — Multi-usuario (4-6h)
- [ ] Tabla `usuarios` con roles (admin, colaborador, cliente)
- [ ] Permisos por marca (colaborador ve solo SUS marcas asignadas)
- [ ] UI de invitación de usuarios
- [ ] Invitar 1-2 personas del cowork

### Fase 6 — Migración data Notion (4-8h)
- [ ] Export Notion → CSV (calendario contenido, clientes, tareas)
- [ ] Script de import a Supabase con transformaciones
- [ ] Validar paridad de data
- [ ] Anunciar a equipo: dejar de usar Notion para nuevas entradas
- [ ] 2 semanas de coexistencia (read-only Notion + write Supabase)
- [ ] Archivar Notion

### Fase 7 — Polish (4-6h)
- [ ] Historial detallado con métricas (cuántas grillas/mes, tiempo de aprobación, etc.)
- [ ] Estados de error visibles + retry manual
- [ ] Búsqueda + filtros avanzados
- [ ] Onboarding del cowork (doc + tour interactivo)

---

## ⚠️ Riesgos identificados

1. **Supabase Free tier limits**: Si la app crece, podría exceder 500MB DB o 50K usuarios mensuales. Mitigación: monitorear desde fase 1, upgrade a Pro ($25/mes) si hace falta.

2. **Supabase paused projects**: Free tier pausa proyectos sin actividad 7 días. Mitigación: la routine "Listener" toca la DB cada 3 min en horario laboral → la mantiene despierta.

3. **Migración de Notion arriesgada**: si la migración tiene errores y se pierde data. Mitigación: nunca borrar Notion hasta tener 4 semanas de operación sin issues en Supabase. Backups diarios automáticos de Supabase.

4. **Cowork routines dependen de la skill grilla-semanal**: si rompemos el plugin, el flow se rompe. Mitigación: tests end-to-end en cada cambio del plugin.

5. **Rubi MCP puede cambiar**: si Anthropic cambia el endpoint, el flow se rompe. Mitigación: fallback manual desde el dashboard ("enviar manualmente esta grilla").

6. **WhatsApp parsing fragile**: si Pedro escribe "ok kintu plis" en lugar de "ok kintu", podría fallar el match. Mitigación: regex flexible + comando `status` que muestra qué está esperando.

---

## 🧪 Estrategia de testing

- **Fase 0-1**: validación manual de schema y RLS
- **Fase 2**: tests de UI con Playwright (al menos login + flow de pedir grilla)
- **Fase 3**: test end-to-end con marca piloto (Manrique) — apretar botón → grilla llega a WhatsApp Pedro
- **Fase 4-5**: tests de permisos (cliente no ve otras marcas, colaborador no edita admin settings)
- **Fase 6**: validación de paridad pre/post-migración por marca

---

## 📦 Deliverables al final

1. App live en `https://distinto-app.vercel.app`
2. Repo GitHub `rcpier65-hub/distinto-app` (privado)
3. Supabase con schema completo + data migrada
4. 2 Cowork routines configuradas y funcionando
5. Documentación de usuario (cómo opera el cowork esto)
6. Plugin distinto-marcas v3.0.0 actualizado para integrarse con el sistema nuevo (opcional, fase futura)

---

## 🎯 Métricas de éxito

Después de 4 semanas en producción:
- ✅ 100% de grillas pasaron por loop de aprobación de Pedro (vs hoy: ~60%)
- ✅ Tiempo promedio de aprobación: <15 min
- ✅ Cero envíos al cliente sin OK de Pedro
- ✅ Cowork del equipo onboarded y usando el sistema
- ✅ Notion archivado (data migrada y verificada)

---

## 📌 Próximos pasos inmediatos

Después de aprobación de este spec:
1. Invocar skill `superpowers:writing-plans` para crear plan detallado por tareas
2. Crear el repo `distinto-app` en GitHub
3. Despertar Supabase y empezar Fase 0

**Estado**: ⏳ Esperando aprobación de Pedro para escribir el implementation plan.
