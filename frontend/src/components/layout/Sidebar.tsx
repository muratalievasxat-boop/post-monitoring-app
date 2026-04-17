import React from 'react';

interface SidebarProps {
  current: 'dashboard' | 'registry' | 'update' | 'export';
  onChange: (tab: 'dashboard' | 'registry' | 'update' | 'export') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ current, onChange }) => {
  const items = [
    { id: 'dashboard', label: 'Дашборд' },
    { id: 'registry', label: 'Реестр' },
    { id: 'update', label: 'Обновление' },
    { id: 'export', label: 'Администрирование' },
  ] as const;

  return (
    <aside className="sidebar">
      <div className="brand-kicker">Мониторинг</div>
      <div className="brand-title">Рекомендации</div>

      <div className="nav">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={current === item.id ? 'active' : ''}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  );
};
