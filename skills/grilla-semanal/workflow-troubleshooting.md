# Troubleshooting — Workflow Grilla Semanal

> Errores conocidos y workarounds documentados al construir este skill.
> Consultar antes de improvisar soluciones.

## 1. Notion no devuelve resultados filtrados por fecha

**Síntoma**: La query a la database "GRILLA DE CONTENIDO" devuelve páginas pero no se pueden filtrar por `Grilla de FIT` directamente.

**Causa**: El MCP de Notion solo tiene `notion-search` y `notion-fetch`. No expone un `query_data_sources` con filtros de propiedad.

**Workaround**:
1. Hacer `notion-search` con `data_source_url: "collection://11688541-0ddd-83d3-8e56-873a2ca08fb9"` y query = nombre de la marca
2. Iterar los resultados haciendo `notion-fetch` de cada página
3. Filtrar localmente por `date:Grilla de FIT:start` dentro del rango de fechas
4. Filtrar también por `proyecto` (relación) para asegurar que es de la marca correcta

**Mejora futura**: Si Notion expone una tool de query con filtros, reemplazar esta lógica por una sola query con filtros server-side.

---

## 2. WhatsApp/Rubi rechaza URLs localhost

**Síntoma**: Error `Bad Request: Owned media must be a url or base64` cuando paso `http://localhost:8765/image.jpg`.

**Causa**: El servidor Rubi corre en su propia infraestructura y no puede acceder a localhost del cliente.

**Workaround**:
- Opción A (recomendada): subir imagen al repo público GitHub y usar URL `https://github.com/[user]/[repo]/raw/main/[path]`
- Opción B: base64 inline en el campo `media.base64` (limitado por tamaño del tool call)
- Opción C: subir a un host de archivos público (transfer.sh, 0x0.st) — no siempre disponible

---

## 3. Base64 grande causa errores JPEG "corrupt data"

**Síntoma**: `Error: VipsJpeg: Corrupt JPEG data: premature end of data segment`

**Causa**: El base64 está siendo truncado en algún punto de la cadena Read → tool call (límites de tokens).

**Workaround**:
- Comprimir la imagen drásticamente (240×360 px) para que el base64 quepa
- Pero esto degrada la calidad → preferir el camino de URL pública

---

## 4. URL raw de GitHub responde 404 inmediatamente después del push

**Síntoma**: `curl https://raw.githubusercontent.com/.../file.png` devuelve HTTP 404 aunque el push fue exitoso.

**Causa**: El CDN de GitHub raw demora 5-10 segundos en propagar cambios.

**Workaround**:
- Esperar 5-10s después del push antes de usar la URL
- O usar `https://github.com/[user]/[repo]/raw/main/[path]` (la URL que pasa por github.com y redirige) — propaga más rápido que la URL raw directa

---

## 5. Repo privado bloquea raw URLs

**Síntoma**: HTTP 404 desde URLs raw aunque el archivo existe y el push fue exitoso.

**Causa**: Repo privado requiere autenticación para acceder archivos raw, y WhatsApp/Rubi no autentica.

**Workaround**:
1. Hacer el repo público temporalmente: `gh repo edit [user]/[repo] --visibility public --accept-visibility-change-consequences`
2. Enviar la imagen
3. Revertir a privado: `gh repo edit [user]/[repo] --visibility private --accept-visibility-change-consequences`

**Decisión recomendada**: mantener el repo público permanentemente. Las skills no contienen credenciales sensibles, y simplifica el workflow.

---

## 6. WhatsApp send_image no soporta array de mentions

**Síntoma**: Al usar `whatsapp_send_image`, el `@phonenumber` en el caption se ve pero no gatilla notificación push en el celular del mencionado.

**Causa**: La tool `whatsapp_send_image` solo tiene `caption` (string), no `mentions` (array). Solo `whatsapp_send_with_mentions` tiene el campo `mentions` que dispara notificación push.

**Workaround opcional** (si la notificación push es crítica):
1. Enviar imagen con caption (como ahora)
2. Inmediatamente después, enviar un mensaje de texto vacío o "⬆️" con `whatsapp_send_with_mentions` mencionando al contacto

**Decisión actual**: por simplicidad, no enviar mensaje extra. El contacto verá la imagen al abrir el grupo. Solo agregar el segundo mensaje si el cliente lo solicita.

---

## 7. Mes en español con tilde

**Síntoma**: Al construir fechas como "Sábado" con tilde, algunas plataformas mal-procesan el texto.

**Workaround**: Usar abreviaturas en mayúsculas sin tilde donde sea posible (`SAB` en lugar de `Sáb`). El template del mensaje canónico usa: LUN MAR MIÉ JUE VIE SÁB DOM (3 letras, con tilde en MIÉ y SÁB porque es ortográficamente correcto).

---

## 8. Plantilla HTML de la marca no existe todavía

**Síntoma**: El skill no encuentra plantilla en `assets/plantillas/grilla-semanal/` de la marca.

**Workaround temporal**:
- Para Manrique: usar la plantilla en `APP MANRIQUE ABANZA/Marca/demo-manrique-semana-real.html` (working directory de Pedro)
- Para otras marcas: pendiente de migrar las plantillas al skill

**Acción definitiva**: ejecutar la migración pendiente — mover los 9 HTMLs de plantilla a `skills/marca-X-cliente/assets/plantillas/grilla-semanal/` (esto es la "Opción A" que el usuario aprobó pero que aún no se ejecutó).

---

Última actualización: 14 May 2026 · v1.0
