import { useState, useEffect } from 'react';

function readVar(name: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `hsl(${v})`;
}

function readRaw(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function withAlpha(hslColor: string, alpha: number): string {
  // "hsl(213 94% 38%)" → "hsl(213 94% 38% / 0.13)"
  return hslColor.replace(/\)$/, ` / ${alpha})`);
}

export function getChartTheme() {
  return {
    muted:           readVar('--muted-foreground'),
    border:          readVar('--border'),
    grid:            readRaw('--chart-grid'),
    statusDone:      readVar('--status-done'),
    statusActive:    readVar('--status-active'),
    statusExcluded:  readVar('--status-excluded'),
    statusOverdue:   readVar('--status-overdue'),
    analiz:          readVar('--primary'),
    monitoring:      readVar('--chart-monitoring'),
  };
}

export type ChartTheme = ReturnType<typeof getChartTheme>;

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(getChartTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(getChartTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
