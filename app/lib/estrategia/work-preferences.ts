import { DEFAULT_WORK_PERIOD, type WorkPeriod } from './activity-status'

export function workPeriodCookie(memberId: string, brandId: string) {
  return `distinto_work_v1_${memberId}_${brandId}`
}

export function readWorkPeriod(value: string | undefined | null): WorkPeriod {
  return value === 'mes' || value === 'semana' || value === 'sinfecha' || value === 'todos'
    ? value : DEFAULT_WORK_PERIOD
}
