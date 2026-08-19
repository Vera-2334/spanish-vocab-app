# 🇪🇸 西语单词记忆工具 · Spanish Vocab

西语单词记忆 PWA 工具 —— 闪卡 + SRS 间隔重复 + 离线优先 + 多设备云端同步。

## 功能特性

- **闪卡学习**：正反面翻转、SRS 间隔重复算法自动排期
- **单词管理**：增删改查、词性分类、标签、星标收藏
- **快速导入**：粘贴逗号/换行分隔的单词列表，自动查本地词典（487+ 词条）+ AI 补全释义/例句/动词变位
- **离线优先**：PWA + IndexedDB 本地存储，无网也能用
- **多设备同步**：登录后单词、学习进度、打卡连击自动同步到云端（Turso）
- **导出备份**：CSV / Anki / JSON 格式，换设备不丢失
- **动词变位**：完整 7 时态 × 6 人称变位表

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Next.js 15 (App Router) + React 19 + Tailwind CSS 4 |
| 本地存储 | Dexie.js 4 (IndexedDB) |
| 状态管理 | Zustand 5 |
| 后端 | Next.js Route Handlers + Turso (libSQL) |
| AI 词典 | DeepSeek API（OpenAI 兼容） |
| 工具 | pnpm + Turborepo (monorepo) |

> 注：`apps/api/` 是早期 Hono + Prisma/PostgreSQL 的实验代码，已废弃，实际后端全部走 `apps/web/app/api/*` 的 Route Handlers + Turso。

## 快速开始

**前置要求**：Node.js ≥ 20，pnpm ≥ 9。

```bash
git clone <仓库地址>
cd spanish-vocab-app
pnpm install
```

配置环境变量（见下表），然后：

```bash
# 仅前端（含后端 Route Handlers）
pnpm dev:web
```

打开 http://localhost:3000 即可使用。

## 环境变量

**纯本地使用无需任何环境变量** —— 单词、学习进度、闪卡全部存浏览器本地（IndexedDB），`pnpm install && pnpm dev:web` 后即可用。

环境变量只用于启用**可选增强**（云端同步 / AI 词典）。需要时在项目根目录（或 `apps/web/`）新建 `.env.local`：

| 变量 | 说明 |
|---|---|
| `TURSO_DATABASE_URL` | 可选。账号注册/登录 + 多设备云端同步 |
| `TURSO_AUTH_TOKEN` | 可选。同上 |
| `DEEPSEEK_API_KEY` | 可选。AI 生成释义/例句/变位；不配则用内置静态词典（487 词条） |
| `JWT_SECRET` | 可选。仅启用账号登录时需要 |
| `JWT_REFRESH_SECRET` | 可选。同上 |
| `SITE_PASSWORD` | 可选。站点访问密码；不配则禁用密码墙 |

**Turso 免费数据库（5 分钟）：**

1. 注册 [Turso](https://turso.tech) 并安装 CLI：`brew install tursodatabase/tap/turso`（或 `curl -sSfL https://get.tur.so/install.sh | bash`）
2. 登录并创建数据库：`turso auth login && turso db create spanish-vocab`
3. 取 URL 和 Token：
   ```bash
   turso db show spanish-vocab          # 得到 URL
   turso db tokens create spanish-vocab # 得到 auth token
   ```

**DeepSeek 密钥：** 在 [platform.deepseek.com](https://platform.deepseek.com) 注册后创建 API Key。

首次启动时应用会自动建表（`initDB()` 幂等），无需手动迁移。

## 部署到 Vercel

1. 将仓库导入 Vercel，框架自动识别 Next.js
2. Root Directory 设为 `apps/web`（monorepo 已通过 `vercel.json` 配置好）
3. 在 Project Settings → Environment Variables 中填入上表 6 个变量
4. Deploy

## 项目结构

```
spanish-vocab-app/
├── apps/
│   ├── web/          # Next.js 前端 + 后端 Route Handlers
│   └── api/          # 已废弃（Hono + Prisma，可忽略）
├── packages/
│   └── database/     # 共享类型 + 本地词典 + SRS 算法
├── docs/             # PRD / 技术方案 / 视觉规范 / 词典填充指南
├── scripts/          # 词典维护脚本
└── turbo.json
```

## License

[MIT](./LICENSE)
