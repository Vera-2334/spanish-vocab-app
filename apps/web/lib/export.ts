import type { Word } from "@spanish-vocab/database"
import { lookupWord, getAdjectiveForms, isNew, isMastered } from "@spanish-vocab/database"

// ============================================================
// 词典兜底：旧数据可能没存 definitionEs / conjugation，导出前从词典补全
// ============================================================

const CONJ_TENSES = ["present", "preterite", "imperfect", "future", "subjunctive", "imperative", "conditional"]

// 形容词同时展示阴阳性（antiguo / antigua）
function displaySpanish(spanish: string): string {
  const forms = getAdjectiveForms(spanish)
  return forms ? `${forms.masculine} / ${forms.feminine}` : spanish
}

function hasConjugationData(conj: any): boolean {
  return !!conj && CONJ_TENSES.some((t) => conj[t] && Object.values(conj[t]).some((v: any) => !!v))
}

function enriched(word: Word) {
  const entry = lookupWord(word.spanish)
  const conjugation = hasConjugationData(word.conjugation) ? word.conjugation : entry?.conjugation
  // 中文兜底：旧数据可能是空或直接存了西语本身
  const chinese = word.chinese && word.chinese !== word.spanish
    ? word.chinese
    : (entry?.chinese ?? word.chinese)
  // 例句兜底：旧数据可能没存例句
  const examples: Word["examples"] = word.examples?.length
    ? word.examples
    : (entry?.examples ?? []).map((e, i) => ({
        id: `dict-${i}`,
        spanish: e.spanish,
        chinese: e.chinese,
        source: "dictionary" as const,
      }))
  return {
    ...word,
    chinese,
    definitionEs: word.definitionEs || entry?.definitionEs || "",
    conjugation,
    examples,
  }
}

// 动词变位展平为可读文本
const TENSE_LABELS: Record<string, string> = {
  present: "现在时", preterite: "过去时", imperfect: "未完时",
  future: "将来时", conditional: "条件式", subjunctive: "虚拟式", imperative: "命令式",
}
const PERSON_LABELS: [string, string][] = [
  ["yo", "yo"], ["tu", "tú"], ["elEllaUsted", "él/ella/usted"],
  ["nosotros", "nosotros"], ["vosotros", "vosotros"], ["ellosEllasUstedes", "ellos/ellas/ustedes"],
]

function formatConjugation(conj: any, lineSep = "\n"): string {
  if (!conj) return ""
  const lines: string[] = []
  for (const [tKey, tLabel] of Object.entries(TENSE_LABELS)) {
    const row = conj[tKey]
    if (!row) continue
    const cells = PERSON_LABELS
      .map(([pKey, pLabel]) => (row[pKey] ? `${pLabel} ${row[pKey]}` : ""))
      .filter(Boolean)
    if (cells.length) lines.push(`${tLabel}: ${cells.join("，")}`)
  }
  return lines.join(lineSep)
}

// ============================================================
// CSV 导出
// ============================================================

export function exportCSV(words: Word[]): string {
  const headers = ["西语", "中文", "西语释义", "词性", "动词变位", "例句(西语)", "例句(中文)", "星标", "标签", "掌握状态", "创建时间"]
  const rows = words.map((w0) => {
    const w = enriched(w0)
    const masterStatus = isMastered(w.srsState) ? "已掌握" : isNew(w.srsState) ? "新学" : "学习中"
    return [
      escapeCsv(displaySpanish(w.spanish)),
      escapeCsv(w.chinese),
      escapeCsv(w.definitionEs),
      w.partOfSpeech,
      escapeCsv(formatConjugation(w.conjugation)),
      escapeCsv(w.examples.map((e) => e.spanish).join("；")),
      escapeCsv(w.examples.map((e) => e.chinese).join("；")),
      w.isStarred ? "是" : "否",
      w.tags.join("；"),
      masterStatus,
      new Date(w.createdAt).toLocaleDateString("zh-CN"),
    ]
  })

  const bom = "﻿" // UTF-8 BOM for Excel compatibility
  return bom + [headers, ...rows].map((r) => r.join(",")).join("\n")
}

function escapeCsv(str: string): string {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function downloadCSV(words: Word[], filename?: string) {
  const csv = exportCSV(words)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  downloadBlob(blob, filename ?? `西语单词导出_${dateString()}.csv`)
}

// ============================================================
// Anki apkg 导出
// ============================================================

export function exportAnkiApkg(words: Word[], deckName = "西语单词"): Blob {
  // apkg 本质是 SQLite 数据库，包含 collection + notes + cards 表
  // 这里生成简化的 CSV (可直接导入 Anki)，供用户自行处理
  const lines = words.map((w0) => {
    // Anki 基本格式：正面(西语), 背面(中文+词性+释义+例句+变位)
    const w = enriched(w0)
    const front = displaySpanish(w.spanish)
    const blocks: string[] = [`${w.chinese}`, `词性: ${w.partOfSpeech}`]
    if (w.definitionEs) blocks.push(`释义: ${w.definitionEs}`)
    for (let i = 0; i < w.examples.length; i++) {
      blocks.push(`例句${i + 1}: ${w.examples[i].spanish}\n${w.examples[i].chinese}`)
    }
    const conj = formatConjugation(w.conjugation, "<br>")
    if (conj) blocks.push(`变位:<br>${conj}`)
    const back = blocks.join("<br><br>")

    return `"${front.replace(/"/g, '""')}","${back.replace(/"/g, '""')}"`
  })

  const csv = `#separator:Comma\n#html:true\n#tags column:3\n正面,背面,标签\n` + lines.map(
    (l, i) => {
      const tag = words[i].isStarred ? "星标" : ""
      return `${l},"${tag}"`
    }
  ).join("\n")

  return new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
}

export function downloadAnkiApkg(words: Word[], deckName?: string) {
  const blob = exportAnkiApkg(words, deckName)
  downloadBlob(blob, `${deckName ?? "西语单词"}_${dateString()}.csv`)
}

// ============================================================
// Helpers
// ============================================================

function dateString(): string {
  return new Date().toISOString().split("T")[0]
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
