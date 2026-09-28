import { z } from "zod";
const text = z.string().max(6000);
export const sourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(160),
  kind: z.enum(["web", "producto", "documento", "nota"]),
  url: z.string().max(2000),
  content: z.string().max(18000),
  verified: z.boolean(),
});
export const profileSchema = z.object({
  positioning: text,
  audience: text,
  tone: text,
  mandatory: text,
  say: text,
  avoid: text,
  brandFormat: text,
  character: text,
  offer: text,
  sources: z.array(sourceSchema).max(30),
});
export type Profile = z.infer<typeof profileSchema>;
export const emptyProfile: Profile = {
  positioning: "",
  audience: "",
  tone: "",
  mandatory: "",
  say: "",
  avoid: "",
  brandFormat: "",
  character: "",
  offer: "",
  sources: [],
};
export const sceneSchema = z.object({
  id: z.string().uuid(),
  seconds: z.number().int().min(1).max(120),
  shot: z.string().max(100),
  visual: text,
  audio: text,
  text: text,
  purpose: z.enum(["Gancho", "Desarrollo", "Prueba", "Payoff", "CTA"]),
});
export const assessmentItemSchema = z.object({
  status: z.enum(["cumple", "mejorar", "sin_contexto"]),
  reason: z.string().min(1).max(700),
  improvement: z.string().max(700),
});
export const assessmentSchema = z.object({
  contextKey: z.string().max(64),
  generationId: z.string().uuid(),
  evaluatedAt: z.string().datetime(),
  summary: z.string().max(1000),
  items: z.array(assessmentItemSchema).length(6),
});
export type Assessment = z.infer<typeof assessmentSchema>;
export const scriptSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(160),
  type: z.enum(["ads", "organico"]),
  awareness: z.number().int().min(1).max(5),
  objective: text,
  idea: text,
  insight: text,
  research: text.default(""),
  researchReviewed: z.boolean().default(false),
  angle: text,
  format: z.string().max(160),
  character: text,
  structure: z.string().max(160),
  hookSpoken: text,
  hookVisual: text,
  hookText: text,
  scenes: z.array(sceneSchema).max(30),
  proof: text,
  payoff: text,
  cta: text,
  requirements: text,
  checks: z.array(z.boolean()).length(6),
  assessment: assessmentSchema.nullable().optional(),
  brandReviewed: z.boolean(),
  status: z.enum(["borrador", "listo"]),
});
export type Script = z.infer<typeof scriptSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export const batchDataSchema = z
  .object({
    objective: text,
    platform: z.string().max(100),
    ads: z.number().int().min(0).max(30),
    organic: z.number().int().min(0).max(30),
    scripts: z.array(scriptSchema).max(30),
  })
  .superRefine((value, ctx) => {
    if (value.ads + value.organic < 1 || value.ads + value.organic > 30)
      ctx.addIssue({
        code: "custom",
        message: "Elige entre 1 y 30 guiones por tanda",
      });
    if (new Set(value.scripts.map((s) => s.id)).size !== value.scripts.length)
      ctx.addIssue({ code: "custom", message: "Hay guiones duplicados" });
    if (value.scripts.length > value.ads + value.organic)
      ctx.addIssue({ code: "custom", message: "La tanda ya está completa" });
    if (
      value.scripts.filter((s) => s.type === "ads").length > value.ads ||
      value.scripts.filter((s) => s.type === "organico").length > value.organic
    )
      ctx.addIssue({
        code: "custom",
        message: "Superaste la cantidad del tipo elegido",
      });
    for (const s of value.scripts)
      if (s.status === "listo" && missingScript(s).length)
        ctx.addIssue({
          code: "custom",
          message: "El guion marcado listo está incompleto",
        });
  });
export type BatchData = z.infer<typeof batchDataSchema>;
export type DeletedScript = {
  script: Script;
  deletedAt: string;
  position: number;
};
export type Batch = {
  id: string;
  marca_id: string;
  name: string;
  recording_id: string | null;
  data: BatchData;
  deleted_scripts?: DeletedScript[];
  revision: number;
  updated_at: string;
};
export type Brand = {
  id: string;
  nombre: string;
  slug: string;
  emoji_marca: string | null;
  tono_voz: unknown;
  drive_url: string | null;
};
export const awareness = [
  [
    "No consciente",
    "Aún no reconoce el problema. Abre con una situación cotidiana.",
  ],
  [
    "Consciente del problema",
    "Reconoce lo que le pasa, pero no conoce las soluciones.",
  ],
  ["Consciente de la solución", "Compara formas de resolver el problema."],
  [
    "Consciente del producto",
    "Ya conoce la marca. Necesita argumentos y pruebas.",
  ],
  [
    "Muy consciente",
    "Está cerca de decidir. Aclara la oferta y el siguiente paso.",
  ],
];
export const formats = [
  "Habla a cámara",
  "UGC / testimonial",
  "Voice Over + B-roll",
  "Problema → solución",
  "Antes / después",
  "Comparativo",
  "Ranking / Top",
  "Lista rápida",
  "Pregunta / respuesta",
  "Mito / realidad",
  "POV",
  "Sketch / humor",
  "Meme / trend",
  "Demo de producto",
  "Unboxing",
  "Reacción",
  "Challenge",
  "Blind test",
  "Entrevista en calle",
  "Split screen",
  "ASMR / sensorial",
  "Cinemático",
  "Product Hero",
  "Stop Motion",
  "Transiciones",
  "Green screen",
  "Screen recording + talento",
  "Oferta directa",
  "Review / comentario real",
  "Storytime",
];
export const structures = [
  "Libre",
  "VIRAL: verbal → imán → respaldo → valor → CTA",
  "PAS: problema → agitación → solución",
  "Problema → solución",
  "Antes → proceso → después",
  "Resultado → cómo → explicación",
  "Afirmación → demostración → resultado",
  "Pregunta → experimento → respuesta",
  "Error → consecuencia → corrección",
  "Mito → realidad",
  "Objeción → respuesta → prueba",
  "Bucle abierto → revelación",
];
export const shots = [
  "Primer plano",
  "Plano medio",
  "Plano general",
  "Plano detalle",
  "Plano sobre el hombro",
  "Plano subjetivo / POV",
  "Cenital",
  "Contrapicado",
  "Picado",
  "Pantalla / captura",
  "B-roll",
];
export const checks = [
  "Es un concepto contracorriente",
  "Lo entienden alguien de 5 y de 50",
  "Tiene un enfoque único",
  "Abre un debate / es polémico",
  "Usa el formato de la marca",
  "Usa un personaje de marca",
];
export const stages = [
  "Enfoque",
  "Idea",
  "Insight y ángulo",
  "Formato",
  "Gancho",
  "Escenas y planos",
  "Prueba y payoff",
  "CTA y producción",
  "Revisión",
];
export function newScript(type: Script["type"] = "organico"): Script {
  return {
    id: crypto.randomUUID(),
    title: "",
    type,
    awareness: 2,
    objective: "",
    idea: "",
    insight: "",
    research: "",
    researchReviewed: false,
    angle: "",
    format: "",
    character: "",
    structure: "Libre",
    hookSpoken: "",
    hookVisual: "",
    hookText: "",
    scenes: [],
    proof: "",
    payoff: "",
    cta: "",
    requirements: "",
    checks: [false, false, false, false, false, false],
    brandReviewed: false,
    status: "borrador",
  };
}
export function newScene(purpose: Scene["purpose"] = "Desarrollo"): Scene {
  return {
    id: crypto.randomUUID(),
    seconds: 5,
    shot: "Plano medio",
    visual: "",
    audio: "",
    text: "",
    purpose,
  };
}
export function missingScript(s: Script): string[] {
  return [
    ["Título", s.title],
    ["Objetivo", s.objective],
    ["Idea", s.idea],
    ["Insight", s.insight],
    ["Ángulo", s.angle],
    ["Formato", s.format],
    ["Gancho hablado", s.hookSpoken],
    ["Gancho visual", s.hookVisual],
    ["Prueba o respaldo", s.proof],
    ["Payoff", s.payoff],
    ["CTA", s.cta],
    ["Requerimientos", s.requirements],
    [
      "Escenas completas",
      s.scenes.length &&
      s.scenes.every((x) => x.visual.trim() && x.audio.trim())
        ? "sí"
        : "",
    ],
    ["Revisión de marca", s.brandReviewed ? "sí" : ""],
  ]
    .filter(([, v]) => !String(v).trim())
    .map(([k]) => String(k));
}
export function scriptText(s: Script): string {
  return `${s.title || "Sin título"}\n${s.type === "ads" ? "ADS" : "ORGÁNICO"} · Conciencia ${s.awareness}: ${awareness[s.awareness - 1][0]}\nObjetivo: ${s.objective}\nIdea: ${s.idea}\nInsight: ${s.insight}\nInvestigación (${s.researchReviewed ? "revisada por el equipo" : "por validar"}): ${s.research || "Pendiente"}\nÁngulo: ${s.angle}\nFormato: ${s.format}\nPersonaje: ${s.character}\nEstructura: ${s.structure}\n\nGANCHO\nVoz: ${s.hookSpoken}\nVisual: ${s.hookVisual}\nTexto: ${s.hookText}\n\nESCENAS\n${s.scenes.map((x, i) => `${i + 1}. ${x.purpose} · ${x.seconds}s · ${x.shot}\nVisual: ${x.visual}\nAudio: ${x.audio}\nTexto: ${x.text}`).join("\n\n")}\n\nPrueba: ${s.proof}\nPayoff: ${s.payoff}\nCTA: ${s.cta}\n\nREQUERIMIENTOS\n${s.requirements}`;
}
