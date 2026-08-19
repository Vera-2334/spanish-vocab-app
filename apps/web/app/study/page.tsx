"use client"

import { useState, useEffect, useMemo } from "react"
import { GraduationCap, Shuffle, Star, ArrowRight, CalendarCheck, Brain, Flame } from "lucide-react"
import Link from "next/link"
import { useWordStore } from "@/stores/wordStore"
import { useSrsStore } from "@/stores/srsStore"
import { isDueToday, isMastered } from "@spanish-vocab/database"

export default function StudyPage() {
  const { words, fetchWords } = useWordStore()
  const { dueCount, newCount, masteredCount, streakDays, longestStreak, recalcStats, checkIn } =
    useSrsStore()
  const [shuffle, setShuffle] = useState(false)
  const [starredOnly, setStarredOnly] = useState(false)

  useEffect(() => {
    fetchWords()
  }, [])

  useEffect(() => {
    if (words.length > 0) recalcStats()
  }, [words])

  // 待复习单词
  const dueWords = useMemo(() => {
    return words.filter((w) => isDueToday(w.srsState) && !isMastered(w.srsState))
  }, [words])

  const hasWords = words.length > 0
  const starredCount = words.filter((w) => w.isStarred).length

  // 构建带参数的链接
  function buildHref(direction: string) {
    const params = new URLSearchParams({ direction })
    if (shuffle) params.set("shuffle", "1")
    if (starredOnly) params.set("starred", "1")
    return `/study/flashcard?${params.toString()}`
  }

  const MODES = [
    {
      mode: "西 → 中",
      desc: "看西语单词，回忆中文释义",
      direction: "es-zh",
    },
    {
      mode: "中 → 西",
      desc: "看中文释义，回忆西语单词",
      direction: "zh-es",
    },
    {
      mode: "听音辨义",
      desc: "听发音，判断单词的含义",
      direction: "listening",
    },
  ]

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <GraduationCap size={28} strokeWidth={2.5} className="text-[var(--color-primary)]" />
        <h1 className="text-[var(--text-h1)] text-[var(--color-text-primary)]">
          学习
        </h1>
      </div>

      {/* 模式选择卡片 */}
      <div className="space-y-3">
        {MODES.map(({ mode, desc, direction }) => (
          <Link
            key={direction}
            href={buildHref(direction)}
            className={`card p-5 flex items-center justify-between group transition-colors no-underline ${
              hasWords
                ? "hover:border-[var(--color-primary)]"
                : "opacity-50 pointer-events-none"
            }`}
          >
            <div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{mode}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{desc}</p>
            </div>
            <ArrowRight
              size={20}
              className="text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all"
            />
          </Link>
        ))}
      </div>

      {/* SRS 间隔复习 */}
      {hasWords && (
        <div className="card p-5 space-y-3 bg-[var(--color-primary-light)] border-[var(--color-primary)]">
          <div className="flex items-center gap-2">
            <CalendarCheck size={22} className="text-[var(--color-primary)]" />
            <h3 className="text-sm font-bold text-[var(--color-primary)]">
              SRS 间隔复习
            </h3>
            {streakDays > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs font-bold text-[var(--color-primary)]">
                <Flame size={14} />{streakDays} 天
              </span>
            )}
          </div>

          <div className="flex gap-3 text-xs text-[var(--color-text-primary)]">
            <div className="flex-1 bg-white rounded-xl p-2 text-center">
              <p className="text-lg font-extrabold text-[var(--color-primary)]">{dueCount}</p>
              <p className="text-[var(--color-text-secondary)]">待复习</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-2 text-center">
              <p className="text-lg font-extrabold text-[var(--color-secondary)]">{newCount}</p>
              <p className="text-[var(--color-text-secondary)]">新单词</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-2 text-center">
              <p className="text-lg font-extrabold text-[var(--color-accent)]">{masteredCount}</p>
              <p className="text-[var(--color-text-secondary)]">已掌握</p>
            </div>
          </div>

          {dueCount > 0 && (
            <Link
              href={`/study/flashcard?direction=es-zh&srs=1`}
              className="btn-ghost w-full bg-white !border-[var(--color-primary)] !text-[var(--color-primary)] hover:!bg-[var(--color-primary-light)] no-underline text-center"
            >
              <Brain size={16} />
              复习 {dueCount} 个单词
            </Link>
          )}
        </div>
      )}

      {/* 选项区 */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">学习选项</h3>

        <label
          className={`flex items-center gap-3 ${hasWords ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
        >
          <input
            type="checkbox"
            checked={shuffle}
            onChange={() => setShuffle(!shuffle)}
            disabled={!hasWords}
            className="w-5 h-5 accent-[var(--color-primary)]"
          />
          <Shuffle size={18} className="text-[var(--color-text-secondary)]" />
          <span className="text-sm text-[var(--color-text-primary)]">打乱顺序</span>
        </label>

        <label
          className={`flex items-center gap-3 ${
            starredCount > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-50"
          }`}
        >
          <input
            type="checkbox"
            checked={starredOnly}
            onChange={() => setStarredOnly(!starredOnly)}
            disabled={starredCount === 0}
            className="w-5 h-5 accent-[var(--color-accent)]"
          />
          <Star size={18} className="text-[var(--color-text-secondary)]" fill={starredOnly ? "var(--color-accent)" : "none"} />
          <span className="text-sm text-[var(--color-text-primary)]">
            仅星标单词
            {starredCount > 0 && (
              <span className="text-xs text-[var(--color-text-secondary)] ml-1">({starredCount})</span>
            )}
          </span>
        </label>
      </div>

      {/* 状态提示 */}
      {!hasWords && (
        <div className="card p-6 text-center space-y-3">
          <GraduationCap size={36} className="mx-auto text-[var(--color-text-secondary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            还没有添加单词，请先添加一些单词再开始学习
          </p>
          <Link href="/words/add" className="btn-primary inline-flex mt-1 no-underline text-sm">
            添加单词
          </Link>
        </div>
      )}

      {/* 已有单词但无星标 */}
      {hasWords && starredCount === 0 && (
        <div className="card p-4 flex items-center gap-3 bg-[var(--color-bg-secondary)]">
          <Star size={18} className="text-[var(--color-text-secondary)] shrink-0" />
          <p className="text-xs text-[var(--color-text-secondary)]">
            还没有星标单词。在学习或查看单词时点击星标图标即可收藏重点单词
          </p>
        </div>
      )}
    </div>
  )
}