"use client"

import { getDB } from "@spanish-vocab/database"

const BACKUP_TIME_KEY = "spanish_vocab_last_backup"

// ============================================================
// JSON 一键备份 — 导出全部数据为 JSON 文件
// ============================================================

export async function backupToJSON(): Promise<{ count: number; filename: string }> {
  const db = getDB()
  const [words, groups, tags, studyRecords] = await Promise.all([
    db.words.toArray(),
    db.groups.toArray(),
    db.tags.toArray(),
    db.studyRecords.toArray(),
  ])

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: { words: words.length, groups: groups.length, tags: tags.length, studyRecords: studyRecords.length },
    data: { words, groups, tags, studyRecords },
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const filename = `西语单词_备份_${new Date().toISOString().split("T")[0]}.json`

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  // 记录备份时间
  localStorage.setItem(BACKUP_TIME_KEY, Date.now().toString())

  return { count: words.length, filename }
}

// ============================================================
// JSON 恢复 — 从 JSON 文件恢复全部数据
// ============================================================

export async function restoreFromJSON(file: File): Promise<{
  words: number; groups: number; tags: number; records: number
}> {
  const text = await file.text()
  const backup = JSON.parse(text)

  if (!backup.version || !backup.data) {
    throw new Error("无效的备份文件格式")
  }

  const db = getDB()
  const { words = [], groups = [], tags = [], studyRecords = [] } = backup.data

  // 清空现有数据
  await db.words.clear()
  await db.groups.clear()
  await db.tags.clear()
  await db.studyRecords.clear()

  // 批量恢复
  await db.words.bulkPut(words)
  await db.groups.bulkPut(groups)
  await db.tags.bulkPut(tags)
  await db.studyRecords.bulkPut(studyRecords)

  return { words: words.length, groups: groups.length, tags: tags.length, records: studyRecords.length }
}

// ============================================================
// 备份状态检查
// ============================================================

export function getLastBackupTime(): number | null {
  const ts = localStorage.getItem(BACKUP_TIME_KEY)
  return ts ? parseInt(ts) : null
}

export function shouldRemindBackup(wordCount: number): boolean {
  if (wordCount === 0) return false
  const lastBackup = getLastBackupTime()
  if (!lastBackup) return true // 从未备份过
  const daysSinceBackup = (Date.now() - lastBackup) / (86400000)
  return daysSinceBackup > 3 // 超过 3 天提醒
}