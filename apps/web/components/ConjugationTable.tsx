import type { Conjugation, TenseRow } from "@spanish-vocab/database"
import { Check } from "lucide-react"

// 人称行：key 是 TenseRow 的字段名，label 是显示文本
const PERSON_ROWS: { key: keyof TenseRow; label: string }[] = [
  { key: "yo", label: "yo" },
  { key: "tu", label: "tú" },
  { key: "elEllaUsted", label: "él/ella/usted" },
  { key: "nosotros", label: "nosotros" },
  { key: "vosotros", label: "vosotros" },
  { key: "ellosEllasUstedes", label: "ellos/ellas/ustedes" },
]

type TenseKey = keyof Omit<Conjugation, "isRegular">

const TENSE_LABELS: { key: TenseKey; label: string }[] = [
  { key: "present", label: "现在时" },
  { key: "preterite", label: "过去时" },
  { key: "imperfect", label: "未完时" },
  { key: "future", label: "将来时" },
  { key: "subjunctive", label: "虚拟式" },
  { key: "imperative", label: "命令式" },
  { key: "conditional", label: "条件式" },
]

interface ConjugationTableProps {
  conjugation: Conjugation
  compact?: boolean  // 紧凑卡片布局（用于闪卡等窄容器）
}

export function ConjugationTable({ conjugation, compact }: ConjugationTableProps) {
  // 安全取值：某时态缺失时显示 "—"，不崩溃
  const getVal = (tense: TenseKey, person: keyof TenseRow): string => {
    const row = conjugation?.[tense]
    return row?.[person] || "—"
  }

  // 是否有实际变位数据（任一格非空）
  const hasData = TENSE_LABELS.some((t) =>
    PERSON_ROWS.some((p) => !!conjugation?.[t.key]?.[p.key])
  )

  // 没填任何变位 → 显示规则动词标记
  if (!hasData) {
    return (
      <div className={compact ? "space-y-2" : "card p-5 space-y-3"}>
        <h3 className="text-[var(--text-h2)] text-[var(--color-text-primary)]">
          动词变位
        </h3>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-bg-secondary)]">
          <span className="text-sm font-bold text-[var(--color-primary)] flex items-center gap-1"><Check size={14} />规则动词</span>
          <span className="text-xs text-[var(--color-text-secondary)]">按常规变位规则变化</span>
        </div>
      </div>
    )
  }

  return (
    <div className={compact ? "space-y-3" : "card p-5 space-y-4"}>
      <div className="flex items-center gap-2">
        <h3 className="text-[var(--text-h2)] text-[var(--color-text-primary)]">
          动词变位
        </h3>
        {conjugation.isRegular && (
          <span className="text-xs font-bold text-[var(--color-primary)]">（规则动词）</span>
        )}
      </div>

      {/* 桌面端：传统表格（紧凑模式不渲染） */}
      {!compact && (
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left py-1.5 px-2 text-xs text-[var(--color-text-secondary)] font-semibold sticky left-0 bg-white">
                人称
              </th>
              {TENSE_LABELS.map((t) => (
                <th
                  key={t.key}
                  className="text-left py-1.5 px-2 text-xs text-[var(--color-text-secondary)] font-semibold"
                >
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {PERSON_ROWS.map((p) => (
              <tr key={p.key}>
                <td className="py-1.5 px-2 font-semibold text-[var(--color-text-secondary)] sticky left-0 bg-white whitespace-nowrap">
                  {p.label}
                </td>
                {TENSE_LABELS.map((t) => (
                  <td
                    key={t.key}
                    className="py-1.5 px-2 text-[var(--color-text-primary)] font-medium"
                  >
                    {getVal(t.key, p.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* 卡片式（紧凑模式始终显示，非紧凑模式仅移动端） */}
      <div className={compact ? "space-y-3" : "md:hidden space-y-3"}>
        {TENSE_LABELS.map((t) => (
          <div key={t.key} className="rounded-xl bg-[var(--color-bg-secondary)] p-3">
            <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">
              {t.label}
            </p>
            <div className="space-y-1">
              {PERSON_ROWS.map((p) => (
                <div key={p.key} className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-secondary)]">{p.label}</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{getVal(t.key, p.key)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
