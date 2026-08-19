import { NextResponse } from "next/server"
import { getDB, initDB } from "@/lib/db"
import bcrypt from "bcrypt"
import * as jose from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "vocab-secret-min-32-chars-change-me!!")
const JWT_REFRESH = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || "vocab-refresh-change-me!!")

async function sign(payload: any, expiresIn: string, secret: Uint8Array): Promise<string> {
  return new jose.SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresIn).sign(secret)
}

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "邮箱无效或密码过短" }, { status: 400 })
  }

  await initDB()
  const db = getDB()

  const existing = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] })
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 })
  }

  const id = crypto.randomUUID()
  const passwordHash = await bcrypt.hash(password, 12)
  await db.execute({ sql: "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", args: [id, email, passwordHash] })

  const accessToken = await sign({ userId: id, email }, "15m", JWT_SECRET)
  const refreshToken = await sign({ userId: id, email }, "30d", JWT_REFRESH)
  const rtId = crypto.randomUUID()
  const expires = new Date(Date.now() + 30 * 86400000).toISOString()
  await db.execute({ sql: "INSERT INTO refresh_tokens (id, token, user_id, expires_at) VALUES (?, ?, ?, ?)", args: [rtId, refreshToken, id, expires] })

  return NextResponse.json({ user: { id, email }, accessToken, refreshToken })
}