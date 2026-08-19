import { createMiddleware } from "hono/factory"
import * as jose from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production-min-32-chars!!"
)
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production!!"
)

export interface AuthPayload {
  userId: string
  email: string
}

// 签发 access token（15 分钟）
export async function signAccessToken(payload: AuthPayload): Promise<string> {
  return new jose.SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_SECRET)
}

// 签发 refresh token（30 天）
export async function signRefreshToken(payload: AuthPayload): Promise<string> {
  return new jose.SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_REFRESH_SECRET)
}

// 验证 access token
export async function verifyAccessToken(token: string): Promise<AuthPayload> {
  const { payload } = await jose.jwtVerify(token, JWT_SECRET)
  return payload as unknown as AuthPayload
}

// 验证 refresh token
export async function verifyRefreshToken(token: string): Promise<AuthPayload> {
  const { payload } = await jose.jwtVerify(token, JWT_REFRESH_SECRET)
  return payload as unknown as AuthPayload
}

// Auth 中间件 — 验证 Bearer token
export const authMiddleware = createMiddleware<{ Variables: { userId: string; userEmail: string } }>(async (c, next) => {
  const header = c.req.header("Authorization") ?? ""
  const token = header.replace(/^Bearer\s+/i, "")

  if (!token) {
    return c.json({ error: "未登录" }, 401)
  }

  try {
    const payload = await verifyAccessToken(token)
    c.set("userId", payload.userId)
    c.set("userEmail", payload.email)
    await next()
  } catch {
    return c.json({ error: "登录已过期，请重新登录" }, 401)
  }
})

// 可选 Auth（不强制登录）
export const optionalAuth = createMiddleware<{ Variables: { userId: string; userEmail: string } }>(async (c, next) => {
  const header = c.req.header("Authorization") ?? ""
  const token = header.replace(/^Bearer\s+/i, "")

  if (token) {
    try {
      const payload = await verifyAccessToken(token)
      c.set("userId", payload.userId)
    } catch { /* ignore */ }
  }
  await next()
})