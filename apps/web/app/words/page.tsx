"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { BookOpen, Plus, Search, Star, ChevronRight, Tag, X, Check, ChevronDown, Volume2 } from "lucide-react"
import { PartOfSpeech, PartOfSpeechLabel, getAdjectiveForms } from "@spanish-vocab/database"
import { useWordStore } from "@/stores/wordStore"
import { useTagStore } from "@/stores/tagStore"

// 词性选项
const POS_OPTIONS = Object.values(PartOfSpeech).map((v) => ({ value: v, label: PartOfSpeechLabel[v] }))

// 状态选项
const STATUS_OPTIONS = [
  { value: "new", label: "新学" },
  { value: "learning", label: "学习中" },
  { value: "mastered", label: "已掌握" },
  { value: "due", label: "待复习" },
]

export default function WordsPage() {
  const { words, fetchWords, isLoading, filters, setFilter, clearFilters, toggleStar } = useWordStore()
  const { tags, fetchTags } = useTagStore()
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [posFilter, setPosFilter] = useState<PartOfSpeech[]>([])
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [openPanel, setOpenPanel] = useState<"pos" | "status" | "tags" | null>(null)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  // 形容词同时展示阴阳性（antiguo / antigua）
  function displaySpanish(spanish: string): string {
    const forms = getAdjectiveForms(spanish)
    return forms ? `${forms.masculine} / ${forms.feminine}` : spanish
  }

  function speakWord(spanish: string, id: string) {
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(spanish)
    u.lang = "es-ES"; u.rate = 0.85
    u.onstart = () => setSpeakingId(id)
    u.onend = () => setSpeakingId(null)
    u.onerror = () => setSpeakingId(null)
    synth.speak(u)
  }

  useEffect(() => { fetchWords(); fetchTags() }, [])

  // 批量选择
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }, [])
  const selectAll = () => setSelectedIds(filteredWords.map((w) => w.id))
  const clearSelection = () => setSelectedIds([])
  const exitBatchMode = () => { setBatchMode(false); clearSelection() }

  async function batchAddTag(tagId: string) {
    const db = (await import("@spanish-vocab/database")).getDB()
    for (const id of selectedIds) {
      const w = await db.words.get(id)
      if (w) {
        const tags = w.tags || []
        const newTags = tags.includes(tagId) ? tags : [...tags, tagId]
        await db.words.update(id, { tags: newTags, updatedAt: Date.now() })
      }
    }
    // 刷新列表
    await fetchWords()
    clearSelection()
    exitBatchMode()
  }

  function togglePos(v: PartOfSpeech) {
    setPosFilter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])
  }
  function toggleStatus(v: string) {
    setStatusFilter((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])
  }
  function toggleTagFilter(id: string) {
    setTagFilter((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  // 关闭面板（点外部）
  function closePanel() { setOpenPanel(null) }

  // 筛选
  const filteredWords = useMemo(() => {
    let result = [...words]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((w) => w.spanish.toLowerCase().includes(q) || w.chinese.includes(q))
    }
    if (posFilter.length > 0) result = result.filter((w) => posFilter.includes(w.partOfSpeech))
    if (statusFilter.length > 0) {
      const now = Date.now()
      result = result.filter((w) => {
        const srs = w.srsState
        return statusFilter.some((st) => {
          if (st === "new") return srs.repetitions === 0 && srs.nextReviewAt <= now
          if (st === "learning") return srs.repetitions > 0 && srs.interval < 21
          if (st === "mastered") return srs.interval >= 21
          if (st === "due") return srs.nextReviewAt <= now && srs.interval < 21
          return false
        })
      })
    }
    if (filters.starred) result = result.filter((w) => w.isStarred)
    if (tagFilter.length > 0) result = result.filter((w) => tagFilter.some((tid) => w.tags.includes(tid)))
    return result
  }, [words, filters, posFilter, statusFilter, tagFilter])

  const hasActiveFilters = posFilter.length > 0 || statusFilter.length > 0 || tagFilter.length > 0 || filters.starred || filters.search
  const wordCount = words.length
  const filteredCount = filteredWords.length

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen size={28} strokeWidth={2.5} className="text-[var(--color-primary)]" />
          <h1 className="text-[var(--text-h1)] text-[var(--color-text-primary)]">
            单词列表{wordCount > 0 && <span className="text-[var(--text-body)] font-normal text-[var(--color-text-secondary)] ml-2">{wordCount}</span>}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {wordCount > 0 && (
            <button onClick={() => { setBatchMode(!batchMode); clearSelection() }} className={`btn-ghost text-sm px-3 py-2 ${batchMode ? "!border-[var(--color-primary)] !text-[var(--color-primary)]" : ""}`}>
              <Check size={16} /><span className="hidden sm:inline">多选</span>
            </button>
          )}
          <Link href="/words/add" className="btn-primary text-sm px-4 py-2 no-underline"><Plus size={18} /><span className="hidden sm:inline">添加单词</span></Link>
        </div>
      </div>

      {/* 批量提示 */}
      {batchMode && (
        <div className="card p-3 bg-[var(--color-primary-light)] border-[var(--color-primary)] flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--color-primary)]">已选 {selectedIds.length} 个单词</span>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs font-bold text-[var(--color-primary)] hover:underline">全选</button>
            <button onClick={exitBatchMode} className="text-xs font-bold text-[var(--color-text-secondary)] hover:underline">取消</button>
          </div>
        </div>
      )}

      {/* 搜索框 */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" aria-hidden="true" />
        <input type="text" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="搜索西语单词或中文释义…" className="w-full pl-10 pr-4 py-3 bg-[var(--color-bg-primary)] border-2 border-[var(--color-border)] rounded-2xl text-base focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
      </div>

      {/* 筛选按钮栏 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 词性筛选 */}
        <div className="relative">
          <button onClick={() => setOpenPanel(openPanel === "pos" ? null : "pos")} className={`px-3 py-2 text-sm font-semibold rounded-xl border-2 flex items-center gap-1.5 transition-colors ${posFilter.length > 0 ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-light)]" : "border-[var(--color-border)] text-[var(--color-text-primary)] bg-white hover:border-[var(--color-primary)]"}`}>
            词性{posFilter.length > 0 && `(${posFilter.length})`}<ChevronDown size={14} />
          </button>
          {openPanel === "pos" && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-white border-2 border-[var(--color-border)] rounded-2xl p-2 min-w-[160px] shadow-lg max-h-[260px] overflow-y-auto">
              {POS_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-[var(--color-bg-secondary)]">
                  <input type="checkbox" checked={posFilter.includes(opt.value)} onChange={() => togglePos(opt.value)} className="hidden" />
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${posFilter.includes(opt.value) ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-[var(--color-border)]"}`}>
                    {posFilter.includes(opt.value) && <Check size={12} className="text-white" />}
                  </span>
                  <span className="text-sm text-[var(--color-text-primary)]">{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 状态筛选 */}
        <div className="relative">
          <button onClick={() => setOpenPanel(openPanel === "status" ? null : "status")} className={`px-3 py-2 text-sm font-semibold rounded-xl border-2 flex items-center gap-1.5 transition-colors ${statusFilter.length > 0 ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-light)]" : "border-[var(--color-border)] text-[var(--color-text-primary)] bg-white hover:border-[var(--color-primary)]"}`}>
            状态{statusFilter.length > 0 && `(${statusFilter.length})`}<ChevronDown size={14} />
          </button>
          {openPanel === "status" && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-white border-2 border-[var(--color-border)] rounded-2xl p-2 min-w-[140px] shadow-lg">
              {STATUS_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-[var(--color-bg-secondary)]">
                  <input type="checkbox" checked={statusFilter.includes(opt.value)} onChange={() => toggleStatus(opt.value)} className="hidden" />
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${statusFilter.includes(opt.value) ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-[var(--color-border)]"}`}>
                    {statusFilter.includes(opt.value) && <Check size={12} className="text-white" />}
                  </span>
                  <span className="text-sm text-[var(--color-text-primary)]">{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 标签筛选 */}
        {tags.length > 0 && (
          <div className="relative">
            <button onClick={() => setOpenPanel(openPanel === "tags" ? null : "tags")} className={`px-3 py-2 text-sm font-semibold rounded-xl border-2 flex items-center gap-1.5 transition-colors ${tagFilter.length > 0 ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-light)]" : "border-[var(--color-border)] text-[var(--color-text-primary)] bg-white hover:border-[var(--color-primary)]"}`}>
              标签{tagFilter.length > 0 && `(${tagFilter.length})`}<ChevronDown size={14} />
            </button>
            {openPanel === "tags" && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-white border-2 border-[var(--color-border)] rounded-2xl p-2 min-w-[160px] shadow-lg max-h-[260px] overflow-y-auto">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-[var(--color-bg-secondary)]">
                    <input type="checkbox" checked={tagFilter.includes(tag.id)} onChange={() => toggleTagFilter(tag.id)} className="hidden" />
                    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${tagFilter.includes(tag.id) ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-[var(--color-border)]"}`}>
                      {tagFilter.includes(tag.id) && <Check size={12} className="text-white" />}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm text-[var(--color-text-primary)]">{tag.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 星标 */}
        <button onClick={() => setFilter("starred", !filters.starred)} className={`px-3 py-2 text-sm font-semibold rounded-xl border-2 flex items-center gap-1.5 transition-colors ${filters.starred ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-amber-50" : "border-[var(--color-border)] text-[var(--color-text-primary)] bg-white hover:border-[var(--color-accent)]"}`}>
          <Star size={14} fill={filters.starred ? "currentColor" : "none"} />星标
        </button>

        {/* 清除 */}
        {hasActiveFilters && (
          <button onClick={() => { clearFilters(); setPosFilter([]); setStatusFilter([]); setTagFilter([]) }} className="text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1">
            <X size={12} />清除({filteredCount}/{wordCount})
          </button>
        )}
      </div>

      {/* 加载中 */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-secondary)]">
          <div className="w-8 h-8 border-3 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mb-4" />
          <p className="text-sm">加载中...</p>
        </div>
      )}

      {/* 单词列表 */}
      {!isLoading && filteredWords.length > 0 && (
        <div className="space-y-2">
          {filteredWords.map((word) => (
            <div key={word.id} className="card p-4 flex items-center gap-3 group hover:border-[var(--color-primary)] transition-colors">
              {/* 批量复选框 / 星标 */}
              {batchMode ? (
                <button onClick={() => toggleSelect(word.id)} className="shrink-0" aria-label="选择">
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedIds.includes(word.id) ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-[var(--color-border)]"}`}>
                    {selectedIds.includes(word.id) && <Check size={13} strokeWidth={3} className="text-white" />}
                  </span>
                </button>
              ) : (
                <button onClick={() => toggleStar(word.id)} className={`shrink-0 p-1 rounded-full ${word.isStarred ? "text-[var(--color-accent)]" : "text-[var(--color-border)] group-hover:text-[var(--color-accent)]"}`} aria-label={word.isStarred ? "取消星标" : "添加星标"}>
                  <Star size={20} fill={word.isStarred ? "currentColor" : "none"} />
                </button>
              )}

              {/* 单词信息 */}
              {batchMode ? (
                <div className="flex-1 min-w-0"><p className="text-base font-bold text-[var(--color-text-primary)] truncate">{displaySpanish(word.spanish)}</p><p className="text-sm text-[var(--color-text-secondary)] truncate mt-0.5">{word.chinese}</p></div>
              ) : (
                <Link href={`/words/${word.id}`} className="flex-1 min-w-0 no-underline">
                  <div className="flex items-center gap-2"><p className="text-base font-bold text-[var(--color-text-primary)] truncate">{displaySpanish(word.spanish)}</p><span className="shrink-0 px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">{PartOfSpeechLabel[word.partOfSpeech]}</span></div>
                  <p className="text-sm text-[var(--color-text-secondary)] truncate mt-0.5">{word.chinese}</p>
                  {word.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {word.tags.map((tagId) => {
                        const tag = tags.find((t) => t.id === tagId)
                        if (!tag) return null
                        return (
                          <span key={tagId} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full" style={{ backgroundColor: tag.color + "20", color: tag.color, border: "1px solid " + tag.color + "40" }}>
                            {tag.name}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </Link>
              )}
              {!batchMode && (
                <>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); speakWord(word.spanish, word.id) }}
                    className={`shrink-0 p-1.5 rounded-full transition-colors ${speakingId === word.id ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-border)] group-hover:text-[var(--color-primary)] group-hover:bg-[var(--color-primary-light)]"}`}
                    aria-label="播放发音"
                  >
                    <Volume2 size={18} strokeWidth={2} />
                  </button>
                  <ChevronRight size={18} className="shrink-0 text-[var(--color-border)] group-hover:text-[var(--color-primary)] transition-colors" />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 批量操作栏 */}
      {batchMode && selectedIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 md:left-[240px] z-[var(--z-navbar)] flex justify-center px-4">
          <div className="card p-4 shadow-lg w-full max-w-[672px] space-y-3">
            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-text-primary)] shrink-0">
                已选 {selectedIds.length} 个
              </span>
              <button
                onClick={async () => {
                  if (!confirm(`确认删除 ${selectedIds.length} 个单词？此操作不可撤销。`)) return
                  for (const id of selectedIds) await useWordStore.getState().deleteWord(id)
                  clearSelection()
                  exitBatchMode()
                }}
                className="btn-ghost !text-xs !py-1.5 !px-3 !text-[var(--color-error)] !border-[var(--color-error)]"
              >
                批量删除
              </button>
              <div className="flex-1" />
              <button onClick={selectAll} className="text-xs text-[var(--color-primary)] font-semibold hover:underline">全选</button>
              <button onClick={exitBatchMode} className="text-xs text-[var(--color-text-secondary)] hover:underline">取消</button>
            </div>

            {/* 标签选择 */}
            <div className="border-t border-[var(--color-border)] pt-3">
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">批量添加标签：</p>
              {tags.length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  还没有标签，先去
                  <Link href="/settings" className="text-[var(--color-primary)] font-semibold mx-0.5">设置</Link>
                  创建
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button key={tag.id} onClick={() => batchAddTag(tag.id)} className="px-3 py-1.5 text-xs font-semibold rounded-full text-white hover:opacity-80" style={{ backgroundColor: tag.color }}>+ {tag.name}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && words.length === 0 && (
        <div className="card p-10 text-center space-y-3">
          <BookOpen size={48} className="mx-auto text-[var(--color-border)]" strokeWidth={1.5} />
          <p className="text-[var(--color-text-secondary)] text-lg font-semibold">还没有添加单词</p>
          <Link href="/words/add" className="btn-primary inline-flex mt-2 no-underline"><Plus size={18} />添加你的第一个单词</Link>
        </div>
      )}

      {/* 无搜索结果 */}
      {!isLoading && words.length > 0 && filteredWords.length === 0 && (
        <div className="card p-10 text-center space-y-3">
          <Search size={40} className="mx-auto text-[var(--color-border)]" strokeWidth={1.5} />
          <p className="text-[var(--color-text-secondary)]">没有匹配的单词</p>
          <button onClick={() => { clearFilters(); setPosFilter([]); setStatusFilter([]); setTagFilter([]) }} className="btn-ghost text-sm">清除筛选</button>
        </div>
      )}

      {/* FAB */}
      <Link href="/words/add" className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-[var(--color-primary)] border-b-4 border-[var(--color-primary-dark)] rounded-full flex items-center justify-center shadow-lg active:border-b-0 active:translate-y-1 transition-all z-40" aria-label="添加单词">
        <Plus size={28} className="text-white" />
      </Link>
    </div>
  )
}