import { useMemo, useCallback, useState, Component, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar, Line } from "react-chartjs-2";
import { CheckCircle2, Clock, Ban, ListChecks, Trophy, AlertTriangle, AlertCircle, BarChart2 } from "lucide-react";
import type { RegistryDrillDown } from "@/App";
import Sparkline from "@/components/shared/Sparkline";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);

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

// Hex values kept for Chart.js datasets (cannot use CSS custom properties there)
const C = { done: "#16a34a", active: "#d97706", rejected: "#dc2626", excluded: "#94a3b8", analiz: "#2563eb", monitoring: "#7c3aed" };

const SPARKLINE_PLACEHOLDER: null[] = Array(10).fill(null);

const DIM_TOOLTIP = "Фильтр KPI применяется только к графикам по циклам — клик по KPI «Всего» снимет фильтр";

function KpiCard({ label, labelShort, value, pct, sub, icon: Icon, tone, selected, onClick }: {
  label: string; labelShort?: string; value: number; pct?: number; sub?: string; icon: any;
  tone: "blue" | "amber" | "green" | "red" | "slate" | "violet";
  selected?: boolean; onClick?: () => void;
}) {
  return (
    <div
      className={`kpi-card--${tone}`}
      onClick={onClick}
      style={{
        background: "var(--kc-bg)",
        border: selected ? "2px solid var(--kc-accent)" : "1px solid var(--kc-ring)",
        borderRadius: 12,
        padding: selected ? "11px 15px" : "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        cursor: onClick ? "pointer" : "default",
        boxShadow: selected ? "0 0 0 3px var(--kc-ring)" : "none",
        transition: "box-shadow 0.15s, border-color 0.15s",
        userSelect: "none",
      }}
      title={onClick ? (selected ? "Сбросить фильтр" : `Фильтр: ${label}`) : undefined}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--kc-accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          {labelShort ? (
            <>
              <span className="kpi-label-full">{label}</span>
              <span className="kpi-label-short">{labelShort}</span>
            </>
          ) : label}
        </div>
        <div className="data-num" style={{ fontSize: 28, fontWeight: 700, color: "hsl(var(--foreground))", lineHeight: 1 }}>
          {(value ?? 0).toLocaleString("ru")}
        </div>
        {pct !== undefined && (
          <div className="data-num" style={{ fontSize: 12, color: "var(--kc-accent)", marginTop: 3, fontWeight: 600 }}>{pct}%</div>
        )}
        {sub && (
          <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{sub}</div>
        )}
        <div style={{ marginTop: 8 }}>
          <Sparkline values={SPARKLINE_PLACEHOLDER} color="var(--kc-accent)" height={24} />
        </div>
      </div>
      <Icon size={24} color="var(--kc-accent)" strokeWidth={selected ? 2.5 : 1.5} />
    </div>
  );
}

function HBarChart({ labels, values, color, isCount, onClickLabel }: {
  labels: string[]; values: number[]; color: string; isCount?: boolean; onClickLabel?: (label: string) => void;
}) {
  const h = Math.max(100, labels.length * 34 + 52);
  return (
    <div style={{ height: h, position: "relative" }}>
      <Bar
        data={{ labels, datasets: [{ data: values, backgroundColor: color + "bb", hoverBackgroundColor: color, borderRadius: 3, barPercentage: 0.72 }] }}
        options={{
          indexAxis: "y" as const,
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { right: 44 } },
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
              grid: { color: "rgba(100,116,139,0.12)" },
              ticks: { color: "#64748b", font: { size: 10 }, callback: (v: any) => isCount ? v : v + "%" },
            },
            y: {
              border: { display: false },
              grid: { display: false },
              ticks: {
                color: "#64748b", font: { size: 10 },
                callback: (_: any, i: number) => { const l = labels[i] || ""; return l.length > 26 ? l.slice(0, 24) + "…" : l; },
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


const CYCLE_STATUS_LABELS = ["Исполнено", "В работе", "Для снятия с контроля"] as const;

type StatusFilter = "В работе" | "Исполнено" | "Для снятия с контроля" | null;

const STATUS_KEY_MAP: Record<string, keyof DashboardSummary["byCycleStatus"][0]> = {
  "Исполнено": "done", "В работе": "active", "Для снятия с контроля": "excluded",
};
const STATUS_COLOR_MAP: Record<string, string> = {
  "Исполнено": C.done, "В работе": C.active, "Для снятия с контроля": C.excluded,
};

export default function DashboardPage({ onDrillDown }: { onDrillDown?: (f: RegistryDrillDown) => void }) {
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>(null);

  const { data: stats, isLoading, error, refetch } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
    queryFn: () => apiRequest("GET", "/api/dashboard/summary").then((r) => r.json()),
  });

  const overallPct = useMemo(() => !stats ? 0 : Math.round((stats.totals.done / (stats.totals.all || 1)) * 100), [stats]);

  function pct(n: number) { return stats ? Math.round(n / (stats.totals.all || 1) * 100) : 0; }
  function toggleStatus(s: StatusFilter) { setSelectedStatus(prev => prev === s ? null : s); }

  const handleCycleChartClick = useCallback((_: any, elements: any[]) => {
    if (!elements.length || !onDrillDown || !stats) return;
    const { datasetIndex, index } = elements[0];
    const cycle = stats.byCycleStatus[index]?.cycle;
    const status = CYCLE_STATUS_LABELS[datasetIndex as 0 | 1 | 2];
    if (cycle) onDrillDown({ cycle, status });
  }, [stats, onDrillDown]);

  const handleLineChartClick = useCallback((_: any, elements: any[]) => {
    if (!elements.length || !onDrillDown || !stats) return;
    const cycle = stats.byCycleTypeCompletion[elements[0].index]?.cycle;
    if (cycle) onDrillDown({ cycle });
  }, [stats, onDrillDown]);

  const cycleStackedData = useMemo(() => {
    const items = stats?.byCycleStatus ?? [];
    const labels = items.map((x) => `Цикл ${x.cycle}`);
    if (selectedStatus && STATUS_KEY_MAP[selectedStatus]) {
      const key = STATUS_KEY_MAP[selectedStatus];
      return {
        labels,
        datasets: [{ label: selectedStatus, data: items.map(x => x[key] as number), backgroundColor: STATUS_COLOR_MAP[selectedStatus], borderRadius: 4, stack: undefined }],
      };
    }
    return {
      labels,
      datasets: [
        { label: "Исполнено", data: items.map(x => x.done), backgroundColor: C.done, stack: "s" },
        { label: "В работе", data: items.map(x => x.active), backgroundColor: C.active, stack: "s" },
        { label: "Для снятия с контроля", data: items.map(x => x.excluded), backgroundColor: C.excluded, stack: "s" },
      ],
    };
  }, [stats, selectedStatus]);

  const cycleLineData = useMemo(() => {
    const items = stats?.byCycleTypeCompletion ?? [];
    return {
      labels: items.map(x => `Цикл ${x.cycle}`),
      datasets: [
        {
          label: "Анализ (% исполнения)",
          data: items.map(x => x.analiz_total > 0 ? Math.round(x.analiz_done / x.analiz_total * 100) : 0),
          borderColor: C.analiz, backgroundColor: C.analiz + "22",
          tension: 0.3, pointRadius: 4, pointHoverRadius: 6, fill: false,
        },
        {
          label: "Мониторинг (% исполнения)",
          data: items.map(x => x.monitoring_total > 0 ? Math.round(x.monitoring_done / x.monitoring_total * 100) : 0),
          borderColor: C.monitoring, backgroundColor: C.monitoring + "22",
          tension: 0.3, pointRadius: 4, pointHoverRadius: 6, fill: false,
        },
      ],
    };
  }, [stats]);

  if (isLoading) return (
    <div className="content" style={{ gap: 16 }}>
      <div className="dashboard-kpi-grid">
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

  const dimStyle = selectedStatus ? { opacity: 0.5 } : {};
  const dimTitle = selectedStatus ? DIM_TOOLTIP : undefined;

  const progressItems = [
    { label: "Исполнено",        val: stats.totals.done,                                  color: "hsl(var(--status-done))" },
    { label: "В работе",         val: stats.totals.active + (stats.totals.rejected ?? 0), color: "hsl(var(--status-active))" },
    { label: "Снято с контроля", val: stats.totals.excluded,                              color: "hsl(var(--status-excluded))" },
  ];

  return (
    <div className="content" style={{ gap: 16 }}>

      {/* KPI */}
      <div className="dashboard-kpi-grid">
        <KpiCard label="Всего" value={stats.totals.all} icon={ListChecks} tone="blue"
          selected={selectedStatus === null} onClick={() => setSelectedStatus(null)} />
        <KpiCard label="В работе" value={stats.totals.active + (stats.totals.rejected ?? 0)} pct={pct(stats.totals.active + (stats.totals.rejected ?? 0))} icon={Clock} tone="amber"
          selected={selectedStatus === "В работе"} onClick={() => toggleStatus("В работе")} />
        <KpiCard label="Исполнено" value={stats.totals.done} pct={pct(stats.totals.done)} icon={CheckCircle2} tone="green"
          selected={selectedStatus === "Исполнено"} onClick={() => toggleStatus("Исполнено")} />
        <KpiCard label="Снято с контроля" labelShort="Снято" value={stats.totals.excluded} pct={pct(stats.totals.excluded)} icon={Ban} tone="slate"
          selected={selectedStatus === "Для снятия с контроля"} onClick={() => toggleStatus("Для снятия с контроля")} />
      </div>

      {selectedStatus && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: `${STATUS_COLOR_MAP[selectedStatus]}18`, border: `1px solid ${STATUS_COLOR_MAP[selectedStatus]}44`, fontSize: 13 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR_MAP[selectedStatus], flexShrink: 0 }} />
          <span style={{ color: "hsl(var(--foreground))", fontWeight: 500 }}>Фильтр: <strong>{selectedStatus}</strong></span>
          <button onClick={() => setSelectedStatus(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "hsl(var(--muted-foreground))", padding: "0 4px" }}>✕ Сбросить</button>
        </div>
      )}

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

      {/* Графики по циклам — не приглушаются при выборе KPI */}
      <div className="dashboard-2col">

        {/* Исполнение по циклам — stacked bar */}
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">Исполнение по циклам</div>
            <div className="card-meta">{onDrillDown ? "Нажмите на столбец — откроется список рекомендаций" : "Структура статусов"}</div>
          </div>
          <ChartErrorBoundary>
          <Bar key={`cycle-bar-${selectedStatus ?? "all"}`} data={cycleStackedData} options={{
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
              x: { stacked: true, ticks: { color: "#64748b", font: { size: 11 } } },
              y: { stacked: true, ticks: { color: "#64748b", font: { size: 11 } } },
            },
          }} />
          </ChartErrorBoundary>
        </div>

        {/* % исполнения по типам — Line chart */}
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
              x: { ticks: { color: "#64748b", font: { size: 11 } } },
              y: { min: 0, max: 100, ticks: { color: "#64748b", font: { size: 11 }, callback: (v: any) => v + "%" } },
            },
          }} />
          </ChartErrorBoundary>
        </div>
      </div>

      {/* Лидеры ГО + Активные с дедлайном */}
      <div className="dashboard-2col" style={dimStyle} title={dimTitle}>
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Trophy size={14} />Лидеры ГО
              </span>
            </div>
            <div className="card-meta">по % исполнения</div>
          </div>
          {(stats.byOrgStatus ?? []).length === 0 ? (
            <EmptyState icon={Trophy} title="Нет данных по ГО" />
          ) : (
            <ChartErrorBoundary>
            <HBarChart
              labels={(stats.byOrgStatus ?? []).map(r => r.responsible_org)}
              values={(stats.byOrgStatus ?? []).map(r => r.pct)}
              color={C.done}
              onClickLabel={onDrillDown ? (label) => onDrillDown({ search: label }) : undefined}
            />
            </ChartErrorBoundary>
          )}
        </div>
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} />Активные с дедлайном 2024–2025
              </span>
            </div>
            <div className="card-meta">Срок истёк в 2024–2025, статус — «В работе»</div>
          </div>
          {(stats.byOverdueOrg ?? []).length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Нет просроченных рекомендаций" description="Все рекомендации с дедлайном 2024–2025 закрыты или не в статусе «В работе»" />
          ) : (
            <ChartErrorBoundary>
            <HBarChart
              labels={(stats.byOverdueOrg ?? []).map(r => r.responsible_org)}
              values={(stats.byOverdueOrg ?? []).map(r => r.overdue_count)}
              color={C.rejected}
              isCount
              onClickLabel={onDrillDown ? (label) => onDrillDown({ search: label }) : undefined}
            />
            </ChartErrorBoundary>
          )}
        </div>
      </div>

      {/* Лидеры по сферам + Требуют внимания */}
      <div className="dashboard-2col" style={dimStyle} title={dimTitle}>
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Trophy size={14} />Лидеры по сферам
              </span>
            </div>
            <div className="card-meta">по % исполнения</div>
          </div>
          {(stats.bySphereStatus ?? []).length === 0 ? (
            <EmptyState icon={BarChart2} title="Нет данных по сферам" />
          ) : (
            <ChartErrorBoundary>
            <HBarChart
              labels={(stats.bySphereStatus ?? []).map(r => r.sphere)}
              values={(stats.bySphereStatus ?? []).map(r => r.pct)}
              color={C.analiz}
              onClickLabel={onDrillDown ? (label) => onDrillDown({ sphere: label }) : undefined}
            />
            </ChartErrorBoundary>
          )}
        </div>
        <div className="card">
          <div className="card-title-row">
            <div className="card-title" style={{ color: "hsl(var(--status-active))" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={14} />Требуют внимания
              </span>
            </div>
            <div className="card-meta">цикл VII · ≤10% · ≥10 рекомендаций</div>
          </div>
          {(stats.byAttention ?? []).length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Всё под контролем" description="Нет ГО с критически низким исполнением в активном цикле VII" />
          ) : (
            <>
              <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 10, lineHeight: 1.5 }}>
                По активному циклу VII — ≤10% исполнения (≥10 рекомендаций). Цикл ещё не завершён, данные предварительные.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(stats.byAttention ?? []).map(row => (
                  <div
                    key={row.responsible_org}
                    onClick={onDrillDown ? () => onDrillDown({ search: row.responsible_org, cycle: "VII" }) : undefined}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "10px 14px", borderRadius: 8, minHeight: 44,
                      background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))",
                      fontSize: 12, cursor: onDrillDown ? "pointer" : "default",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>{row.responsible_org}</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>·</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>{row.total} рек.</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>·</span>
                    <span className="data-num" style={{ color: C.rejected, fontWeight: 700 }}>{row.pct}%</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>·</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>цикл VII</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Форма закрытия */}
      <div className="dashboard-2col" style={dimStyle} title={dimTitle}>
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">Форма закрытия</div>
            <div className="card-meta">как закрываются исполненные рекомендации</div>
          </div>
          {(stats.byCompletionForm ?? []).length === 0 ? (
            <EmptyState icon={BarChart2} title="Нет данных по форме закрытия" description="Появятся после накопления исполненных рекомендаций" />
          ) : (
            <ChartErrorBoundary>
            <HBarChart
              labels={(stats.byCompletionForm ?? []).map(r => r.completion_form)}
              values={(stats.byCompletionForm ?? []).map(r => r.total)}
              color={C.monitoring}
              isCount
            />
            </ChartErrorBoundary>
          )}
        </div>
        <div />
      </div>

    </div>
  );
}
