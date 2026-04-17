import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, RotateCcw, Search, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Rec {
  id: number; type: string; cycle: string; sphere: string; proposal: string;
  responsible: string; stakeholders: string; completionForm: string;
  deadline: string; status: string; position2024: string;
  position2026: string; adgsPosition: string; caseNote: string;
}
interface Meta { spheres: string[]; cycles: string[]; statuses: string[]; types: string[]; }
interface PageResult { total: number; page: number; pages: number; items: Rec[]; }

const ALL = "__all__";

export default function RegistryPage() {
  const { toast } = useToast();
  const [location] = useLocation();

  // Read ?form= param from hash URL (e.g. /#/registry?form=В+АДГС)
  const urlForm = useMemo(() => {
    const hash = window.location.hash; // e.g. #/registry?form=...
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return '';
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    return params.get('form') || '';
  }, [location]);

  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sphere, setSphere] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [formFilter, setFormFilter] = useState(ALL);
  const [page, setPage] = useState(1);

  // Apply URL ?form= filter on mount / URL change
  useEffect(() => {
    if (urlForm) {
      setFormFilter(urlForm);
      setPage(1);
    }
  }, [urlForm]);
  const [detail, setDetail] = useState<Rec | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editPos, setEditPos] = useState("");
  const [editAdgs, setEditAdgs] = useState("");
  const [editBy, setEditBy] = useState("");
  const [editComment, setEditComment] = useState("");
  const [sortField, setSortField] = useState("id");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  const params = new URLSearchParams({
    page: String(page), pageSize: "50",
    ...(search ? { search } : {}),
    ...(cycle !== ALL ? { cycle } : {}),
    ...(status !== ALL ? { status } : {}),
    ...(sphere !== ALL ? { sphere } : {}),
    ...(type !== ALL ? { type } : {}),
    ...(formFilter !== ALL ? { completionForm: formFilter } : {}),
  });

  const { data, isLoading } = useQuery<PageResult>({
    queryKey: ["/api/recommendations", params.toString()],
    queryFn: () => apiRequest("GET", `/api/recommendations?${params}`).then(r => r.json()),
  });

  const { data: meta } = useQuery<Meta>({
    queryKey: ["/api/meta"],
    queryFn: () => apiRequest("GET", "/api/meta").then(r => r.json()),
  });

  const mutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest("PATCH", `/api/recommendations/${editId}/status`, payload).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setEditId(null);
      toast({ title: "Статус обновлён", description: "Изменения сохранены" });
    },
  });

  function reset() { setSearch(""); setCycle(ALL); setStatus(ALL); setSphere(ALL); setType(ALL); setFormFilter(ALL); setPage(1); }
  function openEdit(r: Rec) {
    setEditId(r.id);
    setEditStatus(r.status || "В работе");
    setEditDeadline(r.deadline || "");
    setEditPos(r.position2026 || "");
    setEditAdgs(r.adgsPosition || "");
    setEditBy(""); setEditComment("");
  }

  function saveEdit() {
    mutation.mutate({ status: editStatus, deadline: editDeadline, position2026: editPos, adgsPosition: editAdgs, changedBy: editBy, comment: editComment });
  }

  // Sort client-side within current page (server gives flat array)
  const sorted = [...(data?.items || [])].sort((a: any, b: any) => {
    let av = a[sortField], bv = b[sortField];
    if (sortField === "id") { av = +av; bv = +bv; }
    else { av = (av||"").toString(); bv = (bv||"").toString(); }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  function SortBtn({ field }: { field: string }) {
    return (
      <button onClick={() => { if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortField(field); setSortDir("asc"); } }}
        className="inline-flex flex-col ml-1 opacity-40 hover:opacity-100">
        <ChevronUp size={9} className={sortField === field && sortDir === "asc" ? "opacity-100" : ""} />
        <ChevronDown size={9} className={sortField === field && sortDir === "desc" ? "opacity-100" : ""} />
      </button>
    );
  }

  const pages = data?.pages ?? 1;

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="px-5 py-3 border-b border-border bg-card space-y-2 flex-shrink-0">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-search"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Поиск по тексту, ГО, сфере..."
              className="pl-8 h-8 text-sm"
            />
          </div>

          <Select value={cycle} onValueChange={v => { setCycle(v); setPage(1); }}>
            <SelectTrigger data-testid="filter-cycle" className="w-32 h-8 text-xs"><SelectValue placeholder="Все циклы" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все циклы</SelectItem>
              {meta?.cycles.map(c => <SelectItem key={c} value={c}>Цикл {c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
            <SelectTrigger data-testid="filter-status" className="w-40 h-8 text-xs"><SelectValue placeholder="Все статусы" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все статусы</SelectItem>
              {meta?.statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={sphere} onValueChange={v => { setSphere(v); setPage(1); }}>
            <SelectTrigger data-testid="filter-sphere" className="w-48 h-8 text-xs"><SelectValue placeholder="Все сферы" /></SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value={ALL}>Все сферы</SelectItem>
              {meta?.spheres.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={v => { setType(v); setPage(1); }}>
            <SelectTrigger data-testid="filter-type" className="w-36 h-8 text-xs"><SelectValue placeholder="Тип: все" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Тип: все</SelectItem>
              {meta?.types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={reset} className="h-8 px-3 gap-1.5 text-xs">
            <RotateCcw size={12} /> Сбросить
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {data ? `Найдено: ${data.total.toLocaleString('ru')} записей` : "Загрузка..."}
          </span>
          {formFilter !== ALL && (
            <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-0.5">
              Форма: <strong>{formFilter}</strong>
              <button onClick={() => setFormFilter(ALL)} className="ml-1 hover:text-destructive">✕</button>
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Загрузка...</div>
        ) : (
          <table className="rec-table w-full text-sm" style={{ minWidth: '900px' }}>
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
              <tr>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground w-12">
                  №<SortBtn field="id" />
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground w-24">
                  Цикл<SortBtn field="cycle" />
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground w-36">
                  Сфера<SortBtn field="sphere" />
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                  Предложение
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground w-24">
                  Отв.<SortBtn field="responsible" />
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground w-24">
                  Срок<SortBtn field="deadline" />
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground w-36">
                  Статус ГО<SortBtn field="status" />
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground w-28"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{r.id}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-bold text-primary">Цикл {r.cycle}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground" title={r.sphere}>{r.sphere || "–"}</td>
                  <td className="px-3 py-2.5 proposal-cell">
                    <p className="truncate text-sm" title={r.proposal}>{r.proposal || "–"}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-medium" title={r.responsible}>{r.responsible || "–"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{(r.deadline||"–").replace(/\n/g," ")}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <Button data-testid={`btn-detail-${r.id}`} variant="outline" size="sm" className="h-6 text-xs px-2"
                        onClick={() => setDetail(r)}>Подробнее</Button>
                      <Button data-testid={`btn-edit-${r.id}`} size="sm" className="h-6 text-xs px-2"
                        onClick={() => openEdit(r)}>Статус</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-3 border-t border-border flex-shrink-0 bg-card flex-wrap">
          {/* First + Prev */}
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page <= 1}
            onClick={() => setPage(1)} title="Первая">1«</Button>
          <Button variant="outline" size="sm" className="h-7 px-2" disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></Button>

          {/* Page window */}
          {(() => {
            const window = 5;
            let start = Math.max(1, page - Math.floor(window / 2));
            let end = Math.min(pages, start + window - 1);
            if (end - start < window - 1) start = Math.max(1, end - window + 1);
            const btns = [];
            if (start > 2) btns.push(<span key="l-ellipsis" className="text-muted-foreground text-xs px-1">…</span>);
            for (let p = start; p <= end; p++) {
              btns.push(
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm"
                  className="h-7 px-2.5 min-w-7 text-xs" onClick={() => setPage(p)}>{p}</Button>
              );
            }
            if (end < pages - 1) btns.push(<span key="r-ellipsis" className="text-muted-foreground text-xs px-1">…</span>);
            return btns;
          })()}

          {/* Next + Last */}
          <Button variant="outline" size="sm" className="h-7 px-2" disabled={page >= pages}
            onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page >= pages}
            onClick={() => setPage(pages)} title="Последняя">»{pages}</Button>

          <span className="text-xs text-muted-foreground ml-2">Стр. {page} из {pages}</span>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Рекомендация № {detail?.id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Тип", detail.type], ["Цикл", detail.cycle],
                  ["Сфера", detail.sphere], ["Ответственный", detail.responsible],
                  ["Срок", detail.deadline?.replace(/\n/g," ")], ["Статус ГО", null],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                    {label === "Статус ГО" ? <StatusBadge status={detail.status} /> : <p className="leading-relaxed">{val as string || "–"}</p>}
                  </div>
                ))}
              </div>
              {[
                ["Предложение", detail.proposal],
                ["Заинтересованные ГО", detail.stakeholders],
                ["Форма завершения", detail.completionForm],
                ["Позиция ГО 2024–2025", detail.position2024],
                ["Позиция ГО 27.03.2026", detail.position2026],
                ["Позиция АДГС", detail.adgsPosition],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label as string}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                  <p className="leading-relaxed text-sm bg-muted/40 rounded-lg p-3">{val as string}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Status Modal */}
      <Dialog open={editId !== null} onOpenChange={o => !o && setEditId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Обновить статус рекомендации № {editId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Статус ГО</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger data-testid="edit-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["В работе","Исполнено","Не поддерживается","Отсутствует позиция","Не указано"].map(s =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Срок исполнения</label>
              <Input data-testid="edit-deadline" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} placeholder="напр. 2 квартал 2026 года" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Позиция ГО на 27.03.2026</label>
              <textarea data-testid="edit-pos" value={editPos} onChange={e => setEditPos(e.target.value)}
                rows={3} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Позиция АДГС</label>
              <textarea data-testid="edit-adgs" value={editAdgs} onChange={e => setEditAdgs(e.target.value)}
                rows={2} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Изменил</label>
                <Input data-testid="edit-by" value={editBy} onChange={e => setEditBy(e.target.value)} placeholder="ФИО или должность" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Комментарий</label>
                <Input data-testid="edit-comment" value={editComment} onChange={e => setEditComment(e.target.value)} placeholder="Необязательно" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditId(null)}>Отмена</Button>
              <Button data-testid="btn-save-status" onClick={saveEdit} disabled={mutation.isPending}>
                {mutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
