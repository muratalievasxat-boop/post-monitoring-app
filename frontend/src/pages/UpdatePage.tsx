import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { History } from "lucide-react";

interface HistoryItem {
  id: number;
  record_id: number;
  old_status: string | null;
  new_status: string | null;
  comment: string | null;
  changed_at: string;
}

function getStatusColor(status?: string | null): string {
  const s = (status || "").toLowerCase().trim();
  if (s === "исполнено") return "#16a34a";
  if (s.startsWith("в работе")) return "#2563eb";
  if (s.startsWith("не поддерживается")) return "#dc2626";
  if (s.includes("снятия с контроля")) return "#d97706";
  return "#94a3b8";
}

function StatusPill({ status }: { status: string | null }) {
  return (
    <span style={{
      background: getStatusColor(status),
      color: "#fff", borderRadius: 6,
      padding: "2px 8px", fontSize: 11, fontWeight: 600,
      whiteSpace: "nowrap", display: "inline-block",
    }}>
      {status || "—"}
    </span>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

export default function UpdatePage() {
  const { data: history, isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["/api/status-history/recent"],
    queryFn: () => apiRequest("GET", "/api/status-history/recent").then(r => r.json()),
    refetchInterval: 30_000,
  });

  const items = history ?? [];

  return (
    <div className="content" style={{ gap: 16 }}>
      <div className="card" style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <History size={16} style={{ color: "hsl(var(--muted-foreground))" }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: "hsl(var(--foreground))" }}>
            История изменений статусов
          </span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
            Последние {items.length} записей
          </span>
        </div>
        <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", margin: "0 0 14px" }}>
          Все изменения статусов фиксируются автоматически при редактировании в Реестре.
        </p>

        {isLoading ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            Загрузка...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            Изменений пока нет. Они появятся после обновления статусов в Реестре.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {items.map(h => (
              <div key={h.id} style={{
                display: "flex", gap: 14, alignItems: "flex-start",
                padding: "10px 0",
                borderBottom: "1px solid hsl(var(--border))",
              }}>
                <div style={{ flexShrink: 0, minWidth: 130, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                  {fmtDate(h.changed_at)}
                </div>
                <div style={{ flexShrink: 0, fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                  Запись #{h.record_id}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <StatusPill status={h.old_status} />
                  <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>→</span>
                  <StatusPill status={h.new_status} />
                  {h.comment && (
                    <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", fontStyle: "italic" }}>
                      · {h.comment}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
