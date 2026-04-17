import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export type TabId = 'dashboard' | 'registry';

interface ShellProps {
  current: TabId;
  onChange: (tab: TabId) => void;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ current, onChange, children }) => {
  const title = current === 'dashboard' ? 'Общий дашборд' : 'Реестр рекомендаций';

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar current={current} onChange={onChange} />
      <div className="flex-1 flex flex-col">
        <Topbar title={title} />
        <main className="flex-1 px-4 md:px-6 py-4 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
