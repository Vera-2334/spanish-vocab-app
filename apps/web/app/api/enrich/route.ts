import { NextResponse } from "next/server"
import { lookupWord } from "@spanish-vocab/database"
import { getDB, initDB } from "@/lib/db"
import { enrichWithAI } from "@/lib/ai"

// 归一化缓存 key：去冠词 + 小写 + 去重音
function normalizeKey(q: string): string {
  return q
    .trim()
    .replace(/^(el|la|los|las|un|una)\s+/i, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

// 去掉冠词，保留基础词形
function stripArticle(q: string): string {
  return q.trim().replace(/^(el|la|los|las|un|una)\s+/i, "")
}

function safeJson(s: any, fallback: any): any {
  if (s == null) return fallback
  try { return JSON.parse(s) } catch { return fallback }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Missing 'q'" }, { status: 400 })
  }

  // 1. 静态词典（快、免费、准确）
  const entry = lookupWord(query)
  if (entry) {
    return NextResponse.json({
      chinese: entry.chinese,
      definitionEs: entry.definitionEs,
      partOfSpeech: entry.pos,
      article: entry.article,
      spanishWithArticle: entry.article ? `${entry.article} ${entry.key}` : entry.key,
      examples: entry.examples ?? [],
      conjugation: entry.conjugation ?? null,
    })
  }

  // 2. 词典缓存 → 3. AI 生成（DB 或 AI 异常都降级为光杆，不报 500）
  try {
    await initDB()
    const db = getDB()
    const key = normalizeKey(query)

    // 2. 缓存命中
    const cached = await db.execute({ sql: "SELECT * FROM dict_cache WHERE key = ?", args: [key] })
    if (cached.rows.length > 0) {
      const r = cached.rows[0] as any
      const base = stripArticle(query)
      return NextResponse.json({
        chinese: r.chinese ?? "",
        definitionEs: r.definition_es ?? "",
        partOfSpeech: r.pos ?? "OTHER",
        article: r.article ?? "",
        spanishWithArticle: r.article ? `${r.article} ${base}` : base,
        examples: safeJson(r.examples, []),
        conjugation: r.conjugation ? safeJson(r.conjugation, null) : null,
      })
    }

    // 3. AI 生成
    const ai = await enrichWithAI(query)
    if (ai) {
      // 用 AI 返回的规范拼写补全重音（仅当与输入同词，去重音后一致才采用，避免被 AI 改写）
      const aiWord = ai.word && normalizeKey(ai.word) === normalizeKey(query) ? stripArticle(ai.word) : stripArticle(query)
      const base = aiWord
      const spanish = ai.article ? `${ai.article} ${base}` : base
      try {
        await db.execute({
          sql: `INSERT INTO dict_cache (key, spanish, chinese, definition_es, pos, article, feminine, examples, conjugation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                  spanish = excluded.spanish,
                  chinese = excluded.chinese,
                  definition_es = excluded.definition_es,
                  pos = excluded.pos,
                  article = excluded.article,
                  feminine = excluded.feminine,
                  examples = excluded.examples,
                  conjugation = excluded.conjugation`,
          args: [key, spanish, ai.chinese, ai.definitionEs, ai.pos, ai.article, ai.feminine ?? null, JSON.stringify(ai.examples), ai.conjugation ? JSON.stringify(ai.conjugation) : null],
        })
      } catch { /* 缓存失败不影响返回 */ }

      return NextResponse.json({
        chinese: ai.chinese,
        definitionEs: ai.definitionEs,
        partOfSpeech: ai.pos,
        article: ai.article,
        spanishWithArticle: spanish,
        examples: ai.examples,
        conjugation: ai.conjugation ?? null,
      })
    }
  } catch { /* 无 DB 或无网络 → 降级 */ }

  // 4. 全部失败 → 光杆（只有西语）
  return NextResponse.json({
    chinese: "",
    definitionEs: "",
    partOfSpeech: "OTHER",
    article: "",
    spanishWithArticle: query,
    examples: [],
    conjugation: null,
  })
}
