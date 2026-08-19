"use client"

import { create } from "zustand"
import { getDB, createWord, createDefaultSrsState } from "@spanish-vocab/database"
import type { Word, Example } from "@spanish-vocab/database"
import { PartOfSpeech } from "@spanish-vocab/database"
import { pushSingleWord, pushDeleteWord, pushWords } from "@/lib/syncEngine"

interface WordFilters {
  search: string
  partOfSpeech: PartOfSpeech | null
  starred: boolean
}

interface WordState {
  // 数据
  words: Word[]
  isLoading: boolean
  error: string | null

  // 筛选
  filters: WordFilters
  setFilter: <K extends keyof WordFilters>(key: K, value: WordFilters[K]) => void
  clearFilters: () => void

  // 操作
  fetchWords: () => Promise<void>
  addWord: (data: {
    spanish: string
    chinese: string
    partOfSpeech: PartOfSpeech
    examples: Example[]
    audioUrl?: string
    conjugation?: import("@spanish-vocab/database").Conjugation
    groupId?: string
    tags?: string[]
    definitionEs?: string
  }) => Promise<Word>
  batchAddWords: (entries: Array<{
    spanish: string
    chinese: string
    partOfSpeech: PartOfSpeech
    examples: Example[]
    groupId?: string
    tags?: string[]
    definitionEs?: string
    conjugation?: import("@spanish-vocab/database").Conjugation
  }>) => Promise<Word[]>
  updateWord: (id: string, data: Partial<Word>) => Promise<void>
  deleteWord: (id: string) => Promise<void>
  toggleStar: (id: string) => Promise<void>
  getWordById: (id: string) => Word | undefined
}

const DEFAULT_FILTERS: WordFilters = {
  search: "",
  partOfSpeech: null,
  starred: false,
}

export const useWordStore = create<WordState>((set, get) => ({
  words: [],
  isLoading: false,
  error: null,

  // 筛选
  filters: { ...DEFAULT_FILTERS },
  setFilter: (key, value) =>
    set((s) => ({
      filters: { ...s.filters, [key]: value },
    })),
  clearFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  // 获取所有单词
  fetchWords: async () => {
    set({ isLoading: true, error: null })
    try {
      const db = getDB()
      const all = await db.words.orderBy("createdAt").reverse().toArray()
      // 规范化：旧数据可能缺 examples/tags/srsState 字段，兜底默认值，避免渲染崩溃
      const normalized = all
        .filter((w) => w != null)
        .map((w) => ({
          ...w,
          examples: w.examples || [],
          tags: w.tags || [],
          srsState: w.srsState || createDefaultSrsState(),
        }))
      set({ words: normalized, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  // 添加单词
  addWord: async (data) => {
    const db = getDB()
    const word = createWord(data)
    await db.words.put(word)
    set((s) => ({ words: [word, ...s.words] }))
    pushSingleWord(word) // 自动同步到云端
    return word
  },

  // 更新单词
  updateWord: async (id, data) => {
    const db = getDB()
    const updated = { ...data, updatedAt: Date.now() }
    await db.words.update(id, updated)
    set((s) => ({
      words: s.words.map((w) =>
        w.id === id ? { ...w, ...updated } : w
      ),
    }))
    // 自动同步到云端
    const word = get().words.find(w => w.id === id)
    if (word) pushSingleWord(word)
  },

  // 批量导入
  batchAddWords: async (
    entries: Array<{
      spanish: string
      chinese: string
      partOfSpeech: PartOfSpeech
      examples: Example[]
      groupId?: string
    }>
  ) => {
    const db = getDB()
    const newWords: Word[] = entries.map((entry) => createWord(entry))
    await db.words.bulkPut(newWords)
    set((s) => ({ words: [...newWords, ...s.words] }))
    pushWords(newWords).catch(() => {}) // 快速导入也自动同步到云端
    return newWords
  },

  // 删除单词
  deleteWord: async (id) => {
    const db = getDB()
    await db.words.delete(id)
    set((s) => ({ words: s.words.filter((w) => w.id !== id) }))
    pushDeleteWord(id) // 自动同步到云端
  },

  // 切换星标
  toggleStar: async (id) => {
    const db = getDB()
    const word = get().words.find((w) => w.id === id)
    if (!word) return
    const newStarred = !word.isStarred
    await db.words.update(id, { isStarred: newStarred })
    set((s) => ({
      words: s.words.map((w) =>
        w.id === id ? { ...w, isStarred: newStarred } : w
      ),
    }))
    // 自动同步到云端
    const updated = get().words.find(w => w.id === id)
    if (updated) pushSingleWord(updated)
  },

  // 按 ID 获取
  getWordById: (id) => get().words.find((w) => w.id === id),
}))