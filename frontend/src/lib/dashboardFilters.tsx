import { createContext, useContext, useState, type ReactNode } from 'react';

export type StatusFilter = 'В работе' | 'Исполнено' | 'Для снятия с контроля' | null;

export interface SavedView {
  id: string;
  name: string;
  filters: { status: StatusFilter; cycle: string | null; sphere: string | null };
  created_at: string;
}

interface DashboardFilterState {
  status: StatusFilter;
  cycle: string | null;
  sphere: string | null;
  setStatus: (s: StatusFilter) => void;
  setCycle: (c: string | null) => void;
  setSphere: (s: string | null) => void;
  reset: () => void;
  saveCurrentView: (name: string) => void;
  loadView: (id: string) => void;
  deleteView: (id: string) => void;
  listViews: () => SavedView[];
}

const DashboardFilterContext = createContext<DashboardFilterState | null>(null);

const VIEWS_KEY = 'dashboard.saved-views';

function readViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    return raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch { return []; }
}

function writeViews(views: SavedView[]) {
  try { localStorage.setItem(VIEWS_KEY, JSON.stringify(views)); } catch { /* noop */ }
}

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StatusFilter>(null);
  const [cycle, setCycle] = useState<string | null>(null);
  const [sphere, setSphere] = useState<string | null>(null);
  const [views, setViews] = useState<SavedView[]>(readViews);

  function reset() { setStatus(null); setCycle(null); setSphere(null); }

  function saveCurrentView(name: string) {
    const view: SavedView = {
      id: crypto.randomUUID(),
      name: name.trim(),
      filters: { status, cycle, sphere },
      created_at: new Date().toISOString(),
    };
    const next = [...views, view];
    setViews(next);
    writeViews(next);
  }

  function loadView(id: string) {
    const view = views.find(v => v.id === id);
    if (!view) return;
    setStatus(view.filters.status);
    setCycle(view.filters.cycle);
    setSphere(view.filters.sphere);
  }

  function deleteView(id: string) {
    const next = views.filter(v => v.id !== id);
    setViews(next);
    writeViews(next);
  }

  function listViews() { return views; }

  return (
    <DashboardFilterContext.Provider value={{
      status, cycle, sphere, setStatus, setCycle, setSphere, reset,
      saveCurrentView, loadView, deleteView, listViews,
    }}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters(): DashboardFilterState {
  const ctx = useContext(DashboardFilterContext);
  if (!ctx) throw new Error('useDashboardFilters must be used within DashboardFilterProvider');
  return ctx;
}
