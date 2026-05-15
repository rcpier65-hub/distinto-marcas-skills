---
name: responder-tiktok
description: Lee, responde y modera comentarios de TikTok de cualquier marca de Distinto Agencia usando Playwright + sesión persistente (sin re-login). Activar cuando el usuario diga "responde comentarios tiktok de [marca]", "revisa tiktok inbox", "responde tiktok de todas las marcas", "cuántos comentarios pendientes hay en tiktok", "modera tiktok", o variaciones. Soporta operación en paralelo sobre las 9 marcas con un archivo de cookies por marca.
---

# Responder TikTok — Workflow autónomo

> Skill que automatiza la respuesta de comentarios de TikTok cuando Metricool no llega (su API TikTok está rota / incompleta). Usa Playwright + storage_state para mantener sesión persistente por marca sin necesidad de re-login constante.

## ⚡ Cuándo activar

Activar **siempre** que el usuario pida:

- "Responde comentarios TikTok de [marca]"
- "Revisa el inbox de TikTok de [marca]"
- "Cuántos comentarios pendientes hay en TikTok"
- "Modera TikTok de [marca]"
- "Responde TikTok de todas las marcas"
- "Saca un resumen del inbox TikTok"
- "TikTok inbox: [marca]"

Donde `[marca]` puede ser: Manrique, Lozano, Distribuidora Fitness, Kintu, Novalamps, La Victoria, Mil Ideas, Little Joe, Oral Beauty.

## 📋 Reglas absolutas

1. **NUNCA responder sin mostrar primero el preview** al usuario y esperar aprobación. Excepción: si el usuario dice "responde directo" o "no hace falta preview".
2. **NUNCA inventar respuestas off-tone** — cada marca tiene su archivo en `tonos/<marca>.md`. Si no hay tono definido para una marca, avisar al usuario y NO operar.
3. **SIEMPRE leer la skill de marca** (`marca-X-cliente`) para sensibilidades y voz antes de generar respuestas.
4. **SIEMPRE incluir delays humanos** entre acciones (3-8 segundos). Sin esto, TikTok puede bloquear la cuenta.
5. **NUNCA responder a trolls, spam o hate** — flagearlos en el resumen para que el cliente decida.
6. **SIEMPRE escalar a humano** si el comentario menciona: precio especial, queja formal, amenaza de denuncia, consulta sensible (ver `05-cliente.md` de cada marca), tema médico específico.
7. **NUNCA correr el lote completo (9 marcas) en paralelo** — usar batches de 3 marcas con delays para evitar fingerprint de IP.
8. **Si una marca tiene cookies expiradas** → reportarlo y skip esa marca, NO bloquear el lote entero.

---

## 🗺️ Workflow completo

### Paso 1 — Identificar marca(s)

Extraer del mensaje del usuario qué marca(s). Si dice "todas" → cargar todas las que tengan auth/<marca>.json válido.

Consultar `marcas.json` para verificar:
- Que la marca tenga handle de TikTok configurado
- Que `auth/<marca>.json` exista (sesión guardada)
- Última fecha de login (si > 50 días, advertir que probablemente expire pronto)

### Paso 2 — Leer comentarios pendientes

Ejecutar `scripts/leer_comentarios.py --marca <marca>` que:
- Carga `auth/<marca>.json` como storage_state
- Abre TikTok Studio en modo headless
- Navega a Inbox → Comentarios
- Extrae: video_id, comment_id, username, texto, timestamp, respondido_si_no
- Devuelve JSON con todos los pendientes
- Tiempo aprox: 20-40 segundos por marca

### Paso 3 — Generar respuestas on-tone

Para cada comentario pendiente:
1. Cargar `tonos/<marca>.md` (patrones aprendidos del cliente)
2. Cargar skill de marca correspondiente (`marca-X-cliente`)
3. Clasificar el comentario:
   - `precio` → respuesta tipo precio (deriva a DM o link)
   - `compliment` → agradecimiento corto + emoji
   - `consulta_horario` → dato concreto + invitación
   - `consulta_tecnica` → si es respondible con info pública, responder; si no, derivar
   - `queja` → ⚠️ ESCALAR — no auto-responder
   - `spam` / `troll` → flag, no responder
4. Generar borrador con el tono específico de esa marca

### Paso 4 — Mostrar preview al usuario

Formato:
```
📋 BORRADORES DE RESPUESTA — TikTok [Marca]
═══════════════════════════════════════════

[1] @usuario | "comentario original" | hace 3h
    💬 Borrador: "respuesta on-tone"
    📊 Clasificación: consulta_horario
    [✅ aprobar] [✏️ editar] [❌ skip]

[2] @usuario2 | "comentario original" | hace 5h
    ⚠️ ESCALAR (queja) — no se genera respuesta automática
    Sugerencia: notificar al cliente

...
```

### Paso 5 — Esperar aprobación

El usuario puede:
- "Aprueba todos los borradores 1-5"
- "Aprueba 1, 2, 3. Edita 4 → '[nuevo texto]'. Skip 5"
- "Responde directo todos los que sean compliments, los demás muéstrame"

### Paso 6 — Postear respuestas aprobadas

Ejecutar `scripts/responder.py --marca <marca> --comments <comment_ids> --replies <replies>`:
- Carga `auth/<marca>.json`
- Abre TikTok headless
- Por cada comentario: navega al video → encuentra comentario → click "Reply" → escribe → click "Post"
- Delay 5-8s entre cada uno
- Logea resultados en `logs/<marca>_<fecha>.json`

### Paso 7 — Notificar resultado por WhatsApp

Usar `whatsapp_send_message` al grupo correspondiente (ver `recipients.md` del skill `grilla-semanal`):

```
Hola Dr. Gustavo 👋

📊 TikTok inbox — [fecha]

✅ Respondidos: 5 comentarios
⚠️ Escalados (decidir tú): 2
   • @usuario: "[comentario]"
   • @usuario2: "[comentario]"
🚫 Spam/troll filtrados: 1

Las respuestas usadas siguen el tono on-brand. Cualquier ajuste posterior lo puedes hacer desde TikTok Studio.
```

---

## 🔑 Sistema de autenticación (storage_state)

### Setup inicial (1 vez por marca, ~2 min cada una)

Pedro corre:
```bash
cd skills/responder-tiktok
python scripts/primer_login.py --marca manrique
```

- Se abre Chrome visible
- Pedro hace login normal en TikTok (user + pass + 2FA si tiene)
- Presiona Enter en terminal
- Se guarda `auth/manrique.json` con todas las cookies

Repetir para las 9 marcas.

### Re-login cuando expiran cookies (~cada 60 días)

Si el skill detecta error "session expired" o redirect a login:
1. Avisa al usuario: "Cookies de [marca] expiraron, necesito re-login"
2. Pedro corre `primer_login.py --marca <marca>` otra vez
3. Listo, 2 minutos

---

## ⚙️ Modo paralelo (todas las marcas)

Cuando el usuario diga "responde TikTok de todas":

```bash
python scripts/responder_lote.py --batch-size 3 --delay 10
```

- Procesa marcas en lotes de 3 (no las 9 al toque)
- Espera 10s entre lotes
- Genera reporte consolidado JSON
- Si alguna marca falla → continúa con las demás

---

## 📊 Output esperado por marca

```json
{
  "marca": "manrique",
  "fecha": "2026-05-16T09:00:00",
  "comentarios_leidos": 12,
  "respondidos_auto": 8,
  "escalados": 2,
  "spam_filtrado": 2,
  "errores": [],
  "tiempo_total_segundos": 47
}
```

---

## 🚨 Manejo de errores

| Error | Acción |
|---|---|
| `auth/<marca>.json` no existe | Avisar y pedir que Pedro corra `primer_login.py` |
| Cookies expiradas (redirect a /login) | Marcar marca como "necesita re-login", continuar con las demás |
| Captcha en pantalla | Pausar, screenshot, avisar a Pedro |
| TikTok bloqueó la cuenta | Detener inmediatamente esa marca, alertar |
| DOM cambió (selector no encontrado) | Logear screenshot, avisar para actualizar selectores |
| Más de 5 errores seguidos | Detener todo el lote (probable detección de bot) |

---

## 🎯 Triggers que activan la skill

| Frase del usuario | Acción |
|---|---|
| "Responde TikTok de Manrique" | Marca: manrique, modo: full workflow |
| "Cuántos pendientes hay en TikTok Lozano" | Marca: lozano, modo: solo leer (paso 1-2) |
| "Revisa TikTok de todas las marcas" | Lote completo, paralelo de a 3 |
| "Modera TikTok de [marca]" | Solo flagear spam/troll, no responder |
| "Responde directo TikTok [marca]" | Skip paso 4 (preview), auto-aprobar borradores |
| "TikTok dashboard" | Resumen consolidado de todas las marcas sin responder |

---

## 📎 Referencias

- 🧠 Tonos por marca: `tonos/<marca>.md`
- ⚙️ Config TikTok handles: `marcas.json`
- 🔑 Cookies guardadas: `auth/<marca>.json` (gitignored)
- 📝 Logs ejecución: `logs/<marca>_<fecha>.json`
- 📞 WhatsApp groups: `../grilla-semanal/recipients.md`
- 🎨 Voz por marca: `../marca-X-<cliente>/01-marca.md`

---

## ⚠️ Limitaciones honestas

1. **TikTok puede cambiar el DOM**. Si los selectores se rompen, hay que actualizar `scripts/leer_comentarios.py` y `scripts/responder.py`. Tiempo estimado de fix: 15-30 min.
2. **Detección anti-bot**. Si TikTok empieza a pedir captcha frecuente → bajar el ritmo, usar más delays, o considerar proxy.
3. **No funciona offline**. Necesita conexión a internet y a `tiktok.com/tiktokstudio`.
4. **No reemplaza al humano** para decisiones de marca. Los borradores son sugerencias; el cliente puede editarlas en TikTok Studio si quiere refinarlos.

---
Versión: 1.0.0 · Creada: 2026-05-15
