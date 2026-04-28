import type { LucideIcon } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  cta?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, description, cta }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: '24px 16px',
      gap: 8,
    }}>
      {Icon && (
        <div style={{ color: 'hsl(var(--muted-foreground))' }}>
          <Icon size={24} strokeWidth={1.5} />
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{title}</div>
      {description && (
        <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', maxWidth: 260, lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      {cta && (
        <button
          onClick={cta.onClick}
          style={{
            marginTop: 4,
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid hsl(var(--border))',
            background: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            color: 'hsl(var(--primary))',
          }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
