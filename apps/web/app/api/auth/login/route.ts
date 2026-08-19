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
  await initDB()
  const db = getDB()

  const result = await db.execute({ sql: "SELECT id, email, password_hash FROM users WHERE email = ?", args: [email] })
  if (result.rows.length === 0) return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 })

  const user = result.rows[0] as any
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 })

  const accessToken = await sign({ userId: user.id, email: user.email }, "15m", JWT_SECRET)
  const refreshToken = await sign({ userId: user.id, email: user.email }, "30d", JWT_REFRESH)
  await db.execute({ sql: "INSERT INTO refresh_tokens (id, token, user_id, expires_at) VALUES (?, ?, ?, ?)", args: [crypto.randomUUID(), refreshToken, user.id, new Date(Date.now() + 30 * 86400000).toISOString()] })

  return NextResponse.json({ user: { id: user.id, email: user.email }, accessToken, refreshToken })
}