"use client"

import { create } from "zustand"
import { getDB } from "@spanish-vocab/database"
import type { Tag } from "@spanish-vocab/database"

const TAG_COLORS = [
  "#4B8BE0", "#0D9488", "#D97706", "#B91C1C", "#7C3AED",
  "#059669", "#DB2777", "#2563EB", "#D97706", "#0891B2",
]

interface TagState {
  tags: Tag[]
  isLoading: boolean
  fetchTags: () => Promise<void>
  addTag: (name: string) => Promise<Tag>
  updateTag: (id: string, data: Partial<Tag>) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  getTagColor: (tagId: string) => string
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  isLoading: false,

  fetchTags: async () => {
    set({ isLoading: true })
    const db = getDB()
    const all = await db.tags.orderBy("createdAt").toArray()
    set({ tags: all, isLoading: false })
  },

  addTag: async (name) => {
    const db = getDB()
    const color = TAG_COLORS[get().tags.length % TAG_COLORS.length]
    const tag: Tag = {
      id: crypto.randomUUID(),
      name,
      color,
      createdAt: Date.now(),
    }
    await db.tags.put(tag)
    set((s) => ({ tags: [...s.tags, tag] }))
    return tag
  },

  updateTag: async (id, data) => {
    const db = getDB()
    await db.tags.update(id, data)
    set((s) => ({
      tags: s.tags.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }))
  },

  deleteTag: async (id) => {
    const db = getDB()
    await db.tags.delete(id)
    // 从所有单词中移除该标签
    const words = await db.words.toArray()
    for (const w of words) {
      if (w.tags.includes(id)) {
        await db.words.update(w.id, {
          tags: w.tags.filter((tid) => tid !== id),
        })
      }
    }
    set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }))
  },

  getTagColor: (tagId) => {
    return get().tags.find((t) => t.id === tagId)?.color ?? "#E5E5E5"
  },
}))