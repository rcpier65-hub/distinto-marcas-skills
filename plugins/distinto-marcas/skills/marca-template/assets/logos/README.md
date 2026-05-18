# Logos — {{Cliente}}

> Carpeta para los archivos de logo del cliente.

---

## 📁 Archivos esperados

```
logos/
├── logo-principal.svg          (SVG editable — preferido)
├── logo-principal.png          (PNG transparente alta resolución)
├── logo-blanco.svg             (versión para fondos oscuros)
├── logo-blanco.png
├── logo-negro.svg              (versión para fondos claros)
├── logo-negro.png
├── isotipo.svg                 (símbolo solo, sin texto)
├── isotipo.png
├── logotipo.svg                (texto solo, sin símbolo)
└── logotipo.png
```

---

## 📐 Especificaciones técnicas

- **Resolución mínima PNG**: 2000px en su lado más largo
- **SVG**: vectorial, escalable infinitamente
- **Espacio de color**: RGB para digital, CMYK para print (en SVG)
- **Fondo**: TRANSPARENTE en todas las variantes

---

## 📋 Reglas de uso

> Para reglas completas de uso del logo: ver `assets/brand-book-extract.md` sección Logo

### Resumen rápido
- ✅ Mantener proporciones (NO estirar)
- ✅ Respetar espacio de aire alrededor
- ✅ Usar versión correcta según fondo (oscuro → logo blanco)
- ❌ NO aplicar efectos (sombra, glow, gradiente)
- ❌ NO cambiar colores fuera de paleta oficial
- ❌ NO usar versiones viejas

---

## 🔄 Versionado

Si el cliente entrega logo nuevo:
1. Reemplazar archivos en esta carpeta
2. Mover los viejos a `logos/historico/[YYYY-MM]/`
3. Actualizar `assets/brand-book-extract.md` si hay cambios significativos
4. Notificar al equipo que hay logo nuevo
