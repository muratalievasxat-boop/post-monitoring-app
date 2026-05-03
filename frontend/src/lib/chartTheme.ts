import { useState, useEffect } from 'react';

export function withAlpha(hslColor: string, alpha: number): string {
  // "hsl(213 94% 38%)" → "hsl(213 94% 38% / 0.13)"
  return hslColor.replace(/\)$/, ` / ${alpha})`);
}

export function getChartTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  return {
    // Backgrounds
    cardBg:   isDark ? 'hsl(222 47% 8%)'   : 'hsl(0 0% 100%)',
    elevated: isDark ? 'hsl(222 47% 11%)'  : 'hsl(220 20% 96%)',

    // Text
    muted: isDark ? 'hsl(215 20% 62%)' : 'hsl(222 15% 52%)',
    body:  isDark ? 'hsl(215 30% 84%)' : 'hsl(222 30% 18%)',

    // Status
    statusDone:     isDark ? 'hsl(142 70% 45%)' : 'hsl(158 64% 38%)',
    statusActive:   isDark ? 'hsl(35 91% 55%)'  : 'hsl(35 91% 48%)',
    statusExcluded: isDark ? 'hsl(217 19% 65%)' : 'hsl(217 19% 55%)',
    statusOverdue:  isDark ? 'hsl(0 72% 60%)'   : 'hsl(0 72% 51%)',

    // Grid
    grid: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.10)',

    // Accent
    accent:     isDark ? 'hsl(199 89% 55%)' : 'hsl(199 89% 48%)',
    analiz:     isDark ? 'hsl(217 91% 65%)' : 'hsl(217 91% 60%)',
    monitoring: isDark ? 'hsl(252 80% 70%)' : 'hsl(252 80% 62%)',
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
