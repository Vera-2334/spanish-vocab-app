"use client"

import { Suspense, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle, ThumbsDown, ThumbsUp, Shuffle } from "lucide-react"
import type { StudyDirection } from "@spanish-vocab/database"
import { isNew, isDueForReview } from "@spanish-vocab/database"
import { useWordStore } from "@/stores/wordStore"
import { useStudyStore } from "@/stores/studyStore"
import { useSrsStore } from "@/stores/srsStore"
import { useAuthStore } from "@/stores/authStore"
import { pushAllWords } from "@/lib/syncEngine"
import { FlashCard } from "@/components/FlashCard"

const DIRECTION_OPTIONS: { value: StudyDirection; label: string; short: string }[] = [
  { value: "es-zh", label: "西 → 中", short: "西→中" },
  { value: "zh-es", label: "中 → 西", short: "中→西" },
  { value: "listening", label: "听音辨义", short: "听音" },
]

function FlashcardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const direction = (searchParams.get("direction") as StudyDirection) || "es-zh"
  const shuffleParam = searchParams.get("shuffle") === "1"
  const starredParam = searchParams.get("starred") === "1"
  const srsParam = searchParams.get("srs") === "1"

  const { words, fetchWords, toggleStar, updateWord } = useWordStore()
  const { recordAnswer, checkIn } = useSrsStore()
  const {
    currentWord,
    total,
    answered,
    completed,
    initialized,
    initSession,
    answer,
    advance,
    reset,
    markInitialized,
  } = useStudyStore()

  // 初始化 + 清除上次会话
  useEffect(() => {
    if (words.length === 0) fetchWords()
    // 每次进入页面都重置上一次的会话状态
    reset()
  }, [])

  // 筛选 + 启动会话
  const wordCount = words.length
  useEffect(() => {
    if (wordCount === 0) return
    // 学习中或已完成 → 不重新初始化
    if (currentWord !== null || completed) return

    let pool = [...words]
    if (srsParam) {
      // SRS 模式：学过、到期、未掌握的（含「忘记」过的词——忘记会清零 repetitions，但 lastReviewedAt 仍 > 0）
      pool = pool.filter((w) => !!w.srsState && isDueForReview(w.srsState))
    } else {
      // 学新词模式：只显示从未学过的
      pool = pool.filter((w) => !w.srsState || isNew(w.srsState))
    }
    if (starredParam) {
      pool = pool.filter((w) => w.isStarred)
    }
    if (pool.length > 0) {
      initSession(pool, { direction, shuffle: shuffleParam })
      checkIn()
    }
    // 无论有没有匹配到词，都标记「筛选已完成」，避免渲染帧误判为「没有可学习的单词」
    markInitialized()
  }, [wordCount, srsParam, starredParam, direction, shuffleParam])

  // 回答 + 更新 SRS + 自动前进
  const handleAnswer = useCallback(
    (result: "remember" | "forget" | "mastered") => {
      if (result === "mastered" && currentWord) {
        // 直接设为已掌握：interval = 21，跳过 SM-2 计算
        const { updateWord } = useWordStore.getState()
        updateWord(currentWord.id, {
          srsState: {
            ...currentWord.srsState,
            interval: 21,
            repetitions: 10,
            nextReviewAt: Date.now() + 21 * 86400000,
            lastReviewedAt: Date.now(),
            lastAnswer: "remember",
          },
        })
        answer("remember")
      } else {
        answer(result as "remember" | "forget")
        if (currentWord) recordAnswer(currentWord.id, result as "remember" | "forget")
      }
      setTimeout(() => advance(), 200)
    },
    [answer, advance, currentWord, recordAnswer]
  )

  // 切换学习方向（re-init 同一批词）
  const switchDirection = useCallback(
    (newDir: StudyDirection) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("direction", newDir)
      router.replace(`/study/flashcard?${params.toString()}`)
      reset()

      let pool = [...words]
      if (starredParam) pool = pool.filter((w) => w.isStarred)
      if (pool.length > 0) {
        // 延迟 init，等 reset 生效
        setTimeout(() => initSession(pool, { direction: newDir, shuffle: shuffleParam }), 0)
      }
    },
    [words, starredParam, shuffleParam, searchParams, router, reset, initSession]
  )

  // 键盘快捷键
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        handleAnswer("forget")
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        handleAnswer("remember")
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault()
        if (currentWord) toggleStar(currentWord.id)
      } else if (e.key === "Escape") {
        e.preventDefault()
        router.push("/study")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleAnswer, currentWord, toggleStar, router])

  // 滑动手势
  useEffect(() => {
    function onSwipe(e: Event) {
      const customEvent = e as CustomEvent<{ result: "remember" | "forget" }>
      handleAnswer(customEvent.detail.result)
    }
    window.addEventListener("flashcard-swipe", onSwipe)
    return () => window.removeEventListener("flashcard-swipe", onSwipe)
  }, [handleAnswer])

  // 学习完成后自动推送 SRS 进度到云端
  useEffect(() => {
    if (completed) {
      const auth = useAuthStore.getState()
      if (auth.isLoggedIn) {
        auth.refreshAccessToken().then(() => pushAllWords())
      }
    }
  }, [completed])

  const progress = total > 0 ? (answered / total) * 100 : 0

  // 无单词
  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <p className="text-[var(--color-text-secondary)] text-lg font-semibold">
          还没有添加单词
        </p>
        <Link href="/words/add" className="btn-primary no-underline">
          添加单词
        </Link>
      </div>
    )
  }

  // 筛选后无匹配（如无星标单词却选了仅星标）
  if (initialized && total === 0 && !completed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <p className="text-[var(--color-text-secondary)] text-lg font-semibold">
          {starredParam ? "还没有星标单词" : "没有可学习的单词"}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/words/add")}
            className="btn-ghost text-sm"
          >
            添加单词
          </button>
          <button
            onClick={() => router.push("/study")}
            className="btn-primary text-sm"
          >
            返回学习
          </button>
        </div>
      </div>
    )
  }

  // 学习完成
  if (completed) {
    const rememberedCount = useStudyStore.getState().remembered
    const accuracy = total > 0 ? Math.round((rememberedCount / total) * 100) : 0

    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-5">
        <CheckCircle size={64} className="text-[var(--color-primary)]" strokeWidth={1.5} />
        <div>
          <h2 className="text-[var(--text-h1)] text-[var(--color-text-primary)] font-extrabold">
            学习完成！
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            本次学习 {total} 个单词
          </p>
        </div>

        <div className="card p-5 w-full max-w-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">记住</span>
            <span className="text-lg font-extrabold text-[var(--color-primary)]">
              {rememberedCount}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${accuracy}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span>正确率 {accuracy}%</span>
            <span>{rememberedCount}/{total}</span>
          </div>
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              reset()
              let pool = [...words]
              if (starredParam) pool = pool.filter((w) => w.isStarred)
              initSession(pool, { direction, shuffle: true })
            }}
            className="btn-ghost flex-1"
          >
            再来一次
          </button>
          <Link href="/study" className="btn-primary flex-1 no-underline text-center">
            返回学习
          </Link>
        </div>
      </div>
    )
  }

  if (!currentWord) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 顶部栏 */}
      <div className="flex items-center gap-2">
        <Link
          href="/study"
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors shrink-0"
          aria-label="返回学习模式选择"
        >
          <ArrowLeft size={20} />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs font-bold text-[var(--color-text-primary)]">
              {answered + 1}/{total}
              {shuffleParam && (
                <Shuffle size={10} className="inline ml-1 text-[var(--color-text-secondary)]" />
              )}
            </p>
            {/* 方向切换标签 */}
            <div className="flex items-center gap-0.5 bg-[var(--color-bg-secondary)] rounded-full p-0.5">
              {DIRECTION_OPTIONS.map((opt) => {
                const active = direction === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => switchDirection(opt.value)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-full transition-colors whitespace-nowrap ${
                      active
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white"
                    }`}
                    aria-pressed={active}
                  >
                    {opt.short}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="progress-bar" style={{ height: "6px" }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* 闪卡 */}
      <FlashCard
        word={currentWord}
        direction={direction}
        isStarred={currentWord.isStarred}
        onToggleStar={() => toggleStar(currentWord.id)}
      />

      {/* 记得/不记得/已掌握 按钮 */}
      <div className="flex gap-2 max-w-[420px] mx-auto">
        <button onClick={() => handleAnswer("forget")} className="btn-forget flex-1 !text-sm !py-2 !px-2" aria-label="不记得">
          <ThumbsDown size={16} />不记得
        </button>
        <button onClick={() => handleAnswer("remember")} className="btn-remember flex-1 !text-sm !py-2 !px-2" aria-label="记得">
          <ThumbsUp size={16} />记得
        </button>
        <button onClick={() => handleAnswer("mastered")} className="btn-primary flex-1 !text-sm !py-2 !px-2 !border-b-[3px]" aria-label="已掌握">
          已掌握
        </button>
      </div>

      {/* 快捷键提示 */}
      <p className="hidden sm:block text-center text-[9px] text-[var(--color-text-secondary)] leading-none">
        <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[9px]">Space</kbd>翻转 ·
        <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[9px]">←</kbd>忘 ·
        <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[9px]">→</kbd>会 ·
        <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[9px]">S</kbd>星标 ·
        <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[9px]">Esc</kbd>返回
      </p>
    </div>
  )
}

// Suspense 包裹（useSearchParams 要求）
export default function FlashcardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
        </div>
      }
    >
      <FlashcardContent />
    </Suspense>
  )
}