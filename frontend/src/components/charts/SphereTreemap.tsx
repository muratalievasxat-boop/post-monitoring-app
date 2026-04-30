import { useEffect, useRef, useState } from "react";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";

export interface SphereDatum {
  sphere: string;
  total: number;
  done: number;
  pct: number | null;
}

function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}

function pctFill(pct: number | null): string {
  if (pct === null) return "#94a3b8";
  const p = Math.max(0, Math.min(100, pct));
  return p < 50
    ? lerpHex("#dc2626", "#d97706", p / 50)
    : lerpHex("#d97706", "#16a34a", (p - 50) / 50);
}

function textColor(rgb: string): string {
  const m = rgb.match(/\d+/g);
  if (!m) return "#fff";
  const [r, g, b] = m.map(Number);
  const toLin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const lum = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  return lum > 0.35 ? "#1e293b" : "#fff";
}

const TREEMAP_H = 320;
const MOBILE_BP = 430;

function useWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0].contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

function BarList({ data, onClickCell }: { data: SphereDatum[]; onClickCell?: (sphere: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((d) => {
        const fill = pctFill(d.pct);
        return (
          <div
            key={d.sphere}
            onClick={onClickCell ? () => onClickCell(d.sphere) : undefined}
            style={{ cursor: onClickCell ? "pointer" : "default" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: "hsl(var(--foreground))", fontWeight: 500 }}>
                {d.sphere.length > 28 ? d.sphere.slice(0, 26) + "…" : d.sphere}
              </span>
              <span style={{ fontWeight: 700, color: "hsl(var(--foreground))", fontVariantNumeric: "tabular-nums" }}>
                {d.pct ?? 0}%
              </span>
            </div>
            <div style={{ height: 6, background: "hsl(var(--border))", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${d.pct ?? 0}%`, background: fill, transition: "width 0.5s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SphereTreemap({
  data,
  onClickCell,
}: {
  data: SphereDatum[];
  onClickCell?: (sphere: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth(containerRef);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BP);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (!data.length) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
        Недостаточно данных для отображения
      </div>
    );
  }

  if (isMobile) {
    return (
      <div ref={containerRef}>
        <BarList data={data} onClickCell={onClickCell} />
      </div>
    );
  }

  const root = hierarchy<{ children?: SphereDatum[] }>({ children: data })
    .sum((d) => (d as SphereDatum).total ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  treemap<{ children?: SphereDatum[] }>()
    .tile(treemapSquarify)
    .size([width, TREEMAP_H])
    .padding(2)(root);

  type LeafNode = { x0: number; y0: number; x1: number; y1: number; data: { sphere: string; total: number; pct: number }; value: number };
  const leaves = root.leaves() as unknown as LeafNode[];
  return (
    <div ref={containerRef} style={{ position: "relative", height: TREEMAP_H }}>
      <svg width={width} height={TREEMAP_H} style={{ display: "block" }}>
        {leaves.map((node) => {
          const d = node.data as unknown as SphereDatum;
          const w = node.x1 - node.x0;
          const h = node.y1 - node.y0;
          const fill = pctFill(d.pct);
          const tc = textColor(fill);
          const big = w > 70 && h > 40;
          const medium = w > 36 && h > 22;

          return (
            <g
              key={d.sphere}
              transform={`translate(${node.x0},${node.y0})`}
              style={{ cursor: onClickCell ? "pointer" : "default" }}
              onClick={onClickCell ? () => onClickCell(d.sphere) : undefined}
            >
              <rect width={w} height={h} rx={3} fill={fill} />
              {medium && (
                <text
                  x={w / 2}
                  y={big ? h / 2 - 8 : h / 2 + 4}
                  textAnchor="middle"
                  fontSize={big ? 11 : 10}
                  fontWeight={700}
                  fill={tc}
                  style={{ pointerEvents: "none" }}
                >
                  {big
                    ? d.sphere.length > Math.floor(w / 7)
                      ? d.sphere.slice(0, Math.floor(w / 7) - 1) + "…"
                      : d.sphere
                    : `${d.pct ?? 0}%`}
                </text>
              )}
              {big && (
                <>
                  <text
                    x={w / 2}
                    y={h / 2 + 6}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight={800}
                    fill={tc}
                    style={{ pointerEvents: "none" }}
                  >
                    {d.pct ?? 0}%
                  </text>
                  <text
                    x={w / 2}
                    y={h / 2 + 20}
                    textAnchor="middle"
                    fontSize={10}
                    fill={tc}
                    opacity={0.8}
                    style={{ pointerEvents: "none" }}
                  >
                    {d.total} рек.
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
