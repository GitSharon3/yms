export function YardMapPlaceholder() {
  return (
    <div className="yardMap">
      <svg viewBox="0 0 920 320" role="img" aria-label="Yard map visualization placeholder" className="yardMapSvg">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#e8f0ff" />
            <stop offset="1" stopColor="#f6f8fc" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="920" height="320" rx="14" fill="url(#g)" />

        <rect x="70" y="60" width="420" height="200" rx="12" fill="#ffffff" stroke="rgba(15, 23, 42, 0.08)" />
        <rect x="520" y="60" width="330" height="200" rx="12" fill="#ffffff" stroke="rgba(15, 23, 42, 0.08)" />

        <rect x="110" y="96" width="340" height="24" rx="8" fill="#e2e8f0" />
        <rect x="110" y="136" width="340" height="24" rx="8" fill="#e2e8f0" />
        <rect x="110" y="176" width="340" height="24" rx="8" fill="#e2e8f0" />
        <rect x="110" y="216" width="240" height="24" rx="8" fill="#e2e8f0" />

        <rect x="560" y="96" width="250" height="60" rx="12" fill="#eff6ff" stroke="rgba(37, 99, 235, 0.28)" />
        <rect x="560" y="170" width="250" height="60" rx="12" fill="#ecfdf5" stroke="rgba(16, 185, 129, 0.28)" />

        <circle cx="118" cy="286" r="6" fill="#2563eb" />
        <text x="134" y="290" fontSize="12" fill="rgba(15, 23, 42, 0.6)">Real-time yard visualization</text>
      </svg>
    </div>
  );
}
