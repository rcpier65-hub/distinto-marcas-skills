export type Settings = {
  enabled: boolean; duration_min: number; notice_hours: number; horizon_days: number;
  start_hour: number; end_hour: number; weekdays: number[]; calendar_id: string;
}
export type Busy = { start: string; end: string }
export const TZ = 'America/Lima'
export function limaDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
}
export function validDate(s: string) {
  const parsed = new Date(s + 'T12:00:00Z')
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === s
}
export function generateSlots(date: string, config: Settings, busy: Busy[], now = Date.now()) {
  if (!validDate(date) || !config.enabled) return []
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay()
  if (!config.weekdays.includes(weekday)) return []
  const slots: string[] = []
  for (let minute = config.start_hour * 60; minute + config.duration_min <= config.end_hour * 60; minute += 30) {
    const start = Date.parse(`${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00-05:00`)
    const end = start + config.duration_min * 60000
    if (start < now + config.notice_hours * 3600000 || start > now + config.horizon_days * 86400000) continue
    if (busy.some(b => start < Date.parse(b.end) && end > Date.parse(b.start))) continue
    slots.push(new Date(start).toISOString())
  }
  return slots
}
