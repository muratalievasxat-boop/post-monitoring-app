import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Meta { spheres: string[]; cycles: string[]; statuses: string[]; types: string[]; execs: string[]; }

const ALL = "__all__";

export default function ExportPage() {
  const { toast } = useToast();
  const [cycle, setCycle] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sphere, setSphere] = useState(ALL);
  const [exec, setExec] = useState(ALL);
  const [importing, setImporting] = useState(false);

  const { data: meta } = useQuery<Meta>({
    queryKey: ["/api/meta"],
    queryFn: () => apiRequest("GET", "/api/meta").then(r => r.json()),
  });

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
    window.location.href = `/api/export${qs ? "?" + qs : ""}`;
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      toast({ title: "Импорт завершён", description: `Загружено ${data.imported} записей` });
      // Reset input
      e.target.value = "";
    } catch {
      toast({ title: "Ошибка импорта", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-5 space-y-6 max-w-2xl">
      {/* Export section */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <FileSpreadsheet size={18} className="text-primary" />
          <h2 className="text-base font-bold">Экспорт в Excel</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Выберите фильтры — система выгрузит именно ту таблицу, которую вы видите в реестре, в формате .xlsx.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Цикл</label>
            <Select value={cycle} onValueChange={setCycle}>
              <SelectTrigger data-testid="export-cycle" className="text-sm"><SelectValue placeholder="Все циклы" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Все циклы</SelectItem>
                {meta?.cycles.map(c => <SelectItem key={c} value={c}>Цикл {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Статус</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="export-status" className="text-sm"><SelectValue placeholder="Все статусы" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Все статусы</SelectItem>
                {meta?.statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Сфера</label>
            <Select value={sphere} onValueChange={setSphere}>
              <SelectTrigger data-testid="export-sphere" className="text-sm"><SelectValue placeholder="Все сферы" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={ALL}>Все сферы</SelectItem>
                {meta?.spheres.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Ответственный</label>
            <Select value={exec} onValueChange={setExec}>
              <SelectTrigger data-testid="export-exec" className="text-sm"><SelectValue placeholder="Все исполнители" /></SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value={ALL}>Все исполнители</SelectItem>
                {meta?.execs.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button data-testid="btn-export" onClick={doExport} className="gap-2">
          <Download size={16} />
          Скачать Excel (.xlsx)
        </Button>

        <p className="text-xs text-muted-foreground mt-3">
          Файл содержит все поля оригинальной таблицы постмониторинга. Совместим с Microsoft Excel и LibreOffice.
        </p>
      </div>

      {/* Import section */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Upload size={18} className="text-primary" />
          <h2 className="text-base font-bold">Импорт нового файла</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Загрузите обновлённый файл постмониторинга (.xlsx). Данные будут добавлены/обновлены в базе.
          Лист должен называться <strong>«перечень»</strong> и иметь ту же структуру колонок.
        </p>

        <label className="cursor-pointer">
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary hover:bg-primary/5 transition-colors">
            <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">{importing ? "Загрузка..." : "Выберите файл .xlsx"}</p>
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
      </div>
    </div>
  );
}
