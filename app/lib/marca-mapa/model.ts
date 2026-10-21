/* Mapa de marca (Pedro 21-oct-2026): "que cualquiera que entra entienda la
   marca rápido". Centro = la marca; ramas = posicionamiento, propuesta de valor
   y las 7 maletas de la persuasión de Sean D'Souza (The Brain Audit): el
   cliente no compra mientras una de estas dudas siga "dando vueltas". */
import { z } from "zod";

export const MALETAS = [
  { id: "problema", titulo: "Problema", pregunta: "¿Qué le duele o le falta al cliente?" },
  { id: "solucion", titulo: "Solución", pregunta: "¿Cómo lo resuelve la marca?" },
  { id: "cliente", titulo: "Cliente ideal", pregunta: "¿A quién le hablamos exactamente?" },
  { id: "objeciones", titulo: "Objeciones", pregunta: "¿Qué dudas lo frenan y cómo se responden?" },
  { id: "testimonios", titulo: "Testimonios", pregunta: "¿Qué prueba real tenemos de otros clientes?" },
  { id: "garantia", titulo: "Garantía", pregunta: "¿Qué le quita el riesgo de comprar?" },
  { id: "unica", titulo: "Lo que la hace única", pregunta: "¿Por qué elegirla y no a la competencia?" },
] as const;
export type MaletaId = (typeof MALETAS)[number]["id"];

export const RAMAS = [
  { id: "posicionamiento", titulo: "Posicionamiento", pregunta: "¿Qué lugar queremos ocupar en la mente del cliente?" },
  { id: "propuesta", titulo: "Propuesta de valor", pregunta: "¿Qué gana el cliente y por qué le conviene?" },
] as const;
export type RamaId = (typeof RAMAS)[number]["id"];

const texto = (max: number) => z.string().trim().max(max, "Texto demasiado largo");
/* Zod 4: .prefault() pasa el valor por defecto por el esquema, así los campos
   internos también reciben sus valores por defecto. */
export const nodoSchema = z.object({
  resumen: texto(700).default(""),
  puntos: z.array(texto(400)).max(12, "Máximo 12 puntos").default([]),
  /* true = contenido propuesto por la agencia que aún falta validar con el cliente. */
  propuesta: z.boolean().default(false),
});
export type Nodo = z.infer<typeof nodoSchema>;
const nodo = () => nodoSchema.prefault({});

const ramas = () => z.object({ posicionamiento: nodo(), propuesta: nodo() }).prefault({});
const maletas = () => z.object({
  problema: nodo(), solucion: nodo(), cliente: nodo(), objeciones: nodo(),
  testimonios: nodo(), garantia: nodo(), unica: nodo(),
}).prefault({});

/* Ficha de cada marca (Pedro 21-oct: documento de arquitectura de TypHouse):
   qué rol cumple, su territorio, la pregunta que responde, palabras clave y
   mensaje maestro. Sirve para que las marcas de una misma casa no se pisen. */
const perfil = {
  concepto: texto(200).default(""),
  rol: texto(500).default(""),
  territorio: texto(300).default(""),
  pregunta: texto(300).default(""),
  rolEmocional: texto(200).default(""),
  palabras: z.array(texto(40)).max(14).default([]),
  mensaje: texto(200).default(""),
  ejemplos: z.array(texto(200)).max(6).default([]),
  evitar: texto(200).default(""),
};

/* Bloques desglosables: texto, lista o tabla (diagnóstico, rutas, guardrails…). */
export const bloqueSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  titulo: texto(120),
  icono: z.enum(["idea", "diagnostico", "ruta", "tabla", "mensajes", "alerta", "fuentes", "lineas"]).default("idea"),
  texto: texto(1500).default(""),
  items: z.array(texto(700)).max(20).default([]),
  tabla: z.object({ columnas: z.array(texto(80)).min(1).max(6), filas: z.array(z.array(texto(500)).max(6)).max(14) }).nullable().default(null),
});
export type Bloque = z.infer<typeof bloqueSchema>;

export const submarcaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  nombre: texto(80),
  ...perfil,
  ramas: ramas(),
  maletas: maletas(),
  bloques: z.array(bloqueSchema).max(6).default([]),
});
export type Submarca = z.infer<typeof submarcaSchema>;

export const mapaSchema = z.object({
  frase: texto(200).default(""),
  estado: z.enum(["borrador", "validado"]).default("borrador"),
  /* Idea que resume todo el documento (banda superior). */
  ideaCentral: texto(900).default(""),
  ...perfil,
  ramas: ramas(),
  maletas: maletas(),
  /* Marcas de producto debajo de la marca principal (arquitectura de marca). */
  submarcas: z.array(submarcaSchema).max(6).default([]),
  bloques: z.array(bloqueSchema).max(12).default([]),
});
export type MapaMarca = z.infer<typeof mapaSchema>;

export const mapaVacio = (): MapaMarca => mapaSchema.parse({});
/* Lee lo guardado sin romper si falta algo o hay datos viejos. */
export function leerMapa(data: unknown): MapaMarca {
  const r = mapaSchema.safeParse(data ?? {});
  return r.success ? r.data : mapaVacio();
}
export const nodoVacio = (n: Nodo) => !n.resumen.trim() && !n.puntos.some((p) => p.trim());
