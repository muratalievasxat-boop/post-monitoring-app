import React from 'react';
import { LayoutDashboard, Table2, RefreshCw, Settings, Briefcase, LogOut, Users, BarChart2 } from 'lucide-react';
import type { AuthUser } from '@/pages/LoginPage';

export type TabId = 'dashboard' | 'registry' | 'update' | 'export' | 'cases' | 'users' | 'cases-dashboard';

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
        <div className="sidebar-brand-icon">М</div>
        <div>
          <div className="sidebar-brand-title">Мониторинг</div>
          <div className="sidebar-brand-sub">Дебюрократизация</div>
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
            <div style={{ margin: '12px 12px 4px', fontSize: 10, fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
        <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--border))', marginTop: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: 2 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>{user.role}</div>
          <button
            type="button"
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 12, color: 'hsl(var(--muted-foreground))', padding: 0,
            }}
          >
            <LogOut size={13} />
            Выйти
          </button>
        </div>
      )}
    </aside>
  );
};
