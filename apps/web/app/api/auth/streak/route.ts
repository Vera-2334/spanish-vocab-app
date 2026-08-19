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

// PATCH: 同步打卡统计（跨设备一致）
export async function PATCH(req: Request) {
  const userId = await authUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const streak = Number.isInteger(body.streak) ? body.streak : 0
  const longestStreak = Number.isInteger(body.longestStreak) ? body.longestStreak : 0
  const lastCheckinDate = typeof body.lastCheckinDate === "string" ? body.lastCheckinDate : null

  await initDB()
  const db = getDB()

  await db.execute({
    sql: `INSERT INTO user_streak (user_id, streak, longest_streak, last_checkin_date)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            streak = excluded.streak,
            longest_streak = excluded.longest_streak,
            last_checkin_date = excluded.last_checkin_date`,
    args: [userId, streak, longestStreak, lastCheckinDate],
  })

  return NextResponse.json({ streak, longestStreak, lastCheckinDate })
}
