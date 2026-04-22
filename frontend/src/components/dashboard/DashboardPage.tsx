import React, { useEffect, useState } from 'react';
import { fetchDashboardSummary } from '../../api/dashboard';
import type { DashboardSummary } from '../../api/dashboard';
import { StatusKpis } from './StatusKpis';
import { SphereChart } from './SphereChart';
import { CycleChart } from './CycleChart';
import { ResponsibleChart } from './ResponsibleChart';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardSummary()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || 'Ошибка загрузки');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-sm text-text-muted">Загрузка дашборда...</div>;
  }

  if (error || !data) {
    return (
      <div className="card p-4 text-sm text-danger">
        Ошибка загрузки дашборда: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatusKpis data={data.totals} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SphereChart data={data.bySphere} />
        </div>
        <CycleChart data={data.byCycle} />
      </div>
      <ResponsibleChart data={data.byResponsibleOrg} />
    </div>
  );
};
