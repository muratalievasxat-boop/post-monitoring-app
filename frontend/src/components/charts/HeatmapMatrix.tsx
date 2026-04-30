import { useState } from "react";

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
  if (pct === null) return "#e2e8f0";
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

const CELL_W = 40;
const CELL_H = 24;
const LABEL_W = 152;
const HEADER_H = 30;

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
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const spheres = [...new Set(data.map((d) => d.sphere))].sort();
  const cycles = [...new Set(data.map((d) => d.cycle))].sort();
  const lookup = new Map(data.map((d) => [`${d.sphere}|${d.cycle}`, d]));

  if (!spheres.length) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
        Недостаточно данных для отображения
      </div>
    );
  }

  const svgW = LABEL_W + cycles.length * CELL_W;
  const svgH = HEADER_H + spheres.length * CELL_H;
  const minW = cycles.length * 32 + 100;

  return (
    <div style={{ overflowX: "auto", position: "relative" }} onMouseLeave={() => setTooltip(null)}>
      <svg
        width={svgW}
        height={svgH}
        style={{ minWidth: minW, display: "block" }}
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
            fill="#64748b"
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
              {/* Row label */}
              <text
                x={LABEL_W - 8}
                y={y + CELL_H / 2 + 4}
                textAnchor="end"
                fontSize={10}
                fill="#64748b"
              >
                {label}
              </text>

              {/* Cells */}
              {cycles.map((cycle, ci) => {
                const d = lookup.get(`${sphere}|${cycle}`);
                const fill = pctFill(d?.pct ?? null);
                const tColor = d ? textColor(fill) : "#94a3b8";
                const x = LABEL_W + ci * CELL_W;

                return (
                  <g
                    key={cycle}
                    style={{ cursor: d && onClickCell ? "pointer" : "default" }}
                    onClick={d && onClickCell ? () => onClickCell(sphere, cycle) : undefined}
                    onMouseMove={(e) =>
                      d &&
                      setTooltip({
                        x: e.clientX,
                        y: e.clientY,
                        d,
                      })
                    }
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <rect
                      x={x + 1}
                      y={y + 1}
                      width={CELL_W - 3}
                      height={CELL_H - 3}
                      rx={3}
                      fill={d ? fill : "#f1f5f9"}
                      opacity={d ? 1 : 0.6}
                    />
                    {d?.pct !== null && d !== undefined && (
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
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 7,
            padding: "7px 11px",
            fontSize: 12,
            zIndex: 9999,
            pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>
            {tooltip.d.sphere}
          </div>
          <div style={{ color: "hsl(var(--muted-foreground))" }}>
            Цикл {tooltip.d.cycle}
          </div>
          <div style={{ fontWeight: 700, color: "hsl(var(--foreground))" }}>
            {tooltip.d.pct}% ({tooltip.d.done} из {tooltip.d.total})
          </div>
        </div>
      )}
    </div>
  );
}
