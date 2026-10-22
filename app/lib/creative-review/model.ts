export type DeliveryVersion = {
  id: string;
  publicacion_id: string;
  title: string;
  slot: string;
  category: "diseno" | "video";
  label: string;
  version: number;
  url: string;
  created_at: string;
  author: string | null;
  baseline: boolean;
  counts_change: boolean;
  exclusion_reason: string | null;
};
export type ReviewNote = {
  id: string;
  version_id: string;
  round_id: string | null;
  created_at: string;
  author: string | null;
  text: string;
  requested_by: string;
  page: number;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  seconds: number | null;
  attachments: string[];
  state: "pendiente" | "en_proceso" | "aplicado" | "validado";
  applied_version_id: string | null;
};
export type ReviewData = {
  publication: {
    id: string;
    nombre: string;
    marca_id: string;
    slug: string;
    brand: string;
    es_tarea_diseno: boolean;
  };
  versions: DeliveryVersion[];
  notes: ReviewNote[];
  rounds: {
    id: string;
    version_id: string;
    created_at: string;
    closed_at: string | null;
  }[];
  items: { id: string; nombre: string }[];
  sketchHref: string | null;
  manager: boolean;
};
export const slotLabels: Record<string, string> = {
  diseno: "Diseño",
  portada: "Portada",
  video_con_musica: "Video con música",
  video_sin_musica: "Video sin música",
};
export const stateLabels = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  aplicado: "Aplicado",
  validado: "Validado",
};
export function reviewCounts(versions: DeliveryVersion[]) {
  const delivered = new Set(
    versions.map((v) => v.publicacion_id + ":" + v.category),
  );
  const returned = new Set(
    versions
      .filter((v) => v.counts_change && !v.exclusion_reason)
      .map((v) => v.publicacion_id + ":" + v.category),
  );
  return {
    delivered: delivered.size,
    returned: returned.size,
    updates: versions.filter((v) => v.counts_change && !v.exclusion_reason)
      .length,
    rate: delivered.size
      ? Math.round((returned.size / delivered.size) * 100)
      : null,
  };
}
