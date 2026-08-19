"use client"

import { getDB } from "@spanish-vocab/database"
import { useAuthStore } from "@/stores/authStore"

const API_BASE = ""

// ============================================================
// 带 token 刷新的 fetch 封装
// ============================================================

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { getAuthHeaders, refreshAccessToken } = useAuthStore.getState()
  let resp = await fetch(url, { ...options, headers: { ...getAuthHeaders(), ...options.headers as any } })

  if (resp.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      resp = await fetch(url, { ...options, headers: { ...useAuthStore.getState().getAuthHeaders(), ...options.headers as any } })
    }
  }
  return resp
}

// ============================================================
// 单条 Push — 答题/编辑后即时推送到云端
// 有界重试：最多 3 次，指数退避 1s/2s，失败放弃（等下次操作自然补推）
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function pushSingleWord(word: any): Promise<void> {
  const { isLoggedIn } = useAuthStore.getState()
  if (!isLoggedIn) return

  const body = JSON.stringify({
    changes: [{
      entity: "word",
      entityId: word.id,
      action: "create",
      payload: { ...word, updatedAt: Date.now() },
      timestamp: Date.now(),
    }],
  })

  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await authFetch(`${API_BASE}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      if (resp.ok) return
    } catch {}
    // 退避后重试，最后一次失败直接放弃
    if (attempt < MAX_RETRIES) await sleep(1000 * Math.pow(2, attempt - 1))
  }
}

// ============================================================
// 单条 Delete — 删除单词时同步到云端
// ============================================================

export async function pushDeleteWord(wordId: string): Promise<void> {
  const { isLoggedIn } = useAuthStore.getState()
  if (!isLoggedIn) return

  try {
    await authFetch(`${API_BASE}/api/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        changes: [{
          entity: "word",
          entityId: wordId,
          action: "delete",
          timestamp: Date.now(),
        }],
      }),
    })
  } catch {}
}

// ============================================================
// 批量 Push — 只推指定的一批单词（快速导入用）
// ============================================================

export async function pushWords(words: any[]): Promise<number> {
  const { isLoggedIn } = useAuthStore.getState()
  if (!isLoggedIn) return 0
  if (!words || words.length === 0) return 0

  let pushed = 0
  const CHUNK = 100

  for (let i = 0; i < words.length; i += CHUNK) {
    const batch = words.slice(i, i + CHUNK).map(w => ({
      entity: "word", entityId: w.id, action: "create",
      payload: { ...w }, timestamp: Date.now(),
    }))

    try {
      const resp = await authFetch(`${API_BASE}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: batch }),
      })
      if (resp.ok) pushed += batch.length
    } catch {}
  }

  return pushed
}

// ============================================================
// 全量 Push — 把本地全部单词推到云端
// options.replaceAll: 先清空云端再写入（以本机为准）
// ============================================================

export async function pushAllWords(options?: { replaceAll?: boolean }): Promise<number> {
  const { isLoggedIn } = useAuthStore.getState()
  if (!isLoggedIn) return 0

  const db = getDB()
  const localWords = await db.words.toArray()
  if (localWords.length === 0) return 0

  let pushed = 0
  const CHUNK = 100
  const replaceAll = options?.replaceAll ?? false

  for (let i = 0; i < localWords.length; i += CHUNK) {
    const batch = localWords.slice(i, i + CHUNK).map(w => ({
      entity: "word", entityId: w.id, action: "create",
      payload: { ...w }, timestamp: Date.now(),
    }))

    try {
      const resp = await authFetch(`${API_BASE}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: batch, replaceAll: replaceAll && i === 0 }),
      })
      if (resp.ok) pushed += batch.length
    } catch {}
  }

  return pushed
}

// ============================================================
// 拉取云端数据并合并到本地
// 合并策略：
//   - 匹配方式：spanish（西语单词唯一）
//   - SRS 进度：保留 repetitions 次数更多的一方（学习进度优先）
//   - 其他字段：比较 updatedAt，新覆盖旧
//   - 本地不存在 → 直接导入
// ============================================================

export async function pullAndMerge(): Promise<number> {
  const { isLoggedIn } = useAuthStore.getState()
  if (!isLoggedIn) return 0

  try {
    const resp = await authFetch(`${API_BASE}/api/sync`)
    if (!resp.ok) return 0

    const data = await resp.json()
    const cloudWords = data.words || []
    if (cloudWords.length === 0) return 0

    const db = getDB()
    const localWords = await db.words.toArray()
    let merged = 0

    for (const cw of cloudWords) {
      const localWord = localWords.find(lw => lw.spanish === cw.spanish)

      if (localWord) {
        // —— 已存在：逐字段合并 ——
        const cloudSrs = cw.srsState || {}
        const localSrs = localWord.srsState || {}
        const cloudIsNewer = (cw.updatedAt || 0) > (localWord.updatedAt || 0)

        await db.words.update(localWord.id, {
          // 文本字段：云端更新 → 覆盖
          chinese: cloudIsNewer && cw.chinese ? cw.chinese : localWord.chinese,
          definitionEs: cloudIsNewer && cw.definitionEs ? cw.definitionEs : localWord.definitionEs,
          partOfSpeech: cloudIsNewer && cw.partOfSpeech ? cw.partOfSpeech : localWord.partOfSpeech,

          // 结构化字段：云端更新且有内容 → 覆盖
          examples: cloudIsNewer && cw.examples?.length ? cw.examples : (localWord.examples || []),
          conjugation: cloudIsNewer && cw.conjugation ? cw.conjugation : localWord.conjugation,
          tags: cloudIsNewer ? (cw.tags || []) : (localWord.tags || []),

          // 布尔/可选字段：云端更新 → 覆盖
          isStarred: cloudIsNewer ? !!(cw.isStarred) : localWord.isStarred,
          audioUrl: cloudIsNewer && cw.audioUrl ? cw.audioUrl : localWord.audioUrl,
          groupId: cloudIsNewer && cw.groupId ? cw.groupId : localWord.groupId,

          // SRS：保留最近复习的一方（lastReviewedAt 更大的为准）
          srsState: (cloudSrs.lastReviewedAt || 0) > (localSrs.lastReviewedAt || 0) ? cloudSrs : localSrs,

          // 时间戳：取较新的
          updatedAt: cloudIsNewer ? cw.updatedAt : localWord.updatedAt,
        })
        merged++
      } else {
        // —— 本地没有：直接导入 ——
        await db.words.put({
          id: cw.id,
          spanish: cw.spanish || "",
          chinese: cw.chinese || "",
          partOfSpeech: cw.partOfSpeech || "OTHER",
          examples: cw.examples || [],
          definitionEs: cw.definitionEs || "",
          conjugation: cw.conjugation || undefined,
          tags: cw.tags || [],
          groupId: cw.groupId || undefined,
          isStarred: !!(cw.isStarred),
          audioUrl: cw.audioUrl || undefined,
          srsState: cw.srsState || { repetitions: 0, easeFactor: 2.5, interval: 0, nextReviewAt: Date.now(), lastReviewedAt: 0, lastAnswer: null },
          createdAt: cw.createdAt || Date.now(),
          updatedAt: cw.updatedAt || Date.now(),
        })
        merged++
      }
    }

    return merged
  } catch { return 0 }
}

// ============================================================
// 以云端为准 — 清空本地词库，全量导入云端数据
// 用于换设备时以另一台设备的数据覆盖本机
// ============================================================

export async function resetLocalFromCloud(): Promise<number> {
  const { isLoggedIn } = useAuthStore.getState()
  if (!isLoggedIn) return 0

  try {
    const resp = await authFetch(`${API_BASE}/api/sync`)
    if (!resp.ok) return 0

    const data = await resp.json()
    const cloudWords = data.words || []
    if (cloudWords.length === 0) return 0

    const db = getDB()

    // 清空本地词库
    await db.words.clear()

    // 全量导入云端数据
    const words = cloudWords.map((cw: any) => ({
      id: cw.id,
      spanish: cw.spanish || "",
      chinese: cw.chinese || "",
      partOfSpeech: cw.partOfSpeech || "OTHER",
      examples: cw.examples || [],
      definitionEs: cw.definitionEs || "",
      conjugation: cw.conjugation || undefined,
      tags: cw.tags || [],
      groupId: cw.groupId || undefined,
      isStarred: !!(cw.isStarred),
      audioUrl: cw.audioUrl || undefined,
      srsState: cw.srsState || { repetitions: 0, easeFactor: 2.5, interval: 0, nextReviewAt: Date.now(), lastReviewedAt: 0, lastAnswer: null },
      createdAt: cw.createdAt || Date.now(),
      updatedAt: cw.updatedAt || Date.now(),
    }))

    await db.words.bulkPut(words)
    return words.length
  } catch { return 0 }
}

// ============================================================
// 打卡统计同步 — 连击天数跨设备一致
// ============================================================

export interface CloudStreak {
  streak: number
  longestStreak: number
  lastCheckinDate: string | null
}

export async function pullStreak(): Promise<CloudStreak | null> {
  const { isLoggedIn } = useAuthStore.getState()
  if (!isLoggedIn) return null

  try {
    const resp = await authFetch(`${API_BASE}/api/auth/me`)
    if (!resp.ok) return null
    const data = await resp.json()
    const u = data.user
    if (!u) return null
    return {
      streak: typeof u.streak === "number" ? u.streak : 0,
      longestStreak: typeof u.longestStreak === "number" ? u.longestStreak : 0,
      lastCheckinDate: u.lastCheckinDate || null,
    }
  } catch { return null }
}

export async function pushStreak(s: { streakDays: number; longestStreak: number; lastCheckinDate: string | null }): Promise<void> {
  const { isLoggedIn } = useAuthStore.getState()
  if (!isLoggedIn || !s.lastCheckinDate) return

  try {
    await authFetch(`${API_BASE}/api/auth/streak`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streak: s.streakDays,
        longestStreak: s.longestStreak,
        lastCheckinDate: s.lastCheckinDate,
      }),
    })
  } catch {}
}
