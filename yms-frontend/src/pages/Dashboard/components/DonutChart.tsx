type Segment = {
  label: string;
  value: number;
  color: string;
};

function clamp(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function DonutChart({
  segments,
  size = 168,
  thickness = 18,
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  const total = segments.reduce((acc, s) => acc + clamp(s.value), 0);
  let offset = 0;

  return (
    <div className="donutWrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(15, 23, 42, 0.08)"
          strokeWidth={thickness}
        />

        {total > 0
          ? segments.map((s) => {
              const value = clamp(s.value);
              const len = (value / total) * c;
              const dasharray = `${len} ${c - len}`;
              const dashoffset = -offset;
              offset += len;

              return (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={dasharray}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
            })
          : null}

        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="donutCenter">
          {total}
        </text>
        <text x="50%" y="58%" textAnchor="middle" dominantBaseline="hanging" className="donutCenterSub">
          total
        </text>
      </svg>

      <div className="donutLegend">
        {segments.map((s) => (
          <div key={s.label} className="legendRow">
            <span className="legendDot" style={{ background: s.color }} />
            <span className="legendLabel">{s.label}</span>
            <span className="legendValue">{clamp(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
