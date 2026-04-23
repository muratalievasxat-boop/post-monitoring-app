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

// Maps SVG path index → TD name (viewBox 3000×1700, geo: 50–87.4°E, 40.5–55.4°N)
// Paths #2,#9,#10,#12,#17-21 are water bodies / tiny islands — not interactive
// Paths #1, #5, #14 cover multiple current oblasts → resolved by mouse SVG-coordinates
const REGION_MAP: Record<number, string> = {
  0:  'Северо-Казахстанская область',   // centroid 71.7°E 53.4°N
  1:  'Актюбинская область',            // split: north→Костанайская, south→Актюбинская
  3:  'Павлодарская область',           // centroid 76.6°E 51.7°N ✓
  4:  'Акмолинская область',            // centroid 71.4°E 51.5°N ✓ Astana
  5:  'Западно-Казахстанская область',  // split: north→ЗКО, mid→Атырауская, south→Мангистауская
  6:  'Область Абай',                   // centroid 80.3°E 49.1°N
  7:  'Карагандинская область',         // centroid 74.5°E 49.3°N ✓
  8:  'Восточно-Казахстанская область', // centroid 84.5°E 49.1°N
  11: 'Область Ұлытау',                 // centroid 69.8°E 48.2°N
  13: 'Кызылординская область',         // centroid 66.5°E 45.3°N ✓
  14: 'Алматинская область',            // split: north→Жетісу, south→Алматинская
  15: 'Туркестанская область',          // centroid 70.4°E 43.1°N ✓
  16: 'Жамбылская область',             // centroid 73.8°E 43.7°N ✓
};

// Convert SVG pixel → geographic latitude (viewBox 3000×1700, N=55.4°, S=40.5°)
function svgYtoLat(y: number): number { return 55.4 - (y / 1700) * 14.9; }

// For paths that cover multiple current oblasts, resolve by mouse lat position
function resolveRegion(pathIdx: number, svgY: number): string | null {
  if (pathIdx === 5) {
    // Path covers western coastal strip: ЗКО (north) → Атырауская → Мангистауская (south)
    const lat = svgYtoLat(svgY);
    if (lat >= 49) return 'Западно-Казахстанская область'; // ~49–52.5°N
    if (lat >= 46) return 'Атырауская область';            // ~46–49°N
    return 'Мангистауская область';                        // ~42–46°N
  }
  if (pathIdx === 1) {
    // Path covers Костанайская (north) + Актюбинская (south)
    const lat = svgYtoLat(svgY);
    return lat >= 51.5 ? 'Костанайская область' : 'Актюбинская область';
  }
  if (pathIdx === 14) {
    // Path covers Жетісу (north, Taldykorgan ~45°N) + Алматинская (south)
    const lat = svgYtoLat(svgY);
    return lat >= 44.5 ? 'Область Жетісу' : 'Алматинская область';
  }
  return REGION_MAP[pathIdx] ?? null;
}

// Cities as circles (approximate SVG coords 3000×1700)
const CITIES = [
  { td_name: 'город Астана',   cx: 1720, cy: 478, r: 38 },
  { td_name: 'город Алматы',   cx: 1980, cy: 1388, r: 38 },
  { td_name: 'город Шымкент',  cx: 1579, cy: 1488, r: 38 },
];

function scoreColor(score: number | undefined): string {
  if (score === undefined || score === null) return '#cbd5e1';
  if (score >= 2.0) return '#16a34a';
  if (score >= 1.0) return '#d97706';
  return '#dc2626';
}

interface PathData {
  index: number;
  d: string;
  fill: string;
}

interface TooltipState {
  x: number;
  y: number;
  tdName: string;
}

export default function KazakhstanMap({ stats, onClickRegion }: Props) {
  const [paths, setPaths] = useState<PathData[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const statMap = new Map(stats.map(s => [s.td_name, s]));

  useEffect(() => {
    fetch('/kazakhstan-map.svg')
      .then(r => r.text())
      .then(text => {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const els = Array.from(doc.querySelectorAll('path'));
        setPaths(els.map((p, i) => ({
          index: i,
          d: p.getAttribute('d') ?? '',
          fill: p.getAttribute('fill') ?? '#d1d1d1',
        })));
      });
  }, []);

  // Client px → screen-relative px (for tooltip position)
  function clientXY(e: React.MouseEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // Client px → SVG viewBox coordinates (0–3000, 0–1700)
  function toSvgCoords(e: React.MouseEvent): { svgX: number; svgY: number } {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { svgX: p.x, svgY: p.y };
  }

  function handlePathEnter(e: React.MouseEvent, idx: number) {
    if (!(idx in REGION_MAP)) return;
    const { svgY } = toSvgCoords(e);
    const tdName = resolveRegion(idx, svgY);
    if (!tdName) return;
    setHovered(idx);
    const { x, y } = clientXY(e);
    setTooltip({ x, y, tdName });
  }

  function handlePathMove(e: React.MouseEvent, idx?: number) {
    const { x, y } = clientXY(e);
    if (idx !== undefined && idx in REGION_MAP) {
      const { svgY } = toSvgCoords(e);
      const tdName = resolveRegion(idx, svgY);
      if (tdName) setTooltip(t => t ? { ...t, x, y, tdName } : null);
    } else {
      setTooltip(t => t ? { ...t, x, y } : null);
    }
  }

  function handleCityEnter(e: React.MouseEvent, tdName: string) {
    setHoveredCity(tdName);
    const { x, y } = clientXY(e);
    setTooltip({ x, y, tdName });
  }

  function handleLeave() {
    setHovered(null);
    setHoveredCity(null);
    setTooltip(null);
  }

  const regionPaths = paths.filter(p => REGION_MAP[p.index] !== undefined);
  const otherPaths  = paths.filter(p => REGION_MAP[p.index] === undefined);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox="0 0 3000 1700"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={handleLeave}
      >
        {/* Non-interactive paths (water, islands) */}
        {otherPaths.map(p => (
          <path key={p.index} d={p.d} fill={p.fill} stroke="none" />
        ))}

        {/* Interactive region paths */}
        {regionPaths.map(p => {
          // For multi-region paths use a neutral color; real color shown in tooltip
          // For single-region paths use the stat color directly
          const isMulti = p.index === 1 || p.index === 5 || p.index === 14;
          const singleName = isMulti ? null : REGION_MAP[p.index]!;
          const stat = singleName ? statMap.get(singleName) : undefined;
          const fill = scoreColor(stat?.score);
          const isHov = hovered === p.index;
          return (
            <path
              key={p.index}
              d={p.d}
              fill={fill}
              fillOpacity={isHov ? 1 : 0.72}
              stroke="white"
              strokeWidth={isHov ? 4 : 2}
              style={{ cursor: 'pointer', transition: 'fill-opacity 0.12s, stroke-width 0.12s' }}
              onMouseEnter={e => handlePathEnter(e, p.index)}
              onMouseMove={e => handlePathMove(e, p.index)}
              onMouseLeave={handleLeave}
              onClick={e => {
                const { svgY } = toSvgCoords(e);
                const name = resolveRegion(p.index, svgY);
                if (name) onClickRegion(name);
              }}
            />
          );
        })}

        {/* City circles */}
        {CITIES.map(c => {
          const stat  = statMap.get(c.td_name);
          const fill  = scoreColor(stat?.score);
          const isHov = hoveredCity === c.td_name;
          return (
            <g
              key={c.td_name}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => handleCityEnter(e, c.td_name)}
              onMouseMove={handlePathMove}
              onMouseLeave={handleLeave}
              onClick={() => onClickRegion(c.td_name)}
            >
              <circle cx={c.cx} cy={c.cy} r={c.r} fill={fill} fillOpacity={isHov ? 1 : 0.9}
                stroke="white" strokeWidth={isHov ? 5 : 3} />
              <circle cx={c.cx} cy={c.cy} r={c.r - 10} fill="none" stroke="white"
                strokeWidth={1.5} strokeOpacity={0.6} />
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
            <div style={{ fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 4,
              whiteSpace: 'normal', lineHeight: 1.3 }}>
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
