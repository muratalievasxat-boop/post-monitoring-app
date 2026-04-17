import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { DashboardSummary } from '../../api/dashboard';

interface Props {
  data: DashboardSummary['byCycle'];
}

export const CycleChart: React.FC<Props> = ({ data }) => {
  const order = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const sorted = [...data].sort(
    (a, b) => order.indexOf(a.cycle) - order.indexOf(b.cycle)
  );
  const labels = sorted.map((c) => c.cycle);
  const values = sorted.map((c) => c.count);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Рекомендаций',
        data: values,
        backgroundColor: '#d19900',
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false as const },
    },
    scales: {
      x: { ticks: { font: { size: 11 } } },
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-medium text-text">По циклам</h2>
      </div>
      <div className="flex-1">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};
