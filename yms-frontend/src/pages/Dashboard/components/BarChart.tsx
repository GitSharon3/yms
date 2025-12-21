type Bar = {
  label: string;
  value: number;
  color: string;
};

function clamp(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function BarChart({
  bars,
  height = 160,
}: {
  bars: Bar[];
  height?: number;
}) {
  const max = Math.max(1, ...bars.map((b) => clamp(b.value)));

  return (
    <div className="barChart">
      <div className="barGrid" style={{ height }}>
        {bars.map((b) => {
          const v = clamp(b.value);
          const pct = (v / max) * 100;
          return (
            <div key={b.label} className="barCol">
              <div className="barTrack">
                <div className="barFill" style={{ height: `${pct}%`, background: b.color }} />
              </div>
              <div className="barMeta">
                <div className="barLabel">{b.label}</div>
                <div className="barValue">{v}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
