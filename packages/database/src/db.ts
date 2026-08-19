import Dexie, { type Table } from "dexie"
import type {
  Word,
  Example,
  Conjugation,
  SrsState,
  Group,
  Tag,
  StudyRecord,
  SyncLog,
} from "./types"
import { createDefaultSrsState } from "./srs"

// ============================================================
// IndexedDB 数据库（Dexie.js）
// ============================================================

export class SpanishVocabDB extends Dexie {
  words!: Table<Word, string>
  groups!: Table<Group, string>
  tags!: Table<Tag, string>
  studyRecords!: Table<StudyRecord, string>
  syncLog!: Table<SyncLog, string>

  constructor() {
    super("SpanishVocabDB")

    this.version(1).stores({
      words: "id, spanish, partOfSpeech, groupId, isStarred, createdAt, updatedAt, *tags",
      groups: "id, source, createdAt",
      tags: "id, name, createdAt",
      studyRecords: "id, wordId, mode, studiedAt",
      syncLog: "id, entity, entityId, action, timestamp, synced",
    })
  }
}

// 单例
let dbInstance: SpanishVocabDB | null = null

export function getDB(): SpanishVocabDB {
  if (!dbInstance) {
    dbInstance = new SpanishVocabDB()
  }
  return dbInstance
}

// 工厂函数：创建默认单词
export function createWord(data: {
  spanish: string
  chinese: string
  partOfSpeech: Word["partOfSpeech"]
  examples?: Example[]
  audioUrl?: string
  conjugation?: Conjugation
  groupId?: string
  tags?: string[]
  definitionEs?: string
}): Word {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    spanish: data.spanish,
    chinese: data.chinese,
    partOfSpeech: data.partOfSpeech,
    examples: data.examples ?? [],
    audioUrl: data.audioUrl,
    definitionEs: data.definitionEs,
    conjugation: data.conjugation,
    tags: data.tags ?? [],
    isStarred: false,
    srsState: createDefaultSrsState(),
    createdAt: now,
    updatedAt: now,
  }
}