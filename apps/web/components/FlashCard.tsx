"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Volume2,
  Star,
} from "lucide-react"
import { PartOfSpeechLabel, getAdjectiveForms, lookupWord } from "@spanish-vocab/database"
import type { Word, StudyDirection } from "@spanish-vocab/database"
import { ConjugationTable } from "./ConjugationTable"

// 形容词同时展示阴阳性（antiguo / antigua）
function displaySpanish(spanish: string): string {
  const forms = getAdjectiveForms(spanish)
  return forms ? `${forms.masculine} / ${forms.feminine}` : spanish
}

interface FlashCardProps {
  word: Word
  direction: StudyDirection
  isStarred: boolean
  onToggleStar: () => void
}

// ============================================================
// TTS Hook
// ============================================================

function useTTS() {
  const [playing, setPlaying] = useState(false)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    synthRef.current = window.speechSynthesis
    return () => {
      synthRef.current?.cancel()
    }
  }, [])

  const speak = useCallback((text: string) => {
    const synth = synthRef.current
    if (!synth) return

    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "es-ES"
    utterance.rate = 0.85
    utterance.pitch = 1

    utterance.onstart = () => setPlaying(true)
    utterance.onend = () => setPlaying(false)
    utterance.onerror = () => setPlaying(false)

    synth.speak(utterance)
  }, [])

  return { speak, playing }
}

// ============================================================
// Card Content
// ============================================================

function FrontFace({
  word,
  direction,
  playing,
  onSpeak,
}: {
  word: Word
  direction: StudyDirection
  playing: boolean
  onSpeak: () => void
}) {
  const showSpanish = direction === "es-zh"
  const showChinese = direction === "zh-es"
  const isListening = direction === "listening"

  if (isListening) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSpeak()
          }}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            playing
              ? "bg-[var(--color-primary)] text-white scale-110"
              : "bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:scale-105"
          }`}
          aria-label="播放发音"
        >
          <Volume2 size={36} strokeWidth={2} />
        </button>
        <p className="text-sm text-[var(--color-text-secondary)] font-semibold">
          {playing ? "正在播放..." : "点击播放发音"}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
      {showSpanish && (
        <>
          <p className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] leading-tight break-words max-w-full">
            {displaySpanish(word.spanish)}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSpeak()
            }}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              playing
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
            }`}
            aria-label="播放发音"
          >
            <Volume2 size={22} strokeWidth={2} />
          </button>
        </>
      )}

      {showChinese && (
        <>
          <p className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] leading-tight break-words max-w-full">
            {word.chinese}
          </p>
          <span className="px-3 py-1 text-sm font-bold rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            {PartOfSpeechLabel[word.partOfSpeech]}
          </span>
        </>
      )}
    </div>
  )
}

// 是否有实际变位数据（区分「空但为真」的变位对象）
function hasConjugationData(conj: any): boolean {
  return !!conj && ["present", "preterite", "imperfect", "future", "subjunctive", "imperative", "conditional"]
    .some((t) => conj[t] && Object.values(conj[t]).some((v: any) => !!v))
}

function BackFace({ word }: { word: Word }) {
  // 动词变位：旧数据兜底，从词典补全
  const dictEntry = lookupWord(word.spanish)
  const conjugation = hasConjugationData(word.conjugation)
    ? word.conjugation
    : dictEntry?.conjugation

  return (
    <div className="flex flex-col h-full overflow-y-auto py-4 px-4 space-y-4">
      {/* 西语 + 发音 */}
      <div>
        <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-1">
          西语
        </p>
        <p className="text-[var(--text-h2)] text-[var(--color-text-primary)] font-extrabold">
          {displaySpanish(word.spanish)}
        </p>
      </div>

      {/* 中文 */}
      <div>
        <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-1">
          中文释义
        </p>
        <p className="text-xl font-bold text-[var(--color-text-primary)]">
          {word.chinese}
        </p>
      </div>

      {/* 西语释义 */}
      {word.definitionEs && (
        <div>
          <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-1">
            西语释义
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] italic leading-relaxed">
            {word.definitionEs}
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

      {/* 例句 */}
      {word.examples.length > 0 && (
        <div>
          <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">
            例句
          </p>
          <div className="space-y-2">
            {word.examples.slice(0, 3).map((ex) => (
              <div
                key={ex.id}
                className="p-3 rounded-xl bg-[var(--color-bg-secondary)] text-sm"
              >
                <p className="text-[var(--color-text-primary)] font-medium">
                  {ex.spanish}
                </p>
                <p className="text-[var(--color-text-secondary)] mt-1">
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
        </div>
      )}

      {/* 动词变位 */}
      {conjugation && <ConjugationTable conjugation={conjugation} compact />}
    </div>
  )
}

// ============================================================
// FlashCard Component
// ============================================================

export function FlashCard({ word, direction, isStarred, onToggleStar }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false)
  const { speak, playing } = useTTS()

  // 切词时重置翻转状态
  useEffect(() => {
    setFlipped(false)
  }, [word.id])

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev)
  }, [])

  const handleSpeak = useCallback(() => {
    speak(word.spanish)
  }, [word.spanish, speak])

  return (
    <div className="w-full max-w-[420px] mx-auto" style={{ perspective: "1200px" }}>
      {/* 星标 + 翻转提示 */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={onToggleStar}
          className={`p-2 rounded-full transition-colors ${
            isStarred
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
          }`}
          aria-label={isStarred ? "取消星标" : "添加星标"}
        >
          <Star size={22} fill={isStarred ? "currentColor" : "none"} />
        </button>

        <p className="text-xs text-[var(--color-text-secondary)] font-semibold">
          {flipped ? "已翻转，查看释义和例句" : "点击卡片翻转"}
        </p>
      </div>

      {/* 卡片 */}
      <div
        className="relative w-full cursor-pointer select-none"
        style={{
          aspectRatio: "3 / 4",
          maxHeight: "420px",
          transformStyle: "preserve-3d",
          transition: "transform var(--duration-card-flip) ease",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        } as React.CSSProperties}
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        aria-label={flipped ? "卡片背面，显示单词详细信息" : "卡片正面，点击翻转查看答案"}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            handleFlip()
          }
        }}
      >
        {/* 正面 */}
        <div
          className="absolute inset-0 card p-0 overflow-hidden flex flex-col"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex-1 flex items-center justify-center">
            <FrontFace
              word={word}
              direction={direction}
              playing={playing}
              onSpeak={handleSpeak}
            />
          </div>
          <div className="p-3 border-t-2 border-[var(--color-border)]">
            <p className="text-xs text-center text-[var(--color-text-secondary)] font-semibold">
              {direction === "es-zh" && "西 → 中"}
              {direction === "zh-es" && "中 → 西"}
              {direction === "listening" && "听音辨义"}
            </p>
          </div>
        </div>

        {/* 背面 */}
        <div
          className="absolute inset-0 card p-0 overflow-hidden flex flex-col"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex-1 overflow-y-auto">
            <BackFace word={word} />
          </div>
          <div className="p-3 border-t-2 border-[var(--color-border)]">
            <p className="text-xs text-center text-[var(--color-text-secondary)] font-semibold">
              {displaySpanish(word.spanish)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}