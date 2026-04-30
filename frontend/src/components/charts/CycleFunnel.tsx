import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useChartTheme } from '@/lib/chartTheme';
import { Filter } from 'lucide-react';

interface FunnelData {
  cycle: string;
  total: number;
  active: number;
  done: number;
  excluded: number;
}

const STORAGE_KEY = 'dashboard.cycle-funnel.cycle';

function readStoredCycle(cycles: string[]): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && cycles.includes(v)) return v;
  } catch { /* noop */ }
  return cycles[0] ?? '';
}

interface BarRow {
  label: string;
  count: number;
  color: string;
}

function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 130, fontSize: 12, color: 'hsl(var(--muted-foreground))', textAlign: 'right', flexShrink: 0, lineHeight: 1.3 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 30, background: 'hsl(var(--muted))', borderRadius: 7, overflow: 'hidden', minWidth: 0 }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 7,
            transition: 'width 0.45s ease',
            minWidth: count > 0 ? 6 : 0,
          }}
        />
      </div>
      <div style={{ minWidth: 90, fontSize: 12, fontWeight: 700, color: 'hsl(var(--foreground))', flexShrink: 0 }}>
        {count.toLocaleString('ru')}
        <span style={{ fontWeight: 400, color: 'hsl(var(--muted-foreground))', marginLeft: 4 }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

export default function CycleFunnel({ cycles }: { cycles: string[] }) {
  const ct = useChartTheme();
  const [cycle, setCycle] = useState(() => readStoredCycle(cycles));

  function handleChange(c: string) {
    setCycle(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch { /* noop */ }
  }

  const { data, isFetching } = useQuery<FunnelData | null>({
    queryKey: ['/api/dashboard/cycle-funnel', cycle],
    queryFn: () =>
      apiRequest('GET', `/api/dashboard/cycle-funnel?cycle=${encodeURIComponent(cycle)}`).then(r => r.json()),
    enabled: !!cycle,
    placeholderData: keepPreviousData,
  });

  const rows: BarRow[] = data
    ? [
        { label: 'В работе',         count: data.active,   color: ct.statusActive },
        { label: 'Исполнено',        count: data.done,     color: ct.statusDone },
        { label: 'Снято с контроля', count: data.excluded, color: ct.statusExcluded },
      ]
    : [];

  const isLoading = isFetching && !data;

  return (
    <div className="card">
      <div className="card-title-row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div className="card-title">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} />Воронка цикла
          </span>
        </div>
        {cycles.length > 0 && (
          <select
            value={cycle}
            onChange={e => handleChange(e.target.value)}
            style={{
              padding: '4px 10px',
              borderRadius: 7,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: isFetching ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {cycles.map(c => (
              <option key={c} value={c}>Цикл {c}</option>
            ))}
          </select>
        )}
      </div>

      <div className="card-meta" style={{ marginBottom: 16 }}>
        {data ? `${data.total.toLocaleString('ru')} рекомендаций · распределение статусов` : 'распределение статусов внутри цикла'}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="skeleton" style={{ width: 130, height: 14, borderRadius: 4, flexShrink: 0 }} />
              <div className="skeleton" style={{ flex: 1, height: 30, borderRadius: 7 }} />
              <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      ) : !data || data.total === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
          {cycle ? `Нет данных для цикла ${cycle}` : 'Выберите цикл'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {rows.map(row => (
            <FunnelBar key={row.label} label={row.label} count={row.count} total={data.total} color={row.color} />
          ))}
        </div>
      )}
    </div>
  );
}
