import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import bcrypt from "bcrypt"
import { PrismaClient } from "@spanish-vocab/database"
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  authMiddleware,
  type AuthPayload,
} from "../middleware/auth"

const prisma = new PrismaClient()

const authRoutes = new Hono<{ Variables: { userId: string; userEmail: string } }>()

// ============================================================
// POST /api/auth/register — 注册
// ============================================================

const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
})

authRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  const { email, password } = c.req.valid("json")

  // 检查邮箱
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return c.json({ error: "该邮箱已注册" }, 409)
  }

  // 创建用户
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, passwordHash },
  })

  // 签发 token
  const payload: AuthPayload = { userId: user.id, email: user.email }
  const accessToken = await signAccessToken(payload)
  const refreshToken = await signRefreshToken(payload)

  // 保存 refresh token
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  })

  return c.json({
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
    accessToken,
    refreshToken,
  })
})

// ============================================================
// POST /api/auth/login — 登录
// ============================================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "请输入密码"),
})

authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json")

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return c.json({ error: "邮箱或密码错误" }, 401)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return c.json({ error: "邮箱或密码错误" }, 401)
  }

  const payload: AuthPayload = { userId: user.id, email: user.email }
  const accessToken = await signAccessToken(payload)
  const refreshToken = await signRefreshToken(payload)

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  return c.json({
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
    accessToken,
    refreshToken,
  })
})

// ============================================================
// POST /api/auth/refresh — 续期
// ============================================================

const refreshSchema = z.object({
  refreshToken: z.string(),
})

authRoutes.post("/refresh", zValidator("json", refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid("json")

  // 验证 token
  let payload: AuthPayload
  try {
    payload = await verifyRefreshToken(refreshToken)
  } catch {
    return c.json({ error: "Refresh token 无效或已过期" }, 401)
  }

  // 校验数据库中的记录
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
  if (!stored || stored.expiresAt < new Date()) {
    return c.json({ error: "Refresh token 已失效" }, 401)
  }

  // 签发新 access token
  const accessToken = await signAccessToken({
    userId: payload.userId,
    email: payload.email,
  })

  return c.json({ accessToken })
})

// ============================================================
// GET /api/auth/me — 当前用户
// ============================================================

authRoutes.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId")
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      streak: true,
      longestStreak: true,
      lastCheckinDate: true,
      createdAt: true,
    },
  })

  return c.json({ user })
})

// ============================================================
// POST /api/auth/logout — 登出
// ============================================================

authRoutes.post("/logout", authMiddleware, async (c) => {
  const userId = c.get("userId")
  await prisma.refreshToken.deleteMany({ where: { userId } })
  return c.json({ ok: true })
})

export default authRoutes