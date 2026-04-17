import { get } from './client'

export interface DashboardSummary {
  totals: {
    all: number
    active: number
    done: number
    rejected: number
    excluded: number
    unknown: number
    overdue: number
  }
  bySphere: { sphere: string; count: number }[]
  byResponsibleOrg: { responsible_org: string; count: number }[]
  byCycle: { cycle: string; count: number }[]
}

export function fetchDashboardSummary() {
  return get<DashboardSummary>('/api/dashboard/summary')
}
