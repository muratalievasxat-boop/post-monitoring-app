import { cn } from "@/lib/utils";

export function statusClass(status: string): string {
  if (!status) return "status-nodata";
  if (status === "Исполнено") return "status-done";
  if (status === "В работе") return "status-inwork";
  if (status === "Не поддерживается") return "status-rejected";
  return "status-nodata";
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap",
      statusClass(status)
    )}>
      {status || "Не указано"}
    </span>
  );
}
