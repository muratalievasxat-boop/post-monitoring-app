import { useMemo, useCallback, Component, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar, Line } from "react-chartjs-2";
import { CheckCircle2, Clock, Ban, ListChecks, Trophy, BarChart2 } from "lucide-react";
import type { RegistryDrillDown } from "@/App";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import ActionQueueCard from "@/components/dashboard/ActionQueueCard";
import TrendCard from "@/components/charts/TrendCard";
import SphereCycleCard from "@/components/dashboard/SphereCycleCard";
import RankedOwnersCard from "@/components/dashboard/RankedOwnersCard";
import { DashboardFilterProvider, useDashboardFilters, type StatusFilter } from "@/lib/dashboardFilters";
import { useChartTheme, withAlpha } from "@/lib/chartTheme";
import CycleFunnel from "@/components/charts/CycleFunnel";
import SavedViewsBar from "@/components/dashboard/SavedViewsBar";

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);

/*
 * Dashboard layout by role
 * ────────────────────────────────────────────────────────────────
 *  viewer           KPI · progress bar · trend card · cycle charts
 *  analyst / admin  + action queue · sphere leaders · ranked owners
 *                   · completion form · sphere × cycle heatmap
 * ────────────────────────────────────────────────────────────────
 */

class ChartErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: "16px", color: "#dc2626", fontSize: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fca5a5" }}>
        Ошибка графика: {this.state.error}
      </div>
    );
    return this.props.children;
  }
}

interface DashboardSummary {
  totals: { all: number; active: number; done: number; rejected: number; excluded: number; unknown: number; overdue: number };
  byCycle: { cycle: string; count: number }[];
  byCycleStatus: { cycle: string; done: number; active: number; rejected: number; excluded: number; total: number }[];
  byCycleTypeCompletion: { cycle: string; analiz_total: number; analiz_done: number; monitoring_total: number; monitoring_done: number }[];
  byOrgStatus: { responsible_org: string; done: number; total: number; pct: number }[];
  byOverdueOrg: { responsible_org: string; overdue_count: number }[];
  bySphereStatus: { sphere: string; done: number; total: number; pct: number }[];
  byAttention: { responsible_org: string; total: number; done: number; pct: number }[];
  byCompletionForm: { completion_form: string; total: number; done: number; pct: number }[];
}

const STATUS_KEY_MAP: Record<string, keyof DashboardSummary["byCycleStatus"][0]> = {
  "Исполнено": "done", "В работе": "active", "Для снятия с контроля": "excluded",
};
// Static hex used only for non-chart UI (chip backgrounds, KPI rings)
const STATUS_COLOR_MAP: Record<string, string> = {
  "Исполнено": "#16a34a", "В работе": "#d97706", "Для снятия с контроля": "#94a3b8",
};

const CYCLE_STATUS_LABELS = ["Исполнено", "В работе", "Для снятия с контроля"] as const;

type DashboardRole = 'admin' | 'analyst' | 'viewer';

function KpiCard({ label, labelShort, value, pct, icon: Icon, tone, selected, onClick }: {
  label: string; labelShort?: string; value: number; pct?: number; icon: any;
  tone: "blue" | "amber" | "green" | "slate";
  selected?: boolean; onClick?: () => void;
}) {
  return (
    <div
      className={`kpi-card kpi-card--${tone}${selected ? ' selected' : ''}`}
      onClick={onClick}
      title={onClick ? (selected ? "Сбросить фильтр" : `Фильтр: ${label}`) : undefined}
    >
      <div className="kpi-top">
        <div className="kpi-label">
          {labelShort
            ? <><span className="kpi-label-full">{label}</span><span className="kpi-label-short">{labelShort}</span></>
            : label
          }
        </div>
        <div className="kpi-icon"><Icon size={16} strokeWidth={1.5} /></div>
      </div>
      <div className="kpi-value">{(value ?? 0).toLocaleString('ru')}</div>
      <div className="kpi-foot">
        {pct !== undefined
          ? <span className="kpi-pct">{pct}%</span>
          : <span />
        }
        <span className="kpi-delta kpi-delta--flat">— нет данных</span>
      </div>
    </div>
  );
}

function HBarChart({ labels, values, color, isCount, onClickLabel }: {
  labels: string[]; values: number[]; color: string; isCount?: boolean; onClickLabel?: (label: string) => void;
}) {
  const ct = useChartTheme();
  const h = Math.max(100, labels.length * 34 + 52);
  return (
    <div style={{ height: h, position: "relative" }}>
      <Bar
        data={{ labels, datasets: [{ data: values, backgroundColor: withAlpha(color, 0.73), hoverBackgroundColor: color, borderRadius: 3, barPercentage: 0.72 }] }}
        options={{
          indexAxis: "y" as const,
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { right: 44, left: 8 } },
          onClick: (_: any, elements: any[]) => {
            if (!elements.length || !onClickLabel) return;
            onClickLabel(labels[elements[0].index]);
          },
          onHover: (event: any, elements: any[]) => {
            const canvas = event.native?.target as HTMLCanvasElement;
            if (canvas) canvas.style.cursor = elements.length && onClickLabel ? "pointer" : "default";
          },
          scales: {
            x: {
              min: 0,
              ...(!isCount ? { max: 100 } : {}),
              border: { display: false },
              grid: { color: ct.grid },
              ticks: { color: ct.muted, font: { size: 10 }, callback: (v: any) => isCount ? v : v + "%" },
            },
            y: {
              border: { display: false },
              grid: { display: false },
              ticks: {
                color: ct.muted, font: { size: 10 },
                callback: (_: any, i: number) => { const l = labels[i] || ""; return l.length > 18 ? l.slice(0, 16) + "…" : l; },
              },
            },
          },
          plugins: {
            legend: { display: false },
            datalabels: {
              display: false,
              anchor: "end" as const, align: "end" as const, offset: 2,
              color, font: { size: 10, weight: "bold" as const },
              formatter: (v: number) => isCount ? v : v + "%",
            },
            tooltip: { callbacks: { label: (ctx: any) => isCount ? ` ${ctx.parsed?.x ?? 0}` : ` ${ctx.parsed?.x ?? 0}%` } },
          },
        }}
      />
    </div>
  );
}

function PartialFilterBadge() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 500, padding: "2px 6px",
      background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))",
      borderRadius: 4, border: "1px solid hsl(var(--border))",
      whiteSpace: "nowrap",
    }}>
      фильтр не применён
    </span>
  );
}

function FilterChipBar() {
  const { status, cycle, sphere, setStatus, setCycle, setSphere, reset } = useDashboardFilters();

  type Chip = { key: string; label: string; color: string; onRemove: () => void };
  const chips: Chip[] = [
    status ? { key: "status", label: status, color: STATUS_COLOR_MAP[status], onRemove: () => setStatus(null) } : null,
    cycle  ? { key: "cycle",  label: `Цикл ${cycle}`, color: "#2563eb", onRemove: () => setCycle(null) } : null,
    sphere ? { key: "sphere", label: sphere, color: "#7c3aed", onRemove: () => setSphere(null) } : null,
  ].filter((c): c is Chip => c !== null);

  if (chips.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "6px 12px", borderRadius: 8, background: "hsl(var(--bg-elevated))", border: "1px solid hsl(var(--border-hair))" }}>
      <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", fontWeight: 500 }}>Фильтр:</span>
      {chips.map(({ key, label, color, onRemove }) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: `${color}18`, border: `1px solid ${color}44` }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "hsl(var(--foreground))" }}>{label}</span>
          <button
            onClick={onRemove}
            aria-label={`Убрать фильтр ${label}`}
            style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "hsl(var(--border-div))", cursor: "pointer", flexShrink: 0, fontSize: 11, color: "hsl(var(--fg-secondary))" }}
          >✕</button>
        </div>
      ))}
      {chips.length > 1 && (
        <button
          onClick={reset}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "hsl(var(--muted-foreground))", padding: "0 4px" }}
        >
          Сбросить всё
        </button>
      )}
    </div>
  );
}

function DashboardInner({
  onDrillDown,
  role = 'viewer',
}: {
  onDrillDown?: (f: RegistryDrillDown) => void;
  role?: DashboardRole;
}) {
  const isAnalyst = role === 'admin' || role === 'analyst';
  const { status, setStatus } = useDashboardFilters();
  const ct = useChartTheme();

  const { data: stats, isLoading, error, refetch } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
    queryFn: () => apiRequest("GET", "/api/dashboard/summary").then((r) => r.json()),
  });

  const overallPct = useMemo(() => !stats ? 0 : Math.round((stats.totals.done / (stats.totals.all || 1)) * 100), [stats]);

  function pct(n: number) { return stats ? Math.round(n / (stats.totals.all || 1) * 100) : 0; }
  function toggleStatus(s: StatusFilter) { setStatus(status === s ? null : s); }

  const handleCycleChartClick = useCallback((_: any, elements: any[]) => {
    if (!elements.length || !onDrillDown || !stats) return;
    const { datasetIndex, index } = elements[0];
    const cycle = stats.byCycleStatus[index]?.cycle;
    const clickedStatus = CYCLE_STATUS_LABELS[datasetIndex as 0 | 1 | 2];
    if (cycle) onDrillDown({ cycle, status: clickedStatus });
  }, [stats, onDrillDown]);

  const handleLineChartClick = useCallback((_: any, elements: any[]) => {
    if (!elements.length || !onDrillDown || !stats) return;
    const cycle = stats.byCycleTypeCompletion[elements[0].index]?.cycle;
    if (cycle) onDrillDown({ cycle });
  }, [stats, onDrillDown]);

  const statusChartColor: Record<string, string> = {
    "Исполнено": ct.statusDone, "В работе": ct.statusActive, "Для снятия с контроля": ct.statusExcluded,
  };

  const cycleStackedData = useMemo(() => {
    const items = stats?.byCycleStatus ?? [];
    const labels = items.map((x) => `Цикл ${x.cycle}`);
    if (status && STATUS_KEY_MAP[status]) {
      const key = STATUS_KEY_MAP[status];
      return {
        labels,
        datasets: [{ label: status, data: items.map(x => x[key] as number), backgroundColor: statusChartColor[status], borderRadius: 4, stack: undefined }],
      };
    }
    return {
      labels,
      datasets: [
        { label: "Исполнено",               data: items.map(x => x.done),     backgroundColor: ct.statusDone,     stack: "s" },
        { label: "В работе",                data: items.map(x => x.active),   backgroundColor: ct.statusActive,   stack: "s" },
        { label: "Для снятия с контроля",   data: items.map(x => x.excluded), backgroundColor: ct.statusExcluded, stack: "s" },
      ],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, status, ct]);

  const cycleLineData = useMemo(() => {
    const items = stats?.byCycleTypeCompletion ?? [];
    return {
      labels: items.map(x => `Цикл ${x.cycle}`),
      datasets: [
        {
          label: "Анализ (% исполнения)",
          data: items.map(x => x.analiz_total > 0 ? Math.round(x.analiz_done / x.analiz_total * 100) : 0),
          borderColor: ct.analiz, backgroundColor: withAlpha(ct.analiz, 0.13),
          tension: 0.3, pointRadius: 4, pointHoverRadius: 6, fill: false,
        },
        {
          label: "Мониторинг (% исполнения)",
          data: items.map(x => x.monitoring_total > 0 ? Math.round(x.monitoring_done / x.monitoring_total * 100) : 0),
          borderColor: ct.monitoring, backgroundColor: withAlpha(ct.monitoring, 0.13),
          tension: 0.3, pointRadius: 4, pointHoverRadius: 6, fill: false,
        },
      ],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, ct]);

  if (isLoading) return (
    <div className="content" style={{ gap: 16 }}>
      <div className="kpi-grid">
        {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
      </div>
      <div className="skeleton" style={{ height: 14, borderRadius: 8 }} />
      <div className="dashboard-2col">
        <div className="skeleton" style={{ height: 280, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 280, borderRadius: 12 }} />
      </div>
    </div>
  );
  if (error || !stats) return (
    <div className="content">
      <ErrorState onRetry={() => refetch()} />
    </div>
  );

  const progressItems = [
    { label: "Исполнено",        val: stats.totals.done,                                  color: "hsl(var(--status-done))" },
    { label: "В работе",         val: stats.totals.active + (stats.totals.rejected ?? 0), color: "hsl(var(--status-active))" },
    { label: "Снято с контроля", val: stats.totals.excluded,                              color: "hsl(var(--status-excluded))" },
  ];

  return (
    <div className="content" style={{ gap: 16 }}>

      {/* KPI */}
      <div className="kpi-grid">
        <KpiCard label="Всего" value={stats.totals.all} icon={ListChecks} tone="blue"
          selected={status === null} onClick={() => setStatus(null)} />
        <KpiCard label="В работе" value={stats.totals.active + (stats.totals.rejected ?? 0)} pct={pct(stats.totals.active + (stats.totals.rejected ?? 0))} icon={Clock} tone="amber"
          selected={status === "В работе"} onClick={() => toggleStatus("В работе")} />
        <KpiCard label="Исполнено" value={stats.totals.done} pct={pct(stats.totals.done)} icon={CheckCircle2} tone="green"
          selected={status === "Исполнено"} onClick={() => toggleStatus("Исполнено")} />
        <KpiCard label="Снято с контроля" labelShort="Снято" value={stats.totals.excluded} pct={pct(stats.totals.excluded)} icon={Ban} tone="slate"
          selected={status === "Для снятия с контроля"} onClick={() => toggleStatus("Для снятия с контроля")} />
      </div>

      <FilterChipBar />
      <SavedViewsBar />

      {/* Общий прогресс */}
      <div className="card" style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "hsl(var(--foreground))" }}>Общий прогресс исполнения</span>
          <span className="data-num" style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
            {stats.totals.done} из {stats.totals.all} · <strong style={{ color: "hsl(var(--status-done))" }}>{overallPct}%</strong>
          </span>
        </div>
        <div style={{ height: 14, background: "hsl(var(--border))", borderRadius: 8, overflow: "hidden", display: "flex" }}>
          {progressItems.map(({ val, color }) => (
            <div key={color} style={{ width: `${(val / (stats.totals.all || 1)) * 100}%`, background: color, height: "100%", transition: "width 0.5s" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 8, flexWrap: "wrap" }}>
          {progressItems.map(({ label, val, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
              <span className="data-num" style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{label}: <strong style={{ color: "hsl(var(--foreground))" }}>{val}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* Тренд исполнения */}
      <TrendCard weeks={12} title="% исполнения, 12 недель" />

      {/* Графики по циклам */}
      <div className="dashboard-2col">
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">Исполнение по циклам</div>
            <div className="card-meta">{onDrillDown ? "Нажмите на столбец — откроется список рекомендаций" : "Структура статусов"}</div>
          </div>
          <ChartErrorBoundary>
          <Bar key={`cycle-bar-${status ?? "all"}`} data={cycleStackedData} options={{
            responsive: true, maintainAspectRatio: true,
            onClick: handleCycleChartClick,
            onHover: (event: any, elements: any[]) => {
              const canvas = event.native?.target as HTMLCanvasElement;
              if (canvas) canvas.style.cursor = elements.length && onDrillDown ? "pointer" : "default";
            },
            plugins: {
              legend: { display: true, position: "bottom" as const, labels: { color: "#64748b", boxWidth: 10, font: { size: 11 } } },
              datalabels: { display: false },
            },
            scales: {
              x: { stacked: true, ticks: { color: ct.muted, font: { size: 11 } } },
              y: { stacked: true, ticks: { color: ct.muted, font: { size: 11 } } },
            },
          }} />
          </ChartErrorBoundary>
        </div>

        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">% исполнения по циклам</div>
            <div className="card-meta">{onDrillDown ? "Нажмите на цикл — увидите все рекомендации этого цикла" : "Анализ vs Мониторинг — динамика"}</div>
          </div>
          <ChartErrorBoundary>
          <Line key="line-type-completion" data={cycleLineData} options={{
            responsive: true, maintainAspectRatio: true,
            onClick: handleLineChartClick,
            onHover: (event: any, elements: any[]) => {
              const canvas = event.native?.target as HTMLCanvasElement;
              if (canvas) canvas.style.cursor = elements.length && onDrillDown ? "pointer" : "default";
            },
            plugins: {
              legend: { display: true, position: "bottom" as const, labels: { color: "#64748b", boxWidth: 10, font: { size: 11 } } },
              datalabels: { display: false },
            },
            scales: {
              x: { ticks: { color: ct.muted, font: { size: 11 } } },
              y: { min: 0, max: 100, ticks: { color: ct.muted, font: { size: 11 }, callback: (v: any) => v + "%" } },
            },
          }} />
          </ChartErrorBoundary>
        </div>
      </div>

      {/* Воронка цикла — analyst / admin */}
      {isAnalyst && (() => {
        const cycles = (stats.byCycleStatus ?? [])
          .map(x => x.cycle)
          .filter(c => c !== 'Без цикла');
        return cycles.length > 0 ? <CycleFunnel cycles={cycles} /> : null;
      })()}

      {/* Лидеры по сферам + Топ ведомств — analyst / admin */}
      {isAnalyst && (
        <div className="dashboard-2col">
          <div className="card chart-card" data-filtered={status ? "partial" : undefined}>
            <div className="card-title-row">
              <div className="card-title">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Trophy size={14} />Лидеры по сферам
                </span>
              </div>
              <div className="card-meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                по % исполнения
                {status && <PartialFilterBadge />}
              </div>
            </div>
            {(stats.bySphereStatus ?? []).length === 0 ? (
              <EmptyState icon={BarChart2} title="Нет данных по сферам" />
            ) : (
              <ChartErrorBoundary>
              <HBarChart
                labels={(stats.bySphereStatus ?? []).map(r => r.sphere)}
                values={(stats.bySphereStatus ?? []).map(r => r.pct)}
                color={ct.analiz}
                onClickLabel={onDrillDown ? (label) => onDrillDown({ sphere: label }) : undefined}
              />
              </ChartErrorBoundary>
            )}
          </div>
          <div data-filtered={status ? "partial" : undefined}>
            <RankedOwnersCard
              onItemClick={onDrillDown ? (org) => onDrillDown({ search: org }) : undefined}
              partialFilter={!!status}
            />
          </div>
        </div>
      )}

      {/* Форма закрытия + Очередь действий — analyst / admin */}
      {isAnalyst && (
        <div className="dashboard-2col">
          <div className="card chart-card" data-filtered={status ? "partial" : undefined}>
            <div className="card-title-row">
              <div className="card-title">Форма закрытия</div>
              <div className="card-meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                как закрываются исполненные рекомендации
                {status && <PartialFilterBadge />}
              </div>
            </div>
            {(stats.byCompletionForm ?? []).length === 0 ? (
              <EmptyState icon={BarChart2} title="Нет данных по форме закрытия" description="Появятся после накопления исполненных рекомендаций" />
            ) : (
              <ChartErrorBoundary>
              <HBarChart
                labels={(stats.byCompletionForm ?? []).map(r => r.completion_form)}
                values={(stats.byCompletionForm ?? []).map(r => r.total)}
                color={ct.monitoring}
                isCount
              />
              </ChartErrorBoundary>
            )}
          </div>
          <div data-filtered={status ? "partial" : undefined}>
            <ActionQueueCard
              onItemClick={onDrillDown ? (responsible) => onDrillDown({ search: responsible }) : undefined}
              partialFilter={!!status}
            />
          </div>
        </div>
      )}

      {/* Сферы × циклы — analyst / admin */}
      {isAnalyst && (
        <div data-filtered={status ? "partial" : undefined}>
          <SphereCycleCard
            onClickCell={onDrillDown ? (sphere, cycle) => onDrillDown({ sphere, cycle }) : undefined}
            partialFilter={!!status}
          />
        </div>
      )}

    </div>
  );
}

export default function DashboardPage(props: {
  onDrillDown?: (f: RegistryDrillDown) => void;
  role?: DashboardRole;
}) {
  return (
    <DashboardFilterProvider>
      <DashboardInner {...props} />
    </DashboardFilterProvider>
  );
}
