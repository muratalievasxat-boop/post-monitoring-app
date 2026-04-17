import type { DashboardSummary } from '../api/dashboard'

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'blue' | 'green' | 'red' | 'default'
}) {
  const toneClass =
    tone === 'blue' ? 'kpi-blue' :
    tone === 'green' ? 'kpi-green' :
    tone === 'red' ? 'kpi-red' :
    ''

  return (
    <div className="card kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${toneClass}`}>{value}</div>
    </div>
  )
}

export function StatusKpis({ data }: { data: DashboardSummary['totals'] }) {
  return (
    <div className="kpi-grid">
      <KpiCard label="Всего рекомендаций" value={data.all} tone="blue" />
      <KpiCard label="В работе" value={data.active} tone="blue" />
      <KpiCard label="Исполнено" value={data.done} tone="green" />
      <KpiCard label="Не поддержано" value={data.rejected} tone="red" />
      <KpiCard label="Без статуса" value={data.unknown} tone="default" />
    </div>
  )
}
