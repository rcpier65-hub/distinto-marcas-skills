import { z } from "zod";
import { proposalSchema, type ProposalData } from "../propuestas/model";

export const PERIODOS_ENTREGA = [
  { id: "sin_periodo", label: "Sin frecuencia", texto: "" },
  { id: "semana", label: "Por semana", texto: "por semana" },
  { id: "mes", label: "Por mes", texto: "por mes" },
  { id: "proyecto", label: "Por proyecto", texto: "por proyecto" },
] as const;

export const entregaSchema = z.object({
  id: z.string().uuid(), texto: z.string().max(6000),
  cantidad: z.number().int().min(1).max(10000).nullable(),
  periodo: z.enum(["sin_periodo", "semana", "mes", "proyecto"]),
  incluido: z.boolean(),
});
export const personalizacionSchema = z.object({
  documento: proposalSchema,
  alcances: z.record(z.string().uuid(), z.array(entregaSchema).max(100)),
  revisionBase: z.number().int().positive().nullable(),
});
export type EntregaPersonalizada = z.infer<typeof entregaSchema>;
export type Personalizacion = z.infer<typeof personalizacionSchema>;

export const ENTREGAS_RAPIDAS: { texto: string; periodo: EntregaPersonalizada["periodo"] }[] = [
  { texto: "Historias", periodo: "semana" },
  { texto: "Posts", periodo: "mes" },
  { texto: "Carruseles", periodo: "mes" },
  { texto: "Videos orgánicos", periodo: "mes" },
  { texto: "Videos para publicidad", periodo: "mes" },
  { texto: "Sesiones de grabación", periodo: "mes" },
  { texto: "Campañas publicitarias", periodo: "mes" },
  { texto: "Reunión de seguimiento", periodo: "semana" },
  { texto: "Reunión de planning", periodo: "mes" },
  { texto: "Reunión de reportes", periodo: "mes" },
  { texto: "Reunión de revisión de guiones", periodo: "mes" },
];

export function crearPersonalizacion(documento: ProposalData, revisionBase: number | null, uid: () => string): Personalizacion {
  const copia = proposalSchema.parse(documento);
  return {
    documento: copia, revisionBase,
    alcances: Object.fromEntries(copia.services.map(s => [s.id, s.scope.split("\n").filter(t => t.trim()).map(texto => ({
      id: uid(), texto, cantidad: null, periodo: "sin_periodo" as const, incluido: true,
    }))])),
  };
}

export function textoEntrega(e: EntregaPersonalizada): string {
  const frecuencia = PERIODOS_ENTREGA.find(p => p.id === e.periodo)?.texto ?? "";
  return [e.texto.trim() + (e.cantidad !== null ? `: ${e.cantidad}` : ""), frecuencia].filter(Boolean).join(" ");
}

export function propuestaPersonalizada(p: Personalizacion): ProposalData {
  return {
    ...p.documento,
    services: p.documento.services.map(s => ({
      ...s,
      scope: p.alcances[s.id]
        ? p.alcances[s.id].filter(e => e.incluido && e.texto.trim()).map(textoEntrega).join("\n")
        : s.scope,
    })),
  };
}

export function puedeActualizarPropuesta(actual: number, ultimaGenerada: number | null, basePersonalizada?: number | null): boolean {
  return actual === ultimaGenerada || actual === basePersonalizada;
}
