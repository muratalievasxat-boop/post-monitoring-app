import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, History } from "lucide-react";

interface HistoryItem {
  id: number; recommendationId: number; oldStatus: string; newStatus: string;
  oldDeadline: string; newDeadline: string; changedBy: string;
  changedAt: string; comment: string;
}

export default function UpdatePage() {
  const [searchQ, setSearchQ] = useState("");

  const { data: history } = useQuery<HistoryItem[]>({
    queryKey: ["/api/history"],
    queryFn: () => apiRequest("GET", "/api/history").then(r => r.json()),
    refetchInterval: 10000,
  });

  const sorted = [...(history || [])].reverse().slice(0, 50);

  return (
    <div className="p-5 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold">История изменений статусов</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Все обновления статусов, зафиксированные в системе. Для изменения статуса — перейдите в <strong>Реестр</strong> и нажмите кнопку «Статус» напротив нужной записи.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Всего изменений</p>
          <p className="text-2xl font-bold tabular-nums">{history?.length ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Последнее изменение</p>
          <p className="text-sm font-semibold">{sorted[0]?.changedAt ?? "–"}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Последний автор</p>
          <p className="text-sm font-semibold">{sorted[0]?.changedBy ?? "–"}</p>
        </div>
      </div>

      {/* History list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <History size={16} className="text-muted-foreground" />
          <span className="font-semibold text-sm">Лента изменений</span>
          <span className="ml-auto text-xs text-muted-foreground">Последние 50 записей</span>
        </div>

        {sorted.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            Изменений пока нет. Они появятся здесь после обновления статусов в Реестре.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map(h => (
              <div key={h.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-bold text-primary">№ {h.recommendationId}</span>
                      <span className="text-xs text-muted-foreground">{h.changedAt}</span>
                      {h.changedBy && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{h.changedBy}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Статус:</span>
                      <StatusBadge status={h.oldStatus || "Не указано"} />
                      <span className="text-muted-foreground text-xs">→</span>
                      <StatusBadge status={h.newStatus} />
                    </div>
                    {h.newDeadline && h.oldDeadline !== h.newDeadline && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Срок: <span className="line-through">{h.oldDeadline}</span> → <strong>{h.newDeadline}</strong>
                      </div>
                    )}
                    {h.comment && (
                      <p className="mt-1 text-xs text-muted-foreground italic">"{h.comment}"</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
