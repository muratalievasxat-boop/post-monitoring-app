import React from 'react';
import { Sun, Moon, Menu } from 'lucide-react';

interface TopbarProps {
  title: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onMenuToggle?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title, theme, onToggleTheme, onMenuToggle }) => (
  <div className="topbar">
    {onMenuToggle && (
      <button className="hamburger-btn" onClick={onMenuToggle} title="Меню" aria-label="Открыть меню">
        <Menu size={18} />
      </button>
    )}
    <div className="topbar-title">{title}</div>
    <button className="theme-toggle" onClick={onToggleTheme} title="Переключить тему">
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  </div>
);
