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
    <div style={{ marginBottom: 10 }}>
      <div className="funnel-label-row">
        <span className="funnel-label">{label}</span>
        <span className="funnel-val">
          {count.toLocaleString('ru')}
          <span className="funnel-pct">{pct}%</span>
        </span>
      </div>
      <div className="funnel-track">
        <div
          className="funnel-fill"
          style={{
            width: `${pct}%`,
            background: color,
            minWidth: count > 0 ? 4 : 0,
            opacity: count === 0 ? 0.3 : 1,
          }}
        />
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
            className="funnel-select"
            aria-label="Выбрать цикл"
            value={cycle}
            onChange={e => handleChange(e.target.value)}
            style={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity 0.15s' }}
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
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div className="skeleton" style={{ width: 100, height: 12, borderRadius: 4 }} />
                <div className="skeleton" style={{ width: 60, height: 12, borderRadius: 4 }} />
              </div>
              <div className="skeleton" style={{ height: 10, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      ) : !data || data.total === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: 'hsl(var(--fg-meta))' }}>
          {cycle ? `Нет данных для цикла ${cycle}` : 'Выберите цикл'}
        </div>
      ) : (
        <div>
          {rows.map(row => (
            <FunnelBar key={row.label} label={row.label} count={row.count} total={data.total} color={row.color} />
          ))}
        </div>
      )}
    </div>
  );
}
