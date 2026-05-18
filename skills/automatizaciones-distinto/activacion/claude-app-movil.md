# Activación desde Claude app móvil

## Setup (5 minutos, 1 sola vez)

1. **Descargar Claude**:
   - iOS: App Store → "Claude by Anthropic"
   - Android: Google Play → "Claude by Anthropic"

2. **Iniciar sesión** con tu cuenta Claude (la misma de desktop)

3. **Verificar plugin instalado**: las skills `distinto-marcas` deberían aparecer disponibles automáticamente desde tu cuenta

4. **Tip**: agrega el ícono de Claude a la pantalla de inicio del celu para acceso rápido

## Cómo usar

Igual que en desktop. Hablas en lenguaje natural y las skills se activan por trigger:

```
"Revisa los comentarios de TikTok de Manrique"
"Genera la grilla de Lozano"
"Ya respondí los comentarios de Little Joe"
"¿Qué tareas tengo pendientes?"
```

## Ventajas vs Rubi WhatsApp

| Ventaja | Claude app | Rubi WhatsApp |
|---|---|---|
| Setup | 5 min | 2-3 hrs |
| Conversación natural | ✅ Total | 🟡 Limitada a comandos |
| Ver previews / archivos | ✅ | 🟡 Limitado |
| Ejecutar acciones complejas | ✅ | 🟡 Depende de qué tan armado esté |
| Funciona si no tengo Mac encendida | ✅ Sí (todo en cloud) | ❌ No (Mac debe estar prendida) |

## Limitaciones

- **Si los scripts requieren tu Mac local** (ej: Patchright + Drive Desktop sync), Claude app necesita que la Mac esté encendida también
- **Las cookies de TikTok están en tu Mac** → no se puede ejecutar `responder-tiktok` solo desde celu sin Mac
- **Lo que SÍ se puede 100% desde celu**: cualquier flow que use solo MCPs cloud (Notion, Metricool, Rubi WhatsApp, Drive web API)

## Cuándo usarla

- Estás de viaje sin Mac
- Quieres aprobar algo rápido sin abrir la laptop
- Para conversaciones largas/exploratorias (Rubi WhatsApp no es ideal para eso)

Versión: 0.1.0
