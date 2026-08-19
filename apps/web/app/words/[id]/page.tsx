"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Star,
  Pencil,
  Trash2,
  BookOpen,
  AlertTriangle,
  Volume2,
  Tag,
  Plus,
  X,
} from "lucide-react"
import { PartOfSpeechLabel, lookupWord, getAdjectiveForms } from "@spanish-vocab/database"
import type { Word } from "@spanish-vocab/database"
import { useWordStore } from "@/stores/wordStore"
import { useTagStore } from "@/stores/tagStore"
import { WordForm } from "@/components/WordForm"
import { ConjugationTable } from "@/components/ConjugationTable"

export default function WordDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { words, fetchWords, toggleStar, deleteWord, getWordById } = useWordStore()
  const [word, setWord] = useState<Word | undefined>(undefined)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (words.length === 0) {
        await fetchWords()
      }
    }
    load()
  }, [])

  useEffect(() => {
    const w = getWordById(params.id)
    setWord(w)
    setLoading(false)
  }, [params.id, words])

  async function handleDelete() {
    await deleteWord(params.id)
    router.push("/words")
  }

  // 加载中
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
        <div className="w-8 h-8 border-3 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mb-4" />
        <p className="text-sm">加载中...</p>
      </div>
    )
  }

  // 未找到
  if (!word) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <AlertTriangle size={40} className="text-[var(--color-text-secondary)]" />
        <p className="text-[var(--color-text-secondary)]">未找到该单词</p>
        <Link href="/words" className="btn-ghost text-sm no-underline">
          返回单词列表
        </Link>
      </div>
    )
  }

  // 词典兜底：旧数据可能缺字段，或手动添加存了「全空变位」，从词典补全
  const dictEntry = lookupWord(word.spanish)

  const hasConjugationData = (c: any) =>
    c && ["present", "preterite", "imperfect", "future", "subjunctive", "imperative", "conditional"]
      .some((t) => c[t] && Object.values(c[t]).some((v: any) => !!v))

  const conjugation = hasConjugationData(word.conjugation)
    ? word.conjugation
    : dictEntry?.conjugation

  const chinese = word.chinese && word.chinese !== word.spanish
    ? word.chinese
    : (dictEntry?.chinese ?? word.chinese)

  const definitionEs = word.definitionEs || dictEntry?.definitionEs

  // 形容词：同时展示阴阳性（antiguo / antigua）
  const adjForms = getAdjectiveForms(word.spanish)
  const displaySpanish = adjForms ? `${adjForms.masculine} / ${adjForms.feminine}` : word.spanish

  // 编辑模式
  if (isEditing) {
    return (
      <div>
        <button
          onClick={() => setIsEditing(false)}
          className="mb-4 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          取消编辑
        </button>
        <WordForm word={word} />
      </div>
    )
  }

  // 查看模式
  return (
    <div className="space-y-5">
      {/* 返回 */}
      <div className="flex items-center gap-3">
        <Link href="/words" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors" aria-label="返回">
          <ArrowLeft size={24} />
        </Link>
        <BookOpen size={24} strokeWidth={2.5} className="text-[var(--color-primary)]" />
        <h1 className="text-[var(--text-h1)] text-[var(--color-text-primary)] flex-1 truncate">
          {displaySpanish}
        </h1>
        <button
          onClick={() => toggleStar(word.id)}
          className={`p-2 rounded-full transition-colors ${
            word.isStarred
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
          }`}
          aria-label={word.isStarred ? "取消星标" : "添加星标"}
        >
          <Star size={22} fill={word.isStarred ? "currentColor" : "none"} />
        </button>
      </div>

      {/* 基本信息卡片 */}
      <div className="card p-5 space-y-4">
        {/* 西语单词 */}
        <div>
          <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-1">
            西语
          </p>
          <div className="flex items-center gap-2">
            <p className="text-[var(--text-h1)] text-[var(--color-text-primary)] font-extrabold">
              {displaySpanish}
            </p>
            <button
              onClick={() => {
                const synth = window.speechSynthesis
                synth.cancel()
                const u = new SpeechSynthesisUtterance(word.spanish)
                u.lang = "es-ES"; u.rate = 0.85
                synth.speak(u)
              }}
              className="p-2 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              aria-label="播放发音"
            >
              <Volume2 size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 中文释义 */}
        <div>
          <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-1">
            中文释义
          </p>
          <p className="text-xl font-bold text-[var(--color-text-primary)]">
            {chinese}
          </p>
        </div>

        {/* 西语释义 */}
        {definitionEs && (
          <div>
            <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-1">
              西语释义
            </p>
            <p className="text-base text-[var(--color-text-primary)]">
              {definitionEs}
            </p>
          </div>
        )}

        {/* 词性 */}
        <div>
          <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-1">
            词性
          </p>
          <span className="inline-block px-3 py-1 text-sm font-bold rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            {PartOfSpeechLabel[word.partOfSpeech]}
          </span>
        </div>
      </div>

      {/* 例句 */}
      {(word.examples || []).length > 0 && (
        <div className="card p-5 space-y-3">
          <h2 className="text-[var(--text-h2)] text-[var(--color-text-primary)]">
            例句
          </h2>
          {(word.examples || []).map((ex, idx) => (
            <div
              key={ex.id}
              className="p-3 rounded-xl bg-[var(--color-bg-secondary)]"
            >
              <p className="text-sm text-[var(--color-text-primary)] font-medium">
                {ex.spanish}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {ex.chinese}
              </p>
              {ex.source !== "manual" && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  来源：{ex.sourceDetail ?? ex.source}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 发音 */}
      {word.audioUrl && (
        <div className="card p-5 space-y-3">
          <h2 className="text-[var(--text-h2)] text-[var(--color-text-primary)] flex items-center gap-2">
            <Volume2 size={18} className="text-[var(--color-primary)]" />
            发音
          </h2>
          <audio controls className="w-full h-10">
            <source src={word.audioUrl} />
            你的浏览器不支持音频播放
          </audio>
        </div>
      )}

      {/* 动词变位 */}
      {conjugation && <ConjugationTable conjugation={conjugation} />}

      {/* 标签 */}
      <WordTagSection wordId={word.id} wordTags={word.tags} />

      {/* 元信息 */}
      <div className="card p-5 space-y-2">
        <h2 className="text-[var(--text-h2)] text-[var(--color-text-primary)] mb-2">
          信息
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          创建时间：{new Date(word.createdAt).toLocaleDateString("zh-CN")}
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          最后修改：{new Date(word.updatedAt).toLocaleDateString("zh-CN")}
        </p>
        {word.isStarred && (
          <p className="text-sm text-[var(--color-accent)] font-semibold flex items-center gap-1"><Star size={14} />已收藏</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={() => setIsEditing(true)}
          className="btn-ghost flex-1"
        >
          <Pencil size={18} />
          编辑
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="btn-ghost flex-1 !text-[var(--color-error)] !border-[var(--color-error)]"
        >
          <Trash2 size={18} />
          删除
        </button>
      </div>

      {/* 删除确认 Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="card p-6 mx-4 max-w-sm w-full space-y-4 bg-[var(--color-bg-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <AlertTriangle
                size={40}
                className="mx-auto mb-3 text-[var(--color-error)]"
              />
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                确认删除？
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                将永久删除「{word.spanish}」及其所有例句。
                <br />
                此操作不可撤销。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-ghost flex-1"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="btn-forget flex-1"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 标签分配子组件
// ============================================================

function WordTagSection({ wordId, wordTags }: { wordId: string; wordTags: string[] }) {
  const { tags, fetchTags } = useTagStore()
  const { updateWord } = useWordStore()
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    if (tags.length === 0) fetchTags()
  }, [])

  if (tags.length === 0) return null

  const assignedTags = tags.filter((t) => wordTags.includes(t.id))
  const unassignedTags = tags.filter((t) => !wordTags.includes(t.id))

  async function toggleTag(tagId: string) {
    const newTags = wordTags.includes(tagId)
      ? wordTags.filter((id) => id !== tagId)
      : [...wordTags, tagId]
    await updateWord(wordId, { tags: newTags })
  }

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Tag size={16} className="text-[var(--color-text-secondary)]" />
        <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase">标签</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {/* 已分配的标签 */}
        {assignedTags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.id)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <X size={10} />
          </button>
        ))}

        {/* 添加标签按钮 */}
        {(unassignedTags.length > 0) && (
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            <Plus size={10} />
            {showMore ? "收起" : "添加标签"}
          </button>
        )}
      </div>

      {/* 可选标签列表 */}
      {showMore && unassignedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[var(--color-border)]">
          {unassignedTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
              style={{ color: tag.color }}
            >
              <Plus size={10} />
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}