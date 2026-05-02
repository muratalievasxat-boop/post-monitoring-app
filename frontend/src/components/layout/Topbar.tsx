import React from 'react';
import { Sun, Moon, Menu, Search } from 'lucide-react';
import type { AuthUser } from '@/pages/LoginPage';

interface TopbarProps {
  title: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onMenuToggle?: () => void;
  user?: AuthUser | null;
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const Topbar: React.FC<TopbarProps> = ({ title, theme, onToggleTheme, onMenuToggle, user }) => (
  <div className="topbar">
    {onMenuToggle && (
      <button className="hamburger-btn" onClick={onMenuToggle} title="Меню" aria-label="Открыть меню">
        <Menu size={18} />
      </button>
    )}
    <div className="topbar-title">{title}</div>
    <div className="topbar-spacer" />
    <div className="topbar-search">
      <Search size={13} color="hsl(var(--fg-dim))" />
      <input placeholder="Поиск..." />
    </div>
    <button className="topbar-btn" onClick={onToggleTheme} title="Переключить тему">
      {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
    </button>
    {user && (
      <div className="topbar-user">
        <div className="topbar-avatar">{userInitials(user.name)}</div>
        <div>
          <div className="topbar-user-name">{user.name}</div>
          <div className="topbar-user-role">{user.role}</div>
        </div>
      </div>
    )}
  </div>
);
