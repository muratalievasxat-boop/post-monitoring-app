import { useState } from 'react'
import './styles.css'
import DashboardPage from './pages/DashboardPage'
import RegistryPage from './pages/RegistryPage'
import UpdatePage from './pages/UpdatePage'
import ExportPage from './pages/ExportPage'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'

type TabId = 'dashboard' | 'registry' | 'update' | 'export'

export function App() {
  const [tab, setTab] = useState<TabId>('dashboard')

  const title =
    tab === 'dashboard'
      ? 'Общий дашборд'
      : tab === 'registry'
      ? 'Реестр рекомендаций'
      : tab === 'update'
      ? 'Обновление статусов'
      : 'Администрирование'

  return (
    <div className="app-shell">
      <Sidebar current={tab} onChange={setTab} />
      <section className="main">
        <Topbar title={title} />
        <main className="content">
          {tab === 'dashboard' && <DashboardPage />}
          {tab === 'registry' && <RegistryPage />}
          {tab === 'update' && <UpdatePage />}
          {tab === 'export' && <ExportPage />}
        </main>
      </section>
    </div>
  )
}
