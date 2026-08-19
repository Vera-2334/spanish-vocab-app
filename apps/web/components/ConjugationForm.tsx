"use client"

import { useState } from "react"
import { Layers } from "lucide-react"
import type { Conjugation, TenseRow } from "@spanish-vocab/database"

const PERSON_ROWS: { key: keyof TenseRow; short: string }[] = [
  { key: "yo", short: "yo" },
  { key: "tu", short: "tú" },
  { key: "elEllaUsted", short: "él/ella" },
  { key: "nosotros", short: "nos." },
  { key: "vosotros", short: "vos." },
  { key: "ellosEllasUstedes", short: "ellos/ellas" },
]

const TENSE_DEFS: { key: keyof Omit<Conjugation, "isRegular">; label: string; short: string }[] = [
  { key: "present", label: "现在时 (Presente)", short: "现在时" },
  { key: "preterite", label: "简单过去时 (Pretérito)", short: "过去时" },
  { key: "imperfect", label: "过去未完成时 (Imperfecto)", short: "未完时" },
  { key: "future", label: "将来时 (Futuro)", short: "将来时" },
  { key: "subjunctive", label: "虚拟式现在时 (Subjuntivo)", short: "虚拟式" },
  { key: "imperative", label: "命令式 (Imperativo)", short: "命令式" },
  { key: "conditional", label: "条件式 (Condicional)", short: "条件式" },
]

function emptyTenseRow(): TenseRow {
  return { yo: "", tu: "", elEllaUsted: "", nosotros: "", vosotros: "", ellosEllasUstedes: "" }
}

function emptyConjugation(): Conjugation {
  return {
    present: emptyTenseRow(),
    preterite: emptyTenseRow(),
    imperfect: emptyTenseRow(),
    future: emptyTenseRow(),
    subjunctive: emptyTenseRow(),
    imperative: emptyTenseRow(),
    conditional: emptyTenseRow(),
    isRegular: true,
  }
}

interface ConjugationFormProps {
  value?: Conjugation
  onChange: (c: Conjugation) => void
}

export function ConjugationForm({ value, onChange }: ConjugationFormProps) {
  const [conj, setConj] = useState<Conjugation>(value ?? emptyConjugation())
  const [activeTense, setActiveTense] = useState(0)

  const isRegular = conj.isRegular

  function toggleRegular() {
    const next = { ...conj, isRegular: !conj.isRegular }
    setConj(next)
    onChange(next)
  }

  function updateTense(tKey: keyof Omit<Conjugation, "isRegular">, person: keyof TenseRow, val: string) {
    const next = {
      ...conj,
      [tKey]: { ...conj[tKey], [person]: val },
    }
    setConj(next)
    onChange(next)
  }

  const tense = TENSE_DEFS[activeTense]
  const tenseData = conj[tense.key]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers size={18} className="text-[var(--color-primary)]" />
        <label className="text-sm font-bold text-[var(--color-text-primary)]">
          动词变位
        </label>
      </div>

      {/* 规则动词开关 */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isRegular}
          onChange={toggleRegular}
          className="w-5 h-5 accent-[var(--color-primary)]"
        />
        <span className="text-sm text-[var(--color-text-primary)]">
          规则动词
        </span>
      </label>

      <>
        {/* 时态选择 Tab */}
        <div className="flex flex-wrap gap-1">
          {TENSE_DEFS.map((t, idx) => (
            <button
              key={t.key}
              onClick={() => setActiveTense(idx)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap ${
                idx === activeTense
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {t.short}
            </button>
          ))}
        </div>

        {/* 当前时态表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-2 text-xs text-[var(--color-text-secondary)] font-semibold">
                  人称
                </th>
                <th className="text-left py-1.5 px-2 text-xs text-[var(--color-text-secondary)] font-semibold">
                  变位
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {PERSON_ROWS.map((p) => (
                <tr key={p.key}>
                  <td className="py-1.5 px-2 font-semibold text-[var(--color-text-secondary)] whitespace-nowrap">
                    {p.short}
                  </td>
                  <td className="py-1 px-2">
                    <input
                      type="text"
                      value={(tenseData as TenseRow)[p.key]}
                      onChange={(e) =>
                        updateTense(tense.key, p.key, e.target.value)
                      }
                      placeholder={`${p.short} 的变位...`}
                      className="w-full px-2 py-1 text-sm bg-[var(--color-bg-secondary)] border border-transparent rounded-lg focus:border-[var(--color-primary)] focus:bg-white focus:outline-none transition-colors"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    </div>
  )
}