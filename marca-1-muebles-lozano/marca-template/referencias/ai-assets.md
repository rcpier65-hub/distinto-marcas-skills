# IA y Assets Generativos — Muebles Lozano

> Voiceprints + brand prompts + RAG corpus + AI tools.
> Consulta cuando se va a generar contenido con IA (imagen / video / voz / texto).

---

## 🎙️ Voiceprint (clonación de voz)

**¿Tiene voiceprint?**: [Sí/No]

### Sample principal
- **Archivo**: `assets/voiceprint-sample.mp3`
- **Duración**: [segundos — mínimo 30s para clonación decente]
- **Calidad**: [estudio / celular / mixta]
- **Voz de**: [nombre del talento]
- **Idioma**: [español / inglés / otros]
- **Acento**: [neutro / peruano costeño / mexicano / etc.]

### Plataformas donde está clonada
- **ElevenLabs**: [voice ID si aplica]
- **HeyGen**: [voice ID si aplica]
- **Otra**: [...]

### Restricciones de uso
- [TODO: ej. "no usar para campañas políticas"]
- [TODO: ej. "siempre subtitular en mismo idioma"]

---

## 🎨 Brand prompts para generación de IMÁGENES

> Prompts probados que generan imágenes consistentes con la marca.

### Prompt base para Midjourney
```
[TODO: prompt base con estilo, paleta, mood, composición]

Ejemplo:
"Photo of [TEMA], soft natural lighting, warm color palette
of cream and terracotta, minimalist composition, shot on
medium format film, --ar 4:5 --v 6"
```

### Prompt base para DALL-E / Imagen 3
```
[TODO]
```

### Prompt base para Flux / Stable Diffusion
```
[TODO]
```

### Negative prompts (qué EVITAR)
- [TODO: ej. "no neon, no cyberpunk, no dramatic shadows"]

### Estilos prohibidos
- [TODO: ej. "no estilo anime, no cartoon, no AI-obviously generated"]

---

## 🎬 Brand prompts para generación de VIDEO

### Sora / Runway / Luma
```
[TODO: prompt base para video con estilo de marca]
```

### Estilo de movimiento preferido
[TODO: ej. "cámara estática + sujeto en movimiento" o "dolly suave"]

---

## ✍️ Brand prompts para generación de TEXTO

### Para LLM (ChatGPT / Claude / Gemini)
> Prompt base que pega quien quiera generar copy en voz de marca SIN tener acceso al skill completo.

```
Sos copywriter de Muebles Lozano. La voz es [3-5 traits].
Vocabulario propio: [power words]. Palabras prohibidas: [...].
Audiencia: [persona principal — 1 frase].
Reglas: [3-5 reglas core].

Tarea: [específica]
```

---

## 🧠 Knowledge Base RAG (para AI agent en DMs)

> Corpus para que un AI agent (en chatbot WhatsApp, web, IG) responda con voz de marca.

### Documentos en el corpus
- [TODO: lista de documentos vectorizados]
- [TODO: link al sistema RAG (Pinecone / Weaviate / Supabase Vector / etc.)]

### FAQ procesado
> Lista de preguntas frecuentes con respuestas oficiales para el agente.

[TODO: 20-50 Q&A]

### Plataforma del agent
- **Tool**: [Voiceflow / Botpress / custom]
- **URL admin**: [link]
- **Modelo usado**: [GPT-4 / Claude Sonnet / etc.]

---

## 🤖 AI Tools en uso

| Tool | Uso | Quién la usa | Suscripción |
|---|---|---|---|
| ChatGPT Plus | Copy + brainstorm | [equipo] | $20/mes |
| Claude Pro | Análisis profundo | [equipo] | $20/mes |
| Midjourney | Imágenes | [diseñador] | $30/mes |
| Canva AI | Diseño rápido | [equipo] | $15/mes |
| ElevenLabs | Voiceover | [editor] | $X/mes |
| HeyGen | Avatar AI video | [editor] | $X/mes |
| Runway | Video generativo | [editor] | $X/mes |

---

## 🎭 Avatar de marca digital (si aplica)

- **Persona avatar**: [nombre / descripción]
- **Plataforma**: [HeyGen / Synthesia / D-ID]
- **Avatar ID**: [ID]
- **Fondo preferido**: [descripción]
- **Cuándo usar el avatar vs persona real**: [criterios]

---

## ⚠️ Reglas de uso de IA

1. **SIEMPRE etiquetar** contenido generado con IA si es realista (#AICreated)
2. **NUNCA generar** caras de personas reales sin permiso
3. **NUNCA generar** texto que parezca testimonio real si no lo es
4. **REVISAR HUMANAMENTE** todo output de IA antes de publicar
5. **Datos de la marca** SIEMPRE verificados contra `03-oferta-presencia.md`

---

## 📎 Referencias

- 🎙️ Voz de marca documentada: `01-marca.md`
- 📄 Voz oficial extraída: `assets/voz-extracto.md`
- 🎨 Brand book extracto: `assets/brand-book-extract.md`
