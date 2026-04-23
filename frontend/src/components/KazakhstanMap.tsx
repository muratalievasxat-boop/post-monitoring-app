import { useState, useEffect, useRef } from 'react';

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

// SVG viewBox 3000×1700; geo: lon 50–87.4°E, lat 55.4–40.5°N
// Helper: lat → SVG y
function latToY(lat: number) { return (55.4 - lat) / 14.9 * 1700; }

// Paths that cover ONE TD region (path index → td_name)
const SINGLE_REGION: Record<number, string> = {
  0:  'Северо-Казахстанская область',   // centroid 71.7°E 53.4°N
  3:  'Павлодарская область',           // 76.6°E 51.7°N ✓
  4:  'Акмолинская область',            // 71.4°E 51.5°N ✓ Astana
  6:  'Область Абай',                   // 80.3°E 49.1°N
  7:  'Карагандинская область',         // 74.5°E 49.3°N ✓
  8:  'Восточно-Казахстанская область', // 84.5°E 49.1°N
  11: 'Область Ұлытау',                 // 69.8°E 48.2°N
  13: 'Кызылординская область',         // 66.5°E 45.3°N ✓
  15: 'Туркестанская область',          // 70.4°E 43.1°N ✓
  16: 'Жамбылская область',             // 73.8°E 43.7°N ✓
};

// Paths covering MULTIPLE current oblasts — split by SVG-Y latitude bands
// Each band gets its own <clipPath><rect> so hover/color works independently
const MULTI_REGION: Record<number, { tdName: string; yMin: number; yMax: number }[]> = {
  // Path #5: western coastal strip (ЗКО north → Атырауская mid → Мангистауская south)
  5: [
    { tdName: 'Западно-Казахстанская область', yMin: 0,    yMax: latToY(49) },   // >49°N
    { tdName: 'Атырауская область',             yMin: latToY(49), yMax: latToY(46) }, // 46-49°N
    { tdName: 'Мангистауская область',          yMin: latToY(46), yMax: 1700 },   // <46°N
  ],
  // Path #1: center-west (Костанайская north → Актюбинская south)
  1: [
    { tdName: 'Костанайская область', yMin: 0,           yMax: latToY(51) }, // >51°N
    { tdName: 'Актюбинская область',  yMin: latToY(51),  yMax: 1700 },       // <51°N
  ],
  // Path #14: south-east (Жетісу north → Алматинская south)
  14: [
    { tdName: 'Область Жетісу',    yMin: 0,           yMax: latToY(44) }, // >44°N
    { tdName: 'Алматинская область', yMin: latToY(44), yMax: 1700 },      // <44°N
  ],
};

// City circles (approximate SVG coords, 3000×1700)
const CITIES = [
  { td_name: 'город Астана',   cx: 1720, cy: 478, r: 38 },
  { td_name: 'город Алматы',   cx: 1980, cy: 1388, r: 38 },
  { td_name: 'город Шымкент',  cx: 1579, cy: 1488, r: 38 },
];

// Water bodies / tiny islands — non-interactive
const WATER_SET = new Set([2, 9, 10, 12, 17, 18, 19, 20, 21]);

function scoreColor(score: number | undefined): string {
  if (score == null) return '#cbd5e1';
  if (score >= 2.0) return '#16a34a';
  if (score >= 1.0) return '#d97706';
  return '#dc2626';
}

interface PathData { index: number; d: string; fill: string }
interface TooltipState { x: number; y: number; tdName: string }

export default function KazakhstanMap({ stats, onClickRegion }: Props) {
  const [paths, setPaths]           = useState<PathData[]>([]);
  const [hoveredTd, setHoveredTd]   = useState<string | null>(null);
  const [tooltip, setTooltip]       = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const statMap = new Map(stats.map(s => [s.td_name, s]));

  useEffect(() => {
    fetch('/kazakhstan-map.svg')
      .then(r => r.text())
      .then(text => {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        setPaths(Array.from(doc.querySelectorAll('path')).map((p, i) => ({
          index: i,
          d: p.getAttribute('d') ?? '',
          fill: p.getAttribute('fill') ?? '#d1d1d1',
        })));
      });
  }, []);

  function clientPos(e: React.MouseEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function enter(e: React.MouseEvent, tdName: string) {
    const { x, y } = clientPos(e);
    setHoveredTd(tdName);
    setTooltip({ x, y, tdName });
  }

  function move(e: React.MouseEvent, tdName?: string) {
    const { x, y } = clientPos(e);
    setTooltip(t => t ? { ...t, x, y, tdName: tdName ?? t.tdName } : null);
    if (tdName) setHoveredTd(tdName);
  }

  function leave() {
    setHoveredTd(null);
    setTooltip(null);
  }

  const allMultiIdx = new Set(Object.keys(MULTI_REGION).map(Number));

  // Build clip IDs
  const clipDefs: React.ReactNode[] = [];
  for (const [pidxStr, bands] of Object.entries(MULTI_REGION)) {
    bands.forEach((band, i) => {
      clipDefs.push(
        <clipPath key={`cp-${pidxStr}-${i}`} id={`cp-${pidxStr}-${i}`}>
          <rect x={0} y={band.yMin} width={3000} height={band.yMax - band.yMin} />
        </clipPath>
      );
    });
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg ref={svgRef} viewBox="0 0 3000 1700"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={leave}>

        <defs>{clipDefs}</defs>

        {/* Water / non-interactive */}
        {paths.filter(p => WATER_SET.has(p.index)).map(p => (
          <path key={p.index} d={p.d} fill={p.fill} stroke="none" />
        ))}

        {/* Single-region interactive paths */}
        {paths.filter(p => p.index in SINGLE_REGION).map(p => {
          const tdName = SINGLE_REGION[p.index];
          const stat = statMap.get(tdName);
          const isHov = hoveredTd === tdName;
          return (
            <path key={p.index} d={p.d}
              fill={scoreColor(stat?.score)}
              fillOpacity={isHov ? 1 : 0.72}
              stroke="white" strokeWidth={isHov ? 4 : 2}
              style={{ cursor: 'pointer', transition: 'fill-opacity 0.12s' }}
              onMouseEnter={e => enter(e, tdName)}
              onMouseMove={e => move(e, tdName)}
              onMouseLeave={leave}
              onClick={() => onClickRegion(tdName)}
            />
          );
        })}

        {/* Multi-region paths — rendered once per band with clipPath */}
        {paths.filter(p => allMultiIdx.has(p.index)).map(p =>
          MULTI_REGION[p.index].map((band, i) => {
            const stat = statMap.get(band.tdName);
            const isHov = hoveredTd === band.tdName;
            return (
              <path key={`${p.index}-${i}`} d={p.d}
                fill={scoreColor(stat?.score)}
                fillOpacity={isHov ? 1 : 0.72}
                stroke="white" strokeWidth={isHov ? 4 : 2}
                clipPath={`url(#cp-${p.index}-${i})`}
                style={{ cursor: 'pointer', transition: 'fill-opacity 0.12s' }}
                onMouseEnter={e => enter(e, band.tdName)}
                onMouseMove={e => move(e, band.tdName)}
                onMouseLeave={leave}
                onClick={() => onClickRegion(band.tdName)}
              />
            );
          })
        )}

        {/* City circles */}
        {CITIES.map(c => {
          const stat = statMap.get(c.td_name);
          const isHov = hoveredTd === c.td_name;
          return (
            <g key={c.td_name} style={{ cursor: 'pointer' }}
              onMouseEnter={e => enter(e, c.td_name)}
              onMouseMove={e => move(e, c.td_name)}
              onMouseLeave={leave}
              onClick={() => onClickRegion(c.td_name)}>
              <circle cx={c.cx} cy={c.cy} r={c.r}
                fill={scoreColor(stat?.score)} fillOpacity={isHov ? 1 : 0.9}
                stroke="white" strokeWidth={isHov ? 5 : 3} />
              <circle cx={c.cx} cy={c.cy} r={c.r - 10}
                fill="none" stroke="white" strokeWidth={1.5} strokeOpacity={0.6} />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (() => {
        const stat = statMap.get(tooltip.tdName);
        return (
          <div style={{
            position: 'absolute', left: tooltip.x + 14, top: tooltip.y - 12,
            background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))',
            borderRadius: 8, padding: '8px 12px', fontSize: 12, pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 20, maxWidth: 230,
          }}>
            <div style={{ fontWeight: 700, color: 'hsl(var(--foreground))',
              marginBottom: 4, whiteSpace: 'normal', lineHeight: 1.3 }}>
              {tooltip.tdName}
            </div>
            {stat ? (
              <>
                <div style={{ color: 'hsl(var(--muted-foreground))' }}>
                  Подано: <strong style={{ color: 'hsl(var(--foreground))' }}>{stat.total}</strong>
                  {' · '}Принято: <strong style={{ color: '#16a34a' }}>{stat.accepted}</strong>
                </div>
                <div style={{ marginTop: 3, color: 'hsl(var(--muted-foreground))' }}>
                  Баллы: <strong style={{ color: scoreColor(stat.score) }}>{stat.score.toFixed(2)}</strong>
                </div>
              </>
            ) : (
              <div style={{ color: 'hsl(var(--muted-foreground))' }}>Нет данных</div>
            )}
          </div>
        );
      })()}

      {/* Legend */}
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
