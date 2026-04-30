import { createContext, useContext, useState, type ReactNode } from 'react';

export type StatusFilter = 'В работе' | 'Исполнено' | 'Для снятия с контроля' | null;

interface DashboardFilterState {
  status: StatusFilter;
  cycle: string | null;
  sphere: string | null;
  setStatus: (s: StatusFilter) => void;
  setCycle: (c: string | null) => void;
  setSphere: (s: string | null) => void;
  reset: () => void;
}

const DashboardFilterContext = createContext<DashboardFilterState | null>(null);

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StatusFilter>(null);
  const [cycle, setCycle] = useState<string | null>(null);
  const [sphere, setSphere] = useState<string | null>(null);

  function reset() {
    setStatus(null);
    setCycle(null);
    setSphere(null);
  }

  return (
    <DashboardFilterContext.Provider value={{ status, cycle, sphere, setStatus, setCycle, setSphere, reset }}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters(): DashboardFilterState {
  const ctx = useContext(DashboardFilterContext);
  if (!ctx) throw new Error('useDashboardFilters must be used within DashboardFilterProvider');
  return ctx;
}
