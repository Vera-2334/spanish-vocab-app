"use client"

import { create } from "zustand"
import { getDB, computeNextSrsState, isMastered, isNew, isDueForReview, createDefaultSrsState } from "@spanish-vocab/database"
import { pushSingleWord, pullStreak, pushStreak } from "@/lib/syncEngine"
import type { SrsState, SrsAnswer } from "@spanish-vocab/database"
import { useWordStore } from "./wordStore"
import { useAuthStore } from "./authStore"

// ============================================================
// 打卡统计持久化（localStorage）
// ============================================================

const STREAK_KEY = "srsStreak"

// 本地时区日期 YYYY-MM-DD（toISOString 是 UTC，会导致跨时区日期偏移）
function localDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// 日历上的「昨天」，而非 24 小时前（避免夏令时/月末边界误差）
function yesterdayLocal(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return localDateString(d)
}

// 判断某个打卡日期相对「最新日期」是否已断档（间隔超过 1 天）
function isStreakStale(dateStr: string, latestStr: string): boolean {
  if (!dateStr || !latestStr) return false
  const DAY = 86400000
  const d = new Date(dateStr + "T00:00:00Z").getTime()
  const l = new Date(latestStr + "T00:00:00Z").getTime()
  return l - d > DAY
}

interface StreakState {
  streakDays: number
  longestStreak: number
  lastCheckinDate: string | null
}

function loadStreak(): StreakState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveStreak(s: StreakState): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(s))
  } catch {}
}

interface SrsStateStore {
  // 复习统计
  dueCount: number
  newCount: number
  masteredCount: number
  totalReviewed: number
  streakDays: number
  longestStreak: number
  lastCheckinDate: string | null

  // 计算统计
  recalcStats: () => void

  // 记录回答并更新 SRS
  recordAnswer: (wordId: string, answer: SrsAnswer) => Promise<void>

  // 打卡
  checkIn: () => Promise<void>

  // 从 localStorage 恢复打卡统计（刷新后保留连击）
  restoreStreak: () => void
}

export const useSrsStore = create<SrsStateStore>((set, get) => ({
  dueCount: 0,
  newCount: 0,
  masteredCount: 0,
  totalReviewed: 0,
  streakDays: 0,
  longestStreak: 0,
  lastCheckinDate: null,

  recalcStats: () => {
    const { words } = useWordStore.getState()
    const now = Date.now()

    let due = 0
    let newCount = 0
    let mastered = 0

    for (const w of words) {
      const srs = w.srsState
      if (isMastered(srs)) {
        mastered++
      } else if (isDueForReview(srs)) {
        // 学过 + 到期 + 未掌握（含「忘记」过的词）
        due++
      } else if (isNew(srs)) {
        newCount++
      }
    }

    set({ dueCount: due, newCount: newCount, masteredCount: mastered })
  },

  recordAnswer: async (wordId, answer) => {
    const db = getDB()
    const word = await db.words.get(wordId)
    if (!word) return

    const newSrs = computeNextSrsState(word.srsState, answer)
    const now = Date.now()
    await db.words.update(wordId, { srsState: newSrs, updatedAt: now })

    // 同步更新 wordStore
    useWordStore.setState((s) => ({
      words: s.words.map((w) =>
        w.id === wordId ? { ...w, srsState: newSrs, updatedAt: now } : w
      ),
    }))

    // 即时推送到云端（后台重试，不阻塞答题）
    const w = await db.words.get(wordId)
    if (w) pushSingleWord(w).catch(() => {})

    set((s) => ({ totalReviewed: s.totalReviewed + 1 }))
    get().recalcStats()
  },

  restoreStreak: () => {
    const local = loadStreak()
    if (local) {
      set({
        streakDays: typeof local.streakDays === "number" ? local.streakDays : 0,
        longestStreak: typeof local.longestStreak === "number" ? local.longestStreak : 0,
        lastCheckinDate: local.lastCheckinDate || null,
      })
    }

    // 已登录：与云端合并，以「最近打卡日期」较新的一方为准（跨设备一致）
    if (!useAuthStore.getState().isLoggedIn) return

    pullStreak()
      .then((cloud) => {
        if (!cloud) return
        const localDate = local?.lastCheckinDate ?? ""
        const cloudDate = cloud.lastCheckinDate ?? ""

        // 最新打卡日期
        const latest = localDate > cloudDate ? localDate : cloudDate

        // 相对最新日期断档（超过 1 天）的一方，其连击视为失效
        const localValid = !!localDate && !isStreakStale(localDate, latest)
        const cloudValid = !!cloudDate && !isStreakStale(cloudDate, latest)

        // 连击取「仍有效」双方的较大值；最长连击直接取最大
        const next: StreakState = {
          streakDays: Math.max(localValid ? local?.streakDays ?? 0 : 0, cloudValid ? cloud.streak : 0),
          longestStreak: Math.max(local?.longestStreak ?? 0, cloud.longestStreak),
          lastCheckinDate: latest || null,
        }

        saveStreak(next)
        set({
          streakDays: next.streakDays,
          longestStreak: next.longestStreak,
          lastCheckinDate: next.lastCheckinDate,
        })

        // 云端落后则推送收敛
        const needsPush =
          next.streakDays !== cloud.streak ||
          next.longestStreak !== cloud.longestStreak ||
          next.lastCheckinDate !== cloudDate
        if (needsPush) pushStreak(next).catch(() => {})
      })
      .catch(() => {})
  },

  checkIn: async () => {
    const today = localDateString(new Date())
    const { lastCheckinDate } = get()

    if (lastCheckinDate === today) return // 今天已打卡

    const yesterday = yesterdayLocal()

    set((s) => {
      const newStreak = lastCheckinDate === yesterday ? s.streakDays + 1 : 1
      const next = {
        lastCheckinDate: today,
        streakDays: newStreak,
        longestStreak: Math.max(s.longestStreak, newStreak),
      }
      saveStreak(next)
      // 同步到云端，保证换设备连击不中断
      pushStreak(next).catch(() => {})
      return next
    })
  },
}))