export function Ring({ pct, size = 104, stroke = 11 }: { pct: number | undefined; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const val = pct == null ? 0 : Math.min(100, pct)
  const color = pct == null ? '#3a4440' : pct >= 85 ? '#34D399' : pct >= 70 ? '#F5A524' : '#F87171'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - val / 100)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: pct == null ? '#8B9490' : undefined }}>
          {pct == null ? '—' : `${pct}%`}
        </span>
        <span className="text-[10px] text-muted -mt-0.5">formy</span>
      </div>
    </div>
  )
}
