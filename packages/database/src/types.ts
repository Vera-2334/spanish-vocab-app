// ============================================================
// 共享类型定义（PRD v1.0 数据模型）
// ============================================================

// 词性枚举
export enum PartOfSpeech {
  NM = "NM",   // 阳性名词
  NF = "NF",   // 阴性名词
  NC = "NC",   // 共性名词
  V = "V",     // 动词
  ADJ = "ADJ", // 形容词
  ADV = "ADV", // 副词
  PREP = "PREP", // 介词
  CONJ = "CONJ", // 连词
  OTHER = "OTHER", // 其他
}

export const PartOfSpeechLabel: Record<PartOfSpeech, string> = {
  [PartOfSpeech.NM]: "阳性名词",
  [PartOfSpeech.NF]: "阴性名词",
  [PartOfSpeech.NC]: "共性名词",
  [PartOfSpeech.V]: "动词",
  [PartOfSpeech.ADJ]: "形容词",
  [PartOfSpeech.ADV]: "副词",
  [PartOfSpeech.PREP]: "介词",
  [PartOfSpeech.CONJ]: "连词",
  [PartOfSpeech.OTHER]: "其他",
}

// 例句来源
export type ExampleSource = "dictionary" | "corpus" | "manual"

// 学习方向
export type StudyDirection = "es-zh" | "zh-es" | "listening"

// SRS 回答
export type SrsAnswer = "remember" | "forget"

// 例句
export interface Example {
  id: string
  spanish: string
  chinese: string
  source: ExampleSource
  sourceDetail?: string
}

// 单时态变位行
export interface TenseRow {
  yo: string
  tu: string
  elEllaUsted: string
  nosotros: string
  vosotros: string
  ellosEllasUstedes: string
}

// 动词变位
export interface Conjugation {
  present: TenseRow
  preterite: TenseRow
  imperfect: TenseRow
  future: TenseRow
  subjunctive: TenseRow
  imperative: TenseRow
  conditional?: TenseRow
  isRegular: boolean
}

// SRS 学习状态
export interface SrsState {
  repetitions: number      // 连续「记得」次数
  easeFactor: number       // 易度因子（默认 2.5）
  interval: number         // 当前间隔（天）
  nextReviewAt: number     // 下次复习时间（unix ms）
  lastReviewedAt: number   // 上次复习时间（unix ms）
  lastAnswer: SrsAnswer | null
}

// 单词
export interface Word {
  id: string
  spanish: string
  chinese: string
  partOfSpeech: PartOfSpeech
  examples: Example[]
  audioUrl?: string
  definitionEs?: string  // 西语释义（来自词典）
  conjugation?: Conjugation
  tags: string[]           // Tag id 数组
  groupId?: string
  isStarred: boolean
  srsState: SrsState
  createdAt: number        // unix ms
  updatedAt: number        // unix ms
}

// 来源分组
export interface Group {
  id: string
  name: string
  source: "manual" | "file" | "anki"
  createdAt: number
}

// 标签
export interface Tag {
  id: string
  name: string
  color: string
  createdAt: number
}

// 学习记录
export interface StudyRecord {
  id: string
  wordId: string
  mode: "flashcard" | "srs"
  direction: StudyDirection
  answer: SrsAnswer
  studiedAt: number        // unix ms
}

// 同步日志
export interface SyncLog {
  id: string
  entity: "word" | "group" | "tag" | "studyRecord"
  entityId: string
  action: "create" | "update" | "delete"
  payload: any
  timestamp: number
  synced: boolean
}