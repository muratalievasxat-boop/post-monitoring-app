import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Chart as ChartJS, LineElement, PointElement,
  CategoryScale, LinearScale, Filler, Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip);

interface TrendPoint {
  week_start: string; // 'YYYY-MM-DD'
  total: number;
  done: number;
  active: number;
  excluded: number;
  pct_done: number;
}

interface Props {
  weeks?: number;
  title?: string;
}

export default function TrendCard({ weeks = 12, title = "% исполнения" }: Props) {
  const { data, isLoading } = useQuery<TrendPoint[]>({
    queryKey: ["/api/dashboard/trends", weeks],
    queryFn: () =>
      apiRequest("GET", `/api/dashboard/trends?weeks=${weeks}`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="card" style={{ padding: "14px 20px" }}>
        <div className="skeleton" style={{ height: 14, width: 180, borderRadius: 6, marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 36, width: 80, borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton trend-chart-container" style={{ borderRadius: 8 }} />
      </div>
    );
  }

  const points: TrendPoint[] = data ?? [];
  const last = points[points.length - 1];
  const first = points[0];
  const currentPct = last?.pct_done ?? 0;
  const isSinglePoint = points.length <= 1;
  const delta = isSinglePoint ? null : currentPct - (first?.pct_done ?? currentPct);

  // DD.MM labels from 'YYYY-MM-DD' (no Date() to avoid timezone shift)
  const labels = points.map((p) => {
    const [, mm, dd] = p.week_start.split("-");
    return `${dd}.${mm}`;
  });

  const deltaColor = !delta
    ? "hsl(var(--muted-foreground))"
    : delta >= 0
    ? "hsl(var(--status-done))"
    : "hsl(var(--status-overdue))";

  return (
    <div className="card" style={{ padding: "14px 20px" }}>
      {/* Header */}
      <div className="card-title-row" style={{ marginBottom: 8 }}>
        <div className="card-title">{title}</div>
      </div>

      {/* Big number + delta */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span
          className="data-num"
          style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, color: "hsl(var(--foreground))" }}
        >
          {currentPct}%
        </span>
        {delta !== null && (
          <span style={{ fontSize: 13, fontWeight: 500, color: deltaColor }}>
            {delta >= 0 ? "+" : "−"}{Math.abs(delta)}&nbsp;п.п. за&nbsp;{weeks}&nbsp;нед.
          </span>
        )}
      </div>

      {/* Chart or empty */}
      {isSinglePoint ? (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 80,
          color: "hsl(var(--muted-foreground))",
          fontSize: 13,
        }}>
          история ещё не накопилась
        </div>
      ) : (
        <div className="trend-chart-container">
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "% исполнения",
                  data: points.map((p) => p.pct_done),
                  borderColor: "#16a34a",
                  backgroundColor: "rgba(22,163,74,0.10)",
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  pointHoverRadius: 4,
                  pointHoverBackgroundColor: "#16a34a",
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => ` ${ctx.parsed.y}%`,
                  },
                },
                // suppress datalabels if the plugin is globally registered
                datalabels: { display: false } as any,
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: {
                    color: "#64748b",
                    font: { size: 10 },
                    maxTicksLimit: 6,
                    maxRotation: 0,
                  },
                },
                y: {
                  min: 0,
                  max: 100,
                  grid: { color: "rgba(100,116,139,0.12)" },
                  ticks: {
                    color: "#64748b",
                    font: { size: 10 },
                    callback: (v: any) => v + "%",
                    maxTicksLimit: 5,
                  },
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
