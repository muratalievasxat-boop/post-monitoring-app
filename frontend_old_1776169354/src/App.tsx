import React, { useState } from 'react';
import { Shell, TabId } from './components/layout/Shell';
import { DashboardPage } from './components/dashboard/DashboardPage';

export const App: React.FC = () => {
  const [tab, setTab] = useState<TabId>('dashboard');

  return (
    <Shell current={tab} onChange={setTab}>
      {tab === 'dashboard' ? (
        <DashboardPage />
      ) : (
        <div className="card p-4 text-sm text-text-muted">
          Экран реестра в разработке.
        </div>
      )}
    </Shell>
  );
};
