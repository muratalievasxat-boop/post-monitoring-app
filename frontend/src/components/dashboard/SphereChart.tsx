import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { DashboardSummary } from '../../api/dashboard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  data: DashboardSummary['bySphere'];
}

export const SphereChart: React.FC<Props> = ({ data }) => {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 10);
  const labels = sorted.map((s) => s.sphere);
  const values = sorted.map((s) => s.count);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Количество рекомендаций',
        data: values,
        backgroundColor: '#01696f',
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false as const },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      x: {
        ticks: { font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 20 },
      },
    },
  };

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-medium text-text">По сферам</h2>
        <span className="text-[11px] text-text-muted">Топ 10</span>
      </div>
      <div className="flex-1">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};
