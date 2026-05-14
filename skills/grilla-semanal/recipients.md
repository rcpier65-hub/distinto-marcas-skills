# Recipients — Mapa marca → contacto + grupo WhatsApp

> Configuración por marca para la grilla semanal. Cada fila define a quién
> mencionar y a qué grupo enviar.

## 📞 Mapeo oficial

| # | Marca | Skill | Contacto cliente | WhatsApp contacto | Grupo destino | Group ID | Alias |
|---|---|---|---|---|---|---|---|
| 1 | Muebles Lozano | `marca-1-muebles-lozano` | _por confirmar_ | `51________` | New team | `120363427129444398@g.us` | `little-joe` |
| 2 | **Manrique ABA** | `marca-2-manrique` | **Gustavo** | `51983852191` ⚠️ | **New team** | `120363427129444398@g.us` | `little-joe` |
| 3 | Distribuidora Fitness | `marca-3-distribuidora-fitness` | _por confirmar_ | `51________` | New team | `120363427129444398@g.us` | `little-joe` |
| 4 | Little Joe | `marca-4-little-joe` | _por confirmar_ | `51________` | New team | `120363427129444398@g.us` | `little-joe` |
| 5 | Mil Ideas | `marca-5-mil-ideas` | _por confirmar_ | `51________` | New team | `120363427129444398@g.us` | `little-joe` |
| 6 | Kintu | `marca-6-kintu` | _por confirmar_ | `51________` | New team | `120363427129444398@g.us` | `little-joe` |
| 7 | Novalamps | `marca-7-novalamps` | _por confirmar_ | `51________` | New team | `120363427129444398@g.us` | `little-joe` |
| 8 | La Victoria | `marca-8-la-victoria` | _por confirmar_ | `51________` | New team | `120363427129444398@g.us` | `little-joe` |
| 9 | Oral Beauty | `marca-9-oral-beauty` | _por confirmar_ | `51________` | New team | `120363427129444398@g.us` | `little-joe` |

## ⚠️ Pendientes

- **Manrique** (Gustavo): el número `51983852191` es el de Pedro (owner agencia). Confirmar si Gustavo tiene un número propio que prefiera para tags, o si efectivamente el destinatario en producción es Pedro y "Gustavo" es solo el saludo. Si Gustavo tiene número propio → reemplazar en la tabla.
- **Resto de marcas**: completar contactos + números reales antes de operar el skill en producción.

## Reglas

1. **Cuando una marca no tiene contacto confirmado** → preguntar al usuario antes de enviar.
2. **El grupo "New team"** es el grupo interno de Distinto donde llegan TODAS las grillas (no se envía directo al cliente). El mention en el caption es para que el responsable del cliente reciba notificación dentro del grupo.
3. **Si en el futuro cada marca tiene su propio grupo cliente** → agregar columna y actualizar este mapa. La skill leerá de aquí.

## Cómo agregar una marca nueva

1. Crear su `marca-X-cliente/SKILL.md` en `skills/`
2. Agregar una fila en esta tabla
3. Confirmar con el cliente el contacto y número de WhatsApp
4. Probar el flujo con preview antes de enviar real

---
Actualizado: 14 May 2026 · v1.0
