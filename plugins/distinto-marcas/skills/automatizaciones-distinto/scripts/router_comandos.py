#!/usr/bin/env python3
"""
router_comandos.py — Parser determinístico de comandos `>>` de Pedro

Cumple 3 roles:
1. **Single source of truth** de la tabla comando → acción
2. Utility CLI para probar parsing sin spawn de Claude:
       echo ">> revisa tiktok manrique" | python3 router_comandos.py
3. Helper invocable desde Claude para parsing exacto cuando duda

Versión: 0.1.0
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import asdict, dataclass
from typing import Optional


# ============================================================
# Catálogo de marcas (con aliases)
# ============================================================

# slug → set de aliases que Pedro puede escribir
MARCAS_ALIASES = {
    "manrique": {"manrique", "centro psicologico manrique", "manrique aba"},
    "little-joe": {"little joe", "littlejoe", "joe", "lj"},
    "lozano": {"lozano", "muebles lozano"},
    "distribuidora-fitness": {
        "distribuidora fitness", "distri fitness", "fitness", "df"
    },
    "kintu": {"kintu"},
    "novalamps": {"novalamps", "nova lamps", "nova"},
    "la-victoria": {"la victoria", "victoria", "lv"},
}

# Marcas que NO trabajamos
MARCAS_EXCLUIDAS = {"mil ideas", "milideas", "oral beauty", "oralbeauty"}


def detectar_marca(texto: str) -> Optional[str]:
    """
    Busca aliases de marca en el texto. Retorna slug o None.
    Match case-insensitive, longest-alias-wins para evitar "joe" vs "little joe".
    """
    t = texto.lower().strip()

    # primero descarta excluidas
    for excl in MARCAS_EXCLUIDAS:
        if excl in t:
            return None

    # buscar match de aliases, priorizando los más largos
    candidatos = []
    for slug, aliases in MARCAS_ALIASES.items():
        for alias in aliases:
            if alias in t:
                candidatos.append((len(alias), slug))

    if not candidatos:
        return None
    candidatos.sort(reverse=True)  # longest first
    return candidatos[0][1]


# ============================================================
# Tabla de comandos
# ============================================================

@dataclass
class Comando:
    accion: str                  # nombre canónico de la acción
    marca: Optional[str] = None  # slug si aplica
    extra: Optional[str] = None  # arg extra (ej. link)
    raw: str = ""                # texto original
    confianza: str = "alta"      # alta | media | baja
    error: Optional[str] = None  # razón si no se pudo parsear


# Patrones: (regex, acción canónica, requires_marca)
PATRONES = [
    # responder-tiktok lectura
    (r"(?:revisa|leer?|ver)\s+(?:tiktok|comentarios?)", "revisar-tiktok", True),
    # responder-tiktok MODE 2 (cierre + aviso cliente)
    (r"(?:ya\s+(?:respondi|termine|acabe|cerre))\s+(?:tiktok|comentarios?)",
     "cerrar-tiktok", True),
    # grilla
    (r"(?:haz|hacer|crear|genera|armar?)\s+(?:la\s+)?grilla", "grilla", True),
    (r"grilla\s+(?:semanal|de)", "grilla", True),
    # aviso publicacion
    (r"aviso\s+(?:de\s+)?publicacion", "aviso-publicacion", True),
    # trends
    (r"trends?\s+(?:de\s+)?(?:la\s+)?semana", "trends-semana", True),
    # saludos
    (r"saludos?\s+(?:de\s+)?hoy", "saludos-hoy", False),
    # utilitarios
    (r"\bpendientes?\b", "pendientes", False),
    (r"\bstatus\b", "status", False),
    (r"resumen\s+(?:del\s+)?dia", "resumen-dia", False),
    (r"\bhelp\b|\bayuda\b", "help", False),
]


def parsear(linea: str) -> Comando:
    """
    Parsea una línea de comando que ya viene sin el prefijo >> o /distinto.
    """
    raw = linea
    t = linea.strip().lower()

    # quita prefijos por si vienen
    t = re.sub(r"^>>\s*", "", t)
    t = re.sub(r"^/distinto\s*", "", t)

    if not t:
        return Comando(accion="vacio", raw=raw, confianza="baja",
                       error="comando vacío")

    # match contra patrones
    for patron, accion, requiere_marca in PATRONES:
        if re.search(patron, t):
            marca = detectar_marca(t) if requiere_marca else None
            extra = _extraer_extra(t, accion)

            if requiere_marca and not marca:
                return Comando(
                    accion=accion, raw=raw, confianza="baja",
                    error="no detecté marca — necesito especificar (manrique, "
                          "little joe, lozano, fitness, kintu, novalamps, la victoria)"
                )

            return Comando(accion=accion, marca=marca, extra=extra,
                           raw=raw, confianza="alta")

    # no matcheó — confianza baja, dejar que Claude desambigüe
    marca = detectar_marca(t)
    return Comando(
        accion="desconocido", marca=marca, raw=raw, confianza="baja",
        error="no reconozco la acción — usá 'help' para ver opciones"
    )


def _extraer_extra(texto: str, accion: str) -> Optional[str]:
    """
    Extrae argumento extra según la acción:
      - aviso-publicacion → URL
      - otros → None por ahora
    """
    if accion == "aviso-publicacion":
        # busca primera URL
        m = re.search(r"https?://\S+", texto)
        if m:
            return m.group(0)
    return None


# ============================================================
# CLI
# ============================================================

def main() -> int:
    if len(sys.argv) > 1:
        linea = " ".join(sys.argv[1:])
    else:
        linea = sys.stdin.read().strip()

    if not linea:
        print(json.dumps({"error": "sin input"}, ensure_ascii=False))
        return 1

    cmd = parsear(linea)
    print(json.dumps(asdict(cmd), ensure_ascii=False, indent=2))
    return 0 if cmd.confianza == "alta" else 2


if __name__ == "__main__":
    sys.exit(main())
