import { NextResponse } from "next/server"
import { getDB, initDB } from "@/lib/db"
import * as jose from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "vocab-secret-min-32-chars-change-me!!")
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || "vocab-refresh-change-me!!")

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const refreshToken = body?.refreshToken
  if (!refreshToken) return NextResponse.json({ error: "Missing token" }, { status: 400 })

  // 验证 refresh token
  let payload: { userId: string; email: string }
  try {
    const result = await jose.jwtVerify(refreshToken, JWT_REFRESH_SECRET)
    payload = result.payload as any
  } catch {
    return NextResponse.json({ error: "Token invalid" }, { status: 401 })
  }

  // 检查数据库中是否存在
  await initDB()
  const db = getDB()
  const r = await db.execute({ sql: "SELECT id FROM refresh_tokens WHERE token = ? AND expires_at > datetime('now')", args: [refreshToken] })
  if (r.rows.length === 0) return NextResponse.json({ error: "Token expired or revoked" }, { status: 401 })

  // 签发新 access token（15 分钟）
  const accessToken = await new jose.SignJWT({ userId: payload.userId, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET)

  return NextResponse.json({ accessToken })
}