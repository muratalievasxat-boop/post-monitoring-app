import { useState, useEffect } from 'react'
import './styles.css'
import DashboardPage from './pages/DashboardPage'
import RegistryPage from './pages/RegistryPage'
import UpdatePage from './pages/UpdatePage'
import ExportPage from './pages/ExportPage'
import CasesPage from './pages/CasesPage'
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

export function App() {
  const [auth, setAuth] = useState<{ token: string; user: AuthUser } | null>(loadAuth)
  const [tab, setTab] = useState<TabId>('dashboard')
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
  }

  function handleLogout() {
    localStorage.removeItem('jwt')
    localStorage.removeItem('user')
    setAuth(null)
    setTab('dashboard')
  }

  function handleDrillDown(filter: RegistryDrillDown) {
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
    : 'Администрирование'

  return (
    <div className="app-shell">
      <Sidebar current={tab} onChange={setTab} user={auth.user} onLogout={handleLogout} />
      <section className="main">
        <Topbar title={title} theme={theme} onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />
        <main className="page-content">
          {tab === 'dashboard' && <DashboardPage onDrillDown={handleDrillDown} />}
          {tab === 'registry' && (
            <RegistryPage
              drillDown={drillDown}
              onDrillDownApplied={() => setDrillDown(null)}
            />
          )}
          {tab === 'update' && <UpdatePage />}
          {tab === 'export' && <ExportPage />}
          {tab === 'cases' && <CasesPage user={auth.user} />}
        </main>
      </section>
    </div>
  )
}
