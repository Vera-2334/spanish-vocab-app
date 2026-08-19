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

// GET: 当前用户信息 + 打卡统计
export async function GET(req: Request) {
  const userId = await authUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await initDB()
  const db = getDB()

  const u = await db.execute({ sql: "SELECT id, email FROM users WHERE id = ?", args: [userId] })
  if (u.rows.length === 0) return NextResponse.json({ error: "用户不存在" }, { status: 404 })

  const r = await db.execute({
    sql: "SELECT streak, longest_streak, last_checkin_date FROM user_streak WHERE user_id = ?",
    args: [userId],
  })
  const s = r.rows[0] as any

  return NextResponse.json({
    user: {
      id: (u.rows[0] as any).id,
      email: (u.rows[0] as any).email,
      streak: s?.streak ?? 0,
      longestStreak: s?.longest_streak ?? 0,
      lastCheckinDate: s?.last_checkin_date ?? null,
    },
  })
}
