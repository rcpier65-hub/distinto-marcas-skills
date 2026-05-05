# Documentos — Little Joe

> Canon pesado de la marca: PDFs, Excels, Word, presentaciones.
> **No se cargan en contexto por default — se consultan on-demand cuando se necesita verificar un dato concreto.**

---

## 📚 Documentos esperados

### Documentos canon (Tier 1 — los más importantes)

| Archivo | Qué contiene | Cuándo consultar |
|---|---|---|
| `briefing-original.pdf` | Brief inicial firmado con el cliente | Al verificar promesas, alcance, scope |
| `manual-de-marca.pdf` | Brand book oficial completo | Verificar identidad visual, voz formal |
| `plan-estrategico-anual.pdf` | Plan anual con metas y campañas | Al planificar mes/trimestre |
| `productos-servicios.xlsx` | Catálogo completo con precios actualizados | Al verificar precio o stock |

### Carpetas con documentos históricos

| Carpeta | Qué contiene |
|---|---|
| `investigacion-mercado/` | Auditorías iniciales del cliente, estudios de mercado |
| `reportes-mensuales/` | PDFs de reportes mensuales históricos (1 por mes) |
| `reuniones-cliente/actas/` | Actas de reuniones con cliente (planificación, revisión) |

---

## 🔄 Política de actualización

- **`briefing-original.pdf`**: NUNCA modificar. Es el documento de la firma del contrato. Si hay cambios contractuales, archivar como `briefing-original-vN.pdf` y crear nuevo.
- **`manual-de-marca.pdf`**: Solo actualizar cuando cliente entrega nueva versión. Versionar.
- **`plan-estrategico-anual.pdf`**: Reemplazar al inicio de cada año.
- **`productos-servicios.xlsx`**: Mantener actualizado en tiempo real (es el dato vivo).

---

## ⚠️ Sobre el extracto de texto

Los PDFs y Excels NO los lee Claude directamente para tareas operativas. Para consulta rápida, hay versiones extraídas a markdown en `assets/`:
- `assets/brand-book-extract.md` ← extracto del manual-de-marca.pdf
- `assets/voz-extracto.md` ← extracto del documento de voz oficial

Si modificás un PDF, **regenerar el extracto** correspondiente.
