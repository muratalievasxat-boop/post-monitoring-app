import React from 'react';
import { LayoutDashboard, Table2, RefreshCw, Settings, Briefcase, LogOut, Users, BarChart2, CalendarRange } from 'lucide-react';
import type { AuthUser } from '@/pages/LoginPage';

export type TabId = 'dashboard' | 'registry' | 'update' | 'export' | 'cases' | 'users' | 'cases-dashboard' | 'cycles';

interface SidebarProps {
  current: TabId;
  onChange: (tab: TabId) => void;
  user: AuthUser | null;
  onLogout: () => void;
  isOpen?: boolean;
}

const mainItems = [
  { id: 'dashboard' as TabId, label: 'Дашборд',          icon: LayoutDashboard },
  { id: 'registry'  as TabId, label: 'Реестр',            icon: Table2 },
  { id: 'update'    as TabId, label: 'Обновление',        icon: RefreshCw },
  { id: 'export'    as TabId, label: 'Администрирование', icon: Settings },
];

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const Sidebar: React.FC<SidebarProps> = ({ current, onChange, user, onLogout, isOpen = false }) => {
  const isTd      = user?.role === 'td';
  const isViewer  = user?.role === 'viewer';
  const isAdmin   = user?.role === 'admin';
  const isAnalyst = isAdmin || user?.role === 'analyst';
  const showCases = isAdmin || user?.role === 'analyst' || isTd || isViewer;

  const visibleMainItems = mainItems.filter(({ id }) => {
    if (isTd) return false;
    if (isViewer) return id !== 'update' && id !== 'export';
    return true;
  });

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">МР</div>
        <div>
          <div className="sidebar-brand-title">Мониторинг<br/>рекомендаций</div>
          <div className="sidebar-brand-sub">АДГС</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleMainItems.map(({ id, label, icon: Icon }) => (
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

        {showCases && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 10 }}>
              Кейсы ТД
            </div>
            <button
              type="button"
              className={`sidebar-item${current === 'cases' ? ' active' : ''}`}
              onClick={() => onChange('cases')}
            >
              <Briefcase size={16} strokeWidth={1.8} />
              <span>Кейсы ТД</span>
            </button>
            {(isAnalyst || isViewer) && (
              <button
                type="button"
                className={`sidebar-item${current === 'cases-dashboard' ? ' active' : ''}`}
                onClick={() => onChange('cases-dashboard')}
              >
                <BarChart2 size={16} strokeWidth={1.8} />
                <span>Аналитика кейсов</span>
              </button>
            )}
            {isAnalyst && (
              <button
                type="button"
                className={`sidebar-item${current === 'cycles' ? ' active' : ''}`}
                onClick={() => onChange('cycles')}
              >
                <CalendarRange size={16} strokeWidth={1.8} />
                <span>Циклы кейсов</span>
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                className={`sidebar-item${current === 'users' ? ' active' : ''}`}
                onClick={() => onChange('users')}
              >
                <Users size={16} strokeWidth={1.8} />
                <span>Пользователи</span>
              </button>
            )}
          </>
        )}
      </nav>

      {user && (
        <div className="sidebar-foot">
          <div className="sidebar-avatar">
            {userInitials(user.name)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--fg-headline))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div style={{ fontSize: 11, color: 'hsl(var(--fg-meta))', marginBottom: 6 }}>{user.role}</div>
            <button
              type="button"
              onClick={onLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 12, color: 'hsl(var(--fg-meta))', padding: 0,
              }}
            >
              <LogOut size={13} />
              Выйти
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
