import { LayoutDashboard, Table2, Briefcase, MoreHorizontal } from 'lucide-react';
import type { AuthUser } from '@/pages/LoginPage';
import type { TabId } from './Sidebar';

interface BottomNavProps {
  current: TabId;
  onChange: (tab: TabId) => void;
  user: AuthUser | null;
  onOpenMore: () => void;
  isDrawerOpen: boolean;
}

const NAV_ITEMS: { id: TabId; label: string; icon: React.FC<{ size: number; strokeWidth: number }> }[] = [
  { id: 'dashboard', label: 'Дашборд',  icon: LayoutDashboard },
  { id: 'registry',  label: 'Реестр',   icon: Table2 },
  { id: 'cases',     label: 'Кейсы ТД', icon: Briefcase },
];

export function BottomNav({ current, onChange, user, onOpenMore, isDrawerOpen }: BottomNavProps) {
  const isMore = current !== 'dashboard' && current !== 'registry' && current !== 'cases' && current !== 'cases-dashboard';

  if (isDrawerOpen) return null;

  return (
    <nav className="bottom-nav" aria-label="Нижняя навигация">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = current === id || (id === 'cases' && current === 'cases-dashboard');
        return (
          <button
            key={id}
            type="button"
            className={`bottom-nav-btn${isActive ? ' bottom-nav-btn--active' : ''}`}
            onClick={() => onChange(id)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
            <span>{label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={`bottom-nav-btn${isMore ? ' bottom-nav-btn--active' : ''}`}
        onClick={onOpenMore}
        aria-label="Ещё"
      >
        <MoreHorizontal size={20} strokeWidth={isMore ? 2.2 : 1.6} />
        <span>Ещё</span>
      </button>
    </nav>
  );
}
