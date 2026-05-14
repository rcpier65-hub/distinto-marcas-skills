# Recipients — Mapa marca → contacto + grupo WhatsApp

> Configuración por marca para la grilla semanal. Cada fila define a quién
> mencionar y a qué grupo enviar.

## 📞 Mapeo oficial

| # | Marca | Skill | Tratamiento | Nombre | WhatsApp contacto | Grupo destino | chatId |
|---|---|---|---|---|---|---|---|
| 1 | Muebles Lozano | `marca-1-muebles-lozano` | _por confirmar_ | _por confirmar_ | `51________` | _por confirmar_ | _por confirmar_ |
| 2 | **Manrique ABA** | `marca-2-manrique` | **Dr.** | **Gustavo** | `51902414745` | **Marketing Manrique ABA** | `120363339856209687@g.us` |
| 3 | Distribuidora Fitness | `marca-3-distribuidora-fitness` | _por confirmar_ | _por confirmar_ | `51________` | _por confirmar_ | _por confirmar_ |
| 4 | Little Joe | `marca-4-little-joe` | _por confirmar_ | _por confirmar_ | `51________` | New team | `120363427129444398@g.us` |
| 5 | Mil Ideas | `marca-5-mil-ideas` | _por confirmar_ | _por confirmar_ | `51________` | _por confirmar_ | _por confirmar_ |
| 6 | Kintu | `marca-6-kintu` | _por confirmar_ | _por confirmar_ | `51________` | _por confirmar_ | _por confirmar_ |
| 7 | Novalamps | `marca-7-novalamps` | _por confirmar_ | _por confirmar_ | `51________` | _por confirmar_ | _por confirmar_ |
| 8 | La Victoria | `marca-8-la-victoria` | _por confirmar_ | _por confirmar_ | `51________` | _por confirmar_ | _por confirmar_ |
| 9 | Oral Beauty | `marca-9-oral-beauty` | _por confirmar_ | _por confirmar_ | `51________` | _por confirmar_ | _por confirmar_ |

## 🎯 IMPORTANTE — Cómo construir el saludo

El saludo se construye combinando **Tratamiento + Nombre**:

```
Hola [Tratamiento] [Nombre] 👋
```

### Ejemplos correctos:

- Manrique → "Hola **Dr. Gustavo** 👋" ✅
- (No usar) → "Hola Gustavo 👋" ❌ (falta el Dr.)
- (No usar) → "Hola Doctor Gustavo 👋" ❌ (usar "Dr." abreviado)

### Tratamientos posibles

- `Dr.` — profesional médico/psicólogo (caso Manrique)
- `Sr.` / `Sra.` — tratamiento formal genérico
- `Lic.` — licenciado/a
- `Ing.` — ingeniero/a
- `(vacío)` — saludo informal directo "Hola [Nombre]"

⚠️ **Si una marca no tiene tratamiento confirmado**, preguntar al usuario antes de enviar. No asumir.

---

## ⚠️ Pendientes

Solo Manrique está completamente configurada. Las otras 8 marcas necesitan:
- Confirmar nombre del contacto cliente
- Confirmar tratamiento (Dr./Sr./etc.)
- Confirmar número WhatsApp
- Confirmar grupo destino (puede que cada marca tenga su propio grupo)

---

## Reglas operativas

1. **Cuando una marca tiene contactos `_por confirmar_`** → la skill NO debe operar para esa marca. Avisar al usuario y pedir los datos.
2. **El grupo "Marketing [Marca]"** parece ser el patrón de naming para grupos de cada cliente. Verificar este patrón al confirmar las demás marcas.
3. **El chatId** se obtiene con `whatsapp_list_groups` antes de enviar — siempre validar que el grupo existe y el bot está agregado.

## Cómo agregar/actualizar una marca

1. Confirmar con el cliente: nombre del contacto, tratamiento (Dr./Sr./etc.), número WhatsApp
2. Verificar el grupo donde llegarán las grillas (consultar `whatsapp_list_groups`)
3. Actualizar la fila correspondiente en esta tabla
4. Probar el flujo con preview (no enviar) antes de operar en real

---
Actualizado: 14 May 2026 · v1.1
