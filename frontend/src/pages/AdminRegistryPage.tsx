import { useEffect, useMemo, useState } from 'react';

const API_BASE = '';

type FiltersResponse = {
  cycles?: string[];
  statuses?: string[];
  spheres?: string[];
  types?: string[];
};

export function AdminRegistryPage() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [cycle, setCycle] = useState('');
  const [status, setStatus] = useState('');
  const [sphere, setSphere] = useState('');
  const [responsible, setResponsible] = useState('');
  const [q, setQ] = useState('');

  const [filters, setFilters] = useState<FiltersResponse>({});
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersError, setFiltersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      setFiltersLoading(true);
      setFiltersError(null);
      try {
        const endpoints = [
          `${API_BASE}/api/recommendations/filters`,
          `${API_BASE}/api/recommendations/meta`,
          `${API_BASE}/api/dictionaries/recommendations`,
        ];

        let data: FiltersResponse | null = null;

        for (const url of endpoints) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const json = await res.json();
            if (
              json &&
              (Array.isArray(json.cycles) ||
                Array.isArray(json.statuses) ||
                Array.isArray(json.spheres))
            ) {
              data = json;
              break;
            }
          } catch {
            // try next endpoint
          }
        }

        if (!data) {
          throw new Error('Не удалось загрузить фильтры');
        }

        if (!cancelled) {
          setFilters({
            cycles: data.cycles || [],
            statuses: data.statuses || [],
            spheres: data.spheres || [],
            types: data.types || [],
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setFiltersError(err.message || 'Ошибка загрузки фильтров');
        }
      } finally {
        if (!cancelled) {
          setFiltersLoading(false);
        }
      }
    }

    loadFilters();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setImportResult('Выберите файл Excel');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/api/admin/registry/import`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setImportResult(`Ошибка: ${data.error || res.statusText}`);
      } else {
        setImportResult(`Импорт завершён, строк: ${data.rows}`);
      }
    } catch (err: any) {
      setImportResult(`Ошибка запроса: ${err.message}`);
    } finally {
      setImporting(false);
    }
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (cycle) params.set('cycle', cycle);
    if (status) params.set('status', status);
    if (sphere) params.set('sphere', sphere);
    if (responsible) params.set('responsible', responsible);
    if (q) params.set('q', q);

    const url = `${API_BASE}/api/admin/registry/export?${params.toString()}`;
    window.location.href = url;
  }

  function resetFilters() {
    setCycle('');
    setStatus('');
    setSphere('');
    setResponsible('');
    setQ('');
  }

  const hasActiveFilters = useMemo(
    () => Boolean(cycle || status || sphere || responsible || q),
    [cycle, status, sphere, responsible, q]
  );

  return (
    <div className="admin-registry-page">
      <div className="admin-registry-shell">
        <div className="admin-page-head">
          <div>
            <h1>Администрирование реестра</h1>
            <p>
              Импортируйте актуальный Excel-файл и выгружайте реестр с фильтрами в
              аккуратном формате.
            </p>
          </div>
        </div>

        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Импорт Excel</h2>
              <p>
                Загрузите файл свода пост-мониторинга. Таблица <code>registry_records</code>{' '}
                будет полностью перезаписана.
              </p>
            </div>
          </div>

          <form className="admin-import-form" onSubmit={handleImport}>
            <label className="admin-file-field">
              <span>Файл Excel</span>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            <button className="admin-primary-btn" type="submit" disabled={importing}>
              {importing ? 'Импортируем...' : 'Импортировать'}
            </button>
          </form>

          {importResult && (
            <div className="admin-note-box" role="status">
              {importResult}
            </div>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Экспорт в Excel</h2>
              <p>
                Выберите фильтры и скачайте выгрузку только по нужным записям.
              </p>
            </div>
          </div>

          {filtersError && <div className="admin-error-box">{filtersError}</div>}

          <div className="admin-filters-grid">
            <label className="admin-field">
              <span>Цикл</span>
              <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
                <option value="">Все</option>
                {(filters.cycles || []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Статус</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Все</option>
                {(filters.statuses || []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Сфера</span>
              <select value={sphere} onChange={(e) => setSphere(e.target.value)}>
                <option value="">Все</option>
                {(filters.spheres || []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Ответственный орган</span>
              <input
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Введите название органа"
              />
            </label>

            <label className="admin-field admin-field-wide">
              <span>Поиск</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Текст предложения, орган или сфера"
              />
            </label>
          </div>

          <div className="admin-toolbar">
            <button
              className="admin-secondary-btn"
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              Очистить
            </button>

            <button
              className="admin-primary-btn"
              type="button"
              onClick={handleExport}
              disabled={filtersLoading}
            >
              {filtersLoading ? 'Загружаем фильтры...' : 'Скачать Excel'}
            </button>
          </div>
        </section>
      </div>

      <style>{`
        .admin-registry-page {
          padding: 28px 24px 48px;
          background: #f1f5f9;
          min-height: 100%;
          overflow-y: auto;
        }

        .admin-registry-shell {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .admin-page-head h1 {
          margin: 0 0 6px;
          font-size: 22px;
          font-weight: 700;
          line-height: 1.2;
          color: #0f172a;
        }

        .admin-page-head p {
          margin: 0;
          font-size: 13.5px;
          color: #64748b;
          max-width: 640px;
          line-height: 1.6;
        }

        .admin-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          box-shadow: 0 1px 4px rgba(15,23,42,0.06);
        }

        .admin-card-head { display: flex; flex-direction: column; gap: 4px; }

        .admin-card-head h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }

        .admin-card-head p {
          margin: 0;
          font-size: 13px;
          color: #64748b;
          line-height: 1.55;
        }

        .admin-card-head code {
          font-size: 12px;
          background: #f1f5f9;
          color: #334155;
          border-radius: 4px;
          padding: 1px 5px;
        }

        .admin-import-form {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 12px;
        }

        .admin-file-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          flex: 1 1 260px;
          min-width: 0;
        }

        .admin-file-field span,
        .admin-field span {
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }

        .admin-file-field input[type="file"] {
          height: 38px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #fff;
          padding: 0 10px;
          font-size: 13px;
          color: #0f172a;
          outline: none;
          cursor: pointer;
          width: 100%;
          box-sizing: border-box;
        }

        .admin-file-field input[type="file"]:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }

        .admin-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .admin-field-wide {
          grid-column: 1 / -1;
        }

        .admin-filters-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px 16px;
        }

        .admin-registry-page select,
        .admin-registry-page input[type="text"],
        .admin-registry-page input:not([type="file"]) {
          width: 100%;
          min-width: 0;
          height: 38px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 0 12px;
          font-size: 13.5px;
          font-weight: 400;
          color: #0f172a;
          background: #ffffff !important;
          -webkit-appearance: auto;
          appearance: auto;
          outline: none;
          box-sizing: border-box;
          line-height: 38px;
        }

        .admin-registry-page select:focus,
        .admin-registry-page input:not([type="file"]):focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
        }

        .admin-registry-page select option {
          background: #ffffff;
          color: #0f172a;
          font-size: 13.5px;
        }

        .admin-primary-btn {
          height: 38px;
          padding: 0 20px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          color: #fff;
          background: #2563eb;
          transition: background 0.18s;
          white-space: nowrap;
        }

        .admin-primary-btn:hover:enabled { background: #1d4ed8; }
        .admin-primary-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .admin-secondary-btn {
          height: 38px;
          padding: 0 16px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          border: 1.5px solid #e2e8f0;
          cursor: pointer;
          color: #334155;
          background: #f8fafc;
          transition: background 0.18s, border-color 0.18s;
          white-space: nowrap;
        }

        .admin-secondary-btn:hover:enabled { background: #e2e8f0; border-color: #cbd5e1; }
        .admin-secondary-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .admin-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          justify-content: flex-end;
        }

        .admin-note-box {
          background: #eff6ff;
          color: #1e3a8a;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 13.5px;
          line-height: 1.5;
        }

        .admin-error-box {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 13.5px;
          line-height: 1.5;
        }

        @media (max-width: 720px) {
          .admin-registry-page { padding: 16px 14px 32px; }
          .admin-filters-grid { grid-template-columns: 1fr; }
          .admin-field-wide { grid-column: auto; }
          .admin-toolbar { justify-content: stretch; }
          .admin-toolbar > * { flex: 1 1 100%; }
        }
      `}</style>
    </div>
  );
}
