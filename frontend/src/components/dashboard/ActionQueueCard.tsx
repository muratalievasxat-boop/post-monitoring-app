import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ActionItem {
  id: number;
  seq_no: number;
  proposal_text: string;
  responsible_org: string;
  sphere_normalized: string;
  due_raw: string;
  due_sort_key: string;
  cycle: string;
  days_overdue: number;
  priority_tier: "old" | "recent";
}

interface ActionQueueData {
  items: ActionItem[];
  summary: {
    overdue_old: number;
    overdue_recent: number;
    active: number;
    total_attention: number;
  };
}

const PREVIEW_LIMIT = 5;

export default function ActionQueueCard({
  limit = 20,
  onItemClick,
  partialFilter = false,
}: {
  limit?: number;
  onItemClick?: (responsible: string) => void;
  partialFilter?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery<ActionQueueData>({
    queryKey: ["/api/dashboard/action-queue", limit],
    queryFn: () =>
      apiRequest("GET", `/api/dashboard/action-queue?limit=${limit}`).then((r) => r.json()),
  });

  if (isLoading) return <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />;
  if (!data) return null;

  const { items, summary } = data;
  const isEmpty = items.length === 0;
  const visibleItems = expanded ? items : items.slice(0, PREVIEW_LIMIT);

  return (
    <div className="card" style={{ borderLeft: "3px solid #dc2626" }}>
      <div className="card-title-row">
        <div className="card-title" style={{ color: "#dc2626" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={14} />Очередь действий
          </span>
        </div>
        <div className="card-meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          просроченные активные рекомендации
          {partialFilter && (
            <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 6px", background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", borderRadius: 4, border: "1px solid hsl(var(--border))", whiteSpace: "nowrap" }}>
              фильтр не применён
            </span>
          )}
        </div>
      </div>

      {!isEmpty && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {summary.overdue_old > 0 && (
            <span style={{ padding: "2px 8px", borderRadius: 5, background: "#dc262618", color: "#dc2626", fontSize: 11, fontWeight: 700, border: "1px solid #dc262630" }}>
              {summary.overdue_old} {summary.overdue_old === 1 ? "критически просрочена" : "критически просрочено"}
            </span>
          )}
          {summary.overdue_recent > 0 && (
            <span style={{ padding: "2px 8px", borderRadius: 5, background: "#d9770618", color: "#d97706", fontSize: 11, fontWeight: 700, border: "1px solid #d9770630" }}>
              {summary.overdue_recent} просрочено &lt;1 года
            </span>
          )}
        </div>
      )}

      {isEmpty ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "28px 0", color: "hsl(var(--status-done))" }}>
          <CheckCircle2 size={32} strokeWidth={1.5} />
          <div style={{ fontWeight: 600, fontSize: 14, color: "hsl(var(--status-done))" }}>
            Нет просроченных рекомендаций
          </div>
          <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", textAlign: "center" }}>
            Все активные рекомендации выполняются в срок
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {visibleItems.map((item) => (
              <div
                key={item.id}
                onClick={onItemClick ? () => onItemClick(item.responsible_org) : undefined}
                style={{
                  padding: "7px 10px",
                  borderRadius: 7,
                  background: item.priority_tier === "old" ? "#dc262608" : "#d9770608",
                  border: `1px solid ${item.priority_tier === "old" ? "#dc262630" : "#d9770630"}`,
                  cursor: onItemClick ? "pointer" : "default",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                  <span style={{
                    flexShrink: 0,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: item.priority_tier === "old" ? "#dc2626" : "#d97706",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: "16px",
                    whiteSpace: "nowrap",
                  }}>
                    +{item.days_overdue}д
                  </span>
                  <span style={{ fontSize: 12, color: "hsl(var(--foreground))", lineHeight: 1.4 }}>
                    {item.proposal_text?.length > 120
                      ? item.proposal_text.slice(0, 118) + "…"
                      : item.proposal_text}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: 2, marginTop: 1 }}>
                  {item.responsible_org && (
                    <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                      {item.responsible_org.length > 32 ? item.responsible_org.slice(0, 30) + "…" : item.responsible_org}
                    </span>
                  )}
                  {item.due_raw && (
                    <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", fontStyle: "italic" }}>
                      до {item.due_raw}
                    </span>
                  )}
                  {item.cycle && (
                    <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                      цикл {item.cycle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {items.length > PREVIEW_LIMIT && (
            <button
              onClick={() => setExpanded((e) => !e)}
              style={{
                marginTop: 8,
                background: "none",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
                color: "hsl(var(--muted-foreground))",
                width: "100%",
              }}
            >
              {expanded ? "Свернуть" : `Показать все ${items.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
