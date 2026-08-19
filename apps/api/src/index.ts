import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

// Phase 1: API 骨架，后续 Phase 按需添加路由
const app = new Hono()

// 中间件
app.use("*", cors({ origin: ["http://localhost:3000"], credentials: true }))
app.use("*", logger())

// 健康检查
app.get("/api/health", (c) => c.json({ status: "ok", version: "0.4.0", phase: 5 }))

// Phase 5: Auth + Sync 路由（需要 PostgreSQL + Prisma generate 后可用）
// 数据库未配置时提供占位提示
const hasDb = process.env.DATABASE_URL != null

if (hasDb) {
  Promise.all([import("./routes/auth"), import("./routes/sync")])
    .then(([authMod, syncMod]) => {
      app.route("/api/auth", authMod.default)
      app.route("/api/sync", syncMod.default)
    })
    .catch(() => {
      console.warn("Database not configured — auth & sync routes disabled")
    })
} else {
  app.post("/api/auth/register", (c) => c.json({ error: "数据库未配置" }, 503))
  app.post("/api/auth/login", (c) => c.json({ error: "数据库未配置" }, 503))
  app.post("/api/sync/push", (c) => c.json({ error: "数据库未配置" }, 503))
  app.get("/api/sync/pull", (c) => c.json({ error: "数据库未配置" }, 503))
}

// 全局错误处理
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: "Internal Server Error" }, 500)
})

// 404
app.notFound((c) => c.json({ error: "Not Found" }, 404))

export default app

// 开发服务器
if (process.env.NODE_ENV !== "production") {
  import("@hono/node-server").then(({ serve }) => {
    serve({ fetch: app.fetch, port: 4000 }, (info) => {
      console.log(`API server running on http://localhost:${info.port}`)
    })
  })
}