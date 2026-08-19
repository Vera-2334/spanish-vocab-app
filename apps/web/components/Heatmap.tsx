"use client"

// GitHub 风格热力图（27 周 × 7 天）
const WEEKS = 27
const DAYS = 7
const CELL_SIZE = 12
const CELL_GAP = 3

const DAY_LABELS = ["", "一", "", "三", "", "五", ""]
const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
]

const COLORS = [
  "var(--color-heatmap-0)", // 0
  "var(--color-heatmap-1)", // 1-25%
  "var(--color-heatmap-2)", // 26-50%
  "var(--color-heatmap-3)", // 51-75%
  "var(--color-heatmap-4)", // 76-100%
]

interface HeatmapProps {
  data: Map<string, number> // key: "YYYY-MM-DD", value: study count
}

function getLevel(count: number, maxCount: number): number {
  if (count === 0) return 0
  if (maxCount <= 0) return 4
  const pct = count / maxCount
  if (pct <= 0.25) return 1
  if (pct <= 0.5) return 2
  if (pct <= 0.75) return 3
  return 4
}

export function Heatmap({ data }: HeatmapProps) {
  const today = new Date()
  const totalDays = WEEKS * DAYS

  // 找到最大值
  let maxCount = 0
  for (const count of data.values()) {
    if (count > maxCount) maxCount = count
  }
  // 确保最少有 4 天数据时 level 4
  if (maxCount < 4) maxCount = 4

  // 生成所有日期
  const cells: { date: string; dayOfWeek: number; month: number; level: number }[] = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    const count = data.get(key) ?? 0
    cells.push({
      date: key,
      dayOfWeek: d.getDay() === 0 ? 6 : d.getDay() - 1, // Mon=0 ... Sun=6
      month: d.getMonth(),
      level: getLevel(count, maxCount),
    })
  }

  const svgWidth = WEEKS * (CELL_SIZE + CELL_GAP) + 28
  const svgHeight = DAYS * (CELL_SIZE + CELL_GAP) + 20

  // 计算月份标签位置
  const monthPositions: { label: string; x: number }[] = []
  let lastMonth = -1
  for (let w = 0; w < WEEKS; w++) {
    const cellIdx = w * DAYS
    if (cellIdx < cells.length) {
      const m = cells[cellIdx].month
      if (m !== lastMonth) {
        monthPositions.push({ label: MONTH_LABELS[m], x: 28 + w * (CELL_SIZE + CELL_GAP) })
        lastMonth = m
      }
    }
  }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full max-w-3xl"
      aria-label="学习热力图"
      role="img"
    >
      {/* 星期标签 */}
      {DAY_LABELS.map((label, i) => (
        <text
          key={`day-${i}`}
          x={0}
          y={i * (CELL_SIZE + CELL_GAP) + 22}
          className="fill-[var(--color-text-secondary)] text-[9px]"
        >
          {label}
        </text>
      ))}

      {/* 月份标签 */}
      {monthPositions.map(({ label, x }, i) => (
        <text
          key={`month-${i}`}
          x={x}
          y={10}
          className="fill-[var(--color-text-secondary)] text-[9px]"
        >
          {label}
        </text>
      ))}

      {/* 格子 */}
      {cells.map((cell, idx) => {
        const w = Math.floor(idx / DAYS)
        const d = idx % DAYS
        const x = 24 + w * (CELL_SIZE + CELL_GAP)
        const y = 14 + d * (CELL_SIZE + CELL_GAP)
        return (
          <rect
            key={cell.date}
            x={x}
            y={y}
            width={CELL_SIZE}
            height={CELL_SIZE}
            rx={3}
            fill={COLORS[cell.level]}
          >
            <title>
              {cell.date}: {data.get(cell.date) ?? 0} 次学习
            </title>
          </rect>
        )
      })}
    </svg>
  )
}