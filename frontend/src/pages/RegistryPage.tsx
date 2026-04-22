import { useMemo, useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RegistryDrillDown } from "@/App";

// ── Types ────────────────────────────────────────────────────────────────────

interface Rec {
  id: string;
  seq_no?: string;
  record_type_normalized?: string;
  cycle?: string;
  sphere_normalized?: string;
  proposal_text?: string;
  responsible_org?: string;
  interested_orgs?: string;
  completion_form?: string;
  due_raw?: string;
  status_normalized?: string;
  position_2024_2025?: string;
  position_2026?: string;
  adgs_position?: string;
  case_note?: string;
  case_text?: string;
}

interface StatusHistoryEntry {
  id: number;
  old_status: string | null;
  new_status: string | null;
  comment: string | null;
  changed_at: string;
}

interface Filters {
  cycles?: string[];
  statuses?: string[];
  spheres?: string[];
  types?: string[];
  overdueCount?: number;
}

interface PageResult {
  items?: Rec[];
  total?: number;
  page?: number;
  pages?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL = "__all__";

const STATUSES = ["Исполнено", "В работе", "Не поддерживается", "Для снятия с контроля"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusColor(status?: string | null): string {
  const s = (status || "").toLowerCase().trim();
  if (s === "исполнено") return "#16a34a";
  if (s.startsWith("в работе")) return "#2563eb";
  if (s.startsWith("не поддерживается")) return "#dc2626";
  if (s.includes("снятия с контроля")) return "#d97706";
  return "#94a3b8";
}

function statusBadgeStyle(status?: string | null, clickable = false): React.CSSProperties {
  return {
    background: getStatusColor(status),
    color: "#fff",
    borderRadius: 6,
    padding: "3px 8px",
    fontSize: 12,
    fontWeight: 600,
    cursor: clickable ? "pointer" : "default",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    userSelect: "none",
  };
}

function miniStatusBadge(status?: string | null): React.CSSProperties {
  return {
    background: getStatusColor(status),
    color: "#fff",
    borderRadius: 4,
    padding: "1px 6px",
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
    display: "inline-block",
  };
}

function normalizeLabel(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function uniqNormalized(values?: string[]) {
  const map = new Map<string, string>();
  for (const raw of values || []) {
    const normalized = normalizeLabel(raw);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!map.has(key)) map.set(key, normalized);
  }
  return Array.from(map.values());
}

function uniqRaw(values?: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const v of values || []) {
    const t = v.trim();
    if (t && !seen.has(t)) { seen.add(t); result.push(t); }
  }
  return result;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru", { day: "2-digit", month: "2-digit", year: "2-digit" })
    + " " + d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RegistryPageProps {
  drillDown?: RegistryDrillDown | null;
  onDrillDownApplied?: () => void;
}

export default function RegistryPage({ drillDown, onDrillDownApplied }: RegistryPageProps = {}) {
  // Filter state
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [sphere, setSphere] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [page, setPage] = useState(1);
  const [overdueFilter, setOverdueFilter] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dropdown state (which row's dropdown is open)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Inline status modal state
  const [inlineModal, setInlineModal] = useState<{
    ids: string[];
    selectedStatus: string;
    comment: string;
  } | null>(null);

  // Detail modal state
  const [detailItem, setDetailItem] = useState<Rec | null>(null);

  // Full edit modal state
  const [editItem, setEditItem] = useState<Rec | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editAdgs, setEditAdgs] = useState("");
  const [editComment, setEditComment] = useState("");
  const [editBy, setEditBy] = useState("");

  // Select-all checkbox ref (for indeterminate state)
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Drill down
  useEffect(() => {
    if (!drillDown) return;
    if (drillDown.search !== undefined) setSearch(drillDown.search);
    if (drillDown.cycle !== undefined) setCycle(drillDown.cycle);
    if (drillDown.status !== undefined) setStatus(drillDown.status);
    if (drillDown.sphere !== undefined) setSphere(drillDown.sphere);
    setPage(1);
    onDrillDownApplied?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillDown]);

  // Build query params
  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: "100" });
    if (search) p.set("q", search);
    if (cycle !== ALL) p.set("cycle", cycle);
    if (status !== ALL) p.set("status", status);
    if (sphere !== ALL) p.set("sphere", sphere);
    if (type !== ALL) p.set("type", type);
    if (overdueFilter) p.set("overdue", "1");
    return p.toString();
  }, [page, search, cycle, status, sphere, type, overdueFilter]);

  // Queries
  const { data, isLoading, error } = useQuery<PageResult>({
    queryKey: ["/api/recommendations", params],
    queryFn: () => apiRequest("GET", `/api/recommendations?${params}`).then(r => r.json()),
  });

  const { data: filters } = useQuery<Filters>({
    queryKey: ["/api/recommendations/filters"],
    queryFn: () => apiRequest("GET", "/api/recommendations/filters").then(r => r.json()),
    staleTime: 60_000,
  });

  // Detail full record (lazy, only when modal open)
  const { data: detailFull } = useQuery<Rec>({
    queryKey: ["/api/recommendations/detail", detailItem?.id],
    queryFn: () => apiRequest("GET", `/api/recommendations/${detailItem!.id}`).then(r => r.json()),
    enabled: !!detailItem,
  });

  // Status history (lazy, only when detail modal open)
  const { data: historyData } = useQuery<StatusHistoryEntry[]>({
    queryKey: ["/api/recommendations/history", detailItem?.id],
    queryFn: () => apiRequest("GET", `/api/recommendations/${detailItem!.id}/history`).then(r => r.json()),
    enabled: !!detailItem,
  });

  // Derived values
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? 1;
  const totalPages = data?.pages ?? 1;
  const normalizedStatuses = uniqNormalized(filters?.statuses);
  const normalizedSpheres = uniqNormalized(filters?.spheres);
  const rawCycles = uniqRaw(filters?.cycles);
  const rawTypes = uniqRaw(filters?.types);
  const overdueCount = filters?.overdueCount ?? 0;

  // Bulk selection helpers
  const allSelected = rows.length > 0 && rows.every(r => selectedIds.has(r.id));
  const someSelected = !allSelected && rows.some(r => selectedIds.has(r.id));

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  // Mutations
  const editMutation = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      apiRequest("PATCH", `/api/recommendations/${editItem?.id}/status`, payload).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      setEditItem(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ ids, status_normalized, comment }: { ids: string[]; status_normalized: string; comment: string }) => {
      if (ids.length === 1) {
        return apiRequest("PATCH", `/api/recommendations/${ids[0]}/status`, { status_normalized, comment }).then(r => r.json());
      }
      return apiRequest("PATCH", "/api/recommendations/bulk/status", { ids, status_normalized, comment }).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      setInlineModal(null);
      setSelectedIds(new Set());
      // Also refresh history if detail modal is open
      if (detailItem) {
        queryClient.invalidateQueries({ queryKey: ["/api/recommendations/history", detailItem.id] });
      }
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  function reset() {
    setSearch(""); setCycle(ALL); setStatus(ALL); setSphere(ALL); setType(ALL);
    setOverdueFilter(false); setPage(1); setSelectedIds(new Set()); setOpenDropdown(null);
  }

  function openEdit(item: Rec) {
    setEditItem(item);
    setEditStatus(normalizeLabel(item.status_normalized) || "");
    setEditDeadline(item.due_raw || "");
    setEditPosition(item.position_2026 || "");
    setEditAdgs(item.adgs_position || "");
    setEditComment(item.case_note || "");
    setEditBy("");
  }

  function saveEdit() {
    if (!editItem) return;
    editMutation.mutate({
      status: editStatus,
      deadline: editDeadline,
      position2026: editPosition,
      adgsPosition: editAdgs,
      changedBy: editBy,
      comment: editComment,
    });
  }

  function openInlineModal(ids: string[], selectedStatus = "") {
    setOpenDropdown(null);
    setInlineModal({ ids, selectedStatus, comment: "" });
  }

  function saveInlineModal() {
    if (!inlineModal || !inlineModal.selectedStatus) return;
    statusMutation.mutate({
      ids: inlineModal.ids,
      status_normalized: inlineModal.selectedStatus,
      comment: inlineModal.comment,
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        rows.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        rows.forEach(r => next.add(r.id));
        return next;
      });
    }
  }

  // Display item for detail modal (full record preferred over list row)
  const di = detailFull || detailItem;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="registry-card">

      {/* Dropdown click-away overlay */}
      {openDropdown && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setOpenDropdown(null)}
        />
      )}

      {/* ── Filters ── */}
      <div className="filters-row">
        <input
          className="search-input"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Поиск по тексту, ГО, сфере..."
        />
        <select className="filter-select" value={cycle} onChange={e => { setCycle(e.target.value); setPage(1); }}>
          <option value={ALL}>Все циклы</option>
          {rawCycles.map(item => <option key={item} value={item}>Цикл {item}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value={ALL}>Все статусы</option>
          {normalizedStatuses.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="filter-select" value={sphere} onChange={e => { setSphere(e.target.value); setPage(1); }}>
          <option value={ALL}>Все сферы</option>
          {normalizedSpheres.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <select className="filter-select" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
          <option value={ALL}>Тип: все</option>
          {rawTypes.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="btn-secondary" onClick={reset}>Сбросить</button>
      </div>

      {/* ── Quick filter + meta ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => { setOverdueFilter(f => !f); setPage(1); setSelectedIds(new Set()); }}
          style={{
            height: 28, padding: "0 12px",
            borderRadius: 14, fontSize: 12, fontWeight: 600, fontFamily: "inherit",
            border: `1.5px solid ${overdueFilter ? "#d97706" : "hsl(var(--border))"}`,
            background: overdueFilter ? "#fef3c7" : "transparent",
            color: overdueFilter ? "#92400e" : "hsl(var(--muted-foreground))",
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
            transition: "all 0.15s",
          }}
        >
          ⏰ В работе давно ({overdueCount})
        </button>
        <div className="registry-meta" style={{ margin: 0 }}>
          Найдено: {total.toLocaleString("ru-RU")} записей
        </div>
      </div>

      {/* ── Bulk action panel ── */}
      {selectedIds.size >= 2 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 14px", borderRadius: 8,
          background: "#1e293b", color: "#fff",
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Выбрано {selectedIds.size} {selectedIds.size === 1 ? "запись" : selectedIds.size < 5 ? "записи" : "записей"}
          </span>
          <button
            onClick={() => openInlineModal(Array.from(selectedIds))}
            style={{
              height: 28, padding: "0 12px", borderRadius: 6,
              fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              background: "#2563eb", color: "#fff", border: "none", cursor: "pointer",
            }}
          >
            Изменить статус
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              marginLeft: "auto", background: "none", border: "none",
              color: "#94a3b8", cursor: "pointer", fontSize: 12, padding: "0 4px",
            }}
          >
            ✕ Снять выбор
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {isLoading ? (
        <div className="card loading">Загрузка реестра...</div>
      ) : error ? (
        <div className="card error">Не удалось загрузить реестр.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table data-table-compact">
              <thead>
                <tr>
                  <th style={{ width: 32, padding: "8px 6px" }}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer" }}
                      title={allSelected ? "Снять выбор" : "Выбрать все на странице"}
                    />
                  </th>
                  <th className="col-num">№</th>
                  <th className="col-cycle">Цикл</th>
                  <th className="col-sphere">Сфера</th>
                  <th className="col-proposal">Предложение</th>
                  <th className="col-org">Отв. орган</th>
                  <th className="col-deadline">Срок</th>
                  <th className="col-status">Статус ГО</th>
                  <th className="col-actions">Действия</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(item => (
                  <tr
                    key={item.id}
                    style={overdueFilter ? { background: "rgba(250,204,21,0.13)" } : undefined}
                  >
                    <td style={{ padding: "6px 6px" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td>{item.seq_no || item.id}</td>
                    <td>{item.cycle || "—"}</td>
                    <td>{item.sphere_normalized || "—"}</td>
                    <td className="proposal-cell">
                      <div className="proposal-clamp">{item.proposal_text || "—"}</div>
                    </td>
                    <td className="org-cell">{item.responsible_org || "—"}</td>
                    <td>{item.due_raw || "—"}</td>
                    <td style={{ position: "relative" }}>
                      <span
                        style={statusBadgeStyle(item.status_normalized, true)}
                        onClick={e => {
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === item.id ? null : item.id);
                        }}
                        title="Нажмите для изменения статуса"
                      >
                        {normalizeLabel(item.status_normalized) || "Нет статуса"}
                        <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>
                      </span>
                      {openDropdown === item.id && (
                        <div style={{
                          position: "absolute", top: "calc(100% + 4px)", left: 0,
                          zIndex: 100,
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8, padding: 4, minWidth: 210,
                          boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
                        }}>
                          {STATUSES.map(s => (
                            <div
                              key={s}
                              onClick={() => openInlineModal([item.id], s)}
                              style={{
                                padding: "5px 8px", cursor: "pointer", borderRadius: 6,
                                display: "flex", alignItems: "center",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = "hsl(var(--muted))")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              <span style={statusBadgeStyle(s)}>{s}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="action-row">
                        <button className="btn-link" onClick={() => setDetailItem(item)}>Подробнее</button>
                        <button className="btn-link" onClick={() => openEdit(item)}>Изм.</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                      Нет данных для отображения
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <button className="btn-secondary" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Назад
            </button>
            <span className="pager-info">Страница {currentPage} из {totalPages}</span>
            <button className="btn-secondary" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>
              Вперёд
            </button>
          </div>
        </>
      )}

      {/* ── Inline / Bulk Status Modal ── */}
      {inlineModal && (
        <div className="modal-backdrop" onClick={() => setInlineModal(null)}>
          <div className="modal-card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {inlineModal.ids.length === 1
                ? "Изменить статус"
                : `Изменить статус (${inlineModal.ids.length} записей)`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="form-label">Статус</label>
                <select
                  className="form-input"
                  value={inlineModal.selectedStatus}
                  onChange={e => setInlineModal(m => m ? { ...m, selectedStatus: e.target.value } : null)}
                >
                  <option value="">Выберите статус</option>
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {inlineModal.selectedStatus && (
                  <div style={{ marginTop: 6 }}>
                    <span style={statusBadgeStyle(inlineModal.selectedStatus)}>
                      {inlineModal.selectedStatus}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Комментарий (необязательно)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={inlineModal.comment}
                  onChange={e => setInlineModal(m => m ? { ...m, comment: e.target.value } : null)}
                  placeholder="Причина изменения..."
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setInlineModal(null)}>Отмена</button>
              <button
                className="btn-primary"
                onClick={saveInlineModal}
                disabled={!inlineModal.selectedStatus || statusMutation.isPending}
              >
                {statusMutation.isPending ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailItem && di && (
        <div className="modal-backdrop" onClick={() => setDetailItem(null)}>
          <div className="modal-card modal-card-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Подробно по записи #{di.seq_no || di.id}</div>

            <div className="record-details">
              <div className="record-row">
                <div className="record-label">П/п</div>
                <div className="record-value">{di.seq_no || di.id || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">Анализ / мониторинг</div>
                <div className="record-value">{di.record_type_normalized || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">ЦИКЛ</div>
                <div className="record-value">{di.cycle || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">Сфера</div>
                <div className="record-value">{di.sphere_normalized || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">Предложения</div>
                <div className="record-value record-value-long">{di.proposal_text || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">Ответственный исполнитель</div>
                <div className="record-value">{di.responsible_org || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">Заинтересованные государственные органы</div>
                <div className="record-value record-value-long">{di.interested_orgs || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">Форма завершения</div>
                <div className="record-value record-value-long">{di.completion_form || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">Срок исполнения</div>
                <div className="record-value">{di.due_raw || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">Статус ГО</div>
                <div className="record-value">
                  <span style={statusBadgeStyle(di.status_normalized)}>
                    {normalizeLabel(di.status_normalized) || "—"}
                  </span>
                </div>
              </div>
              <div className="record-row">
                <div className="record-label">Позиция ГО на 2024-2025 гг.</div>
                <div className="record-value record-value-long">{di.position_2024_2025 || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">Позиция ГО на 27.03.2026</div>
                <div className="record-value record-value-long">{di.position_2026 || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">Позиция АДГС</div>
                <div className="record-value record-value-long">{di.adgs_position || "—"}</div>
              </div>
              <div className="record-row">
                <div className="record-label">Кейс</div>
                <div className="record-value record-value-long">{di.case_text || di.case_note || "—"}</div>
              </div>
            </div>

            {/* ── История изменений ── */}
            <div style={{
              marginTop: 18, paddingTop: 14,
              borderTop: "1px solid hsl(var(--border))",
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "hsl(var(--foreground))", marginBottom: 10 }}>
                История изменений статуса
              </div>
              {!historyData ? (
                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Загрузка...</div>
              ) : historyData.length === 0 ? (
                <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Изменений не зафиксировано</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {historyData.map(h => (
                    <div key={h.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12 }}>
                      <span style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0, minWidth: 100 }}>
                        {fmtDate(h.changed_at)}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={miniStatusBadge(h.old_status)}>{h.old_status || "—"}</span>
                        <span style={{ color: "hsl(var(--muted-foreground))" }}>→</span>
                        <span style={miniStatusBadge(h.new_status)}>{h.new_status || "—"}</span>
                        {h.comment && (
                          <span style={{ color: "hsl(var(--muted-foreground))", fontStyle: "italic" }}>
                            · {h.comment}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setDetailItem(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Edit Modal ── */}
      {editItem && (
        <div className="modal-backdrop" onClick={() => setEditItem(null)}>
          <div className="modal-card modal-card-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Обновление записи #{editItem.seq_no || editItem.id}</div>

            <div className="modal-grid">
              <div>
                <label className="form-label">Статус</label>
                <select className="form-input" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  <option value="">Выберите статус</option>
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Срок</label>
                <input className="form-input" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Позиция 2026</label>
                <input className="form-input" value={editPosition} onChange={e => setEditPosition(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Позиция АДГС</label>
                <input className="form-input" value={editAdgs} onChange={e => setEditAdgs(e.target.value)} />
              </div>
              <div className="modal-col-span">
                <label className="form-label">Комментарий</label>
                <textarea className="form-textarea" rows={4} value={editComment} onChange={e => setEditComment(e.target.value)} />
              </div>
              <div className="modal-col-span">
                <label className="form-label">Кто изменил</label>
                <input className="form-input" value={editBy} onChange={e => setEditBy(e.target.value)} placeholder="ФИО / подразделение" />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditItem(null)}>Отмена</button>
              <button className="btn-primary" onClick={saveEdit} disabled={editMutation.isPending}>
                {editMutation.isPending ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
