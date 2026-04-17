import React from 'react';

interface TopbarProps {
  title: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-meta">post-monitoring · pilot</div>
    </div>
  );
};
