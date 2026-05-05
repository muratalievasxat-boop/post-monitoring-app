import { useEffect, useRef, useState } from "react";

export interface HeatmapDatum {
  sphere: string;
  cycle: string;
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
  if (pct === null) return "hsl(var(--bg-elevated))";
  const p = Math.max(0, Math.min(100, pct));
  return p < 50
    ? lerpHex("#dc2626", "#d97706", p / 50)
    : lerpHex("#d97706", "#16a34a", (p - 50) / 50);
}

function textColor(rgb: string): string {
  const m = rgb.match(/\d+/g);
  if (!m) return "#fff";
  const [r, g, b] = m.map(Number);
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  return lum > 0.35 ? "#1e293b" : "#fff";
}

const LABEL_W = 180;
const CELL_H = 28;
const HEADER_H = 32;

interface TooltipState {
  x: number;
  y: number;
  d: HeatmapDatum;
}

export default function HeatmapMatrix({
  data,
  onClickCell,
}: {
  data: HeatmapDatum[];
  onClickCell?: (sphere: string, cycle: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const close = () => setTooltip(null);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, []);

  const spheres = [...new Set(data.map((d) => d.sphere))].sort();
  const cycles  = [...new Set(data.map((d) => d.cycle))].sort();
  const lookup  = new Map(data.map((d) => [`${d.sphere}|${d.cycle}`, d]));

  if (!spheres.length) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "hsl(var(--fg-meta))", fontSize: 13 }}>
        Недостаточно данных для отображения
      </div>
    );
  }

  const CELL_W = containerWidth > 0 && cycles.length > 0
    ? Math.floor((containerWidth - LABEL_W) / cycles.length)
    : 56;

  const svgW = containerWidth > 0 ? containerWidth : LABEL_W + cycles.length * 56;
  const svgH = HEADER_H + spheres.length * CELL_H;

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", overflowX: CELL_W < 40 ? "auto" : "hidden", position: "relative" }}
      onMouseLeave={() => setTooltip(null)}
      onTouchStart={() => setTooltip(null)}
    >
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width={svgW}
        height={svgH}
        style={{ display: "block", width: "100%" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Column headers */}
        {cycles.map((cycle, ci) => (
          <text
            key={cycle}
            x={LABEL_W + ci * CELL_W + CELL_W / 2}
            y={HEADER_H - 8}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill="hsl(var(--fg-meta))"
          >
            {cycle}
          </text>
        ))}

        {/* Rows */}
        {spheres.map((sphere, si) => {
          const y = HEADER_H + si * CELL_H;
          const label = sphere.length > 20 ? sphere.slice(0, 18) + "…" : sphere;
          return (
            <g key={sphere}>
              <title>{sphere}</title>

              {/* Row label */}
              <text
                x={LABEL_W - 8}
                y={y + CELL_H / 2 + 4}
                textAnchor="end"
                fontSize={10}
                fill="hsl(var(--fg-meta))"
              >
                {label}
              </text>

              {/* Cells */}
              {cycles.map((cycle, ci) => {
                const d      = lookup.get(`${sphere}|${cycle}`);
                const fill   = pctFill(d?.pct ?? null);
                const tColor = d && d.pct !== null ? textColor(fill) : "hsl(var(--fg-dim))";
                const x      = LABEL_W + ci * CELL_W;

                return (
                  <g
                    key={cycle}
                    style={{ cursor: d && onClickCell ? "pointer" : "default" }}
                    onClick={d && onClickCell ? () => onClickCell(sphere, cycle) : undefined}
                    onMouseMove={(e) =>
                      d && setTooltip({ x: e.clientX, y: e.clientY, d })
                    }
                    onMouseLeave={() => setTooltip(null)}
                    onTouchStart={(e) => {
                      if (!d) return;
                      e.stopPropagation();
                      const t = e.touches[0];
                      setTooltip({ x: t.clientX, y: t.clientY, d });
                    }}
                  >
                    <rect
                      x={x + 1}
                      y={y + 1}
                      width={CELL_W - 3}
                      height={CELL_H - 3}
                      rx={3}
                      fill={d ? fill : "hsl(var(--bg-elevated))"}
                      opacity={d ? 1 : 0.6}
                    />
                    {d && d.pct !== null && (
                      <text
                        x={x + CELL_W / 2}
                        y={y + CELL_H / 2 + 4}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={700}
                        fill={tColor}
                      >
                        {d.pct}%
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: Math.min(tooltip.x + 12, window.innerWidth - 220),
            top: tooltip.y - 48,
            background: "hsl(var(--bg-card))",
            border: "1px solid hsl(var(--border-hair))",
            borderRadius: 7,
            padding: "7px 11px",
            fontSize: 12,
            zIndex: 9999,
            pointerEvents: "none",
            boxShadow: "var(--shadow-pop)",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, color: "hsl(var(--fg-headline))" }}>
            {tooltip.d.sphere}
          </div>
          <div style={{ color: "hsl(var(--fg-meta))" }}>
            Цикл {tooltip.d.cycle}
          </div>
          <div style={{ fontWeight: 700, color: "hsl(var(--fg-body))" }}>
            {tooltip.d.pct}% ({tooltip.d.done} из {tooltip.d.total})
          </div>
        </div>
      )}
    </div>
  );
}
