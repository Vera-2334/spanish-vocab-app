"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { LayoutDashboard, BookOpen, Brain, Target, Flame, Save, Calendar, BarChart3 } from "lucide-react"
import { useWordStore } from "@/stores/wordStore"
import { useSrsStore } from "@/stores/srsStore"
import { isDueToday, isMastered } from "@spanish-vocab/database"
import { Heatmap } from "@/components/Heatmap"
import { DonutChart } from "@/components/DonutChart"
import { shouldRemindBackup } from "@/lib/backup"

export default function DashboardPage() {
  const { words, fetchWords } = useWordStore()
  const { streakDays, longestStreak, recalcStats, dueCount } = useSrsStore()

  useEffect(() => { fetchWords() }, [])
  useEffect(() => { if (words.length > 0) recalcStats() }, [words.length])

  const stats = useMemo(() => {
    const total = words.length
    const mastered = words.filter((w) => isMastered(w.srsState)).length
    const learning = total - mastered
    const retention = total > 0 ? Math.round((mastered / total) * 100) : 0
    const todayReview = words.filter((w) => isDueToday(w.srsState) && !isMastered(w.srsState)).length
    return { total, mastered, learning, retention, todayReview }
  }, [words])

  const heatmapData = useMemo(() => {
    const map = new Map<string, number>()
    for (const w of words) {
      if (w.srsState.lastReviewedAt > 0) {
        const date = new Date(w.srsState.lastReviewedAt).toISOString().split("T")[0]
        map.set(date, (map.get(date) ?? 0) + 1)
      }
    }
    return map
  }, [words])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard size={28} strokeWidth={2.5} className="text-[var(--color-primary)]" />
        <h1 className="text-[var(--text-h1)] text-[var(--color-text-primary)]">仪表盘</h1>
      </div>

      {/* 备份提醒 */}
      {shouldRemindBackup(words.length) && (
        <Link href="/settings" className="card p-3 bg-amber-50 border-[var(--color-accent)] flex items-center gap-2 no-underline hover:bg-amber-100 transition-colors">
          <Save size={16} className="text-[var(--color-accent)] shrink-0" />
          <span className="text-xs text-[var(--color-accent)] font-semibold flex-1">建议备份数据，防止浏览器清缓存丢失</span>
          <span className="text-xs text-[var(--color-accent)]">→</span>
        </Link>
      )}

      {/* 连击 + 今日待复习 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <Flame size={24} className="mx-auto mb-1 text-[var(--color-accent)]" />
          <p className="text-2xl font-extrabold text-[var(--color-text-primary)]">{streakDays} 天</p>
          <p className="text-xs text-[var(--color-text-secondary)]">连续打卡 · 最长 {longestStreak} 天</p>
        </div>
        <Link href="/study" className="card p-4 text-center no-underline hover:border-[var(--color-primary)]">
          <Brain size={24} className="mx-auto mb-1 text-[var(--color-primary)]" />
          <p className="text-2xl font-extrabold text-[var(--color-primary)]">{stats.todayReview}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">今日待复习</p>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: "总单词", value: stats.total, color: "text-[var(--color-primary)]" },
          { icon: Target, label: "掌握率", value: `${stats.retention}%`, color: "text-[var(--color-secondary)]" },
          { icon: Brain, label: "已掌握", value: stats.mastered, color: "text-[var(--color-accent)]" },
          { icon: LayoutDashboard, label: "学习中", value: stats.learning, color: "text-[var(--color-primary)]" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <Icon size={20} className={`mx-auto mb-2 ${color}`} />
            <p className="text-2xl font-extrabold text-[var(--color-text-primary)]">{value}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* 热力图 */}
      {words.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-1.5"><Calendar size={16} className="text-[var(--color-text-secondary)]" />学习热力图</h3>
          <div className="overflow-x-auto"><Heatmap data={heatmapData} /></div>
        </div>
      )}

      {/* 环形图 */}
      {words.length > 0 && (
        <div className="card p-5 flex flex-col items-center">
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3 self-start flex items-center gap-1.5"><BarChart3 size={16} className="text-[var(--color-text-secondary)]" />单词分布</h3>
          <DonutChart
            arcs={[
              { label: "已掌握", value: stats.mastered, color: "var(--color-secondary)" },
              { label: "学习中", value: stats.learning, color: "var(--color-primary)" },
            ]}
          />
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[var(--color-secondary)]" />{stats.mastered} 已掌握</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />{stats.learning} 学习中</span>
          </div>
        </div>
      )}

      {words.length === 0 && (
        <div className="card p-10 text-center space-y-3">
          <BookOpen size={48} className="mx-auto text-[var(--color-border)]" strokeWidth={1.5} />
          <p className="text-[var(--color-text-secondary)] text-lg font-semibold">欢迎使用西语单词！</p>
          <p className="text-sm text-[var(--color-text-secondary)]">点击「添加单词」开始构建你的词库</p>
          <Link href="/words/add" className="btn-primary inline-flex mt-2 no-underline">添加第一个单词</Link>
        </div>
      )}
    </div>
  )
}