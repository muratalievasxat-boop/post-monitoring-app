import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus, X, MessageSquare, ChevronRight } from 'lucide-react';
import type { AuthUser } from './LoginPage';

// ─── types ───────────────────────────────────────────────────────────────────

interface MeasurableEffect {
  type: string;
  value: string;
  unit: string;
  verification: string;
}

interface Comment {
  id: number;
  user_id: number;
  author_name: string | null;
  text: string;
  created_at: string;
}

interface CaseRow {
  id: number;
  title: string;
  sphere: string | null;
  td_name: string | null;
  status: string;
  author_name: string | null;
  created_at: string;
}

interface CaseDetail extends CaseRow {
  problem: string | null;
  problem_description: string | null;
  solution: string | null;
  npa_refs: string | null;
  measurable_effect: MeasurableEffect | null;
  analyst_comment: string | null;
  submitted_by: number;
  comments: Comment[];
}

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  pending: 'На рассмотрении',
  in_review: 'Изучается',
  returned: 'Возвращён',
  accepted: 'Принят',
  rejected: 'Отклонён',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  pending: '#d97706',
  in_review: '#2563eb',
  returned: '#f59e0b',
  accepted: '#16a34a',
  rejected: '#dc2626',
};

const EFFECT_TYPES = [
  'Экономия времени граждан',
  'Экономия бюджетных средств',
  'Снижение административной нагрузки',
  'Сокращение документов',
  'Ускорение процедур',
  'Цифровизация процесса',
  'Другое',
];

const ANALYST_STATUSES = [
  { value: 'in_review', label: 'Изучается' },
  { value: 'returned',  label: 'Возвращён на доработку' },
  { value: 'accepted',  label: 'Принят' },
  { value: 'rejected',  label: 'Отклонён' },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('jwt');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── shared UI ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#94a3b8';
  return (
    <span style={{
      background: color + '18', color, border: `1px solid ${color}44`,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'hsl(var(--foreground))', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}

function inputStyle(multiline = false): React.CSSProperties {
  return {
    width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13,
    border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))', boxSizing: 'border-box',
    ...(multiline ? { resize: 'vertical' as const, minHeight: 72 } : {}),
  };
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: 4 }}>
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'hsl(var(--muted-foreground))', margin: '20px 0 10px', borderBottom: '1px solid hsl(var(--border))', paddingBottom: 6 }}>
      {children}
    </div>
  );
}

// ─── CreateCaseModal ──────────────────────────────────────────────────────────

function CreateCaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: '', sphere: '', problem: '', problem_description: '',
    solution: '', npa_refs: '',
  });
  const [effect, setEffect] = useState<MeasurableEffect>({ type: '', value: '', unit: '', verification: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent, status: 'draft' | 'pending') {
    e.preventDefault();
    if (!form.title.trim()) { setError('Название обязательно'); return; }
    setSaving(true); setError(null);
    try {
      const body: Record<string, unknown> = { ...form, status };
      if (effect.type || effect.value || effect.unit || effect.verification) {
        body.measurable_effect = effect;
      }
      const res = await authFetch('/api/cases', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Ошибка'); return; }
      onCreated();
      onClose();
    } catch { setError('Ошибка соединения'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '32px 16px' }}
      onClick={onClose}>
      <div style={{ background: 'hsl(var(--background))', borderRadius: 14, width: '100%', maxWidth: 640, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '24px 28px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Новый кейс</div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: 4 }}><X size={18} /></button>
        </div>

        <form onSubmit={e => handleSubmit(e, 'pending')}>
          <SectionTitle>Основная информация</SectionTitle>
          <div style={{ marginBottom: 12 }}>
            <Label>Название кейса *</Label>
            <input style={inputStyle()} value={form.title} onChange={set('title')} placeholder="Краткое название инициативы" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Label>Сфера</Label>
            <input style={inputStyle()} value={form.sphere} onChange={set('sphere')} placeholder="Например: Бизнес, Образование, Здравоохранение..." />
          </div>

          <SectionTitle>Проблема</SectionTitle>
          <div style={{ marginBottom: 12 }}>
            <Label>Суть проблемы (кратко)</Label>
            <input style={inputStyle()} value={form.problem} onChange={set('problem')} placeholder="Одна фраза о проблеме" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Label>Описание проблемы</Label>
            <textarea style={inputStyle(true)} value={form.problem_description} onChange={set('problem_description')} placeholder="Подробное описание: кто страдает, как часто, какие последствия..." rows={4} />
          </div>

          <SectionTitle>Решение</SectionTitle>
          <div style={{ marginBottom: 12 }}>
            <Label>Предлагаемое решение</Label>
            <textarea style={inputStyle(true)} value={form.solution} onChange={set('solution')} placeholder="Что конкретно предлагается изменить..." rows={4} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Label>Ссылки на НПА</Label>
            <textarea style={inputStyle(true)} value={form.npa_refs} onChange={set('npa_refs')} placeholder="Приказ №..., Постановление №..." rows={2} />
          </div>

          <SectionTitle>Измеримый эффект</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <Label>Тип эффекта</Label>
              <select style={{ ...inputStyle(), appearance: 'auto' } as React.CSSProperties}
                value={effect.type} onChange={e => setEffect(ef => ({ ...ef, type: e.target.value }))}>
                <option value="">— выберите —</option>
                {EFFECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Label>Значение</Label>
                <input style={inputStyle()} type="number" value={effect.value} onChange={e => setEffect(ef => ({ ...ef, value: e.target.value }))} placeholder="1000" />
              </div>
              <div style={{ flex: 1 }}>
                <Label>Единица</Label>
                <input style={inputStyle()} value={effect.unit} onChange={e => setEffect(ef => ({ ...ef, unit: e.target.value }))} placeholder="часов/год" />
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <Label>Способ верификации</Label>
            <textarea style={inputStyle(true)} value={effect.verification} onChange={e => setEffect(ef => ({ ...ef, verification: e.target.value }))} placeholder="Как можно проверить достижение эффекта..." rows={2} />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={e => handleSubmit(e as unknown as FormEvent, 'draft')} disabled={saving}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'none', color: 'hsl(var(--foreground))', fontSize: 13, cursor: 'pointer' }}>
              Сохранить черновик
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Отправка...' : 'Отправить на рассмотрение'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CaseDetailModal ──────────────────────────────────────────────────────────

function CaseDetailModal({ caseId, user, onClose, onUpdated }: {
  caseId: number; user: AuthUser; onClose: () => void; onUpdated: () => void;
}) {
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [analystComment, setAnalystComment] = useState('');
  const [commentText, setCommentText] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  const { data: c, isLoading } = useQuery<CaseDetail>({
    queryKey: ['/api/cases', caseId],
    queryFn: async () => {
      const res = await authFetch(`/api/cases/${caseId}`);
      if (!res.ok) throw new Error('Ошибка загрузки');
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/cases/${caseId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, analyst_comment: analystComment || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Ошибка'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/cases', caseId] });
      onUpdated();
      setNewStatus('');
      setAnalystComment('');
      setStatusError(null);
    },
    onError: (e: Error) => setStatusError(e.message),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/cases/${caseId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Ошибка'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/cases', caseId] });
      setCommentText('');
      setCommentError(null);
    },
    onError: (e: Error) => setCommentError(e.message),
  });

  const isAnalyst = user.role === 'admin' || user.role === 'analyst';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '32px 16px' }}
      onClick={onClose}>
      <div style={{ background: 'hsl(var(--background))', borderRadius: 14, width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '24px 28px' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            {isLoading ? (
              <div style={{ height: 20, background: 'hsl(var(--border))', borderRadius: 6, width: '60%' }} />
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{c?.title}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {c && <StatusBadge status={c.status} />}
                  {c?.td_name && <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{c.td_name}</span>}
                  {c?.author_name && <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>· {c.author_name}</span>}
                  {c?.created_at && <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>· {fmtDateShort(c.created_at)}</span>}
                </div>
              </>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: 4, flexShrink: 0 }}><X size={18} /></button>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Загрузка...</div>
        ) : c ? (
          <>
            {/* Case fields */}
            {c.sphere && (
              <div style={{ marginBottom: 14, padding: '6px 12px', background: 'hsl(var(--muted))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                Сфера: <strong style={{ color: 'hsl(var(--foreground))' }}>{c.sphere}</strong>
              </div>
            )}

            <SectionTitle>Проблема</SectionTitle>
            <Field label="Суть проблемы" value={c.problem} />
            <Field label="Описание" value={c.problem_description} />

            <SectionTitle>Решение</SectionTitle>
            <Field label="Предлагаемое решение" value={c.solution} />
            <Field label="Ссылки на НПА" value={c.npa_refs} />

            {c.measurable_effect && (
              <>
                <SectionTitle>Измеримый эффект</SectionTitle>
                <div style={{ background: 'hsl(var(--muted))', borderRadius: 10, padding: '12px 14px', marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Тип эффекта" value={c.measurable_effect.type} />
                  <Field label="Значение" value={c.measurable_effect.value ? `${c.measurable_effect.value} ${c.measurable_effect.unit}` : null} />
                  <div style={{ gridColumn: '1/-1' }}>
                    <Field label="Верификация" value={c.measurable_effect.verification} />
                  </div>
                </div>
              </>
            )}

            {c.analyst_comment && (
              <>
                <SectionTitle>Комментарий аналитика</SectionTitle>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#92400e', marginBottom: 12 }}>
                  {c.analyst_comment}
                </div>
              </>
            )}

            {/* Status change (analyst/admin) */}
            {isAnalyst && (
              <>
                <SectionTitle>Смена статуса</SectionTitle>
                <div style={{ background: 'hsl(var(--muted))', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <Label>Новый статус</Label>
                      <select style={{ ...inputStyle(), appearance: 'auto' } as React.CSSProperties}
                        value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                        <option value="">— выберите —</option>
                        {ANALYST_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Текущий статус</Label>
                      <div style={{ paddingTop: 6 }}><StatusBadge status={c.status} /></div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <Label>Комментарий аналитика</Label>
                    <textarea style={inputStyle(true)} value={analystComment} onChange={e => setAnalystComment(e.target.value)}
                      placeholder="Обоснование решения, что доработать..." rows={2} />
                  </div>
                  {statusError && (
                    <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>{statusError}</div>
                  )}
                  <button
                    disabled={!newStatus || statusMutation.isPending}
                    onClick={() => statusMutation.mutate()}
                    style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: newStatus ? '#2563eb' : '#94a3b8', color: '#fff', fontWeight: 600, fontSize: 13, cursor: newStatus ? 'pointer' : 'not-allowed' }}>
                    {statusMutation.isPending ? 'Сохранение...' : 'Сохранить статус'}
                  </button>
                </div>
              </>
            )}

            {/* Comments */}
            <SectionTitle>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare size={11} /> Комментарии ({c.comments.length})
              </span>
            </SectionTitle>

            {c.comments.length === 0 ? (
              <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 12 }}>Комментариев пока нет</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {c.comments.map(cm => (
                  <div key={cm.id} style={{ background: 'hsl(var(--muted))', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>{cm.author_name ?? 'Пользователь'}</span>
                      <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{fmtDate(cm.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'hsl(var(--foreground))', whiteSpace: 'pre-wrap' }}>{cm.text}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                style={{ ...inputStyle(true), minHeight: 0, flex: 1, resize: 'none' }}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Написать комментарий..."
                rows={2}
              />
              <button
                disabled={!commentText.trim() || commentMutation.isPending}
                onClick={() => commentMutation.mutate()}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: commentText.trim() ? '#2563eb' : '#94a3b8', color: '#fff', fontWeight: 600, fontSize: 13, cursor: commentText.trim() ? 'pointer' : 'not-allowed', alignSelf: 'flex-end' }}>
                {commentMutation.isPending ? '...' : 'Отправить'}
              </button>
            </div>
            {commentError && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{commentError}</div>}
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#dc2626' }}>Не удалось загрузить кейс</div>
        )}
      </div>
    </div>
  );
}

// ─── CasesPage ────────────────────────────────────────────────────────────────

export default function CasesPage({ user }: { user: AuthUser }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: cases = [], isLoading } = useQuery<CaseRow[]>({
    queryKey: ['/api/cases'],
    queryFn: async () => {
      const res = await authFetch('/api/cases');
      if (!res.ok) throw new Error('Ошибка загрузки');
      return res.json();
    },
  });

  function refresh() { qc.invalidateQueries({ queryKey: ['/api/cases'] }); }

  const isTd = user.role === 'td';

  return (
    <div className="content" style={{ gap: 16 }}>
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Briefcase size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Кейсы ТД</span>
          <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
            {isTd ? 'Мои кейсы' : `Всего: ${cases.length}`}
          </span>
          {isTd && (
            <button
              onClick={() => setCreateOpen(true)}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Создать кейс
            </button>
          )}
        </div>

        {isLoading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Загрузка...</div>
        ) : cases.length === 0 ? (
          <div style={{ padding: '56px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 12 }}>Кейсов пока нет</div>
            {isTd && (
              <button onClick={() => setCreateOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: '1px dashed hsl(var(--border))', background: 'none', color: 'hsl(var(--muted-foreground))', fontSize: 13, cursor: 'pointer' }}>
                <Plus size={14} /> Создать первый кейс
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['#', 'Название', 'Сфера', 'ТД', 'Автор', 'Статус', 'Дата', ''].map((h, i) => (
                    <th key={i} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id}
                    onClick={() => setDetailId(c.id)}
                    style={{ borderBottom: '1px solid hsl(var(--border))', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--muted))')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '9px 10px', color: 'hsl(var(--muted-foreground))' }}>{c.id}</td>
                    <td style={{ padding: '9px 10px', fontWeight: 500, color: 'hsl(var(--foreground))' }}>{c.title}</td>
                    <td style={{ padding: '9px 10px', color: 'hsl(var(--muted-foreground))' }}>{c.sphere ?? '—'}</td>
                    <td style={{ padding: '9px 10px', color: 'hsl(var(--muted-foreground))' }}>{c.td_name ?? '—'}</td>
                    <td style={{ padding: '9px 10px', color: 'hsl(var(--muted-foreground))' }}>{c.author_name ?? '—'}</td>
                    <td style={{ padding: '9px 10px' }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: '9px 10px', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{fmtDateShort(c.created_at)}</td>
                    <td style={{ padding: '9px 10px', color: 'hsl(var(--muted-foreground))' }}><ChevronRight size={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateCaseModal
          onClose={() => setCreateOpen(false)}
          onCreated={refresh}
        />
      )}

      {detailId !== null && (
        <CaseDetailModal
          caseId={detailId}
          user={user}
          onClose={() => setDetailId(null)}
          onUpdated={refresh}
        />
      )}
    </div>
  );
}
