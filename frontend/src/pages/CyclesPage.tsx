import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Plus, Lock, Unlock } from 'lucide-react';

interface CycleRow {
  id: number;
  name: string;
  is_open: boolean;
  start_date: string | null;
  end_date: string | null;
}

function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('jwt');
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers as Record<string, string> ?? {}) },
  });
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13,
    border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))', boxSizing: 'border-box',
  };
}

export default function CyclesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: cycles = [], isLoading } = useQuery<CycleRow[]>({
    queryKey: ['/api/cases/cycles'],
    queryFn: () => authFetch('/api/cases/cycles').then(r => r.json()),
  });

  const openMutation = useMutation({
    mutationFn: (id: number) =>
      authFetch(`/api/cases/cycles/${id}/open`, { method: 'PATCH' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/cases/cycles'] }),
  });

  const closeMutation = useMutation({
    mutationFn: (id: number) =>
      authFetch(`/api/cases/cycles/${id}/close`, { method: 'PATCH' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/cases/cycles'] }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      authFetch('/api/cases/cycles', { method: 'POST', body: JSON.stringify(form) }).then(async r => {
        if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? 'Ошибка'); }
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/cases/cycles'] });
      setForm({ name: '', start_date: '', end_date: '' });
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  return (
    <div className="content" style={{ gap: 16, maxWidth: 800 }}>
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <RefreshCw size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Циклы сбора кейсов</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Загрузка...</div>
        ) : cycles.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Циклов нет</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                {['Название', 'Статус', 'Начало', 'Конец', ''].map((h, i) => (
                  <th key={i} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cycles.map(cy => (
                <tr key={cy.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <td style={{ padding: '10px 10px', fontWeight: 600 }}>{cy.name}</td>
                  <td style={{ padding: '10px 10px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      background: cy.is_open ? '#dcfce7' : '#f1f5f9',
                      color: cy.is_open ? '#15803d' : '#64748b',
                      border: `1px solid ${cy.is_open ? '#86efac' : '#cbd5e1'}`,
                    }}>
                      {cy.is_open ? <><Unlock size={10} />Открыт</> : <><Lock size={10} />Закрыт</>}
                    </span>
                  </td>
                  <td style={{ padding: '10px 10px', color: 'hsl(var(--muted-foreground))' }}>{fmtDate(cy.start_date)}</td>
                  <td style={{ padding: '10px 10px', color: 'hsl(var(--muted-foreground))' }}>{fmtDate(cy.end_date)}</td>
                  <td style={{ padding: '10px 10px' }}>
                    {cy.is_open ? (
                      <button
                        onClick={() => closeMutation.mutate(cy.id)}
                        disabled={closeMutation.isPending}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                        Закрыть
                      </button>
                    ) : (
                      <button
                        onClick={() => openMutation.mutate(cy.id)}
                        disabled={openMutation.isPending}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#15803d', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                        Открыть
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create new cycle */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Plus size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Создать цикл</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: 4 }}>Название *</label>
            <input style={inputStyle()} placeholder="Цикл X" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: 4 }}>Начало</label>
            <input style={inputStyle()} type="date" value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: 4 }}>Конец</label>
            <input style={inputStyle()} type="date" value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
        </div>
        {formError && (
          <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{formError}</div>
        )}
        <button
          onClick={() => createMutation.mutate()}
          disabled={!form.name.trim() || createMutation.isPending}
          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: !form.name.trim() ? 0.5 : 1 }}>
          {createMutation.isPending ? 'Создание...' : 'Создать цикл'}
        </button>
      </div>
    </div>
  );
}
