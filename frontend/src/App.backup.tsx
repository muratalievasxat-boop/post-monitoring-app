import { useEffect, useMemo, useState } from 'react'
import { fetchDashboardSummary, type DashboardSummary } from './api/dashboard'
import {
  fetchRecommendationById,
  fetchRecommendationFilters,
  fetchRecommendations,
  patchRecommendationStatus,
  type RecommendationDetail,
  type RecommendationFilters,
  type RecommendationListItem,
} from './api/recommendations'
import { StatusKpis } from './components/StatusKpis'
import { Modal } from './components/Modal'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'

type TabId = 'dashboard' | 'registry' | 'admin'

function capitalize(s: string) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function badgeClass(status: string) {
  const s = String(status || '').toLowerCase()
  if (s.includes('исполн')) return 'badge done'
  if (s.includes('в работе')) return 'badge active'
  if (s.includes('не поддерж')) return 'badge rejected'
  return 'badge unknown'
}

export function App() {
  const [tab, setTab] = useState<TabId>('dashboard')

  // dashboard
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  // registry
  const [filters, setFilters] = useState<RecommendationFilters>({ cycles: [], statuses: [], spheres: [], types: [] })
  const [rows, setRows] = useState<RecommendationListItem[]>([])
  const [total, setTotal] = useState(0)
  const [registryLoading, setRegistryLoading] = useState(false)
  const [q, setQ] = useState('')
  const [cycle, setCycle] = useState('')
  const [status, setStatus] = useState('')
  const [sphere, setSphere] = useState('')
  const [type, setType] = useState('')

  // detail modal
  const [detail, setDetail] = useState<RecommendationDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // status modal
  const [statusItem, setStatusItem] = useState<RecommendationDetail | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formStatus, setFormStatus] = useState('')
  const [formDue, setFormDue] = useState('')
  const [formGo, setFormGo] = useState('')
  const [formAdgs, setFormAdgs] = useState('')
  const [formChangedBy, setFormChangedBy] = useState('')
  const [formComment, setFormComment] = useState('')

  // admin
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importError, setImportError] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [adminCycle, setAdminCycle] = useState('')
  const [adminStatus, setAdminStatus] = useState('')
  const [adminSphere, setAdminSphere] = useState('')
  const [adminResponsible, setAdminResponsible] = useState('')
  const [adminQ, setAdminQ] = useState('')

  useEffect(() => {
    fetchDashboardSummary()
      .then(res => { setDashboard(res); setDashboardLoading(false) })
      .catch(e => { setDashboardError(e.message || 'Ошибка загрузки'); setDashboardLoading(false) })
  }, [])

  async function loadRegistry() {
    setRegistryLoading(true)
    try {
      const [filterData, listData] = await Promise.all([
        fetchRecommendationFilters(),
        fetchRecommendations({ q, cycle, status, sphere, type, limit: 200, offset: 0 }),
      ])
      setFilters(filterData)
      setRows(listData.rows)
      setTotal(listData.total)
    } catch (e) {
      console.error(e)
    } finally {
      setRegistryLoading(false)
    }
  }

  useEffect(() => { loadRegistry() }, [q, cycle, status, sphere, type])

  async function openDetail(id: number) {
    const item = await fetchRecommendationById(id)
    setDetail(item)
    setDetailOpen(true)
  }

  async function openStatus(id: number) {
    const item = await fetchRecommendationById(id)
    setStatusItem(item)
    setFormStatus(item.status_normalized || '')
    setFormDue(item.due_raw || '')
    setFormGo(item.position_go_2026_03_27 || '')
    setFormAdgs(item.position_adgs || '')
    setFormChangedBy(item.changed_by || '')
    setFormComment(item.comment || '')
    setStatusOpen(true)
  }

  async function saveStatus() {
    if (!statusItem) return
    setSaving(true)
    try {
      await patchRecommendationStatus(statusItem.id, {
        status_normalized: formStatus,
        due_raw: formDue,
        position_go_2026_03_27: formGo,
        position_adgs: formAdgs,
        changed_by: formChangedBy,
        comment: formComment,
      })
      setStatusOpen(false)
      setStatusItem(null)
      await Promise.all([loadRegistry(), fetchDashboardSummary().then(setDashboard)])
    } catch (e) {
      console.error(e)
      alert('Не удалось сохранить статус')
    } finally {
      setSaving(false)
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    setImportError(false)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`${API_BASE}/api/admin/registry/import`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setImportResult(`Ошибка: ${data.error || res.statusText}`)
        setImportError(true)
      } else {
        setImportResult(`Импорт завершён — загружено ${data.rows} записей`)
        setImportError(false)
        await Promise.all([loadRegistry(), fetchDashboardSummary().then(setDashboard)])
      }
    } catch (err: any) {
      setImportResult(`Ошибка запроса: ${err.message}`)
      setImportError(true)
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  function handleExport() {
    const params = new URLSearchParams()
    if (adminCycle) params.set('cycle', adminCycle)
    if (adminStatus) params.set('status', adminStatus)
    if (adminSphere) params.set('sphere', adminSphere)
    if (adminResponsible) params.set('responsible', adminResponsible)
    if (adminQ) params.set('q', adminQ)
    window.location.href = `${API_BASE}/api/admin/registry/export?${params.toString()}`
  }

  const foundLabel = useMemo(() => `Найдено: ${total.toLocaleString('ru')} записей`, [total])

  const responsibleOptions = useMemo(() => {
    const uniq = Array.from(new Set(rows.map(r => String(r.responsible_org || '').trim()).filter(Boolean)))
    return uniq.sort((a, b) => a.localeCompare(b, 'ru'))
  }, [rows])

  const normalizedStatuses = useMemo(() =>
    Array.from(new Set(filters.statuses.map(s => capitalize(s.trim())).filter(Boolean))).sort(),
    [filters.statuses]
  )

  const normalizedSpheres = useMemo(() =>
    Array.from(new Set(filters.spheres.map(s => capitalize(s.trim())).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')),
    [filters.spheres]
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="3" width="14" height="2" rx="1" fill="white"/>
              <rect x="2" y="8" width="9" height="2" rx="1" fill="white"/>
              <rect x="2" y="13" width="11" height="2" rx="1" fill="white"/>
              <circle cx="14" cy="13" r="3" fill="white" fillOpacity="0.9"/>
              <path d="M12.5 13l1.2 1.2 2-2" stroke="hsl(213,94%,38%)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="brand-kicker">Мониторинг</div>
            <div className="brand-title">Дебюрократизация</div>
          </div>
        </div>

        <div className="nav">
          <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Дашборд
          </button>
          <button className={tab === 'registry' ? 'active' : ''} onClick={() => setTab('registry')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Реестр
          </button>
          <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Экспорт / Импорт
          </button>
        </div>

        <div className="sidebar-footer">Данные актуальны на {new Date().toLocaleDateString('ru')}</div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div className="topbar-title">
            {tab === 'dashboard' && 'Дашборд'}
            {tab === 'registry' && 'Реестр рекомендаций'}
            {tab === 'admin' && 'Экспорт в Excel'}
          </div>
          <div className="topbar-meta">v0.1 · pilot</div>
        </header>

        <main className="content">

          {/* ── DASHBOARD ── */}
          {tab === 'dashboard' && dashboardLoading && <div className="card loading">Загрузка дашборда...</div>}
          {tab === 'dashboard' && dashboardError && <div className="card error">Ошибка: {dashboardError}</div>}
          {tab === 'dashboard' && dashboard && (
            <>
              <StatusKpis data={dashboard.totals} />
              <div className="grid-3">
                <div className="card chart-card">
                  <div className="card-title-row">
                    <div className="card-title">По сферам</div>
                    <div className="card-meta">Топ 10</div>
                  </div>
                  <div className="placeholder">
                    {dashboard.bySphere.slice(0, 10).map(item => (
                      <div key={item.sphere} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                        <span style={{ fontSize:12, color:'var(--foreground)' }}>{item.sphere}</span>
                        <strong style={{ fontSize:12 }}>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card chart-card">
                  <div className="card-title-row">
                    <div className="card-title">По циклам</div>
                  </div>
                  <div className="placeholder">
                    {dashboard.byCycle.map(item => (
                      <div key={item.cycle} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                        <span style={{ fontSize:12 }}>Цикл {item.cycle}</span>
                        <strong style={{ fontSize:12 }}>{item.count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card chart-card">
                <div className="card-title-row">
                  <div className="card-title">По ответственным ГО</div>
                  <div className="card-meta">Топ 10</div>
                </div>
                <div className="placeholder">
                  {dashboard.byResponsibleOrg.slice(0, 10).map(item => (
                    <div key={item.responsible_org} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:12 }}>{item.responsible_org || 'Не указан'}</span>
                      <strong style={{ fontSize:12 }}>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── REGISTRY ── */}
          {tab === 'registry' && (
            <div className="card registry-card">
              <div className="filters-row">
                <div className="search-wrap">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input className="search-input" placeholder="Поиск по тексту, ГО, сфере..." value={q} onChange={e => setQ(e.target.value)} />
                </div>
                <select className="filter-select" value={cycle} onChange={e => setCycle(e.target.value)}>
                  <option value="">Все циклы</option>
                  {filters.cycles.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="">Все статусы</option>
                  {normalizedStatuses.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select className="filter-select" value={sphere} onChange={e => setSphere(e.target.value)}>
                  <option value="">Все сферы</option>
                  {normalizedSpheres.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select className="filter-select" value={type} onChange={e => setType(e.target.value)}>
                  <option value="">Тип: все</option>
                  {filters.types.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <button className="reset-btn" onClick={() => { setQ(''); setCycle(''); setStatus(''); setSphere(''); setType('') }}>
                  ↺ Сбросить
                </button>
              </div>

              <div className="table-meta">{registryLoading ? 'Загрузка...' : foundLabel}</div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Цикл</th>
                      <th>Сфера</th>
                      <th>Предложение</th>
                      <th>Отв.</th>
                      <th>Срок</th>
                      <th>Статус ГО</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.id}>
                        <td style={{ color:'var(--muted-foreground)', fontSize:12 }}>{row.seq_no ?? row.id}</td>
                        <td><span className="cycle-link">Цикл {row.cycle}</span></td>
                        <td style={{ fontSize:12, color:'var(--muted-foreground)' }}>{row.sphere_normalized}</td>
                        <td className="proposal-cell"><div className="proposal-text">{row.proposal_text}</div></td>
                        <td style={{ fontSize:12, fontWeight:500 }}>{row.responsible_org}</td>
                        <td style={{ fontSize:12, color:'var(--muted-foreground)' }}>{row.due_raw}</td>
                        <td><span className={badgeClass(row.status_normalized)}>{row.status_normalized || 'Без статуса'}</span></td>
                        <td>
                          <div className="table-actions">
                            <button className="ghost" onClick={() => openDetail(row.id)}>Подробнее</button>
                            <button className="primary" onClick={() => openStatus(row.id)}>Статус</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!rows.length && <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--muted-foreground)', padding:'32px' }}>Нет записей</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ADMIN ── */}
          {tab === 'admin' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:680 }}>

              {/* Экспорт */}
              <div className="admin-card">
                <div className="admin-section-header">
                  <svg className="admin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><path d="M8 13h8M8 17h5"/></svg>
                  <span className="admin-section-title">Экспорт в Excel</span>
                </div>
                <p className="admin-section-desc">Выберите фильтры — система выгрузит именно ту таблицу, которую вы видите в реестре, в формате .xlsx.</p>

                <div className="export-filters-grid">
                  <div>
                    <label className="export-filter-label">Цикл</label>
                    <select className="export-filter-select" value={adminCycle} onChange={e => setAdminCycle(e.target.value)}>
                      <option value="">Все циклы</option>
                      {filters.cycles.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="export-filter-label">Статус</label>
                    <select className="export-filter-select" value={adminStatus} onChange={e => setAdminStatus(e.target.value)}>
                      <option value="">Все статусы</option>
                      {normalizedStatuses.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="export-filter-label">Сфера</label>
                    <select className="export-filter-select" value={adminSphere} onChange={e => setAdminSphere(e.target.value)}>
                      <option value="">Все сферы</option>
                      {normalizedSpheres.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="export-filter-label">Ответственный орган</label>
                    <select className="export-filter-select" value={adminResponsible} onChange={e => setAdminResponsible(e.target.value)}>
                      <option value="">Все органы</option>
                      {responsibleOptions.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn:'1 / -1' }}>
                    <label className="export-filter-label">Поиск (текст / орган / сфера)</label>
                    <input className="text-input" style={{ width:'100%' }} value={adminQ} onChange={e => setAdminQ(e.target.value)} placeholder="Введите текст для поиска..." />
                  </div>
                </div>

                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button className="primary-btn" onClick={handleExport}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Скачать Excel (.xlsx)
                  </button>
                  <button className="secondary-btn" onClick={() => { setAdminCycle(''); setAdminStatus(''); setAdminSphere(''); setAdminResponsible(''); setAdminQ('') }}>
                    ↺ Сбросить
                  </button>
                </div>
                <p className="export-note">Файл содержит все поля оригинальной таблицы пост-мониторинга. Совместим с Microsoft Excel и LibreOffice.</p>
              </div>

              <hr className="divider" />

              {/* Импорт */}
              <div className="admin-card">
                <div className="admin-section-header">
                  <svg className="admin-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span className="admin-section-title">Импорт нового файла</span>
                </div>
                <p className="admin-section-desc">
                  Загрузите обновлённый файл пост-мониторинга (.xlsx). Таблица <strong>registry_records</strong> будет перезаписана. Лист должен иметь ту же структуру колонок.
                </p>

                <label className="import-dropzone" style={{ display:'block' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" style={{ margin:'0 auto' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p className="import-dropzone-title">{importing ? 'Загрузка...' : 'Выберите файл .xlsx'}</p>
                  <p className="import-dropzone-sub">или перетащите сюда</p>
                  <input type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleImport} disabled={importing} />
                </label>

                {importResult && (
                  <div className={`import-result${importError ? ' error' : ''}`}>{importResult}</div>
                )}
              </div>
            </div>
          )}

        </main>
      </section>

      {/* ── DETAIL MODAL ── */}
      {detailOpen && detail && (
        <Modal
          title={`Рекомендация № ${detail.seq_no ?? detail.id}`}
          subtitle={detail.record_type_normalized || 'Рекомендация'}
          onClose={() => setDetailOpen(false)}
        >
          <div style={{ display:'flex', flexDirection:'column', gap:16, fontSize:13 }}>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                ['Тип', detail.record_type_normalized],
                ['Цикл', detail.cycle],
                ['Сфера', detail.sphere_normalized],
                ['Ответственный исполнитель', detail.responsible_org],
                ['Срок исполнения', detail.due_raw],
                ['Статус ГО', detail.status_normalized],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <p style={{ fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--muted-foreground)', marginBottom:3 }}>{label}</p>
                  {label === 'Статус ГО'
                    ? <span className={badgeClass(String(val || ''))}>{val || '—'}</span>
                    : <p style={{ lineHeight:1.5 }}>{val as string || '—'}</p>
                  }
                </div>
              ))}
            </div>

            {[
              ['Предложение', detail.proposal_text],
              ['Заинтересованные государственные органы', detail.interested_orgs],
              ['Форма завершения', detail.completion_form],
              ['Позиция ГО 2024–2025', detail.position_go_2024_2025],
              ['Позиция ГО на 27.03.2026', detail.position_go_2026_03_27],
              ['Позиция АДГС', detail.position_adgs],
              ['Кейс', detail.case_raw],
              ['Комментарий', detail.comment],
            ].map(([label, val]) => (
              <div key={label as string}>
                <p style={{ fontSize:10.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--muted-foreground)', marginBottom:4 }}>{label}</p>
                <p style={{ background:'hsl(214,32%,96%)', borderRadius:'var(--radius)', padding:'10px 12px', lineHeight:1.6, fontSize:13, color: val ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                  {val as string || '—'}
                </p>
              </div>
            ))}

          </div>
        </Modal>
      )}

      {/* ── STATUS MODAL ── */}
      {statusOpen && statusItem && (
        <Modal
          title={`Обновить статус № ${statusItem.seq_no ?? statusItem.id}`}
          subtitle={statusItem.proposal_text}
          onClose={() => setStatusOpen(false)}
          small
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Статус ГО</label>
              <select className="filter-select" value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                <option value="">Выберите статус</option>
                <option value="В работе">В работе</option>
                <option value="Исполнено">Исполнено</option>
                <option value="Не поддерживается">Не поддерживается</option>
                <option value="Исключить">Исключить</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Срок исполнения</label>
              <input className="text-input" value={formDue} onChange={e => setFormDue(e.target.value)} placeholder="напр. 2 квартал 2026 года" />
            </div>
            <div className="form-group full">
              <label className="form-label">Позиция ГО на 27.03.2026</label>
              <textarea className="textarea" value={formGo} onChange={e => setFormGo(e.target.value)} rows={3} />
            </div>
            <div className="form-group full">
              <label className="form-label">Позиция АДГС</label>
              <textarea className="textarea" value={formAdgs} onChange={e => setFormAdgs(e.target.value)} rows={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Изменил</label>
              <input className="text-input" value={formChangedBy} onChange={e => setFormChangedBy(e.target.value)} placeholder="ФИО или должность" />
            </div>
            <div className="form-group">
              <label className="form-label">Комментарий</label>
              <input className="text-input" value={formComment} onChange={e => setFormComment(e.target.value)} placeholder="Необязательно" />
            </div>
          </div>

          <div className="modal-footer">
            <button className="secondary-btn" onClick={() => setStatusOpen(false)}>Отмена</button>
            <button className="primary-btn" onClick={saveStatus} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
