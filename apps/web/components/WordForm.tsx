"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PartOfSpeech, PartOfSpeechLabel } from "@spanish-vocab/database"
import type { Word, Example } from "@spanish-vocab/database"
import { useWordStore } from "@/stores/wordStore"
import { ConjugationForm } from "./ConjugationForm"
import type { Conjugation } from "@spanish-vocab/database"
import { Plus, X, Save, Volume2 } from "lucide-react"
import Link from "next/link"

interface WordFormProps {
  word?: Word // 编辑模式时传入
}

function createEmptyExample(): Example {
  return {
    id: crypto.randomUUID(),
    spanish: "",
    chinese: "",
    source: "manual",
  }
}

export function WordForm({ word }: WordFormProps) {
  const router = useRouter()
  const { addWord, updateWord } = useWordStore()
  const isEdit = !!word

  // 表单字段
  const [spanish, setSpanish] = useState(word?.spanish ?? "")
  const [chinese, setChinese] = useState(word?.chinese ?? "")
  const [partOfSpeech, setPartOfSpeech] = useState<PartOfSpeech>(
    word?.partOfSpeech ?? PartOfSpeech.NM
  )
  const [examples, setExamples] = useState<Example[]>(
    word?.examples?.length ? word.examples.map((e) => ({ ...e })) : [createEmptyExample()]
  )
  const [audioUrl, setAudioUrl] = useState(word?.audioUrl ?? "")
  const [conjugation, setConjugation] = useState<Conjugation | undefined>(word?.conjugation)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 例句操作
  const addExample = () => setExamples((prev) => [...prev, createEmptyExample()])
  const removeExample = (id: string) =>
    setExamples((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev))
  const updateExample = (id: string, field: keyof Example, value: string) =>
    setExamples((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)))

  // 验证
  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    const trimmedSpanish = spanish.trim()
    if (!trimmedSpanish) newErrors.spanish = "请输入西语单词"
    else if (trimmedSpanish.length < 2) newErrors.spanish = "单词至少 2 个字符"

    const trimmedChinese = chinese.trim()
    if (!trimmedChinese) newErrors.chinese = "请输入中文释义"
    else if (trimmedChinese.length > 100) newErrors.chinese = "释义最多 100 个字符"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      // 过滤掉空的例句行
      const validExamples = examples.filter((ex) => ex.spanish.trim() && ex.chinese.trim())

      if (isEdit) {
        await updateWord(word.id, {
          spanish: spanish.trim(),
          chinese: chinese.trim(),
          partOfSpeech,
          examples: validExamples,
          audioUrl: audioUrl.trim() || undefined,
          conjugation: partOfSpeech === PartOfSpeech.V ? conjugation : undefined,
        })
      } else {
        await addWord({
          spanish: spanish.trim(),
          chinese: chinese.trim(),
          partOfSpeech,
          examples: validExamples,
          audioUrl: audioUrl.trim() || undefined,
          conjugation: partOfSpeech === PartOfSpeech.V ? conjugation : undefined,
        })
      }
      router.push("/words")
    } catch (e) {
      setErrors({ submit: "保存失败，请重试" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* 西语 */}
      <div>
        <label htmlFor="spanish" className="block text-sm font-bold text-[var(--color-text-primary)] mb-1.5">
          西语单词 <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="spanish"
          type="text"
          value={spanish}
          onChange={(e) => setSpanish(e.target.value)}
          placeholder="如：el problema"
          autoFocus
          className={`w-full px-4 py-3 bg-[var(--color-bg-primary)] border-2 rounded-2xl text-base transition-colors focus:outline-none ${
            errors.spanish
              ? "border-[var(--color-error)]"
              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
          }`}
        />
        {errors.spanish && (
          <p className="mt-1 text-xs text-[var(--color-error)]">{errors.spanish}</p>
        )}
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          包含冠词：el/la/los/las + 名词，或动词原形
        </p>
      </div>

      {/* 中文 */}
      <div>
        <label htmlFor="chinese" className="block text-sm font-bold text-[var(--color-text-primary)] mb-1.5">
          中文释义 <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="chinese"
          type="text"
          value={chinese}
          onChange={(e) => setChinese(e.target.value)}
          placeholder="如：问题"
          className={`w-full px-4 py-3 bg-[var(--color-bg-primary)] border-2 rounded-2xl text-base transition-colors focus:outline-none ${
            errors.chinese
              ? "border-[var(--color-error)]"
              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
          }`}
        />
        {errors.chinese && (
          <p className="mt-1 text-xs text-[var(--color-error)]">{errors.chinese}</p>
        )}
      </div>

      {/* 词性 */}
      <div>
        <label htmlFor="pos" className="block text-sm font-bold text-[var(--color-text-primary)] mb-1.5">
          词性 <span className="text-[var(--color-error)]">*</span>
        </label>
        <select
          id="pos"
          value={partOfSpeech}
          onChange={(e) => setPartOfSpeech(e.target.value as PartOfSpeech)}
          className="w-full px-4 py-3 bg-[var(--color-bg-primary)] border-2 border-[var(--color-border)] rounded-2xl text-base focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23afafaf%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px] bg-[right_12px_center] bg-no-repeat"
        >
          {Object.values(PartOfSpeech).map((pos) => (
            <option key={pos} value={pos}>
              {PartOfSpeechLabel[pos]}
            </option>
          ))}
        </select>
      </div>

      {/* 发音音频 URL */}
      <div>
        <label htmlFor="audioUrl" className="block text-sm font-bold text-[var(--color-text-primary)] mb-1.5">
          <Volume2 size={14} className="inline mr-1" />
          发音音频 <span className="text-xs font-normal text-[var(--color-text-secondary)]">（可选，填写 URL）</span>
        </label>
        <input
          id="audioUrl"
          type="url"
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          placeholder="https://example.com/audio.mp3"
          className="w-full px-4 py-3 bg-[var(--color-bg-primary)] border-2 border-[var(--color-border)] rounded-2xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>

      {/* 动词变位（仅动词） */}
      {partOfSpeech === PartOfSpeech.V && (
        <ConjugationForm
          value={conjugation}
          onChange={setConjugation}
        />
      )}

      {/* 例句 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-[var(--color-text-primary)]">
            例句 <span className="text-xs font-normal text-[var(--color-text-secondary)]">（可选）</span>
          </label>
          <button
            type="button"
            onClick={addExample}
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            <Plus size={14} />
            添加例句
          </button>
        </div>

        <div className="space-y-3">
          {examples.map((ex, idx) => (
            <div
              key={ex.id}
              className="relative card p-3 space-y-2 bg-[var(--color-bg-primary)]"
            >
              {/* 行号 + 删除 */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                  例句 {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeExample(ex.id)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors"
                  aria-label={`删除例句 ${idx + 1}`}
                >
                  <X size={16} />
                </button>
              </div>

              <input
                type="text"
                value={ex.spanish}
                onChange={(e) => updateExample(ex.id, "spanish", e.target.value)}
                placeholder="西语句子..."
                className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
              <input
                type="text"
                value={ex.chinese}
                onChange={(e) => updateExample(ex.id, "chinese", e.target.value)}
                placeholder="中文翻译..."
                className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 提交错误 */}
      {errors.submit && (
        <div className="p-3 bg-red-50 border-2 border-[var(--color-error)] rounded-2xl">
          <p className="text-sm text-[var(--color-error)]">{errors.submit}</p>
        </div>
      )}

      {/* 保存按钮 */}
      <button
        type="submit"
        disabled={saving}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save size={18} />
        {saving ? "保存中..." : isEdit ? "保存修改" : "添加单词"}
      </button>
    </form>
  )
}