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

const LEGEND = [
  { color: '#16a34a', label: '≥ 2.0 балла' },
  { color: '#d97706', label: '1.0–1.9 балла' },
  { color: '#dc2626', label: '< 1.0 балла' },
  { color: '#cbd5e1', label: 'Нет данных' },
];

export default function KazakhstanMap({ stats, onClickRegion: _onClickRegion }: Props) {
  void stats;

  return (
    <div style={{ width: '100%' }}>
      <img
        src="/kazakhstan-map.svg"
        alt="Карта Казахстана"
        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}
      />

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        {LEGEND.map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
