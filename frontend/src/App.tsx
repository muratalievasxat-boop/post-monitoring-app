import { useState, useEffect } from 'react'
import './styles.css'
import DashboardPage from './pages/DashboardPage'
import RegistryPage from './pages/RegistryPage'
import UpdatePage from './pages/UpdatePage'
import ExportPage from './pages/ExportPage'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'

type TabId = 'dashboard' | 'registry' | 'update' | 'export'

export interface RegistryDrillDown {
  cycle?: string
  status?: string
  sphere?: string
  search?: string
}

export function App() {
  const [tab, setTab] = useState<TabId>('dashboard')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })
  const [drillDown, setDrillDown] = useState<RegistryDrillDown | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function handleDrillDown(filter: RegistryDrillDown) {
    setDrillDown(filter)
    setTab('registry')
  }

  const title =
    tab === 'dashboard' ? 'Дашборд'
    : tab === 'registry' ? 'Реестр'
    : tab === 'update' ? 'Обновление'
    : 'Администрирование'

  return (
    <div className="app-shell">
      <Sidebar current={tab} onChange={setTab} />
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
        </main>
      </section>
    </div>
  )
}
