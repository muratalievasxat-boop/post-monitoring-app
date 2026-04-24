import { useState, useEffect } from 'react'
import './styles.css'
import DashboardPage from './pages/DashboardPage'
import RegistryPage from './pages/RegistryPage'
import UpdatePage from './pages/UpdatePage'
import ExportPage from './pages/ExportPage'
import CasesPage from './pages/CasesPage'
import CasesDashboardPage from './pages/CasesDashboardPage'
import UsersPage from './pages/UsersPage'
import LoginPage, { type AuthUser } from './pages/LoginPage'
import { Sidebar, type TabId } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'

export interface RegistryDrillDown {
  cycle?: string
  status?: string
  sphere?: string
  search?: string
}

function loadAuth(): { token: string; user: AuthUser } | null {
  const token = localStorage.getItem('jwt')
  const raw = localStorage.getItem('user')
  if (!token || !raw) return null
  try { return { token, user: JSON.parse(raw) } } catch { return null }
}

const TD_ALLOWED_TABS: TabId[] = ['cases'];

export function App() {
  const [auth, setAuth] = useState<{ token: string; user: AuthUser } | null>(loadAuth)
  const [tab, setTab] = useState<TabId>(() => {
    const a = loadAuth();
    return a?.user.role === 'td' ? 'cases' : 'dashboard';
  })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })
  const [drillDown, setDrillDown] = useState<RegistryDrillDown | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function handleLogin(token: string, user: AuthUser) {
    localStorage.setItem('jwt', token)
    localStorage.setItem('user', JSON.stringify(user))
    setAuth({ token, user })
    if (user.role === 'td') setTab('cases')
  }

  function handleLogout() {
    localStorage.removeItem('jwt')
    localStorage.removeItem('user')
    setAuth(null)
    setTab('dashboard')
  }

  function handleTabChange(newTab: TabId) {
    if (auth?.user.role === 'td' && !TD_ALLOWED_TABS.includes(newTab)) return;
    setTab(newTab);
  }

  function handleDrillDown(filter: RegistryDrillDown) {
    if (auth?.user.role === 'td') return;
    setDrillDown(filter)
    setTab('registry')
  }

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />
  }

  const title =
    tab === 'dashboard' ? 'Дашборд'
    : tab === 'registry' ? 'Реестр'
    : tab === 'update' ? 'Обновление'
    : tab === 'cases' ? 'Кейсы ТД'
    : tab === 'cases-dashboard' ? 'Аналитика кейсов'
    : tab === 'users' ? 'Пользователи'
    : 'Администрирование'

  return (
    <div className="app-shell">
      <Sidebar current={tab} onChange={handleTabChange} user={auth.user} onLogout={handleLogout} />
      <section className="main">
        <Topbar title={title} theme={theme} onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />
        <main className="page-content">
          {tab === 'dashboard' && auth.user.role !== 'td' && <DashboardPage onDrillDown={handleDrillDown} />}
          {tab === 'registry' && auth.user.role !== 'td' && (
            <RegistryPage
              drillDown={drillDown}
              onDrillDownApplied={() => setDrillDown(null)}
              user={auth.user}
            />
          )}
          {tab === 'update' && auth.user.role !== 'td' && <UpdatePage />}
          {tab === 'export' && auth.user.role !== 'td' && <ExportPage />}
          {tab === 'cases' && <CasesPage user={auth.user} />}
          {tab === 'cases-dashboard' && auth.user.role !== 'td' && <CasesDashboardPage />}
          {tab === 'users' && auth.user.role !== 'td' && <UsersPage />}
        </main>
      </section>
    </div>
  )
}
