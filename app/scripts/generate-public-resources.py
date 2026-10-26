#!/usr/bin/env python3
"""Genera los recursos públicos 05 y 06 con la identidad de Distinto."""

from pathlib import Path
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from PIL import Image as PILImage, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "recursos"
OUTPUT = ROOT.parent / "output" / "pdf"
LOGO = ROOT / "public" / "brand" / "logo-h-color-tight.png"
COVER_05 = ROOT / "public" / "recursos" / "portadas" / "recurso-05-contenido.png"
COVER_06 = ROOT / "public" / "recursos" / "portadas" / "recurso-06-ruta-digital.png"

PURPLE = colors.HexColor("#BA41F7")
VIOLET = colors.HexColor("#7C3AED")
YELLOW = colors.HexColor("#F2CC2C")
INK = colors.HexColor("#17121F")
MUTED = colors.HexColor("#6F6878")
CREAM = colors.HexColor("#F6F1EA")
LAVENDER = colors.HexColor("#F3EAFE")
LINE = colors.HexColor("#E7DFF0")
GREEN = colors.HexColor("#169B67")
RED = colors.HexColor("#C33E55")

pdfmetrics.registerFont(TTFont("Arial", "/System/Library/Fonts/Supplemental/Arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="DTitle", fontName="Arial-Bold", fontSize=27, leading=29, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="DH1", fontName="Arial-Bold", fontSize=21, leading=23, textColor=INK, spaceAfter=8))
styles.add(ParagraphStyle(name="DH2", fontName="Arial-Bold", fontSize=13, leading=16, textColor=INK, spaceAfter=5))
styles.add(ParagraphStyle(name="DBody", fontName="Arial", fontSize=9.8, leading=14, textColor=MUTED, spaceAfter=7))
styles.add(ParagraphStyle(name="DSmall", fontName="Arial", fontSize=7.7, leading=10.2, textColor=MUTED))
styles.add(ParagraphStyle(name="DEyebrow", fontName="Arial-Bold", fontSize=8, leading=10, textColor=VIOLET, tracking=1.2, spaceAfter=8))
styles.add(ParagraphStyle(name="DWhiteTitle", fontName="Arial-Bold", fontSize=28, leading=30, textColor=colors.white, alignment=TA_LEFT))
styles.add(ParagraphStyle(name="DWhiteBody", fontName="Arial", fontSize=11, leading=16, textColor=colors.HexColor("#F2EAF7")))
styles.add(ParagraphStyle(name="DNumber", fontName="Arial-Bold", fontSize=26, leading=28, textColor=PURPLE, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="DCenter", fontName="Arial", fontSize=9, leading=13, textColor=MUTED, alignment=TA_CENTER))


def P(text, style="DBody"):
    return Paragraph(text, styles[style])


def cover_background(path):
    """Prepara un fondo A4 oscurecido sin depender de transparencia del PDF."""
    target = (1191, 1684)
    with PILImage.open(path).convert("RGB") as source:
        fitted = ImageOps.fit(source, target, method=PILImage.Resampling.LANCZOS, centering=(.5, .5))
        fitted = ImageEnhance.Brightness(fitted).enhance(.58)
        buffer = BytesIO()
        fitted.save(buffer, format="JPEG", quality=91, optimize=True)
        buffer.seek(0)
        return ImageReader(buffer)


def bullets(items, color=PURPLE):
    rows = []
    for item in items:
        rows.append([P("●", "DSmall"), P(item, "DBody")])
    table = Table(rows, colWidths=[6 * mm, 166 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("TEXTCOLOR", (0, 0), (0, -1), color),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return table


def cards(items, cols=2, widths=None):
    rows = []
    for i in range(0, len(items), cols):
        row = []
        for title, body in items[i:i + cols]:
            row.append([P(title, "DH2"), P(body, "DBody")])
        while len(row) < cols:
            row.append("")
        rows.append(row)
    widths = widths or [86 * mm] * cols
    table = Table(rows, colWidths=widths, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), .65, LINE),
        ("INNERGRID", (0, 0), (-1, -1), .65, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return [table]


def callout(title, body, bg=LAVENDER, accent=PURPLE):
    table = Table([[P(title, "DH2"), P(body, "DBody")]], colWidths=[39 * mm, 133 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), .8, accent),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def table(rows, widths, header=True, font_size=8.2):
    data = [[P(str(cell), "DH2" if (header and r == 0) else "DSmall") for cell in row] for r, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), .55, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("BACKGROUND", (0, 0), (-1, 0), LAVENDER),
        ("TEXTCOLOR", (0, 0), (-1, 0), INK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FCFAFD")]),
    ]
    t.setStyle(TableStyle(style))
    return [t]


class ResourceDoc(BaseDocTemplate):
    def __init__(self, path, title, number, cover_art):
        super().__init__(str(path), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=22*mm, bottomMargin=18*mm, title=title, author="Distinto Agencia")
        self.resource_title = title
        self.resource_number = number
        self.cover_art = cover_art
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates(PageTemplate(id="all", frames=frame, onPage=self.decorate))

    def decorate(self, canvas, doc):
        page = canvas.getPageNumber()
        canvas.saveState()
        if page == 1:
            canvas.drawImage(cover_background(self.cover_art), 0, 0,
                             width=A4[0], height=A4[1], mask="auto")
        else:
            canvas.setFillColor(CREAM)
            canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
            canvas.setStrokeColor(LINE)
            canvas.line(18*mm, A4[1]-15*mm, A4[0]-18*mm, A4[1]-15*mm)
            canvas.setFont("Arial-Bold", 7.5)
            canvas.setFillColor(VIOLET)
            canvas.drawString(18*mm, A4[1]-11*mm, f"RECURSO {self.resource_number}  ·  DISTINTO")
            canvas.setFont("Arial", 7)
            canvas.setFillColor(MUTED)
            canvas.drawRightString(A4[0]-18*mm, A4[1]-11*mm, self.resource_title[:58])
            canvas.line(18*mm, 13*mm, A4[0]-18*mm, 13*mm)
            canvas.drawString(18*mm, 8.5*mm, "www.distintostudio.com  ·  team@distintostudio.com  ·  +51 983 852 191")
            canvas.drawRightString(A4[0]-18*mm, 8.5*mm, str(page - 1))
        canvas.restoreState()


def cover(number, title, subtitle):
    logo = Table([[Image(str(LOGO), width=70*mm, height=14*mm)]], colWidths=[78*mm])
    logo.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("LEFTPADDING", (0, 0), (-1, -1), 4*mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4*mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3*mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3*mm),
    ]))
    return [
        Spacer(1, 17*mm),
        logo,
        Spacer(1, 39*mm),
        P(f"RECURSO {number}", "DEyebrow"),
        P(title, "DWhiteTitle"),
        Spacer(1, 8*mm),
        P(subtitle, "DWhiteBody"),
        Spacer(1, 52*mm),
        P("Una guía práctica de Distinto para tomar mejores decisiones sin depender de fórmulas vacías.", "DWhiteBody"),
        PageBreak(),
    ]


def section(title, intro=None):
    out = [P(title.upper(), "DEyebrow"), P(title, "DH1")]
    if intro:
        out += [P(intro, "DBody"), Spacer(1, 2*mm)]
    return out


def build_05(path):
    doc = ResourceDoc(path, "Qué contenido repetir, corregir o descartar", "05", COVER_05)
    story = cover("05", "Qué contenido repetir, corregir o descartar", "Un sistema para dejar de juzgar una publicación solo por sus vistas y convertir cada pieza en una decisión útil.")

    story += section("Antes de mirar números, define la función", "Una publicación no puede evaluarse si no sabemos para qué fue creada. El mismo resultado puede ser bueno para posicionamiento y malo para ventas.")
    story += cards([
        ("1. Alcance", "Busca llegar a nuevas personas. Señales principales: retención inicial, reproducciones de no seguidores y compartidos."),
        ("2. Autoridad", "Busca que la marca sea recordada como una referencia. Señales: guardados, comentarios con preguntas y visitas al perfil."),
        ("3. Consideración", "Busca que una persona explore una solución. Señales: clics, respuestas, tiempo de consumo y conversaciones iniciadas."),
        ("4. Conversión", "Busca una acción comercial. Señales: leads calificados, reuniones, cotizaciones y ventas atribuibles."),
    ])
    story += [Spacer(1, 5*mm), callout("Regla central", "No compares una pieza educativa con un anuncio, ni un video de descubrimiento con uno de cierre. Evalúa cada contenido contra su función y contra el promedio real de tu propia cuenta."), PageBreak()]

    story += section("Las cuatro señales que sí importan", "Las vistas son una puerta de entrada. Para decidir bien necesitas leer el recorrido completo de la audiencia.")
    story += table([
        ["Señal", "Qué responde", "Qué observar", "Lectura práctica"],
        ["Atención", "¿La persona se detuvo?", "Retención inicial, reproducción y caída de los primeros segundos.", "Si falla, el empaque no logró abrir la conversación."],
        ["Conexión", "¿El mensaje valió la pena?", "Tiempo medio, finalización, guardados y compartidos.", "Si funciona, la idea tiene valor aunque el alcance sea bajo."],
        ["Intención", "¿Quiso saber más?", "Visitas al perfil, clics, respuestas y comentarios con preguntas.", "Muestra interés, no necesariamente compra inmediata."],
        ["Negocio", "¿Generó una oportunidad?", "Leads útiles, reuniones, cotizaciones, ventas y calidad del contacto.", "Debe medirse con atribución y contexto comercial."],
    ], [28*mm, 40*mm, 55*mm, 49*mm])
    story += [Spacer(1, 5*mm), callout("Tu línea base", "Calcula el promedio y la mediana de tus últimas 10 a 20 piezas comparables. Esa referencia es más útil que un porcentaje universal porque respeta el tamaño, el nicho, la plataforma y el objetivo de tu cuenta."), PageBreak()]

    story += section("La matriz de decisión", "La decisión sale de combinar el valor de la idea con la forma en que fue presentada.")
    story += table([
        ["Lo que ocurrió", "Decisión", "Qué conservar", "Qué cambiar"],
        ["Buena atención + buena intención", "REPETIR", "Tema, promesa y ángulo.", "Ejemplo, apertura visual o formato para evitar una copia."],
        ["Baja atención + buena intención", "CORREGIR EMPAQUE", "La idea y el valor central.", "Primeros 3 segundos, título, portada, ritmo o claridad."],
        ["Buena atención + baja intención", "REFORMULAR", "El gancho que detuvo a la audiencia.", "Desarrollo, prueba, oferta, CTA y conexión con el problema."],
        ["Baja atención + baja intención, primer intento", "VOLVER A PROBAR", "Solo el aprendizaje obtenido.", "Una variable grande: ángulo, audiencia, formato o promesa."],
        ["Baja atención + baja intención, 3 pruebas", "ARCHIVAR", "La evidencia para no repetir el error.", "Mover recursos a una hipótesis más fuerte."],
    ], [38*mm, 31*mm, 49*mm, 54*mm])
    story += [Spacer(1, 5*mm), callout("No descartes demasiado pronto", "Una publicación aislada puede fallar por horario, distribución, ejecución o contexto. Antes de matar una idea, cambia una variable relevante y repite con una muestra comparable."), PageBreak()]

    story += section("Diagnóstico por síntoma", "Busca el cuello de botella antes de pedir más edición, más pauta o más publicaciones.")
    story += cards([
        ("La gente se va al inicio", "La promesa es genérica, tarda en llegar o el primer plano no comunica. Prueba un conflicto concreto, una consecuencia o una demostración inmediata."),
        ("Se quedan, pero no reaccionan", "El contenido explica sin generar una tensión, una postura o una utilidad memorable. Añade contraste, evidencia o una decisión aplicable."),
        ("Guardan, pero no consultan", "Hay valor, pero no existe un puente hacia el servicio. Relaciona el aprendizaje con un problema que la empresa resuelve y ofrece el siguiente paso."),
        ("Preguntan, pero no compran", "Puede haber mala calificación, poca confianza o fricción comercial. Revisa promesa, prueba, tiempos de respuesta, seguimiento y oferta."),
        ("Tiene vistas, pero atrae al público equivocado", "El tema entretiene a muchas personas, pero no filtra al comprador. Introduce contexto de industria, nivel de negocio o problema específico."),
        ("Funciona una vez y luego cae", "Se repitió la superficie y no el principio. Conserva la tensión o el insight; cambia el ejemplo, el personaje, la historia y la forma visual."),
    ])
    story += [PageBreak()]

    story += section("Cómo repetir sin copiar", "Repetir significa explotar una evidencia, no publicar el mismo video con palabras distintas.")
    story += table([
        ["Variable", "Qué puedes probar", "Pregunta de control"],
        ["Ángulo", "Error, costo oculto, mito, comparación, proceso o caso real.", "¿Estoy diciendo algo nuevo o solo cambié el título?"],
        ["Gancho", "Frase contracorriente, resultado, pregunta, demostración o tensión.", "¿Se entiende sin contexto en menos de 3 segundos?"],
        ["Formato", "Voz en off, cámara, entrevista, ranking, caso, pantalla o demostración.", "¿El formato ayuda a entender mejor la idea?"],
        ["Prueba", "Dato, ejemplo, testimonio, captura, proceso, antes/después.", "¿La afirmación tiene evidencia visible?"],
        ["CTA", "Guardar, comentar, descargar, escribir, agendar o comparar.", "¿La acción es coherente con el nivel de conciencia?"],
    ], [29*mm, 77*mm, 66*mm])
    story += [Spacer(1, 5*mm), callout("Una prueba a la vez", "Si cambias gancho, duración, formato, público y oferta al mismo tiempo, no sabrás qué produjo el resultado. Cambia una variable principal y registra la diferencia."), PageBreak()]

    story += section("Revisión antes de publicar", "Este filtro evita que una idea débil llegue a producción por inercia.")
    story += cards([
        ("Claridad", "¿Lo entiende alguien que no conoce la marca? ¿La promesa aparece rápido y sin palabras internas?"),
        ("Relevancia", "¿Parte de una preocupación real del cliente o de algo que la marca quiere decir sobre sí misma?"),
        ("Diferencia", "¿Tiene una postura, prueba, visual o forma de explicar que no sea intercambiable con cualquier competencia?"),
        ("Retención", "¿Cada bloque abre una razón para continuar? ¿Hay cambios visuales útiles y no solo decoración?"),
        ("Confianza", "¿Demuestra experiencia con hechos, procesos, ejemplos o límites? ¿Evita promesas exageradas?"),
        ("Acción", "¿La siguiente acción está clara, es sencilla y corresponde al momento del comprador?"),
    ])
    story += [Spacer(1, 5*mm), P("Una buena idea no necesita cumplir todas las casillas de viralidad. Necesita cumplir su objetivo, hablarle a la persona correcta y entregar una experiencia coherente con la marca.", "DBody"), PageBreak()]

    story += section("Ficha de decisión", "Imprime esta página o cópiala a tu sistema de trabajo. Una ficha por contenido.")
    fields = [
        ["Contenido / enlace", "____________________________________________________________"],
        ["Objetivo", "□ Alcance   □ Autoridad   □ Consideración   □ Conversión"],
        ["Audiencia", "____________________________________________________________"],
        ["Señal más fuerte", "____________________________________________________________"],
        ["Cuello de botella", "____________________________________________________________"],
        ["Decisión", "□ Repetir   □ Corregir empaque   □ Reformular   □ Probar   □ Archivar"],
        ["Qué se conserva", "____________________________________________________________"],
        ["Variable que cambia", "____________________________________________________________"],
        ["Nueva hipótesis", "____________________________________________________________"],
        ["Fecha de revisión", "______________________   Responsable: ______________________"],
    ]
    story += table([["Campo", "Decisión"]] + fields, [46*mm, 126*mm])
    story += [Spacer(1, 5*mm), callout("Cierre semanal", "Revisa las piezas como un portafolio: identifica un patrón para repetir, un cuello de botella para corregir y una hipótesis nueva para probar. Así el contenido deja de ser una apuesta y se convierte en aprendizaje acumulado."), PageBreak()]

    story += section("Ritmo de mejora en 30 minutos", "No necesitas una reunión eterna. Usa esta rutina una vez por semana.")
    story += table([
        ["Tiempo", "Acción", "Resultado"],
        ["0-5 min", "Selecciona 3 piezas comparables y recuerda el objetivo de cada una.", "Muestra útil, no una mezcla de formatos."],
        ["5-12 min", "Lee atención, conexión, intención y negocio contra la línea base.", "Una señal fuerte y un cuello de botella."],
        ["12-20 min", "Asigna una decisión a cada pieza y escribe por qué.", "Repetir, corregir, reformular, probar o archivar."],
        ["20-27 min", "Diseña el siguiente experimento cambiando una sola variable principal.", "Hipótesis clara y verificable."],
        ["27-30 min", "Asigna responsable y fecha de revisión.", "Aprendizaje que vuelve al sistema."],
    ], [24*mm, 91*mm, 57*mm])
    story += [Spacer(1, 8*mm), callout("La meta", "No es acertar siempre. Es aprender más rápido que la competencia y convertir cada publicación en una mejora concreta del mensaje, la distribución o el proceso comercial.", bg=colors.HexColor("#FFF7D6"), accent=YELLOW), Spacer(1, 10*mm), P("Fuentes de referencia: métricas de retención y participación de YouTube Studio; metodología propia de Distinto para lectura de contenido y experimentación. Los indicadores deben adaptarse a cada plataforma, cuenta y objetivo.", "DSmall")]

    doc.build(story)


def build_06(path):
    doc = ResourceDoc(path, "Ruta digital de 90 días para ordenar un negocio", "06", COVER_06)
    story = cover("06", "Ruta digital de 90 días para ordenar un negocio", "Una guía para conectar presencia, captación, ventas, seguimiento, operación y datos sin comprar herramientas que todavía no necesitas.")

    story += section("Digitalizar no es abrir más cuentas", "Un ecosistema digital existe cuando la información fluye desde el primer contacto hasta la venta, la entrega y el aprendizaje. Tener redes, una web y un CRM separados no garantiza ese recorrido.")
    story += cards([
        ("1. Atraer", "Contenido, pauta, alianzas y búsqueda hacen visible el problema que resuelves ante la audiencia correcta."),
        ("2. Capturar", "Landing, formulario, WhatsApp o tienda convierten el interés en un contacto identificable y con contexto."),
        ("3. Calificar", "Preguntas y reglas separan curiosos, oportunidades y clientes listos para una conversación comercial."),
        ("4. Dar seguimiento", "CRM, recordatorios y mensajes aseguran que ninguna oportunidad dependa de la memoria de una persona."),
        ("5. Entregar", "Tareas, inventario, agenda, responsables y comunicación cumplen lo prometido de manera consistente."),
        ("6. Aprender", "Ventas, tiempos, costos y comportamiento regresan al sistema para mejorar marketing y operación."),
    ])
    story += [Spacer(1, 5*mm), callout("Principio", "La tecnología debe reducir una fricción real. Si no puedes nombrar el cuello de botella, su costo y el responsable, probablemente estás comprando una herramienta antes de diseñar el proceso."), PageBreak()]

    story += section("Mapa de madurez", "Ubica tu empresa por el comportamiento dominante, no por la cantidad de aplicaciones contratadas.")
    story += table([
        ["Nivel", "Cómo se ve", "Riesgo principal", "Siguiente prioridad"],
        ["1. Desconectado", "Datos en celulares y hojas; ventas y seguimiento dependen de personas clave.", "Contactos perdidos, respuestas tardías y poca visibilidad.", "Centralizar demanda, responsables y estados."],
        ["2. En transición", "Existen herramientas, pero cada área usa criterios y bases diferentes.", "Doble trabajo, automatizaciones frágiles y reportes inconsistentes.", "Definir proceso, datos mínimos e integraciones."],
        ["3. Integrado", "Marketing, ventas y operación comparten información y reglas básicas.", "El crecimiento expone excepciones y cuellos de botella.", "Medir capacidad, calidad y rentabilidad."],
        ["4. Escalable", "Datos confiables, automatización con control y decisiones por unidad o segmento.", "Optimizar lo incorrecto o perder cercanía con el cliente.", "Experimentar, documentar y gobernar el sistema."],
    ], [29*mm, 56*mm, 48*mm, 39*mm])
    story += [Spacer(1, 5*mm), callout("Señal de alerta", "Si nadie puede explicar el recorrido completo de un prospecto sin abrir cinco chats y tres hojas, el problema no es falta de inteligencia artificial: es falta de un sistema compartido."), PageBreak()]

    story += section("Días 0-30: hacer visible el negocio", "El primer mes ordena el proceso actual y establece una fuente de verdad. Todavía no automatices excepciones que nadie entiende.")
    story += table([
        ["Semana", "Trabajo", "Entregable mínimo", "Indicador"],
        ["1", "Mapear desde el primer contacto hasta el cobro y la entrega.", "Flujo con etapas, responsables y puntos de pérdida.", "% de contactos con origen y estado."],
        ["2", "Definir cliente ideal, oferta prioritaria, objeciones y criterios de calificación.", "Ficha comercial y preguntas de entrada.", "% de leads que califican."],
        ["3", "Centralizar contactos y oportunidades en una sola base.", "Pipeline con dueño, próxima acción y fecha.", "% con próxima acción definida."],
        ["4", "Instalar tablero base y una reunión corta de revisión.", "Panel de demanda, ventas, seguimiento y entrega.", "Tiempo de respuesta y oportunidades estancadas."],
    ], [20*mm, 64*mm, 58*mm, 30*mm])
    story += [Spacer(1, 5*mm), callout("Salida del mes 1", "Puedes saber cuántos contactos entraron, de dónde vinieron, quién los atiende, en qué etapa están y cuál es la siguiente acción. Si esto no existe, no pases a automatizar."), PageBreak()]

    story += section("Días 31-60: conectar y estandarizar", "El segundo mes reduce tareas repetitivas y variaciones que dañan la experiencia.")
    story += cards([
        ("Captura", "Conecta formularios, WhatsApp, campañas y web con la base central. Guarda origen, campaña, interés y consentimiento."),
        ("Respuesta", "Define mensajes y tiempos por tipo de consulta. Automatiza confirmaciones y avisos, no conversaciones sensibles."),
        ("Seguimiento", "Crea secuencias por etapa: nuevo contacto, propuesta enviada, sin respuesta, reunión y postventa."),
        ("Entrega", "Convierte la venta en tareas, responsables, fechas y comunicación. Evita volver a pedir información ya registrada."),
        ("Control", "Registra errores, excepciones y casos que aún requieren intervención humana."),
        ("Adopción", "Entrena con casos reales. Una herramienta sin responsables, hábitos y revisión se convierte en otra base abandonada."),
    ])
    story += [Spacer(1, 5*mm), callout("Salida del mes 2", "El recorrido principal funciona de extremo a extremo y el equipo sabe qué sucede automáticamente, qué debe hacer una persona y dónde queda registrado cada cambio."), PageBreak()]

    story += section("Días 61-90: medir y mejorar", "El tercer mes usa los datos del sistema para tomar decisiones y ajustar capacidad, mensaje y seguimiento.")
    story += table([
        ["Frente", "Pregunta", "Indicador", "Decisión posible"],
        ["Demanda", "¿Qué canal trae oportunidades útiles?", "Costo y tasa de lead calificado por origen.", "Reasignar inversión y contenido."],
        ["Ventas", "¿Dónde se enfrían las oportunidades?", "Conversión y tiempo por etapa.", "Cambiar oferta, prueba o seguimiento."],
        ["Servicio", "¿Cumplimos a tiempo y con calidad?", "Tiempo de ciclo, retrabajo e incidencias.", "Ajustar capacidad, alcance o proceso."],
        ["Cliente", "¿Qué genera confianza o abandono?", "Respuesta, asistencia, recompra y recomendación.", "Mejorar momentos críticos."],
        ["Rentabilidad", "¿Qué combinación sí conviene crecer?", "Margen por producto, canal o segmento.", "Priorizar y eliminar complejidad."],
    ], [28*mm, 55*mm, 48*mm, 41*mm])
    story += [Spacer(1, 5*mm), callout("Salida del día 90", "Tienes una línea base, un proceso compartido y tres mejoras priorizadas con responsable, fecha e indicador. El sistema ya no solo registra: ayuda a decidir."), PageBreak()]

    story += section("La arquitectura mínima", "Empieza por capacidades. El proveedor puede cambiar; el proceso y los datos deben seguir siendo tuyos.")
    story += table([
        ["Capacidad", "Debe resolver", "Dato mínimo", "Error frecuente"],
        ["Sitio / landing", "Explicar, filtrar y convertir interés.", "Fuente, oferta, contacto y consentimiento.", "Diseñar sin una acción clara."],
        ["CRM", "Ordenar oportunidades y próximas acciones.", "Etapa, responsable, valor y fecha.", "Usarlo como libreta de contactos."],
        ["Automatización", "Mover información y recordar acciones repetibles.", "Evento, condición, resultado y excepción.", "Automatizar antes de estandarizar."],
        ["Operación", "Cumplir lo vendido con trazabilidad.", "Tarea, dueño, fecha, estado y evidencia.", "Separar promesa comercial y capacidad."],
        ["Analítica", "Comparar demanda, venta, entrega y rentabilidad.", "Definiciones, periodo y fuente confiable.", "Mirar métricas sin decisión asociada."],
        ["IA", "Asistir análisis, contenido y tareas con contexto.", "Fuentes, instrucciones, revisión y límites.", "Entregar decisiones críticas sin control."],
    ], [28*mm, 54*mm, 49*mm, 41*mm])
    story += [PageBreak()]

    story += section("Tablero semanal del dueño", "Un tablero útil cabe en una conversación corta y conecta marketing con caja y capacidad.")
    story += cards([
        ("Demanda", "Contactos nuevos, origen, costo y porcentaje que cumple el perfil."),
        ("Velocidad", "Tiempo de primera respuesta, oportunidades sin próxima acción y días por etapa."),
        ("Conversión", "Reuniones, propuestas, cierres y principales motivos de pérdida."),
        ("Entrega", "Trabajo en curso, atrasos, retrabajos, capacidad y promesas en riesgo."),
        ("Cliente", "Incidencias, satisfacción, recompra, abandono y recomendaciones."),
        ("Economía", "Ingresos, margen, costo de adquisición y caja esperada por pipeline."),
    ])
    story += [Spacer(1, 5*mm), callout("La pregunta de la semana", "¿Cuál es el cuello de botella que, si se corrige ahora, mejora el resultado completo? Elige uno. Asigna responsable, fecha e indicador. El resto queda visible, no olvidado."), PageBreak()]

    story += section("Filtro para priorizar inversiones", "Antes de contratar una herramienta o construir una integración, califica la iniciativa.")
    story += table([
        ["Criterio", "Pregunta", "Puntaje"],
        ["Impacto", "¿Reduce pérdida, tiempo, costo o riesgo en un punto importante?", "0 / 1 / 2"],
        ["Frecuencia", "¿El problema sucede cada semana o solo de forma ocasional?", "0 / 1 / 2"],
        ["Claridad", "¿El proceso y sus excepciones están definidos?", "0 / 1 / 2"],
        ["Adopción", "¿Existe responsable y hábito de uso?", "0 / 1 / 2"],
        ["Datos", "¿Los datos necesarios son confiables y están disponibles?", "0 / 1 / 2"],
        ["Reversibilidad", "¿Podemos probar pequeño sin comprometer toda la operación?", "0 / 1 / 2"],
    ], [29*mm, 111*mm, 32*mm])
    story += [Spacer(1, 5*mm), bullets([
        "9 a 12 puntos: prioriza un piloto con alcance, indicador y fecha.",
        "5 a 8 puntos: prepara proceso, datos o adopción antes de invertir.",
        "0 a 4 puntos: no compres todavía; el problema aún no está listo para una solución tecnológica.",
    ]), PageBreak()]

    story += section("Tu plan de una página", "Completa esto con el equipo y revísalo cada semana durante 90 días.")
    plan = [
        ["Resultado a 90 días", "____________________________________________________________"],
        ["Cuello de botella principal", "____________________________________________________________"],
        ["Cliente / proceso afectado", "____________________________________________________________"],
        ["Días 0-30", "Visibilidad: _________________________________________________"],
        ["Días 31-60", "Conexión: __________________________________________________"],
        ["Días 61-90", "Mejora: ___________________________________________________"],
        ["Responsable", "____________________________________________________________"],
        ["Indicador inicial", "____________________________________________________________"],
        ["Meta verificable", "____________________________________________________________"],
        ["Riesgo / excepción", "____________________________________________________________"],
    ]
    story += table([["Campo", "Definición"]] + plan, [48*mm, 124*mm])
    story += [Spacer(1, 6*mm), callout("El resultado correcto", "Al día 90 no necesitas una empresa llena de software. Necesitas un recorrido visible, menos oportunidades perdidas, responsabilidades claras y datos suficientes para decidir qué mejorar después.", bg=colors.HexColor("#FFF7D6"), accent=YELLOW), Spacer(1, 6*mm), P("Fuentes de referencia: OECD Digital Business Diagnostic Tools for SMEs and Entrepreneurship; BID, The 360° on Digital Transformation in Firms in Latin America and the Caribbean. Adaptación práctica y metodología de Distinto.", "DSmall")]

    doc.build(story)


def main():
    PUBLIC.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    files = [
        ("guia-05-decidir-contenido.pdf", build_05),
        ("guia-06-ruta-digital-90-dias.pdf", build_06),
    ]
    for filename, builder in files:
        public_path = PUBLIC / filename
        builder(public_path)
        (OUTPUT / filename).write_bytes(public_path.read_bytes())
        print(public_path)


if __name__ == "__main__":
    main()
