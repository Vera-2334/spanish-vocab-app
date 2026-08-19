interface DonutArc {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  arcs: DonutArc[]
  size?: number
  strokeWidth?: number
}

export function DonutChart({ arcs, size = 160, strokeWidth = 24 }: DonutChartProps) {
  const total = arcs.reduce((sum, a) => sum + a.value, 0)
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <text
          x={center}
          y={center + 6}
          textAnchor="middle"
          className="fill-[var(--color-text-secondary)] text-sm font-bold"
        >
          无数据
        </text>
      </svg>
    )
  }

  let dashOffset = 0

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="学习分布环形图"
    >
      {arcs.map((arc, i) => {
        const pct = total > 0 ? arc.value / total : 0
        // SVG dasharray 方式画弧
        const dashLength = pct * circumference
        const gap = circumference - dashLength

        const circle = (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${gap}`}
            strokeDashoffset={-dashOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        )
        dashOffset += dashLength
        return circle
      })}

      {/* 中心文字 */}
      <text
        x={center}
        y={center - 4}
        textAnchor="middle"
        className="fill-[var(--color-text-primary)] text-xl font-extrabold"
      >
        {total}
      </text>
      <text
        x={center}
        y={center + 14}
        textAnchor="middle"
        className="fill-[var(--color-text-secondary)] text-[10px] font-semibold"
      >
        总学习
      </text>
    </svg>
  )
}