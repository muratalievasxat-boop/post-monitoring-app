import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

type Option = { label: string; value: string };

interface Props {
  placeholder?: string;
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  testId?: string;
  tagColor?: "slate" | "indigo" | "teal" | "auto";
}

const STATUS_COLORS: Record<string, string> = {
  "выполнено":              "bg-emerald-100 text-emerald-800 border-emerald-200",
  "выполнен":               "bg-emerald-100 text-emerald-800 border-emerald-200",
  "исполнено":              "bg-emerald-100 text-emerald-800 border-emerald-200",
  "в работе":               "bg-blue-100 text-blue-800 border-blue-200",
  "на исполнении":          "bg-blue-100 text-blue-800 border-blue-200",
  "не выполнено":           "bg-red-100 text-red-800 border-red-200",
  "не исполнено":           "bg-red-100 text-red-800 border-red-200",
  "просрочено":             "bg-red-100 text-red-800 border-red-200",
  "частично":               "bg-amber-100 text-amber-800 border-amber-200",
  "частично выполнено":     "bg-amber-100 text-amber-800 border-amber-200",
  "на контроле":            "bg-violet-100 text-violet-800 border-violet-200",
};

const PALETTE = [
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-teal-50 text-teal-700 border-teal-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-purple-50 text-purple-700 border-purple-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-orange-50 text-orange-700 border-orange-200",
];

function tagCls(value: string, tagColor: string, i: number) {
  if (tagColor === "auto") {
    const k = value.toLowerCase().trim();
    if (STATUS_COLORS[k]) return STATUS_COLORS[k];
    return PALETTE[i % PALETTE.length];
  }
  const m: Record<string, string> = {
    slate:  "bg-slate-100 text-slate-700 border-slate-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    teal:   "bg-teal-50 text-teal-700 border-teal-200",
  };
  return m[tagColor] ?? m.slate;
}

export default function MultiSelectSearch({
  placeholder = "Выберите значения",
  options, value, onChange, disabled, testId, tagColor = "slate",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sel = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const selOpts = useMemo(() => options.filter(o => sel.has(o.value)), [options, sel]);

  useEffect(() => {
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", esc); };
  }, []);

  const toggle = (v: string) => onChange(sel.has(v) ? value.filter(x => x !== v) : [...value, v]);
  const remove = (v: string) => onChange(value.filter(x => x !== v));
  const clear = () => { onChange([]); setQuery(""); };
  const selectAll = () => { const m = new Set(value); filtered.forEach(o => m.add(o.value)); onChange([...m]); };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid={testId}
        disabled={disabled}
        onClick={() => !disabled && setOpen(s => !s)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
      >
        <span className={selOpts.length === 0 ? "text-slate-400" : "font-medium text-slate-800"}>
          {selOpts.length === 0 ? placeholder : `Выбрано: ${selOpts.length}`}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {selOpts.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selOpts.map((opt, i) => (
            <span key={opt.value} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tagCls(opt.value, tagColor, i)}`}>
              <span className="max-w-[160px] truncate">{opt.label}</span>
              <button type="button" onClick={() => remove(opt.value)} className="opacity-50 hover:opacity-100"><X size={10} /></button>
            </span>
          ))}
          {selOpts.length > 1 && (
            <button type="button" onClick={clear} className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-400 hover:bg-slate-50">
              <X size={10} /> Сбросить
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="mb-1.5 flex items-center gap-1.5 rounded-md border border-slate-200 px-2">
            <Search size={13} className="text-slate-400" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск..." className="h-8 w-full bg-transparent text-sm outline-none" />
            {query && <button type="button" onClick={() => setQuery("")}><X size={13} className="text-slate-400" /></button>}
          </div>
          <div className="mb-1.5 flex justify-between px-0.5 text-xs">
            <button type="button" onClick={selectAll} className="font-medium text-primary hover:underline">Выбрать найденное</button>
            <button type="button" onClick={clear} className="text-slate-400 hover:underline">Сбросить</button>
          </div>
          <div className="max-h-60 overflow-y-auto rounded-md border border-slate-100">
            {filtered.length === 0
              ? <div className="px-3 py-2 text-sm text-slate-400">Ничего не найдено</div>
              : filtered.map((o, i) => {
                const checked = sel.has(o.value);
                return (
                  <button key={o.value} type="button" onClick={() => toggle(o.value)}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${checked ? "bg-slate-50/80" : ""}`}>
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-white" : "border-slate-300"}`}>
                      {checked && <Check size={10} />}
                    </span>
                    <span className="flex-1 line-clamp-2 text-[13px]">{o.label}</span>
                    {tagColor === "auto" && (
                      <span className={`h-2 w-2 shrink-0 rounded-full ${tagCls(o.value, tagColor, i).split(" ")[0].replace("bg-", "bg-").replace("-50", "-400").replace("-100", "-400")}`} />
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
