import { useMemo, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar, Line } from "react-chartjs-2";
import { CheckCircle2, Clock, XCircle, Ban, ListChecks, AlertCircle } from "lucide-react";
import type { RegistryDrillDown } from "@/App";

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);

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

const C = { done: "#16a34a", active: "#d97706", rejected: "#dc2626", excluded: "#94a3b8", analiz: "#2563eb", monitoring: "#7c3aed" };

function KpiCard({ label, value, pct, sub, icon: Icon, tone, selected, onClick }: {
  label: string; value: number; pct?: number; sub?: string; icon: any;
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
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--kc-accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "hsl(var(--foreground))", lineHeight: 1 }}>{value.toLocaleString("ru")}</div>
        {pct !== undefined && (
          <div style={{ fontSize: 12, color: "var(--kc-accent)", marginTop: 3, fontWeight: 600 }}>{pct}%</div>
        )}
        {sub && (
          <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{sub}</div>
        )}
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
              anchor: "end" as const, align: "end" as const, offset: 2,
              color, font: { size: 10, weight: "bold" as const },
              formatter: (v: number) => isCount ? v : v + "%",
            },
            tooltip: { callbacks: { label: (ctx: any) => isCount ? ` ${ctx.parsed.x}` : ` ${ctx.parsed.x}%` } },
          },
        }}
      />
    </div>
  );
}

function StackedHBarChart({ items, onClickLabel }: {
  items: { label: string; done: number; total: number; pct: number }[];
  onClickLabel?: (label: string) => void;
}) {
  const labels = items.map(x => x.label);
  const h = Math.max(120, items.length * 34 + 70);
  return (
    <div style={{ height: h, position: "relative" }}>
      <Bar
        data={{
          labels,
          datasets: [
            { label: "Исполнено", data: items.map(x => x.done), backgroundColor: C.done + "cc", hoverBackgroundColor: C.done, stack: "s", borderRadius: 2 },
            { label: "Не исполнено", data: items.map(x => x.total - x.done), backgroundColor: "#94a3b888", hoverBackgroundColor: "#94a3b8", stack: "s", borderRadius: 2 },
          ],
        }}
        options={{
          indexAxis: "y" as const,
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { right: 8 } },
          onClick: (_: any, elements: any[]) => {
            if (!elements.length || !onClickLabel) return;
            onClickLabel(labels[elements[0].index]);
          },
          onHover: (event: any, elements: any[]) => {
            const canvas = event.native?.target as HTMLCanvasElement;
            if (canvas) canvas.style.cursor = elements.length && onClickLabel ? "pointer" : "default";
          },
          scales: {
            x: { stacked: true, border: { display: false }, grid: { color: "rgba(100,116,139,0.12)" }, ticks: { color: "#64748b", font: { size: 10 } } },
            y: {
              stacked: true, border: { display: false }, grid: { display: false },
              ticks: {
                color: "#64748b", font: { size: 10 },
                callback: (_: any, i: number) => { const l = labels[i] || ""; return l.length > 28 ? l.slice(0, 26) + "…" : l; },
              },
            },
          },
          plugins: {
            legend: { display: true, position: "top" as const, labels: { color: "#64748b", boxWidth: 10, font: { size: 11 } } },
            datalabels: {
              display: (ctx: any) => ctx.datasetIndex === 0 && (items[ctx.dataIndex]?.done ?? 0) > 0,
              anchor: "center" as const, align: "center" as const,
              color: "#fff", font: { size: 10, weight: "bold" as const },
              formatter: (_v: number, ctx: any) => { const it = items[ctx.dataIndex]; return it ? it.pct + "%" : ""; },
            },
            tooltip: {
              callbacks: {
                label: (ctx: any) => {
                  const it = items[ctx.dataIndex];
                  if (!it) return "";
                  return ctx.datasetIndex === 0 ? ` Исполнено: ${it.done} (${it.pct}%)` : ` Не исполнено: ${it.total - it.done}`;
                },
              },
            },
          },
        }}
      />
    </div>
  );
}

const CYCLE_STATUS_LABELS = ["Исполнено", "В работе", "Отклонено", "Исключено"] as const;

type StatusFilter = "В работе" | "Исполнено" | "Отклонено" | "Исключено" | null;

const STATUS_KEY_MAP: Record<string, keyof DashboardSummary["byCycleStatus"][0]> = {
  "Исполнено": "done", "В работе": "active", "Отклонено": "rejected", "Исключено": "excluded",
};
const STATUS_COLOR_MAP: Record<string, string> = {
  "Исполнено": C.done, "В работе": C.active, "Отклонено": C.rejected, "Исключено": C.excluded,
};

export default function DashboardPage({ onDrillDown }: { onDrillDown?: (f: RegistryDrillDown) => void }) {
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>(null);

  const { data: stats, isLoading, error } = useQuery<DashboardSummary>({
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
    const status = CYCLE_STATUS_LABELS[datasetIndex as 0 | 1 | 2 | 3];
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
        { label: "Отклонено", data: items.map(x => x.rejected), backgroundColor: C.rejected, stack: "s" },
        { label: "Исключено", data: items.map(x => x.excluded), backgroundColor: C.excluded, stack: "s" },
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

  if (isLoading) return <div className="content"><div className="card" style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Загрузка...</div></div>;
  if (error || !stats) return <div className="card error">Не удалось загрузить данные.</div>;

  const completionFormItems = (stats.byCompletionForm ?? []).map(r => ({ label: r.completion_form, done: r.done, total: r.total, pct: r.pct }));

  return (
    <div className="content" style={{ gap: 16 }}>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        <KpiCard label="Всего" value={stats.totals.all} icon={ListChecks} tone="blue"
          selected={selectedStatus === null} onClick={() => setSelectedStatus(null)} />
        <KpiCard label="В работе" value={stats.totals.active} pct={pct(stats.totals.active)} icon={Clock} tone="amber"
          selected={selectedStatus === "В работе"} onClick={() => toggleStatus("В работе")} />
        <KpiCard label="Исполнено" value={stats.totals.done} pct={pct(stats.totals.done)} icon={CheckCircle2} tone="green"
          selected={selectedStatus === "Исполнено"} onClick={() => toggleStatus("Исполнено")} />
        <KpiCard label="Отклонено" value={stats.totals.rejected} pct={pct(stats.totals.rejected)} icon={XCircle} tone="red"
          selected={selectedStatus === "Отклонено"} onClick={() => toggleStatus("Отклонено")} />
        <KpiCard label="Исключено" value={stats.totals.excluded} pct={pct(stats.totals.excluded)} icon={Ban} tone="slate"
          selected={selectedStatus === "Исключено"} onClick={() => toggleStatus("Исключено")} />
        <KpiCard label="Просроченные" value={stats.totals.overdue} sub="срок прошёл, не исп." icon={AlertCircle} tone="violet" />
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
          <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>{stats.totals.done} из {stats.totals.all} · <strong style={{ color: "#16a34a" }}>{overallPct}%</strong></span>
        </div>
        <div style={{ height: 14, background: "hsl(var(--border))", borderRadius: 8, overflow: "hidden", display: "flex" }}>
          {[{ val: stats.totals.done, color: C.done }, { val: stats.totals.active, color: C.active }, { val: stats.totals.rejected, color: C.rejected }, { val: stats.totals.excluded, color: C.excluded }]
            .map(({ val, color }, i) => (
              <div key={i} style={{ width: `${(val / stats.totals.all) * 100}%`, background: color, height: "100%", transition: "width 0.5s" }} />
            ))}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 8, flexWrap: "wrap" }}>
          {[{ label: "Исполнено", val: stats.totals.done, color: C.done }, { label: "В работе", val: stats.totals.active, color: C.active }, { label: "Отклонено", val: stats.totals.rejected, color: C.rejected }, { label: "Исключено", val: stats.totals.excluded, color: C.excluded }]
            .map(({ label, val, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{label}: <strong style={{ color: "hsl(var(--foreground))" }}>{val}</strong></span>
              </div>
            ))}
        </div>
      </div>

      {/* 2 графика */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Исполнение по циклам — stacked bar */}
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">Исполнение по циклам</div>
            <div className="card-meta">{onDrillDown ? "Нажмите на столбец — откроется список рекомендаций" : "Структура статусов"}</div>
          </div>
          <Bar data={cycleStackedData} options={{
            responsive: true, maintainAspectRatio: true,
            onClick: handleCycleChartClick,
            onHover: (event: any, elements: any[]) => {
              const canvas = event.native?.target as HTMLCanvasElement;
              if (canvas) canvas.style.cursor = elements.length && onDrillDown ? "pointer" : "default";
            },
            plugins: {
              legend: { display: true, position: "bottom" as const, labels: { color: "#64748b", boxWidth: 10, font: { size: 11 } } },
              datalabels: {
                display: (ctx: any) => (ctx.parsed.y ?? 0) >= 10,
                color: "#fff", font: { size: 10, weight: "bold" as const },
                formatter: (v: number) => v > 0 ? v : "",
              },
            },
            scales: {
              x: { stacked: true, ticks: { color: "#64748b", font: { size: 11 } } },
              y: { stacked: true, ticks: { color: "#64748b", font: { size: 11 } } },
            },
          }} />
        </div>

        {/* % исполнения по типам — Line chart */}
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">% исполнения по циклам</div>
            <div className="card-meta">{onDrillDown ? "Нажмите на цикл — увидите все рекомендации этого цикла" : "Анализ vs Мониторинг — динамика"}</div>
          </div>
          <Line data={cycleLineData} options={{
            responsive: true, maintainAspectRatio: true,
            onClick: handleLineChartClick,
            onHover: (event: any, elements: any[]) => {
              const canvas = event.native?.target as HTMLCanvasElement;
              if (canvas) canvas.style.cursor = elements.length && onDrillDown ? "pointer" : "default";
            },
            plugins: {
              legend: { display: true, position: "bottom" as const, labels: { color: "#64748b", boxWidth: 10, font: { size: 11 } } },
              datalabels: {
                display: true,
                color: (ctx: any) => (ctx.dataset as any).borderColor,
                align: "top" as const, offset: 4,
                font: { size: 9, weight: "bold" as const },
                formatter: (v: number) => v + "%",
              },
            },
            scales: {
              x: { ticks: { color: "#64748b", font: { size: 11 } } },
              y: { min: 0, max: 100, ticks: { color: "#64748b", font: { size: 11 }, callback: (v: any) => v + "%" } },
            },
          }} />
        </div>
      </div>

      {/* Эффективность по форме завершения */}
      {completionFormItems.length > 0 && (
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">Эффективность по форме завершения</div>
            <div className="card-meta">Как уровень адресата влияет на % исполнения</div>
          </div>
          <StackedHBarChart items={completionFormItems} />
        </div>
      )}

      {/* Лидеры ГО + Просроченные по исполнителям */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">🏆 Лидеры ГО</div>
            <div className="card-meta">по % исполнения</div>
          </div>
          <HBarChart
            labels={(stats.byOrgStatus ?? []).map(r => r.responsible_org)}
            values={(stats.byOrgStatus ?? []).map(r => r.pct)}
            color={C.done}
            onClickLabel={onDrillDown ? (label) => onDrillDown({ search: label }) : undefined}
          />
        </div>
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">🔴 Просроченные по исполнителям</div>
            <div className="card-meta">Срок истёк в 2024–2025, статус — «В работе»</div>
          </div>
          <HBarChart
            labels={(stats.byOverdueOrg ?? []).map(r => r.responsible_org)}
            values={(stats.byOverdueOrg ?? []).map(r => r.overdue_count)}
            color={C.rejected}
            isCount
            onClickLabel={onDrillDown ? (label) => onDrillDown({ search: label }) : undefined}
          />
        </div>
      </div>

      {/* Лидеры по сферам + Требуют внимания */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">🏆 Лидеры по сферам</div>
            <div className="card-meta">по % исполнения</div>
          </div>
          <HBarChart
            labels={(stats.bySphereStatus ?? []).map(r => r.sphere)}
            values={(stats.bySphereStatus ?? []).map(r => r.pct)}
            color={C.analiz}
            onClickLabel={onDrillDown ? (label) => onDrillDown({ sphere: label }) : undefined}
          />
        </div>
        <div className="card">
          <div className="card-title-row">
            <div className="card-title" style={{ color: "#d97706" }}>⚠️ Требуют внимания</div>
            <div className="card-meta">цикл VII · ≤10% · ≥10 рекомендаций</div>
          </div>
          {(stats.byAttention ?? []).length === 0 ? (
            <div style={{ padding: "12px 0", fontSize: 13, color: "hsl(var(--muted-foreground))" }}>Нет данных по критериям</div>
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
                      padding: "5px 10px", borderRadius: 8,
                      background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))",
                      fontSize: 12, cursor: onDrillDown ? "pointer" : "default",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>{row.responsible_org}</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>·</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>{row.total} рек.</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>·</span>
                    <span style={{ color: C.rejected, fontWeight: 700 }}>{row.pct}%</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>·</span>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>цикл VII</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
