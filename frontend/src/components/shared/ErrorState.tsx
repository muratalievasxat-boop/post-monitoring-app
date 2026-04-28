import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = 'Не удалось загрузить',
  description,
  onRetry,
}: Props) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '14px 16px',
      borderRadius: 10,
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderLeft: '3px solid hsl(var(--status-overdue))',
    }}>
      <div style={{ flexShrink: 0, marginTop: 1, color: 'hsl(var(--status-overdue))' }}>
        <AlertOctagon size={18} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: description ? 2 : 0 }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{description}</div>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            borderRadius: 6,
            flexShrink: 0,
            border: '1px solid hsl(var(--border))',
            background: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            color: 'hsl(var(--foreground))',
          }}
        >
          <RefreshCw size={12} />
          Повторить
        </button>
      )}
    </div>
  );
}
