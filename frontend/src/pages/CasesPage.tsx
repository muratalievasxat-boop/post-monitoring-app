import { useQuery } from '@tanstack/react-query';
import { Briefcase } from 'lucide-react';
import type { AuthUser } from './LoginPage';

interface Case {
  id: number;
  title: string;
  sphere: string | null;
  td_name: string | null;
  status: string;
  author_name: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  pending: 'На рассмотрении',
  in_review: 'Изучается',
  returned: 'Возвращён',
  accepted: 'Принят',
  rejected: 'Отклонён',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  pending: '#d97706',
  in_review: '#2563eb',
  returned: '#f59e0b',
  accepted: '#16a34a',
  rejected: '#dc2626',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#94a3b8';
  return (
    <span style={{
      background: color + '18', color, border: `1px solid ${color}44`,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

async function fetchCases(): Promise<Case[]> {
  const token = localStorage.getItem('jwt');
  const res = await fetch('/api/cases', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Ошибка загрузки');
  return res.json();
}

export default function CasesPage({ user }: { user: AuthUser }) {
  const { data: cases = [], isLoading } = useQuery({ queryKey: ['/api/cases'], queryFn: fetchCases });

  return (
    <div className="content" style={{ gap: 16 }}>
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Briefcase size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Кейсы ТД</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
            {user.role === 'td' ? 'Мои кейсы' : 'Все кейсы'}
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Загрузка...</div>
        ) : cases.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
            Кейсов пока нет
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['#', 'Название', 'Сфера', 'ТД', 'Автор', 'Статус', 'Дата'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td style={{ padding: '8px 10px', color: 'hsl(var(--muted-foreground))' }}>{c.id}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 500, color: 'hsl(var(--foreground))' }}>{c.title}</td>
                    <td style={{ padding: '8px 10px', color: 'hsl(var(--muted-foreground))' }}>{c.sphere ?? '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'hsl(var(--muted-foreground))' }}>{c.td_name ?? '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'hsl(var(--muted-foreground))' }}>{c.author_name ?? '—'}</td>
                    <td style={{ padding: '8px 10px' }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: '8px 10px', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
