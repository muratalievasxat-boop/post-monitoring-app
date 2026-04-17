import React from 'react';
import type { DashboardSummary } from '../../api/dashboard';

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'green' | 'red' | 'blue' | 'neutral';
}) {
  const accentClass =
    accent === 'green'
      ? 'text-success'
      : accent === 'red'
      ? 'text-danger'
      : accent === 'blue'
      ? 'text-primary'
      : 'text-text';

  return (
    <div className="card p-4 flex flex-col gap-1 transition-transform hover:-translate-y-[2px] hover:shadow-lg">
      <span className="text-[11px] uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span className={`text-2xl font-semibold ${accentClass}`}>{value}</span>
    </div>
  );
}

interface Props {
  data: DashboardSummary['totals'];
}

export const StatusKpis: React.FC<Props> = ({ data }) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <KpiCard label="Всего рекомендаций" value={data.all} accent="blue" />
      <KpiCard label="В работе" value={data.active} accent="blue" />
      <KpiCard label="Исполнено" value={data.done} accent="green" />
      <KpiCard label="Не поддержано" value={data.rejected} accent="red" />
      <KpiCard label="Без статуса" value={data.unknown} accent="neutral" />
    </div>
  );
};
