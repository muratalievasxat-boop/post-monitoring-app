import { useState, type FormEvent } from 'react';

interface LoginPageProps {
  onLogin: (token: string, user: AuthUser) => void;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'td' | 'viewer';
  td_name?: string;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Ошибка входа'); return; }
      localStorage.setItem('jwt', data.token);
      onLogin(data.token, data.user);
    } catch {
      setError('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'hsl(var(--background))',
    }}>
      <div className="card" style={{ width: 360, padding: '32px 28px' }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'hsl(var(--foreground))', marginBottom: 4 }}>Вход</div>
          <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>Система мониторинга дебюрократизации</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="admin@debiuro.kz"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))', fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: 5 }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))', fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, padding: '10px 0', borderRadius: 8, border: 'none',
              background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
