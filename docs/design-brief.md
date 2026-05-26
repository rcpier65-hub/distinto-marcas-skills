# Distinto Sistema — Design Brief

> Documento base para rediseño de UI con Claude Design.
> Define filosofía, tono visual, sistema de diseño y prioridad de pantallas.
>
> **Última actualización**: mayo 2026
> **Owner**: [@rcpier65-hub](https://github.com/rcpier65-hub) (Pedro Reyes Calderón)

---

## ¿Qué es el producto?

Plataforma full-stack interna de **Agencia Distinto** (agencia de marketing digital
en Lima, Perú con 9 marcas clientes activas). Automatiza tareas repetitivas del
equipo: armado y envío de grillas semanales, respuesta de comentarios en redes
sociales, tracking de grabaciones de video, hábitos diarios, configuración por marca.

| Dato | Valor |
|---|---|
| **Repo GitHub** | https://github.com/rcpier65-hub/distinto-marcas-skills |
| **URL producción** | https://distinto-app.vercel.app |
| **Usuarios** | 2-5 personas del equipo Distinto (Pedro + community managers) |
| **Tipo** | Herramienta interna (NO producto público) |
| **Estado actual** | 6 features deployadas, diseño funcional pero sin polish |

---

## Visión de marca del SISTEMA (la app misma)

Distinto Sistema debe transmitir:

- **Profesionalismo serio** — no es startup juguetón, es agencia con clientes empresariales
- **Eficiencia visible** — cada vista comunica "esto te ahorra tiempo"
- **Identidad propia distintiva** — no plantilla genérica de admin panel
- **Multi-marca neutral** — sirve a 9 marcas con paletas muy distintas (azul clínico Manrique, verde wood La Victoria, celeste Typhouse, dorado premium Novalamps, etc.). El sistema mismo debe ser **neutral pero premium**, dejando que cada marca destaque cuando aparece en su contexto.

---

## Estilo deseado

### Modo
- **Dark mode primario** (oscuro premium, no plano)
- Light mode opcional (toggle en settings) — opcional para v2

### Identidad agencia
- Hint a "estudio creativo" sin caer en cliché
- Tipografía display distintiva (no Inter genérico)
- Espaciado generoso (no admin denso tipo Salesforce)
- Detalles deliberados: gradients sutiles, micro-shadows, blur backdrops

### Lo que NO queremos
- ❌ Aspecto "AI slop" tipo v0 / Vercel templates
- ❌ Dashboard genérico tipo Notion
- ❌ Aburrido B2B SaaS (PagerDuty, Salesforce)
- ❌ Colorful overload tipo Trello/Asana viejos
- ❌ Skeumórfico o flat extremo

---

## Referencias visuales aspiracionales

| App | Qué admiramos |
|---|---|
| **Linear** ([linear.app](https://linear.app)) | Tipografía, motion, command palette, dark mode pulido |
| **Vercel Dashboard** | Dark mode profesional, micro-interactions, hierarchy |
| **Cron / Notion Calendar** | Calendar UI con eventos color-coded, density correcta |
| **Stripe Dashboard** | KPI cards elegantes, jerarquía visual, accesibilidad |
| **PostHog** ([posthog.com](https://posthog.com)) | Denso pero respira, sidebar minimal, focus en data |
| **Raycast** | Comandos, palette, animaciones, sense of "magic" |

**Mood final**:
> "Si Linear y Stripe hicieran un sistema interno para una agencia creativa que
> sirve a marcas con identidad fuerte — esto sería."

---

## Stack técnico (constraints)

- **Framework**: Next.js 16 (App Router) + TypeScript estricto
- **Styling**: Tailwind CSS (NO podemos cambiar a CSS Modules ni styled-components)
- **Component library**: shadcn/ui ya instalado y usado:
  - `Card`, `Button`, `DropdownMenu`, `Avatar`, `Badge`, `Tabs`, `Dialog`, `Toast`
- **Iconos**: Lucide React
- **Motion**: framer-motion permitido si agrega valor (no overkill)
- **Responsive**: desktop 1280px+ primero. Mobile no es prioridad.
- **Server components por default**, client only donde sea necesario

---

## Pantallas a rediseñar (priority queue)

### 🔴 P0 — High priority

#### 1. Dashboard (`/dashboard`)
**Hoy**: lista básica de marcas con links.
**Objetivo**:
- Hero con KPIs agregados (grabaciones del mes / comentarios pendientes / hábitos cumplidos hoy)
- Navegación a 9 marcas con cards que muestran color/logo
- Quick actions arriba (procesar comentarios, ver grilla de hoy)
- Activity feed lateral (últimas grillas enviadas, próximas grabaciones)

#### 2. Grilla Workspace (`/grilla/[slug]`)
**Hoy**: split iframe preview + caption editor. Funcional pero plano.
**Objetivo**:
- Preview iframe destacado tipo Figma (zoom in/out, fit to screen)
- Caption editor moderno con preview live de cómo se ve en WhatsApp (mock chat bubble)
- Botones con estados claros:
  - 🧪 Probar (New team) — variant secondary
  - 📤 Enviar al grupo — variant primary, disabled si safety lock OFF
- Sidebar con publicaciones de la semana (lista compacta)

#### 3. Comentarios (`/comentarios`)
**Hoy**: tabla densa estilo Excel. Sin jerarquía visual.
**Objetivo**: inbox tipo Front/Intercom
- Lista de threads a la izquierda (avatar + texto truncado + categoría chip + tiempo)
- Detail panel a la derecha (comentario completo + post context + form respuesta)
- Batch select con counter sticky abajo
- Categoría chips coloridos
- Context del post como card embebida (thumbnail + caption)

### 🟡 P1 — Medium priority

#### 4. Grabaciones — Calendario (`/grabaciones/calendario`)
**Hoy**: grid mensual básico con chips coloridos por marca.
**Objetivo**:
- Calendario tipo Cron (días con preview de eventos al hover)
- Eventos color-coded por marca con tooltips
- Botón "+ nueva" en cada día vacío (aparece on-hover)
- KPI cards arriba con bar progress por marca

#### 5. Hábitos (`/habitos`)
**Hoy**: inspirado en Streaks pero feo (cards oscuras con heatmap básico).
**Objetivo**:
- Cards con depth (sombras 3D sutiles)
- Botón "¡Hecho!" con micro-animation al click (scale + confetti?)
- Heatmap más pulido con tooltips por día
- ProgressRing SVG mejorado con gradients

#### 6. Settings (`/settings`)
**Hoy**: cards apiladas verticales tipo form genérico.
**Objetivo**:
- Layout split: nav lateral con secciones + content principal
- Formularios con sections tipo Notion settings (group titles, separators)
- Password fields con buen UX masking + show/hide toggle
- Auto-save indicator (loading → checkmark)

### 🟢 P2 — Nice to have

#### 7. Publicaciones (`/publicaciones`)
Kanban moderno tipo Linear board.

#### 8. Marca detail (`/marca/[slug]`)
Vista del cliente como "perfil" con cada feature accesible desde ahí.

---

## Componentes del Design System base

Antes de tocar pantallas, necesitamos estos 10 primitivos consistentes:

| Componente | Descripción |
|---|---|
| **PageHeader** | Title + subtitle + breadcrumb + acciones a la derecha |
| **KPICard** | Número grande + label + delta% + sparkline opcional |
| **MarcaCard** | Chip con logo + color accent + nombre + status |
| **DataTable** | Denso pero pulido, sticky header, selección, inline edit, bulk actions |
| **FormField** | Label + input + helper text + error state |
| **Toast** | Estilo Linear (slide-in bottom-right, color por tipo) |
| **CommandPalette** | Cmd+K para navegar entre features y marcas |
| **EmptyState** | Cuando no hay data, ilustración + CTA |
| **StatusPill** | Chip de estado coloreado (pendiente, aprobado, etc.) |
| **MarcaSelector** | Dropdown con search, muestra logo + nombre + accent color |

---

## Paleta sugerida (refinable)

### Modo oscuro (primary)

```
Background base:     gradiente sutil de #0A0A0F → #11111A
Surface (cards):     bg-white/[0.03] + border white/[0.06]
Hover surface:       bg-white/[0.06]
Text primary:        #F5F5F7 (no #FFFFFF — molesta los ojos)
Text muted:          #8B8B92
Text disabled:       #4A4A52

Accent principal:    refinable — sugerencias:
                     - Índigo profundo (#6366F1)
                     - Violeta sutil (#8B5CF6)
                     - Cyan eléctrico (#06B6D4)

Acentos por marca:   ya están en BD (marcas.color_calendario)
                     - Manrique:           #3B82F6 (azul)
                     - Lozano:             #10B981 (verde)
                     - NovaLamps:          #EAB308 (dorado)
                     - Distri Fitness:     #F97316 (naranja)
                     - Kintu:              #84CC16 (lima)
                     - La Victoria:        #92400E (marrón wood)
                     - Typhouse:           #1FB3E8 (celeste)

Semánticos:
  Success:   #10B981 (emerald)
  Warning:   #F59E0B (amber)
  Danger:    #EF4444 (red)
  Info:      #3B82F6 (blue)
```

### Modo claro (opcional v2)

Inversión proporcional. Bg `#FAFAFA → #F5F5F7`, surface white sólido, text dark.

---

## Tipografía sugerida (refinable)

### Display (headings, KPIs grandes)
Opciones (en orden de preferencia):
1. **General Sans** (Fontshare, free) — geométrico, personalidad sin ser raro
2. **Geist Display** (Vercel, free) — moderno, technical
3. **Manrope** (Google Fonts) — backup confiable

### Body (párrafos, labels)
- **Inter** o **Geist Sans** (legibilidad first, neutro)

### Monospace (códigos, IDs, tabular numbers)
- **Geist Mono** o **JetBrains Mono**

### Escala
```
text-xs:    11px (microcopy, helper text)
text-sm:    13px (body por default — más denso que 14)
text-base:  15px (body destacado)
text-lg:    18px (subtitles)
text-xl:    22px (section titles)
text-2xl:   28px (page titles)
text-3xl:   36px (hero KPIs)
text-5xl:   56px (display, rare)
```

---

## Motion / Interacciones

### Principios
- **Función > decoración**: cada animación tiene un propósito (feedback, hierarchy, delight)
- **Velocidad**: 150-250ms para micro, 350-500ms para transiciones grandes
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo, Linear-style)

### Patrones específicos
- **Hover en cards**: lift sutil (translateY -2px + shadow grow) en 200ms
- **Click en botón**: scale(0.97) en 100ms, snap back en 150ms
- **Toast in**: slide from right + fade in 250ms
- **Page transitions**: fade in del content 200ms (no flashy)
- **Loading**: skeleton shimmer suave, NO spinners boring

---

## Accesibilidad

- **WCAG AA mínimo** (contraste 4.5:1 body, 3:1 large)
- Focus visible **siempre** (no `outline: none` sin replacement)
- Keyboard navigation completa (Tab, Enter, Esc, arrows en listas)
- Aria labels en iconos sin texto
- Color **NO es la única señal** de estado (usar shape + texto también)

---

## Plan de ejecución con Claude Design

### Fase 1 — Design System base (1 sesión)

**Prompt para Claude Design**:
> Generá el Design System base de Distinto Sistema en un Hi-fi prototype.
> Incluí: paleta de colores (modo dark primary), tipografía con escala,
> los 10 componentes primitivos del documento. Mostrá cada componente en
> sus variants (primary/secondary, sm/md/lg, idle/hover/active/disabled).
> NO toques pantallas reales todavía — quiero validar el sistema base primero.

**Entregable**: 1 Hi-fi prototype con Design System completo. Validamos juntos.

### Fase 2 — Pantallas P0 (3 sesiones, 1 por pantalla)

Una vez validado el sistema:
1. Dashboard
2. Grilla Workspace
3. Comentarios

Cada sesión: prompt apuntando a la pantalla + 2 variants de redesign + iteración.

### Fase 3 — Pantallas P1 (3 sesiones)

4. Grabaciones Calendario
5. Hábitos
6. Settings

### Fase 4 — Refinamiento + entrega

- Consolidar componentes en `app/components/` del repo
- Documentar en `docs/design-system.md`
- PR final con todos los redesigns aplicados

---

## Mood final (TL;DR para Claude Design)

> Profesional, sereno, eficiente, con detalles deliberados que demuestran que
> esto fue construido por gente que se preocupa por el detalle.
>
> Cero "AI slop". Cero templates Vercel. Cero Notion vibes.
>
> Más cerca de Linear que de Salesforce. Más cerca de Stripe que de Trello.
> Una herramienta interna que el equipo de Distinto quiere abrir cada mañana
> porque es **agradable de usar**, no porque tienen que.
