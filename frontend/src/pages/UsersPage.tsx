import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Pencil, Trash2, X, ShieldCheck } from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'td';
  td_name: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  analyst: 'Аналитик',
  td: 'ТД',
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#7c3aed',
  analyst: '#2563eb',
  td: '#d97706',
};

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
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? '#94a3b8';
  return (
    <span style={{
      background: color + '15', color, border: `1px solid ${color}33`,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
    }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13,
    border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))', boxSizing: 'border-box',
  };
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: 4 }}>
      {children}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
    </label>
  );
}

// ─── UserModal ────────────────────────────────────────────────────────────────

function UserModal({ editing, tdList, onClose, onSaved }: {
  editing: User | null;
  tdList: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    email: editing?.email ?? '',
    password: '',
    role: editing?.role ?? 'td',
    td_name: editing?.td_name ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setError('Имя и email обязательны'); return; }
    if (!editing && !form.password) { setError('Пароль обязателен для нового пользователя'); return; }
    if (form.role === 'td' && !form.td_name) { setError('Выберите территориальный департамент'); return; }

    setSaving(true); setError(null);
    try {
      const body: Record<string, string> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        td_name: form.role === 'td' ? form.td_name : '',
      };
      if (form.password) body.password = form.password;

      const url = editing ? `/api/users/${editing.id}` : '/api/users';
      const method = editing ? 'PATCH' : 'POST';
      const res = await authFetch(url, { method, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Ошибка'); return; }
      onSaved();
      onClose();
    } catch { setError('Ошибка соединения'); }
    finally { setSaving(false); }
  }

  const isNew = !editing;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: 'hsl(var(--background))', borderRadius: 14, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '24px 28px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{isNew ? 'Новый пользователь' : 'Редактировать'}</div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', padding: 4 }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Label required>Имя</Label>
            <input style={inputStyle()} value={form.name} onChange={set('name')} placeholder="Иван Иванов" />
          </div>
          <div>
            <Label required>Email</Label>
            <input style={inputStyle()} type="email" value={form.email} onChange={set('email')} placeholder="user@example.kz" />
          </div>
          <div>
            <Label required={isNew}>Пароль{!isNew && ' (оставьте пустым — не менять)'}</Label>
            <input style={inputStyle()} type="password" value={form.password} onChange={set('password')} placeholder={isNew ? 'Минимум 6 символов' : '••••••••'} />
          </div>
          <div>
            <Label required>Роль</Label>
            <select style={{ ...inputStyle(), appearance: 'auto' } as React.CSSProperties} value={form.role} onChange={set('role')}>
              <option value="td">ТД (территориальный департамент)</option>
              <option value="analyst">Аналитик</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          {form.role === 'td' && (
            <div>
              <Label required>Территориальный департамент</Label>
              <select style={{ ...inputStyle(), appearance: 'auto' } as React.CSSProperties} value={form.td_name} onChange={set('td_name')}>
                <option value="">— выберите ТД —</option>
                {tdList.map(td => <option key={td} value={td}>{td}</option>)}
              </select>
            </div>
          )}

          {error && (
            <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px' }}>{error}</div>
          )}

          <button type="submit" disabled={saving}
            style={{ padding: '9px 0', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: 4 }}>
            {saving ? 'Сохранение...' : isNew ? 'Создать' : 'Сохранить'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── DeleteConfirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ user, onClose, onDeleted }: { user: User; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await authFetch(`/api/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Ошибка'); return; }
      onDeleted();
      onClose();
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: 'hsl(var(--background))', borderRadius: 14, width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '24px 28px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Удалить пользователя?</div>
        <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 20 }}>
          <strong>{user.name}</strong> ({user.email}) будет удалён. Это действие нельзя отменить.
        </div>
        {error && <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'none', color: 'hsl(var(--foreground))', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
          <button onClick={handleDelete} disabled={loading}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Удаление...' : 'Удалить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── UsersPage ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const qc = useQueryClient();
  const [modalUser, setModalUser] = useState<User | null | 'new'>('new' as unknown as null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  useState(() => { setModalUser(null); });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await authFetch('/api/users');
      if (!res.ok) throw new Error('Ошибка загрузки');
      return res.json();
    },
  });

  const { data: tdList = [] } = useQuery<string[]>({
    queryKey: ['/api/users/td-list'],
    queryFn: async () => {
      const res = await authFetch('/api/users/td-list');
      if (!res.ok) return [];
      return res.json();
    },
  });

  function refresh() { qc.invalidateQueries({ queryKey: ['/api/users'] }); }

  const roleOrder: Record<string, number> = { admin: 0, analyst: 1, td: 2 };
  const sorted = [...users].sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));

  return (
    <div className="content" style={{ gap: 16 }}>
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Users size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Пользователи</span>
          <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Всего: {users.length}</span>
          <button
            onClick={() => setModalUser('new' as unknown as User)}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> Создать пользователя
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Загрузка...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>Пользователей нет</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Имя', 'Email', 'Роль', 'Департамент', 'Создан', ''].map((h, i) => (
                    <th key={i} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td style={{ padding: '9px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {u.role === 'admin' && <ShieldCheck size={13} style={{ color: '#7c3aed', flexShrink: 0 }} />}
                        <span style={{ fontWeight: 500, color: 'hsl(var(--foreground))' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '9px 10px', color: 'hsl(var(--muted-foreground))' }}>{u.email}</td>
                    <td style={{ padding: '9px 10px' }}><RoleBadge role={u.role} /></td>
                    <td style={{ padding: '9px 10px', color: 'hsl(var(--muted-foreground))' }}>{u.td_name ?? '—'}</td>
                    <td style={{ padding: '9px 10px', color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>
                    <td style={{ padding: '9px 10px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setModalUser(u)}
                          title="Редактировать"
                          style={{ background: 'none', border: '1px solid hsl(var(--border))', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center' }}>
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteUser(u)}
                          title="Удалить"
                          style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalUser !== null && (
        <UserModal
          editing={modalUser === 'new' as unknown as User ? null : modalUser}
          tdList={tdList}
          onClose={() => setModalUser(null)}
          onSaved={refresh}
        />
      )}

      {deleteUser && (
        <DeleteConfirm
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onDeleted={refresh}
        />
      )}
    </div>
  );
}
