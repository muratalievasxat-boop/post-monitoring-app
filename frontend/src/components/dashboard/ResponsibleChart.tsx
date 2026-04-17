import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { DashboardSummary } from '../../api/dashboard';

interface Props {
  data: DashboardSummary['byResponsibleOrg'];
}

export const ResponsibleChart: React.FC<Props> = ({ data }) => {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 10);
  const labels = sorted.map((r) => r.responsible_org || 'Не указан');
  const values = sorted.map((r) => r.count);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Рекомендаций',
        data: values,
        backgroundColor: '#437a22',
        borderRadius: 8,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: { display: false as const },
    },
    scales: {
      x: { beginAtZero: true },
      y: { ticks: { font: { size: 11 } } },
    },
  };

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-medium text-text">По ответственным ГО</h2>
        <span className="text-[11px] text-text-muted">Топ 10</span>
      </div>
      <Bar data={chartData} options={options} />
    </div>
  );
};
