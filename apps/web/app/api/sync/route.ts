import { NextResponse } from "next/server"
import { getDB, initDB } from "@/lib/db"
import * as jose from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "vocab-secret-min-32-chars-change-me!!")

async function authUserId(req: Request): Promise<string | null> {
  const header = req.headers.get("Authorization") ?? ""
  const token = header.replace(/^Bearer\s+/i, "")
  if (!token) return null
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET)
    return (payload as any).userId
  } catch { return null }
}

// POST: Push (上传单词) — 批量 SQL，一次 HTTP 往返
export async function POST(req: Request) {
  const userId = await authUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { changes, replaceAll } = await req.json()
  if (!changes?.length) return NextResponse.json({ ok: true })

  await initDB()
  const db = getDB()

  // 全量替换模式：先清空再写入
  if (replaceAll) {
    await db.execute({ sql: "DELETE FROM sync_words WHERE user_id = ?", args: [userId] })
  }

  // 构建批量 SQL — 先删同西语旧词，再插入（去重）
  const stmts: { sql: string; args: any[] }[] = []
  const processedSpanish = new Set<string>()
  for (const c of changes) {
    if (c.action === "delete") {
      stmts.push({ sql: "DELETE FROM sync_words WHERE id = ? AND user_id = ?", args: [c.entityId, userId] })
    } else {
      const w = c.payload || {}
      const spanish = w.spanish || ""
      // 同一批次中同西语词只保留第一次
      if (spanish && !processedSpanish.has(spanish)) {
        processedSpanish.add(spanish)
        stmts.push({ sql: "DELETE FROM sync_words WHERE spanish = ? AND user_id = ?", args: [spanish, userId] })
      }
      stmts.push({
        sql: `INSERT INTO sync_words (id, user_id, spanish, chinese, part_of_speech, examples, definition_es, conjugation, tags, is_starred, srs_state, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [w.id || c.entityId, userId, spanish, w.chinese || "", w.partOfSpeech || "OTHER", JSON.stringify(w.examples || []), w.definitionEs || "", w.conjugation ? JSON.stringify(w.conjugation) : null, JSON.stringify(w.tags || []), w.isStarred ? 1 : 0, JSON.stringify(w.srsState || {}), w.createdAt || Date.now(), w.updatedAt || Date.now()]
      })
    }
  }

  await db.batch(stmts)
  return NextResponse.json({ ok: true, count: stmts.length })
}

// GET: Pull (拉取单词)
export async function GET(req: Request) {
  const userId = await authUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await initDB()
  const db = getDB()
  const result = await db.execute({ sql: "SELECT * FROM sync_words WHERE user_id = ?", args: [userId] })
  const words = result.rows.map(row => ({
    id: row.id,
    spanish: (row as any).spanish,
    chinese: (row as any).chinese,
    partOfSpeech: (row as any).part_of_speech,
    examples: JSON.parse((row as any).examples || "[]"),
    definitionEs: (row as any).definition_es,
    conjugation: (row as any).conjugation ? JSON.parse((row as any).conjugation) : undefined,
    tags: JSON.parse((row as any).tags || "[]"),
    isStarred: !!(row as any).is_starred,
    srsState: JSON.parse((row as any).srs_state || "{}"),
    createdAt: (row as any).created_at,
    updatedAt: (row as any).updated_at,
  }))
  return NextResponse.json({ words })
}