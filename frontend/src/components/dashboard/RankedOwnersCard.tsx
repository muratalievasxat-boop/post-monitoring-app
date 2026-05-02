import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Users } from "lucide-react";

type Metric = "volume" | "pct_done" | "overdue";

interface OwnerRow {
  org: string;
  total: number;
  done: number;
  overdue: number;
  pct_done: number;
}

const METRICS: { key: Metric; label: string }[] = [
  { key: "volume",   label: "По объёму" },
  { key: "pct_done", label: "% исп." },
  { key: "overdue",  label: "Просрочка" },
];

const STORAGE_KEY = "dashboard.ranked-owners.metric";
const PREVIEW = 5;
const LIMIT = 15;
const MOBILE_BP = 768;

function readMetric(): Metric {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return (["volume", "pct_done", "overdue"] as Metric[]).includes(v as Metric)
      ? (v as Metric)
      : "volume";
  } catch {
    return "volume";
  }
}

function lerpHex(a: string, b: string, t: number): string {
  const p = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = p(a);
  const [br, bg, bb] = p(b);
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}

function pctFill(pct: number): string {
  const v = Math.max(0, Math.min(100, pct));
  return v < 50 ? lerpHex("#dc2626", "#d97706", v / 50) : lerpHex("#d97706", "#16a34a", (v - 50) / 50);
}

function barColor(metric: Metric, row: OwnerRow): string {
  if (metric === "volume")  return "#64748b";
  if (metric === "overdue") return "#dc2626";
  return pctFill(row.pct_done);
}

function barWidth(metric: Metric, row: OwnerRow, maxVal: number): number {
  if (metric === "pct_done") return row.pct_done;
  const v = metric === "volume" ? row.total : row.overdue;
  return maxVal > 0 ? Math.round(v / maxVal * 100) : 0;
}

function rowValue(metric: Metric, row: OwnerRow): string {
  if (metric === "volume")  return `${row.total} рек.`;
  if (metric === "pct_done") return `${row.pct_done}%`;
  return String(row.overdue);
}

export default function RankedOwnersCard({
  onItemClick,
  partialFilter = false,
}: {
  onItemClick?: (org: string) => void;
  partialFilter?: boolean;
}) {
  const [metric, setMetric] = useState<Metric>(readMetric);
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BP);
  const [popover, setPopover] = useState<OwnerRow | null>(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  function handleMetric(m: Metric) {
    setMetric(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* noop */ }
  }

  const { data = [], isFetching } = useQuery<OwnerRow[]>({
    queryKey: ["/api/dashboard/owners-ranking", metric],
    queryFn: () =>
      apiRequest("GET", `/api/dashboard/owners-ranking?metric=${metric}&limit=${LIMIT}`)
        .then((r) => r.json()),
    placeholderData: keepPreviousData,
  });

  const maxVal = Math.max(
    1,
    ...data.map((r) => (metric === "volume" ? r.total : metric === "overdue" ? r.overdue : 100))
  );

  const visibleRows = isMobile && !expanded ? data.slice(0, PREVIEW) : data;

  function handleRowClick(row: OwnerRow) {
    if (isMobile) {
      setPopover(row);
    } else {
      onItemClick?.(row.org);
    }
  }

  const isLoading = isFetching && data.length === 0;

  return (
    <>
      <div className="card" style={{ position: "relative" }}>
        {/* Header */}
        <div className="card-title-row" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div className="card-title">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Users size={14} />Топ ведомств
            </span>
          </div>
          <div style={{ display: "flex", gap: 0, borderRadius: 7, border: "1px solid hsl(var(--border))", overflow: "hidden", flexShrink: 0 }}>
            {METRICS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleMetric(key)}
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  background: metric === key ? "hsl(var(--foreground))" : "transparent",
                  color: metric === key ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                  transition: "background 0.15s, color 0.15s",
                  opacity: isFetching && metric !== key ? 0.6 : 1,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-meta" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span>
            {metric === "volume" && "по количеству рекомендаций"}
            {metric === "pct_done" && "по доле исполненных"}
            {metric === "overdue" && "по числу просроченных активных"}
          </span>
          {partialFilter && (
            <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 6px", background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderRadius: 4, border: "1px solid hsl(var(--border))", whiteSpace: "nowrap" }}>
              фильтр не применён
            </span>
          )}
        </div>

        {/* Rows */}
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: PREVIEW }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 36, borderRadius: 6 }} />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
            Недостаточно данных
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {visibleRows.map((row) => {
                const bw = barWidth(metric, row, maxVal);
                const bc = barColor(metric, row);
                const val = rowValue(metric, row);
                const truncOrg = row.org.length > 32 ? row.org.slice(0, 30) + "…" : row.org;

                return (
                  <div
                    key={row.org}
                    onClick={() => handleRowClick(row)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "6px 8px",
                      borderRadius: 7,
                      cursor: onItemClick || isMobile ? "pointer" : "default",
                      minHeight: isMobile ? 48 : "auto",
                      justifyContent: "center",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { if (!isMobile) (e.currentTarget as HTMLElement).style.background = "hsl(var(--muted))"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 12, color: "hsl(var(--foreground))", fontWeight: 500 }}>
                        {truncOrg}
                      </span>
                      <span
                        className="data-num"
                        style={{ fontSize: 12, fontWeight: 700, color: "hsl(var(--foreground))", flexShrink: 0, marginLeft: 8 }}
                      >
                        {val}
                      </span>
                    </div>
                    <div style={{ height: 4, background: "hsl(var(--border))", borderRadius: 2, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${bw}%`,
                          background: bc,
                          borderRadius: 2,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {isMobile && data.length > PREVIEW && (
              <button
                onClick={() => setExpanded((e) => !e)}
                style={{
                  marginTop: 8,
                  background: "none",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                  color: "hsl(var(--muted-foreground))",
                  width: "100%",
                }}
              >
                {expanded ? "Свернуть" : `Развернуть до ${data.length}`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Mobile bottom-sheet popover */}
      {popover && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setPopover(null)}
        >
          <div
            style={{
              background: "hsl(var(--card))",
              padding: "24px 20px 32px",
              borderRadius: "16px 16px 0 0",
              width: "100%",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: "hsl(var(--foreground))", marginBottom: 6 }}>
              {popover.org}
            </div>
            <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", marginBottom: 20 }}>
              {popover.total} рек. · {popover.pct_done}% исп. · {popover.overdue} просрочены
            </div>
            {onItemClick && (
              <button
                onClick={() => { onItemClick(popover.org); setPopover(null); }}
                style={{
                  width: "100%", padding: "13px", background: "#2563eb",
                  color: "#fff", border: "none", borderRadius: 10,
                  fontSize: 15, fontWeight: 600, cursor: "pointer",
                }}
              >
                Открыть в реестре
              </button>
            )}
            <button
              onClick={() => setPopover(null)}
              style={{
                width: "100%", marginTop: 10, padding: "10px",
                background: "none", border: "1px solid hsl(var(--border))",
                borderRadius: 10, fontSize: 14, cursor: "pointer",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </>
  );
}
