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

  if (isLoading) return (
    <div className="card aq-card">
      <div className="skeleton" style={{ height: 16, width: 160, margin: "14px 16px 10px" }} />
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "10px 16px", borderTop: "1px solid hsl(var(--border-hair))" }}>
          <div className="skeleton" style={{ width: 42, height: 40, borderRadius: 6, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 12, marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 12, width: "60%" }} />
          </div>
        </div>
      ))}
    </div>
  );

  if (!data) return null;

  const { items, summary } = data;
  const isEmpty = items.length === 0;
  const visibleItems = expanded ? items : items.slice(0, PREVIEW_LIMIT);

  return (
    <div className="card aq-card">
      {/* Header */}
      <div className="aq-header">
        <div className="card-title-row" style={{ marginBottom: 0 }}>
          <div className="card-title" style={{ color: "hsl(var(--status-overdue))" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={14} />Очередь действий
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "hsl(var(--fg-meta))" }}>
            просроченные активные
            {partialFilter && (
              <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 6px", background: "hsl(var(--bg-elevated))", color: "hsl(var(--fg-meta))", borderRadius: 4, border: "1px solid hsl(var(--border-hair))", whiteSpace: "nowrap" }}>
                фильтр не применён
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary pills */}
      {!isEmpty && (
        <div className="aq-summary">
          {summary.overdue_old > 0 && (
            <span className="aq-pill aq-pill--crit">
              {summary.overdue_old} критически просрочено
            </span>
          )}
          {summary.overdue_recent > 0 && (
            <span className="aq-pill aq-pill--warn">
              {summary.overdue_recent} просрочено &lt;1 года
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {isEmpty ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "28px 16px", color: "hsl(var(--status-done))" }}>
          <CheckCircle2 size={32} strokeWidth={1.5} />
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            Нет просроченных рекомендаций
          </div>
          <div style={{ fontSize: 12, color: "hsl(var(--fg-meta))", textAlign: "center" }}>
            Все активные рекомендации выполняются в срок
          </div>
        </div>
      ) : (
        <>
          <div className="aq-list">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                className={`aq-row${item.priority_tier === "recent" ? " aq-row--warn" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => onItemClick?.(item.responsible_org)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onItemClick?.(item.responsible_org);
                  }
                }}
              >
                <div className="aq-days">
                  +{item.days_overdue}<br />дн
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="aq-text">{item.proposal_text}</div>
                  <div className="aq-meta">
                    {item.responsible_org && (
                      <span className="aq-meta-org">{item.responsible_org}</span>
                    )}
                    {item.due_raw && <span>срок {item.due_raw}</span>}
                    {item.cycle && <span>Цикл {item.cycle}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length > PREVIEW_LIMIT && (
            <button className="aq-more" onClick={() => setExpanded((e) => !e)}>
              {expanded ? "Свернуть" : `Показать все ${items.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
