import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import HeatmapMatrix, { type HeatmapDatum } from "@/components/charts/HeatmapMatrix";
import SphereTreemap, { type SphereDatum } from "@/components/charts/SphereTreemap";
import { BarChart2 } from "lucide-react";

type Mode = "heatmap" | "treemap";

const STORAGE_KEY = "dashboard.sphere-cycle.mode";

function readMode(): Mode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "treemap" ? "treemap" : "heatmap";
  } catch {
    return "heatmap";
  }
}

export default function SphereCycleCard({
  onClickCell,
  partialFilter = false,
}: {
  onClickCell?: (sphere: string, cycle?: string) => void;
  partialFilter?: boolean;
}) {
  const [mode, setMode] = useState<Mode>(readMode);

  function handleMode(m: Mode) {
    setMode(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* noop */ }
  }

  const { data: matrix, isLoading: matrixLoading } = useQuery<HeatmapDatum[]>({
    queryKey: ["/api/dashboard/sphere-cycle-matrix"],
    queryFn: () =>
      apiRequest("GET", "/api/dashboard/sphere-cycle-matrix").then((r) => r.json()),
    enabled: mode === "heatmap",
  });

  const { data: totals, isLoading: totalsLoading } = useQuery<SphereDatum[]>({
    queryKey: ["/api/dashboard/sphere-totals"],
    queryFn: () =>
      apiRequest("GET", "/api/dashboard/sphere-totals").then((r) => r.json()),
    enabled: mode === "treemap",
  });

  const isLoading = mode === "heatmap" ? matrixLoading : totalsLoading;

  return (
    <div className="card">
      <div className="card-title-row" style={{ alignItems: "center" }}>
        <div className="card-title">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <BarChart2 size={14} />Сферы × циклы
          </span>
        </div>
        <div style={{ display: "flex", gap: 0, borderRadius: 7, border: "1px solid hsl(var(--border))", overflow: "hidden", flexShrink: 0 }}>
          {(["heatmap", "treemap"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleMode(m)}
              style={{
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: mode === m ? "hsl(var(--foreground))" : "transparent",
                color: mode === m ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {m === "heatmap" ? "Heatmap" : "Treemap"}
            </button>
          ))}
        </div>
      </div>

      <div className="card-meta" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <span>
          {mode === "heatmap"
            ? "% исполнения — сфера × цикл · нажмите ячейку для фильтрации"
            : "размер = кол-во, цвет = % исполнения · нажмите блок для фильтрации"}
        </span>
        {partialFilter && (
          <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 6px", background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderRadius: 4, border: "1px solid hsl(var(--border))", whiteSpace: "nowrap" }}>
            фильтр не применён
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
      ) : mode === "heatmap" ? (
        <HeatmapMatrix
          data={matrix ?? []}
          onClickCell={onClickCell ? (sphere, cycle) => onClickCell(sphere, cycle) : undefined}
        />
      ) : (
        <SphereTreemap
          data={totals ?? []}
          onClickCell={onClickCell ? (sphere) => onClickCell(sphere) : undefined}
        />
      )}
    </div>
  );
}
