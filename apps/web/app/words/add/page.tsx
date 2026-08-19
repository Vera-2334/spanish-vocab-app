"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Pencil, ClipboardPaste, Plus, Check, X, AlertTriangle, Table2, Save, Lightbulb,
} from "lucide-react"
import { PartOfSpeech, PartOfSpeechLabel } from "@spanish-vocab/database"
import type { Example, Conjugation } from "@spanish-vocab/database"
import { useWordStore } from "@/stores/wordStore"
import { useTagStore } from "@/stores/tagStore"
import { WordForm } from "@/components/WordForm"

type AddTab = "manual" | "quick"

interface ParsedRow {
  id: number
  spanish: string
  chinese: string
  partOfSpeech: PartOfSpeech
  raw: string
  errors: string[]
  included: boolean
}

// 解析单词列表
function parseWordList(text: string): string[] {
  const tokens: string[] = []
  const lines = text.split(/\n/)
  for (const line of lines) {
    const parts = line.split(/[,，、\t]+/)
    for (const part of parts) {
      const word = part.trim()
      if (word && word.length >= 2) tokens.push(word)
    }
  }
  return [...new Set(tokens)]
}

export default function AddWordPage() {
  const router = useRouter()
  const { words, batchAddWords } = useWordStore()
  const [tab, setTab] = useState<AddTab>("manual")

  // 快速导入状态
  const [quickText, setQuickText] = useState("")
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState("")
  const [importTags, setImportTags] = useState<string[]>([])
  const { tags: allTags, fetchTags: ft } = useTagStore()
  useEffect(() => { ft() }, [])

  const TABS: { key: AddTab; icon: typeof Pencil; label: string }[] = [
    { key: "manual", icon: Pencil, label: "手动输入" },
    { key: "quick", icon: ClipboardPaste, label: "快速导入" },
  ]

  // 快速导入解析
  function handleQuickParse() {
    const wordList = parseWordList(quickText)
    if (wordList.length === 0) return

    const existingWords = useWordStore.getState().words
    const rows: ParsedRow[] = wordList.map((spanish, idx) => {
      const errors: string[] = []
      if (spanish.length < 2) errors.push("太短")
      if (existingWords.some((w) => w.spanish === spanish)) errors.push("已存在")
      return {
        id: idx, spanish, chinese: "", partOfSpeech: PartOfSpeech.OTHER,
        raw: spanish, errors, included: errors.length === 0,
      }
    })
    setParsedRows(rows)
  }

  function toggleRow(id: number) {
    setParsedRows((prev) => prev.map((r) => r.id === id ? { ...r, included: !r.included } : r))
  }

  // 一键导入：逐个查词典 → 缓存 → AI 补全字段，再统一入库
  async function handleImport() {
    const existingWords = useWordStore.getState().words
    const toImport = parsedRows.filter((r) => r.included && !existingWords.some((w) => w.spanish === r.spanish))
    if (toImport.length === 0) return
    setImporting(true)
    const groupId = crypto.randomUUID()
    const entries: Array<{
      spanish: string
      chinese: string
      partOfSpeech: PartOfSpeech
      examples: Example[]
      groupId: string
      tags: string[]
      definitionEs?: string
      conjugation?: Conjugation
    }> = []

    for (let i = 0; i < toImport.length; i++) {
      const row = toImport[i]
      setImportProgress(`导入并匹配 ${i + 1}/${toImport.length}：${row.spanish}`)

      let spanish = row.spanish
      let chinese = ""
      let definitionEs = ""
      let partOfSpeech: PartOfSpeech = row.partOfSpeech
      let conjugation: Conjugation | undefined
      let examples: Example[] = []

      try {
        const resp = await fetch(`/api/enrich?q=${encodeURIComponent(row.spanish)}`)
        if (resp.ok) {
          const data = await resp.json()
          if (data.article && data.spanishWithArticle) spanish = data.spanishWithArticle
          if (data.partOfSpeech && Object.values(PartOfSpeech).includes(data.partOfSpeech)) partOfSpeech = data.partOfSpeech
          if (data.chinese) chinese = data.chinese
          if (data.definitionEs) definitionEs = data.definitionEs
          if (data.conjugation) conjugation = data.conjugation
          if (data.examples?.length > 0) {
            examples = data.examples.map((e: any) => ({
              id: crypto.randomUUID(),
              spanish: e.spanish,
              chinese: e.chinese,
              source: "corpus" as const,
              sourceDetail: "AI",
            }))
          }
        }
      } catch {
        // 匹配失败仍可入库（只有西语）
      }

      entries.push({
        spanish,
        chinese: chinese || row.spanish,
        partOfSpeech,
        definitionEs,
        conjugation,
        examples,
        groupId,
        tags: importTags,
      })
    }

    await batchAddWords(entries)
    setParsedRows([])
    setQuickText("")
    setImporting(false)
    router.push("/words")
  }

  return (
    <div className="space-y-5">

      {/* Tab */}
      <div className="flex rounded-2xl bg-[var(--color-bg-secondary)] p-1">
        {TABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setParsedRows([]) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold rounded-xl transition-colors ${
              tab === key ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {/* 手动输入 */}
      {tab === "manual" && <WordForm />}

      {/* 快速导入 */}
      {tab === "quick" && (
        <div className="space-y-3">
          <div className="card p-3 bg-[var(--color-primary-light)] border-[var(--color-primary)]">
            <p className="text-xs text-[var(--color-primary)] font-semibold flex items-start gap-1.5">
              <Lightbulb size={14} className="shrink-0 mt-px" />
              <span>粘贴逗号、顿号或换行分隔的西语单词，自动拆分为独立词条。释义后续可在词表中补充。</span>
            </p>
          </div>
          <textarea
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            placeholder={`el problema, la casa, hablar, comer\nrápidamente\nla solución, el lápiz、la mesa`}
            rows={6}
            className="w-full px-4 py-3 bg-[var(--color-bg-primary)] border-2 border-[var(--color-border)] rounded-2xl text-sm font-mono resize-y focus:outline-none focus:border-[var(--color-primary)]"
          />
          <button onClick={handleQuickParse} disabled={!quickText.trim()} className="btn-primary w-full disabled:opacity-50">
            <Table2 size={16} />解析预览
          </button>
        </div>
      )}

      {/* 预览表格（快速导入共用） */}
      {parsedRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              预览 <span className="text-[var(--color-text-secondary)] font-normal">({parsedRows.length} 条)</span>
            </h3>
            <span className="text-xs text-[var(--color-secondary)] font-semibold">
              {parsedRows.filter((r) => r.included).length} 可导入
            </span>
          </div>

          {/* 标签选择 */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--color-text-secondary)]">导入标签：</span>
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setImportTags((prev) => prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id])}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full border-2 transition-colors ${
                    importTags.includes(tag.id)
                      ? "text-white border-transparent"
                      : "bg-white text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
                  }`}
                  style={importTags.includes(tag.id) ? { backgroundColor: tag.color, borderColor: tag.color } : undefined}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {parsedRows.map((row) => (
              <div key={row.id} className={`card p-3 flex items-start gap-3 ${row.included ? "border-[var(--color-border)]" : "border-[var(--color-error)] bg-red-50"}`}>
                <button onClick={() => toggleRow(row.id)} className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mt-1 ${row.included ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-error)] text-white"}`}>
                  {row.included ? <Check size={14} /> : <X size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">{row.spanish}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{row.chinese || "—"}</p>
                  {row.errors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {row.errors.map((err) => (
                        <span key={err} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full text-white ${err.startsWith("已入库") ? "bg-[var(--color-secondary)]" : "bg-[var(--color-error)]"}`}>
                          {err.startsWith("已入库") ? <Check size={10} /> : <AlertTriangle size={10} />}{err}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="shrink-0 px-2 py-1 text-xs font-bold rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                  {PartOfSpeechLabel[row.partOfSpeech]}
                </span>
              </div>
            ))}
          </div>

          <button onClick={handleImport} disabled={importing || parsedRows.filter((r) => r.included).length === 0} className="btn-primary w-full disabled:opacity-50">
            <Save size={18} />
            {importing ? importProgress : `导入 ${parsedRows.filter((r) => r.included).length} 个单词`}
          </button>
        </div>
      )}
    </div>
  )
}