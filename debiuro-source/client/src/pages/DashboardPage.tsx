import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import {
  Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Title, BubbleController
} from "chart.js";
import { Bar, Line, Bubble } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { CheckCircle2, Clock, XCircle, AlertCircle, Hash, AlertTriangle } from "lucide-react";

ChartJS.register(
  ArcElement, BarElement, LineElement, PointElement, BubbleController,
  CategoryScale, LinearScale, Tooltip, Legend, Title, ChartDataLabels
);

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byCycle: { cycle: string; total: number; done: number; inWork: number; rejected: number; noStatus: number; doneAnalysis: number; doneMonitoring: number; totalAnalysis: number; totalMonitoring: number }[];
  bySphere: { sphere: string; count: number; done: number; inWork: number; rejected: number }[];
  byExec: { responsible: string; count: number; done: number }[];
  byType: Record<string, number>;
  byForm: { form: string; total: number; done: number }[];
  overdue: number;
  overdueByExec: { responsible: string; count: number }[];
  needsAttention: { responsible: string; count: number; done: number; cycles: string[] }[];
  needsAttentionLive: { responsible: string; count: number; done: number; cycles: string[] }[];
  liveCycles: string[];
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}
function textColor() { return isDark() ? "#94a3b8" : "#64748b"; }

function KpiCard({ label, value, sub, color, icon: Icon, active, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`
        border rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden select-none
        transition-all duration-150
        ${active
          ? "ring-2 ring-offset-2 shadow-lg scale-[1.03] cursor-pointer"
          : "bg-card hover:shadow-md hover:scale-[1.02] cursor-pointer"}
      `}
      style={{
        borderColor: active ? color : undefined,
        backgroundColor: active ? `${color}18` : undefined,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl transition-all duration-150" style={{ background: color }} />
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{label}</span>
        <Icon size={16} style={{ color }} />
      </div>
      <span className="text-3xl font-bold tabular-nums leading-none">{typeof value === 'number' ? value.toLocaleString('ru') : value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
      {active && (
        <span className="absolute bottom-1.5 right-2 text-[10px] font-bold" style={{ color }}>● фильтр активен</span>
      )}
    </div>
  );
}

function pct(done: number, total: number) {
  return total ? Math.round(done / total * 100) : 0;
}

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [formView, setFormView] = useState<"bar" | "bubble">("bar");
  const [, navigate] = useLocation();

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
  });

  // ---- All hooks MUST be before any early return ----
  const bySphere = stats?.bySphere ?? [];
  const byExec = stats?.byExec ?? [];
  const byCycle = stats?.byCycle ?? [];
  const byForm = stats?.byForm ?? [];

  // Sphere chart — filtered by active KPI, sorted desc
  const sphereChartData = useMemo(() => {
    let pairs = bySphere.map(s => {
      let v: number;
      if (!activeFilter || activeFilter === "Просроченные") v = s.count;
      else if (activeFilter === "Исполнено") v = s.done;
      else if (activeFilter === "В работе") v = s.inWork;
      else if (activeFilter === "Не поддерживается") v = s.rejected;
      else v = s.count - s.done - s.inWork - s.rejected;
      return { label: s.sphere, value: v };
    });
    // Sort desc when filter active, keep original order otherwise
    if (activeFilter) pairs = [...pairs].sort((a, b) => b.value - a.value);
    return {
      labels: pairs.map(p => p.label),
      datasets: [{
        label: activeFilter ? `Сфера (${activeFilter})` : "Всего",
        data: pairs.map(p => p.value),
        backgroundColor: activeFilter === "Исполнено" ? "#16a34a"
          : activeFilter === "В работе" ? "#d97706"
          : activeFilter === "Не поддерживается" ? "#dc2626"
          : "#2563eb",
      }]
    };
  }, [activeFilter, bySphere]);

  // Exec chart — filtered, sorted desc
  const execChartData = useMemo(() => {
    let pairs = byExec.map(e => {
      let v: number;
      if (!activeFilter || activeFilter === "Просроченные") v = e.count;
      else if (activeFilter === "Исполнено") v = e.done;
      else v = e.count;
      return { label: e.responsible, value: v };
    });
    pairs = [...pairs].sort((a, b) => b.value - a.value).slice(0, 10);
    return {
      labels: pairs.map(p => p.label),
      datasets: [{
        label: activeFilter ? `Исполнитель (${activeFilter})` : "Всего",
        data: pairs.map(p => p.value),
        backgroundColor: activeFilter === "Исполнено" ? "#16a34a"
          : activeFilter === "В работе" ? "#d97706"
          : activeFilter === "Не поддерживается" ? "#dc2626"
          : "#7c3aed",
      }]
    };
  }, [activeFilter, byExec]);

  // Cycle line chart — 2 lines: Анализ vs Мониторинг
  const cycleLineData = useMemo(() => ({
    labels: byCycle.map(c => `Цикл ${c.cycle}`),
    datasets: [
      {
        label: "Анализ (% исполнено)",
        data: byCycle.map(c => pct(c.doneAnalysis ?? 0, c.totalAnalysis ?? 1)),
        borderColor: "#2563eb",
        backgroundColor: "#2563eb33",
        tension: 0.3,
        pointRadius: 0,          // hide circles — labels carry the values
        pointHoverRadius: 5,     // show on hover
        pointHoverBackgroundColor: "#2563eb",
        fill: false,
      },
      {
        label: "Мониторинг (% исполнено)",
        data: byCycle.map(c => pct(c.doneMonitoring ?? 0, c.totalMonitoring ?? 1)),
        borderColor: "#16a34a",
        backgroundColor: "#16a34a33",
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#16a34a",
        fill: false,
      },
    ]
  }), [byCycle]);

  // Form completion — BAR version
  const formBarData = useMemo(() => ({
    labels: byForm.map(f => f.form),
    datasets: [
      {
        label: "Исполнено",
        data: byForm.map(f => f.done),
        backgroundColor: "#16a34a",
      },
      {
        label: "Не исполнено",
        data: byForm.map(f => f.total - f.done),
        backgroundColor: "#e2e8f0",
      },
    ]
  }), [byForm]);

  // Form completion — BUBBLE version
  const bubbleData = useMemo(() => ({
    datasets: [{
      label: "Форма завершения",
      data: byForm.map(f => ({
        x: f.total,
        y: pct(f.done, f.total),
        r: Math.max(6, Math.sqrt(f.total) * 2.5),
        _label: f.form,
      })),
      backgroundColor: byForm.map(f => {
        const p = pct(f.done, f.total);
        if (p >= 50) return "#16a34a99";
        if (p >= 30) return "#d9780699";
        return "#dc262699";
      }),
      borderColor: byForm.map(f => {
        const p = pct(f.done, f.total);
        if (p >= 50) return "#16a34a";
        if (p >= 30) return "#d97706";
        return "#dc2626";
      }),
    }]
  }), [byForm]);

  // ---- End of hooks ----

  if (isLoading || !stats) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { total, byStatus, overdue, overdueByExec, needsAttention, needsAttentionLive, liveCycles } = stats;
  const done = byStatus["Исполнено"] ?? 0;
  const inWork = byStatus["В работе"] ?? 0;
  const rejected = byStatus["Не поддерживается"] ?? 0;
  const noStatus = total - done - inWork - rejected;

  const lineOpts: any = {
    responsive: true, maintainAspectRatio: false,
    // Extra padding so top labels don't clip
    layout: { padding: { top: 24, bottom: 16 } },
    plugins: {
      datalabels: {
        display: true,
        // Анализ (dataset 0, blue): labels above line; Мониторинг (dataset 1, green): labels below line
        // This separates them even when values are close (e.g. Цикл IV: 32% vs 22%)
        align: (ctx: any) => ctx.datasetIndex === 0 ? ('top' as const) : ('bottom' as const),
        anchor: (ctx: any) => ctx.datasetIndex === 0 ? ('end' as const) : ('start' as const),
        // Label color matches the line color for instant visual association
        color: (ctx: any) => ctx.datasetIndex === 0 ? '#2563eb' : '#16a34a',
        font: { size: 10, weight: 'bold' as const },
        formatter: (v: number) => v > 0 ? v + '%' : '',
        // Push label away from the point circle
        offset: 6,
        backgroundColor: (ctx: any) => {
          // Subtle halo behind the label so it reads against the line/point
          return isDark() ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.75)';
        },
        borderRadius: 2,
        padding: { top: 1, bottom: 1, left: 2, right: 2 },
      },
      legend: { labels: { color: textColor(), font: { size: 12 } } },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` } }
    },
    scales: {
      x: { ticks: { color: textColor(), font: { size: 11 } }, grid: { display: false } },
      y: {
        min: 0, max: 100,
        ticks: { color: textColor(), font: { size: 11 }, callback: (v: any) => v + "%" },
        grid: { color: isDark() ? "#1e293b" : "#f1f5f9" }
      }
    },
  };

  const bubbleOpts: any = {
    responsive: true, maintainAspectRatio: false,
    // Cursor changes to pointer to hint clickability
    onHover: (_: any, elements: any[]) => {},
    onClick: (_: any, elements: any[]) => {
      if (!elements.length) return;
      const idx = elements[0].index;
      const form = byForm[idx]?.form;
      if (form) {
        // Navigate to registry with completionForm filter pre-set
        navigate(`/registry?form=${encodeURIComponent(form)}`);
      }
    },
    scales: {
      x: {
        title: { display: true, text: "Количество рекомендаций", color: textColor(), font: { size: 11 } },
        ticks: { color: textColor(), font: { size: 11 } }
      },
      y: {
        min: 0, max: 100,
        title: { display: true, text: "% исполнения", color: textColor(), font: { size: 11 } },
        ticks: { color: textColor(), font: { size: 11 }, callback: (v: any) => v + "%" }
      }
    },
    plugins: {
      datalabels: { display: false },
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const d = ctx.raw as any;
            return [`Форма: ${d._label}`, `Рекомендаций: ${d.x}`, `Исполнено: ${d.y}%`, '→ кликните чтобы открыть в реестре'];
          }
        }
      }
    }
  };

  const hbarOpts = (stacked = false): any => ({
    indexAxis: 'y' as const,
    responsive: true, maintainAspectRatio: false,
    layout: stacked ? { padding: { right: 0 } } : { padding: { right: 32 } },
    scales: {
      x: { stacked, ticks: { color: textColor(), font: { size: 11 } } },
      y: { stacked, ticks: { color: textColor(), font: { size: 11 } } }
    },
    plugins: {
      legend: { display: stacked, labels: { color: textColor(), font: { size: 11 } } },
      datalabels: stacked ? {
        // Only show on the "Исполнено" segment (dataset 0)
        display: (ctx: any) => ctx.datasetIndex === 0,
        // Always place INSIDE the green segment — centered
        anchor: 'center' as const,
        align: 'center' as const,
        // Always white text + semi-transparent dark background pill
        // This makes it readable regardless of whether background is green or grey
        color: '#fff',
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 3,
        padding: { top: 2, bottom: 2, left: 4, right: 4 },
        font: { size: 10, weight: 'bold' as const },
        formatter: (v: number, ctx: any) => {
          const total = ctx.chart.data.datasets.reduce((s: number, ds: any) => s + (ds.data[ctx.dataIndex] ?? 0), 0);
          if (!total || v === 0) return '';
          const p = Math.round(v / total * 100);
          // Only show if the segment is wide enough to hold the label (>=5%)
          return p >= 5 ? p + '%' : '';
        },
      } : {
        anchor: 'end' as const,
        align: 'end' as const,
        color: textColor(),
        font: { size: 10, weight: 'bold' as const },
        formatter: (v: number) => v > 0 ? v : '',
      },
    }
  });

  // Overdue by exec (top 8)
  const overdueExecData = overdueByExec?.slice(0, 8) ?? [];

  const kpis = [
    { label: "Всего",              value: total,    sub: "7 циклов",               color: "#2563eb", icon: Hash,          key: null },
    { label: "Исполнено",          value: done,     sub: `${pct(done,total)}%`,    color: "#16a34a", icon: CheckCircle2,  key: "Исполнено" },
    { label: "В работе",           value: inWork,   sub: `${pct(inWork,total)}%`,  color: "#d97706", icon: Clock,         key: "В работе" },
    { label: "Не поддерживается",  value: rejected, sub: `${pct(rejected,total)}%`,color: "#dc2626", icon: XCircle,       key: "Не поддерживается" },
    { label: "Без статуса",        value: noStatus, sub: `${pct(noStatus,total)}%`,color: "#9ca3af", icon: AlertCircle,   key: "Без статуса" },
    { label: "Просроченные",       value: overdue ?? 0, sub: "срок прошёл, не исп.", color: "#7c3aed", icon: AlertTriangle, key: "Просроченные" },
  ];

  // Clicking "Всего" resets filter; clicking active filter also resets it
  function handleKpi(key: string | null) {
    if (key === null) { setActiveFilter(null); return; }
    setActiveFilter(prev => prev === key ? null : key);
  }

  return (
    <div className="p-5 space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <KpiCard
            key={k.label}
            label={k.label} value={k.value} sub={k.sub}
            color={k.color} icon={k.icon}
            active={activeFilter === k.key && k.key !== null}
            onClick={() => handleKpi(k.key)}
          />
        ))}
      </div>

      {activeFilter && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Фильтр: <strong className="text-foreground">{activeFilter}</strong></span>
          <span className="text-xs text-muted-foreground">— нажмите <strong>Всего</strong> или ту же плитку чтобы сбросить</span>
          <button onClick={() => setActiveFilter(null)}
            className="ml-1 text-xs px-2 py-0.5 rounded border border-border hover:bg-muted">✕</button>
        </div>
      )}

      {/* Row 1: Динамика по циклам + Топ сфер */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-1">% исполнения по циклам</p>
          <p className="text-xs text-muted-foreground mb-3">Анализ vs Мониторинг — динамика от цикла к циклу</p>
          <div className="h-56"><Line data={cycleLineData} options={lineOpts} /></div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-1">
            Топ-15 сфер
            {activeFilter && <span className="ml-2 text-xs font-normal text-muted-foreground">→ {activeFilter}</span>}
          </p>
          <div className="h-56">
            <Bar data={sphereChartData} options={hbarOpts(false)} />
          </div>
        </div>
      </div>

      {/* Row 2: Форма завершения — переключатель бар/пузыри */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-sm font-semibold">Эффективность по форме завершения</p>
            <p className="text-xs text-muted-foreground">Как уровень адресата влияет на % исполнения</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setFormView("bar")}
              className={`text-xs px-3 py-1 rounded border transition-colors ${formView === "bar" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            >Бар</button>
            <button
              onClick={() => setFormView("bubble")}
              className={`text-xs px-3 py-1 rounded border transition-colors ${formView === "bubble" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            >Пузыри</button>
          </div>
        </div>
        <div className="h-64">
          {formView === "bar"
            ? <Bar data={formBarData} options={hbarOpts(true)} />
            : <Bubble data={bubbleData} options={bubbleOpts} />
          }
        </div>
        {formView === "bubble" && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Как читать диаграмму:</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block bg-green-600" /><strong className="text-foreground">≥50%</strong> — исполнено больше половины рекомендаций</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block bg-amber-500" /><strong className="text-foreground">30–49%</strong> — выполнена примерно треть, есть резервы</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block bg-red-600" /><strong className="text-foreground">&lt;30%</strong> — исполнено менее трети, требует внимания</span>
            </div>
            <p className="text-xs text-muted-foreground">Размер пузыря — количество рекомендаций. Чем правее и выше — тем больше рекомендаций и выше % исполнения.</p>
            <p className="text-xs font-medium text-primary cursor-default">→ Кликните на пузырь — откроется Реестр с фильтром по этой форме завершения</p>
          </div>
        )}
      </div>

      {/* Row 3: Топ исполнителей + Просроченные */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-1">
            Топ-10 исполнителей
            {activeFilter && <span className="ml-2 text-xs font-normal text-muted-foreground">→ {activeFilter}</span>}
          </p>
          <div className="h-52"><Bar data={execChartData} options={hbarOpts(false)} /></div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-1">Просроченные по исполнителям</p>
          <p className="text-xs text-muted-foreground mb-3">Срок истёк в 2024–2025, статус — «В работе»</p>
          {overdueExecData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет данных</p>
          ) : (
            <div className="space-y-2">
              {overdueExecData.map(e => (
                <div key={e.responsible} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-20 truncate flex-shrink-0">{e.responsible}</span>
                  <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                    <div className="h-full bg-red-500 rounded-sm transition-all"
                      style={{ width: `${Math.min(100, (e.count / overdueExecData[0].count) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-red-600 w-6 text-right">{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Требуют внимания */}
      {(needsAttention.length > 0 || needsAttentionLive.length > 0) && (
        <div className="bg-card border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Требуют внимания</p>
          </div>

          {/* Завершённые циклы */}
          {needsAttention.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">По завершённым циклам — 0% исполнения (≥10 рекомендаций)</p>
              <div className="flex flex-wrap gap-2">
                {needsAttention.map(e => (
                  <div key={e.responsible}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">{e.responsible}</span>
                    <span className="text-xs text-amber-600">{e.count} рек.</span>
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">0%</span>
                    <span className="text-xs text-muted-foreground">циклы {e.cycles.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Живые циклы */}
          {needsAttentionLive.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                По активному циклу {liveCycles.join(', ')} — ≤10% исполнения (≥10 рекомендаций). Цикл ещё не завершён, данные предварительные.
              </p>
              <div className="flex flex-wrap gap-2">
                {needsAttentionLive.map(e => (
                  <div key={e.responsible}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{e.responsible}</span>
                    <span className="text-xs text-slate-500">{e.count} рек.</span>
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">{pct(e.done, e.count)}%</span>
                    <span className="text-xs text-muted-foreground">цикл {e.cycles.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
