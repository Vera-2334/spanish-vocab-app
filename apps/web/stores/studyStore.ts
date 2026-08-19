"use client"

import { create } from "zustand"
import type { Word, StudyDirection } from "@spanish-vocab/database"

interface StudySession {
  queue: Word[]
  currentIndex: number
  total: number
  answered: number
  remembered: number
  direction: StudyDirection
  shuffle: boolean
  completed: boolean
}

interface StudyState extends StudySession {
  // 初始化
  initSession: (
    words: Word[],
    options: { direction: StudyDirection; shuffle: boolean }
  ) => void

  // 当前卡片
  currentWord: Word | null

  // 是否已完成筛选判断（区分「会话未初始化」与「筛选后无词」）
  initialized: boolean

  // 操作
  answer: (result: "remember" | "forget") => void
  advance: () => void
  reset: () => void
  markInitialized: () => void
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const useStudyStore = create<StudyState>((set, get) => ({
  // Session state
  queue: [],
  currentIndex: 0,
  total: 0,
  answered: 0,
  remembered: 0,
  direction: "es-zh",
  shuffle: false,
  completed: false,

  currentWord: null,
  initialized: false,

  // 初始化学习会话
  initSession: (words, options) => {
    if (words.length === 0) return

    const queue = options.shuffle ? shuffleArray(words) : [...words]

    set({
      queue,
      currentIndex: 0,
      total: queue.length,
      answered: 0,
      remembered: 0,
      direction: options.direction,
      shuffle: options.shuffle,
      completed: false,
      currentWord: queue[0],
      initialized: true,
    })
  },

  // 回答当前卡片
  answer: (result) => {
    set((s) => ({
      answered: s.answered + 1,
      remembered: result === "remember" ? s.remembered + 1 : s.remembered,
    }))
  },

  // 前进到下一张
  advance: () => {
    const { queue, currentIndex, total } = get()
    const nextIndex = currentIndex + 1

    if (nextIndex >= total) {
      set({ completed: true, currentWord: null })
    } else {
      set({
        currentIndex: nextIndex,
        currentWord: queue[nextIndex],
      })
    }
  },

  // 重置
  reset: () => {
    set({
      queue: [],
      currentIndex: 0,
      total: 0,
      answered: 0,
      remembered: 0,
      direction: "es-zh",
      shuffle: false,
      completed: false,
      currentWord: null,
      initialized: false,
    })
  },

  // 标记筛选判断已完成（区分「会话未初始化」与「筛选后无词」）
  markInitialized: () => set({ initialized: true }),
}))
