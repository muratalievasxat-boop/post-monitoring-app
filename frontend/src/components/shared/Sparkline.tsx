interface Props { values: (number | null)[]; color?: string; height?: number; }

export default function Sparkline({ values, color = "#94a3b8", height = 24 }: Props) {
  const valid = values.filter((v): v is number => v !== null && v !== undefined && !isNaN(v as number));

  if (valid.length < 2) {
    return (
      <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block" }}>
        <line x1="0" y1={height / 2} x2="100" y2={height / 2} strokeWidth={1} opacity={0.35} style={{ stroke: "#94a3b8" }} />
      </svg>
    );
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const pts = valid
    .map((v, i) => {
      const x = (i / (valid.length - 1)) * 100;
      const y = height - 2 - ((v - min) / range) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
        style={{ stroke: color }}
      />
    </svg>
  );
}
