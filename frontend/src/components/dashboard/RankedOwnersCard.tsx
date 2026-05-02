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
  if (metric === "volume")   return `${row.total} рек.`;
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
      <div className="card ro-card">
        {/* Header */}
        <div className="ro-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span className="ro-title"><Users size={13} />Топ ведомств</span>
            {partialFilter && (
              <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 6px", background: "hsl(var(--bg-elevated))", color: "hsl(var(--fg-meta))", borderRadius: 4, border: "1px solid hsl(var(--border-hair))", whiteSpace: "nowrap" }}>
                фильтр не применён
              </span>
            )}
          </div>

          {/* Desktop segmented control */}
          <div className="seg">
            {METRICS.map(({ key, label }) => (
              <button
                key={key}
                className={metric === key ? "on" : undefined}
                onClick={() => handleMetric(key)}
                style={{ opacity: isFetching && metric !== key ? 0.6 : 1 }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Mobile select */}
          <select
            className="seg-mobile"
            value={metric}
            onChange={(e) => handleMetric(e.target.value as Metric)}
          >
            {METRICS.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div>
            {Array.from({ length: PREVIEW }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid hsl(var(--border-hair))" }}>
                <div className="skeleton" style={{ width: 18, height: 12, borderRadius: 3, flexShrink: 0 }} />
                <div className="skeleton" style={{ flex: 1, height: 14, borderRadius: 4 }} />
                <div className="skeleton" style={{ width: 80, height: 6, borderRadius: 3 }} />
                <div className="skeleton" style={{ width: 48, height: 14, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "hsl(var(--fg-meta))" }}>
            Недостаточно данных
          </div>
        ) : (
          <>
            <div>
              {visibleRows.map((row, idx) => {
                const bw = barWidth(metric, row, maxVal);
                const bc = barColor(metric, row);
                const val = rowValue(metric, row);

                return (
                  <div
                    key={row.org}
                    className="ro-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRowClick(row)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRowClick(row);
                      }
                    }}
                  >
                    <span className="ro-rank">{idx + 1}</span>
                    <span className="ro-name">{row.org}</span>
                    <div className="ro-bar">
                      <div className="ro-bar-fill" style={{ width: `${bw}%`, background: bc }} />
                    </div>
                    <span className="ro-val">{val}</span>
                  </div>
                );
              })}
            </div>

            {isMobile && data.length > PREVIEW && (
              <button
                onClick={() => setExpanded((e) => !e)}
                style={{
                  width: "100%", padding: "10px", textAlign: "center",
                  fontSize: 12, fontWeight: 600, color: "hsl(var(--accent))",
                  background: "transparent", border: "none",
                  borderTop: "1px solid hsl(var(--border-hair))",
                  cursor: "pointer",
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
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end" }}
          onClick={() => setPopover(null)}
        >
          <div
            style={{ background: "hsl(var(--bg-card))", padding: "24px 20px 32px", borderRadius: "16px 16px 0 0", width: "100%", boxShadow: "0 -4px 24px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: 15, color: "hsl(var(--fg-headline))", marginBottom: 6 }}>
              {popover.org}
            </div>
            <div style={{ fontSize: 13, color: "hsl(var(--fg-meta))", marginBottom: 20 }}>
              {popover.total} рек. · {popover.pct_done}% исп. · {popover.overdue} просрочены
            </div>
            {onItemClick && (
              <button
                onClick={() => { onItemClick(popover.org); setPopover(null); }}
                style={{ width: "100%", padding: "13px", background: "hsl(var(--accent))", color: "hsl(var(--bg-page))", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                Открыть в реестре
              </button>
            )}
            <button
              onClick={() => setPopover(null)}
              style={{ width: "100%", marginTop: 10, padding: "10px", background: "none", border: "1px solid hsl(var(--border-hair))", borderRadius: 10, fontSize: 14, cursor: "pointer", color: "hsl(var(--fg-meta))" }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </>
  );
}
