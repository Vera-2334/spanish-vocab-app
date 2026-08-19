import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { PrismaClient } from "@spanish-vocab/database"
import { authMiddleware } from "../middleware/auth"

const prisma = new PrismaClient()
const syncRoutes = new Hono<{ Variables: { userId: string; userEmail: string } }>()

// ============================================================
// POST /api/sync/push — 推送本地变更
// ============================================================

const pushSchema = z.object({
  changes: z.array(z.object({
    entity: z.enum(["word", "group", "tag", "studyRecord"]),
    entityId: z.string(),
    action: z.enum(["create", "update", "delete"]),
    payload: z.any(),
    timestamp: z.number(),
  })),
})

syncRoutes.post("/push", authMiddleware, zValidator("json", pushSchema), async (c) => {
  const userId = c.get("userId")
  const { changes } = c.req.valid("json")

  const results: { entityId: string; status: "applied" | "conflict" | "skipped" }[] = []

  for (const change of changes) {
    try {
      // LWW: 仅在本地时间戳更新时覆盖
      const existing = await prisma.syncLog.findFirst({
        where: { entityId: change.entityId, userId },
        orderBy: { timestamp: "desc" },
      })

      if (existing && existing.timestamp.getTime() >= change.timestamp) {
        results.push({ entityId: change.entityId, status: "skipped" })
        continue
      }

      // 记录同步日志
      await prisma.syncLog.create({
        data: {
          entity: change.entity,
          entityId: change.entityId,
          action: change.action,
          payload: change.payload,
          timestamp: new Date(change.timestamp),
          synced: false,
          userId,
        },
      })

      results.push({ entityId: change.entityId, status: "applied" })
    } catch (error) {
      results.push({ entityId: change.entityId, status: "conflict" })
    }
  }

  return c.json({ results })
})

// ============================================================
// GET /api/sync/pull — 拉取远程变更
// ============================================================

syncRoutes.get("/pull", authMiddleware, async (c) => {
  const userId = c.get("userId")
  const since = c.req.query("since")

  const sinceDate = since
    ? new Date(parseInt(since))
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 默认 30 天

  const logs = await prisma.syncLog.findMany({
    where: {
      userId,
      timestamp: { gt: sinceDate },
    },
    orderBy: { timestamp: "asc" },
    take: 500,
  })

  return c.json({
    changes: logs.map((log) => ({
      entity: log.entity,
      entityId: log.entityId,
      action: log.action,
      payload: log.payload,
      timestamp: log.timestamp.getTime(),
    })),
    serverTime: Date.now(),
  })
})

// ============================================================
// POST /api/sync/ack — 确认同步完成
// ============================================================

syncRoutes.post("/ack", authMiddleware, async (c) => {
  const userId = c.get("userId")
  const { timestamps } = await c.req.json<{ timestamps: number[] }>()

  await prisma.syncLog.updateMany({
    where: {
      userId,
      timestamp: { in: timestamps.map((t) => new Date(t)) },
    },
    data: { synced: true },
  })

  return c.json({ ok: true })
})

export default syncRoutes