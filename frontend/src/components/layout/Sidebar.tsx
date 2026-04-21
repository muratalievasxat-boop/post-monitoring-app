import React from 'react';
import { LayoutDashboard, Table2, RefreshCw, Settings } from 'lucide-react';

type TabId = 'dashboard' | 'registry' | 'update' | 'export';

interface SidebarProps {
  current: TabId;
  onChange: (tab: TabId) => void;
}

const items = [
  { id: 'dashboard' as TabId, label: 'Дашборд',          icon: LayoutDashboard },
  { id: 'registry'  as TabId, label: 'Реестр',            icon: Table2 },
  { id: 'update'    as TabId, label: 'Обновление',        icon: RefreshCw },
  { id: 'export'    as TabId, label: 'Администрирование', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ current, onChange }) => (
  <aside className="sidebar">
    <div className="sidebar-brand">
      <div className="sidebar-brand-icon">М</div>
      <div>
        <div className="sidebar-brand-title">Мониторинг</div>
        <div className="sidebar-brand-sub">Дебюрократизация</div>
      </div>
    </div>

    <nav className="sidebar-nav">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`sidebar-item${current === id ? ' active' : ''}`}
          onClick={() => onChange(id)}
        >
          <Icon size={16} strokeWidth={1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  </aside>
);
