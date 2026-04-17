import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, FileText, PenSquare, Download, Menu, X, Sun, Moon, Database
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",         label: "Дашборд",         icon: LayoutDashboard },
  { href: "/registry", label: "Реестр",           icon: FileText },
  { href: "/update",   label: "Обновить статус",  icon: PenSquare },
  { href: "/export",   label: "Экспорт в Excel",  icon: Download },
];

function useDark() {
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return [dark, setDark] as const;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useDark();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-56 transition-transform duration-200",
          "bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))]",
          "lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[hsl(var(--sidebar-border))]">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="3" width="14" height="2" rx="1" fill="white"/>
              <rect x="2" y="8" width="9" height="2" rx="1" fill="white"/>
              <rect x="2" y="13" width="11" height="2" rx="1" fill="white"/>
              <circle cx="14" cy="13" r="3" fill="white" fillOpacity="0.9"/>
              <path d="M12.5 13l1.2 1.2 2-2" stroke="hsl(var(--primary))" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white leading-tight">Мониторинг</p>
            <p className="text-[10px] text-slate-400 leading-tight">Дебюрократизация</p>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = loc === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
                  "relative",
                  active
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-sky-400" />
                )}
                <Icon size={16} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[hsl(var(--sidebar-border))] text-[10.5px] text-slate-500">
          Данные на 06.04.2026
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded text-muted-foreground hover:bg-muted"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
            <span className="font-semibold text-sm text-foreground">
              {NAV.find(n => n.href === loc)?.label ?? "Мониторинг рекомендаций"}
            </span>
          </div>
          <button
            onClick={() => setDark(!dark)}
            className="p-1.5 rounded text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Переключить тему"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
