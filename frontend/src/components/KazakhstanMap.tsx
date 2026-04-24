import { useState, useEffect, useRef } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';

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

const EN_TO_RU: Record<string, string> = {
  'Akmola':            'Акмолинская область',
  'Aktobe':            'Актюбинская область',
  'Almaty':            'Алматинская область',
  'Almaty (city)':     'город Алматы',
  'Atyrau':            'Атырауская область',
  'Abai':              'Область Абай',
  'Jambyl':            'Жамбылская область',
  'Ulytau':            'Область Ұлытау',
  'Kostanay':          'Костанайская область',
  'Kyzylorda':         'Кызылординская область',
  'Mangystau':         'Мангистауская область',
  'North Kazakhstan':  'Северо-Казахстанская область',
  'Astana':            'город Астана',
  'Pavlodar':          'Павлодарская область',
  'Shymkent (city)':   'город Шымкент',
  'Turkestan':         'Туркестанская область',
  'West Kazakhstan':   'Западно-Казахстанская область',
  'Karaganda':         'Карагандинская область',
  'Jetisu':            'Область Жетісу',
  'East Kazakhstan':   'Восточно-Казахстанская область',
};

function scoreColor(score: number | undefined): string {
  if (score == null) return '#cbd5e1';
  if (score >= 2.0) return '#16a34a';
  if (score >= 1.0) return '#d97706';
  return '#dc2626';
}

const W = 800;
const H = 500;

interface TooltipState {
  cx: number;      // center-X of region bbox, container px
  bboxTop: number; // top of region bbox, container px
  bboxBot: number; // bottom of region bbox, container px
  tdName: string;
}

interface GeoFeature {
  type: 'Feature';
  properties: { name: string; [k: string]: unknown };
  geometry: GeoPermissibleObjects;
}

export default function KazakhstanMap({ stats, onClickRegion }: Props) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [hoveredTd, setHoveredTd] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const statMap = new Map(stats.map(s => [s.td_name, s]));

  useEffect(() => {
    fetch('/kz.json')
      .then(r => r.json())
      .then(data => setFeatures(data.features as GeoFeature[]));
  }, []);

  const projection = geoMercator().fitSize([W, H], {
    type: 'FeatureCollection',
    features,
  } as GeoPermissibleObjects);

  const pathGen = geoPath(projection);

  function enter(e: React.MouseEvent<SVGPathElement>, tdName: string) {
    const { width, height } = svgRef.current!.getBoundingClientRect();
    const scaleX = width / W;
    const scaleY = height / H;
    const bbox = (e.currentTarget as SVGPathElement).getBBox();
    setHoveredTd(tdName);
    setTooltip({
      cx:      (bbox.x + bbox.width  / 2) * scaleX,
      bboxTop: bbox.y                     * scaleY,
      bboxBot: (bbox.y + bbox.height)     * scaleY,
      tdName,
    });
  }

  function move(_e: React.MouseEvent<SVGPathElement>, tdName: string) {
    setHoveredTd(tdName);
  }

  function leave() {
    setHoveredTd(null);
    setTooltip(null);
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={leave}
      >
        {features.map(f => {
          const tdName = EN_TO_RU[f.properties.name] ?? f.properties.name;
          const stat = statMap.get(tdName);
          const isHov = hoveredTd === tdName;
          const d = pathGen(f.geometry) ?? '';
          return (
            <path
              key={f.properties.name}
              d={d}
              fill={scoreColor(stat?.score)}
              fillOpacity={isHov ? 1 : 0.75}
              stroke="white"
              strokeWidth={isHov ? 1.5 : 0.8}
              style={{ cursor: 'pointer', transition: 'fill-opacity 0.12s' }}
              onMouseEnter={e => enter(e, tdName)}
              onMouseMove={e => move(e, tdName)}
              onMouseLeave={leave}
              onClick={() => onClickRegion(tdName)}
            />
          );
        })}
      </svg>

      {tooltip && (() => {
        const stat = statMap.get(tooltip.tdName);
        const svgEl = svgRef.current;
        const cw = svgEl?.getBoundingClientRect().width  ?? W;
        const ch = svgEl?.getBoundingClientRect().height ?? H;
        const TW = 230;
        const TH = 84;

        // Prefer above the region; fall back to below if not enough space
        let top  = tooltip.bboxTop - TH - 8;
        if (top < 8) top = tooltip.bboxBot + 8;

        // Center horizontally on the region
        let left = tooltip.cx - TW / 2;

        // Clamp inside container
        left = Math.min(Math.max(left, 8), cw - TW - 8);
        top  = Math.min(Math.max(top,  8), ch - TH - 8);

        return (
          <div style={{
            position: 'absolute',
            left,
            top,
            background: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 20,
            width: TW,
          }}>
            <div style={{ fontWeight: 700, color: 'hsl(var(--foreground))', marginBottom: 4, whiteSpace: 'normal', lineHeight: 1.3 }}>
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
