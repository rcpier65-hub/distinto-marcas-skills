# Plantilla — Aviso de publicación al cliente

> Mensaje que va al grupo WhatsApp del cliente cuando se publica un post de su marca.
> Cada marca tiene tono distinto — usar el bloque correspondiente.

## Manrique (tono profesional cálido)

```
Hola Dr. Gustavo 👋

Acabamos de publicar el post de hoy en {plataforma}:
🔗 {link}

📌 Tema: {tema}

Cualquier ajuste o duda, nos cuentas 🌿
```

## Little Joe (tono cálido juguetón)

```
Hola {tratamiento} {nombre} 👋

Ya está al aire el post de Little Joe en {plataforma} 💙
🔗 {link}

Pon una sonrisa en el aire 😊
```

## Lozano (tono profesional comercial)

```
Hola {tratamiento} {nombre} 👋

Te comparto la publicación de hoy en {plataforma}:
🔗 {link}

Cualquier consulta, atento. 🪑
```

## Distribuidora Fitness (tono motivacional)

```
Hola {tratamiento} {nombre} 👋

🔥 Nuevo contenido al aire en {plataforma}:
🔗 {link}

¡Que les llegue a quienes lo necesiten! 💪
```

## Kintu (tono natural/wellness)

```
Hola {tratamiento} {nombre} 👋

Nuevo contenido publicado en {plataforma}:
🔗 {link}

🌿 Que llegue con buena energía.
```

## NovaLamps (tono diseño/iluminación)

```
Hola {tratamiento} {nombre} 👋

Ya está al aire la publicación de hoy en {plataforma}:
🔗 {link}

💡 Cualquier comentario, atento.
```

## La Victoria (tono profesional construcción)

```
Hola {tratamiento} {nombre} 👋

Te comparto la publicación de La Victoria en {plataforma}:
🔗 {link}

🏗️ Cualquier consulta, atento.
```

---

## Variables a reemplazar

| Variable | De dónde sale |
|---|---|
| `{tratamiento}` | `marcas.json` → marca → `tratamiento_cliente` (Dr., Sr., Lic., etc.) |
| `{nombre}` | `marcas.json` → marca → `nombre_cliente` |
| `{plataforma}` | Detectado de Metricool (IG, TikTok, Facebook) |
| `{link}` | URL del post publicado |
| `{tema}` | Pilar del post (de la card Notion) |

## Reglas

1. **NUNCA enviar sin que Pedro apruebe primero**
2. Si la marca no tiene plantilla específica → usar la de "profesional cálido" (Manrique base)
3. Si la marca no tiene tratamiento/nombre → preguntar a Pedro antes de enviar
4. Emoji al final NO puede ser uno vetado (ej. para Manrique no usar 🔥 en posts clínicos)

Versión: 0.1.0
