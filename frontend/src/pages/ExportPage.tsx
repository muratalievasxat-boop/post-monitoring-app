import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Download, Upload, FileSpreadsheet, FileCheck, X, AlertCircle, CheckCircle2 } from "lucide-react";

interface Meta {
  spheres: string[];
  cycles: string[];
  statuses: string[];
  types: string[];
  execs: string[];
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function ExportPage() {
  const [cycle, setCycle]       = useState("");
  const [status, setStatus]     = useState("");
  const [sphere, setSphere]     = useState("");
  const [exec, setExec]         = useState("");
  const [exporting, setExporting] = useState(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [dragOver, setDragOver]       = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: meta, isLoading } = useQuery<Meta>({
    queryKey: ["/api/recommendations/filters"],
    queryFn: () => apiRequest("GET", "/api/recommendations/filters").then(r => r.json()),
  });

  function doExport() {
    const p = new URLSearchParams();
    if (cycle)  p.set("cycle", cycle);
    if (status) p.set("status", status);
    if (sphere) p.set("sphere", sphere);
    if (exec)   p.set("responsible", exec);
    setExporting(true);
    window.location.href = `/api/admin/registry/export${p.toString() ? "?" + p.toString() : ""}`;
    setTimeout(() => setExporting(false), 1500);
  }

  function onFileSelected(file: File | null) {
    if (!file) return;
    setPendingFile(file);
    setImportResult(null);
  }

  function clearFile() {
    setPendingFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function doImport() {
    if (!pendingFile) return;
    setImporting(true);
    setImportResult(null);
    const form = new FormData();
    form.append("file", pendingFile);
    try {
      const res = await fetch("/api/admin/registry/import", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Ошибка импорта");
      setImportResult({ ok: true, text: `Загружено строк: ${data.rows ?? data.imported ?? 0}` });
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setImportResult({ ok: false, text: err?.message || "Неизвестная ошибка" });
    } finally {
      setImporting(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      onFileSelected(file);
    }
  }

  function resetFilters() {
    setCycle(""); setStatus(""); setSphere(""); setExec("");
  }

  return (
    <div className="export-page-shell">

      {/* ── Экспорт ── */}
      <div className="export-card">
        <div className="export-card-header">
          <FileSpreadsheet size={16} className="export-card-icon" />
          <h2 className="export-card-title">Экспорт в Excel</h2>
        </div>
        <p className="export-card-desc">
          Выберите фильтры — система выгрузит именно ту таблицу, которую вы видите в
          реестре, в формате .xlsx.
        </p>

        <div className="export-filters-grid">
          <div className="export-field">
            <label className="export-label">Цикл</label>
            <select className="export-select" value={cycle} onChange={e => setCycle(e.target.value)} disabled={isLoading}>
              <option value="">Все циклы</option>
              {(meta?.cycles ?? []).map(v => <option key={v} value={v}>Цикл {v}</option>)}
            </select>
          </div>
          <div className="export-field">
            <label className="export-label">Статус</label>
            <select className="export-select" value={status} onChange={e => setStatus(e.target.value)} disabled={isLoading}>
              <option value="">Все статусы</option>
              {(meta?.statuses ?? []).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="export-field">
            <label className="export-label">Сфера</label>
            <select className="export-select" value={sphere} onChange={e => setSphere(e.target.value)} disabled={isLoading}>
              <option value="">Все сферы</option>
              {(meta?.spheres ?? []).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="export-field">
            <label className="export-label">Ответственный</label>
            <select className="export-select" value={exec} onChange={e => setExec(e.target.value)} disabled={isLoading}>
              <option value="">Все исполнители</option>
              {(meta?.execs ?? []).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="export-toolbar">
          <button className="export-reset-btn" type="button" onClick={resetFilters}
            disabled={!cycle && !status && !sphere && !exec}>
            Сбросить
          </button>
          <button className="export-primary-btn" type="button" onClick={doExport}
            disabled={isLoading || exporting}>
            <Download size={15} />
            {exporting ? "Формирование..." : "Скачать Excel (.xlsx)"}
          </button>
        </div>

        <p className="export-note">
          Файл содержит все поля оригинальной таблицы постмониторинга. Совместим с Microsoft Excel и LibreOffice.
        </p>
      </div>

      {/* ── Импорт ── */}
      <div className="export-card">
        <div className="export-card-header">
          <Upload size={16} className="export-card-icon" />
          <h2 className="export-card-title">Импорт нового файла</h2>
        </div>
        <p className="export-card-desc">
          Загрузите обновлённый файл постмониторинга (.xlsx).
          Лист должен называться <strong>«перечень»</strong> и иметь ту же структуру колонок.
          Существующие данные будут заменены.
        </p>

        {/* Зона выбора файла — скрыта когда файл уже выбран */}
        {!pendingFile && !importing && (
          <div
            className={`import-dropzone${dragOver ? " import-dropzone--drag" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="import-dropzone-icon" />
            <span className="import-dropzone-title">Перетащите файл .xlsx сюда</span>
            <span className="import-dropzone-sub">или нажмите для выбора</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="import-file-input"
              onChange={e => onFileSelected(e.target.files?.[0] ?? null)}
              disabled={importing}
            />
          </div>
        )}

        {/* Прогресс загрузки */}
        {importing && (
          <div className="import-progress-block">
            <div className="import-progress-header">
              <Upload size={16} className="import-progress-icon" />
              <span className="import-progress-label">Загрузка файла на сервер...</span>
            </div>
            <div className="import-progress-bar-track">
              <div className="import-progress-bar-fill" />
            </div>
            <span className="import-progress-hint">Пожалуйста, не закрывайте страницу</span>
          </div>
        )}

        {/* Превью выбранного файла */}
        {pendingFile && !importing && (
          <div className="import-file-preview">
            <FileCheck size={18} className="import-file-preview-icon" />
            <div className="import-file-preview-info">
              <span className="import-file-preview-name">{pendingFile.name}</span>
              <span className="import-file-preview-size">{fmtSize(pendingFile.size)}</span>
            </div>
            <button className="import-file-clear-btn" onClick={clearFile} title="Убрать файл">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Результат */}
        {importResult && (
          <div className={`import-result-msg${importResult.ok ? "" : " import-result-msg--error"}`}>
            {importResult.ok
              ? <CheckCircle2 size={15} className="import-result-icon" />
              : <AlertCircle size={15} className="import-result-icon" />}
            <div>
              <strong>{importResult.ok ? "Импорт завершён успешно" : "Ошибка импорта"}</strong>
              <div className="import-result-detail">{importResult.text}</div>
            </div>
          </div>
        )}

        {/* Кнопка импорта */}
        {(pendingFile || importResult) && !importing && (
          <div className="import-toolbar">
            {importResult && (
              <button className="export-reset-btn" onClick={() => { setImportResult(null); }}>
                {importResult.ok ? "Загрузить ещё" : "Попробовать снова"}
              </button>
            )}
            {pendingFile && (
              <button className="export-primary-btn" onClick={doImport} disabled={importing}>
                <Upload size={15} />
                Импортировать
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .export-page-shell {
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .export-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 14px;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: var(--shadow-sm);
        }

        .export-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .export-card-icon {
          color: hsl(var(--primary));
          flex-shrink: 0;
        }

        .export-card-title {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: hsl(var(--foreground));
        }

        .export-card-desc {
          margin: 0;
          font-size: 13px;
          color: hsl(var(--muted-foreground));
          line-height: 1.55;
        }

        .export-filters-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px 16px;
        }

        .export-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .export-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: hsl(var(--muted-foreground));
        }

        .export-select {
          height: 36px;
          padding: 0 10px;
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          font-size: 13px;
          font-family: inherit;
          background: hsl(var(--card));
          color: hsl(var(--foreground));
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .export-select:focus {
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 3px hsl(var(--ring) / 0.12);
        }

        .export-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .export-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: flex-end;
        }

        .export-primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 36px;
          padding: 0 16px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 700;
          font-family: inherit;
          border: none;
          cursor: pointer;
          color: hsl(var(--primary-foreground));
          background: hsl(var(--primary));
          transition: filter 0.15s;
          white-space: nowrap;
        }

        .export-primary-btn:hover:enabled { filter: brightness(1.1); }
        .export-primary-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .export-reset-btn {
          height: 36px;
          padding: 0 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          border: 1px solid hsl(var(--border));
          cursor: pointer;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--card));
          transition: background 0.15s, color 0.15s;
        }

        .export-reset-btn:hover:enabled {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }

        .export-reset-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .export-note {
          margin: 0;
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          line-height: 1.5;
        }

        /* ── Drop zone ── */
        .import-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 28px 20px;
          border: 2px dashed hsl(var(--border));
          border-radius: 12px;
          cursor: pointer;
          text-align: center;
          transition: border-color 0.15s, background 0.15s;
          background: transparent;
          user-select: none;
        }

        .import-dropzone:hover,
        .import-dropzone--drag {
          border-color: hsl(var(--primary));
          background: hsl(var(--primary) / 0.04);
        }

        .import-dropzone-icon {
          color: hsl(var(--muted-foreground));
          margin-bottom: 2px;
        }

        .import-dropzone-title {
          font-size: 14px;
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .import-dropzone-sub {
          font-size: 12px;
          color: hsl(var(--muted-foreground));
        }

        .import-file-input { display: none; }

        /* ── Progress bar ── */
        .import-progress-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 14px 16px;
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          background: hsl(var(--muted));
        }

        .import-progress-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .import-progress-icon {
          color: hsl(var(--primary));
        }

        .import-progress-label {
          font-size: 13px;
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .import-progress-bar-track {
          height: 4px;
          border-radius: 2px;
          background: hsl(var(--border));
          overflow: hidden;
        }

        .import-progress-bar-fill {
          height: 100%;
          border-radius: 2px;
          background: hsl(var(--primary));
          animation: indeterminate 1.4s ease-in-out infinite;
          transform-origin: left;
        }

        @keyframes indeterminate {
          0%   { transform: scaleX(0.05) translateX(0); }
          50%  { transform: scaleX(0.5)  translateX(80%); }
          100% { transform: scaleX(0.05) translateX(2000%); }
        }

        .import-progress-hint {
          font-size: 11px;
          color: hsl(var(--muted-foreground));
        }

        /* ── File preview ── */
        .import-file-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          background: hsl(var(--muted));
        }

        .import-file-preview-icon {
          color: hsl(var(--primary));
          flex-shrink: 0;
        }

        .import-file-preview-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .import-file-preview-name {
          font-size: 13px;
          font-weight: 600;
          color: hsl(var(--foreground));
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .import-file-preview-size {
          font-size: 11px;
          color: hsl(var(--muted-foreground));
        }

        .import-file-clear-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: 1px solid hsl(var(--border));
          background: transparent;
          color: hsl(var(--muted-foreground));
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s, color 0.15s;
        }

        .import-file-clear-btn:hover {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }

        /* ── Result message ── */
        .import-result-msg {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
          background: hsl(142, 60%, 92%);
          color: hsl(142, 60%, 22%);
          border: 1px solid hsl(142, 60%, 75%);
        }

        [data-theme="dark"] .import-result-msg {
          background: hsl(142, 35%, 13%);
          color: hsl(142, 60%, 72%);
          border-color: hsl(142, 35%, 22%);
        }

        .import-result-msg--error {
          background: hsl(0, 80%, 95%);
          color: hsl(0, 65%, 32%);
          border-color: hsl(0, 65%, 80%);
        }

        [data-theme="dark"] .import-result-msg--error {
          background: hsl(0, 35%, 13%);
          color: hsl(0, 60%, 72%);
          border-color: hsl(0, 35%, 22%);
        }

        .import-result-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .import-result-detail {
          margin-top: 2px;
          font-size: 12px;
          opacity: 0.8;
        }

        /* ── Import toolbar ── */
        .import-toolbar {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        @media (max-width: 640px) {
          .export-filters-grid { grid-template-columns: 1fr; }
          .export-toolbar { justify-content: stretch; flex-direction: column; }
          .export-primary-btn, .export-reset-btn { width: 100%; justify-content: center; }
          .import-toolbar { flex-direction: column; }
          .import-toolbar button { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
