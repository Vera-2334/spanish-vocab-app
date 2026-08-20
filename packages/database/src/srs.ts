import type { SrsState, SrsAnswer } from "./types"

// ============================================================
// SM-2 简化版 SRS 算法
// ============================================================

const MIN_EASE = 1.3
const INITIAL_EASE = 2.5

/**
 * 根据当前 SRS 状态和用户回答，计算新的 SRS 状态
 */
export function computeNextSrsState(state: SrsState, answer: SrsAnswer): SrsState {
  const now = Date.now()

  if (answer === "remember") {
    const newReps = state.repetitions + 1
    let newInterval: number

    if (newReps === 1) {
      newInterval = 1
    } else if (newReps === 2) {
      newInterval = 6
    } else {
      newInterval = Math.round(state.interval * state.easeFactor)
    }

    return {
      ...state,
      repetitions: newReps,
      easeFactor: state.easeFactor,
      interval: newInterval,
      nextReviewAt: addDays(now, newInterval),
      lastReviewedAt: now,
      lastAnswer: answer,
    }
  }

  // forget
  return {
    ...state,
    repetitions: 0,
    easeFactor: Math.max(MIN_EASE, state.easeFactor - 0.2),
    interval: 1,
    nextReviewAt: addDays(now, 1), // 明天再复习
    lastReviewedAt: now,
    lastAnswer: answer,
  }
}

/**
 * 今天是否需要复习
 */
export function isDueToday(state: SrsState): boolean {
  // 按日期比较，而非精确时刻：昨天学的今天算到期
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const reviewDayStart = new Date(state.nextReviewAt).setHours(0, 0, 0, 0)
  return todayStart >= reviewDayStart
}

/**
 * 是否为已掌握（间隔 >= 21 天）
 */
export function isMastered(state: SrsState): boolean {
  return state.interval >= 21
}

/**
 * 是否学过（至少回答过一次）
 *
 * 注意：不能用 `repetitions === 0` 判断「未学」——「忘记」会把 repetitions 清零，
 * 但 lastReviewedAt 仍会更新。判断是否学过的唯一可靠依据是 lastReviewedAt。
 */
export function hasStudied(state: SrsState): boolean {
  return state.lastReviewedAt > 0
}

/**
 * 全新未学（从未回答过）
 */
export function isNew(state: SrsState): boolean {
  return !hasStudied(state)
}

/**
 * 学习中（学过但未掌握）
 */
export function isLearning(state: SrsState): boolean {
  return hasStudied(state) && !isMastered(state)
}

/**
 * 待复习：学过 + 到期 + 未掌握
 *
 * 「忘记」过的词 repetitions 归零后仍会进入这里（因为 lastReviewedAt > 0），
 * 不会从复习队列中消失。
 */
export function isDueForReview(state: SrsState): boolean {
  return hasStudied(state) && isDueToday(state) && !isMastered(state)
}

/**
 * 默认 SRS 状态（新单词）
 */
export function createDefaultSrsState(): SrsState {
  return {
    repetitions: 0,
    easeFactor: INITIAL_EASE,
    interval: 0,
    nextReviewAt: Date.now(), // 可立即学习
    lastReviewedAt: 0,
    lastAnswer: null,
  }
}

function addDays(timestamp: number, days: number): number {
  // 对齐到目标日期零点，确保整天都算到期
  const now = new Date(timestamp)
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
  return target.getTime()
}