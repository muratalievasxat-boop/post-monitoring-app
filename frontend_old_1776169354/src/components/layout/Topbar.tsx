import React from 'react';

interface TopbarProps {
  title: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
  return (
    <header className="h-14 border-b border-border-subtle bg-bg-subtle flex items-center justify-between px-4">
      <h1 className="text-sm font-medium text-text">{title}</h1>
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span>v0.1 · pilot</span>
      </div>
    </header>
  );
};
