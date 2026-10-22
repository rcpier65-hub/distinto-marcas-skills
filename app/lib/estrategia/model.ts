import { z } from "zod";

export const text = z.string().max(12000);
export const date = z.union([z.iso.date(), z.literal("")]).default("");
export const uid = z.string().uuid();
export const recordKinds = [
  "sheet",
  "campaign",
  "opportunity",
  "settings",
  "approval",
] as const;
export type RecordKind = (typeof recordKinds)[number];
export type RecordData = Record<string, unknown>;
export type StrategyRecord = {
  boceto_publicacion_id?: string | null;
  id: string;
  marca_id: string;
  kind: RecordKind;
  title: string;
  data: RecordData;
  revision: number;
  archived: boolean;
  created_by: string;
  updated_at: string;
};
export type Member = { id: string; nombre: string };
export type Activity = {
  id: string;
  sourceId: string;
  source: "publication" | "task" | "recording" | "meeting" | "date" | "calendar";
  kind:
    | "Publicación"
    | "Tarea"
    | "Diseño"
    | "Edición"
    | "Grabación"
    | "Reunión"
    | "Fecha importante";
  title: string;
  date: string | null;
  createdDate?: string | null;
  time?: string;
  state: string;
  done: boolean;
  owner: string;
  href: string;
  campaignId?: string;
  delivery?: boolean;
};
export type Brand = {
  id: string;
  slug: string;
  nombre: string;
  logo_url?: string;
  drive_url?: string;
  grabaciones_objetivo_mensual?: number;
  emoji_marca?: string;
};
export const sheetStates = [
  "Borrador",
  "En reunión",
  "Pendiente de revisar",
  "Lista para organizar",
  "En ejecución",
  "Cerrada",
] as const;
export const campaignStates = [
  "Propuesta",
  "En preparación",
  "Lista",
  "Activa",
  "Pausada",
  "Cerrada",
] as const;
export const campaignTypes = [
  "Lanzamiento",
  "Impulso de producto",
  "Promoción o temporada",
  "Comunidad",
  "Contenido recurrente",
] as const;
export const recordInput = z.object({
  id: uid,
  kind: z.enum(recordKinds),
  title: z.string().trim().min(1).max(180),
  revision: z.number().int().nonnegative(),
  archived: z.boolean().default(false),
  data: z.record(z.string(), z.unknown()),
});
export const actionInput = z.object({
  id: uid,
  text: z.string().trim().min(1).max(2500),
  deliverable: text.default(""),
  memberId: uid.nullable().default(null),
  date,
  priority: z.enum(["Normal", "Alta", "Baja"]).default("Normal"),
  dependencies: z.array(uid).max(30).default([]),
  references: text.default(""),
  quote: z.string().max(1500).default(""),
  source: z.string().max(150).default("Acuerdo manual"),
  state: z.enum(["proposed", "approved", "discarded"]).default("proposed"),
  clientVisible: z.boolean().default(false),
});
export type ActionData = z.infer<typeof actionInput>;
export type StrategyAction = {
  id: string;
  sheet_id: string;
  session_id: string | null;
  data: ActionData;
  task_id: string | null;
  created_at: string;
};
export type Session = {
  id: string;
  sheet_id: string;
  owner_id: string;
  state: string;
  started_at: string;
  ended_at: string | null;
  data: {
    notes?: string;
    transcript?: string;
    summary?: string;
    decisions?: string[];
    questions?: string[];
    gaps?: string[];
    duration?: number;
    consent?: boolean;
  };
};
export type Segment = {
  id: string;
  session_id: string;
  start_seconds: number;
  duration: number;
  transcript: string;
  state: string;
  media_path: string;
  mime: string;
};
export type SceneElement = {
  id: string;
  version: number;
  versionNonce: number;
  isDeleted?: boolean;
  [key: string]: unknown;
};

const optionalId = z.union([uid, z.literal("")]).optional();
const count = z
  .union([z.number().finite().nonnegative().max(1e12), z.literal("")])
  .optional();
export const recordDataSchema = z.object({
  state: z.string().max(50).optional(),
  ownerId: optionalId,
  campaignId: optionalId,
  opportunityId: optionalId,
  objective: text.optional(),
  start: date.optional(),
  end: date.optional(),
  meetingDate: date.optional(),
  participants: z.array(uid).max(100).optional(),
  sharedWithClient: z.boolean().optional(),
  template: z.enum(["En blanco", "Reunión de estrategia", ""]).optional(),
  workType: z.enum(["Campaña", "Recurrente"]).optional(),
  type: z.enum(campaignTypes).optional(),
  offer: text.optional(),
  audience: text.optional(),
  concept: text.optional(),
  metric: text.optional(),
  target: text.optional(),
  priority: z.boolean().optional(),
  paid: z.boolean().optional(),
  adBudget: count,
  currency: z.enum(["PEN", "USD", ""]).optional(),
  budgetApproved: z.boolean().optional(),
  budgetEvidence: text.optional(),
  businessType: z.enum(["servicios", "ecommerce", ""]).optional(),
  messages: count,
  appointments: count,
  attended: count,
  conversions: count,
  metricSource: text.optional(),
  metricURL: z.string().max(2000).optional(),
  metricStart: date.optional(),
  metricEnd: date.optional(),
  description: text.optional(),
  evidence: text.optional(),
  url: z.string().max(2000).optional(),
  sourceDate: date.optional(),
  hypothesis: text.optional(),
  waitingFor: z.enum(["Cliente", "Equipo", "Dirección", ""]).optional(),
  date: date.optional(),
  critical: z.boolean().optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  scopeSource: text.optional(),
  confirmed: z.boolean().optional(),
  sessions: count,
  videos: count,
  designs: count,
  adaptations: count,
});

/** Elements are merged independently, including tombstones: concurrent edits to
 * different notes survive. Equal-version conflicts use Excalidraw's nonce rule. */
export function mergeScene(
  saved: SceneElement[],
  incoming: SceneElement[],
): SceneElement[] {
  const map = new Map(saved.map((e) => [e.id, e]));
  for (const next of incoming) {
    const prev = map.get(next.id);
    if (
      !prev ||
      next.version > prev.version ||
      (next.version === prev.version && next.versionNonce < prev.versionNonce)
    )
      map.set(next.id, next);
  }
  return [...map.values()].sort(
    (a, b) =>
      String(a.index ?? "").localeCompare(String(b.index ?? "")) ||
      a.id.localeCompare(b.id),
  );
}
export function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
export function actionFingerprint(text: string) {
  return norm(text).replace(/[^a-z0-9 ]/g, "");
}
export function todayLima() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function str(data: RecordData, key: string) {
  return typeof data[key] === "string" ? (data[key] as string) : "";
}
export function safeURL(input: unknown) {
  try {
    const u = new URL(String(input));
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}
export function byCampaign(
  activities: Activity[],
  links: {
    campaign_id: string | null;
    target_type: string;
    target_id: string;
  }[],
  campaignId: string,
) {
  if (!campaignId) return activities;
  const ids = new Set(
    links
      .filter((l) => l.campaign_id === campaignId)
      .map((l) => `${l.target_type}:${l.target_id}`),
  );
  return activities.filter((a) => ids.has(`${a.source}:${a.sourceId}`));
}
