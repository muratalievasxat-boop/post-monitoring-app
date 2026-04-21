import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface TopbarProps {
  title: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ title, theme, onToggleTheme }) => (
  <div className="topbar">
    <div className="topbar-title">{title}</div>
    <button className="theme-toggle" onClick={onToggleTheme} title="Переключить тему">
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  </div>
);
