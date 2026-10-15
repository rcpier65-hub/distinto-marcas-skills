export type SocialNetwork = 'instagram' | 'facebook' | 'tiktok'
export type SocialMetric = {
  network: SocialNetwork; label: string; followers: number | null;
  reach: number | null; interactions: number | null;
  asOf: string | null; available: boolean; note: string;
}
export type SocialSummary = {
  provider: 'meta'; status: 'ready' | 'partial' | 'reconnect' | 'unconfigured' | 'unavailable';
  message: string; checkedAt: string; start: string; end: string; networks: SocialMetric[];
}
export const socialNetworks = [
  {network:'instagram',label:'Instagram'}, {network:'facebook',label:'Facebook'}, {network:'tiktok',label:'TikTok'},
] as const
export function metricNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}
export function insightTotal(payload: unknown, metric: string): number | null {
  if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) return null
  const row=payload.data.find(r=>r?.name===metric)
  // Never sum daily reach: the same person can appear on multiple days.
  return metricNumber(row?.total_value?.value)
}
