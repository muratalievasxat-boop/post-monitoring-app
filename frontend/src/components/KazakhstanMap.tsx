import { useState } from 'react';

export interface TdStat {
  td_name: string;
  total: number;
  accepted: number;
  score: number;
}

interface Props {
  stats: TdStat[];
  onClickRegion: (tdName: string) => void;
}

interface Tooltip {
  x: number;
  y: number;
  td_name: string;
  stat: TdStat | null;
}

type PolyRegion   = { td_name: string; points: string; cx?: never; cy?: never; r?: never };
type CircleRegion = { td_name: string; cx: number; cy: number; r: number; points?: never };
type RegionDef    = PolyRegion | CircleRegion;

// viewBox 0 0 780 510
const REGIONS: RegionDef[] = [
  // Western strip (Caspian coast)
  { td_name: 'Западно-Казахстанская область', points: '0,72 112,72 116,198 68,240 0,232' },
  { td_name: 'Атырауская область',            points: '0,232 68,240 116,198 122,330 58,354 0,338' },
  { td_name: 'Мангистауская область',         points: '0,338 58,354 122,330 128,466 0,468' },
  // West-center
  { td_name: 'Актюбинская область',           points: '112,72 278,72 280,188 262,322 180,322 180,390 122,330 116,198' },
  // Central-west
  { td_name: 'Область Ұлытау',               points: '180,322 262,322 268,310 302,390 252,398 180,398' },
  // Northern belt
  { td_name: 'Костанайская область',          points: '278,72 398,72 400,122 382,212 280,188' },
  { td_name: 'Северо-Казахстанская область',  points: '398,72 560,72 562,134 444,144 400,122' },
  { td_name: 'Акмолинская область',           points: '400,122 444,144 562,134 565,240 454,240 382,230 382,212' },
  { td_name: 'Павлодарская область',          points: '560,72 698,72 700,198 568,244 562,134' },
  // Central
  { td_name: 'Карагандинская область',        points: '382,212 382,230 454,240 568,244 582,372 498,384 444,390 302,390 268,310 262,322 280,188' },
  // South belt
  { td_name: 'Кызылординская область',        points: '180,398 252,398 302,390 444,390 450,498 324,504 180,470' },
  { td_name: 'Туркестанская область',         points: '324,504 450,498 532,506 532,510 300,510' },
  { td_name: 'Жамбылская область',            points: '444,390 498,384 582,372 660,384 664,498 532,506 450,498' },
  { td_name: 'Алматинская область',           points: '664,498 700,474 780,470 780,510 664,510' },
  // East
  { td_name: 'Восточно-Казахстанская область', points: '698,72 780,72 780,270 708,272 700,198' },
  { td_name: 'Область Абай',                  points: '568,244 700,198 708,272 780,270 780,370 670,374 582,372' },
  { td_name: 'Область Жетісу',               points: '660,384 670,374 780,370 780,470 700,474' },
  // Cities
  { td_name: 'город Астана',   cx: 462, cy: 190, r: 13 },
  { td_name: 'город Алматы',   cx: 682, cy: 448, r: 13 },
  { td_name: 'город Шымкент',  cx: 438, cy: 474, r: 13 },
];

function scoreColor(score: number | undefined): string {
  if (score === undefined || score === null) return '#cbd5e1';
  if (score >= 2.0) return '#16a34a';
  if (score >= 1.0) return '#d97706';
  return '#dc2626';
}

export default function KazakhstanMap({ stats, onClickRegion }: Props) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const statMap = new Map(stats.map(s => [s.td_name, s]));

  function handleEnter(e: React.MouseEvent<SVGElement>, td_name: string) {
    const svg = e.currentTarget.closest('svg') as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, td_name, stat: statMap.get(td_name) ?? null });
  }

  function handleMove(e: React.MouseEvent<SVGElement>) {
    if (!tooltip) return;
    const svg = e.currentTarget.closest('svg') as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    setTooltip(t => t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox="0 0 780 510"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <rect width="780" height="510" fill="hsl(var(--muted))" rx="8" />

        {REGIONS.filter(r => !r.cx).map(r => {
          const stat = statMap.get(r.td_name);
          const fill = scoreColor(stat?.score);
          return (
            <polygon
              key={r.td_name}
              points={(r as PolyRegion).points}
              fill={fill}
              fillOpacity={0.75}
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
              style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
              onMouseEnter={e => handleEnter(e, r.td_name)}
              onMouseMove={handleMove}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => onClickRegion(r.td_name)}
              onMouseOver={e => (e.currentTarget as SVGPolygonElement).setAttribute('fill-opacity', '1')}
              onMouseOut={e => (e.currentTarget as SVGPolygonElement).setAttribute('fill-opacity', '0.75')}
            />
          );
        })}

        {REGIONS.filter(r => !!r.cx).map(r => {
          const cr = r as CircleRegion;
          const stat = statMap.get(cr.td_name);
          const fill = scoreColor(stat?.score);
          return (
            <g
              key={cr.td_name}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => handleEnter(e as unknown as React.MouseEvent<SVGElement>, cr.td_name)}
              onMouseMove={handleMove}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => onClickRegion(cr.td_name)}
            >
              <circle cx={cr.cx} cy={cr.cy} r={cr.r} fill={fill} fillOpacity={0.9} stroke="hsl(var(--background))" strokeWidth={2} />
              <circle cx={cr.cx} cy={cr.cy} r={cr.r - 4} fill="none" stroke="white" strokeWidth={1} strokeOpacity={0.6} />
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 12,
          top: tooltip.y - 10,
          background: 'hsl(var(--background))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          zIndex: 10,
          maxWidth: 220,
        }}>
          <div style={{ fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 4, whiteSpace: 'normal', lineHeight: 1.3 }}>
            {tooltip.td_name}
          </div>
          {tooltip.stat ? (
            <>
              <div style={{ color: 'hsl(var(--muted-foreground))' }}>
                Подано: <strong style={{ color: 'hsl(var(--foreground))' }}>{tooltip.stat.total}</strong>
                {' · '}Принято: <strong style={{ color: '#16a34a' }}>{tooltip.stat.accepted}</strong>
              </div>
              <div style={{ marginTop: 3, color: 'hsl(var(--muted-foreground))' }}>
                Баллы: <strong style={{ color: scoreColor(tooltip.stat.score) }}>{tooltip.stat.score.toFixed(2)}</strong>
              </div>
            </>
          ) : (
            <div style={{ color: 'hsl(var(--muted-foreground))' }}>Нет данных</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { color: '#16a34a', label: '≥ 2.0 балла' },
          { color: '#d97706', label: '1.0–1.9 балла' },
          { color: '#dc2626', label: '< 1.0 балла' },
          { color: '#cbd5e1', label: 'Нет данных' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
