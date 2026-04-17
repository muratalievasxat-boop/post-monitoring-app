import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Info, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Meta {
  spheres: string[];
  cycles: string[];
  statuses: string[];
  types: string[];
  execs: string[];
}

const ALL = "__all__";

export default function ExportPage() {
  const { toast } = useToast();
  const [cycle, setCycle] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sphere, setSphere] = useState(ALL);
  const [exec, setExec] = useState(ALL);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: meta, isLoading: metaLoading } = useQuery<Meta>({
    queryKey: ["/api/recommendations/filters"],
    queryFn: () => apiRequest("GET", "/api/recommendations/filters").then((r) => r.json()),
  });

  const summary = useMemo(() => {
    const parts: string[] = [];
    parts.push(cycle === ALL ? "все циклы" : `цикл ${cycle}`);
    parts.push(status === ALL ? "все статусы" : status.toLowerCase());
    parts.push(sphere === ALL ? "все сферы" : sphere);
    parts.push(exec === ALL ? "все исполнители" : exec);
    return parts.join(" · ");
  }, [cycle, status, sphere, exec]);

  function buildParams() {
    const p = new URLSearchParams();
    if (cycle !== ALL) p.set("cycle", cycle);
    if (status !== ALL) p.set("status", status);
    if (sphere !== ALL) p.set("sphere", sphere);
    if (exec !== ALL) p.set("responsible", exec);
    return p.toString();
  }

  function doExport() {
    const qs = buildParams();
    setExporting(true);
    try {
      window.location.href = `/api/export${qs ? "?" + qs : ""}`;
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/import", { method: "POST", body: form });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();

      toast({
        title: "Импорт завершён",
        description: `Загружено ${data.imported ?? "N"} записей`,
      });

      e.target.value = "";
    } catch {
      toast({
        title: "Ошибка импорта",
        description: "Проверьте файл и повторите попытку",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  const disableExport = metaLoading || exporting;

  return (
    <div className="p-5 space-y-6 max-w-3xl">
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-primary" />
            <h2 className="text-base font-bold">Экспорт в Excel</h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Info size={12} />
            Файл = текущий реестр с фильтрами
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Выберите фильтры — система сформирует Excel с теми же строками и колонками, что вы видите в разделе
          «Реестр рекомендаций».
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Цикл</label>
            <Select value={cycle} onValueChange={setCycle} disabled={metaLoading}>
              <SelectTrigger data-testid="export-cycle" className="text-sm">
                <SelectValue placeholder="Все циклы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Все циклы</SelectItem>
                {meta?.cycles.map((c) => (
                  <SelectItem key={c} value={c}>
                    Цикл {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Статус</label>
            <Select value={status} onValueChange={setStatus} disabled={metaLoading}>
              <SelectTrigger data-testid="export-status" className="text-sm">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Все статусы</SelectItem>
                {meta?.statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Сфера</label>
            <Select value={sphere} onValueChange={setSphere} disabled={metaLoading}>
              <SelectTrigger data-testid="export-sphere" className="text-sm">
                <SelectValue placeholder="Все сферы" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={ALL}>Все сферы</SelectItem>
                {meta?.spheres.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Ответственный</label>
            <Select value={exec} onValueChange={setExec} disabled={metaLoading}>
              <SelectTrigger data-testid="export-exec" className="text-sm">
                <SelectValue placeholder="Все исполнители" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={ALL}>Все исполнители</SelectItem>
                {meta?.execs.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-1">
          <div className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground max-w-full">
            <span className="font-semibold uppercase tracking-wide text-[10px]">Текущий выбор:</span>
            <span className="truncate max-w-[260px] md:max-w-xs">{summary}</span>
          </div>

          <div className="flex gap-2 justify-start md:justify-end">
            <Button data-testid="btn-export" onClick={doExport} className="gap-2" disabled={disableExport}>
              <Download size={16} className={exporting ? "animate-pulse" : ""} />
              {exporting ? "Формирование файла..." : "Скачать Excel (.xlsx)"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2 leading-snug">
          Файл содержит все поля оригинальной таблицы постмониторинга. Совместим с Microsoft Excel и LibreOffice.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Upload size={18} className="text-primary" />
          <h2 className="text-base font-bold">Импорт нового файла</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Загрузите обновлённый файл постмониторинга (.xlsx). Данные будут добавлены или обновлены в базе.
          Лист должен называться <strong>«перечень»</strong> и иметь ту же структуру колонок.
        </p>

        <label className="cursor-pointer block">
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary hover:bg-primary/5 transition-colors">
            <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">
              {importing ? "Загрузка и обработка файла..." : "Выберите файл .xlsx"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">или перетащите сюда</p>
          </div>
          <input
            data-testid="input-import"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
            disabled={importing}
          />
        </label>

        <p className="text-[11px] text-muted-foreground leading-snug">
          Рекомендуется использовать тот же шаблон, который вы получаете через экспорт. Перед загрузкой проверьте,
          что не менялись названия листа и колонок.
        </p>
      </div>
    </div>
  );
}
