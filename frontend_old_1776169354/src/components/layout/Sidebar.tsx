import React from 'react';

interface SidebarProps {
  current: 'dashboard' | 'registry';
  onChange: (tab: 'dashboard' | 'registry') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ current, onChange }) => {
  const items: { id: 'dashboard' | 'registry'; label: string }[] = [
    { id: 'dashboard', label: 'Дашборд' },
    { id: 'registry', label: 'Реестр' },
  ];

  return (
    <aside className="hidden md:flex md:flex-col w-56 border-r border-border-subtle bg-bg-subtle">
      <div className="px-4 py-4 border-b border-border-subtle">
        <div className="text-xs uppercase tracking-wide text-text-muted mb-1">
          Мониторинг
        </div>
        <div className="text-base font-semibold text-text">
          Рекомендации
        </div>
      </div>
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {items.map((item) => {
            const active = current === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onChange(item.id)}
                  className={
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ' +
                    (active
                      ? 'bg-primary-soft text-primary font-medium'
                      : 'text-text-muted hover:bg-bg-raised hover:text-text')
                  }
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
