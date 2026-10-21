export type Range = { start: string; end: string; days: number };
export type ReportPeriod = {
  month: string;
  current: Range;
  previous: Range;
  partial: boolean;
};
export type MetricKey =
  | "views"
  | "reach"
  | "interactions"
  | "likes"
  | "reactions"
  | "comments"
  | "shares"
  | "saves"
  | "profileVisits"
  | "follows"
  | "unfollows";
export type Values = Record<MetricKey, number | null>;
export type Channel = {
  network: "facebook" | "instagram";
  name: string;
  followers: number | null;
  current: Values;
  previous: Values;
  organic: number | null;
  paid: number | null;
  notes: string[];
};
export type AdPeriod = {
  spend: number | null;
  conversations: number | null;
  costPerConversation: number | null;
};
export type SocialReport = {
  period: ReportPeriod;
  checkedAt: string;
  channels: Channel[];
  ads: {
    name: string;
    currency: string;
    timezone: string;
    current: AdPeriod;
    previous: AdPeriod;
    note: string | null;
    /* Marcas con una cuenta por sede (Oral Beauty: Lima USD + Rioja PEN). Se
       suman en soles con el tipo de cambio SUNAT del mes. */
    cuentas?: { nombre: string; moneda: string; gasto: number | null; gastoPen: number | null; conversaciones: number | null }[];
  } | null;
  warnings: string[];
};
export type Post = {
  id: string;
  network: "facebook" | "instagram";
  caption: string;
  publishedAt: string;
  url: string | null;
  image: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  /* Tipo de pieza (Pedro 21-oct: «ver el video más viral»). Ausente en
     versiones guardadas antes de este cambio. */
  mediaType?: "video" | "imagen" | "carrusel" | null;
  shares?: number | null;
};
export type PostReport = {
  groups: { network: "facebook" | "instagram"; posts: Post[]; note: string }[];
  checkedAt: string;
};
export const blankValues = (): Values => ({
  views: null,
  reach: null,
  interactions: null,
  likes: null,
  reactions: null,
  comments: null,
  shares: null,
  saves: null,
  profileVisits: null,
  follows: null,
  unfollows: null,
});
export function number(v: unknown): number | null {
  const parsed =
    typeof v === "number"
      ? v
      : typeof v === "string" && /^\d+(\.\d+)?$/.test(v)
        ? Number(v)
        : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
export function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function monthOffset(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}
const range = (start: string, end: string): Range => ({
  start,
  end,
  days: Math.max(
    0,
    Math.round((Date.parse(end) - Date.parse(start)) / 86400000),
  ),
});
// End is exclusive. A current month uses completed days and compares equal days.
export function reportPeriod(month: string, today: string): ReportPeriod {
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
    month > today.slice(0, 7) ||
    month < monthOffset(today.slice(0, 7), -23)
  )
    throw Error("Elige un mes de los últimos dos años.");
  const start = month + "-01",
    next = monthOffset(month, 1) + "-01",
    end = next < today ? next : today;
  const current = range(start, end),
    previousStart = monthOffset(month, -1) + "-01",
    partial = end < next;
  const previous = range(
    previousStart,
    partial ? [addDays(previousStart, current.days), start].sort()[0] : start,
  );
  return { month, current, previous, partial };
}
export function chunks30(r: Range): Range[] {
  const all: Range[] = [];
  for (let start = r.start; start < r.end; ) {
    const end = [addDays(start, 30), r.end].sort()[0];
    all.push(range(start, end));
    start = end;
  }
  return all;
}
export function delta(
  current: number | null,
  previous: number | null,
): number | null {
  return current !== null && previous !== null && previous > 0
    ? ((current - previous) / previous) * 100
    : null;
}
export type Insight = {
  name?: string;
  period?: string;
  total_value?: {
    value?: unknown;
    breakdowns?: {
      dimension_keys?: string[];
      results?: { dimension_values?: string[]; value?: unknown }[];
    }[];
  };
  values?: { value?: unknown; end_time?: string; is_from_ads?: string }[];
};
export function insightRows(payload: unknown): Insight[] {
  return payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray(payload.data)
    ? payload.data
    : [];
}
export const total = (rows: Insight[], name: string) =>
  number(rows.find((x) => x.name === name)?.total_value?.value);
export const exactSum = (values: (number | null)[]) =>
  values.length && values.every((v) => v !== null)
    ? values.reduce<number>((s, v) => s + v!, 0)
    : null;
export function combineInstagram(parts: Values[]): Values {
  const result = blankValues();
  for (const key of Object.keys(result) as MetricKey[])
    result[key] =
      key === "reach" && parts.length > 1
        ? null
        : exactSum(parts.map((part) => part[key]));
  return result;
}
export function daily(
  rows: Insight[],
  name: string,
  days: number,
  part?: string,
) {
  const values = rows.find((x) => x.name === name)?.values;
  if (
    !values ||
    values.length !== days ||
    values.some(
      (x) => !x.end_time || !Number.isFinite(Date.parse(x.end_time)),
    ) ||
    new Set(values.map((x) => x.end_time)).size !== days
  )
    return null;
  return exactSum(
    values.map((x) => {
      if (!part) return number(x.value);
      if (!x.value || typeof x.value !== "object" || Array.isArray(x.value))
        return null;
      const record = x.value as Record<string, unknown>;
      return part === "all"
        ? Object.values(record).reduce<number | null>(
            (sum, v) =>
              sum === null || number(v) === null ? null : sum + number(v)!,
            0,
          )
        : number(record[part] ?? 0);
    }),
  );
}
// Reach is non-additive. Only accept the provider's total_over_range result.
export function uniqueReach(rows: Insight[], name: string) {
  const r = rows.find(
    (x) => x.name === name && x.period === "total_over_range",
  );
  return r?.values?.length === 1 ? number(r.values[0].value) : null;
}
export function splitViews(rows: Insight[], days: number) {
  const values = rows.find((x) => x.name === "page_media_view")?.values || [];
  return { organic: sum("0"), paid: sum("1") };
  function sum(part: string) {
    const entries = values.filter((x) => x.is_from_ads === part);
    return entries.length === days &&
      new Set(entries.map((x) => x.end_time)).size === days
      ? exactSum(entries.map((x) => number(x.value)))
      : null;
  }
}
export function growth(rows: Insight[], type: string) {
  const v = rows
    .find((x) => x.name === "follows_and_unfollows")
    ?.total_value?.breakdowns?.find((x) =>
      x.dimension_keys?.includes("follow_type"),
    )
    ?.results?.find((x) => x.dimension_values?.includes(type));
  return number(v?.value);
}
export function publicURL(
  raw: unknown,
  kind: "image" | "facebook" | "instagram",
): string | null {
  if (typeof raw !== "string") return null;
  try {
    const u = new URL(raw);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.searchParams.has("access_token")
    )
      return null;
    const hosts =
      kind === "image"
        ? ["fbcdn.net", "cdninstagram.com"]
        : kind === "facebook"
          ? ["facebook.com", "fb.watch"]
          : ["instagram.com"];
    return hosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h))
      ? u.href
      : null;
  } catch {
    return null;
  }
}

/* Tendencia mensual (gráficas de crecimiento al hacer clic en un indicador).
   Cada punto es un mes completo; el mes en curso usa solo días completos.
   null = dato no disponible (nunca se rellena con cero). Pedro 18-oct-2026. */
export type TrendPoint = {
  month: string;
  days: number;
  partial: boolean;
  views: { facebook: number | null; instagram: number | null };
  interactions: { facebook: number | null; instagram: number | null };
  netFollows: { facebook: number | null; instagram: number | null };
  spend: number | null;
  conversations: number | null;
};
export type SocialTrend = {
  months: TrendPoint[];
  currency: string | null;
  networks: ("facebook" | "instagram")[];
  checkedAt: string;
};
export const net = (v: Values) =>
  v.follows !== null && v.unfollows !== null ? v.follows - v.unfollows : null;
