import { useState, useRef } from 'react';
import { useChartTheme, withAlpha } from '@/lib/chartTheme';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { TrendingUp, CheckCircle2, XCircle, Clock, RotateCcw, Pencil, Check, X } from 'lucide-react';
import KazakhstanMap, { type TdStat } from '@/components/KazakhstanMap';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// ─── types ────────────────────────────────────────────────────────────────────

interface Totals { total: number; accepted: number; rejected: number; in_review: number; returned: number }
interface TdRow {
  td_name: string; total: number; accepted: number; rejected: number; returned: number;
  score: number; manual_summary: string | null;
}
interface SphereRow { sphere: string; count: number }
interface Stats { totals: Totals; byTd: TdRow[]; bySphere: SphereRow[] }

// ─── helpers ─────────────────────────────────────────────────────────────────

function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('jwt');
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers as Record<string, string> ?? {}) },
  });
}

function pct(a: number, b: number) { return b ? Math.round(a / b * 100) : 0; }

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ElementType }) {
  return (
    <div style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'hsl(var(--foreground))', lineHeight: 1 }}>{value ?? 0}</div>
      </div>
      <Icon size={22} color={color} strokeWidth={1.6} />
    </div>
  );
}

// ─── HBarChart ────────────────────────────────────────────────────────────────

function HBarChart({ labels, values, color }: { labels: string[]; values: number[]; color: string }) {
  const ct = useChartTheme();
  const h = Math.max(80, labels.length * 34 + 48);
  return (
    <div style={{ height: h, position: 'relative' }}>
      <Bar
        data={{ labels, datasets: [{ data: values, backgroundColor: withAlpha(color, 0.73), hoverBackgroundColor: color, borderRadius: 3, barPercentage: 0.7 }] }}
        options={{
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          layout: { padding: { right: 32 } },
          scales: {
            x: { min: 0, border: { display: false }, grid: { color: ct.grid }, ticks: { color: ct.muted, font: { size: 10 } } },
            y: { border: { display: false }, grid: { display: false }, ticks: { color: ct.muted, font: { size: 10 }, callback: (_: unknown, i: number) => { const l = labels[i] ?? ''; return l.length > 28 ? l.slice(0, 26) + '…' : l; } } },
          },
          plugins: {
            legend: { display: false },
            datalabels: { display: false },
            tooltip: { callbacks: { label: (ctx: { parsed: { x: number } }) => ` ${ctx.parsed.x}` } },
          },
        }}
      />
    </div>
  );
}

// ─── Inline summary editor ────────────────────────────────────────────────────

function SummaryCell({ tdName, initial, onSaved }: { tdName: string; initial: string | null; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function save() {
    setSaving(true);
    await authFetch(`/api/cases/td-summary/${encodeURIComponent(tdName)}`, { method: 'PATCH', body: JSON.stringify({ summary: value }) });
    setSaving(false);
    setEditing(false);
    onSaved();
  }

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ fontSize: 12, color: value ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))', fontStyle: value ? 'normal' : 'italic', flex: 1, lineHeight: 1.4 }}>
          {value || 'Добавить вывод…'}
        </span>
        <button onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: '2px', flexShrink: 0 }}>
          <Pencil size={12} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <textarea ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
        rows={2}
        style={{ width: '100%', padding: '5px 7px', borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', fontSize: 12, resize: 'none', boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 5 }}>
        <button onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 9px', borderRadius: 5, border: 'none', background: '#2563eb', color: '#fff', fontSize: 11, cursor: 'pointer' }}>
          <Check size={11} />{saving ? '…' : 'OK'}
        </button>
        <button onClick={() => { setEditing(false); setValue(initial ?? ''); }}
          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 9px', borderRadius: 5, border: '1px solid hsl(var(--border))', background: 'none', color: 'hsl(var(--muted-foreground))', fontSize: 11, cursor: 'pointer' }}>
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

// ─── TD Detail Modal ──────────────────────────────────────────────────────────

function TdDetailModal({ tdName, onClose }: { tdName: string; onClose: () => void }) {
  const { data: cases = [], isLoading } = useQuery<{ id: number; title: string; status: string; created_at: string }[]>({
    queryKey: ['/api/cases', 'byTd', tdName],
    queryFn: async () => {
      const res = await authFetch('/api/cases');
      if (!res.ok) throw new Error('err');
      const all = await res.json();
      return all.filter((c: { td_name: string }) => c.td_name === tdName);
    },
  });

  const STATUS_LABELS: Record<string, string> = { draft: 'Черновик', pending: 'На рассмотрении', in_review: 'Изучается', returned: 'Возвращён', accepted: 'Принят', rejected: 'Отклонён' };
  const STATUS_COLORS: Record<string, string> = { draft: '#94a3b8', pending: '#d97706', in_review: '#2563eb', returned: '#f59e0b', accepted: '#16a34a', rejected: '#dc2626' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: 'hsl(var(--background))', borderRadius: 14, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '24px 28px', maxHeight: '80vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{tdName}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: 4 }}><X size={18} /></button>
        </div>
        {isLoading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Загрузка...</div>
        ) : cases.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Кейсов нет</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {cases.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', minWidth: 22 }}>#{c.id}</span>
                <span style={{ fontSize: 13, flex: 1 }}>{c.title}</span>
                <span style={{ background: (STATUS_COLORS[c.status] ?? '#94a3b8') + '18', color: STATUS_COLORS[c.status] ?? '#94a3b8', border: `1px solid ${(STATUS_COLORS[c.status] ?? '#94a3b8')}44`, borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {STATUS_LABELS[c.status] ?? c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CasesDashboardPage ───────────────────────────────────────────────────────

export default function CasesDashboardPage() {
  const qc = useQueryClient();
  const [detailTd, setDetailTd] = useState<string | null>(null);
  const ct = useChartTheme();

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['/api/cases/stats'],
    queryFn: async () => {
      const res = await authFetch('/api/cases/stats');
      if (!res.ok) throw new Error('Ошибка загрузки');
      return res.json();
    },
  });

  if (isLoading) return <div className="content"><div className="card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Загрузка...</div></div>;
  if (!stats) return <div className="card" style={{ padding: 20, color: '#dc2626' }}>Не удалось загрузить данные</div>;

  const { totals, byTd, bySphere } = stats;

  // Chart data
  const topTd = [...byTd].sort((a, b) => b.accepted - a.accepted).slice(0, 10);
  const outsiders = byTd.filter(r => r.total > 0 && pct(r.accepted, r.total) < 50).sort((a, b) => pct(a.accepted, a.total) - pct(b.accepted, b.total)).slice(0, 10);

  const mapStats: TdStat[] = byTd.map(r => ({ td_name: r.td_name, total: r.total, accepted: r.accepted, score: Number(r.score) }));

  return (
    <div className="content" style={{ gap: 16 }}>

      {/* KPI */}
      <div className="cases-kpi-grid">
        <KpiCard label="Всего кейсов"     value={totals.total}     color="#2563eb" icon={TrendingUp} />
        <KpiCard label="Принято"           value={totals.accepted}  color="#16a34a" icon={CheckCircle2} />
        <KpiCard label="Отклонено"         value={totals.rejected}  color="#dc2626" icon={XCircle} />
        <KpiCard label="На рассмотрении"   value={totals.in_review} color="#d97706" icon={Clock} />
        <KpiCard label="Возвращено"        value={totals.returned}  color="#f59e0b" icon={RotateCcw} />
      </div>

      {/* Charts row */}
      <div className="cases-charts-row">
        <div className="card chart-card">
          <div className="card-title-row"><div className="card-title">🏆 Топ ТД</div></div>
          {topTd.length === 0 ? <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Нет данных</div>
            : <HBarChart labels={topTd.map(r => r.td_name)} values={topTd.map(r => r.accepted)} color={ct.analiz} />}
        </div>
        <div className="card chart-card">
          <div className="card-title-row"><div className="card-title">🔴 Аутсайдеры (&lt;50%)</div></div>
          {outsiders.length === 0 ? <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Все ТД выше 50%</div>
            : <HBarChart labels={outsiders.map(r => r.td_name)} values={outsiders.map(r => pct(r.accepted, r.total))} color={ct.statusOverdue} />}
        </div>
        <div className="card chart-card">
          <div className="card-title-row"><div className="card-title">📂 Принятые по сферам</div></div>
          {bySphere.length === 0 ? <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Нет данных</div>
            : <HBarChart labels={bySphere.map(r => r.sphere)} values={bySphere.map(r => r.count)} color={ct.monitoring} />}
        </div>
      </div>

      {/* Map */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div className="card-title-row" style={{ marginBottom: 12 }}>
          <div className="card-title">Карта регионов</div>
          <div className="card-meta">Нажмите на регион — список кейсов</div>
        </div>
        <KazakhstanMap stats={mapStats} onClickRegion={setDetailTd} />
      </div>

      {/* Rating table */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div className="card-title-row" style={{ marginBottom: 14 }}>
          <div className="card-title">Рейтинг ТД</div>
          <div className="card-meta">Балл = принятые × 0.25, макс 2.5</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                {['#', 'ТД', 'Подано', 'Принято', 'Отклонено', '% принятия', 'Баллы', 'Вывод аналитика'].map((h, i) => (
                  <th key={i} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byTd.map((row, i) => {
                const score = Number(row.score);
                const scoreColor = score >= 2.0 ? '#16a34a' : score >= 1.0 ? '#d97706' : '#dc2626';
                const acceptance = pct(row.accepted, row.total);
                return (
                  <tr key={row.td_name} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td style={{ padding: '9px 10px', color: 'hsl(var(--muted-foreground))' }}>{i + 1}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 500 }}>
                      <button onClick={() => setDetailTd(row.td_name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: 13, padding: 0, textAlign: 'left', fontWeight: 500 }}>
                        {row.td_name}
                      </button>
                    </td>
                    <td style={{ padding: '9px 10px', color: 'hsl(var(--muted-foreground))' }}>{row.total}</td>
                    <td style={{ padding: '9px 10px', color: '#16a34a', fontWeight: 600 }}>{row.accepted}</td>
                    <td style={{ padding: '9px 10px', color: '#dc2626' }}>{row.rejected}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ height: 5, width: 60, background: 'hsl(var(--border))', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${acceptance}%`, background: acceptance >= 50 ? '#16a34a' : '#dc2626', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{acceptance}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: scoreColor }}>{score.toFixed(2)}</span>
                    </td>
                    <td style={{ padding: '9px 10px', minWidth: 200 }}>
                      <SummaryCell
                        tdName={row.td_name}
                        initial={row.manual_summary}
                        onSaved={() => qc.invalidateQueries({ queryKey: ['/api/cases/stats'] })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailTd && <TdDetailModal tdName={detailTd} onClose={() => setDetailTd(null)} />}
    </div>
  );
}
