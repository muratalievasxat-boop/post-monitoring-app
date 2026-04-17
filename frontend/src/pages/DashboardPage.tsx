import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Ban,
  ListChecks,
} from "lucide-react";

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

interface DashboardSummary {
  totals: {
    all: number;
    active: number;
    done: number;
    rejected: number;
    excluded: number;
    unknown: number;
    overdue: number;
  };
  bySphere: { sphere: string; count: number }[];
  byResponsibleOrg: { responsible_org: string; count: number }[];
  byCycle: { cycle: string; count: number }[];
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: any;
  tone: "blue" | "amber" | "green" | "red" | "slate" | "violet";
}) {
  const toneMap = {
    blue: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    amber: { bg: "#fffbeb", text: "#b45309", border: "#fcd34d" },
    green: { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
    red: { bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5" },
    slate: { bg: "#f8fafc", text: "#475569", border: "#cbd5e1" },
    violet: { bg: "#f5f3ff", text: "#6d28d9", border: "#c4b5fd" },
  }[tone];

  return (
    <div
      className="card"
      style={{
        background: toneMap.bg,
        borderColor: toneMap.border,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: toneMap.text,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
        <Icon size={18} color={toneMap.text} />
      </div>

      <div
        style={{
          fontSize: 34,
          lineHeight: 1,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 6,
        }}
      >
        {value.toLocaleString("ru")}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
    queryFn: () => apiRequest("GET", "/api/dashboard/summary").then((r) => r.json()),
  });

  const sphereData = useMemo(() => {
    const items = [...(stats?.bySphere ?? [])].slice(0, 10);
    return {
      labels: items.map((x) => x.sphere),
      datasets: [
        {
          label: "Количество рекомендаций",
          data: items.map((x) => x.count),
          backgroundColor: "#2563eb",
          borderRadius: 6,
        },
      ],
    };
  }, [stats]);

  const orgData = useMemo(() => {
    const items = [...(stats?.byResponsibleOrg ?? [])].slice(0, 10);
    return {
      labels: items.map((x) => x.responsible_org),
      datasets: [
        {
          label: "Количество рекомендаций",
          data: items.map((x) => x.count),
          backgroundColor: "#7c3aed",
          borderRadius: 6,
        },
      ],
    };
  }, [stats]);

  const cycleData = useMemo(() => {
    const items = [...(stats?.byCycle ?? [])];
    return {
      labels: items.map((x) => `Цикл ${x.cycle}`),
      datasets: [
        {
          label: "Количество рекомендаций",
          data: items.map((x) => x.count),
          borderColor: "#0f766e",
          backgroundColor: "rgba(15, 118, 110, 0.15)",
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [stats]);

  if (isLoading) {
    return (
      <div className="content">
        <div className="grid-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card loading" style={{ minHeight: 120 }}>
              Загрузка...
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="card error">
        Не удалось загрузить данные дашборда.
      </div>
    );
  }

  return (
    <div className="content">
      <div
        className="grid-3"
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
      >
        <KpiCard label="Всего" value={stats.totals.all} icon={ListChecks} tone="blue" />
        <KpiCard label="В работе" value={stats.totals.active} icon={Clock} tone="amber" />
        <KpiCard label="Исполнено" value={stats.totals.done} icon={CheckCircle2} tone="green" />
        <KpiCard label="Отклонено" value={stats.totals.rejected} icon={XCircle} tone="red" />
        <KpiCard label="Исключено" value={stats.totals.excluded} icon={Ban} tone="slate" />
        <KpiCard label="Без статуса" value={stats.totals.unknown} icon={AlertCircle} tone="violet" />
      </div>

      <div className="grid-3">
        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">Топ-10 сфер</div>
            <div className="card-meta">По количеству рекомендаций</div>
          </div>
          <Bar
            data={sphereData}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: "#64748b", maxRotation: 0, minRotation: 0 } },
                y: { ticks: { color: "#64748b" } },
              },
            }}
          />
        </div>

        <div className="card chart-card">
          <div className="card-title-row">
            <div className="card-title">Топ-10 ГО</div>
            <div className="card-meta">Ответственные органы</div>
          </div>
          <Bar
            data={orgData}
            options={{
              indexAxis: "y",
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: "#64748b" } },
                y: { ticks: { color: "#64748b" } },
              },
            }}
          />
        </div>
      </div>

      <div className="card chart-card">
        <div className="card-title-row">
          <div className="card-title">Распределение по циклам</div>
          <div className="card-meta">Количество рекомендаций</div>
        </div>
        <Line
          data={cycleData}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: "#64748b" } },
              y: { ticks: { color: "#64748b" } },
            },
          }}
        />
      </div>
    </div>
  );
}
